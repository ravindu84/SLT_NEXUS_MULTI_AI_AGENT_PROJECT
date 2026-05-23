import sqlite3

DB_PATH = "c:/SLT_NEXUS/backend/slt_dummy.db"

def inspect_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("Tables:", cursor.fetchall())
    
    # Check if fiber_dps table exists, if not create it
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS fiber_dps (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            dp_name TEXT NOT NULL UNIQUE,
            loops_used INTEGER DEFAULT 0,
            max_loops INTEGER DEFAULT 8
        )
    ''')
    
    # Initialize the first DP if table is empty
    cursor.execute("SELECT COUNT(*) FROM fiber_dps")
    if cursor.fetchone()[0] == 0:
        cursor.execute("INSERT INTO fiber_dps (dp_name, loops_used, max_loops) VALUES ('HO-DGK-0520-001', 0, 8)")
        
    conn.commit()
    conn.close()
    print("DB initialized for provisioning.")

if __name__ == "__main__":
    inspect_db()
