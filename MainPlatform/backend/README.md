# MainPlatform Backend

Alif24 Core Platform - Authentication, SmartKids AI, MathKids AI

## Tech Stack

- **FastAPI** - Modern Python web framework
- **Shared Modules** - Database, Auth, Payments from `shared/`
- **Azure OpenAI** - SmartKids story generation
- **Azure Speech Services** - Voice analysis
- **PostgreSQL/SQLite** - Shared database

## Project Structure

```
MainPlatform/backend/
├── main.py                  # FastAPI application
├── requirements.txt         # Dependencies
├── app/
│   ├── api/v1/              # API endpoints
│   │   ├── auth.py          # Authentication
│   │   └── dashboard.py     # Dashboards
│   ├── services/            # Business logic
│   │   └── auth_service.py  # Auth service
│   ├── repositories/        # Data access
│   ├── middleware/          # Auth & RBAC
│   ├── schemas/             # Pydantic models
│   ├── smartkids/           # SmartKids AI
│   ├── mathkids/            # MathKids AI
│   └── core/                # Config, errors, logging
```

## Setup

### 1. Install Dependencies

```bash
cd MainPlatform/backend
pip install -r requirements.txt
```

### 2. Environment Variables

Create `.env` file:

```env
# Database (shared with all platforms)
DATABASE_URL=postgresql://user:pass@localhost:5432/alif24

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# Azure OpenAI (SmartKids)
AZURE_OPENAI_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-endpoint.com
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4

# Azure Speech (SmartKids)
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=eastus

# OpenAI (MathKids)
OPENAI_API_KEY=your-key
```

### 3. Set PYTHONPATH

```bash
# Windows PowerShell
$env:PYTHONPATH = "j:\alif24-platform"

# Linux/Mac
export PYTHONPATH="/path/to/alif24-platform"
```

### 4. Initialize Database

```bash
python -c "from shared.database import init_db; init_db()"
```

### 5. Run Server

```bash
python main.py
# or
uvicorn main:app --reload --port 8000
```

Server will run on `http://localhost:8000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `GET /api/v1/auth/me` - Get profile
- `PUT /api/v1/auth/me` - Update profile
- `POST /api/v1/auth/child-login` - Child login (username + PIN)

### SmartKids AI
- `POST /api/v1/smartkids/generate-story` - Generate story
- `POST /api/v1/smartkids/analyze-speech` - Analyze reading
- `GET /api/v1/smartkids/speech-token` - Get Azure Speech token

### MathKids AI
- `POST /api/v1/mathkids/solve` - Solve math problem
- `POST /api/v1/mathkids/analyze-image` - Analyze math image

### Dashboard
- `GET /api/v1/dashboard/student` - Student dashboard
- `GET /api/v1/dashboard/parent` - Parent dashboard

## Shared Modules Usage

MainPlatform uses shared modules from root `shared/` directory:

```python
# Database models
from shared.database.models import User, StudentProfile, TeacherProfile
from shared.database import get_db, init_db

# Authentication
from shared.auth import create_access_token, verify_token
from shared.auth import hash_password, verify_password

# Payments (coin system)
from shared.payments import add_coins, reward_lesson_completion
```

## API Documentation

- Swagger UI: `http://localhost:8000/api/v1/docs`
- ReDoc: `http://localhost:8000/api/v1/redoc`

## Development

### Testing

```bash
# Test shared modules import
python -c "from shared.database.models import User; print('✅ OK')"

# Test auth
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@alif24.uz","password":"test123"}'
```

### Database Migrations

Uses shared database models - migrations handled at root level.

## Deployment

### Docker

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
ENV PYTHONPATH=/app/../..
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Vercel/Serverless

Set environment variables in platform dashboard. Rate limiting automatically disabled for serverless.

## Contact

Alif24 Platform - [alif24.uz](https://alif24.uz)
