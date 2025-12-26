import asyncio
import json

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from .database import engine, Base
from .routers import shipments, auth, uploads
from .realtime import shipments_manager
from . import security, config

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TNT Freight Management System")

# CORS (Allow React Frontend to talk to this)
origins = [
    "http://localhost:3000", # React default port
    "http://localhost:5173", # Vite default port
    "http://192.168.0.53",   # Deployed host
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix=config.API_PREFIX)
app.include_router(shipments.router, prefix=config.API_PREFIX)
app.include_router(uploads.router, prefix=config.API_PREFIX)

# Static uploads
upload_dir = Path(config.UPLOAD_DIR).resolve()
upload_dir.mkdir(parents=True, exist_ok=True)
app.mount(f"{config.API_PREFIX}/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Freight System API is running"}


@app.get(f"{config.API_PREFIX}/stream/shipments")
async def shipments_stream(request: Request):
    token = request.query_params.get("token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    try:
        security.decode_access_token(token)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    queue = await shipments_manager.connect()

    async def event_generator():
        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    message = await asyncio.wait_for(queue.get(), timeout=15)
                except asyncio.TimeoutError:
                    yield "event: ping\n\n"
                    continue

                yield f"data: {json.dumps(message)}\n\n"
        finally:
            shipments_manager.disconnect(queue)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
