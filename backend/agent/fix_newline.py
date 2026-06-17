import os

file_path = 'C:/SLT_NEXUS/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix literal newlines in f-strings
content = content.replace("!\n\"", "!\\n\"")
content = content.replace("action.\n\"", "action.\\n\"")
content = content.replace("Name.\n\"", "Name.\\n\"")
content = content.replace("මමා').\n\"", "මමා').\\n\"")
content = content.replace("tool.\n\"", "tool.\\n\"")
content = content.replace("automatically.\n\"", "automatically.\\n\"")
content = content.replace("hash.\n\"", "hash.\\n\"")
content = content.replace("කළා!'\n\"", "කළා!'\\n\"")
content = content.replace("තියෙනවා').\n\"", "තියෙනවා').\\n\"")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed newlines in main.py")
