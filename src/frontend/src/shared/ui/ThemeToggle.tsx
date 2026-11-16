import { useState } from 'react'

import styles from './ui.module.css'

const storageKey = 'burndo-theme'

type ThemeName = 'light' | 'dark'

function readTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(theme: ThemeName) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(storageKey, theme)
  } catch {
    /* preference stays for this visit */
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeName>(() => readTheme())
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className={styles.theme}
      aria-pressed={theme === 'dark'}
      aria-label={next === 'dark' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      onClick={() => {
        applyTheme(next)
        setTheme(next)
      }}
    >
      <span className={styles.themeIcons} aria-hidden="true">
        <SunIcon />
        <MoonIcon />
      </span>
    </button>
  )
}

function SunIcon() {
  return (
    <svg className={styles.sun} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4.2" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 2.4v2.3" />
        <path d="M12 19.3v2.3" />
        <path d="M2.4 12h2.3" />
        <path d="M19.3 12h2.3" />
        <path d="M5.1 5.1l1.6 1.6" />
        <path d="M17.3 17.3l1.6 1.6" />
        <path d="M18.9 5.1l-1.6 1.6" />
        <path d="M6.7 17.3l-1.6 1.6" />
      </g>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className={styles.moon} viewBox="0 0 24 24">
      <path fill="currentColor" d="M21 14.5A8.5 8.5 0 1 1 9.5 3a7 7 0 0 0 11.5 11.5z" />
    </svg>
  )
}
