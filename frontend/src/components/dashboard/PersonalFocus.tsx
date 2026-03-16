import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertTriangle,
  ChevronRight,
  ListChecks,
  Target,
  CalendarClock,
  FolderKanban,
  User
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IssueDTO } from '@/lib/api/issueService'

interface PersonalFocusProps {
  issues: IssueDTO[]
  isLoading?: boolean
  onIssueClick?: (issue: IssueDTO) => void
  projectNameById?: Record<string, string>
}

export function PersonalFocus({ issues, isLoading, onIssueClick, projectNameById }: PersonalFocusProps) {
  const normalizeStatus = (status?: string) => {
    const s = (status || '').trim().toLowerCase()
    if (s === 'todo' || s === 'to do' || s === 'open') return 'todo'
    if (s === 'in_progress' || s === 'in progress' || s.includes('progress')) return 'in_progress'
    if (s === 'done' || s === 'completed') return 'done'
    return s
  }

  const activeIssues = React.useMemo(() => {
    const filtered = (issues || []).filter((i) => {
      const n = normalizeStatus(i.status)
      return n === 'todo' || n === 'in_progress'
    })

    // Most recent first, prefer updated_at over created_at.
    return filtered
      .slice()
      .sort((a, b) => {
        const at = new Date(a.updated_at || a.created_at || 0).getTime()
        const bt = new Date(b.updated_at || b.created_at || 0).getTime()
        return bt - at
      })
  }, [issues])

  const inProgressIssues = activeIssues.filter(i => normalizeStatus(i.status) === 'in_progress')
  const todoIssues = activeIssues.filter(i => normalizeStatus(i.status) === 'todo')
  const highPriorityIssues = activeIssues.filter(i => i.priority?.toLowerCase() === 'highest' || i.priority?.toLowerCase() === 'high')

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'highest': return 'bg-red-100 text-red-700 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'lowest': return 'bg-slate-100 text-slate-700 border-slate-200'
      default: return 'bg-slate-100 text-slate-700 border-slate-200'
    }
  }

  const getTypeIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'bug': return '🐛'
      case 'story': return '📖'
      case 'epic': return '⚡'
      case 'task': return '✅'
      default: return '📋'
    }
  }

  const getStatusIcon = (status?: string) => {
    if (status?.toLowerCase().includes('progress')) {
      return <Clock className="h-3.5 w-3.5 text-blue-500" />
    }
    if (status?.toLowerCase() === 'done') {
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    }
    return <Circle className="h-3.5 w-3.5 text-slate-400" />
  }

  const formatDueDate = (due?: string | null) => {
    if (!due) return '—'
    const d = new Date(due)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString()
  }

  const getProjectName = (projectId?: string | null) => {
    if (!projectId) return 'No Project'
    return projectNameById?.[projectId] || 'Project'
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  }

  if (isLoading) {
    return (
      <Card className="border-blue-100 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-200">
              <Target className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Personal Focus</CardTitle>
              <p className="text-sm text-slate-500">Your assigned work items</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {inProgressIssues.length > 0 && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {inProgressIssues.length} In Progress
              </Badge>
            )}
            {highPriorityIssues.length > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                {highPriorityIssues.length} High Priority
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {activeIssues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <ListChecks className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">No active tasks assigned to you</p>
            <p className="text-xs text-slate-500 mt-1">Todo and in-progress work will appear here</p>
          </div>
        ) : (
          <>
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {activeIssues.slice(0, 5).map((issue) => (
                <motion.div
                  key={issue.id}
                  variants={itemVariants}
                  whileHover={{ x: 4 }}
                  className="group"
                >
                  <div
                    onClick={() => onIssueClick?.(issue)}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all cursor-pointer"
                  >
                    {/* Status indicator */}
                    <div className="shrink-0">
                      {getStatusIcon(issue.status)}
                    </div>

                    {/* Type icon */}
                    <span className="text-base shrink-0">
                      {getTypeIcon(issue.type)}
                    </span>

                    {/* Issue details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">
                          {issue.issue_key}
                        </span>
                        {issue.due_date && new Date(issue.due_date) < new Date() && (
                          <span className="flex items-center gap-1 text-[10px] text-red-600">
                            <AlertTriangle className="h-3 w-3" />
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {issue.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {issue.assignee_name || 'Unassigned'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FolderKanban className="h-3 w-3" />
                          {getProjectName(issue.project_id)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3 w-3" />
                          {formatDueDate(issue.due_date || null)}
                        </span>
                      </div>
                    </div>

                    {/* Priority badge */}
                    {issue.priority && (
                      <Badge variant="outline" className={cn("text-[10px] capitalize shrink-0", getPriorityColor(issue.priority))}>
                        {issue.priority}
                      </Badge>
                    )}

                    {/* Story points */}
                    {issue.story_points && (
                      <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 text-xs font-semibold text-slate-600 shrink-0">
                        {issue.story_points}
                      </span>
                    )}

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {activeIssues.length > 5 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <Link to="/dashboard/projects">
                  <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <span>View All {activeIssues.length} Active Tasks</span>
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
