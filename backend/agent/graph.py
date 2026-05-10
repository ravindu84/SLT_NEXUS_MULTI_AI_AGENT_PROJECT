"""
SLT NEXUS - LangGraph Multi-Agent Orchestrator
Implements an 8-agent swarm with a goal-oriented routing logic.
"""

import json
import os
from typing import Literal, Union
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
    DISPATCHER_AGENT_PROMPT,
    ANALYZER_AGENT_PROMPT,
    PROVISIONER_AGENT_PROMPT,
    LIYA_AGENT_PROMPT,
)

from backend.agent.tools.mcp_tools import (
    check_router_health,
    create_fault_ticket,
    get_data_usage,
    process_package_payment,
    record_new_connection,
)

load_dotenv()

# --- LLM Setup ---

def get_llm(temperature: float = 0.3):
    return ChatOpenAI(
        model=os.getenv("LLM_MODEL", "gpt-4o-mini"),
        temperature=temperature,
        api_key=os.getenv("OPENAI_API_KEY"),
    )

# --- Tool Configuration ---

tools = [
    check_router_health,
    create_fault_ticket,
    get_data_usage,
    process_package_payment,
    record_new_connection,
]
tool_node = ToolNode(tools)

# --- Node Functions ---

def classify_intent(state: AgentState):
    """Manager Agent: Routes to the appropriate specialist."""
    llm = get_llm(temperature=0)
    messages = [SystemMessage(content=MANAGER_SYSTEM_PROMPT)] + state["messages"]
    
    # We want the manager to output JSON
    response = llm.invoke(messages)
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
        "task_resolved": False
    }

def agent_node(state: AgentState):
    """Generic node for all agents. Uses the prompt for the current_agent."""
    agent_name = state["current_agent"]
    
    prompts = {
        "spark_agent": SPARK_AGENT_PROMPT,
        "pulse_agent": PULSE_AGENT_PROMPT,
        "insight_agent": INSIGHT_AGENT_PROMPT,
        "guardian_agent": GUARDIAN_AGENT_PROMPT,
        "vault_agent": VAULT_AGENT_PROMPT,
        "dispatcher_agent": DISPATCHER_AGENT_PROMPT,
        "analyzer_agent": ANALYZER_AGENT_PROMPT,
        "provisioner_agent": PROVISIONER_AGENT_PROMPT,
        "liya_agent": LIYA_AGENT_PROMPT,
    }
    
    prompt = prompts.get(agent_name, LIYA_AGENT_PROMPT)
    llm = get_llm().bind_tools(tools)
    
    messages = [SystemMessage(content=prompt)] + state["messages"]
    response = llm.invoke(messages)
    
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
