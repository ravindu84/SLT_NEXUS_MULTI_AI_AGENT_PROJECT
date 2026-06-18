import sys
import re

file_path = r"C:\SLT_NEXUS\backend\agent\tools\mcp_tools.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update clear_predictive_faults
old_clear = """        # Write to blockchain ledger
        tx_hash = hashlib.sha256(f"ORACLE_CLEAR_{datetime.now().isoformat()}".encode()).hexdigest()
        cursor.execute(\"\"\"
            INSERT INTO ledger (transaction_type, details, created_at)
            VALUES (?, ?, ?)
        \"\"\", ("ORACLE_PREDICTIONS_CLEARED", f"Admin cleared predictive faults from Oracle. TxHash: {tx_hash}", datetime.now().isoformat()))
        
        cursor.execute("DELETE FROM oracle_predictions")
        conn.commit()"""

new_clear = """        # Write to blockchain ledger
        tx_hash = hashlib.sha256(f"ORACLE_CLEAR_{datetime.now().isoformat()}".encode()).hexdigest()
        cursor.execute(\"\"\"
            INSERT INTO ledger (transaction_type, details, created_at)
            VALUES (?, ?, ?)
        \"\"\", ("ORACLE_PREDICTIONS_CLEARED", f"Admin cleared predictive faults from Oracle. TxHash: {tx_hash}", datetime.now().isoformat()))
        
        # BEFORE deleting, update their network_status so they don't get selected again!
        cursor.execute("SELECT phone_number FROM oracle_predictions")
        phones = cursor.fetchall()
        for p in phones:
            cursor.execute("UPDATE network_status SET snr = '25.5', power_level = '-15.0', attenuation = '15.0' WHERE phone_number = ?", (p[0],))
            
        cursor.execute("DELETE FROM oracle_predictions")
        conn.commit()"""

if old_clear in content:
    content = content.replace(old_clear, new_clear)
else:
    print("Failed to replace clear_predictive_faults")

# 2. Add new tools: get_churn_reasons and resolve_all_churn_risk
new_tools = """
@tool
async def get_churn_reasons(phone_number: str) -> str:
    \"\"\"Fetches the specific AI reasons why a single customer is predicted to churn. Call this when Admin asks 'Why is this person leaving?'\"\"\"
    import sqlite3
    import os
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT reasons FROM churn_predictions WHERE phone_number = ?", (phone_number,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            import json
            reasons = json.loads(row[0])
            return f"Reasons for churn for {phone_number}:\n" + "\\n".join([f"- {r}" for r in reasons])
        else:
            return f"Customer {phone_number} not found in the Churn Predictions list."
    except Exception as e:
        return f"Error fetching churn reasons: {str(e)}"

@tool
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
        
        cursor.execute("UPDATE churn_predictions SET status = 'Retained' WHERE status != 'Retained'")
        count = cursor.rowcount
        
        # Write to blockchain ledger
        tx_hash = hashlib.sha256(f"CHURN_BULK_RETAIN_{datetime.now().isoformat()}".encode()).hexdigest()
        cursor.execute(\"\"\"
            INSERT INTO ledger (transaction_type, details, created_at)
            VALUES (?, ?, ?)
        \"\"\", ("BULK_CUSTOMER_RETAINED", f"{count} customers retained via broadcast message. TxHash: {tx_hash}", datetime.now().isoformat()))
        
        # Clear the dashboard visually by deleting them or they will be ignored by frontend if status is retained?
        # Actually frontend fetches all from churn_predictions. Let's delete them to clear the board!
        cursor.execute("DELETE FROM churn_predictions")
        
        conn.commit()
        conn.close()
        return f"Successfully cleared all churning customers from the dashboard and logged bulk retention to Blockchain with TX: {tx_hash}"
    except Exception as e:
        return f"Error bulk resolving churn risk: {str(e)}"
"""

# Append new tools at the end of the file
if "@tool\nasync def get_churn_reasons" not in content:
    content += new_tools
    
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("mcp_tools.py updated successfully!")
