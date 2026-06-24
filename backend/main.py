import os
import uuid
from typing import List, Optional
import io
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)
import httpx
import re

# Comprehensive multi-lingual profanity censorship list (English, Sinhala, Tamil)
PROFANITY_WORDS = [
    # English
    "fuck", "shit", "bitch", "asshole", "bastard", "dick", "cunt", "pussy", "whore", "fucker", "fucking",
    # Sinhala
    "huththa", "hutta", "hukana", "hukanna", "paka", "pakaya", "ponnaya", "kari", "kariya", "ammatapuka", 
    "huththige", "huttige", "pakage", "kariyo", "paraya", "musalaya", "balla", "ballee",
    # Tamil
    "koothi", "oolu", "pottai", "sunni", "thevadiya", "baadu"
]

def censor_profanity(text: str) -> str:
    """Censor common profanity/bad words in English, Sinhala, and Tamil with asterisks."""
    if not text:
        return text
    censored = text
    for word in PROFANITY_WORDS:
        # Use regex to find and replace case-insensitively with boundary support for English
        # or general substring replacement for non-space-bounded languages
        pattern = re.compile(r'\b' + re.escape(word) + r'\b', re.IGNORECASE) if word.isascii() else re.compile(re.escape(word), re.IGNORECASE)
        censored = pattern.sub("***", censored)
    return censored

def format_mixed_languages(text: str, target_lang: str) -> str:
    """
    Finds consecutive English words inside Sinhala/Tamil text and wraps them in a single SSML <lang xml:lang='en-US'> tag block.
    This prevents the TTS engine from pausing between individual words.
    """
    if target_lang not in ['si', 'ta']:
        return text
        
    words = text.split(" ")
    formatted_words = []
    
    in_english = False
    current_english_phrase = []
    
    for word in words:
        stripped = word.strip(".,;:!?()\"'[]{}<>*-")
        
        # Check if purely English/ASCII word with at least one alphanumeric character
        is_english = bool(stripped and all(ord(char) < 128 for char in stripped) and any(char.isalnum() for char in stripped))
        
        if is_english:
            if not in_english:
                in_english = True
            current_english_phrase.append(word)
        else:
            if in_english:
                # Flush the accumulated English phrase wrapped in a single <lang> tag
                phrase = " ".join(current_english_phrase)
                phrase_stripped = phrase.strip(".,;:!?()\"'[]{}<>*-")
                idx = phrase.find(phrase_stripped)
                prefix = phrase[:idx]
                suffix = phrase[idx + len(phrase_stripped):]
                
                formatted_words.append(f'{prefix}<lang xml:lang="en-US">{phrase_stripped}</lang>{suffix}')
                current_english_phrase = []
                in_english = False
            formatted_words.append(word)
            
    # Flush any remaining English phrase at the end
    if in_english and current_english_phrase:
        phrase = " ".join(current_english_phrase)
        phrase_stripped = phrase.strip(".,;:!?()\"'[]{}<>*-")
        idx = phrase.find(phrase_stripped)
        prefix = phrase[:idx]
        suffix = phrase[idx + len(phrase_stripped):]
        formatted_words.append(f'{prefix}<lang xml:lang="en-US">{phrase_stripped}</lang>{suffix}')
        
    return " ".join(formatted_words)

