import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, primaryAction, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-4 ${className || ''}`}>
      {icon && <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 text-3xl">{icon}</div>}
      <h2 className="text-2xl font-semibold mb-2 text-slate-800">{title}</h2>
      {description && <p className="text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">{description}</p>}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {primaryAction}
        {secondaryAction}
      </div>
    </div>
  )
}
