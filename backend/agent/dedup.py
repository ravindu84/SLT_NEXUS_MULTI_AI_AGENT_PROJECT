import re

file_path = "C:/SLT_NEXUS/backend/agent/tools/mcp_tools.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Split by @tool
parts = content.split("@tool\n")
header = parts[0]
tools = parts[1:]

seen_funcs = set()
unique_tools = []

for tool in tools:
    # Find the function name
    match = re.search(r"async def (\w+)|def (\w+)", tool)
    if match:
        func_name = match.group(1) or match.group(2)
        if func_name not in seen_funcs:
            seen_funcs.add(func_name)
            unique_tools.append(tool)
    else:
        # Just append if no function name found
        unique_tools.append(tool)

new_content = header + "@tool\n" + "\n@tool\n".join(unique_tools)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Deduplication complete. Kept {len(unique_tools)} tools.")
