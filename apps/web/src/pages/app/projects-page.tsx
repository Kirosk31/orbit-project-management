import { zodResolver } from '@hookform/resolvers/zod'
import { createProjectSchema } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderKanbanIcon, PlusIcon, StarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
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
import { formatDate, getContrastTextColor } from '@/lib/utils'

const PROJECT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#a855f7']

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
    (orgsQuery.data && orgsQuery.data.length > 0 ? orgsQuery.data[0] : null)

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

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t('projects.title')}</h1>
            <p className="text-muted-foreground text-sm">{t('projects.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            {activeOrg && (
              <Select
                value={activeOrg.slug}
                onValueChange={(slug) => {
                  setSelectedOrg(slug)
                  queryClient.invalidateQueries({ queryKey: ['projects'] })
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {orgsQuery.data?.map((org) => (
                    <SelectItem key={org.id} value={org.slug}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {activeOrg && (
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
                        <p className="text-destructive text-xs">
                          {createForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="project-key">{t('projects.key')}</Label>
                      <Input
                        id="project-key"
                        placeholder="WEB"
                        className="font-mono uppercase"
                        {...createForm.register('key')}
                      />
                      <p className="text-muted-foreground text-xs">{t('projects.keyHint')}</p>
                      {createForm.formState.errors.key && (
                        <p className="text-destructive text-xs">
                          {createForm.formState.errors.key.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label>{t('projects.color')}</Label>
                      <div className="flex gap-2">
                        {PROJECT_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            aria-label={color}
                            onClick={() => createForm.setValue('color', color)}
                            className={`size-7 rounded-full transition-transform ${
                              createForm.watch('color') === color
                                ? 'ring-ring ring-2 ring-offset-2'
                                : 'hover:scale-110'
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
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
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                      className="self-start"
                    >
                      {createMutation.isPending ? t('projects.creating') : t('projects.create')}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {!activeOrg ? (
          <Card>
            <CardHeader className="items-center text-center">
              <CardTitle>{t('projects.noOrg')}</CardTitle>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
              <TabsList>
                <TabsTrigger value="all">{t('projects.all')}</TabsTrigger>
                <TabsTrigger value="favorites">{t('projects.favorites')}</TabsTrigger>
                <TabsTrigger value="archived">{t('projects.archived')}</TabsTrigger>
              </TabsList>
            </Tabs>

            {projectsQuery.isPending ? (
              <div className="flex flex-col gap-4">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            ) : visibleProjects.length > 0 ? (
              <div className="flex flex-col gap-4">
                {visibleProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/app/projects/${project.id}`}
                    className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <Card className="hover:bg-accent/50 h-full cursor-pointer transition-colors">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <div
                            className="flex size-10 shrink-0 items-center justify-center rounded-md"
                            style={{ backgroundColor: project.color }}
                          >
                            <span
                              className="text-sm font-bold"
                              style={{ color: getContrastTextColor(project.color) }}
                            >
                              {project.key}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="flex items-center gap-2 truncate">
                              {project.name}
                              {project.isFavorite && (
                                <StarIcon className="text-amber-500 size-4 fill-current" />
                              )}
                              {project.isArchived && (
                                <Badge variant="secondary">{t('projects.archived')}</Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="truncate">
                              {project.description || project.key}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="text-muted-foreground flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1.5">
                            <FolderKanbanIcon className="size-4" />
                            {t('projects.memberCount', { count: project.memberCount })}
                          </span>
                          <span>{formatDate(project.createdAt, i18n.language)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            ) : (
              <Card>
                <CardHeader className="items-center text-center">
                  <CardTitle>{t('projects.empty')}</CardTitle>
                  <CardDescription>{t('projects.emptyHint')}</CardDescription>
                </CardHeader>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
