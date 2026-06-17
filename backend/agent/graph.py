"""
SLT NEXUS - LangGraph Multi-Agent Orchestrator (v2.0 - RAG Connected + Full Tool Wiring)
Implements a 12-agent swarm with RAG retrieval, phone number memory, and goal-oriented routing.
"""

import json
import os
import re
from typing import Literal, Union, Optional
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, ToolMessage
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from backend.agent.state import AgentState
from backend.agent.prompts import (
    MANAGER_SYSTEM_PROMPT,
    SPARK_AGENT_PROMPT,
    PULSE_AGENT_PROMPT,
    INSIGHT_AGENT_PROMPT,
    GUARDIAN_AGENT_PROMPT,
    VAULT_AGENT_PROMPT,
    PATHFINDER_AGENT_PROMPT,
    ANALYZER_AGENT_PROMPT,
    PROVISIONER_AGENT_PROMPT,
    LIYA_AGENT_PROMPT,
    SIGNA_AGENT_PROMPT,
    ORACLE_AGENT_PROMPT,
    MESSENGER_AGENT_PROMPT,
)

# --- MCP Tools (API-based) ---
from backend.agent.tools.mcp_tools import (
    check_router_health,
    create_fault_ticket,
    get_data_usage,
    get_billing_info,
    get_daily_usage_logs,
    process_package_payment,
    pay_slt_bill,
    record_new_connection,
    request_report_email,
    request_report_whatsapp,
    get_active_fault_tickets,
    get_technician_diagnostics,
    get_predictive_degradation_report,
    get_technician_status,
    check_kyc_status,
    finalize_new_connection,
    send_sms_notification,
    send_whatsapp_notification,
    check_area_outages,
    register_customer_agreement,
    get_full_customer_profile,
    dispatch_technician_admin,
    finalize_admin_approval,
    generate_predictive_faults,
    clear_predictive_faults,
    auto_dispatch_technicians_by_area,
    generate_daily_faults,
    simulate_customer_app_fault,
    resolve_all_faults_admin,
    resolve_major_outage,
    generate_churn_predictions,
    resolve_churn_risk,
    search_slt_knowledgebase,
    resolve_fault_admin
)

from backend.agent.tools.package_advisor import package_advisor
from backend.agent.tools.self_fix import self_fix_internet
from backend.agent.tools.scam_shield import scam_shield

# --- Vault/Blockchain Tools ---
from backend.agent.tools.vault import (
    commit_sla_to_ledger,
    commit_visit_handshake_to_ledger,
    verify_ledger_security,
    commit_payment_to_ledger,
    commit_usage_snapshot_to_ledger,
    commit_equipment_transfer_to_ledger
)

# --- Provisioner/Operations Tools ---
from backend.agent.tools.provisioner_tools import (
    allocate_fiber_dp_loop,
    dispatch_installation_job
)

# --- RAG Retriever for Context Injection ---
from backend.rag.retriever import SLTRetriever

load_dotenv()

# --- LLM Setup ---

# Global reusable cached instances of ChatOpenAI to eliminate connection setup latency!
_llm_cache = {}

def get_llm(temperature: float = 0.3):
    cache_key = temperature
    if cache_key not in _llm_cache:
        _llm_cache[cache_key] = ChatOpenAI(
            model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
            temperature=temperature,
            api_key=os.getenv("OPENAI_API_KEY"),
        )
    return _llm_cache[cache_key]

# --- Singleton RAG Retriever ---
_retriever = None

def get_retriever():
    global _retriever
    if _retriever is None:
        _retriever = SLTRetriever()
    return _retriever

# --- Tool Configuration (ALL tools wired!) ---

