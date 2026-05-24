import os
import glob
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

# Make sure PyPDF2 is installed: pip install PyPDF2
try:
    import PyPDF2
except ImportError:
    print("PyPDF2 not installed. Install it with: pip install PyPDF2")
    exit(1)

DATA_DIR = Path(__file__).parent.parent / "data" / "ont_router_manual_pdfs"
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", str(Path(__file__).parent.parent / "chroma_db"))

WEB_MD_FILES = [
    r"C:\Users\014539\.gemini\antigravity\brain\edac18c4-6dcd-4418-bbec-d9d111a290fb\.system_generated\steps\5346\content.md",
    r"C:\Users\014539\.gemini\antigravity\brain\edac18c4-6dcd-4418-bbec-d9d111a290fb\.system_generated\steps\5347\content.md"
]

def load_pdfs():
    documents = []
    pdf_files = glob.glob(str(DATA_DIR / "*.pdf"))
    print(f"INFO: Found {len(pdf_files)} PDF files in {DATA_DIR}")
    
    for pdf_path in pdf_files:
        print(f"  Reading PDF: {os.path.basename(pdf_path)}")
        text = ""
        try:
            with open(pdf_path, 'rb') as file:
                reader = PyPDF2.PdfReader(file)
                for i in range(len(reader.pages)):
                    page = reader.pages[i]
                    text += page.extract_text() + "\n\n"
            
            if text.strip():
                documents.append({
                    "text": text,
                    "metadata": {
                        "source": os.path.basename(pdf_path),
                        "category": "technical_support",
                        "agent": "neo"
                    }
                })
        except Exception as e:
            print(f"  ERROR reading {pdf_path}: {e}")
            
    return documents

def load_web_content():
    documents = []
    for md_file in WEB_MD_FILES:
        try:
            print(f"  Reading Web Content MD: {os.path.basename(md_file)}")
            with open(md_file, "r", encoding="utf-8") as f:
                text = f.read()
            if text.strip():
                documents.append({
                    "text": text,
                    "metadata": {
                        "source": "web_manual",
                        "category": "technical_support",
                        "agent": "neo"
                    }
                })
        except Exception as e:
            print(f"  ERROR reading web md: {e}")
            
    return documents

def chunk_documents(documents: list[dict], chunk_size: int = 1000, chunk_overlap: int = 200) -> tuple:
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
            all_ids.append(f"neo_tech_{i}_chunk_{j}")

    return all_texts, all_metadatas, all_ids

def ingest_to_chromadb(texts: list, metadatas: list, ids: list):
    print(f"INFO: Initializing ChromaDB at: {CHROMA_DB_PATH}")
    client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

    collection = client.get_or_create_collection(
        name="slt_knowledge",
        metadata={"hnsw:space": "cosine"}
    )

    print(f"INFO: Loading embedding model...")
    embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))

    print(f"INFO: Generating embeddings for {len(texts)} chunks...")
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
        print(f"  SUCCESS: Added batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

    print(f"\nSUCCESS: Successfully ingested {len(texts)} new chunks into ChromaDB slt_knowledge!")

def run_ingestion():
    print("=" * 60)
    print("START: SLT Smart Assistant - Neo Technical Manual Ingestion")
    print("=" * 60)

    all_documents = []
    all_documents.extend(load_pdfs())
    all_documents.extend(load_web_content())

    print(f"\nINFO: Total original documents loaded: {len(all_documents)}")
    if not all_documents:
        print("No documents found to process. Exiting.")
        return

    texts, metadatas, ids = chunk_documents(all_documents)
    print(f"INFO: Total chunks generated: {len(texts)}")

    ingest_to_chromadb(texts, metadatas, ids)

if __name__ == "__main__":
    run_ingestion()
