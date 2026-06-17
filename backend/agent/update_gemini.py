import os
import re

file_path = "C:/SLT_NEXUS/frontend/app/hooks/useGeminiLiveAPI.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add to tool declarations
new_tools = """
                {
                  name: "search_slt_knowledgebase",
                  description: "Search the internal SLT knowledgebase for instant answers. Much faster than consult_slt_expert_system. Use this for general questions.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      query: { type: "STRING" }
                    },
                    required: ["query"]
                  }
                },
                {
                  name: "get_full_customer_profile",
                  description: "For Admin ONLY. Get the full technical profile (DP, Loop, SNR, etc) for a customer.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      phone_number: { type: "STRING" }
                    },
                    required: ["phone_number"]
                  }
                },
"""

content = content.replace('name: "consult_slt_expert_system",', new_tools + '                {\n                  name: "consult_slt_expert_system",')

# Add tool execution logic
tool_exec_logic = """
              } else if (call.name === "search_slt_knowledgebase") {
                try {
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const res = await fetch(`${API_BASE}/api/knowledgebase/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: call.args.query })
                  });
                  const resData = await res.json();
                  
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{ id: call.id, name: call.name, response: { result: resData.response } }]
                      }
                    }));
                  }
                } catch (e) {
                  console.error(e);
                }
              } else if (call.name === "get_full_customer_profile") {
                try {
                  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
                  const res = await fetch(`${API_BASE}/api/admin/profile/${call.args.phone_number}`);
                  const resData = await res.json();
                  
                  if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({
                      toolResponse: {
                        functionResponses: [{ id: call.id, name: call.name, response: { result: resData.response } }]
                      }
                    }));
                  }
                } catch (e) {
                  console.error(e);
                }
"""

content = content.replace('} else if (call.name === "end_session") {', tool_exec_logic + '} else if (call.name === "end_session") {')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated useGeminiLiveAPI.js with direct tools.")
