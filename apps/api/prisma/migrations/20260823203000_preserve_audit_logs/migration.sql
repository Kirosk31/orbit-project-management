-- Audit events can describe account-level actions that do not belong to one
-- organization. Organization removal must not erase historical audit evidence.
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_orgId_fkey";
ALTER TABLE "audit_logs" ALTER COLUMN "orgId" DROP NOT NULL;
ALTER TABLE "audit_logs"
ADD CONSTRAINT "audit_logs_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "organizations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
