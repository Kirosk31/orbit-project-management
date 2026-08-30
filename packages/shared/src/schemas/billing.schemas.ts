import { z } from 'zod'

export const planKeys = ['FREE', 'STARTUP', 'TEAM', 'BUSINESS', 'ENTERPRISE'] as const
export type PlanKey = (typeof planKeys)[number]
export const PLAN_KEYS: readonly PlanKey[] = planKeys

export const subscriptionStatuses = [
  'ACTIVE',
  'TRIALING',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
] as const
export type SubscriptionStatus = (typeof subscriptionStatuses)[number]
export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = subscriptionStatuses

export interface PlanLimits {
  maxMembers: number
  maxProjects: number
  maxStorageBytes: number
  customRoles: boolean
  whiteLabel: boolean
  webhooks: boolean
  publicShare: boolean
  sso: boolean
  auditExport: boolean
}

export interface BillingPlanDto {
  id: string
  key: PlanKey
  name: string
  priceUSD: string
  currency: string
  maxMembers: number
  maxProjects: number
  maxStorageBytes: number
  limits: PlanLimits
  isActive: boolean
  isDefault: boolean
}

export interface SubscriptionDto {
  id: string
  orgId: string
  planKey: PlanKey
  planName: string
  status: SubscriptionStatus
  seats: number
  isTrial: boolean
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  usedSeats: number
  limits: PlanLimits
  createdAt: string
  updatedAt: string
}

export const changePlanSchema = z
  .object({
    planKey: z.enum(planKeys),
  })
  .strict()

export type ChangePlanInput = z.infer<typeof changePlanSchema>

export const billingWebhookSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    data: z.object({
      object: z.record(z.string(), z.unknown()),
    }),
  })
  .passthrough()

export type BillingWebhookInput = z.infer<typeof billingWebhookSchema>
