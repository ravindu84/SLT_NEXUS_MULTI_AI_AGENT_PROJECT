from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
import asyncio
import os
from typing import List, Optional
import random
from datetime import datetime

router = APIRouter(prefix="/mocks", tags=["mocks"])

# --- Models ---

class RouterStatus(BaseModel):
    device_id: str
    status: str
    los_light: str
    pon_light: str
    signal_strength: float
    firmware_version: str

class TicketRequest(BaseModel):
    phone_number: str
    issue_type: str
    description: str
    assigned_technician: Optional[str] = None

class TicketResponse(BaseModel):
    ticket_id: str
    status: str
    assigned_technician: Optional[str]
    estimated_resolution: str

class UsageResponse(BaseModel):
    phone_number: str
    total_data: str
    used_data: str
    remaining_data: str
    status: str
    nxc_balance: int
    billing_history: List[dict]

class PayBillRequest(BaseModel):
    phone_number: str
    amount: float
    use_nxc_coins: bool

class PaymentRequest(BaseModel):
    amount: float
    currency: str
    package_name: str
    phone_number: str

class ProvisionRequest(BaseModel):
    customer_name: str
    address: str
    connection_type: str  # Fiber, PEO TV, etc.
    phone_number: str

class ReportEmailRequest(BaseModel):
    emails: List[str]
    report_type: str

class AssignTicketRequest(BaseModel):
    ticket_id: str
    technician: str

# --- Endpoints ---

@router.get("/imaster/diagnostics/{device_id}", response_model=RouterStatus)
async def router_diagnostics(device_id: str):
    """Simulates Huawei/ZTE/iMaster NCE router diagnostics by pulling live NMS signal values from database."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT status, line_state, power_level, ont_type FROM network_status WHERE phone_number = ?", (device_id,))
        row = cursor.fetchone()
        conn.close()
        
        if row:
            status, line_state, power, ont = row
            los = "Red" if status == "DOWN" or line_state == "Fault" else ("Orange" if line_state == "Warning" else "Green")
            sig = float(power) if (power != "N/A" and power is not None) else -35.0
            return RouterStatus(
                device_id=device_id,
                status=status,
                los_light=los,
                pon_light="Green" if status == "UP" else "Off",
                signal_strength=sig,
                firmware_version=f"V5.R19.C10.S-{ont.split()[0] if ont != 'N/A' else 'GENERIC'}"
            )
    except Exception as e:
        print(f"Mock diagnostics DB error: {e}")
        
    return RouterStatus(
        device_id=device_id,
        status="Online",
        los_light="Green",
        pon_light="Green",
        signal_strength=-21.5,
        firmware_version="V5.R19.C10.S120"
    )

@router.get("/technician/diagnostics/{phone_number}")
async def get_tech_diagnostics(phone_number: str):
    """Simulates B2B full technician diagnostics sheet for one of the 200 numbers."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        query = """
            SELECT c.registered_name, c.address, c.telephone_type,
                   n.status, n.line_state, n.power_level, n.snr, n.attenuation, n.ont_type, n.tid, n.clarity_path,
                   b.monthly_rental, b.total_due, b.payment_status
            FROM customers c
            LEFT JOIN network_status n ON c.phone_number = n.phone_number
            LEFT JOIN billing b ON c.phone_number = b.phone_number
            WHERE c.phone_number = ?
        """
        cursor.execute(query, (phone_number,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "phone_number": phone_number,
                "customer_name": row[0],
                "address": row[1],
                "line_type": row[2],
                "status": row[3],
                "line_state": row[4],
                "power_level": row[5] if row[5] is not None else "N/A",
                "snr": row[6] if row[6] is not None else "N/A",
                "attenuation": row[7] if row[7] is not None else "N/A",
                "ont_type": row[8] if row[8] is not None else "N/A",
                "tid": row[9] if row[9] is not None else "N/A",
                "clarity_path": row[10] if row[10] is not None else "N/A",
                "monthly_rental": row[11],
                "total_due": f"LKR {row[12]:.2f}",
                "payment_status": row[13]
            }
    except Exception as e:
        print(f"Tech diagnostics DB error: {e}")
    return {"error": "Device not found in database"}

@router.post("/wfm/ticket", response_model=TicketResponse)
async def create_fault_ticket(request: TicketRequest):
    """Simulates WFM/Clarity fault ticketing and stores it in database."""
    import sqlite3
    from datetime import datetime
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    ticket_id = f"SLT-FT-{random.randint(100000, 999999)}"
    technicians = ["KOSALA", "JANITH", "SANJEEWA", "NALAKA", "LAHIRU", "ASELA", "THARINDU", "PRASAD", "KAMAL", "SOMASIRI"]
    
    assigned_tech = request.assigned_technician if request.assigned_technician else None
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO fault_tickets (ticket_id, phone_number, technician, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (ticket_id, request.phone_number, assigned_tech, "Open", datetime.now().isoformat()))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error inserting fault ticket: {e}")
        
    return TicketResponse(
        ticket_id=ticket_id,
        status="Assigned",
        assigned_technician=assigned_tech,
        estimated_resolution="4 Hours"
    )

@router.get("/wfm/technician-status")
async def get_technician_status():
    """Returns the fixed zones and active workloads for the 10 technicians."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    zones = {
        "KOSALA": "Pitipana North",
        "JANITH": "Pitipana North",
        "SANJEEWA": "Pitipana South",
        "NALAKA": "Pitipana South",
        "LAHIRU": "Homagama Town",
        "ASELA": "Homagama Town",
        "THARINDU": "Godagama",
        "PRASAD": "Godagama",
        "KAMAL": "Meegoda",
        "SOMASIRI": "Meegoda"
    }
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Count active tickets (Pending, Dispatched, In Progress, Assigned) for each tech
        cursor.execute("SELECT technician, COUNT(*) FROM fault_tickets WHERE status != 'Closed' GROUP BY technician")
        workloads = {row[0]: row[1] for row in cursor.fetchall()}
        conn.close()
        
        status_report = []
        for tech, zone in zones.items():
            status_report.append({
                "technician": tech,
                "assigned_zone": zone,
                "active_tickets": workloads.get(tech, 0)
            })
            
        return {"technician_status": status_report}
    except Exception as e:
        print(f"Technician status DB error: {e}")
        return {"error": "Could not fetch technician status"}

