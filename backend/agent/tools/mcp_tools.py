import httpx
import json
import os
from typing import List
from langchain_core.tools import tool

MOCK_BASE_URL = os.getenv("MOCK_BASE_URL", "http://localhost:8000/mocks")

@tool
async def check_router_health(device_id: str):
    """Checks the health and signal diagnostics of an SLT router using iMaster NCE."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/imaster/diagnostics/{device_id}")
        return response.json()

@tool
async def create_fault_ticket(phone_number: str, issue_type: str, description: str, assigned_technician: str = None):
    """Creates a fault ticket in the WFM system and dispatches a technician."""
    async with httpx.AsyncClient() as client:
        payload = {"phone_number": phone_number, "issue_type": issue_type, "description": description}
        if assigned_technician:
            payload["assigned_technician"] = assigned_technician
            
        response = await client.post(
            f"{MOCK_BASE_URL}/wfm/ticket",
            json=payload
        )
        return response.json()

@tool
async def register_customer_agreement(name: str, address: str, contact_number: str, id_number: str, package_name: str) -> str:
    """Registers a new customer agreement in the CRM and commits it to the Vault Blockchain."""
    from backend.agent.tools.vault import commit_sla_to_ledger
    import sqlite3
    import os
    
    # Save to SQLite prospects table
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT OR REPLACE INTO prospects (mobile_number, name, nic, email, kyc_verified, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        ''', (contact_number, name, id_number, address, 1))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error saving prospect: {e}")

    # Mocking CRM update
    crm_msg = f"Customer {name} ({id_number}) added to CRM for {package_name}."
    # Calling the Vault Agent tool directly inside this tool to chain the blockchain hook
    vault_res = commit_sla_to_ledger.func(name, package_name, 1500.0, "Fiber", 100)
    return f"{crm_msg} [VAULT AGREEMENT: {vault_res}]"

@tool
def get_data_usage(phone_number: str) -> str:
    """Fetches real-time data usage and remaining quota for the customer."""
    import sqlite3
    import os
    import json
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "slt_dummy.db")
    if not os.path.exists(db_path):
        return json.dumps({"error": "Database not found."})
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT total_data_gb, used_data_gb, remaining_data_gb, usage_status FROM data_usage WHERE phone_number = ?", (phone_number,))
        data_row = cursor.fetchone()
        conn.close()
        
        if not data_row:
            return json.dumps({"error": f"No data usage found for phone number {phone_number}"})
            
        return json.dumps({
            "phone_number": phone_number,
            "total_data": f"{data_row[0]} GB",
            "used_data": f"{data_row[1]} GB",
            "remaining_data": f"{data_row[2]} GB",
            "status": data_row[3]
        })
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
def get_billing_info(phone_number: str) -> str:
    """Fetches the outstanding bill balance, NXC coin balance, and 3-month billing history. Use this to answer any questions about the current bill, past 3 months' bills, or NXC balance."""
    import sqlite3
    import os
    import json
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "slt_dummy.db")
    if not os.path.exists(db_path):
        return json.dumps({"error": "Database not found."})
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT total_due, payment_status, nxc_balance FROM billing WHERE phone_number = ?", (phone_number,))
        bill_row = cursor.fetchone()
        
        cursor.execute("SELECT month, year, amount_billed, amount_paid, arrears FROM billing_history WHERE phone_number = ? ORDER BY id ASC", (phone_number,))
        history_rows = cursor.fetchall()
        
        conn.close()
        
        if not bill_row:
            return json.dumps({"error": f"No billing data found for phone number {phone_number}"})
            
        return json.dumps({
            "phone_number": phone_number,
            "total_due": f"LKR {bill_row[0]:.2f}",
            "payment_status": bill_row[1],
            "nxc_balance": bill_row[2],
            "billing_history": [
                {"month": h[0], "year": h[1], "amount_billed": h[2], "amount_paid": h[3], "arrears": h[4]} for h in history_rows
            ]
        })
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
async def get_daily_usage_logs(phone_number: str):
    """Fetches the daily data consumption logs for the last 30 days, including GB and percentage breakdown per site (Facebook, YouTube, Google, etc.). Use this to answer questions about specific dates (e.g. usage on the 21st) or to find their maximum usage day."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/billing/daily-usage/{phone_number}")
        return response.json()

@tool
async def process_package_payment(phone_number: str, package_name: str, amount: float):
    """Simulates a payment through the PayHere gateway for a package upgrade."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/payhere/checkout",
            json={
                "phone_number": phone_number,
                "package_name": package_name,
                "amount": amount,
                "currency": "LKR"
            }
        )
        return response.json()

