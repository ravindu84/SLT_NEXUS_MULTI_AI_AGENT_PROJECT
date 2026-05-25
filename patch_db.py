import sqlite3
import os
from datetime import datetime

DB_PATH = 'backend/slt_dummy.db'
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute('DROP TABLE IF EXISTS fiber_dp')
c.execute('DROP TABLE IF EXISTS fiber_dp_loops')

c.execute('''
    CREATE TABLE fiber_dp (
        dp_id TEXT PRIMARY KEY,
        location_lat REAL,
        location_lon REAL,
        status TEXT,
        total_capacity INTEGER,
        available_capacity INTEGER,
        created_at TEXT
    )
''')

c.execute('''
    CREATE TABLE fiber_dp_loops (
        loop_id TEXT PRIMARY KEY,
        dp_id TEXT,
        port_number INTEGER,
        status TEXT,
        allocated_to TEXT,
        allocated_at TEXT,
        signal_strength TEXT
    )
''')

c.execute("INSERT INTO fiber_dp VALUES ('DP-001', 6.8412, 80.0034, 'Active', 8, 2, '2026-05-01 10:00:00')")
c.execute("INSERT INTO fiber_dp_loops VALUES ('L-001-1', 'DP-001', 1, 'Allocated', '0112895900', '2026-05-10 10:00:00', '-19.5')")

# The admin endpoints also query 'technicians' and 'ledger' tables. Do they exist? Let's create empty ones if they don't to avoid 500s.
c.execute('''
    CREATE TABLE IF NOT EXISTS technicians (
        id INTEGER PRIMARY KEY,
        name TEXT,
        active_tickets INTEGER,
        status TEXT,
        location TEXT
    )
''')
c.execute('''
    CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY,
        transaction_id TEXT,
        amount REAL,
        type TEXT,
        status TEXT,
        created_at TEXT
    )
''')
# Wait! customer table is missing `user_id` according to `get_admin_customer`
# cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone,)) -> "user_id": customer['user_id']
# Let's add user_id column to customers if missing.
try:
    c.execute("ALTER TABLE customers ADD COLUMN user_id TEXT")
    c.execute("UPDATE customers SET user_id = phone_number")
except Exception as e:
    pass

conn.commit()
conn.close()
print("Database patched correctly")
