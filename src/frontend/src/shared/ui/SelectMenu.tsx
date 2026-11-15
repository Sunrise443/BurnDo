import { useEffect, useId, useRef, useState } from 'react'

import styles from './ui.module.css'

export type MenuOption = {
  value: string
  label: string
}

export function SelectMenu({
  label,
  value,
  options,
  onChange,
  placeholder = 'Не выбрано',
}: {
  label: string
  value: string
  options: MenuOption[]
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [above, setAbove] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listId = useId()
  const selected = options.find((option) => option.value === value)

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

  return (
    <div className={styles.menu} ref={rootRef}>
      <span className={styles.menuLabel} id={`${listId}-label`}>
        {label}
      </span>
      <div className={styles.menuControl}>
        <button
          type="button"
          className={styles.menuTrigger}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => {
            const rect = rootRef.current?.getBoundingClientRect()
            setAbove(rect ? window.innerHeight - rect.bottom < 220 : false)
            setOpen((current) => !current)
          }}
        >
          <span className={selected ? undefined : styles.placeholder}>{selected?.label ?? placeholder}</span>
          <span className={styles.chevron} aria-hidden="true">
            ▾
          </span>
        </button>
        {open ? (
          <ul className={above ? `${styles.menuList} ${styles.popAbove}` : styles.menuList} id={listId} role="listbox" aria-labelledby={`${listId}-label`}>
            {options.length ? (
              options.map((option) => {
                const active = option.value === value
                return (
                  <li key={option.value || option.label}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={active ? styles.menuItemActive : styles.menuItem}
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                    >
                      {option.label}
                    </button>
                  </li>
                )
              })
            ) : (
              <li>
                <span className={styles.menuItem}>Нет вариантов</span>
              </li>
            )}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
