import type {
  ChecklistDto,
  AttachmentDto,
  CreateChecklistDto,
  CreateChecklistItemDto,
  CreateLabelDto,
  CreateSubtaskDto,
  CreateSavedFilterDto,
  CreateTaskDto,
  LabelDto,
  LogTimeEntryDto,
  MoveTaskDto,
  MoveChecklistItemDto,
  TaskActivityDto,
  TaskDto,
  TaskQuery,
  SavedFilterDto,
  TimeEntryDto,
  TimeEntryListDto,
  UpdateLabelDto,
  UpdateChecklistDto,
  UpdateChecklistItemDto,
  UpdateTaskDto,
  UpdateTimeEntryDto,
  UpdateSavedFilterDto,
} from '@orbit/shared'

import { api, apiBlobRequest } from '@/lib/api'

export interface TaskListResult {
  rows: TaskDto[]
  total: number
}

export function listProjectTasksRequest(
  projectId: string,
  query?: Partial<TaskQuery>,
): Promise<TaskListResult> {
  const params = new URLSearchParams()
  if (query?.statusId) params.set('statusId', query.statusId)
  if (query?.assigneeId) params.set('assigneeId', query.assigneeId)
  if (query?.priority) params.set('priority', query.priority)
  if (query?.search) params.set('search', query.search)
  if (query?.archived !== undefined) params.set('archived', String(query.archived))
  const suffix = params.size === 0 ? '' : `?${params.toString()}`
  return api.get<TaskListResult>(`/projects/${projectId}/tasks${suffix}`)
}

export function listBoardTasksRequest(
  boardId: string,
  query?: Partial<TaskQuery>,
): Promise<TaskListResult> {
  const params = new URLSearchParams()
  if (query?.statusId) params.set('statusId', query.statusId)
  if (query?.assigneeId) params.set('assigneeId', query.assigneeId)
  if (query?.priority) params.set('priority', query.priority)
  if (query?.search) params.set('search', query.search)
  if (query?.archived !== undefined) params.set('archived', String(query.archived))
  const suffix = params.size === 0 ? '' : `?${params.toString()}`
  return api.get<TaskListResult>(`/boards/${boardId}/tasks${suffix}`)
}

export function createTaskRequest(projectId: string, input: CreateTaskDto): Promise<TaskDto> {
  return api.post<TaskDto>(`/projects/${projectId}/tasks`, { body: input })
}

export function listSubtasksRequest(taskId: string): Promise<TaskDto[]> {
  return api.get<TaskDto[]>(`/tasks/${taskId}/subtasks`)
}

export function createSubtaskRequest(taskId: string, input: CreateSubtaskDto): Promise<TaskDto> {
  return api.post<TaskDto>(`/tasks/${taskId}/subtasks`, { body: input })
}

export function listChecklistsRequest(taskId: string): Promise<ChecklistDto[]> {
  return api.get<ChecklistDto[]>(`/tasks/${taskId}/checklists`)
}

export function createChecklistRequest(
  taskId: string,
  input: CreateChecklistDto,
): Promise<ChecklistDto> {
  return api.post<ChecklistDto>(`/tasks/${taskId}/checklists`, { body: input })
}

export function updateChecklistRequest(
  taskId: string,
  checklistId: string,
  input: UpdateChecklistDto,
): Promise<ChecklistDto> {
  return api.patch<ChecklistDto>(`/tasks/${taskId}/checklists/${checklistId}`, { body: input })
}

export function deleteChecklistRequest(
  taskId: string,
  checklistId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/tasks/${taskId}/checklists/${checklistId}`)
}

export function createChecklistItemRequest(
  taskId: string,
  checklistId: string,
  input: CreateChecklistItemDto,
): Promise<ChecklistDto> {
  return api.post<ChecklistDto>(`/tasks/${taskId}/checklists/${checklistId}/items`, {
    body: input,
  })
}

export function updateChecklistItemRequest(
  taskId: string,
  checklistId: string,
  itemId: string,
  input: UpdateChecklistItemDto,
): Promise<ChecklistDto> {
  return api.patch<ChecklistDto>(`/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`, {
    body: input,
  })
}

export function deleteChecklistItemRequest(
  taskId: string,
  checklistId: string,
  itemId: string,
): Promise<ChecklistDto> {
  return api.delete<ChecklistDto>(`/tasks/${taskId}/checklists/${checklistId}/items/${itemId}`)
}

export function moveChecklistItemRequest(
  taskId: string,
  checklistId: string,
  itemId: string,
  input: MoveChecklistItemDto,
): Promise<ChecklistDto> {
  return api.post<ChecklistDto>(`/tasks/${taskId}/checklists/${checklistId}/items/${itemId}/move`, {
    body: input,
  })
}

export function listTimeEntriesRequest(taskId: string): Promise<TimeEntryListDto> {
  return api.get<TimeEntryListDto>(`/tasks/${taskId}/time-entries?page=1&pageSize=100`)
}

export function logTimeEntryRequest(taskId: string, input: LogTimeEntryDto): Promise<TimeEntryDto> {
  return api.post<TimeEntryDto>(`/tasks/${taskId}/time-entries`, { body: input })
}

export function updateTimeEntryRequest(
  taskId: string,
  timeEntryId: string,
  input: UpdateTimeEntryDto,
): Promise<TimeEntryDto> {
  return api.patch<TimeEntryDto>(`/tasks/${taskId}/time-entries/${timeEntryId}`, {
    body: input,
  })
}

export function deleteTimeEntryRequest(
  taskId: string,
  timeEntryId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/tasks/${taskId}/time-entries/${timeEntryId}`)
}

