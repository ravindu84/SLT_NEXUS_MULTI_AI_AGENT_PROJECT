from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
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

# --- Endpoints ---

@router.get("/imaster/diagnostics/{device_id}", response_model=RouterStatus)
async def router_diagnostics(device_id: str):
    """Simulates Huawei/ZTE/iMaster NCE router diagnostics by pulling live NMS signal values from database."""
    import sqlite3
    DB_PATH = "c:/SLT_NEXUS/backend/slt_dummy.db"
    
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

@router.post("/wfm/ticket", response_model=TicketResponse)
async def create_fault_ticket(request: TicketRequest):
    """Simulates WFM/Clarity fault ticketing."""
    ticket_id = f"SLT-FT-{random.randint(100000, 999999)}"
    technicians = ["Kusal Perera", "Angelo Mathews", "Wanindu Hasaranga", "Dimuth Karunaratne"]
    
    return TicketResponse(
        ticket_id=ticket_id,
        status="Assigned",
        assigned_technician=random.choice(technicians),
        estimated_resolution="4 Hours"
    )

@router.get("/billing/usage/{phone_number}", response_model=UsageResponse)
async def get_usage(phone_number: str):
    """Simulates SLT Billing/Usage system by querying live data_usage and billing tables."""
    import sqlite3
    DB_PATH = "c:/SLT_NEXUS/backend/slt_dummy.db"
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT total_data_gb, used_data_gb, remaining_data_gb, usage_status FROM data_usage WHERE phone_number = ?", (phone_number,))
        row = cursor.fetchone()
        
        # Check total dues too
        cursor.execute("SELECT total_due, payment_status FROM billing WHERE phone_number = ?", (phone_number,))
        bill_row = cursor.fetchone()
        conn.close()
        
        if row:
            total, used, remaining, status = row
            due_str = f"LKR {bill_row[0]:.2f}" if bill_row else "LKR 0.00"
            pay_status = bill_row[1] if bill_row else "Paid"
            
            return UsageResponse(
                phone_number=phone_number,
                total_data=f"{total} GB",
                used_data=f"{used} GB",
                remaining_data=f"{remaining} GB",
                status=f"Quota: {status} | Bills: {pay_status} (Due: {due_str})"
            )
    except Exception as e:
        print(f"Mock usage DB error: {e}")

    return UsageResponse(
        phone_number=phone_number,
        total_data="300 GB",
        used_data="45 GB",
        remaining_data="255 GB",
        status="Active"
    )

@router.get("/billing/daily-usage/{phone_number}")
async def get_daily_usage(phone_number: str):
    """Simulates daily usage logs query to see daily GB and site consumption."""
    import sqlite3
    DB_PATH = "c:/SLT_NEXUS/backend/slt_dummy.db"
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT log_date, facebook_gb, google_gb, youtube_gb, yahoo_gb, aws_gb, total_gb "
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
                    "yahoo_gb": r[4],
                    "aws_gb": r[5],
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
    
    # Custom details for each report type based on WFM integration
    if request.report_type == "morning":
        subject = "SLT NEXUS - Daily Morning Fault & Attendance Report [08:00 AM]"
        summary = "NMS diagnostics completed. 8 active alarms detected. Customer registration counter: 200 accounts active."
    elif request.report_type == "afternoon":
        subject = "SLT NEXUS - Afternoon NMS Signal & Attenuation Degradation Report [01:00 PM]"
        summary = "Predictive maintenance flags: 3 Fiber lines show marginal power degradation (> -25.5 dBm). Tickets dispatched to technicians."
    else: # evening
        subject = "SLT NEXUS - WFM Closed Tickets & Evening Shifts Allocation Report [06:00 PM]"
        summary = (
            "WFM integration completed successfully. Evening shift rosters allocated. "
            "Team allocations fetched from evening report assets. Closed 4 active line outages. "
            "Outstanding payments updated in billing table."
        )

    # Simulating email dispatch
    print(f"=== EMAIL DISPATCH SYSTEM ===")
    print(f"Subject: {subject}")
    print(f"To: {', '.join(request.emails)}")
    print(f"Attachments: report_{request.report_type}.png (Integrated with WFM/Clarity MCP)")
    print(f"Summary: {summary}")
    print(f"=============================")

    return {
        "status": "sent",
        "timestamp": timestamp,
        "subject": subject,
        "report_type": request.report_type,
        "emails_sent": request.emails,
        "summary": summary,
        "attachment": f"report_{request.report_type}.png"
    }

def uuid_gen():
    import uuid
    return str(uuid.uuid4())[:8].upper()
