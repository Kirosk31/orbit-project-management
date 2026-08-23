import { zodResolver } from '@hookform/resolvers/zod'
import { createBoardSchema, updateProjectSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  Columns3Icon,
  HistoryIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  UserMinusIcon,
  UsersIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { listMembersRequest } from '@/features/organizations/org-api'
import {
  addProjectMemberRequest,
  archiveProjectRequest,
  deleteProjectRequest,
  favoriteProjectRequest,
  getProjectRequest,
  listProjectActivityRequest,
  listProjectMembersRequest,
  removeProjectMemberRequest,
  unfavoriteProjectRequest,
  unarchiveProjectRequest,
  updateProjectRequest,
} from '@/features/projects/project-api'
import { SecureAvatarImage } from '@/features/users/secure-avatar-image'
import { createBoardRequest, listBoardsRequest } from '@/features/boards/board-api'
import { formatRelativeTime, getContrastTextColor, initialsOf } from '@/lib/utils'

const ACTIVITY_LABELS = {
  'project.created': 'projects.activityCreated',
  'project.updated': 'projects.activityUpdated',
  'project.deleted': 'projects.activityDeleted',
  'project.archived': 'projects.activityArchived',
  'project.restored': 'projects.activityRestored',
  'project.member_added': 'projects.activityMemberAdded',
  'project.member_removed': 'projects.activityMemberRemoved',
} as const

export function ProjectDetailPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [addMemberOpen, setAddMemberOpen] = useState(false)

  const projectQuery = useQuery({
    queryKey: ['project', id],
    queryFn: () => getProjectRequest(id),
  })

  const project = projectQuery.data

  const membersQuery = useQuery({
    queryKey: ['project-members', id],
    queryFn: () => listProjectMembersRequest(id),
    enabled: project !== undefined,
  })

  const activityQuery = useQuery({
    queryKey: ['project-activity', id],
    queryFn: () => listProjectActivityRequest(id),
    enabled: project !== undefined,
  })

  const orgMembersQuery = useQuery({
    queryKey: ['org-members', project?.orgId],
    queryFn: () => listMembersRequest(project!.orgId),
    enabled: project !== undefined && addMemberOpen,
  })

  const boardsQuery = useQuery({
    queryKey: ['project-boards', id],
    queryFn: () => listBoardsRequest(id),
    enabled: project !== undefined,
  })

  const createBoardForm = useForm<
    z.input<typeof createBoardSchema>,
    unknown,
    z.output<typeof createBoardSchema>
  >({
    resolver: zodResolver(createBoardSchema),
    defaultValues: { name: '', description: '' },
  })

  const createBoardMutation = useMutation({
    mutationFn: (input: z.output<typeof createBoardSchema>) => createBoardRequest(id, input),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['project-boards', id] })
      toast.success(t('boards.created'))
      navigate(`/app/boards/${board.id}`)
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const editForm = useForm<
    z.input<typeof updateProjectSchema>,
    unknown,
    z.output<typeof updateProjectSchema>
  >({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: { name: '', description: '' },
  })

  const invalidateProject = () => {
    queryClient.invalidateQueries({ queryKey: ['project', id] })
    queryClient.invalidateQueries({ queryKey: ['project-members', id] })
    queryClient.invalidateQueries({ queryKey: ['project-activity', id] })
    queryClient.invalidateQueries({ queryKey: ['projects'] })
  }

  const updateMutation = useMutation({
    mutationFn: (input: z.output<typeof updateProjectSchema>) => updateProjectRequest(id, input),
    onSuccess: () => {
      invalidateProject()
      setEditOpen(false)
      toast.success(t('projects.updated'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const favoriteMutation = useMutation({
    mutationFn: (favorite: boolean): Promise<{ id: string; isFavorite: boolean }> =>
      favorite ? favoriteProjectRequest(id) : unfavoriteProjectRequest(id),
    onSuccess: () => {
      invalidateProject()
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const archiveMutation = useMutation({
    mutationFn: (archive: boolean) =>
      archive ? archiveProjectRequest(id) : unarchiveProjectRequest(id),
    onSuccess: () => {
      invalidateProject()
      toast.success(project?.isArchived ? t('projects.restored') : t('projects.archivedSuccess'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProjectRequest(id),
    onSuccess: () => {
      toast.success(t('projects.deleted'))
      navigate('/app/projects')
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => addProjectMemberRequest(id, { userId }),
    onSuccess: () => {
      invalidateProject()
      setAddMemberOpen(false)
      toast.success(t('projects.memberAdded'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (userId: string) => removeProjectMemberRequest(id, userId),
    onSuccess: () => {
      invalidateProject()
      toast.success(t('projects.memberRemoved'))
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const memberIds = membersQuery.data?.map((member) => member.userId) ?? []
  const candidates =
    orgMembersQuery.data?.filter((member) => !memberIds.includes(member.userId)) ?? []

  if (projectQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    )
  }

  if (projectQuery.isError || !project) {
    return (
      <div className="mx-auto w-full max-w-4xl p-6">
        <Card>
          <CardHeader className="items-center text-center">
            <CardTitle>{t('org.permissionDenied')}</CardTitle>
            <CardDescription>
              <Button variant="link" onClick={() => navigate('/app/projects')}>
                {t('projects.backToProjects')}
              </Button>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex flex-col gap-6">
        <Button variant="ghost" className="self-start" onClick={() => navigate('/app/projects')}>
          <ArrowLeftIcon />
          {t('projects.backToProjects')}
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: project.color }}
            >
              <span
                className="text-lg font-bold"
                style={{ color: getContrastTextColor(project.color) }}
              >
                {project.key}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
                <Badge variant="secondary">{project.key}</Badge>
                {project.isArchived && <Badge>{t('projects.archived')}</Badge>}
              </div>
              <p className="text-muted-foreground text-sm">
                {project.description || t('projects.subtitle')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => favoriteMutation.mutate(!project.isFavorite)}
              disabled={favoriteMutation.isPending}
            >
              <StarIcon className={project.isFavorite ? 'fill-amber-500 text-amber-500' : ''} />
              {project.isFavorite ? t('projects.unfavorite') : t('projects.favorite')}
            </Button>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">{t('projects.edit')}</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('projects.edit')}</DialogTitle>
                  <DialogDescription>{t('projects.createDescription')}</DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project-name">{t('projects.name')}</Label>
                    <Input
                      id="project-name"
                      placeholder={t('projects.namePlaceholder')}
                      {...editForm.register('name')}
                    />
                    {editForm.formState.errors.name && (
                      <p className="text-destructive text-xs">
                        {editForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project-key">{t('projects.key')}</Label>
                    <Input
                      id="project-key"
                      className="font-mono uppercase"
                      placeholder="WEB"
                      {...editForm.register('key')}
                    />
                    {editForm.formState.errors.key && (
                      <p className="text-destructive text-xs">
                        {editForm.formState.errors.key.message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="project-description">{t('projects.description')}</Label>
                    <Textarea
                      id="project-description"
                      rows={3}
                      {...editForm.register('description')}
                    />
                  </div>
                  <Button type="submit" disabled={updateMutation.isPending} className="self-start">
                    {t('projects.save')}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => archiveMutation.mutate(!project.isArchived)}
              disabled={archiveMutation.isPending}
            >
              <ArchiveIcon />
              {project.isArchived ? t('projects.unarchive') : t('projects.archive')}
            </Button>
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2Icon />
                  {t('projects.delete')}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{t('projects.delete')}</DialogTitle>
                  <DialogDescription>{t('projects.deleteConfirm')}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                  >
                    {t('projects.delete')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="size-4" />
                  {t('projects.members')}
                </CardTitle>
                <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
                  <PlusIcon />
                  {t('projects.addMember')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {membersQuery.isPending ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <ul className="flex flex-col gap-3">
                  {membersQuery.data?.map((member) => (
                    <li key={member.id} className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <SecureAvatarImage
                          userId={member.userId}
                          avatarKey={member.avatarKey}
                          alt={member.fullName}
                        />
                        <AvatarFallback>{initialsOf(member.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{member.fullName}</p>
                        <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                      </div>
                      {member.roleName && <Badge variant="secondary">{member.roleName}</Badge>}
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t('projects.memberRemoved')}
                        disabled={removeMemberMutation.isPending}
                        onClick={() => removeMemberMutation.mutate(member.userId)}
                      >
                        <UserMinusIcon className="size-4" />
                      </Button>
                    </li>
                  ))}
                  {membersQuery.data?.length === 0 && (
                    <li className="text-muted-foreground text-sm">{t('projects.empty')}</li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HistoryIcon className="size-4" />
                {t('projects.activity')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityQuery.isPending ? (
                <Skeleton className="h-24 w-full" />
              ) : activityQuery.data?.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t('projects.noActivity')}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {activityQuery.data?.map((entry) => (
                    <li key={entry.id} className="text-sm">
                      <span className="font-medium">{entry.actorName}</span>{' '}
                      {t(
                        ACTIVITY_LABELS[entry.action as keyof typeof ACTIVITY_LABELS] ??
                          'projects.activityUpdated',
                      )}
                      <span className="text-muted-foreground block text-xs">
                        {formatRelativeTime(entry.createdAt, i18n.language)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Columns3Icon className="size-4" />
                {t('boards.title')}
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusIcon />
                    {t('boards.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('boards.create')}</DialogTitle>
                    <DialogDescription>{t('boards.createDescription')}</DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={createBoardForm.handleSubmit((values) =>
                      createBoardMutation.mutate(values),
                    )}
                    className="flex flex-col gap-4"
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="board-name">{t('boards.name')}</Label>
                      <Input
                        id="board-name"
                        autoFocus
                        placeholder={t('boards.namePlaceholder')}
                        {...createBoardForm.register('name')}
                      />
                      {createBoardForm.formState.errors.name && (
                        <p className="text-destructive text-xs">
                          {createBoardForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="board-description">{t('boards.description')}</Label>
                      <Input
                        id="board-description"
                        placeholder={t('boards.descriptionPlaceholder')}
                        {...createBoardForm.register('description')}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={createBoardMutation.isPending}
                      className="self-start"
                    >
                      {createBoardMutation.isPending ? t('boards.creating') : t('boards.create')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {boardsQuery.isPending ? (
              <Skeleton className="h-20 w-full" />
            ) : boardsQuery.data && boardsQuery.data.length > 0 ? (
              <div className="flex flex-col gap-3">
                {boardsQuery.data.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    className="hover:bg-accent/50 flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors"
                    onClick={() => navigate(`/app/boards/${board.id}`)}
                  >
                    <Columns3Icon className="text-muted-foreground size-4" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {board.name}
                    </span>
                    {board.isArchived && (
                      <Badge variant="secondary">{t('projects.archived')}</Badge>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {t('boards.columnCount', { count: board.columnCount })}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">{t('boards.empty')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('projects.addMember')}</DialogTitle>
            <DialogDescription>{t('projects.selectMember')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {candidates.length === 0 && (
              <p className="text-muted-foreground text-sm">{t('projects.empty')}</p>
            )}
            {candidates.map((member) => (
              <div key={member.id} className="flex items-center gap-3">
                <Avatar className="size-8">
                  <SecureAvatarImage
                    userId={member.userId}
                    avatarKey={member.avatarKey}
                    alt={member.fullName}
                  />
                  <AvatarFallback>{initialsOf(member.fullName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.fullName}</p>
                  <p className="text-muted-foreground truncate text-xs">{member.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={addMemberMutation.isPending}
                  onClick={() => addMemberMutation.mutate(member.userId)}
                >
                  <PlusIcon />
                  {t('projects.addMember')}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
