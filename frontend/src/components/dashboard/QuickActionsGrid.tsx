import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Plus, 
  FolderKanban, 
  ListTodo, 
  Users, 
  Sparkles,
  Settings,
  BarChart3,
  Calendar,
  Zap
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface QuickAction {
  id: string
  label: string
  description: string
  icon: React.ElementType
  href: string
  color: string
  badge?: string
}

const defaultActions: QuickAction[] = [
  {
    id: 'new-project',
    label: 'New Project',
    description: 'Create a new Scrum or Kanban project',
    icon: FolderKanban,
    href: '/dashboard/projects',
    color: 'blue'
  },
  {
    id: 'view-issues',
    label: 'View Issues',
    description: 'Browse all issues and tasks',
    icon: ListTodo,
    href: '/dashboard/issues',
    color: 'emerald'
  },
  {
    id: 'ai-decompose',
    label: 'AI Decompose',
    description: 'Use AI to break down an epic',
    icon: Sparkles,
    href: '/dashboard/agents/epic-decomposer',
    color: 'purple',
    badge: 'AI'
  },
  {
    id: 'prd-generator',
    label: 'PRD Generator',
    description: 'Generate PRDs with AI agents',
    icon: Sparkles,
    href: '/dashboard/agents/prd-generator',
    color: 'indigo',
    badge: 'AI'
  },
  {
    id: 'team-settings',
    label: 'Team Settings',
    description: 'Manage workspace and members',
    icon: Users,
    href: '/dashboard/team/settings',
    color: 'amber'
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Connect Jira, Slack & more',
    icon: BarChart3,
    href: '/dashboard/integrations',
    color: 'cyan'
  },
  {
    id: 'team-members',
    label: 'Team Members',
    description: 'Manage team and invite members',
    icon: Calendar,
    href: '/dashboard/team/members',
    color: 'rose'
  }
]

interface QuickActionsGridProps {
  actions?: QuickAction[]
}

export function QuickActionsGrid({ actions = defaultActions }: QuickActionsGridProps) {
  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; hover: string }> = {
      blue: { bg: 'bg-blue-50', icon: 'text-blue-600', hover: 'hover:bg-blue-100 hover:border-blue-200' },
      emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', hover: 'hover:bg-emerald-100 hover:border-emerald-200' },
      purple: { bg: 'bg-purple-50', icon: 'text-purple-600', hover: 'hover:bg-purple-100 hover:border-purple-200' },
      amber: { bg: 'bg-amber-50', icon: 'text-amber-600', hover: 'hover:bg-amber-100 hover:border-amber-200' },
      cyan: { bg: 'bg-cyan-50', icon: 'text-cyan-600', hover: 'hover:bg-cyan-100 hover:border-cyan-200' },
      rose: { bg: 'bg-rose-50', icon: 'text-rose-600', hover: 'hover:bg-rose-100 hover:border-rose-200' }
    }
    return colors[color] || colors.blue
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
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
  }

  return (
    <Card className="border-blue-100 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-200">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
            <p className="text-sm text-slate-500">Jump to common tasks</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {actions.map((action) => {
            const IconComponent = action.icon
            const colorClasses = getColorClasses(action.color)

            return (
              <motion.div
                key={action.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={action.href}
                  className={cn(
                    "group relative flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white transition-all",
                    colorClasses.hover
                  )}
                >
                  <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", colorClasses.bg)}>
                    <IconComponent className={cn("h-5 w-5", colorClasses.icon)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                        {action.label}
                      </h4>
                      {action.badge && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                          {action.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {action.description}
                    </p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </CardContent>
    </Card>
  )
}
