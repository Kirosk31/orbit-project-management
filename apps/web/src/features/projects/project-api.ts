import type {
  AddProjectMemberDto,
  CreateProjectDto,
  ProjectActivityDto,
  ProjectDto,
  ProjectMemberDto,
  UpdateProjectDto,
} from '@orbit/shared'

import { api } from '@/lib/api'

export function createProjectRequest(slug: string, input: CreateProjectDto): Promise<ProjectDto> {
  return api.post<ProjectDto>(`/organizations/${slug}/projects`, { body: input })
}

export function listProjectsRequest(slug: string, archived?: boolean): Promise<ProjectDto[]> {
  const query = archived === undefined ? '' : `?archived=${archived}`
  return api.get<ProjectDto[]>(`/organizations/${slug}/projects${query}`)
}

export function getProjectRequest(id: string): Promise<ProjectDto> {
  return api.get<ProjectDto>(`/projects/${id}`)
}

export function updateProjectRequest(id: string, input: UpdateProjectDto): Promise<ProjectDto> {
  return api.patch<ProjectDto>(`/projects/${id}`, { body: input })
}

export function deleteProjectRequest(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/projects/${id}`)
}

export function archiveProjectRequest(id: string): Promise<ProjectDto> {
  return api.post<ProjectDto>(`/projects/${id}/archive`)
}

export function unarchiveProjectRequest(id: string): Promise<ProjectDto> {
  return api.post<ProjectDto>(`/projects/${id}/unarchive`)
}

export function favoriteProjectRequest(id: string): Promise<{ id: string; isFavorite: true }> {
  return api.post<{ id: string; isFavorite: true }>(`/projects/${id}/favorite`)
}

export function unfavoriteProjectRequest(id: string): Promise<{ id: string; isFavorite: false }> {
  return api.delete<{ id: string; isFavorite: false }>(`/projects/${id}/favorite`)
}

export function listProjectMembersRequest(id: string): Promise<ProjectMemberDto[]> {
  return api.get<ProjectMemberDto[]>(`/projects/${id}/members`)
}

export function addProjectMemberRequest(
  id: string,
  input: AddProjectMemberDto,
): Promise<ProjectMemberDto> {
  return api.post<ProjectMemberDto>(`/projects/${id}/members`, { body: input })
}

export function removeProjectMemberRequest(
  id: string,
  userId: string,
): Promise<{ removed: boolean }> {
  return api.delete<{ removed: boolean }>(`/projects/${id}/members/${userId}`)
}

export function listProjectActivityRequest(id: string): Promise<ProjectActivityDto[]> {
  return api.get<ProjectActivityDto[]>(`/projects/${id}/activity`)
}
