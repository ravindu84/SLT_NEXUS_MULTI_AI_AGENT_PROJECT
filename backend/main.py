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

def normalize_telecom_terms(text: str) -> str:
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
    
    # 5. Clean up formal literary Sinhala color terms to match natural everyday Sri Lankan spoken language (Green, Red, Orange, Blue)
    text = text.replace("හරිත", "Green")
    text = text.replace("රතු", "Red")
    text = text.replace("තැඹිලි", "Orange")
    text = text.replace("නිල්", "Blue")
    
    # 6. Clean up multiple spaces and duplicate commas
    text = re.sub(r',\s*,', ',', text)
    text = re.sub(r'\s+', ' ', text)
    
    # 6. Case-insensitive replacements for telecom terms
    # Replace "SLT-MOBITEL" or "SLT MOBITEL" with "S L T Mobitel"
    text = re.sub(r'\bSLT[- ]?MOBITEL\b', "S L T Mobitel", text, flags=re.IGNORECASE)
    # Replace "SLT" with "S L T"
    text = re.sub(r'\bSLT\b', "S L T", text, flags=re.IGNORECASE)
    # Replace "FTTH" with "F T T H"
    text = re.sub(r'\bFTTH\b', "F T T H", text, flags=re.IGNORECASE)
    # Replace "GB" with " G B " (handling attached digits like 120GB or 30gb too!)
    text = re.sub(r'(\d+(?:\.\d+)?)\s*GB\b', r'\1 G B', text, flags=re.IGNORECASE)
    text = re.sub(r'\bGB\b', " G B ", text, flags=re.IGNORECASE)
    # Replace "MB" with " M B "
    text = re.sub(r'(\d+(?:\.\d+)?)\s*MB\b', r'\1 M B', text, flags=re.IGNORECASE)
    text = re.sub(r'\bMB\b', " M B ", text, flags=re.IGNORECASE)
    # Replace "dBm" with "D B M"
    text = re.sub(r'\bdBm\b', "D B M", text, flags=re.IGNORECASE)
    # Replace "LOS" with "L O S"
    text = re.sub(r'\bLOS\b', "L O S", text, flags=re.IGNORECASE)
    # Replace "PON" with "P O N"
    text = re.sub(r'\bPON\b', "P O N", text, flags=re.IGNORECASE)
    # Replace "LKR" with "L K R"
    text = re.sub(r'\bLKR\b', "L K R", text, flags=re.IGNORECASE)
    # Replace "SLA" with "S L A"
    text = re.sub(r'\bSLA\b', "S L A", text, flags=re.IGNORECASE)
    # Replace "OTP" with "O T P"
    text = re.sub(r'\bOTP\b', "O T P", text, flags=re.IGNORECASE)
    # Replace "PEO TV" or "PEOTV" with "Peo T V"
    text = re.sub(r'\bPEO[- ]?TV\b', "Peo T V", text, flags=re.IGNORECASE)
    # Replace "WiFi" or "Wifi" with "Wai Fai"
    text = re.sub(r'\bWi[-]?Fi\b', "Wai Fai", text, flags=re.IGNORECASE)
    
    return text.strip(" ,")

# Import our LangGraph 12-Agent Swarm brain
from backend.agent.graph import get_graph
from langchain_core.messages import HumanMessage, AIMessage
from backend.mocks import router as mocks_router

load_dotenv()

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
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
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
    lang: Optional[str] = None  # User's selected language (en/si/ta)

