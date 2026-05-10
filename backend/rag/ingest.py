"""
SLT Smart Assistant - Data Ingestion Pipeline
Loads all JSON datasets, chunks them, creates embeddings, and stores in ChromaDB
"""

import json
import os
from pathlib import Path

import chromadb
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings


DATA_DIR = Path(__file__).parent.parent / "data"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent.parent / "chroma_db"))


def load_json(filename: str) -> dict:
    """Load a JSON file from the data directory."""
    filepath = DATA_DIR / filename
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def prepare_package_documents() -> list[dict]:
    """Convert package data into text documents for chunking."""
    data = load_json("packages.json")
    documents = []

    for pkg in data["packages"]:
        text = f"""
SLT Package: {pkg['name']}
Type: {pkg['type']}
Speed: {pkg['speed_mbps']} Mbps
Data Limit: {pkg['data_limit_gb']} GB
Price: Rs. {pkg['price_lkr']}/month
Features: {', '.join(pkg['features'])}
Best For: {', '.join(pkg['best_for'])}
"""
        documents.append({
            "text": text.strip(),
            "metadata": {
                "source": "packages",
                "category": pkg["type"],
                "package_id": pkg["id"],
                "price": pkg["price_lkr"],
            }
        })

    for addon in data.get("add_ons", []):
        text = f"SLT Add-on: {addon['name']} - Price: Rs. {addon['price_lkr']}"
        documents.append({
            "text": text,
            "metadata": {"source": "packages", "category": "add_on", "package_id": addon["id"]}
        })

    return documents


def prepare_troubleshooting_documents() -> list[dict]:
    """Convert troubleshooting data into text documents."""
    data = load_json("troubleshooting.json")
    documents = []

    for issue in data["issues"]:
        steps_text = "\n".join(
            [f"Step {s['step']}: {s['action']} - {s['detail']}" for s in issue["steps"]]
        )
        text = f"""
Troubleshooting: {issue['title']}
Symptoms: {', '.join(issue['symptoms'])}
Steps to fix:
{steps_text}
If not resolved: {issue['escalation']}
"""
        documents.append({
            "text": text.strip(),
            "metadata": {
                "source": "troubleshooting",
                "category": "internet_issues",
                "issue_id": issue["id"],
            }
        })

    # Add router LED guide
    led_guide = data.get("router_led_guide", {})
    for light, states in led_guide.items():
        text = f"Router {light.upper()} light guide: "
        text += ", ".join([f"{state} = {meaning}" for state, meaning in states.items()])
        documents.append({
            "text": text,
            "metadata": {"source": "troubleshooting", "category": "router_leds"}
        })

    return documents


def prepare_scam_documents() -> list[dict]:
    """Convert scam pattern data into text documents."""
    data = load_json("scam_patterns.json")
    documents = []

    for scam in data["scam_patterns"]:
        text = f"""
Scam Type: {scam['type']}
Severity: {scam['severity']}
Common Patterns: {', '.join(scam['patterns'])}
Warning Indicators: {', '.join(scam['indicators'])}
Example: {scam['example']}
How to identify: {scam['explanation']}
"""
        documents.append({
            "text": text.strip(),
            "metadata": {
                "source": "scam_patterns",
                "category": scam["type"],
                "severity": scam["severity"],
            }
        })

    # Add safe contacts
    safe = data.get("safe_slt_contacts", {})
    text = f"""
Official SLT Contact Information:
Phone: {', '.join(safe.get('official_numbers', []))}
Websites: {', '.join(safe.get('official_websites', []))}
Apps: {', '.join(safe.get('official_apps', []))}
"""
    documents.append({
        "text": text.strip(),
        "metadata": {"source": "scam_patterns", "category": "safe_contacts"}
    })

    # Add scam check rules
    rules = data.get("scam_check_rules", [])
    text = "How to check if a message is a scam:\n" + "\n".join([f"- {r}" for r in rules])
    documents.append({
        "text": text,
        "metadata": {"source": "scam_patterns", "category": "scam_rules"}
    })

    return documents


def prepare_faq_documents() -> list[dict]:
    """Convert FAQ data into text documents."""
    data = load_json("faq.json")
    documents = []

    for faq in data["faqs"]:
        text = f"Question: {faq['question']}\nAnswer: {faq['answer']}"
        documents.append({
            "text": text,
            "metadata": {
                "source": "faq",
                "category": faq["category"],
                "faq_id": faq["id"],
            }
        })

    return documents