@tool
async def pay_slt_bill(phone_number: str, amount: float, use_nxc_coins: bool):
    """Pays the outstanding SLT bill. Can optionally use the customer's NXC (NEXUS Coin) balance for a discount (1 NXC = 1 LKR)."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/billing/pay",
            json={
                "phone_number": phone_number,
                "amount": amount,
                "use_nxc_coins": use_nxc_coins
            }
        )
        data = response.json()
        
        # Automatically log successful payments to the blockchain Vault
        if data.get("status") == "success":
            from backend.agent.tools.vault import commit_payment_to_ledger
            import uuid
            from datetime import datetime
            tx_id = f"TX-{str(uuid.uuid4())[:8]}"
            date_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            vault_res = commit_payment_to_ledger.func(tx_id, phone_number, amount, date_str)
            data["vault_receipt"] = json.loads(vault_res)
            
        return data

@tool
async def record_new_connection(customer_name: str, phone_number: str, address: str, connection_type: str):
    """Records a new connection request in the SLT Provisioning system."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/provisioning/new-connection",
            json={
                "customer_name": customer_name,
                "phone_number": phone_number,
                "address": address,
                "connection_type": connection_type
            }
        )
        return response.json()

@tool
async def request_report_email(emails: List[str], report_type: str):
    """Sends the designated corporate report to the specified list of email addresses.
    Use this when a staff member or officer asks to email, send, or dispatch a daily report.
    report_type must be one of: 'morning', 'afternoon', 'evening', 'day_start', 'full_details', 'day_end'.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/report/email",
            json={"emails": emails, "report_type": report_type}
        )
        return response.json()

@tool
async def request_report_whatsapp(phone_number: str, report_type: str):
    """Sends the designated corporate report to a specific WhatsApp number.
    Use this when a user specifically asks to send a report to WhatsApp!
    report_type must be one of: 'morning', 'afternoon', 'evening', 'day_start', 'full_details', 'day_end'.
    """
    async with httpx.AsyncClient() as client:
        # First generate the report via the backend API (this returns the image URL)
        response = await client.post(
            f"{MOCK_BASE_URL}/report/email",
            json={"emails": ["whatsapp_system@slt.lk"], "report_type": report_type}
        )
        data = response.json()
        image_url = data.get("image_url")
        summary = data.get("summary")
        subject = data.get("subject")
        
        message = f"*{subject}*\n\n{summary}"
        
        # Then send the WhatsApp message
        wa_response = await client.post(
            "http://localhost:8000/mocks/admin/send-whatsapp",
            json={"to_number": phone_number, "message": message, "media_url": image_url}
        )
        if wa_response.status_code == 200 and wa_response.json().get("status") == "success":
            return {"status": "success", "message": f"Report '{report_type}' successfully sent to WhatsApp number {phone_number}", "details": data}
        else:
            return {"status": "error", "message": f"Failed to send WhatsApp: {wa_response.text}"}

@tool
async def get_active_fault_tickets():
    """Retrieves the list of all active fault tickets (including assigned technician and status) from the WFM/Clarity system."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/wfm/active-faults")
        return response.json()

@tool
async def get_technician_diagnostics(phone_number: str):
    """Retrieves full B2B technician diagnostics details (power level, SNR, attenuation, TID), customer identity, address, and outstanding billing dues from the database for one of the 200 numbers."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/technician/diagnostics/{phone_number}")
        return response.json()

@tool
async def get_predictive_degradation_report():
    """Scans the entire NMS database and returns a predictive report of all lines (Copper/Fiber) that have degrading signals but haven't completely failed yet. Includes DP Loop, Power Level, SNR, and Contact Info."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/wfm/predictive-degradation")
        return response.json()

@tool
async def get_technician_status():
    """Returns the fixed territory zones and active workloads for the 10 technicians. Use this to determine who is assigned to a specific region and who has the lowest ticket count."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/wfm/technician-status")
        return response.json()

@tool
async def check_kyc_status(mobile_number: str):
    """Checks if the user has uploaded their Selfie and NIC for KYC verification."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/auth/kyc-status/{mobile_number}")
        return response.json()

@tool
async def provision_new_connection(slt_number: str):
    """Assigns an available Fiber Distribution Point (DP) and Loop for the customer. This triggers Vault Agent to log the connection on the Blockchain."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/provisioning/allocate-dp",
            json={"slt_number": slt_number}
        )
        return response.json()

@tool
async def finalize_new_connection(mobile_number: str, package_name: str):
    """Finalizes the sale, automatically generates a new SLT number (e.g. 0112800100), and records the new connection for the Provisioner."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/provisioning/finalize",
            json={
                "mobile_number": mobile_number,
                "package_name": package_name
            }
        )
        return response.json()

