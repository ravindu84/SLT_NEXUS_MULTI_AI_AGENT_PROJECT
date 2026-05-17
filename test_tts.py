import httpx

r = httpx.post(
    'http://127.0.0.1:8000/tts',
    json={'text': 'ආයුබෝවන්! මම LIYA. ඔබට මොනවද උදව් කරන්න පුලුවන්?', 'lang': 'si'},
    timeout=30
)
print(f'Status: {r.status_code}')
print(f'Size: {len(r.content)} bytes')
print(f'Type: {r.headers.get("content-type", "unknown")}')
if r.status_code != 200:
    print(f'Error: {r.text[:500]}')
else:
    print('SUCCESS - Sinhala voice generated!')
