import type {
  AuthResponseDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  ResendVerificationDto,
  VerifyEmailDto,
  UserDto,
} from '@orbit/shared'

import { api } from '@/lib/api'

export function loginRequest(input: LoginDto): Promise<AuthResponseDto> {
  return api.post<AuthResponseDto>('/auth/login', { body: input })
}

export function registerRequest(input: RegisterDto): Promise<AuthResponseDto> {
  return api.post<AuthResponseDto>('/auth/register', { body: input })
}

export function logoutRequest(): Promise<void> {
  return api.post<void>('/auth/logout')
}

export function logoutAllRequest(): Promise<void> {
  return api.post<void>('/auth/logout-all')
}

export function getMeRequest(): Promise<UserDto> {
  return api.get<{ user: UserDto }>('/auth/me').then((payload) => payload.user)
}

export function verifyEmailRequest(input: VerifyEmailDto): Promise<void> {
  return api.post<void>('/auth/verify-email', { body: input })
}

export function resendVerificationRequest(input: ResendVerificationDto): Promise<void> {
  return api.post<void>('/auth/resend-verification', { body: input })
}

export function forgotPasswordRequest(input: ForgotPasswordDto): Promise<void> {
  return api.post<void>('/auth/forgot-password', { body: input })
}

export function resetPasswordRequest(input: ResetPasswordDto): Promise<void> {
  return api.post<void>('/auth/reset-password', { body: input })
}
