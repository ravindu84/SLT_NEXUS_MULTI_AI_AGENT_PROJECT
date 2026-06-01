import asyncio, sys, io
from backend.agent.graph import get_graph
from langchain_core.messages import HumanMessage, SystemMessage

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def test():
    g = get_graph()
    res = await g.ainvoke({
        'messages': [SystemMessage(content='You are CUSTOMER 0112895900'), HumanMessage(content='mage bill eka kiyanna')],
        'is_admin': False,
        'loop_count': 0,
        'user_language': 'si'
    })
    for m in res['messages']:
        print(repr(m))

if __name__ == "__main__":
    asyncio.run(test())
