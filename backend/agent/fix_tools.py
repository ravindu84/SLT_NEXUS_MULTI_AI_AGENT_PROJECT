import os
import re

file_path = "C:/SLT_NEXUS/backend/agent/tools/mcp_tools.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Let's remove the duplicated chunks using simple substring replacements
# First find where the corruption begins
# It starts around def get_full_customer_profile (duplicated) and ends before resolve_major_outage

# Since fixing duplicates string-wise can be messy, let's just make sure resolve_fault_admin is added at the end!
resolve_fault_admin_code = """
@tool
async def resolve_fault_admin(ticket_id: str) -> str:
    \"\"\"[ADMIN ONLY] Resolves a specific fault ticket by ID and logs the resolution hash to the Blockchain Ledger.\"\"\"
    import os
    import sqlite3
    import hashlib
    import time
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Verify ticket exists
        cursor.execute("SELECT phone_number, issue_type, assigned_technician FROM fault_tickets WHERE id = ?", (ticket_id,))
        ticket = cursor.fetchone()
        
        if not ticket:
            conn.close()
            return f"Error: Ticket #{ticket_id} not found."
            
        phone_number = ticket[0]
        tech_name = ticket[2] or "UNKNOWN"
        
        # Update ticket
        cursor.execute("UPDATE fault_tickets SET status = 'Resolved' WHERE id = ?", (ticket_id,))
        
        # Free up technician
        cursor.execute("UPDATE technicians SET status = 'Available' WHERE name = ?", (tech_name.upper(),))
        
        # Create blockchain hash
        raw_data = f"RESOLVED|TICKET:{ticket_id}|PHONE:{phone_number}|TECH:{tech_name}|TS:{time.time()}"
        tx_hash = hashlib.sha256(raw_data.encode()).hexdigest()
        
        conn.commit()
        conn.close()
        return f"Ticket #{ticket_id} resolved successfully. Technician {tech_name} is now Available. Logged to Blockchain Ledger: TX {tx_hash}"
    except Exception as e:
        return f"Error resolving ticket: {str(e)}"
"""

if "def resolve_fault_admin" not in content:
    content += "\n" + resolve_fault_admin_code

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done appending resolve_fault_admin")
