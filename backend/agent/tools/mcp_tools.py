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
async def create_fault_ticket(phone_number: str, issue_type: str, description: str):
    """Creates a fault ticket in the WFM system and dispatches a technician."""
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/wfm/ticket",
            json={"phone_number": phone_number, "issue_type": issue_type, "description": description}
        )
        return response.json()

@tool
async def get_data_usage(phone_number: str):
    """Fetches real-time data usage and balance from the SLT Billing system."""
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
    """Sends the designated corporate report (morning, afternoon, or evening) to the specified list of 5 email addresses.
    Use this when a staff member or officer asks to email, send, or dispatch a daily report.
    report_type must be one of: 'morning', 'afternoon', 'evening'.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MOCK_BASE_URL}/report/email",
            json={"emails": emails, "report_type": report_type}
        )
        return response.json()
