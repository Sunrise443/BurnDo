import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useCalendar } from '@/entities/calendar/index.ts'
import { dayKey, formatDateTime, formatDay, monthRange, shiftAnchor, toUtcIso, weekRange } from '@/shared/lib/index.ts'
import { Button } from '@/shared/ui/index.ts'

import styles from './calendar.module.css'

type Selection =
  | { kind: 'lesson'; id: number; title: string; subjectId: number; taskId: number | null; when: string; place: string }
  | { kind: 'deadline'; id: number; title: string; subjectId: number; when: string }

export function CalendarBoard({ timeZone }: { timeZone: string }) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState<Selection | null>(null)
  const week = weekRange(anchor, timeZone)
  const month = monthRange(anchor, timeZone)
  const range = mode === 'week' ? week : month
  const calendar = useCalendar(range.start, range.end)
  const step = mode === 'week' ? 7 : 30

  return (
    <section className={styles.board}>
      <div className={styles.toolbar}>
        <div>
          <Button type="button" tone="ghost" onClick={() => setMode('week')}>Неделя</Button>
          <Button type="button" tone="ghost" onClick={() => setMode('month')}>Месяц</Button>
        </div>
        <div>
          <Button type="button" tone="ghost" onClick={() => setAnchor((current) => shiftAnchor(current, timeZone, -step))}>
            Назад
          </Button>
          <Button type="button" tone="ghost" onClick={() => setAnchor(new Date())}>Сегодня</Button>
          <Button type="button" tone="ghost" onClick={() => setAnchor((current) => shiftAnchor(current, timeZone, step))}>
            Дальше
          </Button>
        </div>
      </div>
      {calendar.isLoading ? <p>Загрузка календаря…</p> : null}
      {calendar.isError ? <p>Не удалось загрузить календарь.</p> : null}
      {mode === 'week' ? (
        <div className={styles.week}>
          {week.days.map((day) => (
            <div key={day} className={styles.day}>
              <h3>{formatDay(day, timeZone)}</h3>
              {calendar.data?.lessons
                .filter((lesson) => dayKey(lesson.starts_at, timeZone) === day)
                .map((lesson) => (
                  <button
                    key={`lesson-${lesson.id}`}
                    type="button"
                    className={styles.lesson}
                    onClick={() =>
                      setSelected({
                        kind: 'lesson',
                        id: lesson.id,
                        title: lesson.subject_name,
                        subjectId: lesson.subject_id,
                        taskId: lesson.task_id,
                        when: `${formatDateTime(lesson.starts_at, timeZone)} – ${formatDateTime(lesson.ends_at, timeZone)}`,
                        place: lesson.classroom,
                      })
                    }
                  >
                    {lesson.subject_name}
                  </button>
                ))}
              {calendar.data?.deadlines
                .filter((deadline) => dayKey(deadline.deadline, timeZone) === day)
                .map((deadline) => (
                  <button
                    key={`deadline-${deadline.id}`}
                    type="button"
                    className={styles.deadline}
                    onClick={() =>
                      setSelected({
                        kind: 'deadline',
                        id: deadline.id,
                        title: deadline.title,
                        subjectId: deadline.subject_id,
                        when: formatDateTime(deadline.deadline, timeZone),
                      })
                    }
                  >
                    {deadline.title}
                  </button>
                ))}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.month}>
          {month.days.map((day) => {
            const inMonth = day.startsWith(month.monthKey)
            const count =
              (calendar.data?.lessons.filter((lesson) => dayKey(lesson.starts_at, timeZone) === day).length ?? 0) +
              (calendar.data?.deadlines.filter((deadline) => dayKey(deadline.deadline, timeZone) === day).length ?? 0)
            return (
              <button
                key={day}
                type="button"
                className={inMonth ? styles.cell : styles.muted}
                onClick={() => setAnchor(new Date(toUtcIso(`${day}T12:00`, timeZone)))}
              >
                <span>{Number(day.slice(-2))}</span>
                {count > 0 ? <small>{count}</small> : null}
              </button>
            )
          })}
        </div>
      )}
      {selected ? (
        <article className={styles.details}>
          <h3>{selected.title}</h3>
          <p>{selected.when}</p>
          {selected.kind === 'lesson' && selected.place ? <p>{selected.place}</p> : null}
          <Link to={`/subjects/${selected.subjectId}`}>К предмету</Link>
          {selected.kind === 'lesson' && selected.taskId ? (
            <Link to={`/tasks/${selected.taskId}`}>К заданию</Link>
          ) : null}
          {selected.kind === 'deadline' ? <Link to={`/tasks/${selected.id}`}>К заданию</Link> : null}
        </article>
      ) : null}
    </section>
  )
}
