import { zodResolver } from '@hookform/resolvers/zod'
import { acceptInvitationSchema, createOrganizationSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, TicketIcon, UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { EmptyState, PageContainer, PageHeader } from '@/components/shared/page'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  acceptInvitationRequest,
  createOrganizationRequest,
  listOrganizationsRequest,
} from '@/features/organizations/org-api'
import { initialsOf } from '@/lib/utils'

export function OrganizationsPage(): ReactNode {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const [acceptOpen, setAcceptOpen] = useState(false)
  const invitationToken = searchParams.get('invitationToken')

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizationsRequest,
  })

  const createMutation = useMutation({
    mutationFn: createOrganizationRequest,
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success(t('org.created'))
      navigate(`/app/organizations/${org.slug}`)
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const acceptMutation = useMutation({
    mutationFn: acceptInvitationRequest,
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      setAcceptOpen(false)
      toast.success(t('org.accepted'))
      navigate(`/app/organizations/${org.slug}`)
    },
    onError: () => toast.error(t('org.permissionDenied')),
  })

  const createForm = useForm<
    z.input<typeof createOrganizationSchema>,
    unknown,
    z.output<typeof createOrganizationSchema>
  >({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', description: '' },
  })

  const acceptForm = useForm<
    z.input<typeof acceptInvitationSchema>,
    unknown,
    z.output<typeof acceptInvitationSchema>
  >({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { token: '' },
  })

  useEffect(() => {
    if (!invitationToken) {
      return
    }

    acceptForm.reset({ token: invitationToken })
    setAcceptOpen(true)

    const sanitizedSearchParams = new URLSearchParams(searchParams)
    sanitizedSearchParams.delete('invitationToken')
    setSearchParams(sanitizedSearchParams, { replace: true })
  }, [acceptForm, invitationToken, searchParams, setSearchParams])

  return (
    <PageContainer width="narrow">
      <PageHeader
        title={t('org.title')}
        description={t('org.subtitle')}
        actions={
          <>
            <Button variant="ghost" onClick={() => setAcceptOpen(true)}>
              <TicketIcon />
              {t('org.acceptInvitation')}
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon />
                  {t('org.create')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('org.create')}</DialogTitle>
                  <DialogDescription>{t('org.createDescription')}</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="org-name">{t('org.name')}</Label>
                    <Input
                      id="org-name"
                      autoFocus
                      placeholder={t('org.namePlaceholder')}
                      {...createForm.register('name')}
                    />
                    {createForm.formState.errors.name && (
                      <p className="text-destructive text-xs">
                        {createForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="org-description">{t('org.description')}</Label>
                    <Textarea
                      id="org-description"
                      rows={3}
                      placeholder={t('org.descriptionPlaceholder')}
                      {...createForm.register('description')}
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? t('org.creating') : t('org.create')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('org.acceptInvitation')}</DialogTitle>
            <DialogDescription>{t('org.acceptDescription')}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={acceptForm.handleSubmit((values) => acceptMutation.mutate(values))}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="invitation-token">{t('org.invitationToken')}</Label>
              <Input
                id="invitation-token"
                autoFocus
                autoComplete="off"
                aria-invalid={acceptForm.formState.errors.token ? true : undefined}
                placeholder={t('org.acceptTokenPlaceholder')}
                {...acceptForm.register('token')}
              />
              {acceptForm.formState.errors.token && (
                <p className="text-destructive text-xs">
                  {acceptForm.formState.errors.token.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={acceptMutation.isPending}>
                {acceptMutation.isPending ? t('common.loading') : t('org.acceptButton')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {orgsQuery.isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : orgsQuery.data && orgsQuery.data.length > 0 ? (
        <ul className="divide-y overflow-hidden rounded-lg border bg-card">
          {orgsQuery.data.map((org) => (
            <li key={org.id}>
              <Link
                to={`/app/organizations/${org.slug}`}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-accent/60"
              >
                <Avatar className="size-9 rounded-md">
                  <AvatarFallback className="rounded-md">{initialsOf(org.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{org.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {org.isPersonal ? t('app.personalWorkspace') : org.description || org.slug}
                  </span>
                </span>
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                  <UsersIcon className="size-3.5" aria-hidden="true" />
                  {t('org.memberCount', { count: org.memberCount })}
                </span>
                {org.roleKey && (
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {org.roleKey}
                  </Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('org.empty')} description={t('org.emptyHint')} />
      )}
    </PageContainer>
  )
}
