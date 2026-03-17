# GitHub Copilot Instructions for alif-24

This repository contains a multi-service education platform with independent backend + frontend apps for each service.

## 🌐 What this repo is

- **7 microservices**, each with:
  - **FastAPI backend** (Python 3.11+)
  - **React frontend** (Vite + Tailwind)
- Shared code under `shared/` (DB models, auth, payments, services, utils)
- Primary database: **PostgreSQL** (shared by all backends)
- Uses **Docker / docker-compose** for local integration

## 🚀 Common dev workflows

### Start everything (recommended)
```bash
python start_all.py
```

### Start specific services
```bash
python dev.py main        # MainPlatform backend with hot reload
python dev.py harf        # Harf backend
python dev.py testai      # TestAI backend
python dev.py crm         # CRM backend
python dev.py games       # Games backend
```

### Manual startup (per service)
#### Backend
```bash
cd <ServiceName>/backend
uvicorn main:app --reload --port <port>
```

#### Frontend
```bash
cd <ServiceName>/frontend
npm install
npm run dev
```

## 🧩 Key directories

- `MainPlatform/`, `Harf/`, `TestAI/`, `CRM/`, `Games/`, `Olimp/`, `Lessions/`
  - Each has `backend/` and `frontend/`
- `shared/` — shared Python code (database, auth, payments, services)
- `tests/` — end-to-end and unit tests

## ✅ Testing

### Python tests
```bash
pytest
```

### Shared module tests
```bash
python test_shared.py
```

### Frontend lint (example)
```bash
cd MainPlatform/frontend && npm run lint
```

## 🧠 Useful patterns / conventions

- All DB records use **8-digit string IDs** from `shared/database/id_generator.py`
- Environment variables are typically loaded from `.env` files in each backend folder. Copy from `.env.production.example` when needed.

## 🔍 Notes for Copilot

- Prefer edits that preserve the existing microservice boundaries (don’t merge all services into a single monolith).
- When changing backend behavior, check for shared logic in `shared/` first.
- Frontends are Vite + React — typical React conventions apply.

---

If you need more context (e.g., service-specific setup, config patterns, or common gotchas) ask and I’ll point you to the right service folder and config.
