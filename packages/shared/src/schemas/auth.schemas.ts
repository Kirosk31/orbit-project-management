import { z } from 'zod'

export const emailSchema = z.email().max(254)

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')

export const fullNameSchema = z.string().trim().min(1, 'Name is required').max(120)

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
})

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(72),
  rememberMe: z.boolean().optional().default(false),
})

export const forgotPasswordSchema = z.object({
  email: emailSchema,
})

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
})

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

export const resendVerificationSchema = z.object({
  email: emailSchema,
})

export type RegisterDto = z.infer<typeof registerSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>
export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>
export type ResendVerificationDto = z.infer<typeof resendVerificationSchema>

export interface UserDto {
  id: string
  email: string
  fullName: string
  bio: string | null
  avatarKey: string | null
  isEmailVerified: boolean
  createdAt: string
}

export interface AuthSessionDto {
  accessToken: string
  expiresIn: number
  sessionExpiresAt: string
}

export interface AuthResponseDto extends AuthSessionDto {
  user: UserDto
}
