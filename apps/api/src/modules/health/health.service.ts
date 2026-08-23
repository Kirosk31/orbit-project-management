export interface HealthTargets {
  database: () => Promise<void>
  redis: () => Promise<boolean>
}

export interface LivenessReport {
  status: 'ok'
  uptimeSeconds: number
  startedAt: string
  timestamp: string
}

export interface ReadinessReport {
  status: 'ok' | 'degraded'
  checks: Record<string, 'ok' | 'error'>
  timestamp: string
}

export class HealthService {
  constructor(
    private readonly targets: HealthTargets,
    private readonly startedAt: Date,
  ) {}

  liveness(): LivenessReport {
    return {
      status: 'ok',
      uptimeSeconds: Math.floor((Date.now() - this.startedAt.getTime()) / 1000),
      startedAt: this.startedAt.toISOString(),
      timestamp: new Date().toISOString(),
    }
  }

  async readiness(): Promise<ReadinessReport> {
    const checks: Record<string, 'ok' | 'error'> = {}

    try {
      await this.targets.database()
      checks.database = 'ok'
    } catch {
      checks.database = 'error'
    }

    checks.redis = (await this.targets.redis()) ? 'ok' : 'error'

    const status: ReadinessReport['status'] = Object.values(checks).every((check) => check === 'ok')
      ? 'ok'
      : 'degraded'

    return {
      status,
      checks,
      timestamp: new Date().toISOString(),
    }
  }
}
