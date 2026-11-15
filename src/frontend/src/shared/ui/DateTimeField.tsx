import { useEffect, useId, useRef, useState } from 'react'

import styles from './ui.module.css'

const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

type Parts = { year: number; month: number; day: number; hour: string; minute: string }

export function DateTimeField({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const labelId = useId()
  const parsed = parseValue(value)
  const [cursor, setCursor] = useState(() => {
    const base = parsed ?? todayParts()
    return { year: base.year, month: base.month }
  })
  const [hour, setHour] = useState(parsed?.hour ?? '09')
  const [minute, setMinute] = useState(parsed?.minute ?? '00')

  useEffect(() => {
    if (!open) return
    function onPointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function openPicker() {
    const trigger = rootRef.current?.querySelector('button')
    const rect = trigger?.getBoundingClientRect()
    setAbove(rect ? window.innerHeight - rect.bottom < 460 : false)
    const current = parseValue(value) ?? todayParts()
    setCursor({ year: current.year, month: current.month })
    setHour(parseValue(value)?.hour ?? hour)
    setMinute(parseValue(value)?.minute ?? minute)
    setOpen(true)
  }

  function chooseDay(day: string) {
    onChange(commit(day, hour, minute))
  }

  function changeHour(next: string) {
    const digits = digitsWithin(next, 23)
    setHour(digits)
    if (parsed) onChange(commit(ymd(parsed), digits, minute))
  }

  function changeMinute(next: string) {
    const digits = digitsWithin(next, 59)
    setMinute(digits)
    if (parsed) onChange(commit(ymd(parsed), hour, digits))
  }

  const cells = monthCells(cursor.year, cursor.month)
  const monthLabel = new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(cursor.year, cursor.month - 1, 1, 12)))

  return (
    <div className={styles.menu} ref={rootRef}>
      <span className={styles.menuLabel} id={labelId}>
        {label}
      </span>
      <div className={styles.pickerControl}>
        <button
          type="button"
          className={styles.pickerTrigger}
          aria-labelledby={labelId}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openPicker())}
        >
          <span className={parsed ? undefined : styles.placeholder}>{formatTrigger(value)}</span>
          <span className={styles.chevron} aria-hidden="true">
            ▾
          </span>
        </button>
        <input className={styles.proxy} tabIndex={-1} required={required} value={value} onChange={() => undefined} />
        {open ? (
          <div className={above ? `${styles.picker} ${styles.popAbove}` : styles.picker} role="dialog" aria-label={label}>
            <div className={styles.pickerHead}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Предыдущий месяц"
                onClick={() => setCursor((current) => addMonths(current.year, current.month, -1))}
              >
                ‹
              </button>
              <strong>{capitalize(monthLabel)}</strong>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Следующий месяц"
                onClick={() => setCursor((current) => addMonths(current.year, current.month, 1))}
              >
                ›
              </button>
            </div>
            <div className={styles.weekdays}>
              {weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className={styles.days}>
              {cells.map((cell) => {
                const selected = parsed ? ymd(parsed) === cell.key : false
                const className = [
                  styles.dayButton,
                  cell.inMonth ? '' : styles.dayMuted,
                  selected ? styles.daySelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')
                return (
                  <button key={cell.key} type="button" className={className} onClick={() => chooseDay(cell.key)}>
                    {cell.label}
                  </button>
                )
              })}
            </div>
            <div className={styles.timeRow}>
              <label>
                Часы
                <input inputMode="numeric" value={hour} onChange={(event) => changeHour(event.target.value)} />
              </label>
              <label>
                Минуты
                <input inputMode="numeric" value={minute} onChange={(event) => changeMinute(event.target.value)} />
              </label>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function capitalize(value: string) {
  return value ? value.charAt(0).toLocaleUpperCase('ru-RU') + value.slice(1) : value
}

function formatTrigger(value: string) {
  const parsed = parseValue(value)
  if (!parsed) return 'Выберите дату и время'
  const label = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day, 12)))
  return `${label}, ${parsed.hour}:${parsed.minute}`
}

function parseValue(value: string): Parts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4],
    minute: match[5],
  }
}

function todayParts(): Parts {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: '09',
    minute: '00',
  }
}

function ymd(parts: Pick<Parts, 'year' | 'month' | 'day'>) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function digitsWithin(value: string, max: number) {
  const digits = value.replace(/\D/g, '').slice(0, 2)
  if (!digits) return ''
  return String(Math.min(Number(digits), max))
}

function commit(date: string, nextHour: string, nextMinute: string) {
  return `${date}T${unit(nextHour, 23)}:${unit(nextMinute, 59)}`
}

function unit(value: string, max: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return '00'
  return pad(Math.min(parsed, max))
}

function addMonths(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 + 1 }
}

function monthCells(year: number, month: number) {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const start = new Date(Date.UTC(year, month - 1, 1 - lead))
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * 86_400_000)
    const cellYear = date.getUTCFullYear()
    const cellMonth = date.getUTCMonth() + 1
    const cellDay = date.getUTCDate()
    return {
      key: `${cellYear}-${pad(cellMonth)}-${pad(cellDay)}`,
      label: String(cellDay),
      inMonth: cellYear === year && cellMonth === month,
    }
  })
}
