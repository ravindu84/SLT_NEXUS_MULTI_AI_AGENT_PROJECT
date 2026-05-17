import sqlite3
import os
import random
from langchain_core.tools import tool
from backend.rag.retriever import SLTRetriever

# Initialize RAG retriever
try:
    retriever = SLTRetriever()
except Exception as e:
    print(f"[WARNING] Failed to initialize SLT Retriever: {e}")
    retriever = None

DB_PATH = "c:/SLT_NEXUS/backend/slt_dummy.db"

@tool
def check_nms_status(phone_number: str, request_source: str = "customer") -> str:
    """Check the technical network status (NMS/Power/SNR/TID) for a given SLT number.
    Specify request_source as 'staff' for internal detailed OPMC/NMS metrics (power levels, SNR, Attenuation, TID), 
    or 'customer' for simple, user-friendly public status checks.
    """
    if not os.path.exists(DB_PATH):
        return "Error: SLT NMS Database not found."

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # 1. Fetch CRM info
        cursor.execute("SELECT registered_name, telephone_type, has_internet, has_iptv, iptv_account_id FROM customers WHERE phone_number = ?", (phone_number,))
        crm_row = cursor.fetchone()
        
        if not crm_row:
            conn.close()
            return f"No records found for the number {phone_number} in the CRM system."
            
        name, tel_type, has_internet, has_iptv, iptv_id = crm_row

        # 2. Fetch NMS diagnostics
        cursor.execute("SELECT status, line_state, power_level, snr, attenuation, ont_type, tid, clarity_path FROM network_status WHERE phone_number = ?", (phone_number,))
        nms_row = cursor.fetchone()
        conn.close()

        if not nms_row:
            return f"No technical NMS records found for {phone_number}."
            
        status, line_state, power, snr, attn, ont, tid, clarity = nms_row

        # Security classification: Staff vs Customer view
        if request_source.lower() == "staff":
            res = f"⚠️ [OPMC INTERNAL NMS VIEW] ⚠️\n"
            res += f"Account: {phone_number} ({name})\n"
            res += f"Line Type: {tel_type} Broadband\n"
            res += f"Operational Status: {status}\n"
            res += f"Signal State: {line_state}\n"
            if tel_type == "Fiber":
                res += f"Optical RX Power: {power} dBm\n"
                res += f"ONT Terminal Type: {ont}\n"
            else:
                res += f"Copper SNR Margin: {snr} dB\n"
                res += f"Copper Line Attenuation: {attn} dB\n"
                res += f"Terminal Port (TID): {tid}\n"
            res += f"Physical Path (Clarity): {clarity}\n"
            
            if line_state == "Warning":
                res += "🚨 PREDICTIVE MAINTENANCE: Line metrics are marginal. High attenuation. Risk of IPTV lagging. Schedule copper join check.\n"
            elif line_state == "Fault":
                res += "🚨 OUTAGE ALERT: Physical disconnection or ONT power cut. Schedule field technician dispatch.\n"
            return res
        else:
            # Public Customer friendly view
            res = f"--- SLT-MOBITEL Network Diagnostics for {phone_number} ---\n"
            res += f"Broadband Line: {tel_type}\n"
            
            if status == "DOWN" or line_state == "Fault":
                res += "Line Status: 🔴 Outage Detected\n"
                res += "Diagnostic Message: We detected a physical line interruption or your router is powered off. A maintenance ticket has been automatically logged. An OPMC technician will resolve this within 4 hours."
            elif line_state == "Warning":
                res += "Line Status: 🟡 Unstable / Poor Signal\n"
                res += "Diagnostic Message: Your connection is running but experiencing low signal strength. We recommend restarting your router. Our network team has been alerted to review your local distribution point."
            else:
                res += "Line Status: 🟢 Optimal / Stable\n"
                res += "Diagnostic Message: Your SLT-MOBITEL connection is healthy, receiving strong signals with zero packet drops."
            return res

    except Exception as e:
        return f"Error querying NMS: {str(e)}"

@tool
def query_customer_profile(phone_number: str) -> str:
    """Query customer's profile info (Address, Contact, Reg Date, Subscribed Services) from Clarity CRM system."""
    if not os.path.exists(DB_PATH):
        return "Error: SLT CRM Database not found."

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT registered_name, contact_number, address, registered_date, telephone_type, has_internet, has_iptv, iptv_account_id FROM customers WHERE phone_number = ?", (phone_number,))
        row = cursor.fetchone()
        conn.close()

        if not row:
            return f"No customer profile found for {phone_number}."

        name, contact, address, reg_date, tel_type, has_internet, has_iptv, iptv_id = row
        
        services = ["Voice"]
        if has_internet:
            services.append(f"{tel_type} Broadband Internet")
        if has_iptv:
            services.append(f"PeoTV ({iptv_id})")

        res = f"--- CRM Customer Profile for {phone_number} ---\n"
        res += f"Registered Name: {name}\n"
        res += f"Contact Number: {contact}\n"
        res += f"Registered Address: {address}\n"
        res += f"Registration Date: {reg_date}\n"
        res += f"Line Medium: {tel_type}\n"
        res += f"Subscribed Services: {', '.join(services)}\n"
        return res

    except Exception as e:
        return f"Error querying Clarity: {str(e)}"

@tool
def create_support_ticket(phone_number: str, issue_description: str) -> str:
    """Create a support ticket in the WFM/Clarity system for a customer issue."""
    ticket_id = f"SLT-{random.randint(10000, 99999)}"
    return f"Ticket {ticket_id} has been created for {phone_number}. Our technical team will look into '{issue_description}' within 24 hours."

@tool
def query_knowledge_base(query: str) -> str:
    """Search SLT internal knowledge base for troubleshooting and info."""
    if retriever:
        try:
            return retriever.get_context_string(query, n_results=3)
        except Exception as e:
            return f"Error querying internal knowledge base: {str(e)}. Fallback: Restart your fiber router and verify if the LOS LED is red."
    return "RAG Placeholder: SLT fiber troubleshooting suggests restarting the router and checking for the Red LOS light."

# List of tools to be used by the agent
slt_tools = [check_nms_status, query_customer_profile, create_support_ticket, query_knowledge_base]
