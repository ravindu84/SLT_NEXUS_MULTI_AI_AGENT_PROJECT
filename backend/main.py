import os
import uuid
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

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
    """
    Primary chat endpoint for the frontend.
    Processes user messages through LIYA's LangGraph brain.
    """
    if not request.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # Handle session management
    session_id = request.session_id or str(uuid.uuid4())
    if session_id not in sessions:
        sessions[session_id] = []

    # Get history and add new message
    history = sessions[session_id]
    history.append(HumanMessage(content=request.message))

    try:
        # Run the LangGraph agent
        result = liya_app.invoke({"messages": history})
        
        # Get the latest AI response
        ai_message = result["messages"][-1]
        ai_response = ai_message.content
        
        # Metadata for frontend UI
        agent_used = "general_agent"
        agent_emoji = "👋"
        agent_label = "LIYA"
        
        # Update session history
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
