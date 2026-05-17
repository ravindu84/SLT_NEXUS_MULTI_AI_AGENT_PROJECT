"""
LIYA Multi-Agent System - Agent State Definition
Defines the shared state that flows through the LangGraph state machine.
"""

from typing import Annotated, Literal, Optional
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
    phone_number: Optional[str]  # Shared across all agents — extracted once, never re-asked
    rag_context: Optional[str]   # RAG-retrieved context injected into agent prompts
    user_language: Optional[str]  # User's selected language (en/si/ta) from frontend


# Valid agent names for routing
AGENT_NAMES = Literal[
    "liya_agent",
    "signa_agent",
    "oracle_agent",
    "pathfinder_agent",
    "pulse_agent",
    "insight_agent",
    "spark_agent",
    "guardian_agent",
    "vault_agent",
    "provisioner_agent",
    "analyzer_agent",
    "messenger_agent"
]
