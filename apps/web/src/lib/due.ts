export type DueState = 'overdue' | 'today' | 'upcoming' | 'done'

export function dueStateOf(dueDate: string, isCompleted: boolean, now = new Date()): DueState {
  if (isCompleted) return 'done'
  const due = new Date(dueDate)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startOfTomorrow = startOfToday + 86_400_000
  if (due.getTime() < startOfToday) return 'overdue'
  if (due.getTime() < startOfTomorrow) return 'today'
  return 'upcoming'
}