def normalize_telecom_terms(text: str, target_lang: str) -> str:
    """Normalize abbreviations and terms so that the TTS reads them with perfect pronunciation."""
    if not text:
        return text
    
    # 1. Strip all parenthesized content like (Green), (Paid), (011...) to avoid redundant spoken translations
    text = re.sub(r'\(.*?\)', '', text)
    
    # 2. Convert bullet points and list dashes into short natural pauses (commas)
    text = re.sub(r'^[-\s•]+\s*', ', ', text, flags=re.MULTILINE)
    text = text.replace(" - ", ", ")
    text = text.replace(" – ", ", ")
    
    # 3. Strip markdown characters like ** and # directly
    text = text.replace("**", "").replace("*", "").replace("#", "")
    
    # 4. Replace colons with soft spoken transitions (commas)
    text = text.replace(":", ", ")
    
    # 5. Clean up formal literary terms and convert to spoken equivalents
    if target_lang == 'si':
        text = text.replace("හරිත", "කොළ")
        text = text.replace("රතු", "රතු")
        text = text.replace("තැඹිලි", "තැඹිලි")
        text = text.replace("නිල්", "නිල්")
        
        # Phonetic replacements for Sinhala
        replacements = [
            (r'\bSLT[- ]?MOBITEL\b', "එස් එල් ටී මොබිටෙල්"),
            (r'\bSLT\b', "එස් එල් ටී"),
            (r'\bMOBITEL\b', "මොබිටෙල්"),
            (r'\bFTTH\b', "එෆ් ටී ටී එච්"),
            (r'\bONT\b', "ඕ එන් ටී"),
            (r'\bTID\b', "ටී අයි ඩී"),
            (r'\bSNR\b', "එස් එන් ආර්"),
            (r'\bOPMC\b', "ඕ පී එම් සී"),
            (r'\bNMS\b', "එන් එම් එස්"),
            (r'\bCRM\b', "සී ආර් එම්"),
            (r'\bPEO[- ]?TV\b', "පියෝ ටීවී"),
            (r'\bPEOTV\b', "පියෝ ටීවී"),
            (r'\bWi[-]?Fi\b', "වයිෆයි"),
            (r'\bIPTV\b', "අයි පී ටී වී"),
            (r'(\d+(?:\.\d+)?)\s*GB\b', r'\1 ජී බී'),
            (r'\bGB\b', " ජී බී "),
            (r'(\d+(?:\.\d+)?)\s*MB\b', r'\1 එම් බී'),
            (r'\bMB\b', " එම් බී "),
            (r'\bdBm\b', "ඩී බී එම්"),
            (r'\bLOS\b', "එල් ඕ එස්"),
            (r'\bPON\b', "පී ඕ එන්"),
            (r'\bLKR\b', "රුපියල්"),
            (r'\bRs\.?\b', "රුපියල්"),
            (r'\bSLA\b', "එස් එල් ඒ"),
            (r'\bOTP\b', "ඕ ටී පී"),
            (r'\bADSL\b', "ඒ ඩී එස් එල්")
        ]
        for pattern, repl in replacements:
            text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
            
    elif target_lang == 'ta':
        # Phonetic replacements for Tamil
        replacements = [
            (r'\bSLT[- ]?MOBITEL\b', "எஸ் எல் டி மொபிடெல்"),
            (r'\bSLT\b', "எஸ் எல் டி"),
            (r'\bMOBITEL\b', "மொபிடெல்"),
            (r'\bFTTH\b', "எஃப் டி டி எச்"),
            (r'\bONT\b', "ஓ என் டி"),
            (r'\bTID\b', "டி ஐ டி"),
            (r'\bSNR\b', "எஸ் என் ஆர்"),
            (r'\bOPMC\b', "ஓ பி எம் சி"),
            (r'\bNMS\b', "என் எம் எஸ்"),
            (r'\bCRM\b', "சி ஆர் எம்"),
            (r'\bPEO[- ]?TV\b', "பியோ டிவி"),
            (r'\bPEOTV\b', "பியோ டிவி"),
            (r'\bWi[-]?Fi\b', "வைஃபை"),
            (r'\bIPTV\b', "ஐ பி டி வி"),
            (r'(\d+(?:\.\d+)?)\s*GB\b', r'\1 ஜி பி'),
            (r'\bGB\b', " ஜி பி "),
            (r'(\d+(?:\.\d+)?)\s*MB\b', r'\1 எம் பி'),
            (r'\bMB\b', " எம் பி "),
            (r'\bdBm\b', "டி பி எம்"),
            (r'\bLOS\b', "எல் ஓ எஸ்"),
            (r'\bPON\b', "பி ஓ என்"),
            (r'\bLKR\b', "ரூபாய்"),
            (r'\bRs\.?\b', "ரூபாய்"),
            (r'\bSLA\b', "எஸ் எல் ஏ"),
            (r'\bOTP\b', "ஓ டி பி")
        ]
        for pattern, repl in replacements:
            text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
            
    else:
        # For English, just space out abbreviations so they are spelled letter-by-letter
        replacements = [
            (r'\bSLT[- ]?MOBITEL\b', "S L T Mobitel"),
            (r'\bSLT\b', "S L T"),
            (r'\bFTTH\b', "F T T H"),
            (r'\bONT\b', "O N T"),
            (r'\bTID\b', "T I D"),
            (r'\bSNR\b', "S N R"),
            (r'\bOPMC\b', "O P M C"),
            (r'\bNMS\b', "N M S"),
            (r'\bCRM\b', "C R M"),
            (r'\bPEO[- ]?TV\b', "Peo T V"),
            (r'\bPEOTV\b', "Peo T V"),
            (r'\bWi[-]?Fi\b', "Wi Fi"),
            (r'\bIPTV\b', "I P T V"),
            (r'(\d+(?:\.\d+)?)\s*GB\b', r'\1 G B'),
            (r'\bGB\b', " G B "),
            (r'(\d+(?:\.\d+)?)\s*MB\b', r'\1 M B'),
            (r'\bMB\b', " M B "),
            (r'\bdBm\b', "D B M"),
            (r'\bLOS\b', "L O S"),
            (r'\bPON\b', "P O N"),
            (r'\bLKR\b', "L K R"),
            (r'\bSLA\b', "S L A"),
            (r'\bOTP\b', "O T P")
        ]
        for pattern, repl in replacements:
            text = re.sub(pattern, repl, text, flags=re.IGNORECASE)

    # 7. Clean up multiple spaces and duplicate commas
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\s+', ' ', text)
    
    return text.strip(" ,")

# Import our LangGraph 12-Agent Swarm brain
from backend.agent.graph import get_graph
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from backend.mocks import router as mocks_router

env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path, override=True)

# Google Gemini API Config
HAS_GEMINI_API = True if (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")) else False
if HAS_GEMINI_API:
    print("[INFO] Google Gemini Multimodal Speech active and ready!")
else:
    print("[WARNING] GEMINI_API_KEY is missing from environment!")

# Microsoft Azure Speech Config (Disabled, using Google Gemini API instead)
HAS_AZURE_SPEECH = True if os.getenv("AZURE_SPEECH_KEY") else False

# Global reusable HTTP client for connection pooling (10x faster TTS requests!)
http_client = httpx.AsyncClient()

app = FastAPI(
    title="SLT NEXUS - LIYA Backend",
    description="Core backend for LIYA, the SLT AI Customer Support Agent.",
    version="1.0.0"
)

app.include_router(mocks_router)

@app.get("/api/admin/outage-status")
async def get_outage_status():
    import sqlite3
    import os
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM system_state WHERE key = 'outage_status'")
    row = cursor.fetchone()
    conn.close()
    return {"status": row[0] if row else "NORMAL"}

@app.post("/api/admin/outage-trigger")
async def trigger_outage():
    import sqlite3
    import os
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE system_state SET value = 'ACTIVE' WHERE key = 'outage_status'")
    conn.commit()
    conn.close()
    return {"status": "ACTIVE"}


# Import our new Gesture Tracker
try:
    from backend.agent.tools.gesture_tracker import detect_sign_language
except ImportError:
    print("[WARNING] gesture_tracker not found or mediapipe not installed.")
    detect_sign_language = lambda x: "Gesture detection unavailable"

import asyncio
from datetime import datetime

# Automated Report Scheduler Background Task
async def run_scheduler():
    print("[INFO] Automated Report Scheduler started!")
    default_emails = [
        "aravindaslt@gmail.com"
    ]
    while True:
        try:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            
            # Trigger reports at exact times: 8 AM (08:00), 1 PM (13:00), 6 PM (18:00)
            if current_time == "08:00":
                await trigger_automated_email("morning", default_emails)
                await asyncio.sleep(61)  # prevent double trigger in the same minute
            elif current_time == "13:00":
                await trigger_automated_email("afternoon", default_emails)
                await asyncio.sleep(61)
            elif current_time == "18:00":
                await trigger_automated_email("evening", default_emails)
                await asyncio.sleep(61)
        except Exception as e:
            print(f"[ERROR] Scheduler main loop error: {e}")
            
        await asyncio.sleep(30)  # check every 30 seconds

async def trigger_automated_email(report_type: str, emails: List[str]):
    print(f"[INFO] [SCHEDULER] Triggering automatic email for {report_type} report to {emails}...")
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                "http://localhost:8000/mocks/report/email",
                json={"emails": emails, "report_type": report_type}
            )
    except Exception as e:
        print(f"[ERROR] Scheduler HTTP trigger error: {e}")

