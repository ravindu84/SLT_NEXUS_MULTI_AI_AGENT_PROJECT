"""
SLT Smart Assistant - Package Advisor Tool
Recommends the best SLT package based on user needs and usage patterns.
"""

from langchain.tools import tool

from backend.rag.retriever import SLTRetriever


@tool
def package_advisor(query: str) -> str:
    """
    Recommend the best SLT internet package based on user needs.
    Use this tool when the user asks about:
    - Which package to choose
    - Package recommendations
    - Internet plans and pricing
    - Upgrading or downgrading packages
    - Comparing packages
    - Best package for gaming, streaming, work from home, etc.
    
    Args:
        query: User's question about packages, including their usage needs
    
    Returns:
        Relevant package information and recommendations from the SLT knowledge base
    """
    retriever = SLTRetriever()
    context = retriever.get_context_string(query, n_results=5, source_filter="packages")
    
    # Also get usage profile context if relevant
    usage_context = retriever.get_context_string(query, n_results=2, source_filter="usage_profiles")
    
    return f"""
PACKAGE INFORMATION:
{context}

USAGE PROFILE INSIGHTS:
{usage_context}

Based on the above information, recommend the best package for the user's needs.
Consider their usage patterns, family size, and budget.
Calculate potential savings if they switch packages.
"""
