import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import type { Lesson, LessonInput } from '@/entities/lesson/index.ts'
import type { Subject } from '@/entities/subject/index.ts'
import type { Task } from '@/entities/task/index.ts'
import { api, isVersionConflict, messageOf, versionConflictNotice } from '@/shared/api/index.ts'
import { toLocalInput, toUtcIso } from '@/shared/lib/index.ts'
import { Button, CheckField, DateTimeField, Notice, SelectMenu, TextField, uiStyles } from '@/shared/ui/index.ts'

export function LessonForm({
  subjects,
  tasks,
  timeZone,
  lesson,
  onSaved,
}: {
  subjects: Subject[]
  tasks: Task[]
  timeZone: string
  lesson?: Lesson
  onSaved?: () => void
}) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<LessonInput>({
    subject_id: lesson?.subject_id ?? subjects[0]?.id ?? 0,
    task_id: lesson?.task_id ?? null,
    starts_at: lesson ? toLocalInput(lesson.starts_at, timeZone) : '',
    ends_at: lesson ? toLocalInput(lesson.ends_at, timeZone) : '',
    classroom: lesson?.classroom ?? '',
  })
  const [version, setVersion] = useState(lesson?.version ?? 1)
  const [repeat, setRepeat] = useState(false)
  const [repeatUntil, setRepeatUntil] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const relatedTasks = tasks.filter((task) => task.subject_id === Number(values.subject_id))
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        subject_id: Number(values.subject_id),
        task_id: values.task_id ? Number(values.task_id) : null,
        starts_at: toUtcIso(values.starts_at, timeZone),
        ends_at: toUtcIso(values.ends_at, timeZone),
        classroom: values.classroom,
        repeat_biweekly: repeat,
        repeat_until: repeat ? repeatUntil : null,
      }
      if (!lesson) return api<Lesson>('/lessons', { method: 'POST', body: JSON.stringify(payload) })
      return api<Lesson>(`/lessons/${lesson.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, version }),
      })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
      setVersion(saved.version)
      setNotice(lesson ? 'Сохранено' : 'Занятие добавлено')
      onSaved?.()
    },
    onError: (reason) => {
      if (isVersionConflict(reason)) {
        const current = reason.current as unknown as Lesson
        setValues({
          subject_id: current.subject_id,
          task_id: current.task_id,
          starts_at: toLocalInput(current.starts_at, timeZone),
          ends_at: toLocalInput(current.ends_at, timeZone),
          classroom: current.classroom,
        })
        setVersion(current.version)
        setNotice(versionConflictNotice)
        setError(null)
        return
      }
      setError(messageOf(reason))
    },
  })

  return (
    <form
      className={uiStyles.stack}
      onSubmit={(event) => {
        event.preventDefault()
        mutation.mutate()
      }}
    >
      <SelectMenu
        label="Предмет"
        value={String(values.subject_id)}
        options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
        onChange={(next) =>
          setValues((current) => ({
            ...current,
            subject_id: Number(next),
            task_id: null,
          }))
        }
      />
      <SelectMenu
        label="Связанное задание"
        value={values.task_id ? String(values.task_id) : ''}
        options={[
          { value: '', label: 'Без задания' },
          ...relatedTasks.map((task) => ({ value: String(task.id), label: task.title })),
        ]}
        onChange={(next) =>
          setValues((current) => ({
            ...current,
            task_id: next ? Number(next) : null,
          }))
        }
      />
      <DateTimeField label="Начало" required value={values.starts_at} onChange={(next) => setValues((current) => ({ ...current, starts_at: next }))} />
      <DateTimeField label="Конец" required value={values.ends_at} onChange={(next) => setValues((current) => ({ ...current, ends_at: next }))} />
      <TextField label="Аудитория" value={values.classroom} onChange={(event) => setValues((current) => ({ ...current, classroom: event.target.value }))} />
      <CheckField label="Повторять каждые 2 недели" checked={repeat} onChange={setRepeat} />
      {repeat ? (
        <>
          <TextField
            type="date"
            label="Повторять до"
            required
            value={repeatUntil}
            min={repeatFloor(values.starts_at)}
            onChange={(event) => setRepeatUntil(event.target.value)}
          />
          <p className={uiStyles.hint}>
            В календаре появятся такие же занятия с шагом в две недели, до выбранной даты включительно. Отдельное занятие потом можно изменить или удалить.
          </p>
        </>
      ) : null}
      {notice ? <Notice>{notice}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>{lesson ? 'Сохранить занятие' : 'Добавить занятие'}</Button>
    </form>
  )
}

function repeatFloor(startsAt: string) {
  const datePart = startsAt.split('T')[0]
  if (!datePart) return undefined
  const [year, month, day] = datePart.split('-').map(Number)
  if (!year || !month || !day) return undefined
  const next = new Date(Date.UTC(year, month - 1, day + 14))
  return next.toISOString().slice(0, 10)
}

export function DeleteLessonButton({ lessonId, onDeleted }: { lessonId: number; onDeleted?: () => void }) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: () => api(`/lessons/${lessonId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['lessons'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
      onDeleted?.()
    },
  })
  return open ? (
    <div className={uiStyles.row}>
      <Button type="button" tone="danger" onClick={() => mutation.mutate()}>Удалить занятие</Button>
      <Button type="button" tone="ghost" onClick={() => setOpen(false)}>Отмена</Button>
    </div>
  ) : (
    <Button type="button" tone="ghost" onClick={() => setOpen(true)}>Удалить занятие</Button>
  )
}
