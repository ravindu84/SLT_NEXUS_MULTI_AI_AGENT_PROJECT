import sqlite3
import random
from datetime import datetime, timedelta

def create_db():
    conn = sqlite3.connect('c:/SLT_NEXUS/backend/slt_dummy.db')
    cursor = conn.cursor()

    # Drop existing tables
    cursor.execute("DROP TABLE IF EXISTS customers")
    cursor.execute("DROP TABLE IF EXISTS network_status")
    cursor.execute("DROP TABLE IF EXISTS billing")
    cursor.execute("DROP TABLE IF EXISTS data_usage")
    cursor.execute("DROP TABLE IF EXISTS daily_usage_logs")
    cursor.execute("DROP TABLE IF EXISTS fault_tickets")

    # 1. CRM Table
    cursor.execute('''
        CREATE TABLE customers (
            phone_number TEXT PRIMARY KEY,
            registered_name TEXT,
            address TEXT,
            contact_number TEXT,
            telephone_type TEXT,
            registered_date TEXT,
            has_voice INTEGER,
            has_internet INTEGER,
            has_iptv INTEGER,
            iptv_account_id TEXT,
            dp_loop TEXT
        )
    ''')

    # 2. NMS Table
    cursor.execute('''
        CREATE TABLE network_status (
            phone_number TEXT PRIMARY KEY,
            status TEXT,
            line_state TEXT,
            power_level TEXT,
            snr TEXT,
            attenuation TEXT,
            ont_type TEXT,
            tid TEXT,
            clarity_path TEXT,
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 3. Billing Table
    cursor.execute('''
        CREATE TABLE billing (
            phone_number TEXT PRIMARY KEY,
            monthly_rental REAL,
            extra_gb_charges REAL,
            total_due REAL,
            unpaid_bills INTEGER,
            last_payment_date TEXT,
            payment_status TEXT,
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 4. Data Usage Table
    cursor.execute('''
        CREATE TABLE data_usage (
            phone_number TEXT PRIMARY KEY,
            total_data_gb REAL,
            used_data_gb REAL,
            remaining_data_gb REAL,
            usage_status TEXT,
            package_name TEXT,
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 5. Daily Data Usage Logs Table
    cursor.execute('''
        CREATE TABLE daily_usage_logs (
            phone_number TEXT,
            log_date TEXT,
            google_gb REAL,
            facebook_gb REAL,
            youtube_gb REAL,
            amazon_gb REAL,
            tiktok_gb REAL,
            total_gb REAL,
            PRIMARY KEY (phone_number, log_date),
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 6. Fault Tickets Table (WFM / Clarity)
    cursor.execute('''
        CREATE TABLE fault_tickets (
            ticket_id TEXT PRIMARY KEY,
            phone_number TEXT,
            technician TEXT,
            status TEXT,
            created_at TEXT,
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # Data lists
    first_names = ["Kamal", "Nimal", "Sunil", "Kasun", "Dasun", "Nuwan", "Lahiru", "Tharindu", "Asanka", "Saman", 
                   "Ruwan", "Chathura", "Dinesh", "Mahesh", "Roshan", "Upul", "Anura", "Pradeep", "Janaka", "Supun"]
    last_names = ["Perera", "Fernando", "De Silva", "Silva", "Bandara", "Jayawardena", "Gunawardena", "Dissanayake", 
                  "Ratnayake", "Rajapaksha", "Wijesinghe", "Senanayake", "Jayasinghe", "Karunaratne", "Samaranayake"]
    
    ont_types = ["ZTE", "Huawei", "Tenda", "C-DATA", "NOKIYA"]
    packages = ["Unlimited Home", "Unlimited Home Plus", "Unlimited Twin", "Unlimited Pro", "Any Beat", "Any Flix", "Any Tide"]

    technicians = ["KOSALA", "JANITH", "SANJEEWA", "NALAKA", "LAHIRU", "ASELA", "THARINDU", "PRASAD", "KAMAL", "SOMASIRI"]

    # Sinhala mapping
    block_names = {1: "එකේ", 2: "දෙකේ", 3: "තුනේ", 4: "හතරේ"}
    item_names = {
        1: "එක", 2: "දෙක", 3: "තුන", 4: "හතර", 5: "පහ", 6: "හය", 7: "හත", 8: "අට", 9: "නවය", 10: "දහය",
        11: "එකොළහ", 12: "දොළහ", 13: "දහතුන", 14: "දාහතර", 15: "පහළොව", 16: "දාසය", 17: "දාහත", 18: "දහඅට",
        19: "දහනවය", 20: "විස්ස", 21: "විසිඑක", 22: "විසිදෙක", 23: "විසිතුන", 24: "විසිහතර", 25: "විසිපහ",
        26: "විසිහය", 27: "විසිහත", 28: "විසිඅට", 29: "විසිනවය", 30: "තිහ", 31: "තිස්එක", 32: "තිස්දෙක"
    }

    # Tracking generated numbers to randomly assign faults later
    copper_numbers = []
    fiber_numbers = []

    # Generate exact 200 customers
    for idx in range(200):
        if idx < 100:
            # COPPER (100 numbers: 0112895800 - 0112895899)
            phone = f"01128958{idx:02d}"
            line_type = "Copper"
            addr = f"No {10 + idx}, Pitipana, Homagama"
            contact = f"07186838{idx:02d}"
            copper_numbers.append(phone)
            
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
            
            # Suspended if in last 25 of copper (75 to 99)
            is_suspended = idx >= 75

        else:
            # FIBER (100 numbers: 0112895900 - 0112895999)
            f_idx = idx - 100
            phone = f"01128959{f_idx:02d}"
            line_type = "Fiber"
            addr = f"No {110 + f_idx}, Pitipana, Homagama"
            contact = f"07186839{f_idx:02d}"
            fiber_numbers.append(phone)
            
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

            # Suspended if in last 25 of fiber (75 to 99)
            is_suspended = f_idx >= 75

        # CRM Details
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        reg_date = "2023-05-10"
        has_v, has_i, has_ip = 1, 1, 1
        iptv_id = f"IPTV{phone}"

        cursor.execute('''
            INSERT INTO customers 
            (phone_number, registered_name, address, contact_number, telephone_type, registered_date, has_voice, has_internet, has_iptv, iptv_account_id, dp_loop)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (phone, name, addr, contact, line_type, reg_date, has_v, has_i, has_ip, iptv_id, dp_loop))

        # NMS details
        status = "DOWN" if is_suspended else "UP"
        line_state = "Fault" if is_suspended else "Normal"
        
        cursor.execute('''
            INSERT INTO network_status 
            (phone_number, status, line_state, power_level, snr, attenuation, ont_type, tid, clarity_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (phone, status, line_state, power, snr, attn, ont, tid, dp_loop))

        # Billing details
        total_due = round(random.uniform(1500.0, 50000.0), 2)
        payment_status = "Suspended" if is_suspended else "Active"
        cursor.execute('''
            INSERT INTO billing
            (phone_number, monthly_rental, extra_gb_charges, total_due, unpaid_bills, last_payment_date, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (phone, 2990.0, 0.0, total_due, 2 if is_suspended else 0, "2026-04-01", payment_status))

        # Data Usage
        pkg = random.choice(packages)
        total_data = float(random.choice([50, 100, 150, 200, 300]))
        
        if is_suspended:
            usage_status = "Suspended"
            remaining = 0.0
            used = total_data
        else:
            if random.random() < 0.10:
                usage_status = "Active"
                remaining = 0.0
                used = total_data
            else:
                usage_status = "Active"
                used = round(random.uniform(5.0, total_data - 1.0), 2)
                remaining = total_data - used

        cursor.execute('''
            INSERT INTO data_usage
            (phone_number, total_data_gb, used_data_gb, remaining_data_gb, usage_status, package_name)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (phone, total_data, f"{used:.2f}", f"{remaining:.2f}", usage_status, pkg))

        # 31 Day Daily Logs
        end_dt = datetime.now()
        for d in range(31):
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
            
            cursor.execute('''
                INSERT INTO daily_usage_logs
                (phone_number, log_date, google_gb, facebook_gb, youtube_gb, amazon_gb, tiktok_gb, total_gb)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (phone, log_date, google, fb, yt, amzn, tk, tot))

    # Generate 40 active fault tickets (20 copper, 20 fiber)
    fault_copper = random.sample(copper_numbers, 20)
    fault_fiber = random.sample(fiber_numbers, 20)
    all_faults = fault_copper + fault_fiber

    ticket_time = datetime.now()
    for f_phone in all_faults:
        t_id = f"SLT-FT-{random.randint(100000, 999999)}"
        tech = random.choice(technicians)
        status = random.choice(["Dispatched", "Pending", "In Progress"])
        # Update line state in NMS to Fault
        cursor.execute("UPDATE network_status SET status = 'DOWN', line_state = 'Fault' WHERE phone_number = ?", (f_phone,))
        
        cursor.execute('''
            INSERT INTO fault_tickets (ticket_id, phone_number, technician, status, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (t_id, f_phone, tech, status, ticket_time.strftime("%Y-%m-%d %H:%M:%S")))

    conn.commit()
    conn.close()
    print("SUCCESS: SLT NEXUS Database Rebuilt with Fault Tickets & Technicians!")

if __name__ == "__main__":
    create_db()
