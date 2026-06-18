import sys
import re

file_path = r"C:\SLT_NEXUS\backend\agent\graph.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Import the new tools
old_imports = """    finalize_new_connection,
    resolve_fault_admin
)"""

new_imports = """    finalize_new_connection,
    resolve_fault_admin,
    get_churn_reasons,
    resolve_all_churn_risk
)"""

if old_imports in content:
    content = content.replace(old_imports, new_imports)
else:
    print("Could not find imports in graph.py")

# 2. Add them to oracle_agent tools
old_oracle = "elif agent_name == \"oracle_agent\":\n        agent_tools = [generate_predictive_faults, clear_predictive_faults, auto_dispatch_technicians_by_area, generate_daily_faults, resolve_all_faults_admin, resolve_major_outage, generate_churn_predictions, resolve_churn_risk, dispatch_technician_admin, finalize_admin_approval, resolve_fault_admin]"

new_oracle = "elif agent_name == \"oracle_agent\":\n        agent_tools = [generate_predictive_faults, clear_predictive_faults, auto_dispatch_technicians_by_area, generate_daily_faults, resolve_all_faults_admin, resolve_major_outage, generate_churn_predictions, resolve_churn_risk, dispatch_technician_admin, finalize_admin_approval, resolve_fault_admin, get_churn_reasons, resolve_all_churn_risk]"

if old_oracle in content:
    content = content.replace(old_oracle, new_oracle)
else:
    print("Could not find oracle_agent in graph.py")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("graph.py patched successfully!")
