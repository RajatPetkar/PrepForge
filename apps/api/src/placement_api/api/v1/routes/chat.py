import json

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from pydantic import BaseModel

from placement_api.api.deps import CurrentUser
from placement_api.services.chat import stream_chat_response
from placement_api.db.session import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends
from sqlalchemy import select
import uuid
from placement_api.models.conversation import Conversation, Message as DBMessage
from placement_api.db.enums import MessageRole

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    thread_id: str | None = None
    pdf_context: str | None = None

def format_messages(chat_messages: list[ChatMessage]) -> list[BaseMessage]:
    formatted = []
    for msg in chat_messages:
        if msg.role == "user":
            formatted.append(HumanMessage(content=msg.content))
        elif msg.role == "assistant":
            formatted.append(AIMessage(content=msg.content))
    return formatted

@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_db_session)
):
    if not request.messages:
        raise HTTPException(status_code=400, detail="Messages cannot be empty")
        
    formatted_messages = format_messages(request.messages)
    
    thread_id = request.thread_id
    if not thread_id:
        # Create new conversation
        title = request.messages[-1].content[:50]
        conversation = Conversation(
            id=uuid.uuid4(),
            user_id=current_user.id,
            title=title
        )
        session.add(conversation)
        await session.commit()
        thread_id = str(conversation.id)
    else:
        # Check if conversation exists
        conv = await session.get(Conversation, uuid.UUID(thread_id))
        if not conv or conv.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Conversation not found")
            
    # Save the user message
    user_msg_content = request.messages[-1].content
    db_user_msg = DBMessage(
        id=uuid.uuid4(),
        conversation_id=uuid.UUID(thread_id),
        role=MessageRole.USER,
        content=user_msg_content
    )
    session.add(db_user_msg)
    await session.commit()
    
    async def generate():
        assistant_content = ""
        async for chunk in stream_chat_response(formatted_messages, thread_id, request.pdf_context):
            if chunk:
                assistant_content += chunk
                yield f"data: {json.dumps({'token': chunk})}\n\n"
                
        yield f"data: {json.dumps({'status': 'done', 'thread_id': thread_id})}\n\n"
        
        # Save assistant message
        db_ast_msg = DBMessage(
            id=uuid.uuid4(),
            conversation_id=uuid.UUID(thread_id),
            role=MessageRole.ASSISTANT,
            content=assistant_content
        )
        async for s in get_db_session():
            s.add(db_ast_msg)
            await s.commit()
            break
                
    return StreamingResponse(generate(), media_type="text/event-stream")

@router.get("/conversations")
async def list_conversations(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_db_session)
):
    stmt = select(Conversation).where(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc())
    result = await session.execute(stmt)
    return {"conversations": [{"id": str(c.id), "title": c.title} for c in result.scalars().all()]}

@router.delete("/conversations/{thread_id}")
async def delete_conversation(
    thread_id: str,
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_db_session)
):
    try:
        t_id = uuid.UUID(thread_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid thread ID")
        
    conv = await session.get(Conversation, t_id)
    if not conv or conv.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    await session.delete(conv)
    await session.commit()
    return {"status": "success"}

@router.get("/history")
async def chat_history(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_db_session),
    thread_id: str | None = None
):
    if not thread_id:
        return {"messages": []}
    
    stmt = select(DBMessage).where(DBMessage.conversation_id == uuid.UUID(thread_id)).order_by(DBMessage.created_at.asc())
    result = await session.execute(stmt)
    
    messages = []
    for m in result.scalars().all():
        messages.append({
            "role": m.role.value,
            "content": m.content
        })
    return {"messages": messages}

@router.post("/upload-pdf")
async def upload_pdf(
    current_user: CurrentUser,
    file: UploadFile = File(...)
):
    from placement_api.services.resume import extract_text_from_pdf
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
    try:
        content = await file.read()
        text = await extract_text_from_pdf(content)
        if not text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. Ensure it is not a scanned image.")
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
