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

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .routes.analyze import router as analyze_router
from .routes.import_sample import router as import_router
from .routes.enquiries import router as enquiries_router
from .routes.followups import router as followups_router

app.include_router(analyze_router)
app.include_router(import_router)
app.include_router(enquiries_router)
app.include_router(followups_router)


@app.get("/health")
def health():
    return {"status": "ok"}
