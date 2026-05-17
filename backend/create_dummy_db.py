import sqlite3
import random
from datetime import datetime, timedelta

def generate_random_date(start_year=2021, end_year=2026):
    start_date = datetime(start_year, 1, 1)
    end_date = datetime(end_year, 1, 31)
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    return (start_date + timedelta(days=random_days)).strftime("%Y-%m-%d")

def create_db():
    conn = sqlite3.connect('c:/SLT_NEXUS/backend/slt_dummy.db')
    cursor = conn.cursor()

    # Drop existing tables to ensure absolute consistency
    cursor.execute("DROP TABLE IF EXISTS customers")
    cursor.execute("DROP TABLE IF EXISTS network_status")
    cursor.execute("DROP TABLE IF EXISTS billing")
    cursor.execute("DROP TABLE IF EXISTS data_usage")
    cursor.execute("DROP TABLE IF EXISTS daily_usage_logs")

    # 1. CRM Table (Core customer profiles and subscribed services)
    cursor.execute('''
        CREATE TABLE customers (
            phone_number TEXT PRIMARY KEY,
            registered_name TEXT,
            address TEXT,
            contact_number TEXT,
            telephone_type TEXT, -- 'Copper' or 'Fiber'
            registered_date TEXT,
            has_voice INTEGER,   -- 1 or 0
            has_internet INTEGER,-- 1 or 0
            has_iptv INTEGER,    -- 1 or 0
            iptv_account_id TEXT -- IPTVxxxxxxxxxx format
        )
    ''')

    # 2. NMS Table (Technical signal parameters, ONT types, line diagnostics)
    cursor.execute('''
        CREATE TABLE network_status (
            phone_number TEXT PRIMARY KEY,
            status TEXT,          -- 'UP' or 'DOWN'
            line_state TEXT,      -- 'Normal', 'Warning', 'Fault'
            power_level TEXT,     -- FTTH Optical Power (e.g. -19.4 dBm)
            snr TEXT,             -- PSTN Signal to Noise Ratio (dB)
            attenuation TEXT,     -- PSTN Copper Attenuation (dB)
            ont_type TEXT,        -- ZTE, Huawei, Nokia, etc.
            tid TEXT,             -- Terminal ID for Copper (e.g. 12E 4A)
            clarity_path TEXT,    -- Technical path routing
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 3. Billing Table (Outstanding balances, monthly charges, unpaid invoice counter)
    cursor.execute('''
        CREATE TABLE billing (
            phone_number TEXT PRIMARY KEY,
            monthly_rental REAL,
            extra_gb_charges REAL,
            total_due REAL,
            unpaid_bills INTEGER,
            last_payment_date TEXT,
            payment_status TEXT, -- 'Paid', 'Pending', 'Overdue'
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 4. Data Usage Table (Quota meter details)
    cursor.execute('''
        CREATE TABLE data_usage (
            phone_number TEXT PRIMARY KEY,
            total_data_gb REAL,
            used_data_gb REAL,
            remaining_data_gb REAL,
            usage_status TEXT,   -- 'Active', 'Low Quota', 'Suspended'
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    # 5. Daily Data Usage Logs Table (30-day breakdown for internet users)
    cursor.execute('''
        CREATE TABLE daily_usage_logs (
            phone_number TEXT,
            log_date TEXT,
            facebook_gb REAL,
            google_gb REAL,
            youtube_gb REAL,
            yahoo_gb REAL,
            aws_gb REAL,
            total_gb REAL,
            PRIMARY KEY (phone_number, log_date),
            FOREIGN KEY(phone_number) REFERENCES customers(phone_number)
        )
    ''')

    slt_names = [
        "Avantha Silva", "Ravin Perera", "Niluka Fernando", "Chamari Atapattu", 
        "Dinesh Chandimal", "Roshan Siriwardena", "Kanchana Gamage", "Sanduni Jayasuriya",
        "Pathum Nissanka", "Mahesh Theekshana", "Bhanuka Rajapaksa", "Anura Kumara",
        "Nimisha Alwis", "Tharindu Mendis", "Priyantha Kumara", "Imesha Jayawardena",
        "Gayan Senanayake", "Dilani Manodara", "Udaya Ranasinghe", "Ruvini Herath"
    ]

    ont_types = ["ZTE F660", "Huawei HG8245H", "Nokia G-140W-C", "C-DATA ONT", "Tenda HG6"]

    # 100 Copper numbers (0112895800 to 0112895899)
    # 100 Fiber numbers (94112895900 to 94112895999)
    accounts = []
    for i in range(100):
        accounts.append((f"01128958{i:02d}", "Copper"))
    for i in range(100):
        accounts.append((f"941128959{i:02d}", "Fiber"))

    for phone, line_type in accounts:
        # Generate random customer details
        name = f"{random.choice(slt_names)} {random.choice(['Bandara', 'Dissanayake', 'Ranasinghe', 'Gunawardena', 'Cooray'])}"
        contact = f"071868{random.randint(1000, 9999)}"
        reg_date = generate_random_date()
        addr_num = random.randint(1, 450)
        address = f"No. {addr_num}, High Level Road, Pitipana, Homagama"

        # Service Distribution probabilities:
        # 40% Triple Play (Voice + Internet + IPTV)
        # 30% Dual Play (Voice + Internet)
        # 20% Dual Play (Voice + IPTV)
        # 10% Single Play (Voice only)
        r = random.random()
        if r < 0.40:
            has_voice, has_internet, has_iptv = 1, 1, 1
        elif r < 0.70:
            has_voice, has_internet, has_iptv = 1, 1, 0
        elif r < 0.90:
            has_voice, has_iptv, has_internet = 1, 1, 0
        else:
            has_voice, has_internet, has_iptv = 1, 0, 0

        iptv_id = f"IPTV{phone}" if has_iptv else None

        # Insert CRM Customer Profile
        cursor.execute('''
            INSERT INTO customers 
            (phone_number, registered_name, address, contact_number, telephone_type, registered_date, has_voice, has_internet, has_iptv, iptv_account_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (phone, name, address, contact, line_type, reg_date, has_voice, has_internet, has_iptv, iptv_id))

        # Generate technical parameters (NMS status)
        # We classify lines as:
        # - 80% 'Normal' (clean signal)
        # - 15% 'Warning' (marginal attenuation/SNR or marginal power - Oracle predictive warning)
        # - 5% 'Fault' (completely down/damaged copper or fiber cut - Pulse support ticket)
        tech_r = random.random()
        if tech_r < 0.05:
            line_state = "Fault"
            status = "DOWN"
        elif tech_r < 0.20:
            line_state = "Warning"
            status = "UP"
        else:
            line_state = "Normal"
            status = "UP"

        ont = random.choice(ont_types) if line_type == "Fiber" else "N/A"
        clarity = f"HO-MHG-550-{random.randint(10, 99)}-{random.randint(1, 15)}"

        if line_type == "Fiber":
            # FTTH Optical Power Levels (dBm)
            snr, attn, tid = "N/A", "N/A", "N/A"
            if line_state == "Normal":
                power = f"{random.uniform(-17.0, -24.5):.2f}"
            elif line_state == "Warning":
                power = f"{random.uniform(-25.5, -28.4):.2f}" # Marginal low power
            else: # Fault / Down
                power = f"{random.uniform(-29.5, -34.0):.2f}"
        else:
            # PSTN Copper physical statistics (SNR & Attenuation)
            power = "N/A"
            tid = f"{random.randint(1, 45)}E {random.randint(1, 32)}A"
            if line_state == "Normal":
                snr = f"{random.uniform(22.0, 36.0):.1f}"
                attn = f"{random.uniform(2.0, 11.5):.1f}"
            elif line_state == "Warning":
                snr = f"{random.uniform(10.1, 13.9):.1f}" # Lower SNR
                attn = f"{random.uniform(25.0, 31.9):.1f}" # High Attenuation
            else: # Fault / Down
                snr = f"{random.uniform(4.0, 7.8):.1f}"
                attn = f"{random.uniform(36.0, 48.0):.1f}"

        # Insert Network diagnostics
        cursor.execute('''
            INSERT INTO network_status 
            (phone_number, status, line_state, power_level, snr, attenuation, ont_type, tid, clarity_path)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (phone, status, line_state, power, snr, attn, ont, tid, clarity))

        # Generate Billing Details
        monthly = 1490.0 if line_type == "Copper" else 2990.0
        if not has_internet:
            monthly = 490.0  # Voice only
        if has_iptv:
            monthly += 990.0 # IPTV Addon

        # Generate outstanding balance
        if line_state == "Fault":
            unpaid = random.randint(1, 3) # Billing issue possibly related or unpaid bills
        else:
            unpaid = random.choice([0, 0, 0, 0, 1, 2]) # Mostly paid or small pending

        extra_gb = random.choice([0.0, 0.0, 0.0, 120.0, 240.0, 480.0]) if has_internet else 0.0
        due = (monthly * unpaid) + extra_gb
        
        if due == 0.0:
            payment_status = "Paid"
            due = 0.0
        elif unpaid >= 2:
            payment_status = "Overdue"
        else:
            payment_status = "Pending"

        pay_date = (datetime.now() - timedelta(days=random.randint(2, 28))).strftime("%Y-%m-%d")

        cursor.execute('''
            INSERT INTO billing
            (phone_number, monthly_rental, extra_gb_charges, total_due, unpaid_bills, last_payment_date, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (phone, monthly, extra_gb, due, unpaid, pay_date, payment_status))

        # Generate Data Usage profiles (if customer has internet)
        if has_internet:
            total_data = 120.0 if line_type == "Copper" else 300.0
            # Generate random usage
            # 15% have exceeded their quota (low quota)
            usage_r = random.random()
            if usage_r < 0.15:
                used = total_data - random.uniform(0.01, 1.5)
                status_u = "Low Quota"
            elif usage_r < 0.20:
                used = total_data
                status_u = "Suspended"
            else:
                used = random.uniform(10.0, total_data - 20.0)
                status_u = "Active"
            
            remaining = max(0.0, total_data - used)
            cursor.execute('''
                INSERT INTO data_usage
                (phone_number, total_data_gb, used_data_gb, remaining_data_gb, usage_status)
                VALUES (?, ?, ?, ?, ?)
            ''', (phone, total_data, f"{used:.2f}", f"{remaining:.2f}", status_u))

            # Generate 30 days of daily website usage logs
            end_dt = datetime.now()
            for d in range(30):
                log_date = (end_dt - timedelta(days=d)).strftime("%Y-%m-%d")
                
                # Daily usage breakdown in GB
                fb = round(random.uniform(0.05, 1.2), 2) if status_u != "Suspended" else 0.0
                gg = round(random.uniform(0.05, 1.0), 2) if status_u != "Suspended" else 0.0
                yt = round(random.uniform(0.1, 3.5), 2) if status_u != "Suspended" else 0.0
                yh = round(random.uniform(0.005, 0.2), 2) if status_u != "Suspended" else 0.0
                aws = round(random.uniform(0.01, 0.8), 2) if status_u != "Suspended" else 0.0
                tot = round(fb + gg + yt + yh + aws, 2)
                
                cursor.execute('''
                    INSERT INTO daily_usage_logs
                    (phone_number, log_date, facebook_gb, google_gb, youtube_gb, yahoo_gb, aws_gb, total_gb)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (phone, log_date, fb, gg, yt, yh, aws, tot))
        else:
            cursor.execute('''
                INSERT INTO data_usage
                (phone_number, total_data_gb, used_data_gb, remaining_data_gb, usage_status)
                VALUES (?, ?, ?, ?, ?)
            ''', (phone, 0.0, 0.0, 0.0, "N/A"))

    conn.commit()
    conn.close()
    print("SUCCESS: SLT NEXUS Unified Telecom Database (slt_dummy.db) rebuilt successfully!")
    print("   Total records populated: 200 (100 Copper, 100 Fiber)")
    print("   Distributed across: Voice, Internet (Broadband), and PeoTV (Triple-Play)")
    print("   Physical status distribution: 80% Normal, 15% Warning (Predictive maintenance), 5% Active Outage")

if __name__ == "__main__":
    create_db()
