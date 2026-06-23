import os
import sys
import asyncio
import traceback
from dotenv import load_dotenv

load_dotenv("backend/.env")

try:
    from backend.agent.graph import get_graph
    from langchain_core.messages import HumanMessage
    
    graph = get_graph()
    state = {
        'messages': [HumanMessage(content='0112895800')],
        'current_agent': 'liya_agent',
        'phone_number': '0112895800',
        'user_language': 'si'
    }
    
    async def run():
        async for event in graph.astream_events(state, version='v2'):
            pass
            
    asyncio.run(run())
    print("Graph execution successful!")
except Exception as e:
    print(f"CRASHED! Exception Type: {type(e)}")
    traceback.print_exc()
