export const TaskPriority = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority]

export const TASK_PRIORITIES: readonly TaskPriority[] = Object.values(TaskPriority)

export const NotificationType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_MENTIONED: 'TASK_MENTIONED',
  TASK_COMMENTED: 'TASK_COMMENTED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  INVITATION: 'INVITATION',
} as const

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]

export const NOTIFICATION_TYPES: readonly NotificationType[] = Object.values(NotificationType)

export const InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const

export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus]

export const INVITATION_STATUSES: readonly InvitationStatus[] = Object.values(InvitationStatus)

export const SystemRoleKey = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  DEVELOPER: 'DEVELOPER',
  VIEWER: 'VIEWER',
} as const

export type SystemRoleKey = (typeof SystemRoleKey)[keyof typeof SystemRoleKey]

export const SYSTEM_ROLE_KEYS: readonly SystemRoleKey[] = Object.values(SystemRoleKey)

export const ActivityEntityType = {
  ORGANIZATION: 'ORGANIZATION',
  PROJECT: 'PROJECT',
  BOARD: 'BOARD',
  TASK: 'TASK',
  COMMENT: 'COMMENT',
  USER: 'USER',
  TEAM: 'TEAM',
} as const

export type ActivityEntityType = (typeof ActivityEntityType)[keyof typeof ActivityEntityType]
