import React from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, 
  TrendingDown,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface InsightItem {
  label: string
  value: string | number
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  color: 'blue' | 'emerald' | 'purple' | 'amber' | 'rose'
}

interface DashboardInsightsProps {
  totalIssues: number
  completedIssues: number
  inProgressIssues: number
  todoIssues: number
  totalProjects: number
  avgCycleTime?: number
  velocity?: number
  isLoading?: boolean
}

export function DashboardInsights({
  totalIssues,
  completedIssues,
  inProgressIssues,
  todoIssues,
  totalProjects,
  avgCycleTime,
  velocity,
  isLoading
}: DashboardInsightsProps) {
  const completionRate = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0
  const productivityScore = Math.min(100, Math.round((completedIssues / Math.max(1, totalIssues)) * 100 + (velocity || 0) * 2))

  const insights: InsightItem[] = [
    {
      label: 'Total Issues',
      value: totalIssues,
      icon: Target,
      color: 'blue'
    },
    {
      label: 'Completed',
      value: completedIssues,
      change: completionRate,
      changeLabel: 'completion rate',
      trend: completionRate > 50 ? 'up' : 'neutral',
      icon: CheckCircle2,
      color: 'emerald'
    },
    {
      label: 'In Progress',
      value: inProgressIssues,
      icon: Clock,
      color: 'amber'
    },
    {
      label: 'To Do',
      value: todoIssues,
      icon: AlertCircle,
      color: 'purple'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; icon: string; text: string }> = {
      blue: { bg: 'bg-blue-100', icon: 'text-blue-600', text: 'text-blue-600' },
      emerald: { bg: 'bg-emerald-100', icon: 'text-emerald-600', text: 'text-emerald-600' },
      purple: { bg: 'bg-purple-100', icon: 'text-purple-600', text: 'text-purple-600' },
      amber: { bg: 'bg-amber-100', icon: 'text-amber-600', text: 'text-amber-600' },
      rose: { bg: 'bg-rose-100', icon: 'text-rose-600', text: 'text-rose-600' }
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
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 }
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold text-slate-900">Workspace Insights</CardTitle>
            <p className="text-sm text-slate-500">Performance metrics at a glance</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-5">
        {/* Key Metrics Grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-3 grid-cols-2 lg:grid-cols-4"
        >
          {insights.map((insight, index) => {
            const colorClasses = getColorClasses(insight.color)
            const IconComponent = insight.icon

            return (
              <motion.div
                key={insight.label}
                variants={itemVariants}
                className="relative p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colorClasses.bg)}>
                    <IconComponent className={cn("h-4 w-4", colorClasses.icon)} />
                  </div>
                  {insight.trend && (
                    <div className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      insight.trend === 'up' ? 'text-emerald-600' : insight.trend === 'down' ? 'text-rose-600' : 'text-slate-500'
                    )}>
                      {insight.trend === 'up' ? (
                        <ArrowUpRight className="h-3 w-3" />
                      ) : insight.trend === 'down' ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : null}
                      {insight.change}%
                    </div>
                  )}
                </div>
                <p className={cn("text-2xl font-bold", colorClasses.text)}>{insight.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{insight.label}</p>
              </motion.div>
            )
          })}
        </motion.div>

        {/* Progress Bars Section */}
        <div className="space-y-4 pt-2">
          {/* Completion Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">Overall Progress</span>
              <span className="text-emerald-600 font-semibold">{completionRate}%</span>
            </div>
            <div className="relative h-3 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionRate}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
              />
            </div>
          </div>

          {/* Work Distribution */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Work Distribution</span>
            <div className="flex h-3 rounded-full overflow-hidden">
              {totalIssues > 0 && (
                <>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedIssues / totalIssues) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className="bg-emerald-500"
                    title={`Done: ${completedIssues}`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(inProgressIssues / totalIssues) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="bg-amber-500"
                    title={`In Progress: ${inProgressIssues}`}
                  />
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(todoIssues / totalIssues) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="bg-purple-500"
                    title={`To Do: ${todoIssues}`}
                  />
                </>
              )}
              {totalIssues === 0 && (
                <div className="w-full bg-slate-200" />
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Done ({completedIssues})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                In Progress ({inProgressIssues})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-500" />
                To Do ({todoIssues})
              </span>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Projects</span>
            </div>
            <p className="text-xl font-bold text-blue-600">{totalProjects}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Productivity</span>
            </div>
            <p className="text-xl font-bold text-purple-600">{productivityScore}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
