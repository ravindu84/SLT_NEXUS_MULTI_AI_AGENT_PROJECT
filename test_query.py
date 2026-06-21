import chromadb
import os

db_path = os.path.join("backend", "chroma_db")
if not os.path.exists(db_path):
    db_path = "chroma_db"

client = chromadb.PersistentClient(path=db_path)
try:
    collection = client.get_collection("slt_knowledgebase")
    
    # Query for Nebula
    res_nebula = collection.query(query_texts=["Nebula campus"], n_results=3)
    print("--- NEBULA QUERY ---")
    if res_nebula['documents'] and res_nebula['documents'][0]:
        for doc in res_nebula['documents'][0]:
            print(doc[:200])
    else:
        print("No Nebula results.")
        
    # Query for item prices
    res_prices = collection.query(query_texts=["item prices hardware"], n_results=3)
    print("\n--- PRICES QUERY ---")
    if res_prices['documents'] and res_prices['documents'][0]:
        for doc in res_prices['documents'][0]:
            print(doc[:200])
    else:
        print("No prices results.")
except Exception as e:
    print(e)
