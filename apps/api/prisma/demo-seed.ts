/**
 * Demo workspace for local exploration, screenshots and interviews.
 *
 * Creates "Estudio Norte", a Spanish-speaking product studio with six people,
 * three projects and about forty tasks whose history spans the last 30 days,
 * so boards, Today, analytics and notifications all have something true-looking
 * to show. Re-running replaces the previous demo workspace.
 *
 *   npm run db:seed:demo -w @orbit/api
 *
 * Never runs in production. Everyone signs in with DEMO_PASSWORD
 * (default: OrbitDemo2026!).
 */
import 'dotenv/config'
import { TaskPriority } from '@orbit/shared'
import bcrypt from 'bcrypt'
import { Prisma } from '@prisma/client'
import { createPrismaClient } from '../src/shared/database/prisma.js'

if (process.env.NODE_ENV === 'production') {
  console.error('The demo seed refuses to run with NODE_ENV=production.')
  process.exit(1)
}

const prisma = createPrismaClient()
const PASSWORD = process.env.DEMO_PASSWORD ?? 'OrbitDemo2026!'
const ORG_SLUG = 'estudio-norte'
const DAY = 86_400_000
const now = Date.now()

/** Deterministic pseudo-random numbers, so every run produces the same studio. */
function createRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648
    return state / 2_147_483_648
  }
}
const random = createRandom(20_261_022)
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!
const between = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1))

const PEOPLE = [
  {
    key: 'lucia',
    fullName: 'Lucía Fernández',
    role: 'OWNER',
    bio: 'Directora de producto. Bogotá.',
  },
  { key: 'mateo', fullName: 'Mateo Rojas', role: 'MANAGER', bio: 'Líder de proyectos. Medellín.' },
  {
    key: 'camila',
    fullName: 'Camila Vargas',
    role: 'DEVELOPER',
    bio: 'Frontend. Ciudad de México.',
  },
  { key: 'diego', fullName: 'Diego Salazar', role: 'DEVELOPER', bio: 'Backend y pagos. Bogotá.' },
  {
    key: 'valentina',
    fullName: 'Valentina Ortiz',
    role: 'DEVELOPER',
    bio: 'Diseño de producto. Guadalajara.',
  },
  { key: 'andres', fullName: 'Andrés Mora', role: 'VIEWER', bio: 'Cliente: Pagos Andinos.' },
] as const
type PersonKey = (typeof PEOPLE)[number]['key']

const STATUSES = [
  { name: 'Pendiente', color: '#5b6b80', isDefault: true },
  { name: 'Por hacer', color: '#2f86b8' },
  { name: 'En curso', color: '#224bb2' },
  { name: 'En revisión', color: '#7a4b9c' },
  { name: 'Hecho', color: '#2f8a5b', isClosed: true },
] as const
type StatusName = (typeof STATUSES)[number]['name']

const LABELS = [
  { name: 'Diseño', color: '#7a4b9c' },
  { name: 'Frontend', color: '#224bb2' },
  { name: 'Backend', color: '#2f86b8' },
  { name: 'Cliente', color: '#c98a1b' },
  { name: 'Bug', color: '#b4532a' },
] as const

const PRIORITIES = [
  TaskPriority.NONE,
  TaskPriority.LOW,
  TaskPriority.MEDIUM,
  TaskPriority.MEDIUM,
  TaskPriority.HIGH,
  TaskPriority.URGENT,
] as const

interface ProjectSpec {
  key: string
  name: string
  description: string
  color: string
  board: string
  boardDescription: string
  favorite?: boolean
  people: PersonKey[]
  tasks: Array<[title: string, labels: string[]]>
}

