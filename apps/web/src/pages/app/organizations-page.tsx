import { zodResolver } from '@hookform/resolvers/zod'
import { acceptInvitationSchema, createOrganizationSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2Icon, PlusIcon, TicketIcon, UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { formatDate } from '@/lib/utils'

export function OrganizationsPage(): ReactNode {
  const { t, i18n } = useTranslation()
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
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('org.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('org.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAcceptOpen(true)}>
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
                  <Button type="submit" disabled={createMutation.isPending} className="self-start">
                    {createMutation.isPending ? t('org.creating') : t('org.create')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

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
              <Button type="submit" disabled={acceptMutation.isPending} className="self-start">
                {acceptMutation.isPending ? t('common.loading') : t('org.acceptButton')}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {orgsQuery.isPending ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : orgsQuery.data && orgsQuery.data.length > 0 ? (
          <div className="flex flex-col gap-4">
            {orgsQuery.data.map((org) => (
              <Link
                key={org.id}
                to={`/app/organizations/${org.slug}`}
                className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              >
                <Card className="hover:bg-accent/50 h-full cursor-pointer transition-colors">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
                        <Building2Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="truncate">{org.name}</CardTitle>
                        <CardDescription className="truncate">
                          {org.description ?? org.slug}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {org.roleKey}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5">
                        <UsersIcon className="size-4" />
                        {t('org.memberCount', { count: org.memberCount })}
                      </span>
                      <span>{formatDate(org.createdAt, i18n.language)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader className="items-center text-center">
              <CardTitle>{t('org.empty')}</CardTitle>
              <CardDescription>{t('org.emptyHint')}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  )
}