@router.get("/wfm/active-faults")
async def get_active_faults():
    """Returns all active fault tickets from the database."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT ticket_id, phone_number, technician, status, created_at FROM fault_tickets")
        rows = cursor.fetchall()
        conn.close()
        
        faults = []
        for r in rows:
            faults.append({
                "ticket_id": r[0],
                "phone_number": r[1],
                "technician": r[2],
                "status": r[3],
                "created_at": r[4]
            })
        return {"fault_tickets": faults}
    except Exception as e:
        print(f"Mock active faults DB error: {e}")
        return {"error": "Could not fetch faults"}

@router.get("/wfm/predictive-degradation")
async def get_predictive_degradation():
    """Returns a list of lines with degrading signals for predictive maintenance."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        # Read from the oracle_predictions table which is populated by the AI
        query = "SELECT * FROM oracle_predictions"
        cursor.execute(query)
        rows = cursor.fetchall()
        conn.close()
        
        degraded = []
        for r in rows:
            degraded.append({
                "phone_number": r[0],
                "customer_name": r[1],
                "address": r[2],
                "contact_number": r[3],
                "line_type": r[9],
                "power_level": r[5],
                "snr": r[6],
                "attenuation": r[7],
                "dp_loop": r[8]
            })
            
        return {"at_risk_lines": degraded, "total_found": len(degraded)}
    except Exception as e:
        print(f"Predictive degradation DB error: {e}")
        return {"error": "Could not fetch predictive report"}

@router.post("/wfm/approve-connection/{conn_id}")
async def approve_connection(conn_id: str):
    import sys
    import os
    import sqlite3
    from datetime import datetime
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.append(parent_dir)
    try:
        from backend.agent.tools.vault import send_web3_transaction
        vault_res = send_web3_transaction({
            "type": "CONNECTION_ACTIVATED_OK",
            "connection_id": conn_id,
            "status": "Installed",
            "message": "Physical line active and provisioned."
        })
        
        DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT mobile_number, slt_number, name, address, id_number FROM new_connections WHERE connection_id = ?", (conn_id,))
        row = cursor.fetchone()
        
        if row:
            mobile_number, slt_number, name, address, id_number = row
            
            # Transition to active customers
            cursor.execute('''
                INSERT OR REPLACE INTO customers (phone_number, contact_number, registered_name, address, id_number, telephone_type, active_status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (slt_number, mobile_number, name, address, id_number, "Fibre", "Active"))
            
            # Add to billing
            cursor.execute('''
                INSERT OR REPLACE INTO billing (phone_number, total_due, due_date, payment_status, current_plan, nxc_balance)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (slt_number, 0, "2025-01-20", "Paid", "New", 0))
            
            # Add to network_status
            cursor.execute('''
                INSERT OR REPLACE INTO network_status (phone_number, port_status, optical_power_level, attenuation, snr, ip_address, dp_loop)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (slt_number, "Active", "-18.5 dBm", "10 dB", "35 dB", "192.168.1.100", "DP12/L4"))
            
            # Delete from new_connections
            cursor.execute("DELETE FROM new_connections WHERE connection_id = ?", (conn_id,))
            conn.commit()
            
        conn.close()
        return {"status": "success", "tx": vault_res, "message": "Customer transitioned to active pool successfully"}
    except Exception as e:
        return {"error": str(e)}


def calculate_bill_breakdown(amount_billed: float) -> dict:
    tax = round(amount_billed * 0.04, 2)
    base = amount_billed - tax
    internet = round(base * 0.5, 2)
    peo_tv = round(base * 0.3, 2)
    voice = round(base - internet - peo_tv, 2)
    return {
        "voice_charge": voice,
        "internet_charge": internet,
        "peo_tv_charge": peo_tv,
        "tax_4_percent": tax,
        "total_bill": amount_billed
    }

@router.get("/admin/billing/{phone_number}")
async def get_admin_billing(phone_number: str):
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.registered_name, c.address, b.total_due, b.payment_status, b.nxc_balance
            FROM customers c
            LEFT JOIN billing b ON c.phone_number = b.phone_number
            WHERE c.phone_number = ?
        ''', (phone_number,))
        user_info = cursor.fetchone()
        if not user_info:
            return {"error": "Customer not found"}

        cursor.execute('''
            SELECT month, year, amount_billed, amount_paid, arrears 
            FROM billing_history 
            WHERE phone_number = ? 
            ORDER BY id ASC
        ''', (phone_number,))
        history = cursor.fetchall()
        conn.close()
        
        billing_history = []
        for row in history:
            h_dict = dict(row)
            h_dict["breakdown"] = calculate_bill_breakdown(h_dict["amount_billed"])
            billing_history.append(h_dict)
            
        return {
            "customer": dict(user_info),
            "billing_history": billing_history
        }
    except Exception as e:
        return {"error": str(e)}

