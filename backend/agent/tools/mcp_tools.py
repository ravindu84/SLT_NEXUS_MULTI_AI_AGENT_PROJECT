import httpx
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
async def get_data_usage(phone_number: str):
    """Fetches real-time data usage, outstanding bill balance, NXC coin balance, and 3-month billing history (arrears)."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{MOCK_BASE_URL}/billing/usage/{phone_number}")
        return response.json()

@tool
async def get_daily_usage_logs(phone_number: str):
    """Fetches 30-day daily data consumption breakdown and website logs (Facebook, YouTube, Google, etc.) to analyze where data was spent."""
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
        return response.json()

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
