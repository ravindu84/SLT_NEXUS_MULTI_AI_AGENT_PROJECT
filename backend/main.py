import os
import uuid
from typing import List, Optional
import io
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from gtts import gTTS
try:
    from google.cloud import texttospeech
    HAS_GOOGLE_CLOUD_TTS = True
    # Set credentials path
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(os.path.dirname(__file__), "google-credentials.json")
    client = texttospeech.TextToSpeechClient()
except ImportError:
    HAS_GOOGLE_CLOUD_TTS = False
except Exception as e:
    print(f"Google Cloud TTS Init Error: {e}")
    HAS_GOOGLE_CLOUD_TTS = False

# Import our LangGraph brain
from backend.graph import liya_app
from langchain_core.messages import HumanMessage, AIMessage

load_dotenv()

app = FastAPI(
    title="SLT NEXUS - LIYA Backend",
    description="Core backend for LIYA, the SLT AI Customer Support Agent.",
    version="1.0.0"
)

# CORS configuration for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
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

class TTSRequest(BaseModel):
    text: str
    lang: Optional[str] = "si"

class ChatResponse(BaseModel):
    response: str
    session_id: str
    agent_used: str = "general_agent"
    agent_emoji: str = "👋"
    agent_label: str = "LIYA"
    intent: str = ""

@app.get("/")
async def health_check():
    return {"status": "online", "agent": "LIYA", "system": "SLT NEXUS"}

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    history = sessions[session_id]
    history.append(HumanMessage(content=request.message))

    try:
        result = liya_app.invoke({"messages": history})
        ai_message = result["messages"][-1]
        ai_response = ai_message.content
        agent_used = "general_agent"
        agent_emoji = "👋"
        agent_label = "LIYA"
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

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    if not request.text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    target_lang = request.lang if request.lang in ['en', 'si', 'ta'] else 'si'
    print(f"TTS Request - Lang: {target_lang}, Text: {request.text[:50]}...")

    try:
        if HAS_GOOGLE_CLOUD_TTS:
            print(f"Using Premium Google Cloud TTS for {target_lang}")
            voice_map = {
                "si": ("si-LK", "si-LK-Standard-A"),
                "ta": ("ta-IN", "ta-IN-Standard-A"),
                "en": ("en-US", "en-US-Neural2-F")
            }
            lang_code, voice_name = voice_map.get(target_lang, ("si-LK", "si-LK-Standard-A"))
            
            synthesis_input = texttospeech.SynthesisInput(text=request.text)
            voice = texttospeech.VoiceSelectionParams(
                language_code=lang_code,
                name=voice_name
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                pitch=0.0,
                speaking_rate=1.0
            )
            
            response = client.synthesize_speech(
                input=synthesis_input, voice=voice, audio_config=audio_config
            )
            
            return StreamingResponse(
                io.BytesIO(response.audio_content),
                media_type="audio/mpeg"
            )
        else:
            tts = gTTS(text=request.text, lang=target_lang)
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            return StreamingResponse(mp3_fp, media_type="audio/mpeg")
            
    except Exception as e:
        print(f"TTS Generation Error: {e}")
        try:
            tts = gTTS(text=request.text, lang=target_lang)
            mp3_fp = io.BytesIO()
            tts.write_to_fp(mp3_fp)
            mp3_fp.seek(0)
            return StreamingResponse(mp3_fp, media_type="audio/mpeg")
        except Exception as inner_e:
            raise HTTPException(status_code=500, detail=str(inner_e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
