import asyncio
from backend.agent.graph import get_graph
from langchain_core.messages import HumanMessage, SystemMessage

async def test():
    g = get_graph()
    res = await g.ainvoke({
        'messages': [SystemMessage(content='You are CUSTOMER 0112895900'), HumanMessage(content='monthly bill eka kiyannako')],
        'is_admin': False,
        'loop_count': 0,
        'user_language': 'si'
    })
    print(res['messages'][-1].content)

if __name__ == "__main__":
    asyncio.run(test())