tools = [
    # MCP API Tools
    check_router_health,
    create_fault_ticket,
    get_data_usage,
    get_billing_info,
    get_daily_usage_logs,
    process_package_payment,
    record_new_connection,
    request_report_email,
    request_report_whatsapp,
    get_technician_diagnostics,
    get_active_fault_tickets,
    pay_slt_bill,
    get_predictive_degradation_report,
    get_technician_status,
    package_advisor,
    self_fix_internet,
    scam_shield,
    send_sms_notification,
    send_whatsapp_notification,
    register_customer_agreement,
    search_slt_knowledgebase,
    # Vault/Blockchain Tools
    commit_sla_to_ledger,
    commit_visit_handshake_to_ledger,
    verify_ledger_security,
    commit_payment_to_ledger,
    commit_usage_snapshot_to_ledger,
    commit_equipment_transfer_to_ledger,
    # Provisioner tools
    allocate_fiber_dp_loop,
    dispatch_installation_job,
    check_area_outages,
    get_full_customer_profile,
    # Admin tools
    dispatch_technician_admin,
    finalize_admin_approval,
    generate_predictive_faults,
    clear_predictive_faults,
    auto_dispatch_technicians_by_area,
    generate_daily_faults,
    simulate_customer_app_fault,
    resolve_all_faults_admin,
    resolve_major_outage,
    generate_churn_predictions,
    resolve_churn_risk,
    check_kyc_status,
    finalize_new_connection,
    resolve_fault_admin
]
tool_node = ToolNode(tools)

# --- Phone Number Extraction ---

PHONE_PATTERN = re.compile(
    r'(?:0\d{9})'           # 0112895800 format
    r'|(?:\+94\d{9})'       # +94112895800 format
    r'|(?:94\d{9})'         # 94112895800 format
    r'|(?:0\d{2}[\s-]\d{7})'  # 011-2895800 or 011 2895800 format
)

def extract_phone_number(text: str) -> Optional[str]:
    """Extract SLT phone number from text using common Sri Lankan formats, including spoken Sinhala digits."""
    if not text:
        return None
        
    normalized = text.lower()
    
    # Map Sinhala digit words to digits
    sinhala_digits = {
        "බින්දුවයි": "0", "බින්දුව": "0",
        "එකයි": "1", "එක": "1",
        "දෙකයි": "2", "දෙක": "2",
        "තුනයි": "3", "තුන": "3",
        "හතරයි": "4", "හතර": "4",
        "පහයි": "5", "පහක්": "5", "පහ": "5",
        "හයයි": "6", "හය": "6",
        "හතයි": "7", "හත": "7",
        "අටයි": "8", "අට": "8",
        "නමයයි": "9", "නමය": "9", "නවයයි": "9", "නවය": "9"
    }
    
    # Replace Sinhala digit words with numbers
    for word, digit in sinhala_digits.items():
        normalized = normalized.replace(word, digit)
        
    # Remove all spaces and dashes in case of spaced digits
    # (e.g. "0 1 1 2..." becomes "0112...")
    no_spaces = re.sub(r'[\s-]', '', normalized)
    
    # Now check for standard 10-digit number anywhere in the string
    # or Sri Lankan format with +94/94
    match = re.search(r'(0\d{9})|(\+94\d{9})|(94\d{9})', no_spaces)
    if match:
        return match.group()
        
    # Fallback to standard pattern check on the original text
    match = PHONE_PATTERN.search(text)
    if match:
        return match.group().replace(" ", "").replace("-", "")
        
    return None

# --- RAG Context Retrieval ---

def get_rag_context(query: str, agent_name: str) -> str:
    """Retrieve relevant context from ChromaDB based on the query and active agent."""
    try:
        retriever = get_retriever()
        
        # Agent-specific source filters for more targeted retrieval
        agent_source_map = {
            "spark_agent": "packages",
            "guardian_agent": "scam_patterns",
            "insight_agent": "usage_profiles",
        }
        
        source_filter = agent_source_map.get(agent_name)
        
        # Get primary context (filtered or general)
        primary_docs = retriever.query(query, n_results=3, source_filter=source_filter)
        
        # Also get general context from web crawled data for broader knowledge
        web_docs = retriever.query(query, n_results=2, source_filter="slt_website")
        
        # Combine and format
        all_docs = primary_docs + web_docs
        
        if not all_docs:
            return ""
        
        context_parts = []
        for i, doc in enumerate(all_docs):
            source = doc['metadata'].get('source', 'unknown')
            title = doc['metadata'].get('title', '')
            text = doc['text']
            
            # Skip very low relevance results (high distance = low relevance in cosine space)
            if doc.get('distance') and doc['distance'] > 1.2:
                continue
                
            header = f"[Source: {source}"
            if title:
                header += f" | {title}"
            header += "]"
            context_parts.append(f"{header}\n{text}")
        
        if not context_parts:
            return ""
            
        return "\n\n---\n\n".join(context_parts)
        
    except Exception as e:
        print(f"[WARNING] RAG retrieval failed: {e}")
        return ""

