"""
SLT Smart Assistant - Usage Analyzer Tool
Analyzes data usage patterns and suggests optimizations.
"""

from langchain.tools import tool

from backend.rag.retriever import SLTRetriever


@tool
def usage_analyzer(query: str) -> str:
    """
    Analyze data usage patterns and suggest optimizations.
    Use this tool when the user:
    - Wants to understand their data usage
    - Asks why data runs out quickly
    - Wants tips to save data
    - Asks about data consumption of specific apps
    - Wants to optimize their internet usage
    - Asks about peak vs off-peak usage
    
    Args:
        query: User's question about data usage and optimization
    
    Returns:
        Usage analysis, breakdown insights, and optimization tips
    """
    retriever = SLTRetriever()
    
    # Get usage profile info
    usage_context = retriever.get_context_string(query, n_results=3, source_filter="usage_profiles")
    
    # Get package info for optimization suggestions
    package_context = retriever.get_context_string(query, n_results=2, source_filter="packages")
    
    # Get FAQ about data usage
    faq_context = retriever.get_context_string(query, n_results=2, source_filter="faq")
    
    return f"""
USAGE PROFILES & DATA:
{usage_context}

AVAILABLE PACKAGES:
{package_context}

RELATED FAQ:
{faq_context}

Based on the user's usage description:
1. Identify their usage profile (gamer, streamer, WFH, etc.)
2. Show estimated data breakdown by app
3. Suggest specific data-saving tips
4. Recommend if they need a package change
5. Show potential savings with optimization
Use specific numbers and percentages where possible.
"""
