import sqlite3
import os

DB_PATH = r"C:\SLT_NEXUS\backend\slt_dummy.db"

def check_billing():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT total_due, nxc_balance FROM billing WHERE phone_number = '0112895800'")
    row = cursor.fetchone()
    conn.close()
    return row

# 1. Print initial balance
print("Initial Balance:", check_billing())

# 2. Simulate paying the bill
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE billing SET total_due = 0, nxc_balance = 0 WHERE phone_number = '0112895800'")
conn.commit()
conn.close()

# 3. Print final balance
print("After Payment:", check_billing())

# 4. Reset to original values for safety (Assuming 5400 due and 500 nxc based on create_dummy_db.py)
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute("UPDATE billing SET total_due = 5400, nxc_balance = 500 WHERE phone_number = '0112895800'")
conn.commit()
conn.close()

print("Restored Balance:", check_billing())
