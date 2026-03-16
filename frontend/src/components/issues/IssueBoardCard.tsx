import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { IssueTypeBadge } from '@/components/IssueTypeBadge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SyncStatusIndicator } from '@/components/SyncStatusIndicator'
import { RefreshCw } from 'lucide-react'

export type IssueBoardCardBadge = {
  label: string
  variant?: 'default' | 'secondary' | 'outline'
  icon?: React.ReactNode
  className?: string
  title?: string
}

type Assignee = {
  name?: string | null
  avatarUrl?: string | null
}

export interface IssueBoardCardProps {
  title: string
  issueKey?: string | null
  typeLabel?: string | null
  typeIconUrl?: string | null
  headerAccessory?: React.ReactNode
  badgeRow?: IssueBoardCardBadge[]
  footerBadges?: IssueBoardCardBadge[]
  footerRight?: React.ReactNode
  projectName?: string | null
  assignee?: Assignee | null
  onTitleClick?: () => void
  children?: React.ReactNode
  className?: string
  // Jira integration props
  isJiraIssue?: boolean
  issueId?: string
  workspaceId?: string
  onSync?: () => void
  isSyncing?: boolean
}

const renderBadge = ({ label, variant = 'outline', icon, className, title }: IssueBoardCardBadge, index: number) => (
  <Badge
    key={`${label}-${index}`}
    variant={variant}
    title={title}
    className={cn('text-[10px] uppercase tracking-wide flex items-center gap-1', className)}
  >
    {icon}
    {label}
  </Badge>
)

const renderTypeBadge = (typeLabel?: string | null, typeIconUrl?: string | null) => {
  if (typeIconUrl) {
    return (
      <span className="h-5 w-5 overflow-hidden rounded border border-slate-200 bg-white">
        <img src={typeIconUrl} alt={typeLabel ?? 'issue type'} className="h-full w-full object-cover" />
      </span>
    )
  }

  if (typeLabel) {
    return <IssueTypeBadge type={typeLabel} />
  }

  return null
}

const renderAssignee = (assignee?: Assignee | null) => {
  if (!assignee || (!assignee.name && !assignee.avatarUrl)) return null
  const initials = assignee.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <Avatar className="h-6 w-6 border border-slate-200">
        {assignee.avatarUrl ? (
          <AvatarImage src={assignee.avatarUrl} alt={assignee.name ?? 'Assignee'} />
        ) : (
          <AvatarFallback className="bg-purple-100 text-[10px] font-semibold uppercase text-purple-700">
            {initials || '??'}
          </AvatarFallback>
        )}
      </Avatar>
      <span className="truncate max-w-[120px]" title={assignee.name ?? undefined}>
        {assignee.name ?? 'Unassigned'}
      </span>
    </div>
  )
}

export const IssueBoardCard: React.FC<IssueBoardCardProps> = ({
  title,
  issueKey,
  typeLabel,
  typeIconUrl,
  headerAccessory,
  badgeRow,
  footerBadges,
  footerRight,
  projectName,
  assignee,
  onTitleClick,
  children,
  className,
  isJiraIssue = false,
  issueId,
  workspaceId,
  onSync,
  isSyncing = false,
}) => {
  const displayTitle = title?.trim() || 'Untitled issue'
  const topBadges = badgeRow?.filter(Boolean) ?? []
  const bottomBadges = footerBadges?.filter(Boolean) ?? []

  // Add Jira badge if it's a Jira issue
  const enhancedTopBadges = isJiraIssue
    ? [
        ...topBadges,
        {
          label: 'Jira',
          variant: 'outline' as const,
          className: 'text-blue-600 border-blue-300 bg-blue-50',
          icon: (
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.53 2c0 2.4 1.97 4.35 4.35 4.35h1.78v1.7c0 2.4 1.94 4.34 4.34 4.34V2.84a.84.84 0 0 0-.84-.84h-9.63zM2 11.53c2.4 0 4.35 1.97 4.35 4.35v1.78h1.7c2.4 0 4.34 1.94 4.34 4.34H2.84a.84.84 0 0 1-.84-.84v-9.63z"/>
            </svg>
          ),
        },
      ]
    : topBadges

  return (
    <div
      className={cn(
        'rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:border-blue-200 hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col min-w-0 gap-1">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            {renderTypeBadge(typeLabel, typeIconUrl)}
            {issueKey && (
              <span className="font-mono text-[11px] uppercase tracking-wide text-slate-500" title={issueKey ?? undefined}>
                {issueKey}
              </span>
            )}
            {enhancedTopBadges.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                {enhancedTopBadges.map(renderBadge)}
              </div>
            )}
          </div>
          {onTitleClick ? (
            <button
              type="button"
              onClick={onTitleClick}
              className="text-left text-sm font-semibold leading-snug text-slate-900 hover:text-blue-600"
            >
              <span className="line-clamp-2" title={displayTitle}>
                {displayTitle}
              </span>
            </button>
          ) : (
            <span className="line-clamp-2 font-medium leading-snug text-slate-900" title={displayTitle}>
              {displayTitle}
            </span>
          )}
        </div>
        {headerAccessory && <div className="shrink-0">{headerAccessory}</div>}
        {isJiraIssue && issueId && workspaceId && (
          <div className="shrink-0 flex items-center gap-1">
            <SyncStatusIndicator
              entityType="issue"
              entityId={issueId}
              workspaceId={workspaceId}
              showLabel={false}
              size="sm"
            />
            {onSync && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSync()
                }}
                disabled={isSyncing}
                className="p-1 hover:bg-gray-100 rounded transition"
                title="Sync with Jira"
              >
                <RefreshCw className={`h-3 w-3 text-gray-500 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>
        )}
      </div>

      {children && <div className="mt-2 space-y-2 text-xs text-slate-500">{children}</div>}

      {(bottomBadges.length > 0 || footerRight || projectName || assignee) && (
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-1">
            {bottomBadges.map(renderBadge)}
          </div>
          <div className="shrink-0">
            {footerRight || renderAssignee(assignee) || (
              projectName && (
                <span className="truncate text-right font-medium text-slate-600" title={projectName}>
                  {projectName}
                </span>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

IssueBoardCard.displayName = 'IssueBoardCard'
