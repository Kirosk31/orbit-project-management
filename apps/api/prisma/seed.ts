import 'dotenv/config'
import {
  PERMISSIONS,
  SYSTEM_ROLE_KEYS,
  TaskPriority,
  type PermissionKey,
  type SystemRoleKey,
} from '@orbit/shared'
import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { createPrismaClient } from '../src/shared/database/prisma.js'

const prisma = createPrismaClient()

const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'org.view': 'View organization',
  'org.update': 'Update organization',
  'org.delete': 'Delete organization',
  'org.manageMembers': 'Manage members',
  'org.manageRoles': 'Manage roles',
  'org.manageTeams': 'Manage teams',
  'org.invite': 'Invite members',
  'org.dashboard.view': 'View organization dashboard',
  'project.create': 'Create projects',
  'project.view': 'View projects',
  'project.update': 'Update projects',
  'project.archive': 'Archive projects',
  'project.delete': 'Delete projects',
  'project.manageMembers': 'Manage project members',
  'board.create': 'Create boards',
  'board.update': 'Update boards',
  'board.delete': 'Delete boards',
  'task.create': 'Create tasks',
  'task.view': 'View tasks',
  'task.update': 'Update tasks',
  'task.move': 'Move tasks',
  'task.assign': 'Assign tasks',
  'task.delete': 'Delete tasks',
  'task.comment': 'Comment on tasks',
  'task.comment.moderate': 'Moderate comments',
  'task.attach': 'Attach files to tasks',
  'report.view': 'View reports',
}

const PERMISSION_SCOPES: Record<PermissionKey, string> = {
  'org.view': 'ORGANIZATION',
  'org.update': 'ORGANIZATION',
  'org.delete': 'ORGANIZATION',
  'org.manageMembers': 'ORGANIZATION',
  'org.manageRoles': 'ORGANIZATION',
  'org.manageTeams': 'ORGANIZATION',
  'org.invite': 'ORGANIZATION',
  'org.dashboard.view': 'ORGANIZATION',
  'project.create': 'PROJECT',
  'project.view': 'PROJECT',
  'project.update': 'PROJECT',
  'project.archive': 'PROJECT',
  'project.delete': 'PROJECT',
  'project.manageMembers': 'PROJECT',
  'board.create': 'BOARD',
  'board.update': 'BOARD',
  'board.delete': 'BOARD',
  'task.create': 'TASK',
  'task.view': 'TASK',
  'task.update': 'TASK',
  'task.move': 'TASK',
  'task.assign': 'TASK',
  'task.delete': 'TASK',
  'task.comment': 'TASK',
  'task.comment.moderate': 'TASK',
  'task.attach': 'TASK',
  'report.view': 'REPORT',
}

const ROLE_PERMISSIONS: Record<SystemRoleKey, readonly PermissionKey[]> = {
  OWNER: PERMISSIONS,
  ADMIN: PERMISSIONS.filter((key) => key !== 'org.delete' && key !== 'org.manageRoles'),
  MANAGER: [
    'org.view',
    'org.dashboard.view',
    'org.manageTeams',
    'org.invite',
    'project.create',
    'project.view',
    'project.update',
    'project.archive',
    'project.manageMembers',
    'board.create',
    'board.update',
    'board.delete',
    'task.create',
    'task.view',
    'task.update',
    'task.move',
    'task.assign',
    'task.delete',
    'task.comment',
    'task.attach',
    'report.view',
  ],
  DEVELOPER: [
    'org.view',
    'org.dashboard.view',
    'project.view',
    'task.create',
    'task.view',
    'task.update',
    'task.move',
    'task.assign',
    'task.comment',
    'task.attach',
  ],
  VIEWER: ['org.view', 'project.view', 'task.view', 'task.comment', 'report.view'],
}

const ROLE_LABELS: Record<SystemRoleKey, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  DEVELOPER: 'Developer',
  VIEWER: 'Viewer',
}

async function seedPermissions(): Promise<void> {
  await prisma.permission.createMany({
    data: PERMISSIONS.map((key) => ({
      key,
      name: PERMISSION_LABELS[key],
      scope: PERMISSION_SCOPES[key],
    })),
    skipDuplicates: true,
  })
}

