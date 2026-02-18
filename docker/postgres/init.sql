
-- Alif24 Database Initialization
-- Database 'alif24' is created automatically by POSTGRES_DB env var
-- This script only adds required extensions

\c alif24;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