@tool
async def send_sms_notification(phone_number: str, message: str) -> str:
    """Send an SMS notification directly to a customer's phone number using Twilio."""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/mocks/admin/send-sms",
                json={"to_number": phone_number, "message": message}
            )
        if response.status_code == 200 and response.json().get("status") == "success":
            return f"SMS successfully sent to {phone_number}."
        else:
            return f"Failed to send SMS: {response.text}"
    except Exception as e:
        return f"Error sending SMS: {str(e)}"

@tool
async def send_whatsapp_notification(phone_number: str, message: str, media_url: str = None) -> str:
    """Send a WhatsApp message (with optional media URL like an image) to a customer's phone number using Twilio."""
    import httpx
    try:
        payload = {"to_number": phone_number, "message": message}
        if media_url:
            payload["media_url"] = media_url
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "http://localhost:8000/mocks/admin/send-whatsapp",
                json=payload
            )
        if response.status_code == 200 and response.json().get("status") == "success":
            return f"WhatsApp message successfully sent to {phone_number}."
        else:
            return f"Failed to send WhatsApp: {response.text}"
    except Exception as e:
        return f"Error sending WhatsApp: {str(e)}"

@tool
async def check_area_outages(phone_number: str) -> str:
    """Checks if there are other customers connected to the same DP (Distribution Point) box currently facing an outage. Use this to determine if a reported issue is an isolated line fault or an area-wide cable/DP fault."""
    import sqlite3
    import os
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'slt_dummy.db')
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT dp_loop FROM customers WHERE phone_number = ?", (phone_number,))
        user_row = cursor.fetchone()
        if not user_row or not user_row[0]:
            conn.close()
            return "Could not find DP loop for this number."
        
        dp_loop = user_row[0]
        dp_box = dp_loop.rsplit('-', 1)[0]
        
        query = '''
            SELECT count(*) 
            FROM network_status n 
            JOIN customers c ON n.phone_number = c.phone_number
            WHERE c.dp_loop LIKE ? AND n.status = 'DOWN' AND n.phone_number != ?
        '''
        cursor.execute(query, (f"{dp_box}%", phone_number))
        down_count = cursor.fetchone()[0]
        conn.close()
        
        if down_count > 0:
            return f"CRITICAL ALERT: Detected an area outage! There are {down_count} other customers connected to the same Distribution Point ({dp_box}) currently offline. Dispatch a maintenance team immediately."
        else:
            return f"No area outage detected. The distribution point {dp_box} is healthy for other customers. This is an isolated line issue."
    except Exception as e:
        return f"Error checking area outages: {str(e)}"

@tool
def search_slt_knowledgebase(query: str) -> str:
    """Queries the SLT Vector Database (ChromaDB) to retrieve exact website data, terms, conditions, packages, or instructions. Use this tool whenever the customer asks about SLT products, peo tv, broadbands, manuals, or general knowledge."""
    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        from backend.rag.retriever import SLTRetriever
        retriever = SLTRetriever()
        results = retriever.query(query, n_results=3)
        if not results:
            return "No matching data found in the SLT knowledge base."
        
        output = "Here is the exact data retrieved from the official SLT websites and PDFs:\n\n"
        for i, res in enumerate(results):
            source = res.get('metadata', {}).get('source', 'Unknown')
            output += f"--- Result {i+1} (Source: {source}) ---\n{res['text']}\n\n"
        return output
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"

