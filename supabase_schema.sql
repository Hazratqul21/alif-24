-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'teacher', 'parent', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE teacher_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE child_relationship AS ENUM ('mother', 'father', 'grandmother', 'grandfather', 'guardian', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE test_type AS ENUM ('multiple_choice', 'true_false', 'short_answer', 'matching', 'mixed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE teacher_lesson_type AS ENUM ('harf', 'rharf', 'math', 'custom');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255),
    username VARCHAR(50) UNIQUE,
    pin_code VARCHAR(255),
    parent_id UUID REFERENCES users(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar VARCHAR(500),
    date_of_birth DATE,
    role user_role NOT NULL DEFAULT 'student',
    status account_status DEFAULT 'active',
    language VARCHAR(5) DEFAULT 'uz',
    timezone VARCHAR(50) DEFAULT 'Asia/Tashkent',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- STUDENT PROFILES
CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    parent_user_id UUID REFERENCES users(id),
    relationship_type child_relationship DEFAULT 'guardian',
    grade VARCHAR(20),
    school_name VARCHAR(200),
    level INTEGER DEFAULT 1,
    total_points INTEGER DEFAULT 0,
    total_coins INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_lessons_completed INTEGER DEFAULT 0,
    total_games_played INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0,
    average_score FLOAT DEFAULT 0.0,
    favorite_subjects JSONB DEFAULT '[]'::jsonb,
    avatar_id UUID,
    preferences JSONB DEFAULT '{"favoriteSubjects": [], "learningStyle": "visual", "soundEnabled": true, "animationsEnabled": true}'::jsonb,
    screen_time_limit INTEGER DEFAULT 60,
    is_restricted BOOLEAN DEFAULT FALSE,
    last_activity_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PARENT PROFILES
CREATE TABLE IF NOT EXISTS parent_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    occupation VARCHAR(200),
    subscription_plan VARCHAR(50) DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    max_children_allowed INTEGER DEFAULT 3,
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    weekly_report BOOLEAN DEFAULT TRUE,
    achievement_alerts BOOLEAN DEFAULT TRUE,
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false, "weeklyReport": true, "achievementAlerts": true}'::jsonb,
    default_screen_time INTEGER DEFAULT 60,
    content_filter_level VARCHAR(20) DEFAULT 'strict',
    allowed_time_slots JSONB DEFAULT '{"weekdays": {"start": "15:00", "end": "19:00"}, "weekends": {"start": "09:00", "end": "20:00"}}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEACHER PROFILES
CREATE TABLE IF NOT EXISTS teacher_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    verification_status teacher_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    rejection_reason TEXT,
    specialization VARCHAR(200),
    qualification VARCHAR(200),
    years_of_experience INTEGER DEFAULT 0,
    bio TEXT,
    subjects JSONB DEFAULT '[]'::jsonb,
    diploma_url VARCHAR(500),
    certificate_urls JSONB DEFAULT '[]'::jsonb,
    total_students INTEGER DEFAULT 0,
    total_classrooms INTEGER DEFAULT 0,
    total_lessons_created INTEGER DEFAULT 0,
    rating FLOAT DEFAULT 0.0,
    verification_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLASSROOMS
CREATE TABLE IF NOT EXISTS classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    grade_level VARCHAR(20),
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(id) ON DELETE CASCADE,
    join_code VARCHAR(8) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_students INTEGER DEFAULT 30,
    allow_late_join BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLASSROOM STUDENTS
CREATE TABLE IF NOT EXISTS classroom_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(classroom_id, student_id)
);

-- TEACHER LESSONS
CREATE TABLE IF NOT EXISTS teacher_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES users(id),
    classroom_id UUID REFERENCES classrooms(id),
    join_code VARCHAR(10) UNIQUE NOT NULL,
    lesson_type teacher_lesson_type NOT NULL DEFAULT 'custom',
    content JSONB,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT False,
    max_students INTEGER DEFAULT 100,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEACHER LESSON STUDENTS
CREATE TABLE IF NOT EXISTS teacher_lesson_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES teacher_lessons(id),
    student_id UUID NOT NULL REFERENCES users(id),
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    completion_percentage INTEGER DEFAULT 0
);

-- TEACHER TESTS
CREATE TABLE IF NOT EXISTS teacher_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    teacher_id UUID NOT NULL REFERENCES users(id),
    lesson_id UUID REFERENCES teacher_lessons(id),
    classroom_id UUID REFERENCES classrooms(id),
    test_type test_type NOT NULL DEFAULT 'multiple_choice',
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_points INTEGER DEFAULT 100,
    passing_score INTEGER DEFAULT 60,
    time_limit_minutes INTEGER,
    attempts_allowed INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    show_correct_answers BOOLEAN DEFAULT TRUE,
    available_from TIMESTAMPTZ,
    available_until TIMESTAMPTZ,
    category VARCHAR(100) DEFAULT 'general',
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TEST RESULTS
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES teacher_tests(id),
    student_id UUID NOT NULL REFERENCES users(id),
    attempt_number INTEGER DEFAULT 1,
    answers JSONB NOT NULL DEFAULT '{}'::jsonb,
    score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage FLOAT NOT NULL,
    passed BOOLEAN DEFAULT FALSE,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER,
    auto_graded BOOLEAN DEFAULT TRUE,
    teacher_comment TEXT,
    graded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ADDITIONAL TABLES (Inferred from other files in models directory)
-- Progress
CREATE TABLE IF NOT EXISTS progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID NOT NULL, -- Generic item reference (lesson, game, etc.)
    item_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'started',
    score INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game Sessions
CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id UUID NOT NULL, -- Assuming game reference
    score INTEGER DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL, -- Reference to an achievement definition
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON student_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_parent_profiles_updated_at BEFORE UPDATE ON parent_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teacher_profiles_updated_at BEFORE UPDATE ON teacher_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teacher_lessons_updated_at BEFORE UPDATE ON teacher_lessons FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_teacher_tests_updated_at BEFORE UPDATE ON teacher_tests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
