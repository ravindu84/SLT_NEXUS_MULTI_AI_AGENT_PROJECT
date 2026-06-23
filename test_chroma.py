import traceback
import chromadb

try:
    print("Testing chromadb PersistentClient...")
    chromadb.PersistentClient(path='./chroma_db')
    print("Success!")
except Exception as e:
    print(f"Exception Type: {type(e)}")
    print(f"Exception str: {str(e)}")
    traceback.print_exc()
