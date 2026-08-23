import { zodResolver } from '@hookform/resolvers/zod'
import {
  createTeamSchema,
  inviteMemberSchema,
  updateOrganizationSchema,
  type CreateTeamDto,
  type InviteMemberDto,
  type UpdateOrganizationDto,
} from '@orbit/shared'
import { useMutation, useQuery, useQueries, useQueryClient } from '@tanstack/react-query'
import { Building2Icon, MailIcon, PlusIcon, Trash2Icon, UsersIcon, XIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  addTeamMemberRequest,
  createTeamRequest,
  deleteOrganizationRequest,
  deleteTeamRequest,
  getOrganizationRequest,
  inviteMemberRequest,
  listInvitationsRequest,
  listMembersRequest,
  listRolesRequest,
  listTeamMembersRequest,
  listTeamsRequest,
  removeMemberRequest,
  removeTeamMemberRequest,
  revokeInvitationRequest,
  updateMemberRoleRequest,
  updateOrganizationRequest,
} from '@/features/organizations/org-api'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { useAuthStore } from '@/features/auth/auth-store'
import { formatDate, initialsOf } from '@/lib/utils'

const MANAGE_MEMBERS_KEYS = new Set(['OWNER', 'ADMIN'])
const INVITE_KEYS = new Set(['OWNER', 'ADMIN', 'MANAGER'])
const MANAGE_TEAMS_KEYS = new Set(['OWNER', 'ADMIN', 'MANAGER'])
const UPDATE_KEYS = new Set(['OWNER', 'ADMIN'])
const DELETE_KEYS = new Set(['OWNER'])