@app.on_event("startup")
async def start_scheduler():
    asyncio.create_task(run_scheduler())

# CORS configuration for frontend connection
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://slt-nexus-multi-ai-agent-project.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for hackathon demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session storage (For demo purposes)
# Key: session_id, Value: List of messages
sessions = {}

class RegisterRequest(BaseModel):
    name: str
    nic: str
    mobile: str
    email: Optional[str] = None
    address: Optional[str] = "Unknown"

@app.post("/api/register")
async def register_new_customer(req: RegisterRequest):
    import sqlite3
    import uuid
    import os
    from datetime import datetime
    
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if already registered
        cursor.execute("SELECT slt_number FROM new_connections WHERE mobile_number=?", (req.mobile,))
        existing = cursor.fetchone()
        if existing:
            conn.close()
            return {"status": "success", "slt_number": existing[0], "message": "Already registered"}
            
        cursor.execute("SELECT COUNT(*) FROM new_connections")
        count = cursor.fetchone()[0]
        
        new_slt_number = f"0112896{str(count + 1).zfill(3)}"
        connection_id = f"SLT-NC-{str(uuid.uuid4())[:8].upper()}"
        
        cursor.execute('''
            INSERT INTO new_connections (connection_id, mobile_number, slt_number, name, address, id_number, package, payment_status, kyc_status, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (connection_id, req.mobile, new_slt_number, req.name, req.address, req.nic, "Not Selected", "Pending", "Pending", "Lead", datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return {"status": "success", "slt_number": new_slt_number, "message": "Registered successfully"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    lang: Optional[str] = "si"
    image_base64: Optional[str] = None
    is_admin: Optional[bool] = False
    agent_name: Optional[str] = "liya_agent"
    agent_name: Optional[str] = "liya_agent"

class GestureRequest(BaseModel):
    image_base64: str

@app.post("/api/analyze_gesture")
async def analyze_gesture_endpoint(req: GestureRequest):
    """Takes a base64 frame from the webcam and returns the detected gesture."""
    gesture = detect_sign_language(req.image_base64)
    return {"gesture": gesture}

class TTSRequest(BaseModel):
    text: str
    lang: Optional[str] = None
    voice: Optional[str] = None  # "male" or "female" (default: female)

class ChatResponse(BaseModel):
    response: str
    session_id: str
    agent_used: str = "general_agent"
    agent_emoji: str = "👋"
    agent_label: str = "LIYA"
    intent: str = ""

@app.get("/")
async def health_check():
    return {
        "status": "online", 
        "agent": "LIYA", 
        "system": "SLT NEXUS",
        "azure_speech_active": HAS_AZURE_SPEECH
    }

# --- /api/admin/* proxy routes (frontend calls /api/admin/* but mocks router is at /mocks/admin/*) ---
from backend.mocks import (
    get_admin_tickets, get_admin_technicians, get_admin_dps,
    get_admin_ledger, get_all_customers, get_admin_customer, get_admin_usage, get_admin_billing, resolve_admin_ticket, get_predictive_degradation,
    get_new_connections
)

@app.get("/api/admin/tickets")
async def proxy_admin_tickets():
    return await get_admin_tickets()

@app.get("/api/admin/new-connections")
async def proxy_new_connections():
    return await get_new_connections()

@app.post("/api/admin/resolve_ticket/{ticket_id}")
async def proxy_resolve_ticket(ticket_id: str):
    return await resolve_admin_ticket(ticket_id)

@app.post("/api/admin/approve_connection/{conn_id}")
async def proxy_approve_connection(conn_id: str):
    import httpx
    async with httpx.AsyncClient() as client:
        # Internal call to the mock router
        res = await client.post(f"http://localhost:8000/mocks/wfm/approve-connection/{conn_id}")
        return res.json()

@app.get("/api/admin/predictions")
async def proxy_predictions():
    return await get_predictive_degradation()


@app.get("/api/admin/churn-predictions")
async def get_churn_predictions_api():
    import sqlite3
    import os
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Select only active At Risk predictions
        cursor.execute("SELECT phone_number, registered_name, risk_score, reasons FROM churn_predictions WHERE status = 'At Risk'")
        rows = cursor.fetchall()
        
        results = []
        import json
        for r in rows:
            results.append({
                "phone": r[0],
                "name": r[1],
                "risk_score": round(r[2], 1),
                "reasons": json.loads(r[3])
            })
            
        conn.close()
        return {"status": "success", "data": results}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/admin/customer/{phone}/churn_profile")
async def get_churn_profile_api(phone: str):
    import sqlite3
    import os
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone,))
        cust = dict(cursor.fetchone() or {})
        
        cursor.execute("SELECT * FROM network_status WHERE phone_number = ?", (phone,))
        net = dict(cursor.fetchone() or {})
        
        cursor.execute("SELECT month, year, amount_billed, amount_paid, arrears FROM billing_history WHERE phone_number = ? ORDER BY id ASC", (phone,))
        billing = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT month, year, used_data_gb, total_data_gb FROM monthly_usage_history WHERE phone_number = ? ORDER BY id ASC", (phone,))
        usage = [dict(r) for r in cursor.fetchall()]
        
        cursor.execute("SELECT fault_date, issue_type, resolution_time_hrs, snr_at_fault, power_at_fault FROM historical_faults WHERE phone_number = ? ORDER BY id ASC", (phone,))
        faults = [dict(r) for r in cursor.fetchall()]
        
        conn.close()
        
        # Calculate risk based on rules
        is_high_risk = len(faults) > 2 or (len(billing) > 0 and billing[-1]['amount_paid'] == 0)
        risk_level = "High" if is_high_risk else "Low"
        comment = "Customer is exhibiting severe churn signals: multiple unresolved network issues and dropping data usage." if is_high_risk else "Customer profile is stable. Normal usage patterns detected."
        
        return {
            "status": "success",
            "profile": cust,
            "network": net,
            "billing_history": billing[-12:], # Last 12
            "usage_history": usage[-3:],      # Last 3
            "faults_history": faults,
            "churn_analysis": {
                "risk_level": risk_level,
                "score": 92 if is_high_risk else 15,
                "comment": comment
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/admin/technicians")
async def proxy_admin_technicians():
    return await get_admin_technicians()

@app.get("/api/admin/dps")
async def proxy_admin_dps():
    return await get_admin_dps()

@app.get("/api/admin/ledger")
async def proxy_admin_ledger():
    return await get_admin_ledger()

@app.get("/api/admin/customers")
async def proxy_admin_customers():
    return await get_all_customers()

@app.get("/api/admin/customer/{phone}")
async def proxy_admin_customer(phone: str):
    return await get_admin_customer(phone)

@app.get("/api/admin/usage/{phone}")
async def proxy_admin_usage(phone: str):
    return await get_admin_usage(phone)

@app.get("/api/admin/billing/{phone}")
async def proxy_admin_billing(phone: str):
    return await get_admin_billing(phone)

AGENT_INFO = {
    "liya_agent": {"label": "LIYA", "emoji": "🧠"},
    "signa_agent": {"label": "Signa", "emoji": "🤟"},
    "oracle_agent": {"label": "Oracle", "emoji": "🔮"},
    "pathfinder_agent": {"label": "Pathfinder", "emoji": "📍"},
    "pulse_agent": {"label": "Pulse", "emoji": "💓"},
    "insight_agent": {"label": "Insight", "emoji": "👁️"},
    "spark_agent": {"label": "Spark", "emoji": "⚡"},
    "guardian_agent": {"label": "Guardian", "emoji": "🛡️"},
    "vault_agent": {"label": "Vault", "emoji": "🔗"},
    "provisioner_agent": {"label": "Provisioner", "emoji": "🔌"},
    "analyzer_agent": {"label": "Analyzer", "emoji": "🔍"},
    "messenger_agent": {"label": "Messenger", "emoji": "✉️"},
}


@app.get("/api/admin/profile/{phone}")
async def proxy_get_full_customer_profile(phone: str):
    import backend.agent.tools.mcp_tools as mcp_tools
    result = mcp_tools.get_full_customer_profile(phone)
    return {"response": result}

@app.post("/api/knowledgebase/search")
async def proxy_search_knowledgebase(query: dict):
    q = query.get("query", "")
    import backend.agent.tools.mcp_tools as mcp_tools
    result = mcp_tools.search_slt_knowledgebase(q)
    return {"response": result}

@app.post("/api/chat_stream")
async def chat_stream_endpoint(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    history = sessions[session_id]
    
    messages = []
    
    if request.is_admin:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with an INTERNAL SLT OFFICE STAFF MEMBER (Admin). "
            f"1. They have full security clearance. "
            f"2. You MUST provide full raw technical details (DP Box, Loop IDs, SNR, Attenuation, MAC addresses) when asked. "
            f"3. The staff member can ask about ANY customer number. If they provide a number in the chat, use that. NEVER make up or hallucinate phone numbers! Real SLT landline numbers start with 0112 (e.g., 0112895800), NEVER 0122 or similar invalid codes. "
            f"4. The current session_id ({session_id}) is an INTERNAL TRACKING ID, NOT a phone number! If they ask for specific customer details (bill, profile), ask for the 10-digit number. BUT if they ask for internal system reports (WFM reports, dispatch data, general stats), DO NOT ask for a phone number! Just generate the report. "
            f"5. ADMIN MODE: Do NOT summarize. If the admin asks for details, use the tools and print the full raw diagnostic and profile data. "
            f"6. PRONUNCIATION RULE: When speaking Sinhala, ALWAYS read the digit '0' as 'binduwa' (බිංදුව) and NEVER as 'shunyai' (ශුන්‍යය). For example, 0112 should be read as 'binduwa ekayi ekayi dekak'. "
            f"7. CRITICAL TOOL ASSIGNMENT: Use the 'get_full_customer_profile' tool to instantly fetch ALL technical, network, billing, and usage data for a customer. Use this whenever the admin asks to check a customer!\n"
            f"8. ADMIN IDENTITY: The Admin you are talking to is named 'Ravindu'. Always greet him as Ravindu when confirming a major action.\n"
            f"9. DISPATCHING TECHS: If Ravindu asks to send a technician for a new connection or fault, use the `dispatch_technician_admin` tool. Provide the SLT Number and the Tech Name.\n"
            f"10. FINALIZING CONNECTIONS: If Ravindu says the job is done and asks to update the system, use the `finalize_admin_approval` tool. Once successful, reply EXACTLY with 'Ah Ravindu, it is done' (or in Sinhala 'ආ රවිඳු, මම වැඩේ ඉවර කළා. Blockchain එකටත් ලියලා, Customer ව Active ලිස්ට් එකට දැම්මා').\n"
            f"11. ORACLE PREDICTIONS: If Ravindu asks to 'scan the network for future faults' or 'show vulnerable lines', use `generate_predictive_faults` tool. If he says he 'fixed those predicted faults' or asks to 'clear the page', use `clear_predictive_faults` tool.\\n"
            f"12. DAILY FAULTS & DISPATCH: If Ravindu asks to 'pull today's faults' or 'show today's tickets', use `generate_daily_faults` to get 50 new faults. If he says 'Assign these faults to their area technicians', use the `auto_dispatch_technicians_by_area` tool to assign them and increment their active load in the Dispatch Center.\\n"
            f"13. BULK FAULT RESOLUTION: If Ravindu says 'All faults are done', 'Faults iwarai', or asks to clear the fault matrix, use the `resolve_all_faults_admin` tool. This tool resolves all active faults, resets technicians to 0 (leaving a few active for realism), and generates a blockchain hash.\\n"
            f"13.5. CUSTOMER APP FAULTS: If Ravindu asks to simulate a customer submitting a fault via the Customer App, use `simulate_customer_app_fault`. They will appear highlighted on the board.\\n"
            f"14. CABLE CUT / MAJOR OUTAGE RESOLUTION: If Ravindu says 'The cut cable is fixed', 'eka hari', 'Network eka samanya karanna' while referring to a Pathfinder alarm or cable cut, use the `resolve_major_outage` tool. This stops the UI alarm loop, simulates sending SMS to customers, emails a detailed damage report with financial loss to aravindaslt@gmail.com, and logs it to blockchain. IMPORTANT: After running the tool, reply in Sinhala to Ravindu saying: 'ආ රවිඳු, මම අදාළ පාරිභෝගිකයින්ට SMS එක යැව්වා. අලුත්වැඩියා අලාභ වාර්තාව (Damage Report) ඔයාගේ Email එකට දැම්මා. Network එක සාමාන්‍ය තත්ත්වයට පත් කරලා Blockchain එකටත් Update කළා!'\\n"
            f"15. CHURN PREDICTION: If Ravindu asks to 'find customers who might leave soon', use `generate_churn_predictions`. If he says 'I gave them an offer/solution', use `resolve_churn_risk` to clear them from the board and log to blockchain.\\n"
            f"16. ALWAYS refer to technicians as 'තාක්ෂණ ශිල්පියා' (Thakshana shilpiya). DO NOT USE 'තාක්ෂණිකයා' or 'කාර්මිකයා'!\\n"
        )
    else:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with a CUSTOMER (B2C). "
            f"1. You MUST NEVER provide raw technical details like DP Box, Loop IDs, SNR, or Attenuation. Keep answers simple. "
            f"2. SECURITY RULE: The customer's authenticated phone number is exactly {session_id}. "
            f"3. You are STRICTLY FORBIDDEN from providing details, usage, bills, or tickets for ANY other phone number. If they ask about another number, politely refuse. "
            f"4. Do not ask for their phone number again, use {session_id} automatically for all tool calls. \n"
            f"5. IMPORTANT: If the customer reports a hardware fault (like router issue, red light) WITHOUT a photo, ACT LIKE A HIGH-TECH AI AGENT! Say \"Initiating remote diagnostic protocol...\" in their language, then ask them to upload a photo of the router for AI visual analysis. Make it sound extremely advanced and robotic!\n"
            f"6. RAG KNOWLEDGE RULE: You MUST use the 'search_slt_knowledgebase' tool when asked about SLT products, broadband, packages, prices, or general questions. Do NOT hallucinate answers!"
        )
    
    try:
        import sqlite3
        import os
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slt_dummy.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT memory_summary FROM user_memory WHERE phone_number = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            context_msg += f"\\n\\nLONG-TERM AI MEMORY FOR THIS USER: {row[0]}"
    except Exception as e:
        pass

    from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
    import json
    
    messages.append(SystemMessage(content=context_msg))    
    messages.extend(history[-6:])
            
    if request.image_base64:
        import backend.agent.tools.mcp_tools as mcp_tools
        mcp_tools.latest_image_cache[session_id] = f"data:image/jpeg;base64,{request.image_base64}"
        multimodal_content = [
            {"type": "text", "text": request.message},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{request.image_base64}"}}
        ]
        user_msg = HumanMessage(content=multimodal_content)
    else:
        user_msg = HumanMessage(content=censor_profanity(request.message))

    messages.append(user_msg)
    history.append(user_msg)
    
    sessions[session_id] = history[-6:]
    
    # --- START FAST PATH (Server-side 0-latency bypass) ---
    import re
    clean_msg = re.sub(r'[^\w\s]', '', request.message.lower().strip())
    
    # 0. Instant Greeting Bypass
    greetings = ["hi", "hello", "hi neo", "hi liya", "hello neo", "hello liya", "hey", "test", "හලෝ", "හායි", "කොහොමද"]
    if clean_msg in greetings:
        async def greeting_generator():
            yield f"data: {json.dumps({'text': '', 'session_id': session_id, 'agent_used': request.agent_name})}\n\n"
            if request.lang == "si":
                greeting_text = "ආයුබෝවන්! මම SLT-MOBITEL NEXUS. මම ඔබට උදව් කරන්නේ කෙසේද?"
            elif request.lang == "ta":
                greeting_text = "வணக்கம்! நான் SLT-MOBITEL NEXUS. நான் உங்களுக்கு எப்படி உதவ முடியும்?"
            else:
                greeting_text = "Hello! I am SLT-MOBITEL NEXUS. How can I help you today?"
            yield f"data: {json.dumps({'text': greeting_text})}\n\n"
            yield "data: [DONE]\n\n"
        sessions[session_id].append(AIMessage(content="Hello! How can I help you?"))
        return StreamingResponse(greeting_generator(), media_type="text/event-stream")

    from backend.agent.graph import extract_phone_number
    existing_phone = extract_phone_number(request.message)
    if not existing_phone:
        existing_phone = session_id if not request.is_admin else None

    # 1. Missing Phone Bypass for Admin
    missing_phone = False
    if request.is_admin and not existing_phone:
        requires_phone_keywords = ["tid", "bill", "usage", "profile", "fault", "dp", "loop", "customer", "slt", "check"]
        if any(kw in clean_msg for kw in requires_phone_keywords):
            missing_phone = True

    if missing_phone:
        async def fast_generator():
            reply = "Please provide the SLT phone number to check." if request.lang == "en" else "කරුණාකර පරීක්ෂා කිරීමට අවශ්‍ය SLT දුරකථන අංකය ලබාදෙන්න."
            yield f"data: {json.dumps({'text': '', 'session_id': session_id, 'agent_used': agent_name})}\n\n"
            yield f"data: {json.dumps({'text': reply})}\n\n"
            yield "data: [DONE]\n\n"
            
        sessions[session_id].append(AIMessage(content="Please provide the SLT phone number to check."))
        return StreamingResponse(fast_generator(), media_type="text/event-stream")
    # --- END FAST PATH ---

    async def event_generator():
        from backend.agent.graph import get_graph
        graph = get_graph()
        
        state = {
            "messages": messages,
            "current_agent": "liya_agent",
            "phone_number": session_id if not request.is_admin else None,
            "user_language": request.lang or "si"
        }
        
        try:
            # Bypass Vercel 10s TTFB Timeout by yielding an immediate chunk, and pass session data
            initial_data = {
                "text": "",
                "session_id": session_id,
                "agent_used": agent_name
            }
            yield f"data: {json.dumps(initial_data)}\n\n"
            
            final_content = ""
            async for event in graph.astream_events(state, version="v2"):
                kind = event["event"]
                if kind == "on_chat_model_stream":
                    tags = event.get("tags", [])
                    if "agent_llm_call" in tags:
                        chunk = event["data"]["chunk"]
                        if chunk.content and isinstance(chunk.content, str):
                            final_content += chunk.content
                            data = json.dumps({"text": chunk.content})
                            yield f"data: {data}\n\n"
                        
            if final_content:
                sessions[session_id].append(AIMessage(content=final_content))
                
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            err = json.dumps({"error": str(e)})
            yield f"data: {err}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    history = sessions[session_id]
    
    # Rebuild history
    messages = []
    
    # Inject Context and Memory based on Admin/Customer Role
    if request.is_admin:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with an INTERNAL SLT OFFICE STAFF MEMBER (Admin). "
            f"1. They have full security clearance. "
            f"2. You MUST provide full raw technical details (DP Box, Loop IDs, SNR, Attenuation, MAC addresses) when asked. "
            f"3. The staff member can ask about ANY customer number. If they provide a number in the chat, use that. "
            f"4. The current session_id ({session_id}) is an INTERNAL TRACKING ID, NOT a phone number! If they ask for specific customer details (bill, profile), ask for the 10-digit number. BUT if they ask for internal system reports (WFM reports, dispatch data, general stats), DO NOT ask for a phone number! Just generate the report. "
            f"5. ADMIN MODE: Do NOT summarize. If the admin asks for details, use the tools and print the full raw diagnostic and profile data. "
            f"6. CRITICAL TOOL ASSIGNMENT: Use the 'get_full_customer_profile' tool to instantly fetch ALL technical, network, billing, and usage data for a customer. Use this whenever the admin asks to check a customer!\n"
            f"8. ADMIN IDENTITY: The Admin you are talking to is named 'Ravindu'. Always greet him as Ravindu when confirming a major action.\n"
            f"9. DISPATCHING TECHS: If Ravindu asks to send a technician for a new connection or fault, use the `dispatch_technician_admin` tool. Provide the SLT Number and the Tech Name. Once successful, reply EXACTLY with 'Yes Ravindu, I have dispatched technician [Tech Name] for [Number]'.\n"
            f"10. FINALIZING CONNECTIONS: If Ravindu says the job is done and asks to update the system, use the `finalize_admin_approval` tool. Once successful, reply EXACTLY with 'Ah Ravindu, it is done' (or in Sinhala 'ආ රවිඳු, මම වැඩේ ඉවර කළා. Blockchain එකටත් ලියලා, Customer ව Active ලිස්ට් එකට දැම්මා').\n"
            f"11. ORACLE PREDICTIONS: If Ravindu asks to 'scan the network for future faults' or 'show vulnerable lines', use `generate_predictive_faults` tool. If he says he 'fixed those predicted faults' or asks to 'clear the page', use `clear_predictive_faults` tool.\n"
            f"12. DAILY FAULTS & DISPATCH: If Ravindu asks to 'pull today's faults' or 'show today's tickets', use `generate_daily_faults` to get 50 new faults. If he says 'Assign these faults to their area technicians', use the `auto_dispatch_technicians_by_area` tool to assign them and increment their active load in the Dispatch Center.\\n"
            f"13. BULK FAULT RESOLUTION: If Ravindu says 'All faults are done', 'Faults iwarai', or asks to clear the fault matrix, use the `resolve_all_faults_admin` tool. This tool resolves all active faults, resets technicians to 0 (leaving a few active for realism), and generates a blockchain hash.\\n"
            f"13.2. SINGLE FAULT RESOLUTION: If Ravindu says a specific fault or ticket is fixed, use the `resolve_fault_admin` tool. Once successful, reply EXACTLY with 'Ah Ravindu, I have resolved the ticket and logged it to the blockchain'.\\n"
            f"13.5. CUSTOMER APP FAULTS: If Ravindu asks to simulate a customer submitting a fault via the Customer App, use `simulate_customer_app_fault`. They will appear highlighted on the board.\\n"
            f"14. CABLE CUT / MAJOR OUTAGE RESOLUTION: If Ravindu says 'The cut cable is fixed', 'eka hari', 'Network eka samanya karanna' while referring to a Pathfinder alarm or cable cut, use the `resolve_major_outage` tool. This stops the UI alarm loop, simulates sending SMS to customers, emails a detailed damage report with financial loss to aravindaslt@gmail.com, and logs it to blockchain. IMPORTANT: After running the tool, reply in Sinhala to Ravindu saying: 'ආ රවිඳු, මම අදාළ පාරිභෝගිකයින්ට SMS එක යැව්වා. අලුත්වැඩියා අලාභ වාර්තාව (Damage Report) ඔයාගේ Email එකට දැම්මා. Network එක සාමාන්‍ය තත්ත්වයට පත් කරලා Blockchain එකටත් Update කළා!'\n"
            f"15. CHURN PREDICTION: If Ravindu asks about 'customers at risk of churning', 'leaving', 'disconnect', or 'risk', use the `get_churn_predictions` tool. This tool fetches the top 5 customers at highest risk of disconnecting. After running the tool, explain the reasons in Sinhala (e.g. 'මේ අයගේ අන්තර්ජාල භාවිතය අඩුවෙලා, බිල් ගෙවලා නෑ, සහ පරණ Faults ගොඩක් තියෙනවා').\n"        )
    else:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with a CUSTOMER (B2C). "
            f"1. You MUST NEVER provide raw technical details like DP Box, Loop IDs, SNR, or Attenuation. Keep answers simple. "
            f"2. SECURITY RULE: The customer's authenticated phone number is exactly {session_id}. "
            f"3. You are STRICTLY FORBIDDEN from providing details, usage, bills, or tickets for ANY other phone number. If they ask about another number, politely refuse. "
            f"4. Do not ask for their phone number again, use {session_id} automatically for all tool calls. \n"
            f"5. IMPORTANT: If the customer reports a hardware fault (like router issue, red light) WITHOUT a photo, ACT LIKE A HIGH-TECH AI AGENT! Say \"Initiating remote diagnostic protocol...\" in their language, then ask them to upload a photo of the router for AI visual analysis. Make it sound extremely advanced and robotic!\n"
            f"6. RAG KNOWLEDGE RULE: You MUST use the 'search_slt_knowledgebase' tool when asked about SLT products, broadband, packages, prices, or general questions. Do NOT hallucinate answers!"
        )
    
    try:
        import sqlite3
        import os
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'slt_dummy.db')
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT memory_summary FROM user_memory WHERE phone_number = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            context_msg += f"\n\nLONG-TERM AI MEMORY FOR THIS USER: {row[0]}"
    except Exception as e:
        pass

    messages.append(SystemMessage(content=context_msg))    
    # Memory Truncation: Keep only the last 6 messages to prevent OpenAI Token Explosion (429 errors)
    messages.extend(history[-6:])
            
    # Current message with optional Vision Support
    if request.image_base64:
        import backend.agent.tools.mcp_tools as mcp_tools
        mcp_tools.latest_image_cache[session_id] = f"data:image/jpeg;base64,{request.image_base64}"
        # LangChain Multimodal Format
        multimodal_content = [
            {"type": "text", "text": request.message},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{request.image_base64}"}}
        ]
        user_msg = HumanMessage(content=multimodal_content)
    else:
        user_msg = HumanMessage(content=censor_profanity(request.message))

    messages.append(user_msg)

    try:
        import asyncio
        max_retries = 3
        result = None
        for attempt in range(max_retries):
            try:
                # Invoke our 12-Agent swarm brain!
                result = await get_graph().ainvoke({
                    "messages": messages,
                    "current_agent": request.agent_name,
                    "user_language": request.lang or "si",  # Default to Sinhala
                    "is_admin": request.is_admin,
                    "phone_number": session_id if not request.is_admin else None
                })
                break
            except Exception as loop_e:
                if "429" in str(loop_e) and attempt < max_retries - 1:
                    print(f"Rate limit hit. Retrying in 2 seconds... (Attempt {attempt + 1}/{max_retries})")
                    await asyncio.sleep(2)
                else:
                    raise loop_e
                    
        ai_message = result["messages"][-1]
        # Censor AI response to prevent bad words being generated/spoken
        ai_response = censor_profanity(ai_message.content)
        
        # Extract active agent metadata
        current_agent = result.get("current_agent", "liya_agent")
        info = AGENT_INFO.get(current_agent, {"label": "LIYA", "emoji": "🧠"})
        
        agent_used = current_agent
        agent_emoji = info["emoji"]
        agent_label = info["label"]
        
        history.append(user_msg)
        history.append(AIMessage(content=ai_response))
        sessions[session_id] = history[-6:]

        return ChatResponse(
            response=ai_response,
            session_id=session_id,
            agent_used=agent_used,
            agent_emoji=agent_emoji,
            agent_label=agent_label
        )

    except Exception as e:
        print(f"Error in LangGraph: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

def enhance_sinhala_pronunciation(text: str) -> str:
    """
    Apply Sinhala-specific pronunciation fixes for TTS engines.
    Converts common misread patterns into phonetically clearer equivalents.
    """
    if not text:
        return text
    
    # 1. Fix numbers with units — add natural pauses
    # Convert any currency prefix with decimals to "රුපියල් X යි සත Y"
    text = re.sub(r'(Rs\.?|LKR|රු\.|රුපියල්)\s*([\d,]+)\.(\d{1,2})', r'රුපියල් \2 යි සත \3', text, flags=re.IGNORECASE)
    
    # Convert whole rupees (no cents)
    text = re.sub(r'(Rs\.?|LKR|රු\.|රුපියල්)\s*([\d,]+)(?!\.)', r'රුපියල් \2', text, flags=re.IGNORECASE)
    
    # 1.6 Fix Dates YYYY-MM-DD
    text = re.sub(r'\b(\d{4})-(\d{2})-(\d{2})\b', r'\1 වසරේ \2 වෙනි මාසෙ \3 වෙනිදා', text)
    text = re.sub(r'\b(\d{4})/(\d{2})/(\d{2})\b', r'\1 වසරේ \2 වෙනි මාසෙ \3 වෙනිදා', text)
    
    # 1.7 Fix Decimals with commas support (fallback for non-currency decimals)
    def replace_decimals(match):
        return f"{match.group(1).replace(',', '')} දශම {match.group(2)}"
    text = re.sub(r'([\d,]+)\.(\d+)', replace_decimals, text)
    
    # 2. Fix "Mbps" and other speed/size metrics
    text = re.sub(r'(\d+)\s*Mbps', r'\1 Megabits per second', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*Kbps', r'\1 Kilobits per second', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*GB', r'\1 ගිගා බයිට්', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*MB', r'\1 මෙගා බයිට්', text, flags=re.IGNORECASE)
    
    # 3. Fix emoji characters
    text = re.sub(r'[\U0001F600-\U0001F9FF\U00002702-\U000027B0\U0001F1E0-\U0001F1FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF]', '', text)
    
    # 4. Fix URL-like patterns
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)
    
    # 4.5 Acronym and Brand Pronunciation fixes
    # Use word boundaries or dot boundaries to catch S.L.T. as well
    text = re.sub(r'\bS\.?L\.?T\.?\b', 'එස් එල් ටී', text, flags=re.IGNORECASE)
    text = re.sub(r'\bMOBITEL\b', 'මොබිටෙල්', text, flags=re.IGNORECASE)
    text = re.sub(r'\bNXC\b', 'එන් එක්ස් සී', text, flags=re.IGNORECASE)
    text = re.sub(r'\bWFM\b', 'ඩබ්ලිව් එෆ් එම්', text, flags=re.IGNORECASE)
    text = re.sub(r'\bDP\b', 'ඩීපී', text, flags=re.IGNORECASE)
    text = re.sub(r'\bSNR\b', 'එස් එන් ආර්', text, flags=re.IGNORECASE)
    text = re.sub(r'\bPEO\b', 'පියෝ', text, flags=re.IGNORECASE)
    text = re.sub(r'\bTV\b', 'ටීවී', text, flags=re.IGNORECASE)
    
    # Word specific fixes for Azure TTS Sinhala mispronunciations
    text = re.sub(r'\b[Bb]ill\b', 'බිල්', text)
    text = re.sub(r'බිල්', 'බිල් ', text) # Add space after 'බිල්' to prevent TTS blending it incorrectly
    
    # 5. Fix numbered lists (1. 2. 3.) — add slight pauses
    text = re.sub(r'(\d+)\.\s+', r'\1, ', text)
    
    # 6. Fix excessive punctuation
    text = re.sub(r'[!]{2,}', '!', text)
    text = re.sub(r'[?]{2,}', '?', text)
    text = re.sub(r'\.{2,}', '.', text)
    
    # 7. Fix "e.g." and "i.e." patterns that confuse Sinhala TTS
    text = text.replace("e.g.", "for example")
    text = text.replace("i.e.", "that is")
    
    # 8. Clean trailing/leading whitespace artifacts
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text


import azure.cognitiveservices.speech as speechsdk

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Clean text first
    clean_text = censor_profanity(request.text.replace("**", "").replace("*", "").replace("#", ""))
    
    # Remove emojis so TTS doesn't read them out loud (e.g. "smiling face")
    clean_text = re.sub(r'[\U0001F600-\U0001F9FF\U00002702-\U000027B0\U0001F1E0-\U0001F1FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF]', '', clean_text)
    
    # Language detection
    frontend_lang = request.lang
    has_sinhala = any('\u0d80' <= char <= '\u0dff' for char in clean_text)
    has_tamil = any('\u0b80' <= char <= '\u0bff' for char in clean_text)
    
    if has_sinhala:
        target_lang = 'si'
    elif has_tamil:
        target_lang = 'ta'
    elif frontend_lang in ['si', 'ta', 'en']:
        target_lang = frontend_lang
    else:
        target_lang = 'si'
        
    # Apply telecom term normalization and phonetic spellings based on target language
    clean_text = normalize_telecom_terms(clean_text, target_lang)
    
    # Determine gender for voice selection (default: female for backward compatibility)
    use_male_voice = (request.voice or "").lower() == "male"

    if target_lang == 'si':
        clean_text = enhance_sinhala_pronunciation(clean_text)
        voice_name = "si-LK-SameeraNeural" if use_male_voice else "si-LK-ThiliniNeural"
        lang_code = "si-LK"
    elif target_lang == 'ta':
        # Use premium Indian Tamil voices for better quality than LK if needed, or stick to LK
        voice_name = "ta-IN-ValluvarNeural" if use_male_voice else "ta-IN-PallaviNeural"
        lang_code = "ta-IN"
    else:
        # English: Use Aria/Davis for very natural, beautiful voices
        voice_name = "en-US-DavisNeural" if use_male_voice else "en-US-AriaNeural"
        lang_code = "en-US"

    import html
    # Escape special XML characters in the plain text first to ensure valid SSML
    escaped_text = html.escape(clean_text)
    
    # Format mixed English phrases inside Sinhala/Tamil text with <lang> tags
    processed_text = format_mixed_languages(escaped_text, target_lang)
    
    # Construct a valid SSML payload
    ssml_text = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang_code}">
        <voice name="{voice_name}">
            <prosody rate="-10%">
                {processed_text}
            </prosody>
        </voice>
    </speak>"""

    def generate_gtts_fallback(text_to_speak: str, target_l: str) -> Response:
        """Helper to generate a keyless, free TTS response using gTTS in case Azure is unavailable."""
        try:
            print(f"[INFO] [FALLBACK] Generating gTTS audio for: {target_l}...")
            from gtts import gTTS
            import io
            tts = gTTS(text=text_to_speak, lang=target_l)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return Response(content=fp.read(), media_type="audio/mpeg")
        except Exception as e:
            print(f"[ERROR] gTTS Fallback failed: {e}")
            raise HTTPException(status_code=500, detail=f"TTS synthesis completely failed: {e}")

    # --- 1. Microsoft Azure TTS ---
    azure_speech_key = os.getenv("AZURE_SPEECH_KEY")
    azure_region = os.getenv("AZURE_SPEECH_REGION", "eastus")
    
    if azure_speech_key:
        print(f"[INFO] GENERATING AZURE TTS AUDIO FOR: {target_lang}...")
        try:
            speech_config = speechsdk.SpeechConfig(subscription=azure_speech_key, region=azure_region)
            speech_config.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Riff24Khz16BitMonoPcm)
            
            # Since we want to return the raw bytes, we can just use speak_ssml_async and get result.audio_data
            speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=None)
            result = speech_synthesizer.speak_ssml_async(ssml_text).get()
            
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                audio_data = result.audio_data
                return Response(content=audio_data, media_type="audio/wav")
            else:
                print(f"[WARNING] Azure TTS Error: {result.reason}")
        except Exception as e:
            print(f"[ERROR] Azure Speech Generation failed: {e}")

    # --- 2. Free gTTS Fallback ---
    print(f"[INFO] FALLING BACK TO FREE GOOGLE TTS (gTTS) FOR: {target_lang}...")
    return generate_gtts_fallback(clean_text, target_lang)

@app.get("/api/account/{phone_number}")
async def get_account_details(phone_number: str):
    import sqlite3
    DB_PATH = os.path.join(os.path.dirname(__file__), "slt_dummy.db")
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # 1. Customer Name
        cursor.execute("SELECT * FROM customers WHERE phone_number = ?", (phone_number,))
        customer = cursor.fetchone()
        if not customer:
            conn.close()
            return {"error": "Not Found"}
            
        # 2. Billing (with credit limit mock)
        cursor.execute("SELECT * FROM billing WHERE phone_number = ?", (phone_number,))
        billing_row = cursor.fetchone()
        billing = dict(billing_row) if billing_row else {}
        if billing:
            billing["credit_limit"] = 5000.00
            
        # 3. Data Usage
        cursor.execute("SELECT * FROM data_usage WHERE phone_number = ?", (phone_number,))
        usage_row = cursor.fetchone()
        data_usage = dict(usage_row) if usage_row else {}
        
        # 4. Billing History
        cursor.execute("SELECT month, year, amount_billed, amount_paid, arrears FROM billing_history WHERE phone_number = ? ORDER BY id ASC", (phone_number,))
        history_rows = cursor.fetchall()
        billing_history = [dict(row) for row in history_rows]
        
        # 5. Daily Usage Logs
        cursor.execute("SELECT log_date, google_gb, facebook_gb, youtube_gb, amazon_gb, tiktok_gb, total_gb FROM daily_usage_logs WHERE phone_number = ? ORDER BY log_date ASC", (phone_number,))
        daily_rows = cursor.fetchall()
        daily_logs = [dict(row) for row in daily_rows]
        
        conn.close()
        
        return {
            "phone_number": customer["phone_number"],
            "customer_name": customer["registered_name"],
            "billing": billing,
            "data_usage": data_usage,
            "billing_history": billing_history,
            "daily_logs": daily_logs
        }
    except Exception as e:
        print(f"Error in /api/account: {e}")
        return {"error": "Internal Server Error"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)