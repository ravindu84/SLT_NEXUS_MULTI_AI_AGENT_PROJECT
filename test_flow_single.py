import requests
import json
import time

url = 'http://16.171.166.199:8000/api/chat_stream'
session_id = 'test_admin_session_2'

def send_msg(msg):
    data = {'message': msg, 'session_id': session_id, 'is_admin': True}
    print(f"\nUser: {msg}")
    try:
        r = requests.post(url, json=data, stream=True, timeout=20)
        print("Bot: ", end='')
        for line in r.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data: '):
                    content = line[6:]
                    if content == '[DONE]':
                        break
                    try:
                        obj = json.loads(content)
                        if 'text' in obj:
                            print(obj['text'], end='')
                        elif 'error' in obj:
                            print(f"\n[ERROR] {obj['error']}", end='')
                    except:
                        print(content, end='')
        print("\n")
    except Exception as e:
        print(f"Request failed: {e}")

send_msg("tid dp loop 0112895800")
