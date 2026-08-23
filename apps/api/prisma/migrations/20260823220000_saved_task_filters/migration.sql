CREATE TABLE "saved_filters" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "boardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_filters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "saved_filters_userId_boardId_name_key"
ON "saved_filters"("userId", "boardId", "name");

CREATE INDEX "saved_filters_orgId_boardId_idx"
ON "saved_filters"("orgId", "boardId");

ALTER TABLE "saved_filters"
ADD CONSTRAINT "saved_filters_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_filters"
ADD CONSTRAINT "saved_filters_orgId_fkey"
FOREIGN KEY ("orgId") REFERENCES "organizations"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_filters"
ADD CONSTRAINT "saved_filters_boardId_fkey"
FOREIGN KEY ("boardId") REFERENCES "boards"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
