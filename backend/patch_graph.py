import sys
import re

file_path = r"C:\SLT_NEXUS\backend\agent\graph.py"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Refactor the `llm = get_llm().bind_tools(tools)` to be dynamic based on the agent
target = "llm = get_llm().bind_tools(tools)"

replacement = """    # Dynamic Tool Binding to Reduce Latency and Token Overhead
    agent_tools = []
    if agent_name == "spark_agent":
        agent_tools = [package_advisor, record_new_connection, process_package_payment]
    elif agent_name == "pulse_agent":
        agent_tools = [check_router_health, create_fault_ticket, self_fix_internet, simulate_customer_app_fault]
    elif agent_name == "insight_agent":
        agent_tools = [get_data_usage, get_billing_info, get_daily_usage_logs, pay_slt_bill]
    elif agent_name == "guardian_agent":
        agent_tools = [scam_shield]
    elif agent_name == "pathfinder_agent":
        agent_tools = [request_report_email, request_report_whatsapp, get_technician_diagnostics, get_active_fault_tickets, get_predictive_degradation_report, get_technician_status]
    elif agent_name == "provisioner_agent":
        agent_tools = [allocate_fiber_dp_loop, dispatch_installation_job, check_area_outages, get_full_customer_profile, check_kyc_status, finalize_new_connection]
    elif agent_name == "vault_agent":
        agent_tools = [commit_sla_to_ledger, commit_visit_handshake_to_ledger, verify_ledger_security, commit_payment_to_ledger, commit_usage_snapshot_to_ledger, commit_equipment_transfer_to_ledger]
    elif agent_name == "oracle_agent":
        agent_tools = [generate_predictive_faults, clear_predictive_faults, auto_dispatch_technicians_by_area, generate_daily_faults, resolve_all_faults_admin, resolve_major_outage, generate_churn_predictions, resolve_churn_risk, dispatch_technician_admin, finalize_admin_approval, resolve_fault_admin]
    elif agent_name == "messenger_agent":
        agent_tools = [send_sms_notification, send_whatsapp_notification]
    elif agent_name == "analyzer_agent":
        agent_tools = [search_slt_knowledgebase]
    
    if len(agent_tools) > 0:
        llm = get_llm().bind_tools(agent_tools)
    else:
        llm = get_llm() # Fast path without tools for liya_agent or unknown agents
"""

if target in content:
    content = content.replace(target, replacement)
    
    # Also fix the Sinhala prompting issue in the same script for `backend/agent/graph.py`
    old_lang_instructions = 'CRITICAL RULE: You MUST write your response in the Sinhala script (සිංහල) with English technical terms naturally mixed in. Example: "ඔබේ internet connection එක check කරන්නම් 😊". DO NOT reply in Singlish or pure English. Even if the user types in English, you MUST translate your response and reply in Sinhala!\''
    new_lang_instructions = 'CRITICAL RULE: You MUST write your response in the Sinhala script (සිංහල) with English technical terms naturally mixed in. Example: "ඔබේ internet connection එක check කරන්නම් 😊". DO NOT reply in Singlish or pure English. Even if the user types in English, you MUST translate your response and reply in Sinhala!\\nALWAYS refer to technicians as "තාක්ෂණ ශිල්පියා" (Thakshana shilpiya). DO NOT USE "තාක්ෂණිකයා" or "කාර්මිකයා"!\''
    
    content = content.replace(old_lang_instructions, new_lang_instructions)
    
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched graph.py successfully!")
else:
    print("Could not find target in graph.py")
