import { zodResolver } from '@hookform/resolvers/zod'
import { createProjectSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PlusIcon, StarIcon, UsersIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { z } from 'zod'

import { ColorSwatchPicker } from '@/components/shared/color-swatch-picker'
import { EmptyState, PageContainer, PageHeader } from '@/components/shared/page'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { listOrganizationsRequest } from '@/features/organizations/org-api'
import { createProjectRequest, listProjectsRequest } from '@/features/projects/project-api'
import { readStorageItem, writeStorageItem } from '@/lib/browser-storage'
import { PALETTE_COLORS } from '@/lib/task-colors'
import { formatDate, getContrastTextColor } from '@/lib/utils'

const PROJECT_COLORS = PALETTE_COLORS

const SELECTED_ORG_KEY = 'orbit.selectedOrgSlug'

function keyFromName(name: string): string {
  const letters = name
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
  return (letters || 'PRJ').slice(0, 8).replace(/[^A-Z0-9]/g, 'X')
}

export function ProjectsPage(): ReactNode {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedOrg, setSelectedOrg] = useState<string | null>(
    () => readStorageItem(SELECTED_ORG_KEY) ?? null,
  )
  const [filter, setFilter] = useState<'all' | 'favorites' | 'archived'>('all')

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn: listOrganizationsRequest,
  })

  const activeOrg =
    orgsQuery.data?.find((org) => org.slug === selectedOrg) ??
    orgsQuery.data?.find((org) => !org.isPersonal) ??
    orgsQuery.data?.[0] ??
    null

  useEffect(() => {
    if (activeOrg) {
      writeStorageItem(SELECTED_ORG_KEY, activeOrg.slug)
    }
  }, [activeOrg])

  const projectsQuery = useQuery({
    queryKey: ['projects', activeOrg?.slug],
    queryFn: () => listProjectsRequest(activeOrg!.slug, filter === 'archived' ? true : undefined),
    enabled: activeOrg !== null,
  })

  const createMutation = useMutation({
    mutationFn: (input: z.output<typeof createProjectSchema>) =>
      createProjectRequest(activeOrg!.slug, input),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects', activeOrg?.slug] })
      toast.success(t('projects.created'))
      navigate(`/app/projects/${project.id}`)
    },
    onError: () => toast.error(t('auth.genericError')),
  })

  const createForm = useForm<
    z.input<typeof createProjectSchema>,
    unknown,
    z.output<typeof createProjectSchema>
  >({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      color: PROJECT_COLORS[0],
      icon: null,
    },
  })

  const nameValue = createForm.watch('name')
  useEffect(() => {
    if (nameValue && !createForm.getValues('key')) {
      createForm.setValue('key', keyFromName(nameValue), { shouldValidate: true })
    }
  }, [nameValue, createForm])

  const visibleProjects =
    projectsQuery.data?.filter((project) => {
      if (filter === 'favorites') return project.isFavorite && !project.isArchived
      return true
    }) ?? []

  const createDialog = activeOrg ? (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon />
          {t('projects.create')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('projects.create')}</DialogTitle>
          <DialogDescription>{t('projects.createDescription')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={createForm.handleSubmit((values) => createMutation.mutate(values))}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-name">{t('projects.name')}</Label>
            <Input
              id="project-name"
              autoFocus
              placeholder={t('projects.namePlaceholder')}
              {...createForm.register('name')}
            />
            {createForm.formState.errors.name && (
              <p className="text-xs text-destructive">{createForm.formState.errors.name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-key">{t('projects.key')}</Label>
            <Input
              id="project-key"
              placeholder="WEB"
              className="w-32 tracking-wide uppercase"
              {...createForm.register('key')}
            />
            <p className="text-xs text-muted-foreground">{t('projects.keyHint')}</p>
            {createForm.formState.errors.key && (
              <p className="text-xs text-destructive">{createForm.formState.errors.key.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label id="project-color-label">{t('projects.color')}</Label>
            <ColorSwatchPicker
              labelledBy="project-color-label"
              colors={PROJECT_COLORS}
              value={createForm.watch('color') ?? PROJECT_COLORS[0] ?? ''}
              onChange={(color) => createForm.setValue('color', color)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-description">{t('projects.description')}</Label>
            <Textarea
              id="project-description"
              rows={3}
              placeholder={t('projects.descriptionPlaceholder')}
              {...createForm.register('description')}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? t('projects.creating') : t('projects.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  ) : null

  return (
    <PageContainer>
      <PageHeader
        title={t('projects.title')}
        description={t('projects.subtitle')}
        actions={
          <>
            {activeOrg && (orgsQuery.data?.length ?? 0) > 1 && (
              <Select
                value={activeOrg.slug}
                onValueChange={(slug) => {
                  setSelectedOrg(slug)
                  queryClient.invalidateQueries({ queryKey: ['projects'] })
                }}
              >
                <SelectTrigger className="w-56" aria-label={t('dashboard.activeWorkspace')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {orgsQuery.data?.map((org) => (
                    <SelectItem key={org.id} value={org.slug}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {createDialog}
          </>
        }
      />

      {!activeOrg ? (
        <EmptyState
          title={t('projects.noOrg')}
          action={
            <Button variant="outline" onClick={() => navigate('/app/organizations')}>
              {t('dashboard.createWorkspace')}
            </Button>
          }
        />
      ) : (
        <>
          <Tabs
            value={filter}
            onValueChange={(value) => setFilter(value as typeof filter)}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="all">{t('projects.all')}</TabsTrigger>
              <TabsTrigger value="favorites">{t('projects.favorites')}</TabsTrigger>
              <TabsTrigger value="archived">{t('projects.archived')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {projectsQuery.isPending ? (
            <Skeleton className="h-48 w-full" />
          ) : visibleProjects.length > 0 ? (
            <ul className="divide-y overflow-hidden rounded-lg border bg-card">
              {visibleProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/app/projects/${project.id}`}
                    className="flex items-center gap-4 px-4 py-3.5 transition-colors duration-150 hover:bg-accent/60"
                  >
                    <span
                      className="flex size-9 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-bold tracking-wide"
                      style={{
                        backgroundColor: project.color,
                        color: getContrastTextColor(project.color),
                      }}
                      aria-hidden="true"
                    >
                      {project.key.slice(0, 4)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{project.name}</span>
                        {project.isFavorite && (
                          <StarIcon
                            className="size-3.5 shrink-0 fill-ochre text-ochre"
                            aria-label={t('projects.favorites')}
                          />
                        )}
                        {project.isArchived && (
                          <Badge variant="secondary">{t('projects.archived')}</Badge>
                        )}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {project.description || project.key}
                      </span>
                    </span>
                    <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
                      <UsersIcon className="size-3.5" aria-hidden="true" />
                      {t('projects.memberCount', { count: project.memberCount })}
                    </span>
                    <span className="hidden w-28 text-right text-xs text-muted-foreground tabular-nums md:block">
                      {formatDate(project.createdAt, i18n.language)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t('projects.empty')}
              description={t('projects.emptyHint')}
              action={filter === 'all' ? createDialog : undefined}
            />
          )}
        </>
      )}
    </PageContainer>
  )
}
