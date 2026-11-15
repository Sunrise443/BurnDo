import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Subject, SubjectInput } from '@/entities/subject/index.ts'
import { api, isVersionConflict, messageOf, versionConflictNotice } from '@/shared/api/index.ts'
import { Button, Notice, TextArea, TextField, uiStyles } from '@/shared/ui/index.ts'

const empty: SubjectInput = {
  name: '',
  tag: '',
  teacher: '',
  class_links: '',
  assessment_type: '',
  passing_criteria: '',
  tasks_requirements: '',
  notes: '',
}

export function SubjectForm({ subject }: { subject?: Subject }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<SubjectInput>(subject ?? empty)
  const [version, setVersion] = useState(subject?.version ?? 1)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => {
      if (!subject) {
        return api<Subject>('/subjects', { method: 'POST', body: JSON.stringify(values) })
      }
      return api<Subject>(`/subjects/${subject.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...values, version }),
      })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
      setNotice(null)
      if (!subject) navigate(`/subjects/${saved.id}`)
      else {
        setVersion(saved.version)
        setNotice('Сохранено')
      }
    },
    onError: (reason) => {
      if (isVersionConflict(reason)) {
        const current = reason.current as unknown as Subject
        setValues(current)
        setVersion(current.version)
        setNotice(versionConflictNotice)
        setError(null)
        return
      }
      setError(messageOf(reason))
    },
  })

  function setField(key: keyof SubjectInput, value: string) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        setError(null)
        mutation.mutate()
      }}
    >
      <TextField label="Название" required value={values.name} onChange={(event) => setField('name', event.target.value)} />
      <TextField label="Тег" value={values.tag} onChange={(event) => setField('tag', event.target.value)} />
      <TextField label="Преподаватель" value={values.teacher} onChange={(event) => setField('teacher', event.target.value)} />
      <TextArea label="Ссылки на пары и материалы" value={values.class_links} onChange={(event) => setField('class_links', event.target.value)} />
      <TextField label="Тип аттестации" value={values.assessment_type} onChange={(event) => setField('assessment_type', event.target.value)} />
      <TextArea label="Требования к зачёту или экзамену" value={values.passing_criteria} onChange={(event) => setField('passing_criteria', event.target.value)} />
      <TextArea label="Правила сдачи заданий" value={values.tasks_requirements} onChange={(event) => setField('tasks_requirements', event.target.value)} />
      <TextArea label="Заметки" value={values.notes} onChange={(event) => setField('notes', event.target.value)} />
      {notice ? <Notice>{notice}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>{subject ? 'Сохранить' : 'Добавить предмет'}</Button>
    </form>
  )
}

export function DeleteSubjectButton({ subjectId }: { subjectId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => api(`/subjects/${subjectId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['subjects'] })
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
      navigate('/subjects')
    },
    onError: (reason) => setError(messageOf(reason)),
  })

  return (
    <div className={uiStyles.stack}>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {open ? (
        <div className={uiStyles.card}>
          <p>Предмет, его занятия и задания будут удалены.</p>
          <div className={uiStyles.row}>
            <Button type="button" tone="danger" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
              Удалить предмет
            </Button>
            <Button type="button" tone="ghost" onClick={() => setOpen(false)}>Отмена</Button>
          </div>
        </div>
      ) : (
        <Button type="button" tone="danger" onClick={() => setOpen(true)}>Удалить предмет</Button>
      )}
    </div>
  )
}
