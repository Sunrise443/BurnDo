import { useQuery } from '@tanstack/react-query'

import { api } from '@/shared/api/index.ts'

export type Subject = {
  id: number
  group_id: number
  name: string
  tag: string
  teacher: string
  class_links: string
  assessment_type: string
  passing_criteria: string
  tasks_requirements: string
  notes: string
  version: number
}

export type SubjectInput = {
  name: string
  tag: string
  teacher: string
  class_links: string
  assessment_type: string
  passing_criteria: string
  tasks_requirements: string
  notes: string
}

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: () => api<Subject[]>('/subjects'),
  })
}

export function useSubject(subjectId: number) {
  return useQuery({
    queryKey: ['subjects', subjectId],
    queryFn: () => api<Subject>(`/subjects/${subjectId}`),
  })
}
