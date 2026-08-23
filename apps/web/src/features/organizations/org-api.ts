import type {
  AcceptInvitationDto,
  AddTeamMemberDto,
  CreateOrganizationDto,
  CreateTeamDto,
  InvitationDto,
  InviteMemberDto,
  OrganizationDto,
  OrganizationMemberDto,
  OrgRoleDto,
  TeamDto,
  TeamMemberDto,
  UpdateMemberRoleDto,
  UpdateOrganizationDto,
  UpdateTeamDto,
} from '@orbit/shared'

import { api } from '@/lib/api'

export function createOrganizationRequest(input: CreateOrganizationDto): Promise<OrganizationDto> {
  return api.post<OrganizationDto>('/organizations', { body: input })
}

export function listOrganizationsRequest(): Promise<OrganizationDto[]> {
  return api.get<OrganizationDto[]>('/organizations')
}

export function getOrganizationRequest(slug: string): Promise<OrganizationDto> {
  return api.get<OrganizationDto>(`/organizations/${slug}`)
}

export function updateOrganizationRequest(
  slug: string,
  input: UpdateOrganizationDto,
): Promise<OrganizationDto> {
  return api.patch<OrganizationDto>(`/organizations/${slug}`, { body: input })
}

export function deleteOrganizationRequest(slug: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/organizations/${slug}`)
}

export function listMembersRequest(slug: string): Promise<OrganizationMemberDto[]> {
  return api.get<OrganizationMemberDto[]>(`/organizations/${slug}/members`)
}

export function listRolesRequest(slug: string): Promise<OrgRoleDto[]> {
  return api.get<OrgRoleDto[]>(`/organizations/${slug}/roles`)
}

export function updateMemberRoleRequest(
  slug: string,
  userId: string,
  input: UpdateMemberRoleDto,
): Promise<OrganizationMemberDto> {
  return api.patch<OrganizationMemberDto>(`/organizations/${slug}/members/${userId}`, {
    body: input,
  })
}

export function removeMemberRequest(slug: string, userId: string): Promise<{ removed: boolean }> {
  return api.delete<{ removed: boolean }>(`/organizations/${slug}/members/${userId}`)
}

export function inviteMemberRequest(slug: string, input: InviteMemberDto): Promise<InvitationDto> {
  return api.post<InvitationDto>(`/organizations/${slug}/invitations`, { body: input })
}

export function listInvitationsRequest(slug: string): Promise<InvitationDto[]> {
  return api.get<InvitationDto[]>(`/organizations/${slug}/invitations`)
}

export function revokeInvitationRequest(
  slug: string,
  invitationId: string,
): Promise<{ revoked: boolean }> {
  return api.post<{ revoked: boolean }>(`/organizations/${slug}/invitations/${invitationId}/revoke`)
}

export function acceptInvitationRequest(input: AcceptInvitationDto): Promise<OrganizationDto> {
  return api.post<OrganizationDto>('/organizations/invitations/accept', { body: input })
}

export function listTeamsRequest(slug: string): Promise<TeamDto[]> {
  return api.get<TeamDto[]>(`/organizations/${slug}/teams`)
}

export function createTeamRequest(slug: string, input: CreateTeamDto): Promise<TeamDto> {
  return api.post<TeamDto>(`/organizations/${slug}/teams`, { body: input })
}

export function updateTeamRequest(
  slug: string,
  teamId: string,
  input: UpdateTeamDto,
): Promise<TeamDto> {
  return api.patch<TeamDto>(`/organizations/${slug}/teams/${teamId}`, { body: input })
}

export function deleteTeamRequest(slug: string, teamId: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/organizations/${slug}/teams/${teamId}`)
}

export function listTeamMembersRequest(slug: string, teamId: string): Promise<TeamMemberDto[]> {
  return api.get<TeamMemberDto[]>(`/organizations/${slug}/teams/${teamId}/members`)
}

export function addTeamMemberRequest(
  slug: string,
  teamId: string,
  input: AddTeamMemberDto,
): Promise<TeamMemberDto> {
  return api.post<TeamMemberDto>(`/organizations/${slug}/teams/${teamId}/members`, {
    body: input,
  })
}

export function removeTeamMemberRequest(
  slug: string,
  teamId: string,
  userId: string,
): Promise<{ removed: boolean }> {
  return api.delete<{ removed: boolean }>(
    `/organizations/${slug}/teams/${teamId}/members/${userId}`,
  )
}