async function seedSystemRoles(): Promise<void> {
  const permissions = await prisma.permission.findMany()

  for (const roleKey of SYSTEM_ROLE_KEYS) {
    const existing = await prisma.role.findFirst({
      where: { orgId: null, key: roleKey },
    })

    const role = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: { name: ROLE_LABELS[roleKey] },
        })
      : await prisma.role.create({
          data: {
            key: roleKey,
            name: ROLE_LABELS[roleKey],
            isSystem: true,
          },
        })

    const grantedKeys = ROLE_PERMISSIONS[roleKey]
    const granted = permissions.filter((permission) =>
      grantedKeys.includes(permission.key as PermissionKey),
    )

    await prisma.rolePermission.createMany({
      data: granted.map((permission) => ({
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    })
  }
}

async function seedBillingPlans(): Promise<void> {
  const plans = [
    {
      key: 'FREE',
      name: 'Free',
      priceUSD: new Prisma.Decimal(0),
      currency: 'USD',
      maxMembers: 5,
      maxProjects: 1,
      maxStorageBytes: BigInt(1_073_741_824),
      isDefault: true,
    },
    {
      key: 'STARTUP',
      name: 'Startup',
      priceUSD: new Prisma.Decimal(29),
      currency: 'USD',
      maxMembers: 10,
      maxProjects: 10,
      maxStorageBytes: BigInt(5_368_709_120),
    },
    {
      key: 'TEAM',
      name: 'Team',
      priceUSD: new Prisma.Decimal(79),
      currency: 'USD',
      maxMembers: 25,
      maxProjects: 50,
      maxStorageBytes: BigInt(21_474_836_480),
    },
    {
      key: 'BUSINESS',
      name: 'Business',
      priceUSD: new Prisma.Decimal(199),
      currency: 'USD',
      maxMembers: 100,
      maxProjects: 500,
      maxStorageBytes: BigInt(107_374_182_400),
      customRoles: true,
      whiteLabel: true,
      webhooks: true,
      publicShare: true,
      auditExport: true,
    },
    {
      key: 'ENTERPRISE',
      name: 'Enterprise',
      priceUSD: new Prisma.Decimal(0),
      currency: 'USD',
      maxMembers: 1000,
      maxProjects: 5000,
      maxStorageBytes: BigInt(1_073_741_824_000),
      customRoles: true,
      whiteLabel: true,
      webhooks: true,
      publicShare: true,
      sso: true,
      auditExport: true,
    },
  ]

  for (const plan of plans) {
    await prisma.billingPlan.upsert({
      where: { key: plan.key },
      update: plan,
      create: plan,
    })
  }
}

const sampleDataConfigSchema = z.object({
  email: z.email(),
  password: z.string().min(12),
  fullName: z.string().trim().min(2).max(100),
})

type SampleDataConfig = z.infer<typeof sampleDataConfigSchema>

function readSampleDataConfig(): SampleDataConfig | null {
  if (process.env.SEED_SAMPLE_DATA !== 'true') return null

  return sampleDataConfigSchema.parse({
    email: process.env.SEED_USER_EMAIL,
    password: process.env.SEED_USER_PASSWORD,
    fullName: process.env.SEED_USER_NAME,
  })
}

async function seedSampleWorkspace(config: SampleDataConfig): Promise<void> {
  const passwordHash = await bcrypt.hash(config.password, 12)

  const demoUser = await prisma.user.upsert({
    where: { email: config.email.toLowerCase() },
    update: {},
    create: {
      email: config.email.toLowerCase(),
      passwordHash,
      fullName: config.fullName,
      isEmailVerified: true,
      lastLoginAt: new Date(),
    },
  })

  const personalOrg = await prisma.organization.upsert({
    where: { slug: 'sample-personal' },
    update: {},
    create: {
      name: config.fullName,
      slug: 'sample-personal',
      ownerId: demoUser.id,
      isPersonal: true,
    },
  })

  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { orgId: null, key: 'OWNER' },
  })

  await prisma.organizationMember.upsert({
    where: { orgId_userId: { orgId: personalOrg.id, userId: demoUser.id } },
    update: {},
    create: {
      orgId: personalOrg.id,
      userId: demoUser.id,
      roleId: ownerRole.id,
    },
  })

  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Inc.',
      slug: 'acme',
      description: 'Sample workspace for exploring the complete project-management workflow.',
      ownerId: demoUser.id,
    },
  })

  await prisma.organizationMember.upsert({
    where: { orgId_userId: { orgId: org.id, userId: demoUser.id } },
    update: {},
    create: {
      orgId: org.id,
      userId: demoUser.id,
      roleId: ownerRole.id,
    },
  })

  const statuses: Prisma.TaskStatusCreateManyInput[] = [
    {
      orgId: org.id,
      name: 'Backlog',
      color: '#94a3b8',
      position: 0,
      isDefault: true,
      isSystem: true,
    },
    { orgId: org.id, name: 'To Do', color: '#64748b', position: 1, isSystem: true },
    { orgId: org.id, name: 'In Progress', color: '#3b82f6', position: 2, isSystem: true },
    { orgId: org.id, name: 'In Review', color: '#8b5cf6', position: 3, isSystem: true },
    { orgId: org.id, name: 'Done', color: '#22c55e', position: 4, isClosed: true, isSystem: true },
  ]

  for (const status of statuses) {
    await prisma.taskStatus.upsert({
      where: { orgId_name: { orgId: org.id, name: status.name } },
      update: {},
      create: status,
    })
  }

  const team = await prisma.team.upsert({
    where: { orgId_name: { orgId: org.id, name: 'Product' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Product',
      description: 'Product engineering crew',
    },
  })

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: demoUser.id } },
    update: {},
    create: { teamId: team.id, userId: demoUser.id },
  })

  const project = await prisma.project.upsert({
    where: { orgId_key: { orgId: org.id, key: 'WEB' } },
    update: {},
    create: {
      orgId: org.id,
      name: 'Website Redesign',
      key: 'WEB',
      description: 'Launch the new marketing site.',
      color: '#6366f1',
      icon: 'globe',
      createdById: demoUser.id,
    },
  })

  await prisma.projectFavorite.upsert({
    where: { projectId_userId: { projectId: project.id, userId: demoUser.id } },
    update: {},
    create: { projectId: project.id, userId: demoUser.id },
  })

  const board = await prisma.board.upsert({
    where: { id: 'seed-board-001' },
    update: {},
    create: {
      id: 'seed-board-001',
      projectId: project.id,
      name: 'Sprint Board',
      description: 'Current sprint delivery board',
      position: 0,
    },
  })

  const statusRows = await prisma.taskStatus.findMany({
    where: { orgId: org.id },
    orderBy: { position: 'asc' },
  })

  for (const [index, status] of statusRows.entries()) {
    await prisma.column.upsert({
      where: { boardId_statusId: { boardId: board.id, statusId: status.id } },
      update: {},
      create: {
        boardId: board.id,
        statusId: status.id,
        name: status.name,
        color: status.color,
        position: index,
        wipLimit: status.isClosed ? null : 4,
      },
    })
  }

  const labels = await Promise.all(
    [
      { name: 'Bug', color: '#ef4444' },
      { name: 'Feature', color: '#3b82f6' },
      { name: 'Design', color: '#ec4899' },
      { name: 'Documentation', color: '#f59e0b' },
    ].map((label) =>
      prisma.label.upsert({
        where: { orgId_name: { orgId: org.id, name: label.name } },
        update: {},
        create: { orgId: org.id, ...label },
      }),
    ),
  )

  const columnRows = await prisma.column.findMany({
    where: { boardId: board.id },
    include: { status: true },
    orderBy: { position: 'asc' },
  })

  const columnByStatus: Record<string, (typeof columnRows)[number]> = Object.fromEntries(
    columnRows.map((column) => [column.status.name, column]),
  )

  const tasks: Prisma.TaskCreateInput[] = [
    {
      title: 'Design the new landing page hero',
      description:
        'Explore bold typography, a gradient orb motif, and a **strong** call to action.',
      priority: TaskPriority.HIGH,
      dueDate: new Date(Date.now() + 3 * 86_400_000),
      estimatedHours: new Prisma.Decimal(12),
      org: { connect: { id: org.id } },
      project: { connect: { id: project.id } },
      board: { connect: { id: board.id } },
      status: { connect: { id: columnByStatus['In Progress']!.statusId } },
      column: { connect: { id: columnByStatus['In Progress']!.id } },
      createdBy: { connect: { id: demoUser.id } },
      assignees: { create: [{ user: { connect: { id: demoUser.id } } }] },
      labels: { create: [{ label: { connect: { id: labels[2]!.id } } }] },
      checklists: {
        create: {
          title: 'Design delivery',
          position: 0,
          items: {
            create: [
              { title: 'Moodboard', isCompleted: true, position: 0 },
              { title: 'High-fidelity mockups', isCompleted: false, position: 1 },
              { title: 'Responsive variants', isCompleted: false, position: 2 },
            ],
          },
        },
      },
    },
    {
      title: 'Set up CI/CD pipeline',
      description: 'Build, test and deploy on every push to main.',
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(Date.now() + 7 * 86_400_000),
      estimatedHours: new Prisma.Decimal(8),
      org: { connect: { id: org.id } },
      project: { connect: { id: project.id } },
      board: { connect: { id: board.id } },
      status: { connect: { id: columnByStatus['To Do']!.statusId } },
      column: { connect: { id: columnByStatus['To Do']!.id } },
      createdBy: { connect: { id: demoUser.id } },
      assignees: { create: [{ user: { connect: { id: demoUser.id } } }] },
      labels: { create: [{ label: { connect: { id: labels[1]!.id } } }] },
    },
    {
      title: 'Fix mobile navigation overflow',
      description: 'The header menu overflows on small viewports.',
      priority: TaskPriority.URGENT,
      dueDate: new Date(Date.now() + 1 * 86_400_000),
      estimatedHours: new Prisma.Decimal(3),
      org: { connect: { id: org.id } },
      project: { connect: { id: project.id } },
      board: { connect: { id: board.id } },
      status: { connect: { id: columnByStatus['In Progress']!.statusId } },
      column: { connect: { id: columnByStatus['In Progress']!.id } },
      createdBy: { connect: { id: demoUser.id } },
      assignees: { create: [{ user: { connect: { id: demoUser.id } } }] },
      labels: { create: [{ label: { connect: { id: labels[0]!.id } } }] },
    },
    {
      title: 'Write the product launch post',
      description: 'Announce the platform to the world.',
      priority: TaskPriority.LOW,
      dueDate: new Date(Date.now() + 14 * 86_400_000),
      estimatedHours: new Prisma.Decimal(5),
      org: { connect: { id: org.id } },
      project: { connect: { id: project.id } },
      board: { connect: { id: board.id } },
      status: { connect: { id: columnByStatus['Backlog']!.statusId } },
      column: { connect: { id: columnByStatus['Backlog']!.id } },
      createdBy: { connect: { id: demoUser.id } },
      assignees: { create: [{ user: { connect: { id: demoUser.id } } }] },
      labels: { create: [{ label: { connect: { id: labels[3]!.id } } }] },
    },
  ]

  for (const [index, task] of tasks.entries()) {
    const existing = await prisma.task.findFirst({
      where: { projectId: project.id, title: task.title },
    })
    if (existing) {
      continue
    }
    await prisma.task.create({ data: { ...task, position: index } })
  }

  const firstTask = await prisma.task.findFirst({
    where: { projectId: project.id, title: 'Design the new landing page hero' },
  })

  if (firstTask) {
    await prisma.comment.upsert({
      where: { id: 'seed-comment-001' },
      update: {},
      create: {
        id: 'seed-comment-001',
        taskId: firstTask.id,
        authorId: demoUser.id,
        body: `The orb motif is coming together nicely. @${config.fullName}, can you share the latest variants?`,
      },
    })
  }
}

async function main(): Promise<void> {
  console.log('Seeding permissions...')
  await seedPermissions()
  console.log('Seeding system roles...')
  await seedSystemRoles()
  console.log('Seeding billing plans...')
  await seedBillingPlans()
  const sampleDataConfig = readSampleDataConfig()
  if (sampleDataConfig) {
    console.log('Seeding optional sample workspace...')
    await seedSampleWorkspace(sampleDataConfig)
  } else {
    console.log('Skipping optional sample workspace (SEED_SAMPLE_DATA is not true)')
  }
  console.log('Seed complete')
}

main()
  .catch((error) => {
    console.error('Seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
