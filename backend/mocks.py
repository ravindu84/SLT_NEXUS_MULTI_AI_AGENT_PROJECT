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
    
    assigned_tech = request.assigned_technician if request.assigned_technician else random.choice(technicians)
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO fault_tickets (ticket_id, phone_number, technician, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (ticket_id, request.phone_number, assigned_tech, "Assigned", datetime.now().isoformat()))
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
        
        # Query for Copper with Bad SNR (< 20) or Bad Attenuation (> 20)
        # OR Fiber with bad Power Level (< -25)
        # Exclude already DOWN/Fault lines to only get pre-emptive degradation
        
        query = """
            SELECT c.phone_number, c.registered_name, c.address, c.contact_number, 
                   n.line_state, n.power_level, n.snr, n.attenuation, n.clarity_path, c.telephone_type
            FROM customers c
            JOIN network_status n ON c.phone_number = n.phone_number
            WHERE n.status = 'UP' AND n.line_state != 'Fault' AND (
                (c.telephone_type = 'Copper' AND (CAST(n.snr AS REAL) < 20.0 OR CAST(n.attenuation AS REAL) > 20.0))
                OR
                (c.telephone_type = 'Fiber' AND CAST(n.power_level AS REAL) < -25.0)
            )
            LIMIT 20
        """
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
            billing_history.append({
                "month": h[0],
                "year": h[1],
                "amount_billed": h[2],
                "amount_paid": h[3],
                "arrears": h[4]
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
            return {"phone_number": phone_number, "daily_logs": logs}
    except Exception as e:
        print(f"Mock daily usage DB error: {e}")
        
    return {"phone_number": phone_number, "daily_logs": []}

@router.post("/payhere/checkout")
async def mock_payment(request: PaymentRequest):
    """Simulates PayHere payment gateway."""
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
    """Simulates sending a WFM integrated report via email."""
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

    # Simulating email dispatch
    print(f"=== EMAIL DISPATCH SYSTEM ===")
    print(f"Subject: {subject}")
    print(f"To: {', '.join(request.emails)}")
    print(f"Attachments: {filename} (Integrated with WFM/Clarity MCP)")
    print(f"Summary: {summary}")
    print(f"=============================")

    return {
        "status": "sent",
        "timestamp": timestamp,
        "subject": subject,
        "report_type": request.report_type,
        "emails_sent": request.emails,
        "summary": summary,
        "attachment": filename,
        "image_url": image_url
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
        
        # Generate new number: 0112800100 + count
        new_slt_number = f"011280{str(100 + count).zfill(4)}"
        connection_id = f"SLT-NC-{uuid_gen()}"
        
        cursor.execute('''
            INSERT INTO new_connections (connection_id, mobile_number, slt_number, package, payment_status, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (connection_id, request.mobile_number, new_slt_number, request.package_name, "Paid", "Pending Provisioning", datetime.now().isoformat()))
        
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

# --- ADMIN NOC DASHBOARD ENDPOINTS ---

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
        
        # We need data from customers, network_status, and data_usage
        cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone,))
        customer = cursor.fetchone()
        
        if not customer:
            conn.close()
            raise HTTPException(status_code=404, detail="Customer not found")
            
        cursor.execute("SELECT * FROM network_status WHERE phone_number = ?", (phone,))
        network = cursor.fetchone()
        
        cursor.execute("SELECT * FROM data_usage WHERE phone_number = ?", (phone,))
        usage = cursor.fetchone()
        
        conn.close()
        
        return {
            "user_id": customer['user_id'],
            "phone_number": customer['phone_number'],
            "name": customer['registered_name'],
            "status": network['status'] if network else 'Unknown',
            "speed_mbps": 200 if network and network['status'] == 'UP' else 0,
            "data_used_gb": usage['used_data_gb'] if usage else 0,
            "data_total_gb": usage['total_data_gb'] if usage else 0
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

async def get_admin_usage(phone_number: str):
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT c.registered_name, c.address, d.package_name, d.total_data_gb, 
                   d.used_data_gb, d.remaining_data_gb, d.usage_status
            FROM customers c
            LEFT JOIN data_usage d ON c.phone_number = d.phone_number
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
        conn.close()
        
        return {
            "customer": dict(user_info),
            "logs": [dict(r) for r in logs]
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
        to_num = f"whatsapp:{request.to_number}" if not request.to_number.startswith('whatsapp:') else request.to_number
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
        return {"status": "error", "message": str(e)}


