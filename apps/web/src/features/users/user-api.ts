import type {
  UpdatePreferencesDto,
  UpdateProfileDto,
  UserDto,
  UserPreferencesDto,
} from '@orbit/shared'

import { api, apiBlobRequest } from '@/lib/api'

export function getUserPreferencesQueryKey(userId: string): readonly ['user-preferences', string] {
  return ['user-preferences', userId]
}

export function updateProfileRequest(input: UpdateProfileDto): Promise<UserDto> {
  return api.patch<UserDto>('/users/me', { body: input })
}

export function uploadAvatarRequest(file: File): Promise<UserDto> {
  const form = new FormData()
  form.append('avatar', file)
  return api.post<UserDto>('/users/me/avatar', { body: form })
}

export function deleteAvatarRequest(): Promise<UserDto> {
  return api.delete<UserDto>('/users/me/avatar')
}

export function getPreferencesRequest(): Promise<UserPreferencesDto> {
  return api.get<UserPreferencesDto>('/users/me/preferences')
}

export function updatePreferencesRequest(input: UpdatePreferencesDto): Promise<UserPreferencesDto> {
  return api.patch<UserPreferencesDto>('/users/me/preferences', { body: input })
}

export function getAvatarRequest(userId: string, signal?: AbortSignal): Promise<Blob> {
  return apiBlobRequest(`/users/${encodeURIComponent(userId)}/avatar`, {
    signal,
    timeoutMs: 10_000,
  })
}
