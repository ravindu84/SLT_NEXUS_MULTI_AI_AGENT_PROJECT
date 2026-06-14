import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent.parent / "chroma_db"))

def load_json(filename: str) -> dict:
    filepath = DATA_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)

def prepare_navigation_documents() -> list[dict]:
    data = load_json("website_navigation.json")
    documents = []

    for menu in data["navigation_menus"]:
        for category in menu["categories"]:
            text = f"SLT Website Navigation - Menu: {menu['menu_name']}\nCategory: {category['name']}\nItems available in this menu: {', '.join(category['items'])}"
            documents.append({
                "text": text,
                "metadata": {
                    "source": "website_navigation",
                    "category": menu["menu_name"],
                    "sub_category": category["name"]
                }
            })

    return documents

def run_ingestion():
    print("INFO: Loading website navigation menus...")
    all_documents = prepare_navigation_documents()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " "]
    )

    texts, metadatas, ids = [], [], []
    for i, doc in enumerate(all_documents):
        chunks = splitter.split_text(doc["text"])
        for j, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append(doc["metadata"])
            ids.append(f"nav_doc_{i}_chunk_{j}")

    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    collection = client.get_or_create_collection(name="slt_knowledge", metadata={"hnsw:space": "cosine"})

    embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))
    embedded_texts = embeddings.embed_documents(texts)

    collection.add(
        documents=texts,
        embeddings=embedded_texts,
        metadatas=metadatas,
        ids=ids,
    )
    
    print(f"SUCCESS: Ingested {len(texts)} navigation menu chunks. Total collection size: {collection.count()}")

if __name__ == "__main__":
    run_ingestion()