class TTSRequest(BaseModel):
    text: str
    lang: Optional[str] = None

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
    # Censor user input before appending to session history
    censored_user_message = censor_profanity(request.message)
    history.append(HumanMessage(content=censored_user_message))

    try:
        # Invoke our 12-Agent swarm brain!
        result = await get_graph().ainvoke({
            "messages": history,
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


@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Clean text and censor profanity before voice generation
    clean_text = censor_profanity(request.text.replace("**", "").replace("*", "").replace("#", ""))
    # Normalize telecom abbreviations for flawless natural pronunciation
    clean_text = normalize_telecom_terms(clean_text)
    
    # --- Language Detection: Frontend preference FIRST, then auto-detect from content ---
    # The frontend sends the user's selected language (en/si/ta)
    frontend_lang = request.lang
    
    # Auto-detect from Unicode character ranges in the actual text
    has_sinhala = any('\u0d80' <= char <= '\u0dff' for char in clean_text)
    has_tamil = any('\u0b80' <= char <= '\u0bff' for char in clean_text)
    
    if has_sinhala:
        target_lang = 'si'
    elif has_tamil:
        target_lang = 'ta'
    elif frontend_lang in ['si', 'ta', 'en']:
        # Trust the frontend language preference (user explicitly chose Sinhala/Tamil/English)
        target_lang = frontend_lang
    else:
        target_lang = 'si'  # Default to Sinhala for SLT Sri Lanka
    
    # --- Apply Sinhala-specific pronunciation enhancements ---
    if target_lang == 'si':
        clean_text = enhance_sinhala_pronunciation(clean_text)
    
    print(f"TTS Request - Frontend Lang: {frontend_lang}, Detected Lang: {target_lang}, Has Sinhala: {has_sinhala}, Text: {clean_text[:80]}...")

    # --- 1. Google Gemini Multimodal Speech (Premium Voice) ---
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if gemini_api_key:
        print(f"[INFO] GENERATING GOOGLE GEMINI AUDIO FOR: {target_lang}...")
        try:
            # Build a language-specific, high-quality TTS prompt
            if target_lang == 'si':
                prompt = (
                    "ඔබ LIYA, SLT-MOBITEL හි AI සහායකයා. "
                    "පහත text එක හරියටම සිංහලෙන් කියවන්න. "
                    "ස්වාභාවික, මිත්‍රශීලී, මෘදු ස්ත්‍රී හඬකින් කියවන්න. "
                    "English words තිබෙනවා නම් ඒවා English pronunciation එකෙන්ම කියවන්න, "
                    "ඒත් general tone එක Sinhala වෙන්න ඕනෙ. "
                    "ආරම්භයේ හෝ අවසානයේ කිසිදු අමතර වචනයක් එකතු නොකරන්න. "
                    f"මෙම text එක පමණක් කියවන්න: {clean_text}"
                )
            elif target_lang == 'ta':
                prompt = (
                    "நீங்கள் LIYA, SLT-MOBITEL இன் AI உதவியாளர். "
                    "கீழே உள்ள உரையை சரியாக தமிழில் படிக்கவும். "
                    "இயற்கையான, நட்பான, மென்மையான பெண் குரலில் படிக்கவும். "
                    "English வார்த்தைகள் இருந்தால் English உச்சரிப்பிலேயே படிக்கவும். "
                    "தொடக்கத்திலோ முடிவிலோ எந்த கூடுதல் வார்த்தையும் சேர்க்காதீர்கள். "
                    f"இந்த உரையை மட்டும் படிக்கவும்: {clean_text}"
                )
            else:
                prompt = (
                    "You are LIYA, the AI assistant for SLT-MOBITEL Sri Lanka. "
                    "Read the following text aloud in a sweet, friendly, natural female voice. "
                    "Do not add any introductory or ending remarks. "
                    f"Just read this text exactly as written: {clean_text}"
                )
            
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-tts-preview:generateContent?key={gemini_api_key}"
            headers = {"Content-Type": "application/json"}
            data = {
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": "Aoede"
                            }
                        }
                    }
                }
            }
            response = await http_client.post(url, json=data, headers=headers, timeout=30.0)
            if response.status_code == 200:
                res_json = response.json()
                parts = res_json["candidates"][0]["content"]["parts"]
                audio_bytes = None
                for p in parts:
                    if "inlineData" in p and "audio" in p["inlineData"]["mimeType"].lower():
                        import base64
                        audio_bytes = base64.b64decode(p["inlineData"]["data"])
                        break
                if audio_bytes:
                    print(f"[SUCCESS] Gemini Audio generated ({len(audio_bytes)} bytes) for lang={target_lang}!")
                    return Response(content=audio_bytes, media_type="audio/wav")
            else:
                print(f"[WARNING] Gemini TTS API error ({response.status_code}): {response.text[:200]}")
        except Exception as e:
            print(f"[ERROR] Gemini Speech Generation failed: {e}")

    # --- 2. Free gTTS Fallback (ALWAYS WORKS!) ---
    print(f"[INFO] FALLING BACK TO FREE GOOGLE TTS (gTTS) FOR: {target_lang}...")
    try:
        from gtts import gTTS
        fp = io.BytesIO()
        # gTTS language codes: Sinhala='si', Tamil='ta', English='en'
        tts = gTTS(text=clean_text, lang=target_lang)
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_bytes = fp.read()
        print(f"[SUCCESS] gTTS Audio generated ({len(audio_bytes)} bytes) for lang={target_lang}!")
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        print(f"[ERROR] gTTS fallback failed: {e}")
        raise HTTPException(status_code=500, detail=f"All Speech Engines failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
