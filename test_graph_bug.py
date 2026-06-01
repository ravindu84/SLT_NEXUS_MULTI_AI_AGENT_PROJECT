import asyncio, sys, io
from backend.agent.graph import get_graph
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test():
    g = get_graph()
    messages = [
        SystemMessage(content='Sys'),
        HumanMessage(content='bill'),
        AIMessage(content='', tool_calls=[{'name':'foo', 'args':{}, 'id':'123'}]),
        ToolMessage(content='bar', tool_call_id='123'),
        AIMessage(content='ans'),
        HumanMessage(content='usage')
    ]
    try:
        res = await g.ainvoke({
            'messages': messages,
            'is_admin': False,
            'loop_count': 0,
            'user_language': 'si'
        })
        print("Success")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test())
