"""
SLT Smart Assistant - PEO TV Data Ingestion Pipeline
"""

import json
import os
from pathlib import Path
from dotenv import load_dotenv
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

load_dotenv()

DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent.parent / "chroma_db"))

def load_json(filename: str) -> dict:
    filepath = DATA_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def prepare_peotv_documents() -> list[dict]:
    data = load_json("peotv.json")
    documents = []

    for item in data:
        text = f"Q: {item['question']}\nA: {item['answer']}"
        documents.append({
            "text": text,
            "metadata": {
                "source": "peotv",
                "category": item["category"]
            }
        })
    return documents

def main():
    print("Loading PEO TV data...")
    peotv_docs = prepare_peotv_documents()

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    print("Chunking documents...")
    chunks = []
    metadatas = []
    
    for doc in peotv_docs:
        splits = text_splitter.split_text(doc["text"])
        for split in splits:
            chunks.append(split)
            metadatas.append(doc["metadata"])

    print(f"Generated {len(chunks)} chunks.")

    print("Connecting to ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    
    collection = client.get_or_create_collection(
        name="slt_knowledge",
        metadata={"hnsw:space": "cosine"}
    )
    
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
    
    print("Creating embeddings and inserting into DB...")
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]
        batch_metadatas = metadatas[i:i + batch_size]
        
        batch_embeddings = embeddings.embed_documents(batch_chunks)
        
        ids = [f"peotv_{i+j}" for j in range(len(batch_chunks))]
        
        collection.upsert(
            documents=batch_chunks,
            embeddings=batch_embeddings,
            metadatas=batch_metadatas,
            ids=ids
        )
        print(f"Inserted batch {i//batch_size + 1}")

    print("PEO TV knowledge ingestion complete!")

if __name__ == "__main__":
    main()
