import random
from langchain_core.tools import tool

@tool
def check_network_status(phone_number: str) -> str:
    """Check the network status for a given SLT phone number or circuit ID."""
    # Mocking some SLT logic
    statuses = [
        "Normal: All services are operational.",
        "Warning: Slight latency detected in your area.",
        "Error: LOS (Loss of Signal) detected. Please check your fiber cable.",
        "Maintenance: Scheduled maintenance in progress for your region."
    ]
    # Simple deterministic choice based on last digit for demo consistency
    try:
        idx = int(phone_number[-1]) % len(statuses)
    except:
        idx = random.randint(0, len(statuses) - 1)
        
    return f"Status for {phone_number}: {statuses[idx]}"

@tool
def create_support_ticket(phone_number: str, issue_description: str) -> str:
    """Create a support ticket for a customer issue."""
    ticket_id = f"SLT-{random.randint(10000, 99999)}"
    return f"Ticket {ticket_id} has been created for {phone_number}. Our technical team will look into '{issue_description}' within 24 hours."

@tool
def query_knowledge_base(query: str) -> str:
    """Search SLT internal knowledge base for troubleshooting and info."""
    # This is a placeholder for RAG
    # In a real app, this would query a Vector DB (Pinecone/Milvus/etc)
    return "RAG Placeholder: SLT fiber troubleshooting suggests restarting the router and checking for the Red LOS light."

# List of tools to be used by the agent
slt_tools = [check_network_status, create_support_ticket, query_knowledge_base]
