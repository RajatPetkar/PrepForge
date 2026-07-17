from collections.abc import AsyncGenerator
from typing import Annotated, Any, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_groq import ChatGroq
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages

from placement_api.core.config import get_settings
from placement_api.services.search import hybrid_search


class GraphState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    context: list[dict[str, Any]]
    pdf_context: str | None
    
def get_llm() -> ChatGroq:
    settings = get_settings()
    return ChatGroq(
        api_key=settings.groq_api_key,
        model_name="llama-3.1-8b-instant", # Default, can be configurable
        temperature=0.3,
        streaming=True
    )

async def retrieve_node(state: GraphState) -> GraphState:
    """Retrieve relevant context for the latest user message."""
    messages = state["messages"]
    latest_msg = messages[-1]
    
    # Extract query
    query = latest_msg.content
    
    # Retrieve documents via hybrid search
    results = await hybrid_search(query=query, limit=3)
    
    return {"context": results}

async def generate_node(state: GraphState) -> GraphState:
    """Generate the response using context and history."""
    messages = state["messages"]
    context = state.get("context", [])
    
    llm = get_llm()
    
    # Build System Prompt with Context
    context_str = "\n\n".join([
        f"[{i+1}] {c.get('payload', {}).get('text', '')}"
        for i, c in enumerate(context)
    ])
    
    pdf_ctx = state.get("pdf_context")
    if pdf_ctx:
        sys_prompt = f"""You are the AI Placement Assistant. A PDF document has been uploaded by the user.
Please answer the user's question explicitly based ONLY on the provided PDF Document Context below.
If the answer cannot be found in the PDF context, explicitly state: "I cannot find the answer to this in the uploaded PDF." Do not answer from general knowledge.

PDF Document Context:
{pdf_ctx}
"""
    else:
        sys_prompt = f"""You are the AI Placement Assistant. Use the following retrieved context to answer the user's question.
If the answer is not in the context, say you don't know based on the provided documents. Always cite your sources using the [number] format if you use them.

Context:
{context_str}
"""
    
    # Prepare messages
    full_messages = [SystemMessage(content=sys_prompt)] + messages
    
    # We won't await an invoke here, we'll stream it in the caller endpoint
    # But for graph node compatibility if run statically:
    response = await llm.ainvoke(full_messages)
    
    return {"messages": [response]}

from contextlib import asynccontextmanager

from langgraph.checkpoint.memory import MemorySaver

# Use MemorySaver to avoid Postgres connection pooling deadlocks in dev
_memory_saver = MemorySaver()

def build_chat_graph(checkpointer=None) -> StateGraph:
    workflow = StateGraph(GraphState)
    
    workflow.add_node("retrieve", retrieve_node)
    workflow.add_node("generate", generate_node)
    
    workflow.add_edge(START, "retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)
    
    return workflow.compile(checkpointer=checkpointer)

@asynccontextmanager
async def get_checkpointer():
    yield _memory_saver
        
async def stream_chat_response(messages_input: list[BaseMessage], thread_id: str, pdf_context: str | None = None) -> AsyncGenerator[str, None]:
    """Streams the response directly using the LLM for a given state."""
    async with get_checkpointer() as checkpointer:
        graph = build_chat_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": thread_id}}
        
        # We need to add the new messages to the state
        # The checkpointer automatically loads the past messages!
        
        # We invoke the graph? Wait, for streaming tokens from the node, 
        # we can use graph.astream_events or graph.astream.
        
        # However, to stream tokens dynamically from the ChatGroq model in generate_node,
        # we can use astreams and yield. But `generate_node` right now returns full message.
        # LangGraph has stream_mode="messages" for token streaming.
        
        async for msg, metadata in graph.astream(
            {"messages": messages_input, "pdf_context": pdf_context},
            config,
            stream_mode=["messages", "updates"]
        ):
            # stream_mode=["messages", "updates"] yields tuples of (chunk_type, chunk_data)
            chunk_type = msg
            chunk_data = metadata
            
            if chunk_type == "updates":
                # Updates contain the node outputs
                if "retrieve" in chunk_data:
                    context = chunk_data["retrieve"].get("context", [])
                    context_data = [
                        {
                            "id": c.get("id"), 
                            "score": c.get("score"), 
                            "citation": c.get("citation", f"Document Chunk {i+1}")
                        }
                        for i, c in enumerate(context)
                    ]
                    import json
                    yield f"<CONTEXT_METADATA>{json.dumps(context_data)}</CONTEXT_METADATA>"
            
            elif chunk_type == "messages":
                # msg_content is the actual message tuple
                # chunk_data is actually (message_chunk, metadata) when stream_mode="messages"
                msg_chunk, msg_metadata = chunk_data
                if msg_chunk.content and msg_metadata.get("langgraph_node") == "generate":
                    yield msg_chunk.content

async def get_chat_history(thread_id: str) -> list[dict[str, Any]]:
    """Fetch the chat history for a given thread."""
    async with get_checkpointer() as checkpointer:
        config = {"configurable": {"thread_id": thread_id}}
        
        # Get the latest state
        saved_state = await checkpointer.aget_tuple(config)
        if not saved_state or not saved_state.checkpoint:
            return []
            
        messages = saved_state.checkpoint.get("channel_values", {}).get("messages", [])
        
        # Format messages for the API response
        formatted_history = []
        for msg in messages:
            if isinstance(msg, HumanMessage):
                formatted_history.append({"role": "user", "content": msg.content})
            elif isinstance(msg, AIMessage):
                formatted_history.append({"role": "assistant", "content": msg.content})
                
        return formatted_history

