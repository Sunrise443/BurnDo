import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { Subject } from '@/entities/subject/index.ts'
import type { Task, TaskInput } from '@/entities/task/index.ts'
import { api, isVersionConflict, messageOf, versionConflictNotice } from '@/shared/api/index.ts'
import { toLocalInput, toUtcIso } from '@/shared/lib/index.ts'
import { Button, Notice, SelectField, TextArea, TextField, uiStyles } from '@/shared/ui/index.ts'

export function TaskForm({
  subjects,
  timeZone,
  task,
}: {
  subjects: Subject[]
  timeZone: string
  task?: Task
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [values, setValues] = useState<TaskInput>({
    subject_id: task?.subject_id ?? subjects[0]?.id ?? 0,
    title: task?.title ?? '',
    description: task?.description ?? '',
    materials: task?.materials ?? '',
    deadline: task ? toLocalInput(task.deadline, timeZone) : '',
  })
  const [version, setVersion] = useState(task?.version ?? 1)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...values,
        subject_id: Number(values.subject_id),
        deadline: toUtcIso(values.deadline, timeZone),
      }
      if (!task) {
        return api<Task>('/tasks', { method: 'POST', body: JSON.stringify(payload) })
      }
      return api<Task>(`/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...payload, version }),
      })
    },
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
      if (!task) navigate(`/tasks/${saved.id}`)
      else {
        setVersion(saved.version)
        setNotice('Сохранено')
      }
    },
    onError: (reason) => {
      if (isVersionConflict(reason)) {
        const current = reason.current as unknown as Task
        setValues({
          subject_id: current.subject_id,
          title: current.title,
          description: current.description,
          materials: current.materials,
          deadline: toLocalInput(current.deadline, timeZone),
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
      <SelectField
        label="Предмет"
        value={values.subject_id}
        onChange={(event) => setValues((current) => ({ ...current, subject_id: Number(event.target.value) }))}
      >
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>{subject.name}</option>
        ))}
      </SelectField>
      <TextField label="Название" required value={values.title} onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))} />
      <TextArea label="Описание" value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} />
      <TextArea label="Материалы и ссылки" value={values.materials} onChange={(event) => setValues((current) => ({ ...current, materials: event.target.value }))} />
      <TextField label="Срок" type="datetime-local" required value={values.deadline} onChange={(event) => setValues((current) => ({ ...current, deadline: event.target.value }))} />
      {notice ? <Notice>{notice}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" disabled={mutation.isPending}>{task ? 'Сохранить' : 'Добавить задание'}</Button>
    </form>
  )
}

export function DeleteTaskButton({ taskId }: { taskId: number }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const mutation = useMutation({
    mutationFn: () => api(`/tasks/${taskId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tasks'] })
      await queryClient.invalidateQueries({ queryKey: ['calendar'] })
      navigate('/tasks')
    },
  })
  return open ? (
    <div className={uiStyles.row}>
      <Button type="button" tone="danger" onClick={() => mutation.mutate()}>Удалить задание</Button>
      <Button type="button" tone="ghost" onClick={() => setOpen(false)}>Отмена</Button>
    </div>
  ) : (
    <Button type="button" tone="danger" onClick={() => setOpen(true)}>Удалить задание</Button>
  )
}
