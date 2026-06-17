import os

file_path = 'C:/SLT_NEXUS/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_endpoints = '''
@app.get("/api/admin/profile/{phone}")
async def proxy_get_full_customer_profile(phone: str):
    import backend.agent.tools.mcp_tools as mcp_tools
    result = mcp_tools.get_full_customer_profile(phone)
    return {"response": result}

@app.post("/api/knowledgebase/search")
async def proxy_search_knowledgebase(query: dict):
    q = query.get("query", "")
    import backend.agent.tools.mcp_tools as mcp_tools
    result = mcp_tools.search_slt_knowledgebase(q)
    return {"response": result}
'''

if 'proxy_get_full_customer_profile' not in content:
    content = content.replace('@app.post("/api/chat_stream")', new_endpoints + '\n@app.post("/api/chat_stream")')
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Added proxy endpoints to main.py')
else:
    print('Already present')
