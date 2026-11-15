type Ymd = { year: number; month: number; day: number }

export function toUtcIso(localValue: string, timeZone: string): string {
  const [datePart, timePart] = localValue.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hour, minute] = timePart.split(':').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute)
  const offset = timeZoneOffset(new Date(utcGuess), timeZone)
  const corrected = utcGuess - offset
  const offsetAfter = timeZoneOffset(new Date(corrected), timeZone)
  return new Date(utcGuess - offsetAfter).toISOString()
}

export function toLocalInput(iso: string, timeZone: string): string {
  const parts = zonedParts(new Date(iso), timeZone)
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export function formatDateTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDay(ymd: string, timeZone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(toUtcIso(`${ymd}T12:00`, timeZone)))
}

export function weekRange(anchor: Date, timeZone: string) {
  const today = ymdFromDate(anchor, timeZone)
  const monday = addDays(today, -weekdayIndex(anchor, timeZone))
  const days = Array.from({ length: 7 }, (_, index) => formatYmd(addDays(monday, index)))
  return {
    start: toUtcIso(`${formatYmd(monday)}T00:00`, timeZone),
    end: toUtcIso(`${formatYmd(addDays(monday, 7))}T00:00`, timeZone),
    days,
  }
}

export function monthRange(anchor: Date, timeZone: string) {
  const current = ymdFromDate(anchor, timeZone)
  const first = { year: current.year, month: current.month, day: 1 }
  const nextMonth = current.month === 12
    ? { year: current.year + 1, month: 1, day: 1 }
    : { year: current.year, month: current.month + 1, day: 1 }
  const gridStart = addDays(first, -weekdayIndex(new Date(toUtcIso(`${formatYmd(first)}T12:00`, timeZone)), timeZone))
  const days: string[] = []
  let cursor = gridStart
  const end = formatYmd(nextMonth)
  while (days.length < 42) {
    days.push(formatYmd(cursor))
    cursor = addDays(cursor, 1)
    if (days.length >= 28 && formatYmd(cursor) >= end && days.length % 7 === 0) {
      break
    }
  }
  return {
    start: toUtcIso(`${formatYmd(first)}T00:00`, timeZone),
    end: toUtcIso(`${formatYmd(nextMonth)}T00:00`, timeZone),
    days,
    monthKey: `${current.year}-${String(current.month).padStart(2, '0')}`,
    label: new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      month: 'long',
      year: 'numeric',
    }).format(new Date(toUtcIso(`${formatYmd(first)}T12:00`, timeZone))),
  }
}

export function shiftAnchor(anchor: Date, timeZone: string, days: number): Date {
  const shifted = addDays(ymdFromDate(anchor, timeZone), days)
  return new Date(toUtcIso(`${formatYmd(shifted)}T12:00`, timeZone))
}

export function dayKey(iso: string, timeZone: string): string {
  const parts = zonedParts(new Date(iso), timeZone)
  return `${parts.year}-${parts.month}-${parts.day}`
}

function timeZoneOffset(date: Date, timeZone: string): number {
  const parts = zonedParts(date, timeZone)
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  )
  return asUtc - date.getTime()
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  }).formatToParts(date)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

function ymdFromDate(date: Date, timeZone: string): Ymd {
  const parts = zonedParts(date, timeZone)
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) }
}

function weekdayIndex(date: Date, timeZone: string): number {
  const weekday = zonedParts(date, timeZone).weekday
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return Math.max(order.indexOf(weekday), 0)
}

function addDays(value: Ymd, days: number): Ymd {
  const shifted = new Date(Date.UTC(value.year, value.month - 1, value.day + days))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

function formatYmd(value: Ymd): string {
  const month = String(value.month).padStart(2, '0')
  const day = String(value.day).padStart(2, '0')
  return `${value.year}-${month}-${day}`
}
