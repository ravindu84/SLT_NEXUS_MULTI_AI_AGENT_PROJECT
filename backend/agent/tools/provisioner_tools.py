import sqlite3
import json
from langchain_core.tools import tool
import random
from backend.blockchain.web3_client import log_to_vault

DB_PATH = "c:/SLT_NEXUS/backend/slt_dummy.db"

@tool
def allocate_fiber_dp_loop(gps_location: str) -> str:
    """
    Automates the Technical Distribution Point (DP) and Loop allocation for a new fiber connection.
    Finds an available Loop in the nearest DP (HO-DGK-0520-XXX). 
    If a DP reaches its maximum capacity (8 loops), it automatically shifts to the next DP.
    """
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Ensure table exists (safeguard)
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS fiber_dps (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                dp_name TEXT NOT NULL UNIQUE,
                loops_used INTEGER DEFAULT 0,
                max_loops INTEGER DEFAULT 8
            )
        ''')
        
        # Check if table is empty
        cursor.execute("SELECT COUNT(*) FROM fiber_dps")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO fiber_dps (dp_name, loops_used, max_loops) VALUES ('HO-DGK-0520-001', 0, 8)")
            conn.commit()

        # Find the first available DP (loops_used < max_loops)
        cursor.execute("SELECT id, dp_name, loops_used, max_loops FROM fiber_dps WHERE loops_used < max_loops ORDER BY id ASC LIMIT 1")
        available_dp = cursor.fetchone()

        if not available_dp:
            # All existing DPs are full! Create a new one.
            cursor.execute("SELECT dp_name FROM fiber_dps ORDER BY id DESC LIMIT 1")
            last_dp_name = cursor.fetchone()[0]
            # Extract the last 3 digits, e.g., '001' from 'HO-DGK-0520-001'
            last_dp_num = int(last_dp_name.split("-")[-1])
            new_dp_num = str(last_dp_num + 1).zfill(3)
            new_dp_name = f"HO-DGK-0520-{new_dp_num}"
            
            cursor.execute("INSERT INTO fiber_dps (dp_name, loops_used, max_loops) VALUES (?, 0, 8)", (new_dp_name,))
            conn.commit()
            
            # Fetch the newly created DP
            cursor.execute("SELECT id, dp_name, loops_used, max_loops FROM fiber_dps WHERE dp_name = ?", (new_dp_name,))
            available_dp = cursor.fetchone()

        dp_id, dp_name, loops_used, max_loops = available_dp
        
        # Allocate the next loop (e.g. if 0 used, next loop is 01)
        next_loop = loops_used + 1
        allocated_port = f"{dp_name}-{str(next_loop).zfill(2)}"
        
        # Update the DP capacity
        cursor.execute("UPDATE fiber_dps SET loops_used = ? WHERE id = ?", (next_loop, dp_id))
        conn.commit()
        conn.close()
        
        # Vault Integration 3: Resources Allocated
        vault_res = log_to_vault("RESOURCES_ALLOCATED", {"dp_loop": allocated_port, "dp_name": dp_name})
        
        result = {
            "status": "SUCCESS",
            "message": f"Fiber Distribution Point (DP) and Loop successfully allocated. [VAULT SECURED RESOURCES: {vault_res['tx_hash'][:15]}...]",
            "allocated_port": allocated_port,
            "dp_capacity_remaining": max_loops - next_loop,
            "vault_receipt": vault_res["tx_hash"]
        }
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"status": "ERROR", "message": str(e)})


@tool
def dispatch_installation_job(customer_name: str, phone_number: str, package_name: str, allocated_port: str, gps_location: str) -> str:
    """
    Dispatches the New Connection job to the Workforce Management System (WFM) for a Contractor/Technician.
    This triggers the physical deployment of the router, ONT, and STB.
    """
    # In a real system, this pushes to the NMS/WFM database.
    # For our simulation, we assign a dummy contractor and return success.
    
    contractors = ["VisionCom Contractors", "SLT Regional Team Alpha", "TechConnect Lanka"]
    assigned_contractor = random.choice(contractors)
    
    # Vault Integration 4: Final Handshake/Dispatch
    vault_res = log_to_vault("CONNECTION_ACTIVATED_OK", {"customer": customer_name, "contractor": assigned_contractor, "port": allocated_port})
    
    result = {
        "status": "SUCCESS",
        "job_id": f"JOB-NEWCON-{random.randint(10000, 99999)}",
        "action": f"Dispatched to Field Team. [VAULT VERIFIED & LOCKED: {vault_res['tx_hash'][:15]}...]",
        "assigned_contractor": assigned_contractor,
        "equipment_issued": ["ZTE F660 ONT", "ZTE ZXV10 B866V2 STB", "Patch Cord"],
        "customer": customer_name,
        "contact": phone_number,
        "package": package_name,
        "port_assignment": allocated_port,
        "location": gps_location,
        "vault_receipt": vault_res["tx_hash"]
    }
    
    return json.dumps(result, indent=2)
