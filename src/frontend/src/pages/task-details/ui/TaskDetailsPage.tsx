import { Link, useParams } from 'react-router-dom'

import { useGroup } from '@/entities/group/index.ts'
import { useMe } from '@/entities/session/index.ts'
import { useSubjects } from '@/entities/subject/index.ts'
import { useTask } from '@/entities/task/index.ts'
import { DeleteTaskButton, TaskForm } from '@/features/task-form/index.ts'
import { formatDateTime } from '@/shared/lib/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'
import { uiStyles } from '@/shared/ui/index.ts'

export function TaskDetailsPage() {
  const params = useParams()
  const taskId = Number(params.taskId)
  const me = useMe()
  const group = useGroup()
  const task = useTask(taskId)
  const subjects = useSubjects()
  const timeZone = group.data?.timezone ?? 'Europe/Moscow'
  if (task.isLoading) return <p>Загрузка…</p>
  if (!task.data) return <p>Задание не найдено.</p>
  return (
    <div className={uiStyles.stack}>
      <h1>{task.data.title}</h1>
      <p><Link to={`/subjects/${task.data.subject_id}`}>{task.data.subject_name}</Link></p>
      <p>Срок: {formatDateTime(task.data.deadline, timeZone)}</p>
      {task.data.description ? <p>{task.data.description}</p> : null}
      {task.data.materials ? <p>{task.data.materials}</p> : null}
      {canEditAcademic(me.data?.role) && subjects.data ? (
        <>
          <TaskForm subjects={subjects.data} timeZone={timeZone} task={task.data} />
          <DeleteTaskButton taskId={task.data.id} />
        </>
      ) : null}
    </div>
  )
}