# --- Node Functions ---

def _extract_text(content):
    if isinstance(content, list):
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                return str(item.get("text", ""))
        return ""
    return str(content)

async def classify_intent(state: AgentState):
    """Manager Agent: Routes to the appropriate specialist."""
    # Find the very last human message to only classify the latest query
    last_human_msg = None
    for msg in reversed(state["messages"]):
        if isinstance(msg, HumanMessage):
            last_human_msg = msg
            break
            
    if last_human_msg is None:
        last_human_msg = state["messages"][-1]
        
    msg_text = _extract_text(last_human_msg.content)
    text = msg_text.strip().lower()
    
    # --- Phone Number Auto-Extraction (runs on every message!) ---
    existing_phone = state.get("phone_number")
    if not existing_phone:
        # Scan ALL messages for a phone number (not just the latest)
        for msg in state["messages"]:
            if isinstance(msg, HumanMessage):
                found = extract_phone_number(_extract_text(msg.content))
                if found:
                    existing_phone = found
                    print(f"[INFO] Phone number auto-extracted from history: {found}")
                    break
    
    # Also check the latest message
    if not existing_phone:
        found = extract_phone_number(msg_text)
        if found:
            existing_phone = found
            print(f"[INFO] Phone number auto-extracted from latest message: {found}")
    
    # Fast bypass: if it's a simple greeting, skip LLM classification entirely for 0ms classification latency!
    greetings = ["hi", "hello", "hey", "halo", "helo", "හෙලෝ", "ආයුබෝවන්", "வணக்கம்", "vanakkam", "yo", "macho", "machan"]
    if text in greetings or any(text.startswith(g) for g in ["hi ", "hello ", "hey ", "හෙලෝ "]):
        return {
            "current_agent": "liya_agent",
            "intent": "greeting",
            "loop_count": 0,
            "task_resolved": False,
            "phone_number": existing_phone,
            "rag_context": "",
        }
    
    # We no longer load RAG context unconditionally!
    rag_context = ""
        
    # Pass the recent text-only messages to give the Manager context (avoid ToolMessages which break OpenAI API if sliced)
    safe_history = []
    for msg in state["messages"][-5:]:
        if isinstance(msg, HumanMessage):
            safe_history.append(msg)
        elif hasattr(msg, "content") and getattr(msg, "content") and not getattr(msg, "tool_calls", None):
            # Only append text-based AIMessages, skipping ToolMessages and ToolCall AIMessages
            if getattr(msg, "type", "") == "ai":
                safe_history.append(msg)
                
    llm = get_llm(temperature=0)
    messages = [SystemMessage(content=MANAGER_SYSTEM_PROMPT)] + safe_history
    
    # We want the manager to output JSON
    response = await llm.ainvoke(messages)
    content = response.content.strip()
    
    try:
        # Simple extraction if it returns markdown
        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()
        
        data = json.loads(content)
        agent = data.get("agent", "liya_agent")
        intent = data.get("intent", "general")
    except:
        agent = "liya_agent"
        intent = "general"
        
    return {
        "current_agent": agent,
        "intent": intent,
        "loop_count": 0,
        "task_resolved": False,
        "phone_number": existing_phone,
        "rag_context": rag_context,
    }

