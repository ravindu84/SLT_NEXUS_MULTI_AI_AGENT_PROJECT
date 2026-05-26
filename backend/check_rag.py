import chromadb
try:
    client = chromadb.PersistentClient(path='./chroma_db')
    collection = client.get_collection('slt_knowledge')
    results = collection.get()
    
    docs = results['documents']
    metadatas = results['metadatas']
    
    print(f"Total Docs: {len(docs)}")
    sources = set()
    categories = set()
    for m in metadatas:
        if m:
            if 'source' in m: sources.add(m['source'])
            if 'category' in m: categories.add(m['category'])
            
    print(f"Sources: {sources}")
    print(f"Categories: {categories}")
    
    # Print a few snippets from different sources
    for src in sources:
        print(f"\n--- Snippet for {src} ---")
        for i, m in enumerate(metadatas):
            if m and m.get('source') == src:
                print(docs[i][:300] + "...")
                break
                
except Exception as e:
    print(f"Error: {e}")
