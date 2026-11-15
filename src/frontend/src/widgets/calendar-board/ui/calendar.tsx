import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useCalendar, type CalendarDeadline, type CalendarLesson } from '@/entities/calendar/index.ts'
import { dayKey, formatDateTime, formatDay, fortnightRange, monthRange, shiftAnchor, shiftMonth, toUtcIso } from '@/shared/lib/index.ts'
import { Button } from '@/shared/ui/index.ts'

import styles from './calendar.module.css'

type Selection =
  | { kind: 'lesson'; id: number; title: string; subjectId: number; taskId: number | null; when: string; place: string }
  | { kind: 'deadline'; id: number; title: string; subjectId: number; subjectTag: string; when: string }

export function CalendarBoard({ timeZone }: { timeZone: string }) {
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchor, setAnchor] = useState(() => new Date())
  const [selected, setSelected] = useState<Selection | null>(null)
  const fortnight = fortnightRange(anchor, timeZone)
  const month = monthRange(anchor, timeZone)
  const range = mode === 'week' ? fortnight : month
  const calendar = useCalendar(range.start, range.end)
  const period = mode === 'month' ? capitalize(month.label) : formatSpan(fortnight.days, timeZone)
  const lessonsByDay = groupByDay(calendar.data?.lessons ?? [], (lesson) => dayKey(lesson.starts_at, timeZone))
  const deadlinesByDay = groupByDay(calendar.data?.deadlines ?? [], (deadline) => dayKey(deadline.deadline, timeZone))

  function step(direction: -1 | 1) {
    setAnchor((current) =>
      mode === 'week' ? shiftAnchor(current, timeZone, direction * 14) : shiftMonth(current, timeZone, direction),
    )
  }

  return (
    <section className={styles.board}>
      <div className={styles.toolbar}>
        <div>
          <button type="button" className={mode === 'week' ? styles.modeOn : styles.mode} aria-pressed={mode === 'week'} onClick={() => setMode('week')}>
            Неделя
          </button>
          <button type="button" className={mode === 'month' ? styles.modeOn : styles.mode} aria-pressed={mode === 'month'} onClick={() => setMode('month')}>
            Месяц
          </button>
        </div>
        <div className={styles.nav}>
          <button type="button" className={styles.arrow} aria-label="Назад" onClick={() => step(-1)}>
            <Chevron direction="left" />
          </button>
          <p className={styles.period}>{period}</p>
          <button type="button" className={styles.arrow} aria-label="Вперёд" onClick={() => step(1)}>
            <Chevron direction="right" />
          </button>
          <Button type="button" tone="ghost" onClick={() => setAnchor(new Date())}>Сегодня</Button>
        </div>
      </div>
      {calendar.isLoading ? <p>Загрузка календаря…</p> : null}
      {calendar.isError ? <p>Не удалось загрузить календарь.</p> : null}
      {mode === 'week' ? (
        <div className={styles.fortnight}>
          {fortnight.weeks.map((week) => (
            <div key={week[0]} className={styles.week}>
              {week.map((day) => (
                <div key={day} className={styles.day}>
                  <h3>{formatDay(day, timeZone)}</h3>
                  {(lessonsByDay.get(day) ?? []).map((lesson) => (
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
                  {(deadlinesByDay.get(day) ?? []).map((deadline) => (
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
                          subjectTag: subjectTag(deadline),
                          when: formatDateTime(deadline.deadline, timeZone),
                        })
                      }
                    >
                      <span className={styles.badge}>{subjectTag(deadline)}</span>
                      <span>{deadline.title}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.month}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((label) => (
            <span key={label} className={styles.weekday}>
              {label}
            </span>
          ))}
          {month.days.map((day) => {
            const inMonth = day.startsWith(month.monthKey)
            return (
              <div key={day} className={inMonth ? styles.cell : styles.muted}>
                <span className={styles.dayNum}>{Number(day.slice(-2))}</span>
                {(lessonsByDay.get(day) ?? []).map((lesson) => (
                  <button
                    key={`lesson-${lesson.id}`}
                    type="button"
                    className={styles.monthTag}
                    title={lesson.subject_name}
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
                    {subjectTag(lesson)}
                  </button>
                ))}
                {(deadlinesByDay.get(day) ?? []).map((deadline) => (
                  <button
                    key={`deadline-${deadline.id}`}
                    type="button"
                    className={styles.monthDeadline}
                    title={deadline.title}
                    onClick={() =>
                      setSelected({
                        kind: 'deadline',
                        id: deadline.id,
                        title: deadline.title,
                        subjectId: deadline.subject_id,
                        subjectTag: subjectTag(deadline),
                        when: formatDateTime(deadline.deadline, timeZone),
                      })
                    }
                  >
                    {subjectTag(deadline)}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}
      {selected ? (
        <article className={styles.details}>
          <h3>
            {selected.kind === 'deadline' ? <span className={styles.badge}>{selected.subjectTag}</span> : null}
            {selected.title}
          </h3>
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

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M11 4 L6 9 L11 14' : 'M7 4 L12 9 L7 14'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function subjectTag(item: Pick<CalendarLesson | CalendarDeadline, 'subject_tag' | 'subject_name'>) {
  const tag = item.subject_tag.trim()
  return tag || item.subject_name
}

function groupByDay<T>(items: T[], keyOf: (item: T) => string) {
  const grouped = new Map<string, T[]>()
  for (const item of items) {
    const key = keyOf(item)
    const bucket = grouped.get(key)
    if (bucket) bucket.push(item)
    else grouped.set(key, [item])
  }
  return grouped
}

function capitalize(value: string) {
  return value ? value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1) : value
}

function formatSpan(days: string[], timeZone: string) {
  const format = (ymd: string, withYear: boolean) =>
    new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      day: 'numeric',
      month: 'long',
      year: withYear ? 'numeric' : undefined,
    }).format(new Date(toUtcIso(`${ymd}T12:00`, timeZone)))
  const start = days[0]
  const end = days[days.length - 1]
  const sameYear = start.slice(0, 4) === end.slice(0, 4)
  return `${format(start, !sameYear)} — ${format(end, true)}`
}
