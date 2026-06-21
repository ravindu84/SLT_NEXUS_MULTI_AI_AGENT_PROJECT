import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Create churn_predictions table if not exists
cursor.execute('''
CREATE TABLE IF NOT EXISTS churn_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT NOT NULL,
    registered_name TEXT NOT NULL,
    risk_score REAL NOT NULL,
    reasons TEXT NOT NULL,
    status TEXT DEFAULT 'At Risk',
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
''')

# Check oracle_predictions table schema
cursor.execute("PRAGMA table_info(oracle_predictions)")
oracle_schema = cursor.fetchall()
print("Oracle Predictions Schema:", oracle_schema)

conn.commit()
conn.close()
print("Database initialized successfully.")
