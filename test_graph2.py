import asyncio
import json
from backend.agent.graph import get_graph
from langchain_core.messages import HumanMessage, SystemMessage

async def test():
    g = get_graph()
    
    session_id = "0112895900"
    context_msg = (
        f"IMPORTANT SECURITY CONTEXT: You are communicating with a CUSTOMER (B2C). "
        f"1. You MUST NEVER provide raw technical details like DP Box, Loop IDs, SNR, or Attenuation. Keep answers simple. "
        f"2. SECURITY RULE: The customer's authenticated phone number is exactly {session_id}. "
        f"3. You are STRICTLY FORBIDDEN from providing details, usage, bills, or tickets for ANY other phone number. If they ask about another number, politely refuse. "
        f"4. Do not ask for their phone number again, use {session_id} automatically for all tool calls."
    )
    
    messages = [SystemMessage(content=context_msg), HumanMessage(content='මගේ ගිය මාසේ බිල කීයද බන්')]
    
    res = await g.ainvoke({
        'messages': messages,
        'is_admin': False,
        'loop_count': 0,
        'user_language': 'si'
    })
    
    with open("test_output2.txt", "w", encoding="utf-8") as f:
        for m in res['messages']:
            f.write(f"Role: {m.type}\n")
            f.write(f"Content: {m.content}\n")
            if hasattr(m, 'tool_calls'):
                f.write(f"Tool Calls: {m.tool_calls}\n")
            f.write("-" * 40 + "\n")

asyncio.run(test())