export function OrganizationDetailPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { slug = '' } = useParams()
  const queryClient = useQueryClient()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const orgQuery = useQuery({
    queryKey: ['organizations', slug],
    queryFn: () => getOrganizationRequest(slug),
    enabled: slug.length > 0,
  })
  const membersQuery = useQuery({
    queryKey: ['organizations', slug, 'members'],
    queryFn: () => listMembersRequest(slug),
    enabled: slug.length > 0,
  })
  const rolesQuery = useQuery({
    queryKey: ['organizations', slug, 'roles'],
    queryFn: () => listRolesRequest(slug),
    enabled: slug.length > 0,
  })
  const invitationsQuery = useQuery({
    queryKey: ['organizations', slug, 'invitations'],
    queryFn: () => listInvitationsRequest(slug),
    enabled: slug.length > 0,
  })
  const teamsQuery = useQuery({
    queryKey: ['organizations', slug, 'teams'],
    queryFn: () => listTeamsRequest(slug),
    enabled: slug.length > 0,
  })
  const teamMembersQueries = useQueries({
    queries: (teamsQuery.data ?? []).map((team) => ({
      queryKey: ['organizations', slug, 'teams', team.id, 'members'],
      queryFn: () => listTeamMembersRequest(slug, team.id),
      enabled: slug.length > 0,
    })),
  })

  const org = orgQuery.data
  const members = membersQuery.data ?? []
  const roles = rolesQuery.data ?? []
  const invitations = invitationsQuery.data ?? []
  const teams = teamsQuery.data ?? []
  const roleKey = org?.roleKey ?? ''
  const canManageMembers = MANAGE_MEMBERS_KEYS.has(roleKey)
  const canInvite = INVITE_KEYS.has(roleKey)
  const canManageTeams = MANAGE_TEAMS_KEYS.has(roleKey)
  const canUpdate = UPDATE_KEYS.has(roleKey)
  const canDelete = DELETE_KEYS.has(roleKey)

  const invalidateOrg = (): void => {
    void queryClient.invalidateQueries({ queryKey: ['organizations', slug] })
    void queryClient.invalidateQueries({ queryKey: ['organizations'] })
  }

  const updateMutation = useMutation({
    mutationFn: (input: UpdateOrganizationDto) => updateOrganizationRequest(slug, input),
    onSuccess: () => {
      invalidateOrg()
      toast.success(t('common.save'))
    },
    onError: () => toast.error(t('org.updateFailed')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteOrganizationRequest(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] })
      toast.success(t('org.deleted'))
      navigate('/app/organizations')
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const inviteMutation = useMutation({
    mutationFn: (input: InviteMemberDto) => inviteMemberRequest(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'invitations'] })
      toast.success(t('org.inviteSent'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const revokeMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitationRequest(slug, invitationId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'invitations'] })
      toast.success(t('org.revoked'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      updateMemberRoleRequest(slug, userId, { roleId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'members'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug] })
      toast.success(t('common.save'))
    },
    onError: () => toast.error(t('org.permissionDenied')),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeMemberRequest(slug, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'members'] })
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug] })
      toast.success(t('org.memberRemoved'))
    },
    onError: () => toast.error(t('org.permissionDenied')),
  })

  const createTeamMutation = useMutation({
    mutationFn: (input: CreateTeamDto) => createTeamRequest(slug, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'teams'] })
      toast.success(t('common.save'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const deleteTeamMutation = useMutation({
    mutationFn: (teamId: string) => deleteTeamRequest(slug, teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'teams'] })
      toast.success(t('org.deleted'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const addTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      addTeamMemberRequest(slug, teamId, { userId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug] })
      toast.success(t('org.memberAdded'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const removeTeamMemberMutation = useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeTeamMemberRequest(slug, teamId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['organizations', slug, 'teams'] })
      toast.success(t('org.memberRemoved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const orgForm = useForm<
    z.input<typeof updateOrganizationSchema>,
    unknown,
    z.output<typeof updateOrganizationSchema>
  >({
    resolver: zodResolver(updateOrganizationSchema),
    values: org ? { name: org.name, description: org.description ?? '' } : undefined,
  })

  const inviteForm = useForm<
    z.input<typeof inviteMemberSchema>,
    unknown,
    z.output<typeof inviteMemberSchema>
  >({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: '', roleId: '' },
  })

  const teamForm = useForm<
    z.input<typeof createTeamSchema>,
    unknown,
    z.output<typeof createTeamSchema>
  >({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '', description: '' },
  })

  if (orgQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className="mx-auto w-full max-w-3xl p-6">
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>{t('common.notFoundTitle')}</CardTitle>
            <CardDescription>{t('common.notFoundDescription')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary flex size-12 shrink-0 items-center justify-center rounded-md">
              <Building2Icon className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
                {org.roleKey && <Badge variant="secondary">{org.roleKey}</Badge>}
              </div>
              <p className="text-muted-foreground text-sm">{org.slug}</p>
            </div>
          </div>
          {canDelete && (
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(t('org.deleteConfirm'))) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2Icon />
              {t('org.deleteOrganization')}
            </Button>
          )}
        </div>

        {canUpdate && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('org.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={orgForm.handleSubmit((values) => updateMutation.mutate(values))}
                className="flex flex-col gap-3"
              >
                <Input placeholder={t('org.namePlaceholder')} {...orgForm.register('name')} />
                <Textarea
                  rows={2}
                  placeholder={t('org.descriptionPlaceholder')}
                  {...orgForm.register('description')}
                />
                <Button type="submit" disabled={updateMutation.isPending} className="self-start">
                  {t('common.save')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('org.members')} · {org.memberCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 rounded-md border p-3">
                <Avatar className="size-9">
                  <SecureAvatarImage
                    userId={member.userId}
                    avatarKey={member.avatarKey}
                    alt={member.fullName}
                  />
                  <AvatarFallback>{initialsOf(member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {member.fullName}
                    {member.userId === currentUserId && (
                      <span className="text-muted-foreground ml-2 text-xs">
                        ({t('app.account')})
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                </div>
                <div className="text-muted-foreground hidden text-xs sm:block">
                  {formatDate(member.joinedAt, i18n.language)}
                </div>
                {canManageMembers && member.roleKey !== 'OWNER' ? (
                  <>
                    <Select
                      value={member.roleId}
                      onValueChange={(roleId) =>
                        roleMutation.mutate({ userId: member.userId, roleId })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t('org.remove')}
                      onClick={() => removeMemberMutation.mutate(member.userId)}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </>
                ) : (
                  <Badge variant="secondary">{member.roleName}</Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {canInvite && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('org.invite')}</CardTitle>
              <CardDescription>{t('org.inviteDescription')}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form
                onSubmit={inviteForm.handleSubmit((values) => inviteMutation.mutate(values))}
                className="flex flex-wrap items-end gap-3"
              >
                <div className="flex min-w-48 flex-1 flex-col gap-2">
                  <Label htmlFor="invite-email">{t('org.inviteEmail')}</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    {...inviteForm.register('email')}
                  />
                </div>
                <div className="flex w-40 flex-col gap-2">
                  <Label>{t('org.inviteRole')}</Label>
                  <Select
                    value={inviteForm.watch('roleId')}
                    onValueChange={(roleId) => inviteForm.setValue('roleId', roleId)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles
                        .filter((role) => role.key !== 'OWNER')
                        .map((role) => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" disabled={inviteMutation.isPending}>
                  <MailIcon />
                  {t('org.inviteButton')}
                </Button>
              </form>

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">{t('org.invitations')}</p>
                {invitations.filter((invitation) => invitation.status === 'PENDING').length ===
                0 ? (
                  <p className="text-muted-foreground text-sm">{t('org.noInvitations')}</p>
                ) : (
                  invitations
                    .filter((invitation) => invitation.status === 'PENDING')
                    .map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                      >
                        <MailIcon className="text-muted-foreground size-4" />
                        <span className="min-w-0 flex-1 truncate">{invitation.email}</span>
                        <Badge variant="secondary">{invitation.roleName}</Badge>
                        <span className="text-muted-foreground hidden text-xs sm:block">
                          {formatDate(invitation.expiresAt, i18n.language)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => revokeMutation.mutate(invitation.id)}
                        >
                          {t('org.revoke')}
                        </Button>
                      </div>
                    ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {canManageTeams && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('org.teams')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <form
                onSubmit={teamForm.handleSubmit((values) => createTeamMutation.mutate(values))}
                className="flex flex-wrap items-end gap-3"
              >
                <div className="flex min-w-48 flex-1 flex-col gap-2">
                  <Label htmlFor="team-name">{t('org.teamName')}</Label>
                  <Input
                    id="team-name"
                    placeholder={t('org.teamNamePlaceholder')}
                    {...teamForm.register('name')}
                  />
                </div>
                <div className="flex min-w-40 flex-1 flex-col gap-2">
                  <Label htmlFor="team-description">{t('org.teamDescription')}</Label>
                  <Input id="team-description" {...teamForm.register('description')} />
                </div>
                <Button type="submit" disabled={createTeamMutation.isPending}>
                  <PlusIcon />
                  {t('org.createTeam')}
                </Button>
              </form>

              {teams.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('org.teamEmpty')}</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {teams.map((team, index) => {
                    const teamMembers = teamMembersQueries[index]?.data ?? []
                    const availableMembers = members.filter(
                      (member) => !teamMembers.some((tm) => tm.userId === member.userId),
                    )
                    return (
                      <div key={team.id} className="rounded-md border p-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <UsersIcon className="text-muted-foreground size-4" />
                          <p className="font-medium">{team.name}</p>
                          {team.description && (
                            <p className="text-muted-foreground truncate text-xs">
                              {team.description}
                            </p>
                          )}
                          <span className="text-muted-foreground ml-auto text-xs">
                            {t('org.memberCount', { count: team.memberCount })}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('org.deleteOrganization')}
                            onClick={() => deleteTeamMutation.mutate(team.id)}
                          >
                            <Trash2Icon className="size-4" />
                          </Button>
                        </div>
                        <div className="mt-2 flex flex-col gap-1">
                          {teamMembers.map((tm) => (
                            <div key={tm.id} className="flex items-center gap-2 px-1 text-sm">
                              <span className="min-w-0 flex-1 truncate">{tm.fullName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  removeTeamMemberMutation.mutate({
                                    teamId: team.id,
                                    userId: tm.userId,
                                  })
                                }
                              >
                                <XIcon className="size-3" />
                                {t('org.remove')}
                              </Button>
                            </div>
                          ))}
                          {availableMembers.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Select
                                onValueChange={(userId) =>
                                  addTeamMemberMutation.mutate({ teamId: team.id, userId })
                                }
                              >
                                <SelectTrigger className="w-56">
                                  <SelectValue placeholder={t('org.addMember')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availableMembers.map((member) => (
                                    <SelectItem key={member.userId} value={member.userId}>
                                      {member.fullName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
