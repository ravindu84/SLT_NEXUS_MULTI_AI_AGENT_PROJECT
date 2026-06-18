import re

file_path = r"C:\SLT_NEXUS\backend\agent\tools\mcp_tools.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_clear = """@tool
async def clear_predictive_faults() -> str:
    \"\"\"Clears the Oracle Predictor dashboard. Run this when Admin says the predicted faults have been fixed or handled.\"\"\"
    import os
    import sqlite3
    import hashlib
    from datetime import datetime
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Step 1: Fix the current predictions in network_status
        cursor.execute("SELECT phone_number FROM oracle_predictions")
        phones = cursor.fetchall()
        for p in phones:
            cursor.execute("UPDATE network_status SET snr = '25.5', power_level = '-15.0', attenuation = '15.0' WHERE phone_number = ?", (p[0],))
            
        # Step 2: Clear dashboard
        cursor.execute("DELETE FROM oracle_predictions")
        
        # Step 3: INFINITE PROTOTYPE REPLENISHMENT LOOP
        # Break 5 new Copper lines
        cursor.execute(\"\"\"
            SELECT c.phone_number FROM customers c 
            JOIN network_status n ON c.phone_number = n.phone_number 
            WHERE c.telephone_type = 'Copper' AND CAST(n.snr AS REAL) >= 20.0 
            ORDER BY RANDOM() LIMIT 5
        \"\"\")
        new_copper = cursor.fetchall()
        for p in new_copper:
            cursor.execute("UPDATE network_status SET snr = '12.4', attenuation = '28.5' WHERE phone_number = ?", (p[0],))
            
        # Break 5 new Fiber lines
        cursor.execute(\"\"\"
            SELECT c.phone_number FROM customers c 
            JOIN network_status n ON c.phone_number = n.phone_number 
            WHERE c.telephone_type = 'Fiber' AND CAST(n.power_level AS REAL) >= -25.0 
            ORDER BY RANDOM() LIMIT 5
        \"\"\")
        new_fiber = cursor.fetchall()
        for p in new_fiber:
            cursor.execute("UPDATE network_status SET power_level = '-29.8', attenuation = '26.4' WHERE phone_number = ?", (p[0],))
        
        # Step 4: Write to blockchain ledger
        tx_hash = hashlib.sha256(f"ORACLE_CLEAR_{datetime.now().isoformat()}".encode()).hexdigest()
        cursor.execute(\"\"\"
            INSERT INTO ledger (transaction_type, details, created_at)
            VALUES (?, ?, ?)
        \"\"\", ("ORACLE_PREDICTIONS_CLEARED", f"Admin cleared predictive faults. Re-seeded next batch. TxHash: {tx_hash}", datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        return f"Oracle Predictor dashboard cleared and system refreshed successfully! Logged to Blockchain with TX: {tx_hash}"
    except Exception as e:
        return f"Error clearing predictive faults: {str(e)}\""""

pattern = r"@tool\nasync def clear_predictive_faults\(\) -> str:.*?return f\"Error clearing predictive faults: \{str\(e\)\}\""
content = re.sub(pattern, new_clear, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("clear_predictive_faults patched successfully!")