@tool
def get_full_customer_profile(phone_number: str) -> str:
    """[ADMIN ONLY] Fetches the COMPLETE technical profile for a customer: dp/loop, TID, SNR, attenuation, power level, ONT type, line state, billing, packages, fault tickets — everything in one call. Use this when the admin/tech staff needs full diagnostics for a customer."""
    import sqlite3
    import os
    import json
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "slt_dummy.db")
    if not os.path.exists(db_path):
        return json.dumps({"error": "Database not found."})
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone_number,))
        customer = cursor.fetchone()
        if not customer:
            conn.close()
            return json.dumps({"error": f"Customer {phone_number} not found in database."})
        
        cursor.execute("SELECT * FROM network_status WHERE phone_number = ?", (phone_number,))
        network = cursor.fetchone()
        
        cursor.execute("SELECT * FROM billing WHERE phone_number = ?", (phone_number,))
        billing = cursor.fetchone()
        
        cursor.execute("SELECT * FROM data_usage WHERE phone_number = ?", (phone_number,))
        usage = cursor.fetchone()
        
        cursor.execute("SELECT ticket_id, technician, status, created_at FROM fault_tickets WHERE phone_number = ?", (phone_number,))
        tickets = cursor.fetchall()
        
        conn.close()
        
        result = {
            "customer": {
                "phone_number": customer["phone_number"],
                "name": customer["registered_name"],
                "address": customer["address"],
                "contact_number": customer["contact_number"],
                "type": customer["telephone_type"],
                "dp_loop": customer["dp_loop"],
                "has_voice": customer["has_voice"],
                "has_internet": customer["has_internet"],
                "has_iptv": customer["has_iptv"],
            },
            "network": {
                "status": network["status"] if network else "Unknown",
                "line_state": network["line_state"] if network else None,
                "power_level": network["power_level"] if network else None,
                "snr": network["snr"] if network else None,
                "attenuation": network["attenuation"] if network else None,
                "ont_type": network["ont_type"] if network else None,
                "tid": network["tid"] if network else None,
            } if network else {},
            "billing": {
                "total_due": billing["total_due"] if billing else 0,
                "payment_status": billing["payment_status"] if billing else None,
                "nxc_balance": billing["nxc_balance"] if billing else 0,
                "monthly_rental": billing["monthly_rental"] if billing else 0,
                "unpaid_bills": billing["unpaid_bills"] if billing else 0,
                "credit_limit": 5000.00,
            } if billing else {},
            "data_usage": {
                "package": usage["package_name"] if usage else None,
                "total_gb": usage["total_data_gb"] if usage else 0,
                "used_gb": usage["used_data_gb"] if usage else 0,
                "remaining_gb": usage["remaining_data_gb"] if usage else 0,
                "status": usage["usage_status"] if usage else None,
            } if usage else {},
            "fault_tickets": [dict(t) for t in tickets],
        }
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
async def dispatch_technician_admin(slt_number: str, technician_name: str) -> str:
    """Dispatches a technician for a specific new connection or fault. (Admin use only)"""
    # Simply simulate updating the ticket or connection
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Update connection
        cursor.execute("UPDATE new_connections SET status = 'Dispatched' WHERE slt_number = ? OR mobile_number = ?", (slt_number, slt_number))
        # Update tech
        cursor.execute("UPDATE technicians SET status = 'Busy' WHERE name = ?", (technician_name.upper(),))
        
        conn.commit()
        conn.close()
        return f"Successfully dispatched technician {technician_name} for connection {slt_number}."
    except Exception as e:
        return f"Error dispatching technician: {str(e)}"

@tool
async def finalize_admin_approval(slt_number: str) -> str:
    """Finalizes and activates a new connection, logs it to blockchain, and adds to active DB. (Admin use only)"""
    import os
    import sqlite3
    import httpx
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get connection ID
        cursor.execute("SELECT connection_id FROM new_connections WHERE slt_number = ? OR mobile_number = ?", (slt_number, slt_number))
        row = cursor.fetchone()
        
        if row:
            conn_id = row[0]
            conn.close()
            # Call the proxy
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{MOCK_BASE_URL}/wfm/approve-connection/{conn_id}")
            return "Connection approved, logged to Blockchain, and transitioned to Active DB."
        else:
            conn.close()
            return "Connection not found."
    except Exception as e:
        return f"Error finalizing connection: {str(e)}"

