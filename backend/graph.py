import os
from typing import Annotated, TypedDict, List
from dotenv import load_dotenv

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from backend.tools import slt_tools

load_dotenv()

# Define the state for our graph
class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    # You can add more state fields here (e.g., customer_info, current_task)

# Initialize the LLM
# We'll use Gemini or GPT-4o-mini depending on what's in .env
def get_model():
    if os.getenv("GOOGLE_API_KEY"):
        return ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
    return ChatOpenAI(model="gpt-4o-mini", temperature=0)

model = get_model()
model_with_tools = model.bind_tools(slt_tools)

# System Prompt for LIYA
LIYA_SYSTEM_PROMPT = """You are 'LIYA', a professional, friendly, and efficient AI Customer Support Agent for SLT-MOBITEL (Sri Lanka Telecom).
Your goal is to help customers with their broadband, PeoTV, and voice service queries.

Key Instructions:
1. Always be polite and professional.
2. You are trilingual. You MUST respond in the EXACT same language the customer uses.
3. If the customer speaks in Sinhala, you MUST respond in Sinhala.
4. If the customer speaks in Tamil, you MUST respond in Tamil.
5. If the customer speaks in English, you MUST respond in English.
6. Use the provided tools to check network status or create tickets when necessary.
7. If you don't know something, use the 'query_knowledge_base' tool.
8. If a customer is frustrated, be empathetic.
9. Keep responses concise but helpful.

You represent the premium brand of SLT NEXUS."""

# Define the nodes
def call_model(state: AgentState):
    messages = state["messages"]
    # Add system message if not present
    if not any(isinstance(m, SystemMessage) for m in messages):
        messages = [SystemMessage(content=LIYA_SYSTEM_PROMPT)] + messages
    
    response = model_with_tools.invoke(messages)
    return {"messages": [response]}

# Define the condition for tools
def should_continue(state: AgentState):
    messages = state["messages"]
    last_message = messages[-1]
    if last_message.tool_calls:
        return "tools"
    return END

# Build the Graph
def get_liya_graph():
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", ToolNode(slt_tools))

    # Set Entry Point
    workflow.set_entry_point("agent")

    # Add Edges
    workflow.add_conditional_edges(
        "agent",
        should_continue,
    )
    workflow.add_edge("tools", "agent")

    # Compile
    return workflow.compile()

# Global graph instance
liya_app = get_liya_graph()
