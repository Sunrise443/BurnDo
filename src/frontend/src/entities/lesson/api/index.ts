import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/index.ts'

export type Lesson = {
  id: number
  group_id: number
  subject_id: number
  subject_name: string
  subject_tag: string
  task_id: number | null
  task_title: string | null
  starts_at: string
  ends_at: string
  classroom: string
  version: number
}

export type LessonInput = {
  subject_id: number
  task_id: number | null
  starts_at: string
  ends_at: string
  classroom: string
}

export function useLessons(subjectId?: number) {
  return useQuery({
    queryKey: ['lessons', 'list', subjectId ?? 'all'],
    queryFn: () =>
      api<Lesson[]>(subjectId === undefined ? '/lessons' : `/lessons?subject_id=${subjectId}`),
  })
}

export function useLesson(lessonId: number) {
  return useQuery({
    queryKey: ['lessons', 'item', lessonId],
    queryFn: () => api<Lesson>(`/lessons/${lessonId}`),
  })
}
