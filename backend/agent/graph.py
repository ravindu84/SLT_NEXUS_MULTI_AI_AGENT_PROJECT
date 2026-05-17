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
    get_daily_usage_logs,
    process_package_payment,
    record_new_connection,
    request_report_email,
)

# --- RAG-Powered Tools (Vector Store) ---
from backend.agent.tools.package_advisor import package_advisor
from backend.agent.tools.self_fix import self_fix_internet
from backend.agent.tools.scam_shield import scam_shield
from backend.agent.tools.usage_analyzer import usage_analyzer

# --- Vault/Blockchain Tools ---
from backend.agent.tools.vault import (
    write_solidity_contract,
    commit_sla_to_ledger,
    commit_visit_handshake_to_ledger,
    verify_ledger_security,
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
    get_daily_usage_logs,
    process_package_payment,
    record_new_connection,
    request_report_email,
    # RAG-Powered Tools (Vector Store search)
    package_advisor,
    self_fix_internet,
    scam_shield,
    usage_analyzer,
    # Vault/Blockchain Tools
    write_solidity_contract,
    commit_sla_to_ledger,
    commit_visit_handshake_to_ledger,
    verify_ledger_security,
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
    """Extract SLT phone number from text using common Sri Lankan formats."""
    match = PHONE_PATTERN.search(text)
    if match:
        # Normalize: remove spaces and dashes
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
            "pulse_agent": "troubleshooting",
            "guardian_agent": "scam_patterns",
            "insight_agent": "usage_profiles",
        }
        
        source_filter = agent_source_map.get(agent_name)
        
        # Get primary context (filtered or general)
        primary_docs = retriever.query(query, n_results=4, source_filter=source_filter)
        
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
        
    text = last_human_msg.content.strip().lower()
    
    # --- Phone Number Auto-Extraction (runs on every message!) ---
    existing_phone = state.get("phone_number")
    if not existing_phone:
        # Scan ALL messages for a phone number (not just the latest)
        for msg in state["messages"]:
            if isinstance(msg, HumanMessage):
                found = extract_phone_number(msg.content)
                if found:
                    existing_phone = found
                    print(f"[INFO] Phone number auto-extracted from history: {found}")
                    break
    
    # Also check the latest message
    if not existing_phone:
        found = extract_phone_number(last_human_msg.content)
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
        }
    
    # --- RAG Context Retrieval ---
    rag_context = get_rag_context(last_human_msg.content, "liya_agent")
        
    # High-speed one-pass classification by only sending latest human message instead of complete sessional history
    llm = get_llm(temperature=0)
    messages = [SystemMessage(content=MANAGER_SYSTEM_PROMPT), last_human_msg]
    
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
    base_prompt += f"""

## MANDATORY RESPONSE LANGUAGE:
The customer's interface is set to **{lang_name}**. You MUST respond primarily in {lang_name}.
- For Sinhala: Write in Sinhala script (සිංහල) with English technical terms naturally mixed in. Example: "ඔබේ internet connection එක check කරන්නම් 😊"
- For Tamil: Write in Tamil script (தமிழ்) with English technical terms naturally mixed in.
- For English: Write in English.
This is a STRICT requirement for the voice synthesis to work correctly.
"""
    
    llm = get_llm().bind_tools(tools)
    
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
