# Vercel & Supabase Setup Guide

## 1. Supabase Setup (Database)

1.  Create a new project on [Supabase.com](https://supabase.com).
2.  Go to **SQL Editor** in the left sidebar.
3.  Copy the content of `supabase_schema.sql` (found in the root of the repo) and paste it into the SQL Editor.
4.  Run the query to create all tables.
5.  Go to **Project Settings** -> **Database** -> **Connection string** -> **URI**.
6.  Copy the connection string. It will look like:
    `postgresql://postgres.xxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
    *Note: Replace `[YOUR-PASSWORD]` with your actual database password.*

## 2. Vercel Deployment

### Backend (Python)
Since the project has both `backend` and `frontend` folders, it's best to deploy them as **two separate projects** in Vercel or configure monorepo settings.

**Option A: Monorepo (Recommended for Simplicity)**
1. Import the repository into Vercel.
2. Vercel should detect the multiple folders. If not, you might need to deploy twice or set Root Directory.
    *   **Recommendation**: Deploy the **Frontend** as the main project, and serve Backend as serverless functions if possible. But given the structure, separate projects are cleaner.

**Deploying Backend:**
1. Create a new project in Vercel.
2. Import the `alif-24` repo.
3. In **Root Directory** settings, edit and select `backend`.
4. **Environment Variables**: Add the following:
    *   `DATABASE_URL`: Paste your Supabase URI (e.g., `postgresql://...`)
    *   `JWT_SECRET`: A random long string (e.g., `supersecretkey123`)
    *   `JWT_REFRESH_SECRET`: Another random long string.
    *   `OPENAI_API_KEY`: Your OpenAI Key (if using AI features).
    *   `CORS_ORIGINS`: The URL of your Frontend (e.g., `https://alif-24-frontend.vercel.app`). You can use `*` for testing.
5. Deploy.
6. Copy the Deployment URL (e.g., `https://alif-24-backend.vercel.app`).

**Deploying Frontend:**
1. Create a new project in Vercel.
2. Import the `alif-24` repo.
3. In **Root Directory** settings, select `frontend`.
4. **Environment Variables**:
    *   `VITE_API_URL`: The URL of your Backend (e.g., `https://alif-24-backend.vercel.app`).
        *   *Important: Do not add a trailing slash `/`.*
5. Deploy.

## 3. Environment Variables Reference

| Variable | Description | Example |
| :--- | :--- | :--- |
| **Backend** | | |
| `DATABASE_URL` | PostgreSQL Connection String | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for Access Tokens | `random_string` |
| `JWT_REFRESH_SECRET` | Secret for Refresh Tokens | `random_string` |
| `OPENAI_API_KEY` | OpenAI API Key | `sk-...` |
| `CORS_ORIGINS` | Allowed Frontend Origins | `https://your-frontend.vercel.app` |
| **Frontend** | | |
| `VITE_API_URL` | URL of the Backend API | `https://your-backend.vercel.app` |
