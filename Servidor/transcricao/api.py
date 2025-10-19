from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from main import process_video, check_video_exists
import asyncio
from concurrent.futures import ThreadPoolExecutor

app = FastAPI()

# Criar pool de threads para processar até 5 transcrições simultaneamente
executor = ThreadPoolExecutor(max_workers=5)

class VideoRequest(BaseModel):
    url: str

@app.post("/process")
async def process_video_endpoint(request: VideoRequest):
    try:
        video_id = request.url.split("v=")[1] if "v=" in request.url else request.url.split("/")[-1]
        
        exists, data = check_video_exists(video_id)
        if exists:
            return {
                "status": "completed",
                "message": "Vídeo já transcrito",
                "data": data
            }
        
        # Executar process_video em thread separada para não bloquear
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, process_video, request.url)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcribe")
async def transcribe_video_endpoint(request: VideoRequest):
    """Endpoint compatível com a função SQL existente"""
    try:
        # Executar process_video em thread separada para não bloquear
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(executor, process_video, request.url)
        return {
            "transcription": result.get("transcription", ""),
            "video_id": result.get("video_id", ""),
            "contem": result.get("contem", False)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
