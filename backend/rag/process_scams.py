"""
SLT NEXUS - Scam & Cyber Security Multi-Modal RAG Pipeline
Processes scam warning screenshots using GPT-4o-mini Vision and government PDFs using pypdf.
Indexes everything into the unified slt_knowledge ChromaDB collection.
Rate-limit resilient with exponential backoff retries and optimized concurrent workers.
"""

import os
import json
import base64
import time
from pathlib import Path
from dotenv import load_dotenv
import chromadb
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from openai import OpenAI
from concurrent.futures import ThreadPoolExecutor
import threading

load_dotenv()

# Setup paths
DATA_DIR = Path(__file__).parent.parent / "data"
SCAM_IMAGES_DIR = DATA_DIR / "scam_images"
SCAM_PDFS_DIR = DATA_DIR / "scam_pdfs"
CACHE_FILE = DATA_DIR / "processed_scam_images.json"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")

# Initialize clients
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
collection = chroma_client.get_or_create_collection("slt_knowledge", metadata={"hnsw:space": "cosine"})
embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))

# Global states for threading
cache_lock = threading.Lock()
newly_processed = 0


def encode_image(image_path: Path) -> str:
    """Encode local image to base64 string."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")


def load_cache() -> dict:
    """Load previously processed images from cache."""
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_cache(cache: dict):
    """Save processed images to cache."""
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)


def process_image_with_vision(image_path: Path) -> dict:
    """Send image to GPT-4o-mini Vision with exponential backoff on rate limits."""
    max_retries = 5
    base_delay = 3
    
    for attempt in range(max_retries):
        try:
            base64_image = encode_image(image_path)
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": (
                                    "Analyze this Sri Lankan scam warning/announcement screenshot. Extract:\n"
                                    "1) A short descriptive title (e.g. 'Fake Central Bank Lottery SMS')\n"
                                    "2) Category / Scam Type (e.g. Pyramid Scheme, KYC Fraud, OTP Phishing, Lottery Fraud)\n"
                                    "3) Complete extracted text from the screenshot (exact OCR transcription)\n"
                                    "4) Key risk markers (suspicious indicators like fake phone numbers, non-official links, OTP request, etc.)\n"
                                    "5) Official recommendation / Remediation steps (how to avoid it and what SLT/CBSL says)\n\n"
                                    "Output ONLY a valid JSON object matching these exact keys:\n"
                                    "{\n"
                                    '  "scam_title": "...",\n'
                                    '  "scam_type": "...",\n'
                                    '  "extracted_text": "...",\n'
                                    '  "risk_markers": ["...", "..."],\n'
                                    '  "remediation": "..."\n'
                                    "}"
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                },
                            },
                        ],
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            result_str = response.choices[0].message.content
            return json.loads(result_str)
            
        except Exception as e:
            if "rate_limit" in str(e).lower() or "429" in str(e):
                delay = base_delay * (2 ** attempt)
                print(f"  [RATE-LIMIT] 429 on {image_path.name}. Retrying in {delay}s... (Attempt {attempt+1}/{max_retries})")
                time.sleep(delay)
            else:
                print(f"  [ERROR] Vision analysis failed for {image_path.name}: {e}")
                return None
                
    print(f"  [ERROR] Max retries reached for {image_path.name}.")
    return None


def process_single_image_worker(img_path: Path, idx: int, total: int, cache: dict, image_documents: list):
    global newly_processed
    filename = img_path.name
    
    with cache_lock:
        in_cache = filename in cache
        if in_cache:
            data = cache[filename]
            
    if in_cache:
        print(f"Progress: [{idx+1}/{total}] {filename} -> [CACHE] Loaded from cache.")
    else:
        print(f"Progress: [{idx+1}/{total}] {filename} -> [VISION] Sending to GPT-4o-mini Vision...")
        data = process_image_with_vision(img_path)
        if data:
            with cache_lock:
                cache[filename] = data
                save_cache(cache)
                newly_processed += 1
        else:
            return
            
    text = f"""
Scam Title: {data.get('scam_title', 'Unknown Scam')}
Scam Type: {data.get('scam_type', 'General Fraud')}
Source Screenshot: {filename}
Risk Markers: {', '.join(data.get('risk_markers', []))}
Extracted Warning Text:
{data.get('extracted_text', '')}