@router.get("/billing/usage/{phone_number}", response_model=UsageResponse)
async def get_usage(phone_number: str):
    """Simulates SLT Billing/Usage system by querying live data_usage and billing tables."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT total_data_gb, used_data_gb, remaining_data_gb, usage_status FROM data_usage WHERE phone_number = ?", (phone_number,))
        row = cursor.fetchone()
        
        # Check total dues too
        cursor.execute("SELECT total_due, payment_status, nxc_balance FROM billing WHERE phone_number = ?", (phone_number,))
        bill_row = cursor.fetchone()
        
        # Get 3 month history
        cursor.execute("SELECT month, year, amount_billed, amount_paid, arrears FROM billing_history WHERE phone_number = ? ORDER BY id ASC", (phone_number,))
        history_rows = cursor.fetchall()
        
        conn.close()
        
        billing_history = []
        for h in history_rows:
            amount_billed = h[2]
            breakdown = calculate_bill_breakdown(amount_billed)
            billing_history.append({
                "month": h[0],
                "year": h[1],
                "amount_billed": amount_billed,
                "amount_paid": h[3],
                "arrears": h[4],
                "breakdown": breakdown
            })
            
        if row:
            total, used, remaining, status = row
            due_str = f"LKR {bill_row[0]:.2f}" if bill_row else "LKR 0.00"
            pay_status = bill_row[1] if bill_row else "Paid"
            nxc = bill_row[2] if bill_row else 0
            
            return UsageResponse(
                phone_number=phone_number,
                total_data=f"{total} GB",
                used_data=f"{used} GB",
                remaining_data=f"{remaining} GB",
                status=f"Quota: {status} | Bills: {pay_status} (Due: {due_str})",
                nxc_balance=nxc,
                billing_history=billing_history
            )
    except Exception as e:
        print(f"Mock usage DB error: {e}")

    return UsageResponse(
        phone_number=phone_number,
        total_data="300 GB",
        used_data="45 GB",
        remaining_data="255 GB",
        status="Active",
        nxc_balance=0,
        billing_history=[]
    )

@router.get("/billing/daily-usage/{phone_number}")
async def get_daily_usage(phone_number: str):
    """Simulates daily usage logs query to see daily GB and site consumption."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT log_date, facebook_gb, google_gb, youtube_gb, amazon_gb, tiktok_gb, total_gb "
            "FROM daily_usage_logs WHERE phone_number = ? ORDER BY log_date DESC LIMIT 30", 
            (phone_number,)
        )
        rows = cursor.fetchall()
        conn.close()
        
        if rows:
            logs = []
            for r in rows:
                logs.append({
                    "date": r[0],
                    "facebook_gb": r[1],
                    "google_gb": r[2],
                    "youtube_gb": r[3],
                    "amazon_gb": r[4],
                    "tiktok_gb": r[5],
                    "total_gb": r[6]
                })
            
            if not logs:
                return {"phone_number": phone_number, "daily_logs": [], "highest_usage_day": None}
                
            # Find the day with the maximum total_gb
            highest_log = max(logs, key=lambda x: x["total_gb"])
            
            # Calculate percentages
            total = highest_log["total_gb"]
            percentages = {}
            if total > 0:
                percentages = {
                    "facebook_pct": round((highest_log["facebook_gb"] / total) * 100, 1),
                    "google_pct": round((highest_log["google_gb"] / total) * 100, 1),
                    "youtube_pct": round((highest_log["youtube_gb"] / total) * 100, 1),
                    "amazon_pct": round((highest_log["amazon_gb"] / total) * 100, 1),
                    "tiktok_pct": round((highest_log["tiktok_gb"] / total) * 100, 1),
                }
                
            highest_usage_day = {
                "date": highest_log["date"],
                "total_gb": highest_log["total_gb"],
                "breakdown": highest_log,
                "percentages": percentages
            }
            
            return {
                "phone_number": phone_number,
                "highest_usage_day": highest_usage_day,
                "daily_logs": logs
            }
    except Exception as e:
        print(f"Mock daily usage DB error: {e}")
        
    return {"phone_number": phone_number, "daily_logs": []}

