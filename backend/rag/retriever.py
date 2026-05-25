"""
SLT Smart Assistant - Vector Store Retriever
Handles querying ChromaDB for relevant documents
"""

import os
from pathlib import Path

import chromadb
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.messages import HumanMessage


CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent.parent / "chroma_db"))


class SLTRetriever:
    """Retriever for SLT knowledge base using ChromaDB."""

    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        self.collection = self.client.get_or_create_collection("slt_knowledge")
        self.embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
        self.llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    def expand_query(self, query_text: str) -> str:
        """Use an LLM to rewrite and expand vague/Sinhala queries into perfect English search terms."""
        prompt = f"""
        You are an expert search query generator for SLT-MOBITEL's knowledge base.
        The user has provided a query which might be in Sinhala, Singlish, or vague English.
        Rewrite it into a highly specific, keyword-rich English search query optimized for vector semantic search.
        ONLY output the rewritten query string. No quotes, no intro.
        
        Original Query: {query_text}
        """
        try:
            return self.llm.invoke([HumanMessage(content=prompt)]).content.strip()
        except Exception:
            return query_text

    def query(self, query_text: str, n_results: int = 5, source_filter: str = None) -> list[dict]:
        """
        Query the vector database for relevant documents.
        
        Args:
            query_text: The search query
            n_results: Number of results to return
            source_filter: Optional filter by source (packages, troubleshooting, scam_patterns, faq, usage_profiles)
        
        Returns:
            List of relevant document dicts with text and metadata
        """
        # Expand query for better semantic match
        expanded_query = self.expand_query(query_text)
        print(f"[RAG] Original Query: {query_text} | Expanded: {expanded_query}")
        
        query_embedding = self.embeddings.embed_query(expanded_query)

        where_filter = None
        if source_filter:
            where_filter = {"source": source_filter}

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=where_filter,
        )

        documents = []
        for i in range(len(results["documents"][0])):
            documents.append({
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i] if results.get("distances") else None,
            })

        return documents

    def get_context_string(self, query_text: str, n_results: int = 5, source_filter: str = None) -> str:
        """Get relevant documents as a formatted context string."""
        docs = self.query(query_text, n_results, source_filter)
        context_parts = []
        for i, doc in enumerate(docs):
            context_parts.append(f"[Source {i+1}: {doc['metadata'].get('source', 'unknown')}]\n{doc['text']}")
        return "\n\n---\n\n".join(context_parts)
