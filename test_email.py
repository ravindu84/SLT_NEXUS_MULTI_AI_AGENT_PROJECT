import requests

response = requests.post(
    "http://localhost:8000/mocks/report/email",
    json={"emails": ["aravindaslt@gmail.com"], "report_type": "afternoon"}
)
print(response.status_code)
print(response.text)
