import os
import uuid
from typing import List, Optional
import io
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
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
from langchain_core.messages import HumanMessage, AIMessage
from backend.mocks import router as mocks_router

load_dotenv(override=True)

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
        "wfm_dispatch@slt.lk",
        "nms_diagnostics@slt.lk",
        "liya_desk@slt.lk",
        "regional_manager@slt.lk",
        "team_lead_ops@slt.lk"
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
    get_admin_ledger, get_all_customers, get_admin_customer
)

@app.get("/api/admin/tickets")
async def proxy_admin_tickets():
    return await get_admin_tickets()

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
    
    # Inject Context
    messages.append(SystemMessage(content=f"IMPORTANT CONTEXT: The user is currently logged in. Their SLT phone number/account number is {session_id}. Do not ask for their phone number again. Whenever checking usage, bills, or diagnostics, use this exact number automatically without asking."))
    
    for m in history:
        if isinstance(m, HumanMessage):
            messages.append(HumanMessage(content=m.content))
        else:
            messages.append(AIMessage(content=m.content))
            
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
            "user_language": request.lang or "si"  # Default to Sinhala
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
    
    # 1. Fix numbers with units — add natural pauses so TTS reads "rupees 1490" not "one-four-nine-zero"
    text = re.sub(r'Rs\.?\s*(\d[\d,]*)', r'රුපියල් \1', text)
    
    # 2. Fix "Mbps" — spell out for clear pronunciation
    text = re.sub(r'(\d+)\s*Mbps', r'\1 Megabits per second', text, flags=re.IGNORECASE)
    text = re.sub(r'(\d+)\s*Kbps', r'\1 Kilobits per second', text, flags=re.IGNORECASE)
    
    # 3. Fix emoji characters — remove them as TTS tries to describe them
    text = re.sub(r'[\U0001F600-\U0001F9FF\U00002702-\U000027B0\U0001F1E0-\U0001F1FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF]', '', text)
    
    # 4. Fix URL-like patterns — skip them entirely
    text = re.sub(r'https?://\S+', '', text)
    text = re.sub(r'www\.\S+', '', text)
    
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
        voice_name = "ta-LK-KumarNeural" if use_male_voice else "ta-LK-SaranyaNeural"
        lang_code = "ta-LK"
    else:
        voice_name = "en-US-GuyNeural" if use_male_voice else "en-US-JennyNeural"
        lang_code = "en-US"

    import html
    # Escape special XML characters in the plain text first to ensure valid SSML
    escaped_text = html.escape(clean_text)
    
    # Format mixed English phrases inside Sinhala/Tamil text with <lang> tags
    processed_text = format_mixed_languages(escaped_text, target_lang)
    
    # Construct a valid SSML payload
    ssml_text = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{lang_code}">
        <voice name="{voice_name}">
            {processed_text}
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