import { Prisma, type PrismaClient } from '@prisma/client'
import type { GlobalSearchQuery, SearchResultType } from '@orbit/shared'

export interface GlobalSearchRow {
  type: SearchResultType
  id: string
  orgId: string
  orgName: string
  title: string
  excerpt: string | null
  linkUrl: string
  updatedAt: Date
  total: bigint
}

export interface SearchRepository {
  search(userId: string, query: GlobalSearchQuery): Promise<GlobalSearchRow[]>
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export class PrismaSearchRepository implements SearchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  search(userId: string, query: GlobalSearchQuery): Promise<GlobalSearchRow[]> {
    const pattern = `%${escapeLike(query.q)}%`
    const orgScope = query.orgId ? Prisma.sql`AND resource."orgId" = ${query.orgId}` : Prisma.empty
    const typeList = Prisma.join(query.types.map((type) => Prisma.sql`${type}`))
    const skip = (query.page - 1) * query.pageSize

    return this.prisma.$queryRaw<GlobalSearchRow[]>(Prisma.sql`
      WITH search_results AS (
        SELECT
          'TASK'::text AS "type",
          task."id",
          task."orgId",
          org."name" AS "orgName",
          task."title",
          LEFT(task."description", 240) AS "excerpt",
          '/app/tasks/' || task."id" AS "linkUrl",
          task."updatedAt",
          CASE
            WHEN LOWER(task."title") = LOWER(${query.q}) THEN 0
            WHEN task."title" ILIKE ${`${escapeLike(query.q)}%`} ESCAPE '\\' THEN 1
            ELSE 2
          END AS "rank"
        FROM "tasks" task
        JOIN "organizations" org ON org."id" = task."orgId" AND org."deletedAt" IS NULL
        WHERE task."deletedAt" IS NULL
          AND task."parentId" IS NULL
          AND (task."title" ILIKE ${pattern} ESCAPE '\\' OR task."description" ILIKE ${pattern} ESCAPE '\\')
          AND EXISTS (
            SELECT 1
            FROM "organization_members" membership
            JOIN "role_permissions" role_permission ON role_permission."roleId" = membership."roleId"
            JOIN "permissions" permission ON permission."id" = role_permission."permissionId"
            WHERE membership."orgId" = task."orgId"
              AND membership."userId" = ${userId}
              AND membership."isActive" = true
              AND permission."key" = 'task.view'
          )

        UNION ALL

        SELECT
          'PROJECT'::text,
          project."id",
          project."orgId",
          org."name",
          project."name",
          LEFT(COALESCE(project."description", project."key"), 240),
          '/app/projects/' || project."id",
          project."updatedAt",
          CASE
            WHEN LOWER(project."name") = LOWER(${query.q}) THEN 0
            WHEN project."name" ILIKE ${`${escapeLike(query.q)}%`} ESCAPE '\\' THEN 1
            ELSE 2
          END
        FROM "projects" project
        JOIN "organizations" org ON org."id" = project."orgId" AND org."deletedAt" IS NULL
        WHERE project."deletedAt" IS NULL
          AND (
            project."name" ILIKE ${pattern} ESCAPE '\\'
            OR project."key" ILIKE ${pattern} ESCAPE '\\'
            OR project."description" ILIKE ${pattern} ESCAPE '\\'
          )
          AND EXISTS (
            SELECT 1
            FROM "organization_members" membership
            JOIN "role_permissions" role_permission ON role_permission."roleId" = membership."roleId"
            JOIN "permissions" permission ON permission."id" = role_permission."permissionId"
            WHERE membership."orgId" = project."orgId"
              AND membership."userId" = ${userId}
              AND membership."isActive" = true
              AND permission."key" = 'project.view'
          )

        UNION ALL

        SELECT
          'USER'::text,
          searched_user."id",
          org."id",
          org."name",
          searched_user."fullName",
          searched_user."email",
          '/app/organizations/' || org."slug",
          searched_user."updatedAt",
          CASE
            WHEN LOWER(searched_user."fullName") = LOWER(${query.q}) THEN 0
            WHEN searched_user."fullName" ILIKE ${`${escapeLike(query.q)}%`} ESCAPE '\\' THEN 1
            ELSE 2
          END
        FROM "users" searched_user
        JOIN "organization_members" searched_membership
          ON searched_membership."userId" = searched_user."id" AND searched_membership."isActive" = true
        JOIN "organizations" org
          ON org."id" = searched_membership."orgId" AND org."deletedAt" IS NULL
        WHERE searched_user."isActive" = true
          AND searched_user."deletedAt" IS NULL
          AND (
            searched_user."fullName" ILIKE ${pattern} ESCAPE '\\'
            OR searched_user."email" ILIKE ${pattern} ESCAPE '\\'
          )
          AND EXISTS (
            SELECT 1
            FROM "organization_members" membership
            JOIN "role_permissions" role_permission ON role_permission."roleId" = membership."roleId"
            JOIN "permissions" permission ON permission."id" = role_permission."permissionId"
            WHERE membership."orgId" = org."id"
              AND membership."userId" = ${userId}
              AND membership."isActive" = true
              AND permission."key" = 'org.view'
          )

        UNION ALL

        SELECT
          'COMMENT'::text,
          comment."id",
          task."orgId",
          org."name",
          task."title",
          LEFT(comment."body", 240),
          '/app/tasks/' || task."id",
          comment."updatedAt",
          2
        FROM "comments" comment
        JOIN "tasks" task ON task."id" = comment."taskId" AND task."deletedAt" IS NULL
        JOIN "organizations" org ON org."id" = task."orgId" AND org."deletedAt" IS NULL
        WHERE comment."deletedAt" IS NULL
          AND comment."body" ILIKE ${pattern} ESCAPE '\\'
          AND EXISTS (
            SELECT 1
            FROM "organization_members" membership
            JOIN "role_permissions" role_permission ON role_permission."roleId" = membership."roleId"
            JOIN "permissions" permission ON permission."id" = role_permission."permissionId"
            WHERE membership."orgId" = task."orgId"
              AND membership."userId" = ${userId}
              AND membership."isActive" = true
              AND permission."key" = 'task.view'
          )

        UNION ALL

        SELECT
          'LABEL'::text,
          label."id",
          label."orgId",
          org."name",
          label."name",
          NULL::text,
          '/app/organizations/' || org."slug",
          label."updatedAt",
          CASE WHEN LOWER(label."name") = LOWER(${query.q}) THEN 0 ELSE 2 END
        FROM "labels" label
        JOIN "organizations" org ON org."id" = label."orgId" AND org."deletedAt" IS NULL
        WHERE label."deletedAt" IS NULL
          AND label."name" ILIKE ${pattern} ESCAPE '\\'
          AND EXISTS (
            SELECT 1
            FROM "organization_members" membership
            JOIN "role_permissions" role_permission ON role_permission."roleId" = membership."roleId"
            JOIN "permissions" permission ON permission."id" = role_permission."permissionId"
            WHERE membership."orgId" = label."orgId"
              AND membership."userId" = ${userId}
              AND membership."isActive" = true
              AND permission."key" = 'task.view'
          )
      ), scoped_results AS (
        SELECT * FROM search_results resource
        WHERE resource."type" IN (${typeList})
        ${orgScope}
      )
      SELECT
        "type", "id", "orgId", "orgName", "title", "excerpt", "linkUrl", "updatedAt",
        COUNT(*) OVER() AS "total"
      FROM scoped_results
      ORDER BY "rank" ASC, "updatedAt" DESC, "title" ASC
      LIMIT ${query.pageSize}
      OFFSET ${skip}
    `)
  }
}
