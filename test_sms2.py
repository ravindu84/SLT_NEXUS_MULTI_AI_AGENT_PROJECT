import requests

response = requests.post(
    "http://localhost:8000/mocks/admin/send-sms",
    json={"to_number": "+94718683925", "message": "Test"}
)
print(response.status_code)
print(response.text)
