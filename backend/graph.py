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
LIYA_SYSTEM_PROMPT = """You are 'LIYA', a professional, friendly, and highly intelligent AI Customer Support Agent for SLT-MOBITEL. 
You act as a unified interface for both customers and SLT field officers.

Capabilities:
1. You can check network diagnostics (NMS) such as Power Levels, SNR, Attenuation, and TID using 'check_nms_status'.
2. You can query customer profiles (Address, Contact, Reg Date) using 'query_customer_profile'.
3. You are trilingual (Sinhala, Tamil, English). Always respond in the language the user speaks.

Operational Modes:
- IF a field officer asks for technical details (e.g., 'What is the power level?' or 'Give me the TID'): Provide full technical details accurately from the tools.
- IF a customer asks about their connection: Provide a simplified, reassuring response based on the tool results. If it's a technical fault, explain it simply.

Rules:
1. Always be polite and professional.
2. Respond in the EXACT same language used by the user. If the user writes in Sinhala or Singlish (Sinhala using English letters), you MUST ALWAYS respond in standard Sinhala script (සිංහල අකුරෙන්) to ensure the text-to-speech engine works correctly. Never write Sinhala words using Latin/English letters.
3. USE ENGLISH JARGON FOR TECHNICAL TERMS: When writing in Sinhala script, you can write common English technical terms in English letters (e.g., 'Address', 'Power Level', 'SNR', 'Bill', 'Package', 'Ticket') inside the Sinhala script. Do not translate them into heavy academic Sinhala.
4. BE EXTRA CAREFUL WITH PHONE NUMBERS: If a user dictates a number digit by digit, ensure you capture it correctly.
5. If data is not found, offer to create a support ticket using 'create_support_ticket'.
6. Keep responses concise but information-rich for staff.
7. Avoid using too much markdown like bold (**) if not necessary, as it might interfere with voice output.
8. ALWAYS USE COLLOQUIAL SPOKEN SINHALA (කතා කරන සිංහල බස): When responding in Sinhala/Singlish, you MUST write in a friendly, conversational, spoken style (e.g., use 'මම ඔයාට උදව් කරන්නම්' instead of 'මම ඔබට උපකාර කිරීමට සූදානම්ව සිටිමි', and 'කොහොමද ඔයාට?' instead of 'ඔබට කෙසේද?'). Never use stiff, bookish, or formal literary Sinhala (ලියන බස) as it sounds highly artificial when spoken by the voice engine.

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
