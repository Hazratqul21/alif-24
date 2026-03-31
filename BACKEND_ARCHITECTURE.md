# Alif24 Backend Architecture Documentation

## Overview

Alif24 is a comprehensive educational platform built with FastAPI that provides multiple services for children's education. The platform supports multiple languages (Uzbek, Russian, English) and includes various modules for learning letters, lessons, games, olympiads, and AI-powered features.

## Project Structure

```
alif-24/
├── MainPlatform/          # Core platform (Port 8000)
│   └── backend/
├── Harf/                  # Letter learning (Port 8001)
│   └── backend/
├── TestAI/                # AI Testing (Port 8002)
│   └── backend/
├── CRM/                   # Teacher/Student management (Port 8003)
│   └── backend/
├── Games/                 # Educational games (Port 8004)
│   └── backend/
├── Olimp/                 # Olympiads & competitions (Port 8005)
│   └── backend/
├── Lessions/              # Lessons & reading materials (Port 8006)
│   └── backend/
├── shared/                # Shared modules (database, auth, services)
├── docker/                # Docker configurations
└── docker-compose.yml     # Orchestration file
```

## Architecture Pattern

### Microservices Architecture

Each platform runs as an independent FastAPI microservice:

1. **MainPlatform** - Central hub with authentication, AI services, LMS features
2. **Harf** - Letter learning (Uzbek, Russian, English)
3. **TestAI** - AI-powered testing
4. **CRM** - Teacher-Student-Organization management
5. **Games** - Educational game endpoints with coin rewards
6. **Olimp** - Olympiad management and competitions
7. **Lessions** - Lesson management and reading materials

### Shared Database Pattern

All microservices share a common PostgreSQL database through the `shared/` module:

- **Shared Database Models** - SQLAlchemy models in `shared/database/models/`
- **Shared Authentication** - JWT tokens in `shared/auth/`
- **Shared Services** - Payment, notification, storage services

## Backend Technologies

- **Framework**: FastAPI (async Python web framework)
- **Database**: PostgreSQL 15 with asyncpg driver
- **ORM**: SQLAlchemy 2.0 with async support
- **Authentication**: JWT (HS256)
- **Password Hashing**: bcrypt
- **Caching**: Redis (for rate limiting)
- **Monitoring**: Sentry for error tracking
- **API Documentation**: OpenAPI/Swagger (auto-generated)

## Shared Modules (`shared/`)

### Database Layer (`shared/database/`)

**Session Management**:
```python
from shared.database import init_db, get_db, AsyncSessionLocal
```

**Key Models**:
- `User` - Main user model with role-based profiles
- `StudentProfile` - Student-specific data
- `ParentProfile` - Parent-specific data
- `TeacherProfile` - Teacher-specific data
- `OrganizationProfile` - Organization data
- `StudentCoin` - Virtual currency system

### Authentication (`shared/auth/`)

```python
from shared.auth import (
    create_access_token, verify_token,
    create_refresh_token, verify_refresh_token,
    hash_password, verify_password,
    require_role, has_permission
)
```

### User Roles

- `student` - Primary learning users (children)
- `parent` - Guardians managing children
- `teacher` - Educational staff
- `organization` - Educational institutions
- `moderator` - Platform administrators (CEO, CTO, Methodist)

## MainPlatform Backend

**Port**: 8000

**Key Features**:
1. Authentication (Login, Register, Token Refresh)
2. SmartKids AI - Story generation, Speech analysis
3. MathKids AI - Math solver, Image recognition
4. Dashboard - Student & Parent dashboards
5. Admin Panel - Administrative controls
6. LMS - Classrooms, Assignments, Notifications
7. Subscription Management

**API Endpoints**:
```
/api/v1/auth/*        - Authentication
/api/v1/smartkids/*   - AI Story & Reading
/api/v1/mathkids/*    - AI Math Solver
/api/v1/dashboard/*   - User dashboards
/api/v1/admin/*       - Admin panel
/api/v1/classrooms/*  - LMS classrooms
/api/v1/assignments/* - LMS assignments
/api/v1/lessons/*     - Lesson content
/api/v1/olympiads/*   - Olympiad management
/api/v1/payments/*    - Payment processing
/api/v1/coins/*       - Virtual currency
```

## Other Backend Services

### Harf Backend (Port 8001)
Letter learning for Uzbek (Harf), Russian (Harfr), English (Eharf)
- Interactive letter learning
- Audio pronunciation
- Letter tracing games

### CRM Backend (Port 8003)
Teacher-Student-Organization management
- Teacher profiles
- Student management
- Class/Group management

### Games Backend (Port 8004)
Educational games with coin rewards
- Memory games
- Math Monster
- Tetris
- 2048
- Daily coin limit: 150 coins

### Olimp Backend (Port 8005)
Olympiad management and competitions
- Create/manage olympiads
- Question banks
- Student registration
- Leaderboards
- Reading competitions

### Lessions Backend (Port 8006)
Lesson management and reading materials
- Create/manage lessons
- Progress tracking
- Reading materials (Ertaklar)
- Lesson builder

## Database Schema

### Key Tables

1. **users** - Core user table with 8-digit IDs
2. **student_profiles** - Student-specific data
3. **parent_profiles** - Parent-specific data
4. **teacher_profiles** - Teacher-specific data
5. **organization_profiles** - Organization data
6. **student_coins** - Virtual currency balance
7. **coin_transactions** - Transaction history
8. **classrooms** - LMS classrooms
9. **assignments** - LMS assignments
10. **olympiads** - Competition events
11. **lessons** - Lesson content
12. **subscriptions** - User subscription plans
13. **payments** - Payment transactions

### Migration System

Uses Alembic for database migrations (21+ migrations applied)

## Authentication Flow

1. **Registration**: User creates account with email/phone
2. **Login**: JWT access token (7d expiry) + refresh token (30d expiry)
3. **Token Validation**: Bearer token in Authorization header or cookie
4. **Subscription Check**: Middleware injects subscription info into request state

## Security Features

- JWT tokens with HS256
- bcrypt password hashing
- CORS middleware for cross-origin control
- Rate limiting (Redis-based, 100/minute default)
- Security headers (X-Content-Type-Options, X-Frame-Options)
- Subscription-based access control

## Configuration

Environment variables (`.env`):
```env
DATABASE_URL=postgresql+asyncpg://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
REDIS_URL=redis://...
AZURE_OPENAI_KEY=...
AZURE_OPENAI_ENDPOINT=...
TELEGRAM_BOT_TOKEN=...
SENTRY_DSN=...
```

## Docker Infrastructure

Services orchestrated via docker-compose:
- **postgres** - Database (port 5432)
- **redis** - Rate limiting cache (port 6379)
- **nginx** - Reverse proxy/gateway
- **pgadmin** - Database administration UI
- **Individual backends** - Each microservice
- **Individual frontends** - Each web application

## Deployment

All services run behind Nginx gateway with:
- SSL/TLS termination
- Load balancing
- Static file serving
- Subdomain routing (alif24.uz, games.alif24.uz, etc.)

## Development

To run locally:
```bash
# Start all services
docker-compose up -d

# Or run specific service
cd MainPlatform/backend
python main.py

# Run migrations
cd MainPlatform/backend
alembic upgrade head
```