"""
SLT Smart Assistant - Scam Shield Tool
Detects and warns about telecom scams and phishing attempts.
"""

from langchain.tools import tool

from backend.rag.retriever import SLTRetriever


@tool
def scam_shield(message_text: str) -> str:
    """
    Analyze a message (SMS, email, etc.) to determine if it's a scam.
    Use this tool when the user:
    - Wants to check if a message is a scam
    - Received a suspicious SMS
    - Got a phishing email or link
    - Wants to know if a call/offer is legitimate
    - Asks about SLT scams or fraud
    
    Args:
        message_text: The suspicious message text the user wants to check
    
    Returns:
        Scam analysis with matching patterns and safety advice
    """
    retriever = SLTRetriever()
    context = retriever.get_context_string(message_text, n_results=5, source_filter="scam_patterns")
    
    return f"""
SCAM DATABASE MATCHES:
{context}

MESSAGE TO ANALYZE: "{message_text}"

Analyze the message against known scam patterns.
Provide:
1. VERDICT: Is this likely a SCAM or SAFE? (with confidence level)
2. RED FLAGS: What suspicious elements were found
3. EXPLANATION: Why this is or isn't a scam
4. ACTION: What the user should do (block, report, ignore)
5. EDUCATION: How to identify similar scams in the future
Always reference official SLT contact info for verification.
"""