const PROJECTS: ProjectSpec[] = [
  {
    key: 'PAG',
    name: 'Rediseño de la app de pagos',
    description: 'Nueva experiencia de cobro con QR para comercios pequeños de Pagos Andinos.',
    color: '#224bb2',
    board: 'Sprint 14',
    boardDescription: 'Del 20 al 31 de octubre',
    favorite: true,
    people: ['lucia', 'mateo', 'camila', 'diego', 'valentina', 'andres'],
    tasks: [
      ['Definir flujo de cobro con QR', ['Diseño']],
      ['Revisar textos legales con el cliente', ['Cliente']],
      ['Prototipo del comprobante digital', ['Diseño']],
      ['Entrevistas con 6 comerciantes', ['Cliente']],
      ['Ajustar contraste del teclado numérico', ['Frontend']],
      ['Integración con la pasarela PSE', ['Backend']],
      ['Mapa de pantallas v1', ['Diseño']],
      ['Kickoff con el equipo del cliente', ['Cliente']],
      ['Auditoría de la app actual', ['Diseño']],
      ['Benchmark de billeteras en la región', ['Cliente']],
      ['Webhook de confirmación de pago', ['Backend']],
      ['Pantalla de monto con teclado propio', ['Frontend']],
      ['Error al reintentar un pago rechazado', ['Bug', 'Backend']],
      ['Animación de pago exitoso', ['Frontend', 'Diseño']],
      ['Pruebas de usabilidad en tienda', ['Cliente']],
      ['Límites de monto por comercio', ['Backend']],
    ],
  },
  {
    key: 'CDMX',
    name: 'Lanzamiento tienda Ciudad de México',
    description: 'Apertura de la tienda en línea para el mercado mexicano.',
    color: '#c98a1b',
    board: 'Lanzamiento',
    boardDescription: 'Meta: abrir el 15 de noviembre',
    people: ['lucia', 'mateo', 'camila', 'valentina'],
    tasks: [
      ['Fotos de catálogo temporada otoño', ['Diseño']],
      ['Configurar envíos con paquetería local', ['Backend']],
      ['Traducir fichas a español de México', ['Frontend']],
      ['Registro de dominio .mx', ['Backend']],
      ['Alta en el SAT para facturación', ['Cliente']],
      ['Página de preguntas frecuentes', ['Frontend']],
      ['Pagos con OXXO y SPEI', ['Backend']],
      ['Campaña de preventa en redes', ['Cliente']],
      ['Carrito pierde el cupón al recargar', ['Bug', 'Frontend']],
      ['Guía de tallas mexicana', ['Diseño']],
      ['Pruebas de carga del checkout', ['Backend']],
      ['Política de devoluciones', ['Cliente']],
    ],
  },
  {
    key: 'B2B',
    name: 'Portal de clientes B2B',
    description: 'Autogestión de pedidos y facturas para distribuidores.',
    color: '#2f8a5b',
    board: 'Sprint 6',
    boardDescription: 'Pedidos recurrentes y facturas',
    people: ['lucia', 'mateo', 'diego', 'camila'],
    tasks: [
      ['Historias de usuario para pedidos recurrentes', ['Cliente']],
      ['Descarga masiva de facturas en PDF', ['Backend']],
      ['Permisos por sucursal', ['Backend']],
      ['Login con correo corporativo', ['Backend']],
      ['Tabla de pedidos con filtros guardados', ['Frontend']],
      ['Estado de cuenta en tiempo real', ['Frontend', 'Backend']],
      ['La exportación a CSV corta acentos', ['Bug', 'Backend']],
      ['Onboarding de la primera sucursal', ['Diseño']],
      ['Notificaciones de pedido despachado', ['Backend']],
      ['Revisión de accesibilidad del portal', ['Frontend']],
    ],
  },
]

const COMMENTS = [
  'Subí la primera versión al Figma. ¿Lo revisamos mañana en la daily?',
  'El cliente pidió mantener el logo anterior en el comprobante.',
  'Listo para revisión. Dejé notas en el PR.',
  'Ojo con el caso de pago parcial, lo vimos en las entrevistas.',
  'Lo muevo a la siguiente semana, estamos esperando credenciales del banco.',
  'Probado en Android de gama baja: funciona fluido.',
] as const

async function resetDemoWorkspace(): Promise<void> {
  const emails = PEOPLE.map((person) => emailFor(person.key))
  const users = await prisma.user.findMany({ where: { email: { in: emails } } })
  const userIds = users.map((user) => user.id)
  const orgs = await prisma.organization.findMany({
    where: { OR: [{ slug: ORG_SLUG }, { slug: { startsWith: 'demo-personal-' } }] },
    select: { id: true },
  })
  const orgIds = orgs.map((org) => org.id)
  // Columns reference statuses without a cascade, so remove work before the org.
  await prisma.task.deleteMany({ where: { orgId: { in: orgIds } } })
  await prisma.column.deleteMany({ where: { board: { project: { orgId: { in: orgIds } } } } })
  await prisma.project.deleteMany({ where: { orgId: { in: orgIds } } })
  await prisma.taskStatus.deleteMany({ where: { orgId: { in: orgIds } } })
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } })
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } })
}

