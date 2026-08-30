import type { BillingPlan, PrismaClient, Subscription } from '@prisma/client'

export type SubscriptionStatusValue = 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE'

export interface SubscriptionRow extends Subscription {
  plan: BillingPlan
}

export interface BillingRepository {
  listPlans(): Promise<BillingPlan[]>
  findPlanByKey(key: string): Promise<BillingPlan | null>
  findPlanById(id: string): Promise<BillingPlan | null>
  getSubscription(orgId: string): Promise<SubscriptionRow | null>
  upsertSubscription(input: {
    orgId: string
    planId: string
    status: SubscriptionStatusValue
    seats: number
    isTrial?: boolean
    trialEndsAt?: Date | null
    currentPeriodEnd?: Date | null
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    lastEventId?: string | null
    lastEventAt?: Date | null
    createdBy?: string | null
  }): Promise<Subscription>
  updateSubscriptionStatus(id: string, status: SubscriptionStatusValue): Promise<Subscription>
}

export class PrismaBillingRepository implements BillingRepository {
  constructor(private readonly prisma: PrismaClient) {}

  listPlans() {
    return this.prisma.billingPlan.findMany({
      where: { isActive: true },
      orderBy: { priceUSD: 'asc' },
    })
  }

  findPlanByKey(key: string) {
    return this.prisma.billingPlan.findUnique({ where: { key } })
  }

  findPlanById(id: string) {
    return this.prisma.billingPlan.findUnique({ where: { id } })
  }

  getSubscription(orgId: string) {
    return this.prisma.subscription.findUnique({
      where: { orgId },
      include: { plan: true },
    })
  }

  async upsertSubscription(input: {
    orgId: string
    planId: string
    status: SubscriptionStatusValue
    seats: number
    isTrial?: boolean
    trialEndsAt?: Date | null
    currentPeriodEnd?: Date | null
    stripeCustomerId?: string | null
    stripeSubscriptionId?: string | null
    lastEventId?: string | null
    lastEventAt?: Date | null
    createdBy?: string | null
  }): Promise<Subscription> {
    const updateData = {
      planId: input.planId,
      status: input.status,
      seats: input.seats,
      isTrial: input.isTrial ?? false,
      trialEndsAt: input.trialEndsAt ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      stripeCustomerId: input.stripeCustomerId ?? null,
      stripeSubscriptionId: input.stripeSubscriptionId ?? null,
      lastEventId: input.lastEventId ?? null,
      lastEventAt: input.lastEventAt ?? null,
      createdBy: input.createdBy ?? null,
    }

    return this.prisma.subscription.upsert({
      where: { orgId: input.orgId },
      create: {
        orgId: input.orgId,
        ...updateData,
      },
      update: updateData,
    })
  }

  async updateSubscriptionStatus(
    id: string,
    status: SubscriptionStatusValue,
  ): Promise<Subscription> {
    return this.prisma.subscription.update({
      where: { id },
      data: { status },
    })
  }
}
