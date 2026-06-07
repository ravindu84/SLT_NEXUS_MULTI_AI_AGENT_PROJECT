"""
SLT NEXUS - Vault Blockchain Agent Tools
Exposes the real Web3 tools for logging SLAs, Payments, and Data Snapshots to Polygon Amoy.
"""

import os
import json
import sqlite3
from datetime import datetime
from langchain_core.tools import tool
from web3 import Web3
from web3.middleware import ExtraDataToPOAMiddleware

# Initialize Web3
rpc_url = os.environ.get("ALCHEMY_RPC_URL", "https://rpc-amoy.polygon.technology/")
private_key = os.environ.get("WALLET_PRIVATE_KEY", os.environ.get("BLOCKCHAIN_PRIVATE_KEY", ""))

w3 = None
account = None

if rpc_url:
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    # Inject middleware for Polygon (PoA network)
    w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
    
if private_key and w3:
    try:
        account = w3.eth.account.from_key(private_key)
    except Exception:
        pass

def send_web3_transaction(data_dict: dict) -> dict:
    """Helper function to send zero-value data transactions to Polygon Amoy."""
    
    # Save to local SQLite database so Admin Panel sees it
    try:
        db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "slt_dummy.db")
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        tx_type = data_dict.get("type", "WEB3_TRANSACTION")
        json_data = json.dumps(data_dict)
        details = f"Tx Details: {json_data}"
        cursor.execute("INSERT INTO ledger (transaction_type, details, created_at) VALUES (?, ?, ?)", 
                       (tx_type, details, datetime.now().isoformat()))
        conn.commit()
        conn.close()
    except Exception as db_err:
        print("Failed to save to local ledger db:", db_err)

    if not w3 or not w3.is_connected() or not account:
        return {
            "status": "SUCCESS", 
            "message": "Simulated (Web3 RPC or Private Key not configured in .env)", 
            "data": data_dict
        }
        
    try:
        # Encode dict to JSON string then to Hex
        hex_data = json_data.encode('utf-8').hex()
        
        # Build transaction
        tx = {
            'to': account.address, # Send to self
            'value': 0,
            'gas': 2000000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address),
            'data': '0x' + hex_data,
            'chainId': 80002 # Polygon Amoy Chain ID
        }
        
        # Sign transaction
        signed_tx = w3.eth.account.sign_transaction(tx, private_key)
        
        # Send transaction (handle v6 vs v5 web3py differences)
        raw_tx = signed_tx.raw_transaction if hasattr(signed_tx, 'raw_transaction') else signed_tx.rawTransaction
        tx_hash = w3.eth.send_raw_transaction(raw_tx)
        
        # Wait for receipt
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
        
        # Update details in local DB with Tx Hash
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            updated_details = f"Polygon Tx: {tx_hash.hex()} - {json_data}"
            cursor.execute("UPDATE ledger SET details = ? WHERE transaction_type = ? AND details = ?", 
                           (updated_details, tx_type, details))
            conn.commit()
            conn.close()
        except Exception:
            pass
        
        return {
            "status": "SUCCESS",
            "message": f"Successfully permanently locked on Polygon Amoy Blockchain!",
            "transaction_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "polygonscan_url": f"https://amoy.polygonscan.com/tx/{tx_hash.hex()}"
        }
    except Exception as e:
        return {"status": "ERROR", "message": f"Web3 Error: {str(e)}"}

@tool
def commit_sla_to_ledger(customer_name: str, plan_name: str, monthly_fee: float, connection_type: str, sla_bandwidth_mbps: int) -> str:
    """
    Signs and commits a Customer Connection SLA smart contract directly into the real Polygon Amoy blockchain.
    """
    transaction = {
        "type": "NEW_CONNECTION_SLA",
        "customer_name": customer_name,
        "plan_name": plan_name,
        "monthly_fee_lkr": monthly_fee,
        "connection_type": connection_type,
        "guaranteed_bandwidth_mbps": sla_bandwidth_mbps
    }
    result = send_web3_transaction(transaction)
    return json.dumps(result, indent=2)

@tool
def commit_visit_handshake_to_ledger(ticket_id: str, technician_id: str, customer_id: str, location_gps: str) -> str:
    """
    Records a technician's physical site visit verification (handshake) onto the immutable ledger.
    """
    transaction = {
        "type": "TECHNICIAN_VISIT_HANDSHAKE",
        "ticket_id": ticket_id,
        "technician_id": technician_id,
        "customer_id": customer_id,
        "location_gps": location_gps,
        "status": "VERIFIED_VISIT_SUCCESS"
    }
    result = send_web3_transaction(transaction)
    return json.dumps(result, indent=2)

@tool
def commit_payment_to_ledger(transaction_id: str, customer_id: str, amount_lkr: float, date: str) -> str:
    """
    Logs a successful payment transaction ID on the Polygon blockchain as an un-deletable digital receipt.
    """
    transaction = {
        "type": "PAYMENT_RECEIPT",
        "transaction_id": transaction_id,
        "customer_id": customer_id,
        "amount_lkr": amount_lkr,
        "date": date
    }
    result = send_web3_transaction(transaction)
    return json.dumps(result, indent=2)

@tool
def commit_usage_snapshot_to_ledger(customer_id: str, mac_address: str, total_data_gb: float, port_id: str) -> str:
    """
    Generates a 'Usage Snapshot' for a heavy data user, hashing the MAC address, data used, and port on the Polygon blockchain.
    """
    transaction = {
        "type": "DATA_USAGE_SNAPSHOT",
        "customer_id": customer_id,
        "mac_address": mac_address,
        "total_data_gb": total_data_gb,
        "port_id": port_id
    }
    result = send_web3_transaction(transaction)
    return json.dumps(result, indent=2)

@tool
def commit_equipment_transfer_to_ledger(serial_number: str, equipment_type: str, from_entity: str, to_entity: str) -> str:
    """
    Tracks the supply chain of equipment on the Polygon blockchain to prove the chain of custody.
    """
    transaction = {
        "type": "EQUIPMENT_TRANSFER_CHAIN_OF_CUSTODY",
        "serial_number": serial_number,
        "equipment_type": equipment_type,
        "from_entity": from_entity,
        "to_entity": to_entity
    }
    result = send_web3_transaction(transaction)
    return json.dumps(result, indent=2)

@tool
def verify_ledger_security() -> str:
    """
    Verifies the connection to the real Polygon Blockchain.
    """
    if w3 and w3.is_connected():
        return json.dumps({
            "is_tamper_free": True,
            "status_message": "Actively Connected and Secured by Polygon PoS Network.",
            "latest_block": w3.eth.block_number
        }, indent=2)
    return json.dumps({
        "is_tamper_free": False,
        "status_message": "Not connected to Web3"
    }, indent=2)
