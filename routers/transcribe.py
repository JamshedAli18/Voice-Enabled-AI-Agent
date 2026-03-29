from dotenv import load_dotenv
load_dotenv()

from fastapi import APIRouter, UploadFile, File, HTTPException
from groq import Groq
import tempfile
import os

router = APIRouter()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

@router.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    try:
        contents = await audio.read()
        suffix = os.path.splitext(audio.filename)[1] or ".webm"

        tmp = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
        tmp.write(contents)
        tmp.close()

        with open(tmp.name, "rb") as f:
            result = client.audio.transcriptions.create(
                model="whisper-large-v3",
                file=f,
                language="en"
            )

        os.unlink(tmp.name)
        return {"text": result.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))