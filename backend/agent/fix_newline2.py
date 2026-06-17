import re

file_path = 'C:/SLT_NEXUS/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Let's find the exact block and replace all literal newlines with "\\n"
# Actually, the simplest way is to find lines that end with a single quote or double quote but have a newline before it.
# Let's just fix the whole string by using regex
lines = content.split('\n')
for i, line in enumerate(lines):
    if line.strip() == '"' or line.strip() == 'f"':
        pass

# I'll just remove all lines that only contain a double quote `"` and append `\n"` to the previous line!
new_lines = []
for i, line in enumerate(lines):
    if line.strip() == '"':
        new_lines[-1] += '\\n"'
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(new_lines))
    
print("Fixed newlines by merging standalone quote lines.")