@router.post("/payhere/checkout")
async def mock_payment(request: PaymentRequest):
    """Simulates PayHere payment gateway."""
    import sqlite3
    import os
    
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if it's a new connection payment
        cursor.execute("SELECT * FROM new_connections WHERE slt_number = ? OR mobile_number = ?", (request.phone_number, request.phone_number))
        if cursor.fetchone():
            cursor.execute("UPDATE new_connections SET payment_status = 'Paid', status = 'Paid & Verified', package = ? WHERE slt_number = ? OR mobile_number = ?", 
                           (request.package_name, request.phone_number, request.phone_number))
            conn.commit()
            
        conn.close()
    except Exception as e:
        print(f"Error updating new connection payment: {e}")
        
    # Simulate a successful payment
    return {
        "status": "success",
        "payment_id": f"PH-{uuid_gen()}",
        "amount": request.amount,
        "message": f"Payment of {request.amount} {request.currency} for {request.package_name} processed successfully."
    }

@router.post("/billing/pay")
async def pay_bill_endpoint(request: PayBillRequest):
    """Simulates paying an SLT bill, optionally using NXC coins for discount."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT total_due, nxc_balance FROM billing WHERE phone_number = ?", (request.phone_number,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return {"status": "error", "message": "Phone number not found."}
            
        total_due, nxc_balance = row
        discount = 0.0
        coins_used = 0
        
        if request.use_nxc_coins and nxc_balance > 0:
            # Conversion rate: 1 NXC = 1 LKR
            coins_used = nxc_balance
            discount = float(coins_used)
            nxc_balance = 0
            
        final_amount_to_pay = max(0.0, total_due - discount)
        
        # We assume the user pays the remaining `final_amount_to_pay` immediately.
        # But wait, the request has `amount`. Let's assume the user pays `request.amount` after discount.
        
        amount_paid_by_user = request.amount
        total_value_paid = amount_paid_by_user + discount
        
        new_due = max(0.0, total_due - total_value_paid)
        
        cursor.execute(
            "UPDATE billing SET total_due = ?, nxc_balance = ? WHERE phone_number = ?",
            (new_due, nxc_balance, request.phone_number)
        )
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Bill payment processed. Used {coins_used} NXC coins for LKR {discount} discount. Paid LKR {amount_paid_by_user}. New Due: LKR {new_due:.2f}"
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/provisioning/new-connection")
async def mock_provision(request: ProvisionRequest):
    """Simulates recording a new fiber/PEO TV connection."""
    return {
        "status": "recorded",
        "order_id": f"SLT-ORD-{random.randint(1000, 9999)}",
        "timestamp": datetime.now().isoformat(),
        "message": f"New {request.connection_type} connection request recorded for {request.customer_name}."
    }

@router.post("/report/email")
async def email_report(request: ReportEmailRequest):
    """Sends a WFM integrated report via real email using SMTP."""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    timestamp = datetime.now().isoformat()
    
    report_mapping = {
        "morning": "report_morning.png",
        "afternoon": "report_afternoon.png",
        "evening": "report_evening.png",
        "day_start": "day_start.png",
        "full_details": "full_details_report.png",
        "day_end": "Day_End_Report.png"
    }
    
    filename = report_mapping.get(request.report_type, f"report_{request.report_type}.png")
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    image_url = f"{frontend_url.rstrip('/')}/assets/{filename}"
    
    # Custom details for each report type based on WFM integration
    if request.report_type in ["morning", "day_start"]:
        subject = f"SLT NEXUS - Morning / Day Start Report"
        summary = "NMS diagnostics completed. Active alarms detected. WFM technicians dispatched."
    elif request.report_type == "afternoon":
        subject = "SLT NEXUS - Afternoon NMS Signal Report [01:00 PM]"
        summary = "Predictive maintenance flags and afternoon routing updated."
    elif request.report_type == "full_details":
        subject = "SLT NEXUS - Full Details Comprehensive Report"
        summary = "Comprehensive breakdown of all system statistics, outages, and financial logs."
    else: # evening, day_end
        subject = "SLT NEXUS - WFM Closed Tickets & Evening Shifts Report"
        summary = "WFM evening allocations completed. All daytime fault tickets reviewed and closed."

    # Send real email
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_APP_PASSWORD")
    
    email_status = "sent"
    error_msg = ""
    
    if sender_email and sender_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = ", ".join(request.emails)
            msg['Subject'] = subject
            
            # HTML body with the image embedded
            html_body = f"""
            <html>
                <body>
                    <h2>SLT NEXUS - WFM Report</h2>
                    <p><strong>{summary}</strong></p>
                    <p>Please find the generated report below:</p>
                    <img src="{image_url}" alt="{filename}" style="max-width: 100%; border: 1px solid #ddd;"/>
                    <br>
                    <p><small>Automated dispatch by SLT NEXUS System</small></p>
                </body>
            </html>
            """
            msg.attach(MIMEText(html_body, 'html'))
            
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, request.emails, text)
            server.quit()
            
            print(f"✅ Real Email sent successfully to {', '.join(request.emails)}!")
        except Exception as e:
            email_status = "failed"
            error_msg = str(e)
            print(f"❌ Failed to send email: {error_msg}")
    else:
        email_status = "failed"
        error_msg = "GMAIL_USER or GMAIL_APP_PASSWORD not configured in .env"
        print(f"❌ Email simulated (Credentials missing in .env). Subject: {subject}")

    return {
        "status": email_status,
        "error": error_msg,
        "timestamp": timestamp,
        "subject": subject,
        "report_type": request.report_type,
        "emails_sent": request.emails,
        "summary": summary,
        "attachment": filename,
        "image_url": image_url
    }

class CableTheftAlarmRequest(BaseModel):
    emails: List[str]
    dp_count: int
    msan_count: int
    ftth_count: int

@router.post("/report/cable-theft-alarm")
async def email_cable_theft_alarm(request: CableTheftAlarmRequest):
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    timestamp = datetime.now().isoformat()
    subject = "🚨 CRITICAL ALARM: Suspected Cable Theft Detected 🚨"
    
    sender_email = os.getenv("GMAIL_USER")
    sender_password = os.getenv("GMAIL_APP_PASSWORD")
    
    email_status = "sent"
    error_msg = ""
    
    if sender_email and sender_password:
        try:
            msg = MIMEMultipart()
            msg['From'] = sender_email
            msg['To'] = ", ".join(request.emails)
            msg['Subject'] = subject
            
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; color: #333; background-color: #111; padding: 20px;">
                    <div style="background-color: #222; border: 2px solid #e74c3c; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #e74c3c; text-align: center;">⚠️ CRITICAL INCIDENT REPORT ⚠️</h2>
                        <h3 style="color: #fff;">Network Event: Suspected Copper/Fiber Cable Theft</h3>
                        <p style="color: #ccc;">The SLT NEXUS Pathfinder has detected simultaneous hard-down anomalies across multiple network segments, highly indicative of malicious physical damage (Cable Cut/Theft).</p>
                        
                        <div style="background-color: #333; padding: 15px; border-left: 4px solid #e74c3c; margin: 20px 0;">
                            <h4 style="color: #e74c3c; margin-top: 0;">Impacted Assets:</h4>
                            <ul style="color: #fff; font-size: 16px;">
                                <li><strong>Distribution Points (DP):</strong> {request.dp_count} Down</li>
                                <li><strong>MSAN Nodes:</strong> {request.msan_count} Down</li>
                                <li><strong>FTTH Cabinets:</strong> {request.ftth_count} Down</li>
                            </ul>
                        </div>
                        
                        <p style="color: #ccc;">Immediate dispatch of field teams is strongly advised. Coordinates have been locked on the Pathfinder NOC dashboard.</p>
                        <br>
                        <p style="color: #777;"><small>Automated dispatch by SLT NEXUS Security System<br>Timestamp: {timestamp}</small></p>
                    </div>
                </body>
            </html>
            """
            msg.attach(MIMEText(html_body, 'html'))
            
            server = smtplib.SMTP('smtp.gmail.com', 587)
            server.starttls()
            server.login(sender_email, sender_password)
            text = msg.as_string()
            server.sendmail(sender_email, request.emails, text)
            server.quit()
            
            print(f"✅ Theft Alarm Email sent successfully to {', '.join(request.emails)}!")
        except Exception as e:
            email_status = "failed"
            error_msg = str(e)
            print(f"❌ Failed to send alarm email: {error_msg}")
    else:
        email_status = "failed"
        error_msg = "GMAIL_USER or GMAIL_APP_PASSWORD not configured in .env"
        print("❌ Theft Alarm Email simulated (Credentials missing).")

    return {
        "status": email_status,
        "error": error_msg,
        "timestamp": timestamp
    }

