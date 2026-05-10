"""
SLT Smart Assistant - Self-Fix Internet Tool
Provides troubleshooting guides for common internet issues.
"""

from langchain.tools import tool

from backend.rag.retriever import SLTRetriever


@tool
def self_fix_internet(query: str) -> str:
    """
    Provide troubleshooting steps to fix internet issues.
    Use this tool when the user reports:
    - No internet connection
    - Slow internet speed
    - WiFi not working
    - Router issues (lights, LOS red, etc.)
    - Connection drops
    - WiFi password issues
    - Router setup help
    
    Args:
        query: User's description of their internet problem
    
    Returns:
        Step-by-step troubleshooting guide from the SLT knowledge base
    """
    retriever = SLTRetriever()
    context = retriever.get_context_string(query, n_results=5, source_filter="troubleshooting")
    
    # Also check FAQ for relevant info
    faq_context = retriever.get_context_string(query, n_results=2, source_filter="faq")
    
    return f"""
TROUBLESHOOTING GUIDE:
{context}

RELATED FAQ:
{faq_context}

Provide a clear, step-by-step troubleshooting guide.
Be empathetic and patient. Use simple language.
If the issue cannot be self-fixed, provide escalation info (call 1212).
"""
