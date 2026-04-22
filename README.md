# MedGemma / Sentinela

O **Sentinela** é um projeto full‑stack para **triagem/apoio sindrômico** e **monitoramento epidemiológico**: um frontend web (mapa + chat) conversa com uma API que organiza dados, gera recomendações e executa previsões, integrando com um **LLM (MedGemma via HTTP/Ollama)**.

Em termos técnicos: **API FastAPI** (backend) + **Next.js** (frontend), com **Postgres** e **Redis**, expondo endpoints HTTP e WebSocket.

## O que o projeto faz

- **Assistente (chat)**: interação em tempo real com suporte via WebSocket e integração com o MedGemma.
- **Previsão epidemiológica**: rotas/serviços para forecast (ex.: modelos de séries temporais).
- **Mapa e visualização**: interface para explorar informações geográficas/epidemiológicas.
- **Backoffice de entidades**: rotas para recursos do domínio (ex.: clínicas, alertas, notificações, agendamentos, memberships).

## Pré‑requisitos

- Docker + Docker Compose (recomendado), ou
- Python 3.12+ e Node 22+ (para rodar sem Docker)

## Subir com Docker (recomendado)

Na raiz do projeto:

```bash
docker compose up --build
```

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:8000`
- **Healthcheck**: `http://localhost:8000/health`

### Variáveis de ambiente (Docker Compose)

O `docker-compose.yml` já define defaults para desenvolvimento. Se quiser sobrescrever:

- **POSTGRES_PASSWORD**: senha do Postgres (default `sentinela_dev_pass`)
- **JWT_SECRET**: segredo JWT (default é apenas para dev)
- **OLLAMA_MODEL**: modelo (default `medgemma:4b`)
- **ENVIRONMENT**: `development` por padrão

Observação: o serviço `backend` aponta `OLLAMA_ENDPOINT` para `http://host.docker.internal:11434` (útil quando o Ollama roda no host).

## Rodar local (sem Docker)

### Backend (FastAPI)

1) Crie um `.env` baseado no exemplo:

```bash
cp backend/.env.example backend/.env
```

2) Crie e ative o ambiente virtual e instale dependências:

```bash
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
```

3) Suba o Postgres e Redis (via Docker) e rode a API:

```bash
docker compose up -d postgres redis
uvicorn app.main:app --app-dir backend --reload --host 0.0.0.0 --port 8000
```

### Frontend (Next.js)

```bash
cd frontend
npm ci
npm run dev
```

O frontend usa por padrão:

- `NEXT_PUBLIC_API_URL=http://localhost:8000`
- `NEXT_PUBLIC_WS_URL=ws://localhost:8000`

(configuráveis via env; ver `frontend/next.config.ts`)

## Notas de desenvolvimento

- **Persistência**: o Postgres usa volume `postgres_data`.
- **Migrações**: o backend cria tabelas na inicialização via `Base.metadata.create_all` (em produção, ideal usar Alembic).
- **Arquivos ignorados**: veja `.gitignore` (inclui `backend/.env`, `backend/.venv/`, `frontend/node_modules/`, `frontend/.next/`, `*.db`, `models_cache/`, etc.).

