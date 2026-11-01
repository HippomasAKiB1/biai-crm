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
from .routes.analyze import router as analyze_router

app.include_router(analyze_router)


@app.get("/health")
def health():
    return {"status": "ok"}
