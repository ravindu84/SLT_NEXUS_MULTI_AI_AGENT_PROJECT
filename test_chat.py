import requests
import json

url = "http://16.171.166.199:8000/api/chat"
payload = {
    "session_id": "test-session-123",
    "message": "mage phone number eka 0112895823. man 1500k gewwa",
    "agent_type": "manager"
}
response = requests.post(url, json=payload)
print(json.dumps(response.json(), indent=2))