def prepare_usage_documents() -> list[dict]:
    """Convert usage profile data into text documents."""
    data = load_json("usage_profiles.json")
    documents = []

    for profile in data["usage_profiles"]:
        breakdown_text = ", ".join([f"{k}: {v}%" for k, v in profile["breakdown"].items()])
        tips_text = "\n".join([f"- {t}" for t in profile["tips"]])
        text = f"""
Usage Profile: {profile['label']}
Data Usage Breakdown: {breakdown_text}
Monthly Data Usage: {profile['monthly_data_gb']} GB
Recommendation: {profile['recommendation']}
Tips:
{tips_text}
"""
        documents.append({
            "text": text.strip(),
            "metadata": {
                "source": "usage_profiles",
                "category": profile["profile"],
            }
        })

    return documents


def chunk_documents(documents: list[dict], chunk_size: int = 500, chunk_overlap: int = 50) -> tuple:
    """Split documents into chunks for embedding."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        separators=["\n\n", "\n", ". ", " "]
    )

    all_texts = []
    all_metadatas = []
    all_ids = []

    for i, doc in enumerate(documents):
        chunks = splitter.split_text(doc["text"])
        for j, chunk in enumerate(chunks):
            all_texts.append(chunk)
            all_metadatas.append(doc["metadata"])
            all_ids.append(f"doc_{i}_chunk_{j}")

    return all_texts, all_metadatas, all_ids


def ingest_to_chromadb(texts: list, metadatas: list, ids: list):
    """Store embedded documents in ChromaDB."""
    print(f"📦 Initializing ChromaDB at: {CHROMA_DB_PATH}")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

    # Delete existing collection if exists
    try:
        client.delete_collection("slt_knowledge")
        print("🗑️  Deleted existing collection")
    except Exception:
        pass

    collection = client.get_or_create_collection(
        name="slt_knowledge",
        metadata={"hnsw:space": "cosine"}
    )

    print(f"🧠 Loading embedding model...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    print(f"📊 Generating embeddings for {len(texts)} chunks...")
    embedded_texts = embeddings.embed_documents(texts)

    # Add in batches
    batch_size = 50
    for i in range(0, len(texts), batch_size):
        end = min(i + batch_size, len(texts))
        collection.add(
            documents=texts[i:end],
            embeddings=embedded_texts[i:end],
            metadatas=metadatas[i:end],
            ids=ids[i:end],
        )
        print(f"  ✅ Added batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

    print(f"\n🎉 Successfully ingested {collection.count()} documents into ChromaDB!")
    return collection


def run_ingestion():
    """Main ingestion pipeline."""
    print("=" * 60)
    print("🚀 SLT Smart Assistant - Data Ingestion Pipeline")
    print("=" * 60)

    # Prepare all documents
    print("\n📁 Loading datasets...")
    all_documents = []

    print("  📦 Loading packages...")
    all_documents.extend(prepare_package_documents())

    print("  🔧 Loading troubleshooting guides...")
    all_documents.extend(prepare_troubleshooting_documents())

    print("  🛡️  Loading scam patterns...")
    all_documents.extend(prepare_scam_documents())

    print("  ❓ Loading FAQs...")
    all_documents.extend(prepare_faq_documents())

    print("  📊 Loading usage profiles...")
    all_documents.extend(prepare_usage_documents())

    print(f"\n📄 Total documents: {len(all_documents)}")

    # Chunk documents
    print("\n✂️  Chunking documents...")
    texts, metadatas, ids = chunk_documents(all_documents)
    print(f"📊 Total chunks: {len(texts)}")

    # Ingest into ChromaDB
    print("\n💾 Ingesting into ChromaDB...")
    collection = ingest_to_chromadb(texts, metadatas, ids)

    # Test query
    print("\n🔍 Testing retrieval...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    test_query = "best package for gaming"
    query_embedding = embeddings.embed_query(test_query)
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=3,
    )
    print(f"  Query: '{test_query}'")
    for i, doc in enumerate(results["documents"][0]):
        print(f"  Result {i+1}: {doc[:100]}...")

    print("\n✅ Ingestion complete! Ready for AI Agent.")


if __name__ == "__main__":
    run_ingestion()
