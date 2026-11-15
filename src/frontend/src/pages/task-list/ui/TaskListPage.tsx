import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useGroup } from '@/entities/group/index.ts'
import { useMe } from '@/entities/session/index.ts'
import { useSubjects } from '@/entities/subject/index.ts'
import { useTasks, useUpcomingTasks } from '@/entities/task/index.ts'
import { TaskForm } from '@/features/task-form/index.ts'
import { formatDateTime } from '@/shared/lib/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'
import { Button, uiStyles } from '@/shared/ui/index.ts'

export function TaskListPage() {
  const me = useMe()
  const group = useGroup()
  const subjects = useSubjects()
  const upcoming = useUpcomingTasks()
  const tasks = useTasks()
  const [creating, setCreating] = useState(false)
  const timeZone = group.data?.timezone ?? 'Europe/Moscow'
  return (
    <div className={uiStyles.stack}>
      <h1>Задания</h1>
      <h2>Предстоящие</h2>
      {upcoming.data?.length ? (
        upcoming.data.map((task) => (
          <article key={task.id} className={uiStyles.card}>
            <h3><Link to={`/tasks/${task.id}`}>{task.title}</Link></h3>
            <p>{task.subject_name}</p>
            <p>{formatDateTime(task.deadline, timeZone)}</p>
          </article>
        ))
      ) : (
        <p>Предстоящих дедлайнов нет.</p>
      )}
      <h2>Все задания</h2>
      {tasks.data?.map((task) => (
        <p key={task.id}>
          <Link to={`/tasks/${task.id}`}>{task.title}</Link> · {task.subject_name}
        </p>
      ))}
      {canEditAcademic(me.data?.role) && subjects.data?.length ? (
        <>
          <Button type="button" onClick={() => setCreating((value) => !value)}>Новое задание</Button>
          {creating ? <TaskForm subjects={subjects.data} timeZone={timeZone} /> : null}
        </>
      ) : null}
    </div>
  )
}
