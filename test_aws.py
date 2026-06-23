import requests

url = 'http://16.171.166.199:8000/api/chat_stream'
data = {'message': '0112895800', 'session_id': 'admin', 'is_admin': True}
try:
    r = requests.post(url, json=data, stream=True, timeout=20)
    print(r.text)
except Exception as e:
    print(e)