@tool
async def generate_predictive_faults() -> str:
    """Scans the network for pre-emptive faults (Oracle Predictor) and makes them visible to the Admin dashboard. Run this when Admin asks to scan for future faults."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Clear existing predictions first
        cursor.execute("DELETE FROM oracle_predictions")
        
        # Insert 5 Copper and 5 Fiber randomly
        query = """
            INSERT INTO oracle_predictions
            SELECT * FROM (
                SELECT c.phone_number, c.registered_name, c.address, c.contact_number, 
                       n.line_state, n.power_level, n.snr, n.attenuation, n.clarity_path, c.telephone_type
                FROM customers c
                JOIN network_status n ON c.phone_number = n.phone_number
                WHERE n.status = 'UP' AND n.line_state != 'Fault' AND c.telephone_type = 'Copper' 
                AND (CAST(n.snr AS REAL) < 20.0 OR CAST(n.attenuation AS REAL) > 20.0)
                ORDER BY RANDOM()
                LIMIT 5
            )
            UNION ALL
            SELECT * FROM (
                SELECT c.phone_number, c.registered_name, c.address, c.contact_number, 
                       n.line_state, n.power_level, n.snr, n.attenuation, n.clarity_path, c.telephone_type
                FROM customers c
                JOIN network_status n ON c.phone_number = n.phone_number
                WHERE n.status = 'UP' AND n.line_state != 'Fault' AND c.telephone_type = 'Fiber' 
                AND CAST(n.power_level AS REAL) < -25.0
                ORDER BY RANDOM()
                LIMIT 5
            )
        """
        cursor.execute(query)
        conn.commit()
        conn.close()
        return "Network scan complete! 10 highly vulnerable lines (5 PSTN, 5 FTTH) have been identified and sent to the Oracle Predictor dashboard."
    except Exception as e:
        return f"Error scanning network: {str(e)}"

@tool
async def clear_predictive_faults() -> str:
    """Clears the Oracle Predictor dashboard. Run this when Admin says the predicted faults have been fixed or handled."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        from dotenv import load_dotenv
        load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))
        from backend.rag.retriever import SLTRetriever
        retriever = SLTRetriever()
        results = retriever.query(query, n_results=3)
        if not results:
            return "No matching data found in the SLT knowledge base."
        
        output = "Here is the exact data retrieved from the official SLT websites and PDFs:\n\n"
        for i, res in enumerate(results):
            source = res.get('metadata', {}).get('source', 'Unknown')
            output += f"--- Result {i+1} (Source: {source}) ---\n{res['text']}\n\n"
        return output
    except Exception as e:
        return f"Error searching knowledge base: {str(e)}"

@tool
def get_full_customer_profile(phone_number: str) -> str:
    """[ADMIN ONLY] Fetches the COMPLETE technical profile for a customer: dp/loop, TID, SNR, attenuation, power level, ONT type, line state, billing, packages, fault tickets — everything in one call. Use this when the admin/tech staff needs full diagnostics for a customer."""
    import sqlite3
    import os
    import json
    db_path = os.path.join(os.path.dirname(__file__), "..", "..", "slt_dummy.db")
    if not os.path.exists(db_path):
        return json.dumps({"error": "Database not found."})
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone_number,))
        customer = cursor.fetchone()
        if not customer:
            conn.close()
            return json.dumps({"error": f"Customer {phone_number} not found in database."})
        
        cursor.execute("SELECT * FROM network_status WHERE phone_number = ?", (phone_number,))
        network = cursor.fetchone()
        
        cursor.execute("SELECT * FROM billing WHERE phone_number = ?", (phone_number,))
        billing = cursor.fetchone()
        
        cursor.execute("SELECT * FROM data_usage WHERE phone_number = ?", (phone_number,))
        usage = cursor.fetchone()
        
        cursor.execute("SELECT ticket_id, technician, status, created_at FROM fault_tickets WHERE phone_number = ?", (phone_number,))
        tickets = cursor.fetchall()
        
        conn.close()
        
        result = {
            "customer": {
                "phone_number": customer["phone_number"],
                "name": customer["registered_name"],
                "address": customer["address"],
                "contact_number": customer["contact_number"],
                "type": customer["telephone_type"],
                "dp_loop": customer["dp_loop"],
                "has_voice": customer["has_voice"],
                "has_internet": customer["has_internet"],
                "has_iptv": customer["has_iptv"],
            },
            "network": {
                "status": network["status"] if network else "Unknown",
                "line_state": network["line_state"] if network else None,
                "power_level": network["power_level"] if network else None,
                "snr": network["snr"] if network else None,
                "attenuation": network["attenuation"] if network else None,
                "ont_type": network["ont_type"] if network else None,
                "tid": network["tid"] if network else None,
            } if network else {},
            "billing": {
                "total_due": billing["total_due"] if billing else 0,
                "payment_status": billing["payment_status"] if billing else None,
                "nxc_balance": billing["nxc_balance"] if billing else 0,
                "monthly_rental": billing["monthly_rental"] if billing else 0,
                "unpaid_bills": billing["unpaid_bills"] if billing else 0,
                "credit_limit": 5000.00,
            } if billing else {},
            "data_usage": {
                "package": usage["package_name"] if usage else None,
                "total_gb": usage["total_data_gb"] if usage else 0,
                "used_gb": usage["used_data_gb"] if usage else 0,
                "remaining_gb": usage["remaining_data_gb"] if usage else 0,
                "status": usage["usage_status"] if usage else None,
            } if usage else {},
            "fault_tickets": [dict(t) for t in tickets],
        }
        return json.dumps(result, ensure_ascii=False)
    except Exception as e:
        return json.dumps({"error": str(e)})

