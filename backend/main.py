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

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    lang: Optional[str] = "si"
    image_base64: Optional[str] = None
    is_admin: Optional[bool] = False

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
    get_admin_ledger, get_all_customers, get_admin_customer, get_admin_usage, get_admin_billing, resolve_admin_ticket, get_predictive_degradation
)

@app.get("/api/admin/tickets")
async def proxy_admin_tickets():
    return await get_admin_tickets()

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
            f"5. GREETING RULE: Do NOT use customer greetings like 'Ayubowan'. Use a professional internal greeting. "
            f"6. CONCISENESS RULE: ONLY provide the EXACT information requested."
        )
    else:
        context_msg = (
            f"IMPORTANT SECURITY CONTEXT: You are communicating with a CUSTOMER (B2C). "
            f"1. You MUST NEVER provide raw technical details like DP Box, Loop IDs, SNR, or Attenuation. Keep answers simple. "
            f"2. SECURITY RULE: The customer's authenticated phone number is exactly {session_id}. "
            f"3. You are STRICTLY FORBIDDEN from providing details, usage, bills, or tickets for ANY other phone number. If they ask about another number, politely refuse. "
            f"4. Do not ask for their phone number again, use {session_id} automatically for all tool calls."
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
    messages.extend(history)
            
    # Current message with optional Vision Support
    if request.image_base64:
        # LangChain Multimodal Format
        multimodal_content = [
            {"type": "text", "text": request.message},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{request.image_base64}"}}
        ]
        messages.append(HumanMessage(content=multimodal_content))
    else:
        messages.append(HumanMessage(content=request.message))

    try:
        # Invoke our 12-Agent swarm brain!
        result = await get_graph().ainvoke({
            "messages": messages,
            "user_language": request.lang or "si",  # Default to Sinhala
            "is_admin": request.is_admin
        })
        ai_message = result["messages"][-1]
        # Censor AI response to prevent bad words being generated/spoken
        ai_response = censor_profanity(ai_message.content)
        
        # Extract active agent metadata
        current_agent = result.get("current_agent", "liya_agent")
        info = AGENT_INFO.get(current_agent, {"label": "LIYA", "emoji": "🧠"})
        
        agent_used = current_agent
        agent_emoji = info["emoji"]
        agent_label = info["label"]
        
        sessions[session_id] = result["messages"]

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
    text = re.sub(r'Rs\.?\s*([\d,]+)', r'රුපියල් \1', text, flags=re.IGNORECASE)
    text = re.sub(r'LKR\s*([\d,]+)', r'රුපියල් \1', text, flags=re.IGNORECASE)
    
    # 1.5 Convert decimal rupees to "සත" (cents) instead of reading as decimals
    def replace_cents(match):
        prefix = match.group(1).strip()
        rupees = match.group(2).replace(",", "")
        cents = match.group(3)
        return f"{prefix} {rupees} යි සත {cents}"
    text = re.sub(r'(රුපියල්)\s*([\d,]+)\.(\d{1,2})', replace_cents, text)
    
    # 1.6 Fix Dates YYYY-MM-DD
    text = re.sub(r'\b(\d{4})-(\d{2})-(\d{2})\b', r'\1 වසරේ \2 වෙනි මාසෙ \3 වෙනිදා', text)
    text = re.sub(r'\b(\d{4})/(\d{2})/(\d{2})\b', r'\1 වසරේ \2 වෙනි මාසෙ \3 වෙනිදා', text)
    
    # 1.7 Fix Decimals with commas support
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

    speech_key = os.getenv("AZURE_SPEECH_KEY")
    speech_region = os.getenv("AZURE_SPEECH_REGION")

    # If Azure keys are missing, immediately fall back to gTTS so it never crashes!
    if not speech_key or not speech_region:
        print("[WARNING] Azure keys missing in .env! Falling back to gTTS...")
        return generate_gtts_fallback(clean_text, target_lang)

    print(f"[INFO] GENERATING AZURE AUDIO WITH SSML FOR: {target_lang} Using voice: {voice_name}")

    try:
        # Configure Azure Speech
        speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=speech_region)
        
        # Don't play on server speakers, just return the audio stream
        audio_config = None 
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        
        # Synthesize using speak_ssml_async
        result = synthesizer.speak_ssml_async(ssml_text).get()
        
        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
            audio_data = result.audio_data
            print(f"[SUCCESS] Azure Audio generated ({len(audio_data)} bytes)!")
            return Response(content=audio_data, media_type="audio/wav")
        else:
            error_details = result.cancellation_details.error_details
            print(f"[ERROR] Azure TTS Failed: {error_details}. Falling back to gTTS...")
            return generate_gtts_fallback(clean_text, target_lang)

    except Exception as e:
        print(f"[ERROR] Speech Generation Exception: {e}. Falling back to gTTS...")
        return generate_gtts_fallback(clean_text, target_lang)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)