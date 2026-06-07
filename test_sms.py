import requests

response = requests.post(
    "http://localhost:8000/mocks/admin/send-sms",
    json={"to_number": "+94718683925", "message": "Hello from SLT NEXUS AI. This is a test SMS."}
)
print(response.json())