async def agent_node(state: AgentState):
    """Generic node for all agents. Uses the prompt for the current_agent with RAG context injection."""
    agent_name = state["current_agent"]
    
    prompts = {
        "spark_agent": SPARK_AGENT_PROMPT,
        "pulse_agent": PULSE_AGENT_PROMPT,
        "insight_agent": INSIGHT_AGENT_PROMPT,
        "guardian_agent": GUARDIAN_AGENT_PROMPT,
        "vault_agent": VAULT_AGENT_PROMPT,
        "pathfinder_agent": PATHFINDER_AGENT_PROMPT,
        "analyzer_agent": ANALYZER_AGENT_PROMPT,
        "provisioner_agent": PROVISIONER_AGENT_PROMPT,
        "liya_agent": LIYA_AGENT_PROMPT,
        "signa_agent": SIGNA_AGENT_PROMPT,
        "oracle_agent": ORACLE_AGENT_PROMPT,
        "messenger_agent": MESSENGER_AGENT_PROMPT,
    }
    
    base_prompt = prompts.get(agent_name, LIYA_AGENT_PROMPT)
    
    # --- Inject Phone Number into prompt if available ---
    phone_number = state.get("phone_number")
    if phone_number:
        base_prompt += f"\n\n## PHONE NUMBER (ALREADY PROVIDED - DO NOT ASK AGAIN!):\nThe customer's SLT phone number is: **{phone_number}**. Use this directly for any lookups. DO NOT ask the customer for their phone number again."
    
    # --- Inject RAG Context into prompt ---
    rag_context = state.get("rag_context", "")
    if rag_context:
        base_prompt += f"""

## SLT KNOWLEDGE BASE CONTEXT (Use this real data to answer accurately!):
The following is verified information from SLT's official knowledge base and website. 
Use this data to provide accurate, specific answers. Do NOT make up information that contradicts this data.
Naturally weave this information into your response — do not copy-paste it raw.

{rag_context}
"""
    
    # --- Inject User Language Preference ---
    user_language = state.get("user_language", "si")
    lang_map = {"si": "Sinhala (සිංහල)", "ta": "Tamil (தமிழ்)", "en": "English"}
    lang_name = lang_map.get(user_language, "Sinhala (සිංහල)")
    
    # Strictly define how to respond based ONLY on the user_language variable.
    if user_language == "en":
        lang_instructions = "CRITICAL RULE: You MUST reply ONLY in English, regardless of the language the user typed in! Even if the user types in Sinhala or Tamil, reply in English."
    elif user_language == "ta":
        lang_instructions = "CRITICAL RULE: You MUST reply ONLY in Tamil script (தமிழ்) with English technical terms mixed in. Regardless of the language the user typed in, reply in Tamil!"
    else:
        lang_instructions = 'CRITICAL RULE: You MUST write your response in the Sinhala script (සිංහල) with English technical terms naturally mixed in. Example: "ඔබේ internet connection එක check කරන්නම් 😊". DO NOT reply in Singlish or pure English. Even if the user types in English, you MUST translate your response and reply in Sinhala!\nALWAYS refer to technicians as "තාක්ෂණ ශිල්පියා" (Thakshana shilpiya). DO NOT USE "තාක්ෂණිකයා" or "කාර්මිකයා"!'

    base_prompt += f"""
## MANDATORY RESPONSE LANGUAGE:
The customer's interface is set to **{lang_name}**.
{lang_instructions}
This is a STRICT requirement for the voice synthesis to work correctly.
"""

    # --- Inject Admin/Staff Overrides ---
    if state.get("is_admin"):
        base_prompt += """
## ADMIN SYSTEM OVERRIDE (CRITICAL):
You are currently speaking directly to an INTERNAL SLT ADMIN/STAFF MEMBER via the Admin Dashboard.
1. DO NOT greet them like a customer (No "Ayubowan", no "How can I help you?"). Use a professional internal system greeting like "System Ready." or "Awaiting Command."
2. **CONCISENESS RULE**: If the admin asks for SPECIFIC technical information (e.g. "What is the DP Loop?"), ONLY provide the DP Loop. DO NOT summarize their entire bill, data usage, or package details unless explicitly requested. BE EXTREMELY DIRECT AND CONCISE.
3. You have full security clearance. Do not hide any technical parameters.
"""
    else:
        base_prompt += """
## CUSTOMER SECURITY RULE:
You are speaking to a CUSTOMER. You are STRICTLY FORBIDDEN from providing raw technical details (DP Box, DP Loop, Loop IDs, SNR). Keep responses simple and non-technical. You are forbidden from giving details for any phone number other than the one authenticated in this session.
You are STRICTLY FORBIDDEN from sending or displaying internal WFM reports or office data to the customer. If they ask for any report or office data, politely and professionally refuse the request, stating it is internal office data.

## STRICT TOOL DIRECTIVE:
When the user asks for their data usage, YOU MUST CALL the `get_data_usage` tool.
When the user asks for their bill, package details, or account balance, YOU MUST CALL the `get_billing_info` tool to fetch their real data! Do NOT just tell them to use the MySLT app. Do NOT rely on RAG text to answer this. ACTUALLY CALL THE TOOL!
"""
    
        # Dynamic Tool Binding to Reduce Latency and Token Overhead
    agent_tools = []
    if agent_name == "spark_agent":
        agent_tools = [package_advisor, record_new_connection, process_package_payment]
    elif agent_name == "pulse_agent":
        agent_tools = [check_router_health, create_fault_ticket, self_fix_internet, simulate_customer_app_fault]
    elif agent_name == "insight_agent":
        agent_tools = [get_data_usage, get_billing_info, get_daily_usage_logs, pay_slt_bill]
    elif agent_name == "guardian_agent":
        agent_tools = [scam_shield]
    elif agent_name == "pathfinder_agent":
        agent_tools = [request_report_email, request_report_whatsapp, get_technician_diagnostics, get_active_fault_tickets, get_predictive_degradation_report, get_technician_status]
    elif agent_name == "provisioner_agent":
        agent_tools = [allocate_fiber_dp_loop, dispatch_installation_job, check_area_outages, get_full_customer_profile, check_kyc_status, finalize_new_connection]
    elif agent_name == "vault_agent":
        agent_tools = [commit_sla_to_ledger, commit_visit_handshake_to_ledger, verify_ledger_security, commit_payment_to_ledger, commit_usage_snapshot_to_ledger, commit_equipment_transfer_to_ledger]
    elif agent_name == "oracle_agent":
        agent_tools = [generate_predictive_faults, clear_predictive_faults, auto_dispatch_technicians_by_area, generate_daily_faults, resolve_all_faults_admin, resolve_major_outage, generate_churn_predictions, resolve_churn_risk, dispatch_technician_admin, finalize_admin_approval, resolve_fault_admin]
    elif agent_name == "messenger_agent":
        agent_tools = [send_sms_notification, send_whatsapp_notification]
    elif agent_name == "analyzer_agent":
        agent_tools = [search_slt_knowledgebase]
    
    if len(agent_tools) > 0:
        llm = get_llm().bind_tools(agent_tools)
    else:
        llm = get_llm() # Fast path without tools for liya_agent or unknown agents

    
    messages = [SystemMessage(content=base_prompt)] + state["messages"]
    response = await llm.ainvoke(messages)
    
    return {
        "messages": [response],
        "loop_count": state.get("loop_count", 0) + 1
    }

def should_continue(state: AgentState) -> Literal["tools", "end"]:
    """Determines if the agent wants to call a tool or finish."""
    last_message = state["messages"][-1]
    
    if last_message.tool_calls:
        return "tools"
    
    # If too many loops, force end to prevent infinite loops
    if state.get("loop_count", 0) > 10:
        return "end"
        
    return "end"

# --- Graph Building ---

def build_graph():
    workflow = StateGraph(AgentState)
    
    # Add Nodes
    workflow.add_node("classify", classify_intent)
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", tool_node)
    
    # Set Entry Point
    workflow.set_entry_point("classify")
    
    # Edges
    workflow.add_edge("classify", "agent")
    
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        {
            "tools": "tools",
            "end": END
        }
    )
    
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()

# Singleton
_graph = None

def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph
