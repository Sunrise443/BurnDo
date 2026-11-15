import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/index.ts'

export type CalendarLesson = {
  id: number
  subject_id: number
  subject_name: string
  task_id: number | null
  task_title: string | null
  starts_at: string
  ends_at: string
  classroom: string
}

export type CalendarDeadline = {
  id: number
  subject_id: number
  subject_name: string
  title: string
  deadline: string
}

export type CalendarData = {
  lessons: CalendarLesson[]
  deadlines: CalendarDeadline[]
}

export function useCalendar(start: string, end: string) {
  return useQuery({
    queryKey: ['calendar', start, end],
    queryFn: () =>
      api<CalendarData>(
        `/calendar?from=${encodeURIComponent(start)}&to=${encodeURIComponent(end)}`,
      ),
  })
}
