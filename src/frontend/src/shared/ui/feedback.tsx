import { useEffect, useRef } from 'react'

import { Button } from './Button.tsx'
import styles from './ui.module.css'

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog ref={dialogRef} className={styles.dialog} onClose={onClose}>
      <form
        className={styles.stack}
        onSubmit={(event) => {
          event.preventDefault()
          onConfirm()
        }}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <div className={styles.row}>
          <Button type="submit" tone="danger" disabled={pending}>
            {confirmLabel}
          </Button>
          <Button type="button" tone="ghost" onClick={onClose}>
            Отмена
          </Button>
        </div>
      </form>
    </dialog>
  )
}

export function Notice({ children, tone = 'info' }: { children: string; tone?: 'info' | 'error' }) {
  return <p className={tone === 'error' ? styles.error : styles.notice}>{children}</p>
}
