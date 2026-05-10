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

# --- Endpoints ---

@router.get("/imaster/diagnostics/{device_id}", response_model=RouterStatus)
async def router_diagnostics(device_id: str):
    """Simulates Huawei/ZTE/iMaster NCE router diagnostics."""
    statuses = ["Online", "Offline", "Degraded"]
    los_lights = ["Green", "Red", "Off"]
    
    # Simulate a "Red LOS" issue for a specific device ID if needed, or random
    if "FAULT" in device_id.upper():
        return RouterStatus(
            device_id=device_id,
            status="Offline",
            los_light="Red",
            pon_light="Off",
            signal_strength=-35.5,
            firmware_version="V5.R19.C10.S120"
        )
    
    return RouterStatus(
        device_id=device_id,
        status=random.choice(statuses),
        los_light=random.choice(los_lights),
        pon_light="Green",
        signal_strength=random.uniform(-28.0, -15.0),
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
    """Simulates SLT Billing/Usage system."""
    # Special case requirement: 94112850850
    if phone_number == "94112850850":
        return UsageResponse(
            phone_number=phone_number,
            total_data="100 GB",
            used_data="99.9 GB",
            remaining_data="0.1 GB",
            status="Low Data Balance / Quota Exceeded"
        )
    
    return UsageResponse(
        phone_number=phone_number,
        total_data="200 GB",
        used_data="45 GB",
        remaining_data="155 GB",
        status="Active"
    )

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

def uuid_gen():
    import uuid
    return str(uuid.uuid4())[:8].upper()
