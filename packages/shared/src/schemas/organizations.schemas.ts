import { z } from 'zod'
import type { INVITATION_STATUSES } from '../enums.js'

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(100),
  description: z.string().trim().max(500).optional().default(''),
})

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, 'Organization name is required').max(100).optional(),
  description: z.string().trim().max(500).optional(),
})

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>

export interface OrganizationDto {
  id: string
  name: string
  slug: string
  description: string | null
  logoKey: string | null
  isPersonal: boolean
  roleKey: string | null
  memberCount: number
  createdAt: string
}

export const inviteMemberSchema = z.object({
  email: z.email().max(254),
  roleId: z.string().min(1, 'A role is required'),
})

export type InviteMemberDto = z.infer<typeof inviteMemberSchema>

export interface InvitationDto {
  id: string
  email: string
  roleId: string
  roleName: string
  status: (typeof INVITATION_STATUSES)[number]
  expiresAt: string
  inviterName: string | null
  createdAt: string
}

export const acceptInvitationSchema = z
  .object({
    token: z.string().trim().min(1, 'An invitation token is required').max(128),
  })
  .strict()

export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>

export const updateMemberRoleSchema = z.object({
  roleId: z.string().min(1, 'A role is required'),
})

export type UpdateMemberRoleDto = z.infer<typeof updateMemberRoleSchema>

export interface OrganizationMemberDto {
  id: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
  roleId: string
  roleKey: string
  roleName: string
  joinedAt: string
}

export interface OrgRoleDto {
  id: string
  key: string
  name: string
  isSystem: boolean
}

export const createTeamSchema = z.object({
  name: z.string().trim().min(1, 'Team name is required').max(80),
  description: z.string().trim().max(300).optional().default(''),
})

export type CreateTeamDto = z.infer<typeof createTeamSchema>

export const updateTeamSchema = createTeamSchema.partial()

export type UpdateTeamDto = z.infer<typeof updateTeamSchema>

export interface TeamDto {
  id: string
  orgId: string
  name: string
  description: string | null
  memberCount: number
  createdAt: string
}

export interface TeamMemberDto {
  id: string
  userId: string
  email: string
  fullName: string
  avatarKey: string | null
  addedAt: string
}

export const addTeamMemberSchema = z.object({
  userId: z.string().min(1, 'A user is required'),
})

export type AddTeamMemberDto = z.infer<typeof addTeamMemberSchema>