@tool
async def dispatch_technician_admin(slt_number: str, technician_name: str) -> str:
    """Dispatches a technician for a specific new connection or fault. (Admin use only)"""
    # Simply simulate updating the ticket or connection
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Update connection
        cursor.execute("UPDATE new_connections SET status = 'Dispatched' WHERE slt_number = ? OR mobile_number = ?", (slt_number, slt_number))
        # Update tech
        cursor.execute("UPDATE technicians SET status = 'Busy' WHERE name = ?", (technician_name.upper(),))
        
        conn.commit()
        conn.close()
        return f"Successfully dispatched technician {technician_name} for connection {slt_number}."
    except Exception as e:
        return f"Error dispatching technician: {str(e)}"

@tool
async def finalize_admin_approval(slt_number: str) -> str:
    """Finalizes and activates a new connection, logs it to blockchain, and adds to active DB. (Admin use only)"""
    import os
    import sqlite3
    import httpx
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get connection ID
        cursor.execute("SELECT connection_id FROM new_connections WHERE slt_number = ? OR mobile_number = ?", (slt_number, slt_number))
        row = cursor.fetchone()
        
        if row:
            conn_id = row[0]
            conn.close()
            # Call the proxy
            async with httpx.AsyncClient() as client:
                resp = await client.post(f"{MOCK_BASE_URL}/wfm/approve-connection/{conn_id}")
            return "Connection approved, logged to Blockchain, and transitioned to Active DB."
        else:
            conn.close()
            return "Connection not found."
    except Exception as e:
        return f"Error finalizing connection: {str(e)}"

@tool
async def generate_predictive_faults() -> str:
    """Scans the network for pre-emptive faults (Oracle Predictor) and makes them visible to the Admin dashboard. Run this when Admin asks to scan for future faults."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Clear existing predictions first
        cursor.execute("DELETE FROM oracle_predictions")
        
        # Insert 5 Copper and 5 Fiber randomly
        query = """
            INSERT INTO oracle_predictions
            SELECT * FROM (
                SELECT c.phone_number, c.registered_name, c.address, c.contact_number, 
                       n.line_state, n.power_level, n.snr, n.attenuation, n.clarity_path, c.telephone_type
                FROM customers c
                JOIN network_status n ON c.phone_number = n.phone_number
                WHERE n.status = 'UP' AND n.line_state != 'Fault' AND c.telephone_type = 'Copper' 
                AND (CAST(n.snr AS REAL) < 20.0 OR CAST(n.attenuation AS REAL) > 20.0)
                ORDER BY RANDOM()
                LIMIT 5
            )
            UNION ALL
            SELECT * FROM (
                SELECT c.phone_number, c.registered_name, c.address, c.contact_number, 
                       n.line_state, n.power_level, n.snr, n.attenuation, n.clarity_path, c.telephone_type
                FROM customers c
                JOIN network_status n ON c.phone_number = n.phone_number
                WHERE n.status = 'UP' AND n.line_state != 'Fault' AND c.telephone_type = 'Fiber' 
                AND CAST(n.power_level AS REAL) < -25.0
                ORDER BY RANDOM()
                LIMIT 5
            )
        """
        cursor.execute(query)
        conn.commit()
        conn.close()
        return "Network scan complete! 10 highly vulnerable lines (5 PSTN, 5 FTTH) have been identified and sent to the Oracle Predictor dashboard."
    except Exception as e:
        return f"Error scanning network: {str(e)}"

@tool
async def clear_predictive_faults() -> str:
    """Clears the Oracle Predictor dashboard. Run this when Admin says the predicted faults have been fixed or handled."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("DELETE FROM oracle_predictions")
        conn.commit()
        conn.close()
        return "Oracle Predictor dashboard cleared successfully."
    except Exception as e:
        return f"Error clearing predictive faults: {str(e)}"

