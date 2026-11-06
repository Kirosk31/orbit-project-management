-- Trigram GIN indexes for global search were dropped by schema drift in
-- 20260823180209; they are now declared in schema.prisma so Prisma keeps them.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_createdAt_idx" ON "activity_logs"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "comments_body_trgm_idx" ON "comments" USING GIN ("body" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "projects_name_trgm_idx" ON "projects" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "tasks_title_trgm_idx" ON "tasks" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "tasks_boardId_columnId_position_idx" ON "tasks"("boardId", "columnId", "position");

-- CreateIndex
CREATE INDEX "tasks_orgId_isCompleted_isArchived_dueDate_idx" ON "tasks"("orgId", "isCompleted", "isArchived", "dueDate");

-- CreateIndex
CREATE INDEX "users_email_trgm_idx" ON "users" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "users_full_name_trgm_idx" ON "users" USING GIN ("fullName" gin_trgm_ops);