Official Remediation & Protection Steps:
{data.get('remediation', 'Report to CERT and official SLT channels immediately.')}
"""
    doc = {
        "text": text.strip(),
        "metadata": {
            "source": "scam_patterns",
            "category": data.get("scam_type", "scam_warning"),
            "filename": filename,
            "scam_title": data.get("scam_title", "Unknown"),
        }
    }
    with cache_lock:
        image_documents.append(doc)


def run_pipeline():
    print("=" * 60)
    print("START: SLT NEXUS - Scam & Policy Ingestion Pipeline")
    print("=" * 60)

    # 1. Process Scam Screenshots (Vision)
    print("\n[STEP 1] Processing Scam screenshots in parallel...")
    cache = load_cache()
    image_files = [
        f for f in SCAM_IMAGES_DIR.iterdir()
        if f.suffix.lower() in [".jpg", ".jpeg", ".png", ".webp"]
    ]
    print(f"INFO: Found {len(image_files)} images in directory.")

    image_documents = []
    
    # Run vision tasks concurrently with 2 threads to stay under TPM limits safely
    total_imgs = len(image_files)
    with ThreadPoolExecutor(max_workers=2) as executor:
        for idx, img_path in enumerate(image_files):
            executor.submit(process_single_image_worker, img_path, idx, total_imgs, cache, image_documents)

    print(f"SUCCESS: Processed {len(image_documents)} scam screenshots (New: {newly_processed}).")

    # 2. Process Government PDFs
    print("\n[STEP 2] Processing Government Cyber Policy PDFs...")
    pdf_files = [f for f in SCAM_PDFS_DIR.iterdir() if f.suffix.lower() == ".pdf"]
    print(f"INFO: Found {len(pdf_files)} PDF files.")

    pdf_documents = []
    for pdf_path in pdf_files:
        print(f"Reading PDF: {pdf_path.name}...")
        try:
            reader = PdfReader(pdf_path)
            total_pages = len(reader.pages)
            print(f"  Total pages: {total_pages}")
            
            # To keep database size fast and queryable, we extract and chunk page-by-page
            for page_num in range(total_pages):
                page_text = reader.pages[page_num].extract_text()
                if not page_text or len(page_text.strip()) < 50:
                    continue
                
                text = f"""
Document: {pdf_path.name}
Page Reference: Page {page_num + 1}
Content:
{page_text.strip()}
"""
                pdf_documents.append({
                    "text": text.strip(),
                    "metadata": {
                        "source": "cybersecurity_policies",
                        "category": "government_policy",
                        "filename": pdf_path.name,
                        "page": str(page_num + 1),
                    }
                })
        except Exception as e:
            print(f"  [ERROR] Failed to read {pdf_path.name}: {e}")

    print(f"SUCCESS: Processed {len(pdf_documents)} PDF pages.")

    # Combine all documents
    all_docs = image_documents + pdf_documents
    if not all_docs:
        print("WARNING: No new documents to ingest. Exiting.")
        return

    # Chunking
    print("\n[STEP 3] Chunking documents into RAG vectors...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=600,
        chunk_overlap=60,
        separators=["\n\n", "\n", ". ", " "]
    )
    
    texts = []
    metadatas = []
    ids = []
    
    for i, doc in enumerate(all_docs):
        chunks = splitter.split_text(doc["text"])
        for j, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append(doc["metadata"])
            ids.append(f"scam_doc_{i}_chunk_{j}")

    print(f"INFO: Generated {len(texts)} chunks from new documents.")

    # Vectorizing and adding to ChromaDB
    print("\n[STEP 4] Generating OpenAI embeddings and inserting into ChromaDB...")
    embedded_texts = embeddings.embed_documents(texts)
    
    batch_size = 50
    for i in range(0, len(texts), batch_size):
        end = min(i + batch_size, len(texts))
        collection.add(
            documents=texts[i:end],
            embeddings=embedded_texts[i:end],
            metadatas=metadatas[i:end],
            ids=ids[i:end],
        )
        print(f"  SUCCESS: Added batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

    print(f"\nSUCCESS: Completed indexing! ChromaDB now contains {collection.count()} total chunks.")
    print("READY for Guardian Agent RAG queries!")


if __name__ == "__main__":
    run_pipeline()