function emailFor(key: PersonKey): string {
  return `${key}@estudio-norte.example`
}

async function main(): Promise<void> {
  await resetDemoWorkspace()
  const passwordHash = await bcrypt.hash(PASSWORD, 12)
  const roles = await prisma.role.findMany({ where: { orgId: null } })
  const roleId = (key: string): string => {
    const role = roles.find((candidate) => candidate.key === key)
    if (!role) throw new Error(`System role ${key} is missing. Run the base seed first.`)
    return role.id
  }

  const users = new Map<PersonKey, { id: string; fullName: string }>()
  for (const person of PEOPLE) {
    const user = await prisma.user.upsert({
      where: { email: emailFor(person.key) },
      update: { fullName: person.fullName, bio: person.bio, passwordHash, isEmailVerified: true },
      create: {
        email: emailFor(person.key),
        fullName: person.fullName,
        bio: person.bio,
        passwordHash,
        isEmailVerified: true,
        lastLoginAt: new Date(),
      },
    })
    users.set(person.key, { id: user.id, fullName: user.fullName })
    const personal = await prisma.organization.create({
      data: {
        name: person.fullName,
        slug: `demo-personal-${person.key}`,
        ownerId: user.id,
        isPersonal: true,
      },
    })
    await prisma.organizationMember.create({
      data: { orgId: personal.id, userId: user.id, roleId: roleId('OWNER') },
    })
  }
  const user = (key: PersonKey) => users.get(key)!

  const org = await prisma.organization.create({
    data: {
      name: 'Estudio Norte',
      slug: ORG_SLUG,
      description: 'Estudio de producto digital en Bogotá y Ciudad de México.',
      ownerId: user('lucia').id,
      createdAt: new Date(now - 45 * DAY),
    },
  })
  for (const person of PEOPLE) {
    await prisma.organizationMember.create({
      data: { orgId: org.id, userId: user(person.key).id, roleId: roleId(person.role) },
    })
  }

  const statuses = new Map<StatusName, string>()
  for (const [position, status] of STATUSES.entries()) {
    const row = await prisma.taskStatus.create({
      data: {
        orgId: org.id,
        name: status.name,
        color: status.color,
        position,
        isDefault: 'isDefault' in status,
        isClosed: 'isClosed' in status,
        isSystem: true,
      },
    })
    statuses.set(status.name, row.id)
  }

  const labels = new Map<string, string>()
  for (const label of LABELS) {
    const row = await prisma.label.create({ data: { orgId: org.id, ...label } })
    labels.set(label.name, row.id)
  }

  const team = await prisma.team.create({
    data: { orgId: org.id, name: 'Producto', description: 'Diseño, frontend y backend' },
  })
  await prisma.teamMember.createMany({
    data: PEOPLE.filter((person) => person.role !== 'VIEWER').map((person) => ({
      teamId: team.id,
      userId: user(person.key).id,
    })),
  })

  const workers: PersonKey[] = ['lucia', 'mateo', 'camila', 'diego', 'valentina']
  let commentIndex = 0

  for (const [projectIndex, spec] of PROJECTS.entries()) {
    const project = await prisma.project.create({
      data: {
        orgId: org.id,
        name: spec.name,
        key: spec.key,
        description: spec.description,
        color: spec.color,
        createdById: user('mateo').id,
        createdAt: new Date(now - (40 - projectIndex * 4) * DAY),
      },
    })
    await prisma.projectMember.createMany({
      data: spec.people.map((key) => ({ projectId: project.id, userId: user(key).id })),
    })
    if (spec.favorite) {
      await prisma.projectFavorite.create({
        data: { projectId: project.id, userId: user('lucia').id },
      })
    }

    const board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: spec.board,
        description: spec.boardDescription,
        position: 0,
      },
    })
    const columns = new Map<StatusName, string>()
    for (const [position, status] of STATUSES.entries()) {
      const column = await prisma.column.create({
        data: {
          boardId: board.id,
          statusId: statuses.get(status.name)!,
          name: status.name,
          color: status.color,
          position,
          wipLimit: status.name === 'En curso' ? 3 : null,
        },
      })
      columns.set(status.name, column.id)
    }

    const assignable = spec.people.filter((key) => workers.includes(key))
    for (const [index, [title, labelNames]] of spec.tasks.entries()) {
      // About a third of the work is finished, spread across the month.
      const roll = random()
      const statusName: StatusName =
        roll < 0.36
          ? 'Hecho'
          : roll < 0.48
            ? 'En revisión'
            : roll < 0.66
              ? 'En curso'
              : roll < 0.86
                ? 'Por hacer'
                : 'Pendiente'
      const isDone = statusName === 'Hecho'
      const createdAt = new Date(now - between(4, 30) * DAY - between(0, 8) * 3_600_000)
      const completedAt = isDone
        ? new Date(
            createdAt.getTime() +
              between(1, Math.max(1, Math.floor((now - createdAt.getTime()) / DAY) - 1)) * DAY,
          )
        : null
      const dueOffset = isDone ? between(-12, -1) : between(-3, 18)
      const assignee = index === 0 || random() < 0.38 ? 'lucia' : pick(assignable)
      const creator = pick<PersonKey>(['mateo', 'lucia', 'mateo', 'valentina'])
      const priority = pick(PRIORITIES)

      const task = await prisma.task.create({
        data: {
          orgId: org.id,
          projectId: project.id,
          boardId: board.id,
          columnId: columns.get(statusName)!,
          statusId: statuses.get(statusName)!,
          createdById: user(creator).id,
          title,
          description:
            'Contexto: lo acordamos en la reunión de planificación.\n\n- Revisar el documento compartido\n- Validar con diseño antes del viernes',
          priority,
          dueDate: new Date(now + dueOffset * DAY),
          estimatedHours: new Prisma.Decimal(between(2, 12)),
          position: index,
          isCompleted: isDone,
          completedAt,
          createdAt,
          assignees: { create: [{ userId: user(assignee).id }] },
          labels: {
            create: labelNames.map((name) => ({ labelId: labels.get(name)! })),
          },
        },
      })

      await prisma.taskActivity.create({
        data: {
          taskId: task.id,
          actorId: user(creator).id,
          action: 'task.created',
          entityType: 'TASK',
          entityId: task.id,
          createdAt,
          metadata: { title },
        },
      })

      if (statusName !== 'Pendiente' && statusName !== 'Por hacer') {
        let tracked = 0
        for (let entry = 0; entry < between(1, 3); entry += 1) {
          const startedAt = new Date(createdAt.getTime() + between(0, 3) * DAY + entry * 3_600_000)
          const durationSeconds = between(2, 12) * 15 * 60
          tracked += durationSeconds
          await prisma.timeEntry.create({
            data: {
              taskId: task.id,
              userId: user(assignee).id,
              startedAt,
              endedAt: new Date(startedAt.getTime() + durationSeconds * 1000),
              durationSeconds,
              note: pick([
                'Implementación',
                'Revisión con el equipo',
                'Ajustes de diseño',
                'Pruebas',
              ]),
            },
          })
        }
        await prisma.task.update({ where: { id: task.id }, data: { trackedSeconds: tracked } })
      }

      if (isDone && completedAt) {
        await prisma.taskActivity.create({
          data: {
            taskId: task.id,
            actorId: user(assignee).id,
            action: 'task.moved',
            entityType: 'TASK',
            entityId: task.id,
            createdAt: completedAt,
          },
        })
      }

      if (index % 4 === 0) {
        const author = pick(assignable.filter((key) => key !== assignee)) ?? 'mateo'
        await prisma.comment.create({
          data: {
            taskId: task.id,
            authorId: user(author).id,
            body: COMMENTS[commentIndex % COMMENTS.length]!,
            createdAt: new Date(Math.min(now - 3_600_000, createdAt.getTime() + 2 * DAY)),
          },
        })
        commentIndex += 1
      }

      if (assignee === 'lucia' && !isDone) {
        const actor = user(creator === 'lucia' ? 'mateo' : creator)
        await prisma.notification.create({
          data: {
            userId: user('lucia').id,
            orgId: org.id,
            type: 'TASK_ASSIGNED',
            title: 'You were assigned a task',
            body: `${actor.fullName} assigned you to "${title}"`,
            linkUrl: `/app/tasks/${task.id}`,
            metadata: { taskId: task.id, taskTitle: title, actorName: actor.fullName },
            isRead: random() < 0.45,
            createdAt: new Date(Math.max(createdAt.getTime(), now - between(1, 72) * 3_600_000)),
          },
        })
      }
    }
  }

  console.log(`Demo workspace ready: ${PEOPLE.length} people, sign in as ${emailFor('lucia')}`)
}

main()
  .catch((error) => {
    console.error('Demo seed failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
