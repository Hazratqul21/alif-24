# Alif24 Backend (Python)

Backend API for Alif24 Adaptive Learning Platform - Python/FastAPI version.

## Tech Stack

- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations
- **PostgreSQL** - Database
- **Pydantic** - Data validation
- **JWT** - Authentication
- **Azure Speech SDK** - TTS/STT

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Configure database and other settings in `.env`

4. Run migrations:
```bash
alembic upgrade head
```

5. Start server:
```bash
python main.py
```

Or with uvicorn:
```bash
uvicorn main:app --reload
```

## Project Structure

```
backend/
├── app/
│   ├── api/          # API routes
│   ├── core/          # Core modules (config, database, logging)
│   ├── models/        # SQLAlchemy models
│   ├── repositories/  # Data access layer
│   ├── services/     # Business logic
│   ├── middleware/    # Middleware (auth, error handling)
│   └── harf/          # TTS/STT service
├── alembic/           # Database migrations
├── main.py            # Application entry point
└── requirements.txt   # Python dependencies
```

## API Endpoints

- `/api/v1/auth/*` - Authentication
- `/api/v1/users/*` - User management
- `/api/v1/students/*` - Student management
- `/api/v1/lessons/*` - Lessons
- `/api/v1/games/*` - Games
- `/api/v1/profiles/*` - Child profiles
- `/api/v1/avatars/*` - Avatars
- `/harf/api/*` - TTS/STT endpoints

## Development

Run with auto-reload:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 5000
```

## Docker

Build and run:
```bash
docker build -t alif24-backend .
docker run -p 5000:5000 alif24-backend
```

