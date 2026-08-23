import { Suspense, lazy, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { bootstrapSession } from '@/features/auth/auth-store'
import { RequireAuth } from '@/features/auth/require-auth'
import { AppShell } from '@/features/app/app-shell'
import { AuthLayout } from '@/features/auth/auth-layout'
import { CommandPalette } from '@/features/command-palette/command-palette'
import { useRealtime } from '@/features/realtime/use-realtime'

const LandingPage = lazy(() =>
  import('@/pages/landing/landing-page').then((module) => ({ default: module.LandingPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/auth/login-page').then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/auth/register-page').then((module) => ({ default: module.RegisterPage })),
)
const ForgotPasswordPage = lazy(() =>
  import('@/pages/auth/forgot-password-page').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/auth/reset-password-page').then((module) => ({
    default: module.ResetPasswordPage,
  })),
)
const VerifyEmailPage = lazy(() =>
  import('@/pages/auth/verify-email-page').then((module) => ({
    default: module.VerifyEmailPage,
  })),
)
const ProfilePage = lazy(() =>
  import('@/pages/app/profile-page').then((module) => ({ default: module.ProfilePage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/app/dashboard-page').then((module) => ({ default: module.DashboardPage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/app/notifications-page').then((module) => ({
    default: module.NotificationsPage,
  })),
)
const OrganizationsPage = lazy(() =>
  import('@/pages/app/organizations-page').then((module) => ({
    default: module.OrganizationsPage,
  })),
)
const OrganizationDetailPage = lazy(() =>
  import('@/pages/app/organization-detail-page').then((module) => ({
    default: module.OrganizationDetailPage,
  })),
)
const ProjectsPage = lazy(() =>
  import('@/pages/app/projects-page').then((module) => ({ default: module.ProjectsPage })),
)
const ProjectDetailPage = lazy(() =>
  import('@/pages/app/project-detail-page').then((module) => ({
    default: module.ProjectDetailPage,
  })),
)
const BoardDetailPage = lazy(() =>
  import('@/pages/app/board-detail-page').then((module) => ({
    default: module.BoardDetailPage,
  })),
)
const TaskDetailPage = lazy(() =>
  import('@/pages/app/task-detail-page').then((module) => ({
    default: module.TaskDetailPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/not-found-page').then((module) => ({ default: module.NotFoundPage })),
)

function PageFallback(): ReactNode {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="flex w-full max-w-sm flex-col gap-4 p-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}

/**
 * Rotates the refresh token once on cold start (the access token is kept in
 * memory only) and marks the session as authenticated or anonymous.
 */
function SessionBootstrap({ children }: { children: ReactNode }): ReactNode {
  useEffect(() => {
    void bootstrapSession()
  }, [])

  return children
}

export function App(): ReactNode {
  useRealtime()

  return (
    <SessionBootstrap>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Route>
            <Route
              path="/app"
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="organizations/:slug" element={<OrganizationDetailPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="boards/:boardId" element={<BoardDetailPage />} />
              <Route path="tasks/:taskId" element={<TaskDetailPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <CommandPalette />
        </Suspense>
      </BrowserRouter>
    </SessionBootstrap>
  )
}
