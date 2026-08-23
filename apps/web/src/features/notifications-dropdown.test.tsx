import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'
import React from 'react'
import { AppProviders } from '@/app/providers'

vi.mock('@/features/notifications-api', () => ({
  listNotificationsRequest: vi.fn(async () => ({ rows: [], total: 0 })),
  countUnreadRequest: vi.fn(async () => ({ count: 2 })),
  markReadRequest: vi.fn(async () => ({ updated: true })),
  markAllReadRequest: vi.fn(async () => ({ updated: 2 })),
}))

import { NotificationsDropdown } from '@/features/notifications-dropdown'

describe('NotificationsDropdown', () => {
  it('renders bell with unread badge', async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <NotificationsDropdown />
        </MemoryRouter>
      </AppProviders>,
    )

    // Bell button exists
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // Badge with count
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  it('opens dropdown and shows no notifications message', async () => {
    render(
      <AppProviders>
        <MemoryRouter>
          <NotificationsDropdown />
        </MemoryRouter>
      </AppProviders>,
    )

    const button = screen.getByRole('button')
    const user = userEvent.setup()
    await user.click(button)

    await waitFor(() => {
      // Tests may run without loaded i18n translations; accept either the translated text or the raw i18n key
      expect(
        screen.getByText(/No notifications|notifications.noNotifications/i),
      ).toBeInTheDocument()
    })
  })
})