class FinalizeRequest(BaseModel):
    mobile_number: str
    package_name: str

@router.get("/auth/kyc-status/{mobile_number}")
async def check_kyc(mobile_number: str):
    """Simulates checking if a user has uploaded their KYC selfie. We will mock it to always return True for prototype."""
    return {"mobile_number": mobile_number, "kyc_verified": True, "message": "KYC Document Approved"}

@router.post("/provisioning/finalize")
async def finalize_connection(request: FinalizeRequest):
    """Generates the new SLT number and inserts into new_connections."""
    import sqlite3
    from datetime import datetime
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get count to generate sequential number
        cursor.execute("SELECT COUNT(*) FROM new_connections")
        count = cursor.fetchone()[0]
        
        # Get prospect details
        cursor.execute("SELECT name, address, nic, kyc_verified FROM prospects WHERE mobile_number=?", (request.mobile_number,))
        prospect = cursor.fetchone()
        
        name = prospect[0] if prospect else "Unknown"
        address = prospect[1] if prospect else "Unknown"
        nic = prospect[2] if prospect else "Unknown"
        kyc_status = "Verified" if prospect and prospect[3] else "Pending"
        
        # Generate new number: 0112896000 + count
        new_slt_number = f"0112896{str(count).zfill(3)}"
        connection_id = f"SLT-NC-{uuid_gen()}"
        
        cursor.execute('''
            INSERT INTO new_connections (connection_id, mobile_number, slt_number, name, address, id_number, package, payment_status, kyc_status, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (connection_id, request.mobile_number, new_slt_number, name, address, nic, request.package_name, "Paid", kyc_status, "Pending Provisioning", datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Connection finalized! Your new SLT number is {new_slt_number}",
            "slt_number": new_slt_number,
            "connection_id": connection_id
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def uuid_gen():
    import uuid
    return str(uuid.uuid4())[:8].upper()

class AllocateDPRequest(BaseModel):
    slt_number: str

@router.post("/provisioning/allocate-dp")
async def allocate_dp_loop(request: AllocateDPRequest):
    """Allocates a DP/Loop for a new connection and logs it to the Blockchain Vault."""
    import sqlite3
    import random
    from datetime import datetime
    import hashlib
    
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    
    dp_names = ["HD-FTTH-01", "HD-FTTH-02", "HD-FTTH-03", "PT-FTTH-01", "PT-FTTH-02"]
    assigned_dp = random.choice(dp_names)
    assigned_loop = random.randint(1, 16)
    dp_loop_str = f"{assigned_dp}-L{assigned_loop}"
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Update new_connections table with the assigned DP/Loop
        cursor.execute('''
            UPDATE new_connections
            SET status = "Provisioned", dp_loop = ?
            WHERE slt_number = ?
        ''', (dp_loop_str, request.slt_number))
        
        # Insert into blockchain_ledger
        block_data = f"NEW_CONNECTION_PROVISIONED|{request.slt_number}|{dp_loop_str}|{datetime.now().isoformat()}"
        block_hash = hashlib.sha256(block_data.encode()).hexdigest()
        
        cursor.execute('''
            INSERT INTO blockchain_ledger (transaction_id, block_hash, action, details, timestamp)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            f"TX-PROV-{uuid_gen()}",
            block_hash,
            "NEW_CONNECTION_PROVISIONED",
            f"Allocated DP/Loop {dp_loop_str} for {request.slt_number}",
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "status": "success",
            "message": f"Successfully allocated DP/Loop {dp_loop_str} and logged to the Blockchain Vault.",
            "dp_loop": dp_loop_str
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- ADMIN NOC DASHBOARD ENDPOINTS ---

@router.get("/admin/new-connections")
async def get_new_connections():
    """Fetches all new connections for the Admin CRM."""
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM new_connections ORDER BY created_at DESC")
        rows = cursor.fetchall()
        connections = [dict(row) for row in rows]
        conn.close()
        return {"status": "success", "new_connections": connections}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/admin/tickets")
async def get_admin_tickets():
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fault_tickets ORDER BY created_at DESC LIMIT 20")
    rows = cursor.fetchall()
    conn.close()
    return {"tickets": [dict(r) for r in rows]}

@router.get("/admin/technicians")
async def get_admin_technicians():
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM technicians ORDER BY active_tickets DESC")
    rows = cursor.fetchall()
    conn.close()
    return {"technicians": [dict(r) for r in rows]}

@router.post("/admin/tickets/assign")
async def assign_admin_ticket(req: AssignTicketRequest):
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("UPDATE fault_tickets SET technician = ?, status = 'Assigned' WHERE ticket_id = ?", (req.technician, req.ticket_id))
        cursor.execute("UPDATE technicians SET active_tickets = active_tickets + 1, status = 'Busy' WHERE name = ?", (req.technician,))
        conn.commit()
        conn.close()
        return {"status": "success", "message": f"Ticket assigned to {req.technician}"}
    except Exception as e:
        return {"error": str(e)}

@router.post("/admin/resolve_ticket/{ticket_id}")
async def resolve_admin_ticket(ticket_id: str):
    import sqlite3
    import sys
    import os
    # Add parent to path to import backend tools
    parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent_dir not in sys.path:
        sys.path.append(parent_dir)
    try:
        from backend.agent.tools.vault import send_web3_transaction
    except ImportError:
        send_web3_transaction = None

    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Get technician to decrement active tickets
        cursor.execute("SELECT technician FROM fault_tickets WHERE ticket_id = ?", (ticket_id,))
        row = cursor.fetchone()
        tech = row[0] if row else None
        
        cursor.execute("UPDATE fault_tickets SET status = 'Resolved' WHERE ticket_id = ?", (ticket_id,))
        if tech:
            cursor.execute("UPDATE technicians SET active_tickets = max(0, active_tickets - 1), status = CASE WHEN active_tickets <= 1 THEN 'Available' ELSE 'Busy' END WHERE name = ?", (tech,))
        
        conn.commit()
        conn.close()
        
        # Blockchain commit
        if send_web3_transaction:
            send_web3_transaction({
                "type": "FAULT_RESOLUTION_RECEIPT",
                "ticket_id": ticket_id,
                "technician": tech or "Admin",
                "status": "Resolved"
            })
            
        return {"status": "success", "message": f"Ticket {ticket_id} resolved and logged to blockchain"}
    except Exception as e:
        return {"error": str(e)}


@router.get("/admin/dps")
async def get_admin_dps():
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    # Fetch DPs and their allocated loops
    cursor.execute('''
        SELECT dp.dp_id, dp.location_lat, dp.location_lon, dp.status, dp.total_capacity, dp.available_capacity,
               COUNT(l.loop_id) as loops_used
        FROM fiber_dp dp
        LEFT JOIN fiber_dp_loops l ON dp.dp_id = l.dp_id
        GROUP BY dp.dp_id
        ORDER BY dp.created_at DESC
    ''')
    dps = [dict(r) for r in cursor.fetchall()]
    
    cursor.execute("SELECT * FROM fiber_dp_loops ORDER BY allocated_at DESC LIMIT 50")
    loops = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    return {"dps": dps, "loops": loops}

@router.get("/admin/ledger")
async def get_admin_ledger():
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ledger ORDER BY created_at DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    return {"ledger": [dict(r) for r in rows]}

@router.get("/admin/customer/{phone}")
async def get_admin_customer(phone: str):
    import sqlite3
    from fastapi import HTTPException
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Full customer profile with ALL technical data
        cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone,))
        customer = cursor.fetchone()
        
        if not customer:
            conn.close()
            raise HTTPException(status_code=404, detail="Customer not found")
            
        cursor.execute("SELECT * FROM network_status WHERE phone_number = ?", (phone,))
        network = cursor.fetchone()
        
        cursor.execute("SELECT * FROM data_usage WHERE phone_number = ?", (phone,))
        usage = cursor.fetchone()
        
        cursor.execute("SELECT * FROM billing WHERE phone_number = ?", (phone,))
        billing = cursor.fetchone()
        
        cursor.execute("SELECT month, year, amount_billed, amount_paid, arrears FROM billing_history WHERE phone_number = ? ORDER BY id ASC", (phone,))
        history = cursor.fetchall()
        
        cursor.execute("SELECT ticket_id, technician, status, created_at FROM fault_tickets WHERE phone_number = ?", (phone,))
        tickets = cursor.fetchall()
        
        conn.close()
        
        return {
            # Customer Identity
            "phone_number": customer['phone_number'],
            "name": customer['registered_name'],
            "address": customer['address'],
            "contact_number": customer['contact_number'],
            "telephone_type": customer['telephone_type'],
            "registered_date": customer['registered_date'],
            "dp_loop": customer['dp_loop'],
            "has_voice": customer['has_voice'],
            "has_internet": customer['has_internet'],
            "has_iptv": customer['has_iptv'],
            "iptv_account_id": customer['iptv_account_id'],
            # Network Technical Data
            "status": network['status'] if network else 'Unknown',
            "line_state": network['line_state'] if network else None,
            "power_level": network['power_level'] if network else None,
            "snr": network['snr'] if network else None,
            "attenuation": network['attenuation'] if network else None,
            "ont_type": network['ont_type'] if network else None,
            "tid": network['tid'] if network else None,
            "clarity_path": network['clarity_path'] if network else None,
            # Data Usage
            "package_name": usage['package_name'] if usage else None,
            "total_data_gb": usage['total_data_gb'] if usage else 0,
            "used_data_gb": usage['used_data_gb'] if usage else 0,
            "remaining_data_gb": usage['remaining_data_gb'] if usage else 0,
            "usage_status": usage['usage_status'] if usage else None,
            # Billing
            "total_due": billing['total_due'] if billing else 0,
            "payment_status": billing['payment_status'] if billing else None,
            "nxc_balance": billing['nxc_balance'] if billing else 0,
            "monthly_rental": billing['monthly_rental'] if billing else 0,
            "unpaid_bills": billing['unpaid_bills'] if billing else 0,
            "last_payment_date": billing['last_payment_date'] if billing else None,
            "credit_limit": 5000.00,
            # History
            "billing_history": [dict(r) for r in history],
            "fault_tickets": [dict(r) for r in tickets],
        }
    except Exception as e:
        print(f"Customer search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/customers")
