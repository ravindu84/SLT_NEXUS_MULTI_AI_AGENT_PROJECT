"""
SLT NEXUS - Master Web Crawler & Ingestion Pipeline
Crawls slt.lk/home and eteleshop.slt.lk for fixed-line broadband, PEO TV, devices, and routers.
Cleans web pages, chunks text, embeds them, and inserts them into ChromaDB.
"""

import os
import re
import urllib.parse
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings

load_dotenv()

# Setup paths & configurations
CHROMA_DB_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
MAX_PAGES_TO_CRAWL = 35  # Consolidate target to 35 high-value resource pages

# Pre-rendered seeds to ensure 100% extraction success
SEEDS = [
    "https://www.slt.lk/home",
    "https://www.slt.lk/en/broadband",
    "https://www.slt.lk/en/personal/telephone",
    "https://www.slt.lk/en/personal/peo-tv/peo-feature"
]

HIGH_VALUE_KEYWORDS = [
    "broadband", "fibre", "fiber", "peo-tv", "packages", "rates", 
    "charges", "telephone", "router", "product", "device", "e-teleshop", 
    "new-connection", "sme", "faq"
]

# Initialize DB & Embeddings
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
collection = chroma_client.get_or_create_collection("slt_knowledge", metadata={"hnsw:space": "cosine"})
embeddings = OpenAIEmbeddings(api_key=os.getenv("OPENAI_API_KEY"))

# Headers to avoid bot blocks
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}


def is_valid_slt_url(url: str) -> bool:
    """Check if the URL belongs to SLT domain and contains high-value contents."""
    parsed = urllib.parse.urlparse(url)
    domain = parsed.netloc.lower()
    
    # Allow slt.lk and subdomains like eteleshop.slt.lk
    if not any(d in domain for d in ["slt.lk", "sltmobitel.lk"]):
        return False
        
    path = parsed.path.lower()
    
    # Skip binary files
    if any(path.endswith(ext) for ext in [".pdf", ".png", ".jpg", ".jpeg", ".mp4", ".zip", ".css", ".js"]):
        return False
        
    # Allow roots and high-value keyword pages
    matches_keywords = any(kw in path for kw in HIGH_VALUE_KEYWORDS)
    is_root_or_home = path in ["", "/", "/home", "/en/broadband", "/en/personal/telephone"]
    
    return matches_keywords or is_root_or_home


def clean_html_and_extract_text(html_content: str) -> tuple:
    """Strip clutter HTML elements and retrieve pure content text blocks."""
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Strip script, style, and iframe tags
    for element in soup(["script", "style", "iframe", "noscript"]):
        element.decompose()
        
    title = soup.title.string.strip() if soup.title else "SLT-MOBITEL Services"
    
    text_blocks = []
    
    # Pull headers, paragraphs, list items, and key text blocks
    for tag in soup.find_all(["h1", "h2", "h3", "h4", "p", "li", "span", "td"]):
        text = tag.get_text().strip()
        # Skip utility texts or empty fragments
        if len(text) > 25 and not any(text.startswith(char) for char in ["{", "}", "[", "]", "var ", "function"]):
            text_blocks.append(text)
            
    cleaned_text = "\n".join(text_blocks)
    cleaned_text = re.sub(r'\n+', '\n', cleaned_text).strip()
    
    return title, cleaned_text


def crawl_slt_sites():
    print("=" * 60)
    print("START: SLT NEXUS - Master Web Crawler Ingestion Pipeline")
    print("=" * 60)
    
    visited = set()
    to_visit = list(SEEDS)
    crawled_count = 0
    
    all_pages_data = []

    while to_visit and crawled_count < MAX_PAGES_TO_CRAWL:
        current_url = to_visit.pop(0)
        
        if current_url in visited:
            continue
            
        print(f"[{crawled_count + 1}/{MAX_PAGES_TO_CRAWL}] Crawling: {current_url}...")
        visited.add(current_url)
        
        try:
            response = requests.get(current_url, headers=HEADERS, timeout=8)
            if response.status_code != 200:
                print(f"  [SKIP] Status Code: {response.status_code}")
                continue
                
            title, text = clean_html_and_extract_text(response.text)
            
            if text and len(text) > 150:
                print(f"  [SUCCESS] Extracted '{title}' ({len(text)} characters)")
                all_pages_data.append({
                    "url": current_url,
                    "title": title,
                    "text": text
                })
                crawled_count += 1
            else:
                print("  [SKIP] Page does not contain enough clean text.")
                
            # Parse links to expand crawls
            soup = BeautifulSoup(response.text, "html.parser")
            for link in soup.find_all("a", href=True):
                href = link["href"]
                # Resolve relative URL paths
                absolute_url = urllib.parse.urljoin(current_url, href)
                # Keep URL canonical
                parsed_absolute = urllib.parse.urlparse(absolute_url)
                clean_url = f"{parsed_absolute.scheme}://{parsed_absolute.netloc}{parsed_absolute.path}"
                
                if is_valid_slt_url(clean_url) and clean_url not in visited and clean_url not in to_visit:
                    to_visit.append(clean_url)
                    
        except Exception as e:
            print(f"  [ERROR] Failed fetching {current_url}: {e}")

    if not all_pages_data:
        print("\nWARNING: No high-value pages were crawled. Ingestion aborted.")
        return

    # Ingestion into ChromaDB
    print("\n[STEP 2] Chunking crawled pages...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=650,
        chunk_overlap=70,
        separators=["\n\n", "\n", ". ", " "]
    )
    
    texts = []
    metadatas = []
    ids = []
    
    for i, page in enumerate(all_pages_data):
        doc_text = f"""
Source Webpage: {page['title']}
URL Link: {page['url']}
Content Details:
{page['text']}
"""
        chunks = splitter.split_text(doc_text.strip())
        for j, chunk in enumerate(chunks):
            texts.append(chunk)
            metadatas.append({
                "source": "slt_website",
                "url": page["url"],
                "title": page["title"],
                "category": "web_information"
            })
            ids.append(f"web_doc_{i}_chunk_{j}")

    print(f"INFO: Generated {len(texts)} chunks from {len(all_pages_data)} pages.")

    print("\n[STEP 3] Generating embeddings and inserting into ChromaDB...")
    embedded_texts = embeddings.embed_documents(texts)
    
    batch_size = 50
    for i in range(0, len(texts), batch_size):
        end = min(i + batch_size, len(texts))
        collection.add(
            documents=texts[i:end],
            embeddings=embedded_texts[i:end],
            metadatas=metadatas[i:end],
            ids=ids[i:end]
        )
        print(f"  SUCCESS: Added batch {i//batch_size + 1}/{(len(texts)-1)//batch_size + 1}")

    print(f"\nSUCCESS: Completed crawling & indexing! ChromaDB now contains {collection.count()} total chunks.")
    print("READY for dynamic Web RAG searches!")


if __name__ == "__main__":
    crawl_slt_sites()
