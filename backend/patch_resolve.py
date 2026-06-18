import re

file_path = r"C:\SLT_NEXUS\backend\agent\tools\mcp_tools.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace resolve_fault_admin function completely
old_resolve = """@tool
async def resolve_fault_admin(ticket_id: str) -> str:
    \"\"\"[ADMIN ONLY] Resolves a specific fault ticket by ID and logs the resolution hash to the Blockchain Ledger.\"\"\"
    import os
    import sqlite3
    import hashlib
    import time
    from datetime import datetime
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
        
        # Insert into ledger
        cursor.execute(
            "INSERT INTO ledger (transaction_type, details, created_at) VALUES (?, ?, ?)",
            ("FAULT_RESOLUTION_RECEIPT", f"Ticket {ticket_id} resolved by {tech_name}. TxHash: {tx_hash}", datetime.now().isoformat())
        )
        
        conn.commit()
        conn.close()
        return f"Successfully resolved ticket {ticket_id}. Logged to Blockchain Ledger with TX: {tx_hash}"
    except Exception as e:
        return f"Error resolving fault ticket: {str(e)}\""""

# Sometimes there's a comment `        # Insert into blockchain ledger` instead of `        # Insert into ledger`
# We'll just replace everything between `@tool\nasync def resolve_fault_admin` and `return f"Error resolving fault ticket: {str(e)}"` using regex.

new_resolve = """@tool
async def resolve_fault_admin(ticket_id_or_phone: str) -> str:
    \"\"\"[ADMIN ONLY] Resolves a fault ticket by either ticket ID or phone number. Clears it from Matrix and logs to Blockchain Ledger.\"\"\"
    import os
    import sqlite3
    import hashlib
    import time
    from datetime import datetime
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if input is a ticket ID or a phone number
        is_ticket_id = ticket_id_or_phone.startswith("SYS-") or ticket_id_or_phone.startswith("CUS-")
        
        if is_ticket_id:
            cursor.execute("SELECT ticket_id, phone_number, description, technician FROM fault_tickets WHERE ticket_id = ? AND status != 'Resolved'", (ticket_id_or_phone,))
        else:
            cursor.execute("SELECT ticket_id, phone_number, description, technician FROM fault_tickets WHERE phone_number = ? AND status != 'Resolved'", (ticket_id_or_phone,))
            
        ticket = cursor.fetchone()
        
        if not ticket:
            conn.close()
            return f"Error: Active ticket for '{ticket_id_or_phone}' not found."
            
        real_ticket_id = ticket[0]
        phone_number = ticket[1]
        tech_name = ticket[3] or "UNKNOWN"
        
        # Update ticket to resolved
        cursor.execute("UPDATE fault_tickets SET status = 'Resolved' WHERE ticket_id = ?", (real_ticket_id,))
        
        # Free up technician
        cursor.execute("UPDATE technicians SET status = 'Available' WHERE name = ?", (tech_name.upper(),))
        
        # Create blockchain hash
        raw_data = f"RESOLVED|TICKET:{real_ticket_id}|PHONE:{phone_number}|TECH:{tech_name}|TS:{time.time()}"
        tx_hash = hashlib.sha256(raw_data.encode()).hexdigest()
        
        # Insert into ledger
        cursor.execute(
            "INSERT INTO ledger (transaction_type, details, created_at) VALUES (?, ?, ?)",
            ("FAULT_RESOLUTION_RECEIPT", f"Ticket {real_ticket_id} resolved by {tech_name}. TxHash: {tx_hash}", datetime.now().isoformat())
        )
        
        conn.commit()
        conn.close()
        return f"Successfully resolved ticket {real_ticket_id} for phone {phone_number}. Logged to Blockchain Ledger with TX: {tx_hash}"
    except Exception as e:
        return f"Error resolving fault ticket: {str(e)}\""""

pattern = r"@tool\nasync def resolve_fault_admin\(ticket_id: str\) -> str:.*?return f\"Error resolving fault ticket: \{str\(e\)\}\""
content = re.sub(pattern, new_resolve, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("resolve_fault_admin patched successfully!")
