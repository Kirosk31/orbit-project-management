import type { SavedFilterDto, SavedTaskFilterValues, TaskPriority } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArchiveIcon, BookmarkIcon, SaveIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createSavedFilterRequest,
  deleteSavedFilterRequest,
  listSavedFiltersRequest,
  updateSavedFilterRequest,
} from '@/features/tasks/task-api'

const PRIORITIES: readonly TaskPriority[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']

export interface TaskBoardFiltersProps {
  boardId: string
  filters: SavedTaskFilterValues
  onChange: (filters: SavedTaskFilterValues) => void
}

export function TaskBoardFilters({ boardId, filters, onChange }: TaskBoardFiltersProps): ReactNode {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const queryKey = ['saved-task-filters', boardId] as const
  const query = useQuery({ queryKey, queryFn: () => listSavedFiltersRequest(boardId) })
  const [search, setSearch] = useState(filters.search ?? '')
  const [name, setName] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)
  const latestFilters = useRef(filters)
  latestFilters.current = filters

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const normalized = search.trim()
      if (normalized !== (latestFilters.current.search ?? '')) {
        onChange({
          ...latestFilters.current,
          search: normalized || undefined,
        })
      }
    }, 300)
    return () => window.clearTimeout(timer)
  }, [onChange, search])

  const showError = (): void => {
    toast.error(t('auth.genericError'))
  }
  const createMutation = useMutation({
    mutationFn: () => createSavedFilterRequest(boardId, { name: name.trim(), filters }),
    onSuccess: (created) => {
      queryClient.setQueryData<SavedFilterDto[]>(queryKey, (current = []) => [...current, created])
      setSelectedId(created.id)
      setName('')
      setSaveOpen(false)
      toast.success(t('tasks.savedFilterCreated'))
    },
    onError: showError,
  })
  const updateMutation = useMutation({
    mutationFn: (filterId: string) => updateSavedFilterRequest(boardId, filterId, { filters }),
    onSuccess: (updated) => {
      queryClient.setQueryData<SavedFilterDto[]>(queryKey, (current = []) =>
        current.map((filter) => (filter.id === updated.id ? updated : filter)),
      )
      toast.success(t('tasks.savedFilterUpdated'))
    },
    onError: showError,
  })
  const deleteMutation = useMutation({
    mutationFn: (filterId: string) => deleteSavedFilterRequest(boardId, filterId),
    onSuccess: (_result, filterId) => {
      queryClient.setQueryData<SavedFilterDto[]>(queryKey, (current = []) =>
        current.filter((filter) => filter.id !== filterId),
      )
      setSelectedId('')
      toast.success(t('tasks.savedFilterDeleted'))
    },
    onError: showError,
  })

  const applySavedFilter = (filterId: string): void => {
    setSelectedId(filterId === 'none' ? '' : filterId)
    const selected = query.data?.find((filter) => filter.id === filterId)
    if (!selected) return
    setSearch(selected.filters.search ?? '')
    onChange(selected.filters)
  }
  const clearFilters = (): void => {
    setSearch('')
    setSelectedId('')
    onChange({ archived: false })
  }
  const hasFilters =
    Boolean(filters.search || filters.priority || filters.assigneeId || filters.statusId) ||
    filters.archived

  return (
    <section className="flex flex-wrap items-center gap-2" aria-label={t('tasks.filters')}>
      <div className="relative w-full sm:w-64">
        <SearchIcon className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground" />
        <Input
          className="h-8 pl-8 text-sm"
          value={search}
          maxLength={200}
          placeholder={t('tasks.searchPlaceholder')}
          aria-label={t('tasks.search')}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </div>
      <Select
        value={filters.priority ?? 'all'}
        onValueChange={(value) =>
          onChange({
            ...filters,
            priority: value === 'all' ? undefined : (value as TaskPriority),
          })
        }
      >
        <SelectTrigger
          className="h-8 min-w-0 flex-1 sm:w-40 sm:flex-none"
          aria-label={t('tasks.priority')}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('tasks.allPriorities')}</SelectItem>
          {PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {t(`tasks.priority${priority}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant={filters.archived ? 'secondary' : 'ghost'}
        aria-pressed={Boolean(filters.archived)}
        onClick={() => onChange({ ...filters, archived: !filters.archived })}
      >
        <ArchiveIcon />
        {t('tasks.includeArchived')}
      </Button>
      {hasFilters && (
        <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
          <XIcon />
          {t('tasks.clearFilters')}
        </Button>
      )}

      <div className="flex w-full items-center gap-1 sm:ml-auto sm:w-auto">
        <Select value={selectedId || 'none'} onValueChange={applySavedFilter}>
          <SelectTrigger
            className="h-8 min-w-0 flex-1 sm:min-w-44 sm:flex-none"
            aria-label={t('tasks.savedFilters')}
          >
            <BookmarkIcon className="size-3.5" />
            <SelectValue placeholder={t('tasks.savedFilters')} />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="none">{t('tasks.noSavedFilterSelected')}</SelectItem>
            {query.data?.map((filter) => (
              <SelectItem key={filter.id} value={filter.id}>
                {filter.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedId ? (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(selectedId)}
              aria-label={t('tasks.updateSavedFilter')}
              title={t('tasks.updateSavedFilter')}
            >
              <SaveIcon />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(selectedId)}
              aria-label={t('tasks.deleteSavedFilter')}
              title={t('tasks.deleteSavedFilter')}
            >
              <Trash2Icon />
            </Button>
          </>
        ) : (
          <Popover open={saveOpen} onOpenChange={setSaveOpen}>
            <PopoverTrigger asChild>
              <Button type="button" size="sm" variant="ghost" disabled={!hasFilters}>
                <SaveIcon />
                {t('tasks.saveFilter')}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              <form
                className="flex flex-col gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (name.trim()) createMutation.mutate()
                }}
              >
                <Input
                  autoFocus
                  value={name}
                  maxLength={80}
                  placeholder={t('tasks.savedFilterNamePlaceholder')}
                  aria-label={t('tasks.savedFilterName')}
                  onChange={(event) => setName(event.currentTarget.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="self-end"
                  disabled={!name.trim() || createMutation.isPending}
                >
                  {t('tasks.saveFilter')}
                </Button>
              </form>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </section>
  )
}
