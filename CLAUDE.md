# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Alif24 Platform is an Uzbek education platform with 7 microservices sharing a single PostgreSQL database. Each service has independent backend (FastAPI) and frontend (React) that can run independently.

## Tech Stack

- **Backend**: Python 3.11+, FastAPI, SQLAlchemy, Alembic
- **Frontend**: React 18, Vite, Tailwind CSS, React Router, Axios, Framer Motion
- **Database**: PostgreSQL 15, Redis (caching)
- **AI Services**: Azure Speech (TTS/STT), OpenAI
- **Deployment**: Docker, Docker Compose

## Development Commands

### Start All Services
```bash
python start_all.py                    # All backends + frontends
python start_all.py --backend          # All backends only
python start_all.py --frontend         # All frontends only
python start_all.py --main             # MainPlatform only
python start_all.py --only main harf   # Specific platforms
python start_all.py --list             # List available platforms
```

### Single Platform Development
```bash
python dev.py main     # Hot-reload MainPlatform backend
python dev.py harf     # Hot-reload Harf backend
python dev.py testai   # Hot-reload TestAI backend
python dev.py crm      # Hot-reload CRM backend
python dev.py games    # Hot-reload Games backend
```

### Manual Backend Startup
```bash
cd MainPlatform/backend && uvicorn main:app --reload --port 8000
cd Harf/backend && uvicorn main:app --reload --port 8001
# etc.
```

### Manual Frontend Startup
```bash
cd MainPlatform/frontend && npm run dev
cd Harf/frontend && npm run dev
# Frontend ports: 5173, 5174, 5175, 5176, 5177
```

### Database Migrations
```bash
cd MainPlatform/backend
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

### Testing
```bash
# Python tests
pytest

# Shared module tests
python test_shared.py

# Frontend lint
cd MainPlatform/frontend && npm run lint
```

## Architecture

### Services (Ports)
| Service | Backend Port | Frontend Port |
|---------|-------------|---------------|
| MainPlatform | 8000 | 5173 |
| Harf | 8001 | 5174 |
| TestAI | 8002 | 5175 |
| CRM | 8003 | 5176 |
| Games | 8004 | 5177 |
| Olimp | 8005 | - |
| Lessions | 8006 | - |

### Shared Module (`shared/`)
All services import from `shared/`:
- `shared/database/` - SQLAlchemy models, session, ID generator
- `shared/auth/` - JWT authentication, password hashing, permissions
- `shared/payments/` - Coin system, transactions
- `shared/services/` - Notification, Azure Speech, Telegram Bot

### ID System
All database records use 8-digit string IDs:
```python
from shared.database.id_generator import generate_8_digit_id
user_id = generate_8_digit_id()  # "12345678"
```

### Environment
Copy `.env.production.example` to `.env` in the relevant backend folder before running.

## API Documentation

- MainPlatform: http://localhost:8000/api/v1/docs
- Health Check: http://localhost:8000/api/v1/health

## Admin Access

Admin endpoints use header-based authentication:
```bash
curl -H "X-Admin-Key: <key>" http://localhost/api/v1/admin/<name>/users
```