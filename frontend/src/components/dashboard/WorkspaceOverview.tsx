import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  FolderKanban, 
  TrendingUp, 
  TrendingDown,
  LayoutGrid,
  Users,
  Activity,
  ChevronRight,
  Briefcase,
  Layers
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Project } from '@/lib/api/projectService'

interface WorkspaceStats {
  totalProjects: number
  activeProjects: number
  totalMembers: number
  completionRate: number
  trend: 'up' | 'down' | 'neutral'
  trendValue?: number
}

interface WorkspaceOverviewProps {
  stats: WorkspaceStats
  recentProjects?: Project[]
  isLoading?: boolean
}

export function WorkspaceOverview({ stats, recentProjects = [], isLoading }: WorkspaceOverviewProps) {
  const statCards = useMemo(() => [
    {
      label: 'Total Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'blue'
    },
    {
      label: 'Active Projects',
      value: stats.activeProjects,
      icon: Activity,
      color: 'emerald'
    },
    {
      label: 'Team Members',
      value: stats.totalMembers,
      icon: Users,
      color: 'purple'
    },
    {
      label: 'Completion Rate',
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: 'amber',
      showProgress: true,
      progressValue: stats.completionRate
    }
  ], [stats])

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600' },
      emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600' },
      purple: { bg: 'bg-purple-100', icon: 'text-purple-600' },
      amber: { bg: 'bg-amber-100', icon: 'text-amber-600' }
    }
    return colors[color] || colors.blue
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-200">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">Workspace Overview</CardTitle>
              <p className="text-sm text-slate-500">Your workspace at a glance</p>
            </div>
          </div>
          {stats.trend !== 'neutral' && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
              stats.trend === 'up' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            )}>
              {stats.trend === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              <span>{stats.trendValue}% this week</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-6">
        {/* Stats Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {statCards.map((stat, index) => {
            const IconComponent = stat.icon
            const colorClasses = getColorClasses(stat.color)

            return (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="relative p-4 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", colorClasses.bg)}>
                    <IconComponent className={cn("h-4 w-4", colorClasses.icon)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
                {stat.showProgress && (
                  <Progress value={stat.progressValue} className="h-1.5 mt-3" />
                )}
              </motion.div>
            )
          })}
        </motion.div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-slate-700">Recent Projects</h4>
              <Link 
                to="/dashboard/projects" 
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentProjects.slice(0, 3).map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link
                    to={`/dashboard/projects/${project.slug || project.id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600 font-semibold text-sm">
                      {project.key?.slice(0, 2) || project.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {project.type && <span className="capitalize">{project.type}</span>}
                        {project.key && <span> • {project.key}</span>}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn(
                      "capitalize text-xs",
                      project.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-600'
                    )}>
                      {project.status || 'Active'}
                    </Badge>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
