import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv("C:\\SLT_NEXUS\\backend\\.env")

async def list_models():
    gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={gemini_api_key}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url, timeout=30.0)
        models = response.json().get("models", [])
        for m in models:
            print(m["name"])

if __name__ == "__main__":
    asyncio.run(list_models())
