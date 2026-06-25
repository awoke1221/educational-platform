-- ============================================================================
-- Migration: Fix Write Hotspots — LectureView Event Table & Triggers
-- Description: Eliminates row-level lock contention on Lecture.views and
--              Course.enrollmentCount by decoupling writes into an append-only
--              event table (LectureView) with optional trigger-based sync.
--
-- Problem:
--   Lecture.views is updated by every student video play → 500 concurrent
--   UPDATEs on the same row → lock contention → slow video loads.
--   Same issue with Course.enrollmentCount on every enrollment.
--
-- Solution:
--   LectureView becomes the source of truth. Triggers optionally sync the
--   aggregate back to Lecture.views for fast reads. For high traffic, the
--   trigger can be disabled and a scheduled job (pg_cron / application-level)
--   handles the sync instead.
-- ============================================================================

-- ============================================================================
-- 1. Create LectureView event table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "LectureView" (
    "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
    "lectureId"  UUID        NOT NULL,
    "userId"     UUID,
    "viewedAt"   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "LectureView_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LectureView_lectureId_fkey"
        FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id")
        ON DELETE CASCADE,
    CONSTRAINT "LectureView_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE SET NULL
);

-- Index for fast lecture-level COUNT(*) queries
CREATE INDEX IF NOT EXISTS "LectureView_lectureId_idx"
    ON "LectureView"("lectureId");

-- Index for time-range based lookups (useful for cron jobs)
CREATE INDEX IF NOT EXISTS "LectureView_viewedAt_idx"
    ON "LectureView"("viewedAt");

-- Composite index for counting views per lecture in a time range
CREATE INDEX IF NOT EXISTS "LectureView_lectureId_viewedAt_idx"
    ON "LectureView"("lectureId", "viewedAt");

COMMENT ON TABLE "LectureView" IS
    'Append-only event log for lecture video views. The source of truth for '
    'view counts. Lecture.views is a cached aggregate that can be refreshed '
    'via trigger (low traffic) or scheduled job (high traffic).';
COMMENT ON COLUMN "LectureView"."userId" IS
    'Nullable so anonymous views can be tracked without requiring auth.';

-- ============================================================================
-- 2. Trigger function: real-time sync Lecture.views ← COUNT(*) from LectureView
--    (for low-to-moderate traffic — disable for high traffic, see below)
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_lecture_views()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Atomic UPDATE using a subquery so we don't read-then-write the row.
    -- This is still row-level contention, which is why we disable this
    -- trigger under high traffic and switch to a batch job instead.
    UPDATE "Lecture"
    SET "views" = (
        SELECT COUNT(*) FROM "LectureView" WHERE "lectureId" = NEW."lectureId"
    )
    WHERE "id" = NEW."lectureId";
    RETURN NULL;  -- AFTER trigger, return value ignored
END;
$$;

-- ============================================================================
-- 2a. Attach trigger (ENABLED by default — low-traffic mode)
-- ============================================================================
DROP TRIGGER IF EXISTS trg_sync_lecture_views ON "LectureView";
CREATE TRIGGER trg_sync_lecture_views
    AFTER INSERT ON "LectureView"
    FOR EACH ROW
    EXECUTE FUNCTION sync_lecture_views();

-- ============================================================================
-- 2b. HOW TO DISABLE TRIGGER (high-traffic mode):
--     Run the following SQL to disable the real-time trigger. Then a scheduled
--     job (see 2c) handles batch updates instead.
--
--     ALTER TABLE "LectureView" DISABLE TRIGGER trg_sync_lecture_views;
--
--     Re-enable with:
--     ALTER TABLE "LectureView" ENABLE TRIGGER trg_sync_lecture_views;
-- ============================================================================

-- ============================================================================
-- 2c. Scheduled job approach (pg_cron) — for high-traffic mode
--     Run every 60 seconds to batch-sync views.
--
--     Requires: CREATE EXTENSION IF NOT EXISTS pg_cron;
--
--     SELECT cron.schedule(
--         'sync-lecture-views',       -- job name
--         '* * * * *',                -- every minute
--         $$
--             UPDATE "Lecture" L
--             SET "views" = sub.cnt
--             FROM (
--                 SELECT "lectureId", COUNT(*) AS cnt
--                 FROM "LectureView"
--                 WHERE "viewedAt" >= now() - interval '7 days'
--                 GROUP BY "lectureId"
--             ) sub
--             WHERE L."id" = sub."lectureId"
--               AND L."views" IS DISTINCT FROM sub.cnt;
--         $$
--     );
--
--     To remove the cron job:
--     SELECT cron.unschedule('sync-lecture-views');
--
--     ⚠ IMPORTANT: The cron job uses `IS DISTINCT FROM` so it only issues
--       UPDATEs for lectures where the count actually changed. This avoids
--       unnecessary writes and reduces the chance of deadlocks.
--
--     If you don't have pg_cron (Supabase free tier), use an application-level
--     scheduled job instead (e.g., a Next.js route called by Vercel Cron Jobs):
--     See the query example in the instructions below.
-- ============================================================================

-- ============================================================================
-- 3. Trigger: Update Course.enrollmentCount on Enrollment changes
--    This is low-traffic enough (one write per enrollment approval) that a
--    trigger works fine — no hotspot concern.
-- ============================================================================
CREATE OR REPLACE FUNCTION sync_course_enrollment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New enrollment → increment
        UPDATE "Course"
        SET "enrollmentCount" = (
            SELECT COUNT(*) FROM "Enrollment"
            WHERE "courseId" = NEW."courseId"
              AND "status" IN ('active', 'completed')
        )
        WHERE "id" = NEW."courseId";
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' AND OLD."status" IS DISTINCT FROM NEW."status" THEN
        -- Status changed (e.g., pending→active, active→completed, cancelled)
        UPDATE "Course"
        SET "enrollmentCount" = (
            SELECT COUNT(*) FROM "Enrollment"
            WHERE "courseId" = NEW."courseId"
              AND "status" IN ('active', 'completed')
        )
        WHERE "id" = NEW."courseId";
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_enrollment_count ON "Enrollment";
CREATE TRIGGER trg_sync_course_enrollment_count
    AFTER INSERT OR UPDATE OF "status" ON "Enrollment"
    FOR EACH ROW
    EXECUTE FUNCTION sync_course_enrollment_count();

-- ============================================================================
-- 4. Remove direct increment in app code for enrollmentCount
--    Now handled by trigger; the following existing app code is now redundant
--    but harmless (it sets the same value):
--      src/app/api/registrations/[userId]/approve/route.ts line 116
-- ============================================================================
