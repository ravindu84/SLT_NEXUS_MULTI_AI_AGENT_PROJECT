import os

file_path = 'C:/SLT_NEXUS/backend/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i in range(len(lines)):
    line = lines[i]
    if line == '\\n"\n' or line == '\\n"':
        # It's a broken literal newline. We need to append it properly to the previous line!
        if len(new_lines) > 0:
            new_lines[-1] = new_lines[-1].rstrip('\n') + '\\n\\n"\n'
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Fixed yield newlines.")
