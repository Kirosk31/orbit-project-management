import type { SavedFilterDto, SavedTaskFilterValues, TaskPriority } from '@orbit/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FilterIcon, SaveIcon, SearchIcon, Trash2Icon, XIcon } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
    <section
      className="flex flex-col gap-3 rounded-lg border bg-card p-3"
      aria-label={t('tasks.filters')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <FilterIcon className="text-muted-foreground size-4" />
        <div className="relative min-w-48 flex-1 sm:max-w-80">
          <SearchIcon className="text-muted-foreground absolute left-2.5 top-2.5 size-4" />
          <Input
            className="pl-8"
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
          <SelectTrigger className="w-40" aria-label={t('tasks.priority')}>
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
          variant={filters.archived ? 'secondary' : 'outline'}
          onClick={() => onChange({ ...filters, archived: !filters.archived })}
        >
          {t('tasks.includeArchived')}
        </Button>
        {hasFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <XIcon />
            {t('tasks.clearFilters')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Select value={selectedId || 'none'} onValueChange={applySavedFilter}>
          <SelectTrigger className="min-w-48" aria-label={t('tasks.savedFilters')}>
            <SelectValue placeholder={t('tasks.savedFilters')} />
          </SelectTrigger>
          <SelectContent>
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
              size="sm"
              variant="secondary"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(selectedId)}
            >
              <SaveIcon />
              {t('tasks.updateSavedFilter')}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(selectedId)}
            >
              <Trash2Icon />
              <span className="sr-only">{t('tasks.deleteSavedFilter')}</span>
            </Button>
          </>
        ) : (
          <form
            className="flex min-w-60 flex-1 gap-2 sm:max-w-md"
            onSubmit={(event) => {
              event.preventDefault()
              if (name.trim()) createMutation.mutate()
            }}
          >
            <Input
              value={name}
              maxLength={80}
              placeholder={t('tasks.savedFilterNamePlaceholder')}
              aria-label={t('tasks.savedFilterName')}
              onChange={(event) => setName(event.currentTarget.value)}
            />
            <Button type="submit" size="sm" disabled={!name.trim() || createMutation.isPending}>
              <SaveIcon />
              {t('tasks.saveFilter')}
            </Button>
          </form>
        )}
      </div>
    </section>
  )
}
