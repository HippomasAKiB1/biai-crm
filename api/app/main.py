from contextlib import asynccontextmanager
from fastapi import FastAPI
from .db import create_db_and_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield


app = FastAPI(
    title="BIAI CRM API",
    version="0.1.0",
    lifespan=lifespan,
)

import os
from pathlib import Path
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)

_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]
_allow_all = len(_origins) == 1 and _origins[0] == "*"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _allow_all else _origins,
    allow_credentials=not _allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routes.analyze import router as analyze_router
from .routes.import_sample import router as import_router
from .routes.enquiries import router as enquiries_router
from .routes.followups import router as followups_router
from .routes.precomputed import router as precomputed_router

app.include_router(analyze_router)
app.include_router(import_router)
app.include_router(enquiries_router)
app.include_router(followups_router)
app.include_router(precomputed_router)


@app.get("/health")
def health():
    return {"status": "ok"}
