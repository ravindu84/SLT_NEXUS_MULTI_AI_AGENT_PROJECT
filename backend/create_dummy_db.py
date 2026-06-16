import sqlite3
import random
import os
from datetime import datetime, timedelta

def create_db():
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slt_dummy.db')
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Drop existing tables
    cursor.execute("DROP TABLE IF EXISTS customers")
    cursor.execute("DROP TABLE IF EXISTS network_status")
    cursor.execute("DROP TABLE IF EXISTS billing")
    cursor.execute("DROP TABLE IF EXISTS data_usage")
    cursor.execute("DROP TABLE IF EXISTS daily_usage_logs")
    cursor.execute("DROP TABLE IF EXISTS billing_history")
    cursor.execute("DROP TABLE IF EXISTS monthly_usage_history")
    cursor.execute("DROP TABLE IF EXISTS historical_faults")
    cursor.execute("DROP TABLE IF EXISTS fault_tickets")
    cursor.execute("DROP TABLE IF EXISTS prospects")
    cursor.execute("DROP TABLE IF EXISTS new_connections")
    cursor.execute("DROP TABLE IF EXISTS user_memory")
    cursor.execute("DROP TABLE IF EXISTS technicians")
    cursor.execute("DROP TABLE IF EXISTS fiber_dp")
    cursor.execute("DROP TABLE IF EXISTS fiber_dp_loops")
    cursor.execute("DROP TABLE IF EXISTS ledger")

    # Table creation statements...
    cursor.execute('''CREATE TABLE user_memory (phone_number TEXT PRIMARY KEY, memory_summary TEXT, last_updated TEXT)''')
    cursor.execute('''CREATE TABLE prospects (mobile_number TEXT PRIMARY KEY, name TEXT, nic TEXT, email TEXT, location_verified INTEGER, human_verified INTEGER, kyc_verified INTEGER, created_at TEXT)''')
    cursor.execute('''CREATE TABLE new_connections (connection_id TEXT PRIMARY KEY, mobile_number TEXT, slt_number TEXT, name TEXT, address TEXT, id_number TEXT, package TEXT, payment_status TEXT, kyc_status TEXT, status TEXT, dp_loop TEXT, created_at TEXT)''')
    cursor.execute('''CREATE TABLE customers (phone_number TEXT PRIMARY KEY, registered_name TEXT, address TEXT, contact_number TEXT, telephone_type TEXT, registered_date TEXT, has_voice INTEGER, has_internet INTEGER, has_iptv INTEGER, iptv_account_id TEXT, dp_loop TEXT)''')
    cursor.execute('''CREATE TABLE network_status (phone_number TEXT PRIMARY KEY, status TEXT, line_state TEXT, power_level TEXT, snr TEXT, attenuation TEXT, ont_type TEXT, tid TEXT, clarity_path TEXT, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE billing (phone_number TEXT PRIMARY KEY, monthly_rental REAL, extra_gb_charges REAL, total_due REAL, unpaid_bills INTEGER, last_payment_date TEXT, payment_status TEXT, nxc_balance INTEGER, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE billing_history (id INTEGER PRIMARY KEY AUTOINCREMENT, phone_number TEXT, month TEXT, year INTEGER, amount_billed REAL, amount_paid REAL, arrears REAL, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE monthly_usage_history (id INTEGER PRIMARY KEY AUTOINCREMENT, phone_number TEXT, month TEXT, year INTEGER, used_data_gb REAL, total_data_gb REAL, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE historical_faults (id INTEGER PRIMARY KEY AUTOINCREMENT, phone_number TEXT, fault_date TEXT, issue_type TEXT, resolution_time_hrs INTEGER, snr_at_fault TEXT, power_at_fault TEXT, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE data_usage (phone_number TEXT PRIMARY KEY, total_data_gb REAL, used_data_gb REAL, remaining_data_gb REAL, usage_status TEXT, package_name TEXT, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE daily_usage_logs (phone_number TEXT, log_date TEXT, google_gb REAL, facebook_gb REAL, youtube_gb REAL, amazon_gb REAL, tiktok_gb REAL, total_gb REAL, PRIMARY KEY (phone_number, log_date), FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE fault_tickets (ticket_id TEXT PRIMARY KEY, phone_number TEXT, technician TEXT, status TEXT, created_at TEXT, description TEXT, image_data TEXT, FOREIGN KEY(phone_number) REFERENCES customers(phone_number))''')
    cursor.execute('''CREATE TABLE technicians (name TEXT PRIMARY KEY, zone TEXT, status TEXT, active_tickets INTEGER)''')
    cursor.execute('''CREATE TABLE fiber_dp (dp_id TEXT PRIMARY KEY, location_lat REAL, location_lon REAL, status TEXT, total_capacity INTEGER, available_capacity INTEGER, created_at TEXT)''')
    cursor.execute('''CREATE TABLE fiber_dp_loops (loop_id TEXT PRIMARY KEY, dp_id TEXT, allocated_to TEXT, allocated_at TEXT, FOREIGN KEY(dp_id) REFERENCES fiber_dp(dp_id))''')
    cursor.execute('''CREATE TABLE ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_type TEXT, details TEXT, created_at TEXT)''')

    # Data setup
    first_names = ["Kasun", "Nimal", "Saman", "Chaminda", "Ruwan", "Anura", "Namal", "Janaka", "Nuwan", "Roshan", "Sunil", "Tharanga", "Dinesh", "Lahiru", "Asanka", "Malith", "Sandun", "Nishantha", "Pradeep", "Supun", "Chathura", "Kelum", "Gayan", "Isuru", "Hasitha"]
    last_names = ["Perera", "Fernando", "Kumara", "Silva", "Rajapaksha", "Dissanayake", "Weerasinghe", "Bandara", "Ranawaka", "Shantha", "Rathnayake", "Priyankara", "Madushanka", "De Silva", "Wickramasinghe", "Senanayake", "Jayasinghe", "Ekanayake", "Gunawardana", "Liyanage"]
    names = list(set([f"{f} {l}" for f in first_names for l in last_names]))
    random.shuffle(names)
    names = names[:200]
    
    ont_types = ["ZTE", "Huawei", "Tenda", "C-DATA", "NOKIYA"]
    packages = ["Unlimited Home", "Unlimited Home Plus", "Unlimited Twin", "Unlimited Pro", "Any Beat", "Any Flix", "Any Tide"]
    technicians = ["KOSALA", "JANITH", "SANJEEWA", "NALAKA", "LAHIRU", "ASELA", "THARINDU", "PRASAD", "KAMAL", "SOMASIRI"]

    block_names = {1: "එකේ", 2: "දෙකේ", 3: "තුනේ", 4: "හතරේ"}
    item_names = {
        1: "එක", 2: "දෙක", 3: "තුන", 4: "හතර", 5: "පහ", 6: "හය", 7: "හත", 8: "අට", 9: "නවය", 10: "දහය",
        11: "එකොළහ", 12: "දොළහ", 13: "දහතුන", 14: "දාහතර", 15: "පහළොව", 16: "දාසය", 17: "දාහත", 18: "දහඅට",
        19: "දහනවය", 20: "විස්ස", 21: "විසිඑක", 22: "විසිදෙක", 23: "විසිතුන", 24: "විසිහතර", 25: "විසිපහ",
        26: "විසිහය", 27: "විසිහත", 28: "විසිඅට", 29: "විසිනවය", 30: "තිහ", 31: "තිස්එක", 32: "තිස්දෙක"
    }

    # Tracking active non-suspended numbers for Quota Exceeded logic
    active_numbers = []

    # Generate exact 200 customers
    for idx in range(200):
        name = names[idx]
        addr = f"No {10 + idx}, Pitipana, Homagama"
        contact = f"0718683{idx:03d}"

        if idx < 100:
            # COPPER (100 numbers: 0112895800 - 0112895899)
            phone = f"01128958{idx:02d}"
            line_type = "Copper"
            
            # DP/LOOP: HO-ATR-A0300-A001-01
            dp_num = (idx // 10) + 1
            loop_num = (idx % 10) + 1
            dp_loop = f"HO-ATR-A0300-A{dp_num:03d}-{loop_num:02d}"
            
            # TID: 1/1 to 4/32
            block = (idx // 32) + 1
            item = (idx % 32) + 1
            b_name = block_names.get(block, str(block))
            i_name = item_names.get(item, str(item))
            tid = f"{block}/{item} - {b_name} {i_name}"
            
            # NMS SNR/Attn (50% Good, 50% Bad randomly)
            if random.choice([True, False]):
                snr = f"{random.uniform(20.0, 32.0):.1f}"
                attn = f"{random.uniform(5.0, 19.9):.1f}"
            else:
                snr = f"{random.uniform(5.0, 19.9):.1f}"
                attn = f"{random.uniform(21.0, 45.0):.1f}"
            
            power = "N/A"
            ont = "N/A"
            is_suspended = idx >= 75
        else:
            # FIBER (100 numbers: 0112895900 - 0112895999)
            f_idx = idx - 100
            phone = f"01128959{f_idx:02d}"
            line_type = "Fiber"
            
            # DP/LOOP: HO-MHM-0500-001-01 (8 loops per DP)
            dp_num = (f_idx // 8) + 1
            loop_num = (f_idx % 8) + 1
            dp_loop = f"HO-MHM-0500-{dp_num:03d}-{loop_num:02d}"
            
            tid = "N/A"
            snr = "N/A"
            attn = "N/A"
            ont = random.choice(ont_types)
            
            if random.choice([True, False]):
                power = f"{random.uniform(-18.0, -25.0):.2f}"
            else:
                power = f"{random.uniform(-26.0, -34.0):.2f}"
            
            is_suspended = f_idx >= 75

        if not is_suspended:
            active_numbers.append(phone)

        # CRM Details
        reg_date = "2023-05-10"
        cursor.execute('''INSERT INTO customers 
            (phone_number, registered_name, address, contact_number, telephone_type, registered_date, has_voice, has_internet, has_iptv, iptv_account_id, dp_loop)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
            (phone, name, addr, contact, line_type, reg_date, 1, 1, 1, f"IPTV{phone}", dp_loop))

        # NMS details
        status = "DOWN" if is_suspended else "UP"
        line_state = "Fault" if is_suspended else "Normal"
        cursor.execute('''INSERT INTO network_status 
            (phone_number, status, line_state, power_level, snr, attenuation, ont_type, tid, clarity_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''', 
            (phone, status, line_state, power, snr, attn, ont, tid, dp_loop))

        # Billing details
        total_due = round(random.uniform(1500.0, 50000.0), 2)
        payment_status = "Suspended" if is_suspended else "Active"
        nxc_balance = 0 if is_suspended else random.randint(100, 2500)
        cursor.execute('''INSERT INTO billing
            (phone_number, monthly_rental, extra_gb_charges, total_due, unpaid_bills, last_payment_date, payment_status, nxc_balance)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', 
            (phone, 2990.0, 0.0, total_due, 2 if is_suspended else 0, "2026-04-01", payment_status, nxc_balance))

        # Billing, Usage, and Faults History (Churn Prediction Data)
        is_high_churn_risk = False
        if not is_suspended and random.random() < 0.1:  # About 10% of active users are at risk
            is_high_churn_risk = True

        months_12 = ["May", "June", "July", "August", "September", "October", "November", "December", "January", "February", "March", "April"]
        years_12 = [2025, 2025, 2025, 2025, 2025, 2025, 2025, 2025, 2026, 2026, 2026, 2026]
        
        current_arrears = 0.0
        for i, m in enumerate(months_12):
            yr = years_12[i]
            amt_billed = 2990.0 + round(random.uniform(0, 500), 2)
            if is_suspended:
                amt_paid = 0.0
            elif is_high_churn_risk and i > 8: # Last 3 months stopped paying
                amt_paid = 0.0
            else:
                amt_paid = amt_billed + current_arrears if random.random() < 0.9 else amt_billed / 2
            
            current_arrears = round(current_arrears + amt_billed - amt_paid, 2)
            if current_arrears < 0: current_arrears = 0.0
            cursor.execute('''INSERT INTO billing_history (phone_number, month, year, amount_billed, amount_paid, arrears) VALUES (?, ?, ?, ?, ?, ?)''', 
                (phone, m, yr, amt_billed, amt_paid, current_arrears))

        # 3-Month Usage History
        usage_months = ["February", "March", "April"]
        base_usage = random.uniform(50, 150)
        for i, m in enumerate(usage_months):
            if is_suspended:
                used = 0.0
            elif is_high_churn_risk:
                used = max(5.0, base_usage - (i * 30)) # Declining usage
            else:
                used = base_usage + random.uniform(-10, 10) # Stable usage
            
            cursor.execute('''INSERT INTO monthly_usage_history (phone_number, month, year, used_data_gb, total_data_gb) VALUES (?, ?, ?, ?, ?)''', 
                (phone, m, 2026, round(used, 2), 200.0))

        # 12-Month Historical Faults
        fault_count = random.randint(3, 7) if is_high_churn_risk else random.randint(0, 2)
        issue_types = ["Slow Internet", "Frequent Disconnections", "No Service", "Voice Quality Issue"]
        for _ in range(fault_count):
            f_month = random.choice(months_12)
            f_issue = random.choice(issue_types)
            res_time = random.randint(24, 72) if is_high_churn_risk else random.randint(2, 12)
            f_snr = f"{random.uniform(5.0, 12.0):.1f}" if is_high_churn_risk else f"{random.uniform(20.0, 30.0):.1f}"
            f_pow = f"{random.uniform(-28.0, -35.0):.2f}" if is_high_churn_risk else f"{random.uniform(-15.0, -22.0):.2f}"
            cursor.execute('''INSERT INTO historical_faults (phone_number, fault_date, issue_type, resolution_time_hrs, snr_at_fault, power_at_fault) VALUES (?, ?, ?, ?, ?, ?)''', 
                (phone, f"{f_month} 2025/26", f_issue, res_time, f_snr, f_pow))

    # Pick exactly 15 active users to have 0 GB (Quota Exceeded)
    quota_exceeded_numbers = set(random.sample(active_numbers, 15))

    # Loop again for Data Usage & Logs since we needed to select the 15 quota exceeded first
    cursor.execute("SELECT phone_number, payment_status FROM billing")
    all_billing = cursor.fetchall()
    
    for row in all_billing:
        phone, p_status = row[0], row[1]
        is_suspended = p_status == "Suspended"
        
        pkg = random.choice(packages)
        total_data = float(random.choice([50, 100, 150, 200, 300]))
        
        if is_suspended:
            usage_status = "Suspended"
            remaining = 0.0
            used = total_data
        elif phone in quota_exceeded_numbers:
            usage_status = "Quota Exceeded"
            remaining = 0.0
            used = total_data
        else:
            usage_status = "Active"
            used = round(random.uniform(5.0, total_data - 1.0), 2)
            remaining = total_data - used

        cursor.execute('''INSERT INTO data_usage (phone_number, total_data_gb, used_data_gb, remaining_data_gb, usage_status, package_name) VALUES (?, ?, ?, ?, ?, ?)''', 
            (phone, total_data, f"{used:.2f}", f"{remaining:.2f}", usage_status, pkg))

        # 31 Day Daily Logs
        end_dt = datetime.now()
        for d in range(90):
            log_date = (end_dt - timedelta(days=d)).strftime("%Y-%m-%d")
            
            if is_suspended:
                google, fb, yt, amzn, tk = 0.0, 0.0, 0.0, 0.0, 0.0
            else:
                day_total = round(random.uniform(0.1, 15.0), 2)
                splits = [random.random() for _ in range(5)]
                s = sum(splits)
                splits = [x/s for x in splits]
                
                google = round(day_total * splits[0], 2)
                fb = round(day_total * splits[1], 2)
                yt = round(day_total * splits[2], 2)
                amzn = round(day_total * splits[3], 2)
                tk = round(day_total * splits[4], 2)
            
            tot = round(google + fb + yt + amzn + tk, 2)
            cursor.execute('''INSERT INTO daily_usage_logs (phone_number, log_date, google_gb, facebook_gb, youtube_gb, amazon_gb, tiktok_gb, total_gb) VALUES (?, ?, ?, ?, ?, ?, ?, ?)''', 
                (phone, log_date, google, fb, yt, amzn, tk, tot))

    # Add fault tickets for the 50 suspended accounts so they appear in the Fault Matrix
    ticket_time = datetime.now()
    cursor.execute("SELECT phone_number FROM network_status WHERE status = 'DOWN'")
    suspended_phones = [row[0] for row in cursor.fetchall()]
    
    for f_phone in suspended_phones:
        t_id = f"SLT-FT-{random.randint(100000, 999999)}"
        if random.random() < 0.6:
            tech = ""
            status = "Pending"
        else:
            tech = random.choice(technicians)
            status = random.choice(["Dispatched", "In Progress", "Assigned"])
        cursor.execute('''
            INSERT INTO fault_tickets (ticket_id, phone_number, technician, status, created_at, description, image_data)
            VALUES (?, ?, ?, ?, ?, NULL, NULL)
        ''', (t_id, f_phone, tech, status, ticket_time.strftime("%Y-%m-%d %H:%M:%S")))

    # --- Populate the new tables ---
    
    # 1. Technicians
    zones = ["Colombo North", "Colombo South", "Colombo Central", "Kandy", "Galle", "Kurunegala"]
    for tech in technicians:
        zone = random.choice(zones)
        status = random.choice(["Available", "Available", "Available", "Busy"])
        active_t = random.randint(0, 3) if status == "Busy" else 0
        cursor.execute("INSERT INTO technicians (name, zone, status, active_tickets) VALUES (?, ?, ?, ?)", (tech, zone, status, active_t))

    # 2. Fiber DPs and Loops
    dp_statuses = ["Active", "Active", "Active", "Maintenance", "Degraded"]
    dp_ids = []
    for i in range(1, 16):
        dp_id = f"FDP-COL-{i:03d}"
        dp_ids.append(dp_id)
        cap = random.choice([8, 16, 32])
        av_cap = cap - random.randint(0, cap)
        cursor.execute("INSERT INTO fiber_dp (dp_id, location_lat, location_lon, status, total_capacity, available_capacity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", 
                       (dp_id, 6.92 + random.uniform(-0.05, 0.05), 79.86 + random.uniform(-0.05, 0.05), random.choice(dp_statuses), cap, av_cap, datetime.now().isoformat()))
        
        # Populate loops for this DP
        loops_used = cap - av_cap
        for j in range(1, loops_used + 1):
            loop_id = f"{dp_id}-L{j:02d}"
            cursor.execute("INSERT INTO fiber_dp_loops (loop_id, dp_id, allocated_to, allocated_at) VALUES (?, ?, ?, ?)", 
                           (loop_id, dp_id, f"0112{random.randint(100000, 999999)}", (datetime.now() - timedelta(days=random.randint(10, 300))).isoformat()))

    # 3. Ledger
    transaction_types = ["BLOCKCHAIN_SYNC", "PAYMENT_SECURED", "VAULT_AUDIT", "SMART_CONTRACT_EXEC", "IDENTITY_VERIFIED"]
    for i in range(20):
        t_type = random.choice(transaction_types)
        if t_type == "BLOCKCHAIN_SYNC":
            details = f"Synchronized node ledger hash: 0x{random.randint(10000000, 99999999):x}"
        elif t_type == "PAYMENT_SECURED":
            details = f"Verified LKR {random.randint(1500, 8000)}.00 payment for UUID: {random.randint(1000, 9999)}"
        elif t_type == "VAULT_AUDIT":
            details = "Automated integrity check passed for customer database."
        else:
            details = f"Smart contract verification complete for SLA-id-{random.randint(100, 999)}"
            
        cursor.execute("INSERT INTO ledger (transaction_type, details, created_at) VALUES (?, ?, ?)", 
                       (t_type, details, (datetime.now() - timedelta(minutes=random.randint(1, 1440))).isoformat()))

    conn.commit()
    conn.close()
    print("SUCCESS: SLT NEXUS Dummy Database Rebuilt Perfectly!")

if __name__ == "__main__":
    create_db()
