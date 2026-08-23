export const Permission = {
  ORG_VIEW: 'org.view',
  ORG_UPDATE: 'org.update',
  ORG_DELETE: 'org.delete',
  ORG_MANAGE_MEMBERS: 'org.manageMembers',
  ORG_MANAGE_ROLES: 'org.manageRoles',
  ORG_MANAGE_TEAMS: 'org.manageTeams',
  ORG_INVITE: 'org.invite',
  ORG_DASHBOARD_VIEW: 'org.dashboard.view',

  PROJECT_CREATE: 'project.create',
  PROJECT_VIEW: 'project.view',
  PROJECT_UPDATE: 'project.update',
  PROJECT_ARCHIVE: 'project.archive',
  PROJECT_DELETE: 'project.delete',
  PROJECT_MANAGE_MEMBERS: 'project.manageMembers',

  BOARD_CREATE: 'board.create',
  BOARD_UPDATE: 'board.update',
  BOARD_DELETE: 'board.delete',

  TASK_CREATE: 'task.create',
  TASK_VIEW: 'task.view',
  TASK_UPDATE: 'task.update',
  TASK_MOVE: 'task.move',
  TASK_ASSIGN: 'task.assign',
  TASK_DELETE: 'task.delete',
  TASK_COMMENT: 'task.comment',
  TASK_COMMENT_MODERATE: 'task.comment.moderate',
  TASK_ATTACH: 'task.attach',

  REPORT_VIEW: 'report.view',
} as const

export type PermissionKey = (typeof Permission)[keyof typeof Permission]

export const PERMISSIONS: readonly PermissionKey[] = Object.values(Permission)
