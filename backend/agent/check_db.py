import sqlite3
conn = sqlite3.connect('C:/SLT_NEXUS/backend/slt_dummy.db')
cursor = conn.cursor()
cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('fault_tickets', 'technicians', 'customers');")
for row in cursor.fetchall():
    print(row[0])
    print(row[1])
    print("-" * 40)
conn.close()
