import { Link } from 'react-router-dom'

import { useUpcomingTasks } from '@/entities/task/index.ts'
import { formatDateTime } from '@/shared/lib/index.ts'

import styles from './deadlines.module.css'

export function DeadlineList({ timeZone }: { timeZone: string }) {
  const tasks = useUpcomingTasks()
  if (tasks.isLoading) return <p>Загрузка дедлайнов…</p>
  if (!tasks.data?.length) return <p>Ближайших дедлайнов нет.</p>
  return (
    <ul className={styles.list}>
      {tasks.data.map((task) => (
        <li key={task.id}>
          <Link to={`/tasks/${task.id}`}>{task.title}</Link>
          <span>{task.subject_name}</span>
          <time>{formatDateTime(task.deadline, timeZone)}</time>
        </li>
      ))}
    </ul>
  )
}
