import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/index.ts'

export type Task = {
  id: number
  group_id: number
  subject_id: number
  subject_name: string
  subject_tag: string
  title: string
  description: string
  materials: string
  deadline: string
  version: number
}

export type TaskInput = {
  subject_id: number
  title: string
  description: string
  materials: string
  deadline: string
}

export function useTasks(subjectId?: number) {
  return useQuery({
    queryKey: ['tasks', 'list', subjectId ?? 'all'],
    queryFn: () =>
      api<Task[]>(subjectId === undefined ? '/tasks' : `/tasks?subject_id=${subjectId}`),
  })
}

export function useUpcomingTasks() {
  return useQuery({
    queryKey: ['tasks', 'upcoming'],
    queryFn: () => api<Task[]>('/tasks/upcoming'),
  })
}

export function useTask(taskId: number) {
  return useQuery({
    queryKey: ['tasks', 'item', taskId],
    queryFn: () => api<Task>(`/tasks/${taskId}`),
  })
}
