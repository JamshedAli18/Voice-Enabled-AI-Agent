from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
import io
import os

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

VOICES = {
    "gemini":   "Aaliyah-PlayAI",
    "kimi":     "Briggs-PlayAI",
    "deepseek": "Isla-PlayAI",
}

class TTSRequest(BaseModel):
    text: str
    model: str = "gemini"

@router.post("/tts")
async def tts(request: TTSRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        voice = VOICES.get(request.model.lower(), "Aaliyah-PlayAI")

        response = client.audio.speech.create(
            model="playai-tts",
            voice=voice,
            input=request.text,
            response_format="mp3"
        )

        audio_bytes = response.read()

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=response.mp3"}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))