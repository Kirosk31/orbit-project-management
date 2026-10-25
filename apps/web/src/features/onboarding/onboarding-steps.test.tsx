import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import '@/lib/i18n'
import { OnboardingSteps } from './onboarding-steps'
import { isOnboarding } from './progress'

const base = { hasWorkspace: false, hasProject: false, hasTask: false, firstProjectPath: null }

describe('isOnboarding', () => {
  it('stays on until workspace, project and task all exist', () => {
    expect(isOnboarding(base)).toBe(true)
    expect(isOnboarding({ ...base, hasWorkspace: true, hasProject: true })).toBe(true)
    expect(isOnboarding({ ...base, hasWorkspace: true, hasProject: true, hasTask: true })).toBe(
      false,
    )
  })
})

describe('OnboardingSteps', () => {
  it('marks the first open step as current and links it', () => {
    render(
      <MemoryRouter>
        <OnboardingSteps progress={{ ...base, hasWorkspace: true }} />
      </MemoryRouter>,
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[1]).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/projects')
  })

  it('sends the last step to the first project', () => {
    render(
      <MemoryRouter>
        <OnboardingSteps
          progress={{
            hasWorkspace: true,
            hasProject: true,
            hasTask: false,
            firstProjectPath: '/app/projects/p1',
          }}
        />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/projects/p1')
  })
})