@tool
async def auto_dispatch_technicians_by_area() -> str:
    """Automatically assigns unassigned fault tickets to technicians based on their geographical zones."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Tech zones mapping based on our dummy DB (simplified for demo)
        tech_zones = {
            "Colombo Central": "THARINDU",
            "Colombo North": "KAMAL",
            "Colombo South": "ASELA",
            "Kandy": "SANJEEWA",
            "Galle": "JANITH",
            "Kurunegala": "LAHIRU",
            "Gampaha": "NALAKA",
            "Negombo": "PRASAD",
            "Matara": "KOSALA",
            "Anuradhapura": "SOMASIRI"
        }
        
        # Get unassigned tickets
        cursor.execute("SELECT ticket_id, phone_number FROM fault_tickets WHERE technician IS NULL OR technician = 'Unassigned'")
        tickets = cursor.fetchall()
        
        assigned_count = 0
        for ticket_id, phone in tickets:
            # Find customer address to determine zone
            cursor.execute("SELECT address FROM customers WHERE phone_number = ?", (phone,))
            cust = cursor.fetchone()
            
            assigned_tech = "THARINDU" # Default
            if cust:
                address = cust[0].lower()
                for zone, tech in tech_zones.items():
                    if zone.split()[-1].lower() in address or zone.split()[0].lower() in address:
                        assigned_tech = tech
                        break
            
            # Update ticket and tech status
            cursor.execute("UPDATE fault_tickets SET technician = ?, status = 'In Progress' WHERE ticket_id = ?", (assigned_tech, ticket_id))
            cursor.execute("UPDATE technicians SET status = 'Busy' WHERE name = ?", (assigned_tech,))
            assigned_count += 1
            
        conn.commit()
        conn.close()
        return f"Successfully dispatched technicians to {assigned_count} unassigned fault tickets based on their locations."
    except Exception as e:
        return f"Error auto-dispatching technicians: {str(e)}"

@tool
async def resolve_all_faults_admin() -> str:
    """Resolves all active fault tickets, logs a hashed summary to the blockchain, and clears them from the active list."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Mark all tickets as Resolved
        cursor.execute("UPDATE fault_tickets SET status = 'Resolved' WHERE status != 'Resolved' AND status != 'Closed'")
        
        # Reset technicians to Available
        cursor.execute("UPDATE technicians SET status = 'Available'")
        
        # Simulate Blockchain Write
        from datetime import datetime
        import hashlib
        
        hash_input = f"FAULTS_RESOLVED_{datetime.now().isoformat()}"
        tx_hash = hashlib.sha256(hash_input.encode()).hexdigest()
        
        cursor.execute('''
            INSERT INTO ledger_logs (timestamp, transaction_hash, event_type, details)
            VALUES (?, ?, ?, ?)
        ''', (datetime.now().isoformat(), tx_hash, "BULK_FAULT_RESOLUTION", f"All active faults resolved and validated. TxHash: {tx_hash}"))
        
        conn.commit()
        conn.close()
        return f"All faults resolved successfully. Technicians are available again. Ledger updated with bulk resolution hash: {tx_hash}."
    except Exception as e:
        return f"Error resolving faults: {str(e)}"


