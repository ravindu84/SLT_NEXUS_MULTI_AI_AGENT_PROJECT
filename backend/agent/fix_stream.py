import os
import re

file_path = "C:/SLT_NEXUS/backend/main.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

correct_stream_code = """@app.post("/api/chat_stream")
async def chat_stream_endpoint(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    history = sessions[session_id]
    
    messages = []
    
    if request.is_admin:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with an INTERNAL SLT OFFICE STAFF MEMBER (Admin). "
            f"1. They have full security clearance. "
            f"2. You MUST provide full raw technical details (DP Box, Loop IDs, SNR, Attenuation, MAC addresses) when asked. "
            f"3. The staff member can ask about ANY customer number. If they provide a number in the chat, use that. "
            f"4. The current session_id ({session_id}) is an INTERNAL TRACKING ID, NOT a phone number! If they ask for specific customer details (bill, profile), ask for the 10-digit number. BUT if they ask for internal system reports (WFM reports, dispatch data, general stats), DO NOT ask for a phone number! Just generate the report. "
            f"5. GREETING RULE: Do NOT use customer greetings like 'Ayubowan'. Use a professional internal greeting. "
            f"6. CONCISENESS RULE: ONLY provide the EXACT information requested."
            f"7. CRITICAL TOOL ASSIGNMENT: Use the 'get_full_customer_profile' tool to instantly fetch ALL technical, network, billing, and usage data for a customer. Use this whenever the admin asks to check a customer!\\n"
            f"8. ADMIN IDENTITY: The Admin you are talking to is named 'Ravindu'. Always greet him as Ravindu when confirming a major action.\\n"
            f"9. DISPATCHING TECHS: If Ravindu asks to send a technician for a new connection or fault, use the `dispatch_technician_admin` tool. Provide the SLT Number and the Tech Name.\\n"
            f"10. FINALIZING CONNECTIONS: If Ravindu says the job is done and asks to update the system, use the `finalize_admin_approval` tool. Once successful, reply EXACTLY with 'Ah Ravindu, it is done' (or in Sinhala 'ආ රවිඳු, මම වැඩේ ඉවර කළා. Blockchain එකටත් ලියලා, Customer ව Active ලිස්ට් එකට දැම්මා').\\n"
            f"11. ORACLE PREDICTIONS: If Ravindu asks to 'scan the network for future faults' or 'show vulnerable lines', use `generate_predictive_faults` tool. If he says he 'fixed those predicted faults' or asks to 'clear the page', use `clear_predictive_faults` tool.\\n"
            f"12. BULK FAULT DISPATCH: If Ravindu says 'Assign these faults to their area technicians', 'Faults ටික බෙදන්න', or similar, use the `auto_dispatch_technicians_by_area` tool. This will look at the open faults in the Fault Matrix and assign them to the correct technicians automatically.\\n"
            f"13. BULK FAULT RESOLUTION: If Ravindu says 'All faults are done', 'Faults iwarai', or asks to clear the fault matrix and log to blockchain, use the `resolve_all_faults_admin` tool. This tool resolves all active faults, resets technicians, and generates a blockchain hash.\\n"
            f"14. CABLE CUT / MAJOR OUTAGE RESOLUTION: If Ravindu says 'The cut cable is fixed', 'eka hari', 'Network eka samanya karanna' while referring to a Pathfinder alarm or cable cut, use the `resolve_major_outage` tool. This stops the UI alarm loop, simulates sending SMS to customers, emails a detailed damage report with financial loss to aravindaslt@gmail.com, and logs it to blockchain. IMPORTANT: After running the tool, reply in Sinhala to Ravindu saying: 'ආ රවිඳු, මම අදාළ පාරිභෝගිකයින්ට SMS එක යැව්වා. අලුත්වැඩියා අලාභ වාර්තාව (Damage Report) ඔයාගේ Email එකට දැම්මා. Network එක සාමාන්‍ය තත්ත්වයට පත් කරලා Blockchain එකටත් Update කළා!'\\n"
            f"15. CHURN PREDICTION: If Ravindu asks about 'customers at risk of churning', 'leaving', 'disconnect', or 'risk', use the `get_churn_predictions` tool. This tool fetches the top 5 customers at highest risk of disconnecting. After running the tool, explain the reasons in Sinhala (e.g. 'මේ අයගේ අන්තර්ජාල භාවිතය අඩුවෙලා, බිල් ගෙවලා නෑ, සහ පරණ Faults ගොඩක් තියෙනවා').\\n"
        )
    else:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with a CUSTOMER (B2C). "
            f"1. You MUST NEVER provide raw technical details like DP Box, Loop IDs, SNR, or Attenuation. Keep answers simple. "
            f"2. SECURITY RULE: The customer's authenticated phone number is exactly {session_id}. "
            f"3. You are STRICTLY FORBIDDEN from providing details, usage, bills, or tickets for ANY other phone number. If they ask about another number, politely refuse. "
            f"4. Do not ask for their phone number again, use {session_id} automatically for all tool calls."
        )
    
    try:
        import sqlite3
        import os
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slt_dummy.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT memory_summary FROM user_memory WHERE phone_number = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            context_msg += f"\\n\\nLONG-TERM AI MEMORY FOR THIS USER: {row[0]}"
    except Exception as e:
        pass

    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    import json
    
    messages.append(SystemMessage(content=context_msg))    
    messages.extend(history)
            
    if request.image_base64:
        import backend.agent.tools.mcp_tools as mcp_tools
        mcp_tools.latest_image_cache[session_id] = f"data:image/jpeg;base64,{request.image_base64}"
        multimodal_content = [
            {"type": "text", "text": request.message},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{request.image_base64}"}}
        ]
        user_msg = HumanMessage(content=multimodal_content)
    else:
        user_msg = HumanMessage(content=censor_profanity(request.message))

    messages.append(user_msg)
    history.append(user_msg)
    if len(history) > 6:
        history.pop(0)

    async def event_generator():
        from backend.agent.graph import get_graph
        graph = get_graph()
        
        state = {
            "messages": messages,
            "current_agent": "liya_agent",
            "phone_number": request.phone_number or session_id,
            "user_language": request.lang or "si"
        }
        
        try:
            final_content = ""
            async for event in graph.astream_events(state, version="v2"):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    chunk = event["data"]["chunk"]
                    if chunk.content and isinstance(chunk.content, str):
                        final_content += chunk.content
                        data = json.dumps({"text": chunk.content})
                        yield f"data: {data}\\n\\n"
                        
            if final_content:
                history.append(AIMessage(content=final_content))
                
            yield "data: [DONE]\\n\\n"
            
        except Exception as e:
            err = json.dumps({"error": str(e)})
            yield f"data: {err}\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")"""

content = re.sub(r'@app\.post\("/api/chat_stream"\).*?return StreamingResponse\(event_generator\(\), media_type="text/event-stream"\)', correct_stream_code, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated chat_stream_endpoint correctly.")
