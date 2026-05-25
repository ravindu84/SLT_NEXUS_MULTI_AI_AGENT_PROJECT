import os
file_path = 'backend/mocks.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()
new_content = content.replace('"c:/SLT_NEXUS/backend/slt_dummy.db"', 'os.path.join(os.path.dirname(__file__), "slt_dummy.db")')
if 'import os' not in new_content:
    new_content = 'import os\n' + new_content
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
