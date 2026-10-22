import { zodResolver } from '@hookform/resolvers/zod'
import { createBoardSchema, updateProjectSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArchiveIcon,
  ArrowLeftIcon,
  Columns3Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
  UserMinusIcon,
  UserPlusIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { EmptyState, PageContainer, PageHeader, SectionHeader } from '@/components/shared/page'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
      <PageContainer>
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-6 h-40 w-full" />
      </PageContainer>
    )
  }

  if (projectQuery.isError || !project) {
    return (
      <PageContainer width="narrow">
        <EmptyState
          title={t('org.permissionDenied')}
          action={
            <Button variant="outline" onClick={() => navigate('/app/projects')}>
              {t('projects.backToProjects')}
            </Button>
          }
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        leading={
          <Button
            variant="link"
            size="sm"
            className="h-auto gap-1 px-0 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/app/projects')}
          >
            <ArrowLeftIcon className="size-3.5" />
            {t('projects.backToProjects')}
          </Button>
        }
        title={
          <span className="flex items-center gap-3">
            <span
              className="flex size-9 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-bold tracking-wide"
              style={{ backgroundColor: project.color, color: getContrastTextColor(project.color) }}
              aria-hidden="true"
            >
              {project.key.slice(0, 4)}
            </span>
            {project.name}
          </span>
        }
        meta={
          <>
            <Badge variant="outline">{project.key}</Badge>
            {project.isArchived && <Badge variant="warning">{t('projects.archived')}</Badge>}
          </>
        }
        description={project.description || t('projects.subtitle')}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => favoriteMutation.mutate(!project.isFavorite)}
              disabled={favoriteMutation.isPending}
              aria-pressed={project.isFavorite}
              aria-label={project.isFavorite ? t('projects.unfavorite') : t('projects.favorite')}
              title={project.isFavorite ? t('projects.unfavorite') : t('projects.favorite')}
            >
              <StarIcon className={project.isFavorite ? 'fill-ochre text-ochre' : ''} />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                editForm.reset({
                  name: project.name,
                  key: project.key,
                  description: project.description ?? '',
                })
                setEditOpen(true)
              }}
            >
              <PencilIcon />
              {t('projects.edit')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={t('boards.moreActions')}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  disabled={archiveMutation.isPending}
                  onSelect={() => archiveMutation.mutate(!project.isArchived)}
                >
                  <ArchiveIcon />
                  {project.isArchived ? t('projects.unarchive') : t('projects.archive')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                  <Trash2Icon />
                  {t('projects.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
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
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-key">{t('projects.key')}</Label>
              <Input
                id="project-key"
                className="w-32 tracking-wide uppercase"
                placeholder="WEB"
                {...editForm.register('key')}
              />
              {editForm.formState.errors.key && (
                <p className="text-xs text-destructive">{editForm.formState.errors.key.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="project-description">{t('projects.description')}</Label>
              <Textarea id="project-description" rows={3} {...editForm.register('description')} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {t('projects.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
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

      <section aria-labelledby="boards-heading" className="mb-10">
        <SectionHeader
          title={<span id="boards-heading">{t('boards.title')}</span>}
          actions={
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
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
                      <p className="text-xs text-destructive">
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
                  <DialogFooter>
                    <Button type="submit" disabled={createBoardMutation.isPending}>
                      {createBoardMutation.isPending ? t('boards.creating') : t('boards.create')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        />
        {boardsQuery.isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : boardsQuery.data && boardsQuery.data.length > 0 ? (
          <ul className="divide-y overflow-hidden rounded-lg border bg-card">
            {boardsQuery.data.map((board) => (
              <li key={board.id}>
                <Link
                  to={`/app/boards/${board.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-accent/60"
                >
                  <Columns3Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{board.name}</span>
                    {board.description && (
                      <span className="block truncate text-sm text-muted-foreground">
                        {board.description}
                      </span>
                    )}
                  </span>
                  {board.isArchived && <Badge variant="secondary">{t('projects.archived')}</Badge>}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t('boards.columnCount', { count: board.columnCount })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact title={t('boards.empty')} description={t('boards.emptyHint')} />
        )}
      </section>

      <div className="grid gap-x-10 gap-y-10 md:grid-cols-2">
        <section aria-labelledby="members-heading">
          <SectionHeader
            title={<span id="members-heading">{t('projects.members')}</span>}
            actions={
              <Button variant="ghost" size="sm" onClick={() => setAddMemberOpen(true)}>
                <UserPlusIcon />
                {t('projects.addMember')}
              </Button>
            }
          />
          {membersQuery.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="flex flex-col">
              {membersQuery.data?.map((member) => (
                <li key={member.id} className="group flex items-center gap-3 py-2">
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
                    <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                  </div>
                  {member.roleName && <Badge variant="secondary">{member.roleName}</Badge>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    aria-label={t('tasks.removeAssignee', { name: member.fullName })}
                    disabled={removeMemberMutation.isPending}
                    onClick={() => removeMemberMutation.mutate(member.userId)}
                  >
                    <UserMinusIcon className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="activity-heading">
          <SectionHeader title={<span id="activity-heading">{t('projects.activity')}</span>} />
          {activityQuery.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : activityQuery.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('projects.noActivity')}</p>
          ) : (
            <ol className="relative ml-1 flex flex-col gap-3 border-l pl-5">
              {activityQuery.data?.map((entry) => (
                <li key={entry.id} className="relative text-sm">
                  <span
                    className="absolute top-1.5 -left-[1.5625rem] size-2 rounded-[2px] bg-border"
                    aria-hidden="true"
                  />
                  <span className="font-medium">{entry.actorName}</span>{' '}
                  <span className="text-muted-foreground">
                    {t(
                      ACTIVITY_LABELS[entry.action as keyof typeof ACTIVITY_LABELS] ??
                        'projects.activityUpdated',
                    )}
                  </span>{' '}
                  <time
                    dateTime={entry.createdAt}
                    className="text-xs text-muted-foreground tabular-nums"
                  >
                    {formatRelativeTime(entry.createdAt, i18n.language)}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
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
    </PageContainer>
  )
}
