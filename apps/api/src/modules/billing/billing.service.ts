import {
  type BillingPlanDto,
  type BillingWebhookInput,
  type PlanKey,
  type PlanLimits,
  type SubscriptionDto,
} from '@orbit/shared'
import type { BillingPlan } from '@prisma/client'
import { badRequest, forbidden, notFound, paymentRequired } from '../../core/errors/index.js'
import type { OrganizationsRepository } from '../organizations/organizations.repository.js'
import type { BillingRepository, SubscriptionRow } from './billing.repository.js'

export interface BillingProvider {
  readonly id: string
  createCheckout(input: {
    orgId: string
    planKey: PlanKey
    successUrl: string
    cancelUrl: string
  }): Promise<{ url: string }>
  createPortal(input: { orgId: string }): Promise<{ url: string }>
  handleWebhook(event: BillingWebhookInput): Promise<void>
}

export interface BillingServiceDependencies {
  repository: BillingRepository
  organizations: OrganizationsRepository
  defaultPlanKey: PlanKey
  checkoutEnabled: boolean
  webAppUrl: string
  provider?: BillingProvider
}

function toLimits(
  plan: Pick<
    BillingPlan,
    | 'maxMembers'
    | 'maxProjects'
    | 'maxStorageBytes'
    | 'customRoles'
    | 'whiteLabel'
    | 'webhooks'
    | 'publicShare'
    | 'sso'
    | 'auditExport'
  >,
): PlanLimits {
  return {
    maxMembers: plan.maxMembers,
    maxProjects: plan.maxProjects,
    maxStorageBytes: Number(plan.maxStorageBytes),
    customRoles: plan.customRoles,
    whiteLabel: plan.whiteLabel,
    webhooks: plan.webhooks,
    publicShare: plan.publicShare,
    sso: plan.sso,
    auditExport: plan.auditExport,
  }
}

function toPlanDto(plan: BillingPlan): BillingPlanDto {
  return {
    id: plan.id,
    key: plan.key as PlanKey,
    name: plan.name,
    priceUSD: plan.priceUSD.toString(),
    currency: plan.currency,
    maxMembers: plan.maxMembers,
    maxProjects: plan.maxProjects,
    maxStorageBytes: Number(plan.maxStorageBytes),
    limits: toLimits(plan),
    isActive: plan.isActive,
    isDefault: plan.isDefault,
  }
}

function toSubscriptionDto(sub: SubscriptionRow, usedSeats: number): SubscriptionDto {
  return {
    id: sub.id,
    orgId: sub.orgId,
    planKey: sub.plan.key as PlanKey,
    planName: sub.plan.name,
    status: sub.status,
    seats: sub.seats,
    isTrial: sub.isTrial,
    trialEndsAt: sub.trialEndsAt ? sub.trialEndsAt.toISOString() : null,
    currentPeriodEnd: sub.currentPeriodEnd ? sub.currentPeriodEnd.toISOString() : null,
    usedSeats,
    limits: toLimits(sub.plan),
    createdAt: sub.createdAt.toISOString(),
    updatedAt: sub.updatedAt.toISOString(),
  }
}

function toVirtualSubscription(
  orgId: string,
  plan: BillingPlan,
  usedSeats: number,
): SubscriptionDto {
  return {
    id: `${orgId}:default`,
    orgId,
    planKey: plan.key as PlanKey,
    planName: plan.name,
    status: 'ACTIVE',
    seats: plan.maxMembers,
    isTrial: false,
    trialEndsAt: null,
    currentPeriodEnd: null,
    usedSeats,
    limits: toLimits(plan),
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  }
}

export class BillingService {
  constructor(private readonly deps: BillingServiceDependencies) {}

  async listPlans(): Promise<BillingPlanDto[]> {
    const plans = await this.deps.repository.listPlans()
    return plans.map(toPlanDto)
  }

  async getSubscription(orgId: string): Promise<SubscriptionDto> {
    const usedSeats = await this.deps.organizations.countMembers(orgId)
    const sub = await this.deps.repository.getSubscription(orgId)

    if (sub) {
      return toSubscriptionDto(sub, usedSeats)
    }

    const fallback = await this.deps.repository.findPlanByKey(this.deps.defaultPlanKey)
    if (!fallback) {
      throw new Error('Default billing plan is not seeded')
    }
    return toVirtualSubscription(orgId, fallback, usedSeats)
  }

  async getActiveLimits(orgId: string): Promise<PlanLimits> {
    const { plan } = await this.resolveCurrentPlan(orgId)
    return toLimits(plan)
  }

  async createCheckoutSession(input: {
    orgId: string
    actorUserId: string
    planKey: PlanKey
  }): Promise<{ url: string }> {
    await this.assertOwner(input.orgId, input.actorUserId)
    if (!this.deps.provider || !this.deps.checkoutEnabled) {
      throw badRequest('Self-serve checkout is not configured. Contact sales to activate a plan.')
    }
    const plan = await this.deps.repository.findPlanByKey(input.planKey)
    if (!plan || !plan.isActive) {
      throw notFound('Plan not found')
    }

    const billingSettingsUrl = new URL('/settings/billing', this.deps.webAppUrl)
    const successUrl = new URL(billingSettingsUrl)
    successUrl.searchParams.set('checkout', 'success')
    const cancelUrl = new URL(billingSettingsUrl)
    cancelUrl.searchParams.set('checkout', 'canceled')

    return this.deps.provider.createCheckout({
      orgId: input.orgId,
      planKey: input.planKey,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
    })
  }

  async createPortalSession(input: {
    orgId: string
    actorUserId: string
  }): Promise<{ url: string }> {
    await this.assertOwner(input.orgId, input.actorUserId)
    if (!this.deps.provider || !this.deps.checkoutEnabled) {
      throw badRequest('Billing portal is not configured.')
    }
    return this.deps.provider.createPortal({ orgId: input.orgId })
  }

  async handleWebhook(event: BillingWebhookInput): Promise<void> {
    if (!this.deps.provider) {
      throw badRequest('Payment webhooks are not configured.')
    }
    await this.deps.provider.handleWebhook(event)
  }

  async assertCanAddMember(orgId: string): Promise<void> {
    const { plan, usedSeats } = await this.resolveCurrentPlan(orgId)
    if (usedSeats >= plan.maxMembers) {
      throw paymentRequired(
        `This plan allows up to ${plan.maxMembers} members. Upgrade to add more.`,
      )
    }
  }

  private async resolveCurrentPlan(
    orgId: string,
  ): Promise<{ plan: BillingPlan; usedSeats: number }> {
    const usedSeats = await this.deps.organizations.countMembers(orgId)
    const sub = await this.deps.repository.getSubscription(orgId)

    if (sub && (sub.status === 'ACTIVE' || sub.status === 'TRIALING')) {
      return { plan: sub.plan, usedSeats }
    }

    const fallback = await this.deps.repository.findPlanByKey(this.deps.defaultPlanKey)
    if (!fallback) {
      throw new Error('Default billing plan is not seeded')
    }
    return { plan: fallback, usedSeats }
  }

  private async assertOwner(orgId: string, userId: string): Promise<void> {
    const membership = await this.deps.organizations.getMembership(orgId, userId)
    if (!membership || !membership.isActive || membership.role.key !== 'OWNER') {
      throw forbidden('Only the organization owner can manage billing')
    }
  }
}
