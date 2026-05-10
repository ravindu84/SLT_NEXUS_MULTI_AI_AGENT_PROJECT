"""
SLT Smart Assistant - Vector Store Retriever
Handles querying ChromaDB for relevant documents
"""

import os
from pathlib import Path

import chromadb
from langchain_community.embeddings import HuggingFaceEmbeddings


CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent.parent / "chroma_db"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


class SLTRetriever:
    """Retriever for SLT knowledge base using ChromaDB."""

    def __init__(self):
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        self.collection = self.client.get_collection("slt_knowledge")
        self.embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

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
        query_embedding = self.embeddings.embed_query(query_text)

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
