-- Introduce named checklists while preserving any legacy task-level items.
CREATE TABLE "checklists" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "checklists_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "checklist_items" ADD COLUMN "checklistId" TEXT;

INSERT INTO "checklists" ("id", "taskId", "title", "position", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "taskId", 'Checklist', 0, MIN("createdAt"), CURRENT_TIMESTAMP
FROM "checklist_items"
GROUP BY "taskId";

UPDATE "checklist_items" AS item
SET "checklistId" = checklist."id"
FROM "checklists" AS checklist
WHERE checklist."taskId" = item."taskId";

ALTER TABLE "checklist_items" ALTER COLUMN "checklistId" SET NOT NULL;
ALTER TABLE "checklist_items" DROP CONSTRAINT "checklist_items_taskId_fkey";
DROP INDEX "checklist_items_taskId_position_idx";
ALTER TABLE "checklist_items" DROP COLUMN "taskId";

CREATE INDEX "checklists_taskId_position_idx" ON "checklists"("taskId", "position");
CREATE INDEX "checklist_items_checklistId_position_idx" ON "checklist_items"("checklistId", "position");

ALTER TABLE "checklists"
ADD CONSTRAINT "checklists_taskId_fkey"
FOREIGN KEY ("taskId") REFERENCES "tasks"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "checklist_items"
ADD CONSTRAINT "checklist_items_checklistId_fkey"
FOREIGN KEY ("checklistId") REFERENCES "checklists"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