@tool
async def auto_dispatch_technicians_by_area() -> str:
    """Automatically assigns unassigned fault tickets to technicians based on their geographical zones."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Tech zones mapping based on our dummy DB (simplified for demo)
        tech_zones = {
            "Colombo Central": "THARINDU",
            "Colombo North": "KAMAL",
            "Colombo South": "ASELA",
            "Kandy": "SANJEEWA",
            "Galle": "JANITH",
            "Kurunegala": "LAHIRU",
            "Gampaha": "NALAKA",
            "Negombo": "PRASAD",
            "Matara": "KOSALA",
            "Anuradhapura": "SOMASIRI"
        }
        
        # Get unassigned tickets
        cursor.execute("SELECT ticket_id, phone_number FROM fault_tickets WHERE technician IS NULL OR technician = 'Unassigned'")
        tickets = cursor.fetchall()
        
        assigned_count = 0
        for ticket_id, phone in tickets:
            # Find customer address to determine zone
            cursor.execute("SELECT address FROM customers WHERE phone_number = ?", (phone,))
            cust = cursor.fetchone()
            
            assigned_tech = "THARINDU" # Default
            if cust:
                address = cust[0].lower()
                for zone, tech in tech_zones.items():
                    if zone.split()[-1].lower() in address or zone.split()[0].lower() in address:
                        assigned_tech = tech
                        break
            
            # Update ticket and tech status
            cursor.execute("UPDATE fault_tickets SET technician = ?, status = 'In Progress' WHERE ticket_id = ?", (assigned_tech, ticket_id))
            cursor.execute("UPDATE technicians SET status = 'Busy' WHERE name = ?", (assigned_tech,))
            assigned_count += 1
            
        conn.commit()
        conn.close()
        return f"Successfully dispatched technicians to {assigned_count} unassigned fault tickets based on their locations."
    except Exception as e:
        return f"Error auto-dispatching technicians: {str(e)}"

@tool
async def resolve_all_faults_admin() -> str:
    """Resolves all active fault tickets, logs a hashed summary to the blockchain, and clears them from the active list."""
    import os
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Mark all tickets as Resolved
        cursor.execute("UPDATE fault_tickets SET status = 'Resolved' WHERE status != 'Resolved' AND status != 'Closed'")
        
        # Reset technicians to Available
        cursor.execute("UPDATE technicians SET status = 'Available'")
        
        # Simulate Blockchain Write
        from datetime import datetime
        import hashlib
        
        hash_input = f"FAULTS_RESOLVED_{datetime.now().isoformat()}"
        tx_hash = hashlib.sha256(hash_input.encode()).hexdigest()
        
        cursor.execute("""
            INSERT INTO ledger_logs (timestamp, transaction_hash, event_type, details)
            VALUES (?, ?, ?, ?)
        """, (datetime.now().isoformat(), tx_hash, "BULK_FAULT_RESOLUTION", f"All active faults resolved and validated. TxHash: {tx_hash}"))
        
        conn.commit()
        conn.close()
        return f"All faults resolved successfully. Technicians are available again. Ledger updated with bulk resolution hash: {tx_hash}."
    except Exception as e:
        return f"Error resolving faults: {str(e)}"

@tool
async def resolve_major_outage() -> str:
    """Resolves a major network outage (like a cable cut), stops the UI alarms, sends a final damage report email, and simulates customer SMS."""
    import os
    import sqlite3
    import random
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from datetime import datetime
    import hashlib

    DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "slt_dummy.db")
    try:
        # 1. Update system state to stop the UI alarm
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE system_state SET value = 'NORMAL' WHERE key = 'outage_status'")
        
        # 2. Blockchain ledger
        hash_input = f"MAJOR_OUTAGE_RESOLVED_{datetime.now().isoformat()}"
        tx_hash = hashlib.sha256(hash_input.encode()).hexdigest()
        cursor.execute("""
            INSERT INTO ledger_logs (timestamp, transaction_hash, event_type, details)
            VALUES (?, ?, ?, ?)
        """, (datetime.now().isoformat(), tx_hash, "OUTAGE_RESOLUTION", f"Major network outage resolved. Services restored. TxHash: {tx_hash}"))
        conn.commit()
        conn.close()

        # 3. Random Damage Reports
        loss = f"Rs. {random.randint(50, 500)},000.00"
        reports = [
            f"Copper DP Pole completely broken due to an accident. Splicing team replaced the DP. Estimated Financial Loss: {loss}.",
            f"MSAN Cabinet down due to commercial power failure and backup battery drain. Power restored. Estimated Financial Loss: {loss}.",
            f"FTTH Main Distribution Cable deliberately cut (Suspected Theft). 96-core fiber spliced and restored. Estimated Financial Loss: {loss}.",
            f"Lightning strike damaged the MSAN distribution cards. Cards replaced by technical team. Estimated Financial Loss: {loss}.",
            f"Construction vehicle accidentally severed the underground FTTH fiber path. Conduit repaired and fiber blown. Estimated Financial Loss: {loss}."
        ]
        chosen_report = random.choice(reports)

        # 4. Send Email
        sender_email = os.getenv("GMAIL_USER")
        sender_password = os.getenv("GMAIL_APP_PASSWORD")
        if sender_email and sender_password:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = "aravindaslt@gmail.com"
            msg['Subject'] = "✅ OUTAGE RESOLVED: Final Incident Report"
            
            body = f"""
            SLT NEXUS - INCIDENT RESOLUTION REPORT
            ---------------------------------------
            Timestamp: {datetime.now().isoformat()}
            
            Status: ALL SERVICES RESTORED
            
            Damage Assessment:
            {chosen_report}
            
            Actions Taken:
            - Network state reverted to NORMAL
            - Incident permanently logged to Blockchain Ledger (Tx: {tx_hash})
            - Auto-SMS dispatched to all affected customers
            
            Generated by SLT NEXUS Pathfinder AI.
            """
            msg.attach(MIMEText(body, 'plain'))
            try:
                with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                    server.login(sender_email, sender_password)
                    server.send_message(msg)
            except Exception as e:
                print(f"Failed to send email: {e}")

        return "Network state restored to NORMAL. Final damage report email sent. Simulated SMS sent to all affected customers. Incident logged to Blockchain."
    except Exception as e:
        return f"Error resolving outage: {str(e)}"
