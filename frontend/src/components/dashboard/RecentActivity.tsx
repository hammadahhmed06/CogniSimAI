import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  MessageSquare,
  GitBranch,
  Zap
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface RecentActivityItem {
  id: string
  type: 'issue_created' | 'issue_updated' | 'issue_completed' | 'sprint_started' | 'sprint_completed' | 'comment_added' | 'ai_generated'
  title: string
  description?: string
  timestamp: string
  projectName?: string
  projectId?: string
  issueKey?: string
}

interface RecentActivityProps {
  activities: RecentActivityItem[]
  isLoading?: boolean
}

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'issue_created':
        return <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><AlertCircle className="h-4 w-4 text-blue-600" /></div>
      case 'issue_updated':
        return <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center"><Clock className="h-4 w-4 text-amber-600" /></div>
      case 'issue_completed':
        return <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
      case 'sprint_started':
      case 'sprint_completed':
        return <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center"><GitBranch className="h-4 w-4 text-purple-600" /></div>
      case 'comment_added':
        return <div className="h-8 w-8 rounded-full bg-cyan-100 flex items-center justify-center"><MessageSquare className="h-4 w-4 text-cyan-600" /></div>
      case 'ai_generated':
        return <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"><Zap className="h-4 w-4 text-white" /></div>
      default:
        return <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center"><Clock className="h-4 w-4 text-slate-600" /></div>
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
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
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 shadow-lg shadow-cyan-200">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
            <p className="text-sm text-slate-500">Latest updates across your workspace</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
              <Clock className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 font-medium">No recent activity</p>
            <p className="text-xs text-slate-500 mt-1">Activity will appear here as you work</p>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative"
          >
            {/* Timeline line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-slate-200" />

            <div className="space-y-4">
              {activities.slice(0, 8).map((activity, index) => (
                <motion.div
                  key={activity.id}
                  variants={itemVariants}
                  className="relative flex items-start gap-4 pl-0"
                >
                  {/* Icon */}
                  <div className="relative z-10 shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 leading-tight">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                            {activity.description}
                          </p>
                        )}
                        {activity.projectName && (
                          <p className="text-xs text-blue-600 mt-1">
                            {activity.projectName}
                            {activity.issueKey && <span className="text-slate-400 ml-1">• {activity.issueKey}</span>}
                          </p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400 whitespace-nowrap shrink-0">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  )
}
