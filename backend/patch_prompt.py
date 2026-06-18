import re

file_path = r"C:\SLT_NEXUS\backend\agent\prompts.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace the wrong tool name with generate_predictive_faults
old_line = "Use `get_predictive_degradation_report` to generate a full report of all currently degrading lines across the network for the staff."
new_line = "Use `generate_predictive_faults` to generate a full report of all currently degrading lines across the network for the staff."

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("prompts.py updated successfully!")
else:
    print("Could not find the old line in prompts.py. Maybe it's already updated or slightly different.")