export function startTaskTimerRequest(taskId: string, note?: string): Promise<TimeEntryDto> {
  return api.post<TimeEntryDto>(`/tasks/${taskId}/timer/start`, {
    body: { note: note?.trim() || undefined },
  })
}

export function stopTaskTimerRequest(taskId: string): Promise<TimeEntryDto> {
  return api.post<TimeEntryDto>(`/tasks/${taskId}/timer/stop`)
}

export function listAttachmentsRequest(taskId: string): Promise<AttachmentDto[]> {
  return api.get<AttachmentDto[]>(`/tasks/${taskId}/attachments`)
}

export function uploadAttachmentRequest(taskId: string, file: File): Promise<AttachmentDto> {
  const form = new FormData()
  form.append('attachment', file)
  return api.post<AttachmentDto>(`/tasks/${taskId}/attachments`, { body: form })
}

export function downloadAttachmentRequest(
  taskId: string,
  attachmentId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return apiBlobRequest(`/tasks/${taskId}/attachments/${attachmentId}/download`, {
    signal,
    timeoutMs: 30_000,
  })
}

export function deleteAttachmentRequest(
  taskId: string,
  attachmentId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/tasks/${taskId}/attachments/${attachmentId}`)
}

export function listSavedFiltersRequest(boardId: string): Promise<SavedFilterDto[]> {
  return api.get<SavedFilterDto[]>(`/boards/${boardId}/saved-filters`)
}

export function createSavedFilterRequest(
  boardId: string,
  input: CreateSavedFilterDto,
): Promise<SavedFilterDto> {
  return api.post<SavedFilterDto>(`/boards/${boardId}/saved-filters`, { body: input })
}

export function updateSavedFilterRequest(
  boardId: string,
  filterId: string,
  input: UpdateSavedFilterDto,
): Promise<SavedFilterDto> {
  return api.patch<SavedFilterDto>(`/boards/${boardId}/saved-filters/${filterId}`, {
    body: input,
  })
}

export function deleteSavedFilterRequest(
  boardId: string,
  filterId: string,
): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/boards/${boardId}/saved-filters/${filterId}`)
}

export function getTaskRequest(id: string): Promise<TaskDto> {
  return api.get<TaskDto>(`/tasks/${id}`)
}

export function updateTaskRequest(id: string, input: UpdateTaskDto): Promise<TaskDto> {
  return api.patch<TaskDto>(`/tasks/${id}`, { body: input })
}

export function deleteTaskRequest(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/tasks/${id}`)
}

export function archiveTaskRequest(id: string): Promise<TaskDto> {
  return api.post<TaskDto>(`/tasks/${id}/archive`)
}

export function unarchiveTaskRequest(id: string): Promise<TaskDto> {
  return api.post<TaskDto>(`/tasks/${id}/unarchive`)
}

export function moveTaskRequest(id: string, input: MoveTaskDto): Promise<{ moved: boolean }> {
  return api.post<{ moved: boolean }>(`/tasks/${id}/move`, { body: input })
}

export function addAssigneeRequest(taskId: string, userId: string): Promise<TaskDto> {
  return api.post<TaskDto>(`/tasks/${taskId}/assignees/${userId}`)
}

export function removeAssigneeRequest(taskId: string, userId: string): Promise<TaskDto> {
  return api.delete<TaskDto>(`/tasks/${taskId}/assignees/${userId}`)
}

export function addTaskLabelRequest(taskId: string, labelId: string): Promise<TaskDto> {
  return api.post<TaskDto>(`/tasks/${taskId}/labels/${labelId}`)
}

export function removeTaskLabelRequest(taskId: string, labelId: string): Promise<TaskDto> {
  return api.delete<TaskDto>(`/tasks/${taskId}/labels/${labelId}`)
}

export function listTaskActivityRequest(taskId: string): Promise<TaskActivityDto[]> {
  return api.get<TaskActivityDto[]>(`/tasks/${taskId}/activity`)
}

export function listOrgLabelsRequest(orgSlug: string): Promise<LabelDto[]> {
  return api.get<LabelDto[]>(`/organizations/${orgSlug}/labels`)
}

export function createOrgLabelRequest(orgSlug: string, input: CreateLabelDto): Promise<LabelDto> {
  return api.post<LabelDto>(`/organizations/${orgSlug}/labels`, { body: input })
}

export function updateLabelRequest(id: string, input: UpdateLabelDto): Promise<LabelDto> {
  return api.patch<LabelDto>(`/labels/${id}`, { body: input })
}

export function deleteLabelRequest(id: string): Promise<{ deleted: boolean }> {
  return api.delete<{ deleted: boolean }>(`/labels/${id}`)
}
