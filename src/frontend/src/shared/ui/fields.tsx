import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

import styles from './ui.module.css'

export function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={styles.field}>
      {label}
      <input {...props} />
    </label>
  )
}

export function TextArea({
  label,
  ...props
}: { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={styles.field}>
      {label}
      <textarea rows={4} {...props} />
    </label>
  )
}

export function SelectField({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className={styles.field}>
      {label}
      <select {...props}>{children}</select>
    </label>
  )
}
