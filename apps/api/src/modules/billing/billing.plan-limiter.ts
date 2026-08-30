import type { BillingService } from './billing.service.js'

/**
 * Enforces plan limits on tenant operations. When `enabled` is false the
 * limiter is a no-op, which is used when billing is off (e.g. local dev or
 * tests that must not be blocked by a seeded default plan).
 */
export class PlanLimiter {
  constructor(
    private readonly service: BillingService,
    private readonly enabled: boolean,
  ) {}

  async assertCanAddMember(orgId: string): Promise<void> {
    if (!this.enabled) {
      return
    }
    await this.service.assertCanAddMember(orgId)
  }
}
