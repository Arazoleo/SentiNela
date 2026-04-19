from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine
from app.models import *  # noqa: F401,F403 — importa todos os modelos para o Alembic
from app.database import Base
from app.graph.builder import build_graph
from app.database import AsyncSessionLocal

from app.routers import auth, memberships, websocket, forecast, clinics, notifications, alerts, appointments

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s — %(message)s")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando Sentinela API...")

    # Cria tabelas (em produção use Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Constrói grafo de geolocalização em memória
    async with AsyncSessionLocal() as db:
        try:
            await build_graph(db)
        except Exception as e:
            logger.warning("Grafo não construído na inicialização: %s", e)

    logger.info("Sentinela API pronta.")
    yield
    logger.info("Encerrando Sentinela API.")


app = FastAPI(
    title="Sentinela API",
    description="Assistente sindrômico com previsão epidemiológica",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(memberships.router)
app.include_router(websocket.router)
app.include_router(forecast.router)
app.include_router(clinics.router)
app.include_router(notifications.router)
app.include_router(alerts.router)
app.include_router(appointments.router)


@app.get("/health")
async def health():
    from app.services.medgemma_service import medgemma_service
    gemma_ok = await medgemma_service.health_check()
    return {"status": "ok", "medgemma": "online" if gemma_ok else "offline"}
