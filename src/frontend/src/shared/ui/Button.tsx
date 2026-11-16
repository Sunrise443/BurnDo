import type { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './ui.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'ghost' | 'danger'
  children: ReactNode
}

export function Button({ tone = 'primary', children, ...props }: Props) {
  const className = tone === 'ghost' ? styles.ghost : tone === 'danger' ? styles.danger : styles.button
  return (
    <button className={className} {...props}>
      {children}
    </button>
  )
}
