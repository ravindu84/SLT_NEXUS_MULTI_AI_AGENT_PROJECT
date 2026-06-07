import json
import sys
import os

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join('/app/backend', '.env'), override=True)
    from backend.agent.tools.vault import send_web3_transaction
    
    transaction = {
        "type": "PAYMENT_RECEIPT",
        "transaction_id": "TX-TEST1234",
        "customer_id": "0112895823",
        "amount_lkr": 1500.0,
        "date": "2026-06-04 18:40:15"
    }
    
    res = send_web3_transaction(transaction)
    print("VAULT RESULT:", json.dumps(res, indent=2))
except Exception as e:
    print("CRITICAL ERROR:", str(e))
