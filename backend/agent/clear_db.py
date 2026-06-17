import sqlite3

DB_PATH = 'C:/SLT_NEXUS/backend/slt_dummy.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Clear fault tickets
cursor.execute("DELETE FROM fault_tickets")

# Clear oracle predictions
cursor.execute("DELETE FROM oracle_predictions")

# Clear churn predictions
cursor.execute("DELETE FROM churn_predictions")

# Reset technicians
cursor.execute("UPDATE technicians SET active_tickets = 0, status = 'Available'")

conn.commit()
conn.close()

print("Database cleared successfully.")
