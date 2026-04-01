import type { ReactNode } from 'react'

type ActionButtonProps = {
  label: string
  onClick: () => void
  tone?: 'primary' | 'secondary' | 'danger'
  meta?: string
  disabled?: boolean
  icon?: ReactNode
}

export function ActionButton({
  label,
  onClick,
  tone = 'primary',
  meta,
  disabled = false,
  icon,
}: ActionButtonProps) {
  return (
    <button className={`action-button action-button--${tone}`} onClick={onClick} disabled={disabled}>
      <span className="action-button__label-row">
        {icon ? <span className="action-button__icon">{icon}</span> : null}
        <span>{label}</span>
      </span>
      {meta ? <span className="action-button__meta">{meta}</span> : null}
    </button>
  )
}