async def get_all_customers():
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.phone_number as user_id, c.phone_number, c.contact_number, c.registered_name as name, c.address, c.telephone_type as type, c.dp_loop,
                   n.status, n.line_state, n.tid, n.snr, n.attenuation, n.power_level, n.ont_type,
                   b.payment_status, b.total_due
            FROM customers c
            LEFT JOIN network_status n ON c.phone_number = n.phone_number
            LEFT JOIN billing b ON c.phone_number = b.phone_number
            LIMIT 200
        ''')
        rows = cursor.fetchall()
        conn.close()
        
        return {"customers": [dict(r) for r in rows]}
    except Exception as e:
        return {"error": str(e), "customers": []}

@router.get("/admin/usage/{phone_number}")
async def get_admin_usage(phone_number: str):
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.registered_name, c.address, d.package_name, d.total_data_gb, 
                   d.used_data_gb, d.remaining_data_gb, d.usage_status,
                   b.total_due, b.payment_status, b.nxc_balance
            FROM customers c
            LEFT JOIN data_usage d ON c.phone_number = d.phone_number
            LEFT JOIN billing b ON c.phone_number = b.phone_number
            WHERE c.phone_number = ?
        ''', (phone_number,))
        user_info = cursor.fetchone()
        
        if not user_info:
            conn.close()
            return {"error": "Phone number not found in dummy database"}
            
        cursor.execute('''
            SELECT log_date, google_gb, facebook_gb, youtube_gb, amazon_gb, tiktok_gb, total_gb
            FROM daily_usage_logs
            WHERE phone_number = ?
            ORDER BY log_date DESC
        ''', (phone_number,))
        logs = cursor.fetchall()
        
        cursor.execute('''
            SELECT month, year, amount_billed, amount_paid, arrears 
            FROM billing_history 
            WHERE phone_number = ? 
            ORDER BY id ASC
        ''', (phone_number,))
        history = cursor.fetchall()
        conn.close()
        
        return {
            "customer": dict(user_info),
            "logs": [dict(r) for r in logs],
            "billing_history": [dict(r) for r in history]
        }
    except Exception as e:
        return {"error": str(e)}

