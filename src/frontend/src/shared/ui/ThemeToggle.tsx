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
      {next === 'dark' ? 'Тёмная' : 'Светлая'}
    </button>
  )
}
