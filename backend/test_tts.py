import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv("C:\\SLT_NEXUS\\backend\\.env")

async def test_gemini_tts():
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    prompt = "Hello! I am MAYA, how can I help you today?"
    gemini_voice = "Aoede"
    
    # Trying different models
    models_to_test = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.5-flash"
    ]
    
    async with httpx.AsyncClient() as client:
        for model in models_to_test:
            for api_version in ["v1beta", "v1alpha"]:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model}:generateContent?key={gemini_api_key}"
                headers = {"Content-Type": "application/json"}
                data = {
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": gemini_voice
                                }
                            }
                        }
                    }
                }
                response = await client.post(url, json=data, headers=headers, timeout=10.0)
                if response.status_code == 200:
                    print(f"SUCCESS: {model} on {api_version}")
                    return
                elif response.status_code != 404:
                    print(f"FAILED {model} {api_version} with {response.status_code}: {response.text[:200]}")

if __name__ == "__main__":
    asyncio.run(test_gemini_tts())
