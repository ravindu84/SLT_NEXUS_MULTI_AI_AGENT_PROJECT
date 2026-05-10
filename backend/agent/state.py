"""
LIYA Multi-Agent System - Agent State Definition
Defines the shared state that flows through the LangGraph state machine.
"""

from typing import Annotated, Literal
from typing_extensions import TypedDict

from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """
    Shared state for the LIYA multi-agent system.
    """
    messages: Annotated[list[BaseMessage], add_messages]
    current_agent: str
    intent: str
    task_resolved: bool
    loop_count: int
    metadata: dict


# Valid agent names for routing
AGENT_NAMES = Literal[
    "spark_agent", 
    "pulse_agent", 
    "insight_agent", 
    "guardian_agent", 
    "vault_agent", 
    "dispatcher_agent", 
    "analyzer_agent", 
    "provisioner_agent", 
    "liya_agent"
]
