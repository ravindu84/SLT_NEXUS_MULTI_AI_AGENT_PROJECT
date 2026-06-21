import requests
import json
import time

API_URL = "http://16.171.166.199:8000"

def chat(is_admin, message, session_id):
    url = f"{API_URL}/api/chat"
    payload = {"message": message, "session_id": session_id, "is_admin": is_admin}
    print(f"\n[{session_id}] {'ADMIN' if is_admin else 'CUST'}: {message}")
    try:
        response = requests.post(url, json=payload, timeout=60)
        if response.status_code == 200:
            print(f"[{session_id}] AI: {response.json().get('response')}")
        else:
            print(f"[{session_id}] ERROR: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"[{session_id}] REQUEST FAILED: {str(e)}")

# Test Admin Workflow
print("--- TESTING ADMIN WORKFLOW ---")
admin_session = "admin_test_999"
chat(True, "Who is leaving the network?", admin_session)
time.sleep(2)
chat(True, "Why are they leaving?", admin_session)
time.sleep(2)
chat(True, "Send retention offers to them.", admin_session)
time.sleep(2)
chat(True, "Predict future faults on the network.", admin_session)
time.sleep(2)
chat(True, "Assign these predictive faults to technicians.", admin_session)
time.sleep(2)
chat(True, "Clear the active fault matrix.", admin_session)

# Test Customer Workflow
print("\n--- TESTING CUSTOMER WORKFLOW ---")
cust_session = "cust_test_999"
chat(False, "My name is Kamal Perera and my number is 0712345678", cust_session)
time.sleep(2)
chat(False, "What is my current data usage?", cust_session)
time.sleep(2)
chat(False, "I want to upgrade my package to a new gaming plan.", cust_session)

print("\nAll tests completed.")

