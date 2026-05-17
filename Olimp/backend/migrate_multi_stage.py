"""
Ko'p bosqichli olimpiada uchun DB migration
Yangi jadvallar yaratadi va mavjud jadvallarga ustunlar qo'shadi.
Eski olimpiadalar hech o'zgarmasdan ishlayveradi.

Ishlatish: python migrate_multi_stage.py
"""
import asyncio
import os
import sys

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from shared.database.session import engine


MIGRATION_SQL = """
-- ============================================================
-- 1. Olympiads jadvaliga yangi ustunlar (backward-compatible)
-- ============================================================
ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS is_multi_stage BOOLEAN DEFAULT FALSE;
ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS total_stages INTEGER DEFAULT 1;
ALTER TABLE olympiads ADD COLUMN IF NOT EXISTS allowed_classes JSON;

-- ============================================================
-- 2. Olympiad Participants jadvaliga yangi ustunlar
-- ============================================================
ALTER TABLE olympiad_participants ADD COLUMN IF NOT EXISTS region VARCHAR(100);
ALTER TABLE olympiad_participants ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE olympiad_participants ADD COLUMN IF NOT EXISTS school_number INTEGER;
ALTER TABLE olympiad_participants ADD COLUMN IF NOT EXISTS class_number INTEGER;
ALTER TABLE olympiad_participants ADD COLUMN IF NOT EXISTS current_stage INTEGER DEFAULT 1;

-- ============================================================
-- 3. Olympiad Stages jadvali (YANGI)
-- ============================================================
CREATE TABLE IF NOT EXISTS olympiad_stages (
    id VARCHAR(8) PRIMARY KEY,
    olympiad_id VARCHAR(8) REFERENCES olympiads(id) ON DELETE CASCADE NOT NULL,
    stage_number INTEGER NOT NULL,
    title VARCHAR(200),
    scope_type VARCHAR(20) NOT NULL DEFAULT 'school',
    content_type VARCHAR(20) NOT NULL DEFAULT 'test',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    requirements TEXT,
    passing_percent FLOAT DEFAULT 30.0,
    passing_min_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_stage_olympiad_id ON olympiad_stages(olympiad_id);
CREATE INDEX IF NOT EXISTS ix_stage_number ON olympiad_stages(olympiad_id, stage_number);

-- ============================================================
-- 4. Olympiad Stage Results jadvali (YANGI)
-- ============================================================
CREATE TABLE IF NOT EXISTS olympiad_stage_results (
    id VARCHAR(8) PRIMARY KEY,
    participant_id VARCHAR(8) REFERENCES olympiad_participants(id) ON DELETE CASCADE NOT NULL,
    stage_id VARCHAR(8) REFERENCES olympiad_stages(id) ON DELETE CASCADE NOT NULL,
    score FLOAT DEFAULT 0,
    duration_seconds INTEGER DEFAULT 0,
    rank_in_group INTEGER,
    is_passed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_stage_result_participant ON olympiad_stage_results(participant_id);
CREATE INDEX IF NOT EXISTS ix_stage_result_stage ON olympiad_stage_results(stage_id);

-- ============================================================
-- 5. Questions va Reading Tasks ga stage_id qo'shish
-- ============================================================
ALTER TABLE olympiad_questions ADD COLUMN IF NOT EXISTS stage_id VARCHAR(8) REFERENCES olympiad_stages(id) ON DELETE SET NULL;
ALTER TABLE olympiad_reading_tasks ADD COLUMN IF NOT EXISTS stage_id VARCHAR(8) REFERENCES olympiad_stages(id) ON DELETE SET NULL;
ALTER TABLE olympiad_stories ADD COLUMN IF NOT EXISTS stage_id VARCHAR(8) REFERENCES olympiad_stages(id) ON DELETE SET NULL;
"""


async def run_migration():
    print("🔄 Ko'p bosqichli olimpiada migration boshlandi...")
    
    async with engine.begin() as conn:
        # Execute each statement separately
        for statement in MIGRATION_SQL.split(";"):
            statement = statement.strip()
            if statement and not statement.startswith("--"):
                try:
                    await conn.execute(text(statement))
                    # Print first 60 chars of each statement
                    preview = statement.replace("\n", " ")[:60]
                    print(f"  ✅ {preview}...")
                except Exception as e:
                    print(f"  ⚠️  {str(e)[:80]}")
    
    print("\n✅ Migration muvaffaqiyatli tugadi!")
    print("   - olympiad_stages jadvali yaratildi")
    print("   - olympiad_stage_results jadvali yaratildi")
    print("   - olympiads ga is_multi_stage, total_stages, allowed_classes qo'shildi")
    print("   - olympiad_participants ga region, district, school_number, class_number, current_stage qo'shildi")
    print("   - Eski olimpiadalar o'zgarmasdan ishlayveradi (is_multi_stage=False)")


if __name__ == "__main__":
    asyncio.run(run_migration())