# --- TWILIO INTEGRATION ENDPOINTS ---

class SMSRequest(BaseModel):
    to_number: str
    message: str

class WhatsAppRequest(BaseModel):
    to_number: str
    message: str
    media_url: str = None

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "YOUR_TWILIO_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "YOUR_TWILIO_TOKEN")
# The user needs to update this with their Twilio phone number
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "+16402321133")

@router.post("/admin/send-sms")
def send_sms(request: SMSRequest):
    from twilio.rest import Client
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Ensure numbers have '+'
        to_num = request.to_number if request.to_number.startswith('+') else f"+{request.to_number}"
        
        message = client.messages.create(
            body=request.message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_num
        )
        return {"status": "success", "message_sid": message.sid, "details": "SMS queued successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.post("/admin/send-whatsapp")
def send_whatsapp(request: WhatsAppRequest):
    from twilio.rest import Client
    try:
        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
        
        # Format for WhatsApp
        to_num = request.to_number
        if to_num.startswith('07'):
            to_num = "+94" + to_num[1:]
            
        to_num = f"whatsapp:{to_num}" if not to_num.startswith('whatsapp:') else to_num
        if not to_num.startswith('whatsapp:+'):
            to_num = to_num.replace('whatsapp:', 'whatsapp:+')
            
        # Sandbox number is typically +14155238886, but it's best to let user set it if different
        from_num = f"whatsapp:{TWILIO_PHONE_NUMBER}"
        # If using the default test SMS number, override it with the default Twilio WhatsApp sandbox number
        if TWILIO_PHONE_NUMBER == "+16402321133":
            from_num = "whatsapp:+14155238886"
        
        kwargs = {
            "body": request.message,
            "from_": from_num,
            "to": to_num
        }
        if request.media_url:
            # If the media URL contains localhost (because the frontend sent it locally), 
            # replace it with the live AWS URL so Twilio can download it successfully.
            final_url = request.media_url
            if "localhost" in final_url or "127.0.0.1" in final_url:
                final_url = final_url.replace("http://localhost:3000", "https://slt-nexus-multi-ai-agent-project.vercel.app")
                final_url = final_url.replace("http://127.0.0.1:3000", "https://slt-nexus-multi-ai-agent-project.vercel.app")
            
            kwargs["media_url"] = [final_url]
            
        message = client.messages.create(**kwargs)
        return {"status": "success", "message_sid": message.sid, "details": "WhatsApp message queued successfully"}
    except Exception as e:
        error_msg = str(e)
        if "free trial" in error_msg.lower() or "unverified" in error_msg.lower():
            return {
                "status": "error", 
                "message": "Twilio Sandbox Error: The destination number is not verified. Please ask the user to send 'join length-far' to +14155238886 on WhatsApp first to join the sandbox."
            }
        return {"status": "error", "message": error_msg}


