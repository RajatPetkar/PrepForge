import asyncio
from langchain_core.messages import HumanMessage
from placement_api.core.config import get_settings
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from placement_api.services.chat import build_chat_graph
from psycopg_pool import AsyncConnectionPool

async def main():
    settings = get_settings()
    print("Connecting checkpointer...")
    
    # Use AsyncConnectionPool directly
    async with AsyncConnectionPool(
        conninfo=settings.psycopg_database_url,
        max_size=10,
        kwargs={"autocommit": True}
    ) as pool:
        checkpointer = AsyncPostgresSaver(pool)
        print("Running setup()...")
        await checkpointer.setup()
        print("Building graph...")
        graph = build_chat_graph(checkpointer=checkpointer)
        config = {"configurable": {"thread_id": "test-thread-123"}}
        messages = [HumanMessage(content="What is Python?")]
        
        print("Starting stream...")
        async for msg, metadata in graph.astream(
            {"messages": messages},
            config,
            stream_mode=["messages", "updates"]
        ):
            print(f"Got chunk: {msg}")

if __name__ == "__main__":
    asyncio.run(main())
