ALTER TABLE "time_entries"
ALTER COLUMN "durationSeconds" SET DEFAULT 0;

ALTER TABLE "time_entries"
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX "time_entries_taskId_idx";
CREATE INDEX "time_entries_taskId_startedAt_idx" ON "time_entries"("taskId", "startedAt");

CREATE UNIQUE INDEX "time_entries_one_active_timer_per_user_idx"
ON "time_entries"("userId")
WHERE "endedAt" IS NULL;

ALTER TABLE "time_entries"
ADD CONSTRAINT "time_entries_duration_non_negative_check"
CHECK ("durationSeconds" >= 0);

ALTER TABLE "time_entries"
ADD CONSTRAINT "time_entries_end_after_start_check"
CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");
