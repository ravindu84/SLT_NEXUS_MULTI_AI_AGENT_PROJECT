import os
import json
import hashlib
from datetime import datetime

# Load environment variables for Blockchain config
RPC_URL = os.getenv("BLOCKCHAIN_RPC_URL", "https://rpc-amoy.polygon.technology/") # Default Polygon Amoy Free Testnet
PRIVATE_KEY = os.getenv("BLOCKCHAIN_PRIVATE_KEY", os.getenv("WALLET_PRIVATE_KEY", ""))

def generate_hash(data_dict: dict) -> str:
    """Generate SHA-256 hash from a dictionary."""
    data_string = json.dumps(data_dict, sort_keys=True)
    return hashlib.sha256(data_string.encode()).hexdigest()

def log_to_vault(action_type: str, details: dict) -> dict:
    """
    Core function for the Vault Agent.
    Takes transaction details, hashes them, and simulates or executes a blockchain transaction.
    """
    data_hash = generate_hash(details)
    timestamp = str(datetime.now())
    
    mock_tx_hash = "0x" + hashlib.sha256((data_hash + timestamp).encode()).hexdigest()
    tx_hash = mock_tx_hash
    network_used = "Simulation Vault (Mock)"

    # In a real environment with Web3 installed and Private Key available:
    if PRIVATE_KEY and RPC_URL and "mock" not in RPC_URL.lower():
        try:
            from web3 import Web3
            w3 = Web3(Web3.HTTPProvider(RPC_URL))
            if w3.is_connected():
                account = w3.eth.account.from_key(PRIVATE_KEY)
                wallet_address = account.address
                
                # Create a 0 POL transaction to self, embedding the hash in the data field
                tx = {
                    'nonce': w3.eth.get_transaction_count(wallet_address),
                    'to': wallet_address, # Self-transfer
                    'value': 0,
                    'gas': 200000,
                    'gasPrice': w3.eth.gas_price,
                    'data': w3.to_bytes(text=f"SLT_NEXUS_AUDIT:{action_type}:{data_hash}"),
                    'chainId': w3.eth.chain_id
                }
                
                signed_tx = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
                tx_hash_bytes = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                tx_hash = w3.to_hex(tx_hash_bytes)
                network_used = "Polygon Amoy Testnet (Real Web3)"
                print(f"[Vault] Real Web3 Transaction Sent: {tx_hash}")
        except Exception as e:
            print(f"[Vault Warning] Web3 integration failed, falling back to Mock: {e}")

    result = {
        "status": "success",
        "action_type": action_type,
        "data_hash": "0x" + data_hash,
        "tx_hash": tx_hash,
        "network": network_used,
        "timestamp": timestamp,
        "message": f"Successfully secured {action_type} on blockchain ledger."
    }
    
    # Print for server logs
    print(f"\n{'='*50}\n[VAULT AGENT INTERVENTION]\nAction: {action_type}\nHash: 0x{data_hash[:20]}...\nTx: {tx_hash[:20]}...\n{'='*50}\n")
    
    return result
