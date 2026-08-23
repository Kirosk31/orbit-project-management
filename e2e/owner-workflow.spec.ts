import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('an owner can create a workspace, project, board, column, and task', async ({ page }) => {
  const unique = `${Date.now()}-${test.info().workerIndex}`
  const organizationName = `E2E Workspace ${unique}`
  const projectName = `E2E Project ${unique}`
  const boardName = `E2E Board ${unique}`
  const taskName = `E2E Task ${unique}`

  await page.goto('/register')
  await page.getByLabel('Full name').fill('E2E Owner')
  await page.getByLabel('Email').fill(`e2e-${unique}@orbit.test`)
  await page.getByLabel('Password').fill('TestingPassword123')
  const registrationResponse = page.waitForResponse((response) =>
    response.url().includes('/api/v1/auth/register'),
  )
  await page.getByRole('button', { name: 'Create account' }).click()
  const registration = await registrationResponse
  expect(registration.status(), `Registration failed: ${await registration.text()}`).toBe(201)
  await expect(page).toHaveURL(/\/app$/)

  await page.getByRole('link', { name: 'Organizations' }).click()
  await page.getByRole('button', { name: 'Create organization' }).click()
  await page.getByLabel('Name').fill(organizationName)
  await page.getByLabel('Description').fill('Browser-tested workspace')
  await page.getByRole('button', { name: 'Create organization', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: organizationName })).toBeVisible()

  await page.getByRole('link', { name: 'Projects' }).click()
  await page.getByRole('button', { name: 'Create project' }).click()
  await page.getByLabel('Name').fill(projectName)
  await page.getByLabel('Key').fill(`E${test.info().workerIndex}E`)
  await page.getByLabel('Description').fill('Browser-tested delivery project')
  await page.getByRole('button', { name: 'Create project', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible()

  await page.getByRole('button', { name: 'Create board' }).click()
  await page.getByLabel('Name').fill(boardName)
  await page.getByLabel('Description').fill('Browser-tested sprint board')
  await page.getByRole('button', { name: 'Create board', exact: true }).last().click()
  await expect(page.getByRole('heading', { name: boardName })).toBeVisible()

  await page.getByRole('button', { name: 'Add column' }).click()
  await page.getByLabel('Column name').fill('To Do')
  await page.getByRole('button', { name: 'Add column', exact: true }).last().click()
  await expect(page.getByText('To Do', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Title').fill(taskName)
  await page.getByLabel('Description').fill('Created by the critical browser workflow')
  await page.getByRole('button', { name: 'Add task', exact: true }).last().click()
  await expect(page.getByRole('button', { name: new RegExp(taskName) })).toBeVisible()

  await page.getByRole('button', { name: new RegExp(taskName) }).click()
  await expect(page.getByRole('heading', { name: taskName })).toBeVisible()

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(
    accessibility.violations.filter((violation) =>
      ['serious', 'critical'].includes(violation.impact ?? ''),
    ),
  ).toEqual([])
})
