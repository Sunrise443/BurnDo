import { useState } from 'react'

import { useGroup } from '@/entities/group/index.ts'
import { useMe } from '@/entities/session/index.ts'
import { useSubjects } from '@/entities/subject/index.ts'
import { useTasks } from '@/entities/task/index.ts'
import { LessonForm } from '@/features/lesson-form/index.ts'
import { canEditAcademic } from '@/shared/model/index.ts'
import { Button } from '@/shared/ui/index.ts'
import { CalendarBoard } from '@/widgets/calendar-board/index.ts'
import { DeadlineList } from '@/widgets/deadline-list/index.ts'

import styles from './CalendarPage.module.css'

export function CalendarPage() {
  const me = useMe()
  const group = useGroup()
  const subjects = useSubjects()
  const tasks = useTasks()
  const [creating, setCreating] = useState(false)
  const timeZone = group.data?.timezone ?? me.data?.timezone ?? 'Europe/Moscow'
  const editable = canEditAcademic(me.data?.role)

  return (
    <div className={styles.page}>
      <div className={styles.block}>
        <h1>Календарь</h1>
        <CalendarBoard timeZone={timeZone} />
      </div>
      <section className={styles.block}>
        <h2>Ближайшие дедлайны</h2>
        <DeadlineList timeZone={timeZone} />
      </section>
      {editable ? (
        <section className={styles.actions}>
          <Button type="button" onClick={() => setCreating((value) => !value)}>
            Добавить занятие
          </Button>
          {creating && subjects.data && tasks.data ? (
            <LessonForm
              subjects={subjects.data}
              tasks={tasks.data}
              timeZone={timeZone}
              onSaved={() => setCreating(false)}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
