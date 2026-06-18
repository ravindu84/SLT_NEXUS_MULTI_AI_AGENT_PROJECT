import re

file_path = r"C:\SLT_NEXUS\backend\agent\tools\mcp_tools.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_churn = """@tool
async def resolve_all_churn_risk() -> str:
    \"\"\"[ADMIN ONLY] Call this when the Admin says they sent a message to EVERYONE on the churn list, or handled all of them. This bulk clears the Churn page.\"\"\"
    import sqlite3
    import os
    import hashlib
    from datetime import datetime
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Count before clearing
        cursor.execute("SELECT COUNT(*) FROM churn_predictions")
        count = cursor.fetchone()[0]
        
        # Step 1 & 2: Clear Dashboard
        cursor.execute("DELETE FROM churn_predictions")
        
        # Step 3: INFINITE PROTOTYPE REPLENISHMENT LOOP
        # Pick 5 fresh users who have paid their bills and "break" their billing history
        cursor.execute(\"\"\"
            SELECT c.phone_number FROM customers c
            JOIN billing_history bh ON c.phone_number = bh.phone_number
            WHERE bh.amount_paid > 0
            ORDER BY RANDOM() LIMIT 5
        \"\"\")
        new_churners = cursor.fetchall()
        for p in new_churners:
            cursor.execute("UPDATE billing_history SET amount_paid = 0.0, month = 'March', arrears = 4500.0 WHERE phone_number = ?", (p[0],))
        
        # Step 4: Write to blockchain ledger
        tx_hash = hashlib.sha256(f"CHURN_BULK_RETAIN_{datetime.now().isoformat()}".encode()).hexdigest()
        cursor.execute(\"\"\"
            INSERT INTO ledger (transaction_type, details, created_at)
            VALUES (?, ?, ?)
        \"\"\", ("BULK_CUSTOMER_RETAINED", f"{count} customers retained via broadcast message. Re-seeded next batch. TxHash: {tx_hash}", datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        return f"Successfully cleared all churning customers from the dashboard and re-seeded the ML algorithm. Logged bulk retention to Blockchain with TX: {tx_hash}"
    except Exception as e:
        return f"Error bulk resolving churn risk: {str(e)}\""""

pattern = r"@tool\nasync def resolve_all_churn_risk\(\) -> str:.*?return f\"Error bulk resolving churn risk: \{str\(e\)\}\""
content = re.sub(pattern, new_churn, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("resolve_all_churn_risk patched successfully!")
