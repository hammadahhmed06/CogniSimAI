import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Bot, 
  Sparkles, 
  Wand2, 
  ChevronRight,
  Clock,
  TrendingUp,
  FileText,
  Lock
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { AgentRunSummary } from '@/lib/api/agentService'

interface AIAgentsHubProps {
  runs?: AgentRunSummary[]
  isLoading?: boolean
  totalRuns?: number
  storiesGenerated?: number
  avgQualityScore?: number
}

export function AIAgentsHub({ 
  runs = [], 
  isLoading,
  totalRuns = 0,
  storiesGenerated = 0,
  avgQualityScore = 0
}: AIAgentsHubProps) {
  
  // Calculate stats from runs
  const recentRuns = runs.slice(0, 3)
  const lastRun = runs[0]
  const runsToday = runs.filter(r => {
    const runDate = new Date(r.started_at)
    const today = new Date()
    return runDate.toDateString() === today.toDateString()
  }).length

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500'
      case 'running': return 'bg-blue-500 animate-pulse'
      case 'failed': return 'bg-red-500'
      default: return 'bg-slate-400'
    }
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
    <Card className="border-blue-100 shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold text-slate-900">AI Agents</CardTitle>
              <p className="text-sm text-slate-500">Intelligent automation for your workflow</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            1 Active Agent
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-5">
        {/* Epic Architect Agent - The only active agent */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Link to="/dashboard/agents" className="block">
            <div className="group p-4 rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:border-blue-300 hover:shadow-lg transition-all">
              {/* Status indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="text-xs text-emerald-600 font-medium">Active</span>
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>

              {/* Agent Info */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                  <Wand2 className="h-7 w-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Epic Architect
                    </h4>
                    <Badge className="bg-gradient-to-r from-purple-500 to-blue-500 text-white text-[10px] px-1.5">
                      AI
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    Automatically decomposes epics into well-structured user stories with acceptance criteria
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-blue-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{totalRuns}</p>
                  <p className="text-xs text-slate-500">Total Runs</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{storiesGenerated}</p>
                  <p className="text-xs text-slate-500">Stories Created</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {avgQualityScore > 0 ? `${Math.round(avgQualityScore * 10)}%` : '—'}
                  </p>
                  <p className="text-xs text-slate-500">Avg Quality</p>
                </div>
              </div>

              {/* Last run info */}
              {lastRun && (
                <div className="flex items-center gap-2 mt-3 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last run: {formatTimeAgo(lastRun.started_at)}</span>
                  {lastRun.created_issue_count > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">
                        {lastRun.created_issue_count} stories generated
                      </span>
                    </>
                  )}
                </div>
              )}

              <ChevronRight className="absolute right-4 bottom-4 h-5 w-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </motion.div>

        {/* Coming Soon Agents */}
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Coming Soon</h5>
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-2 sm:grid-cols-2"
          >
            {[
              { name: 'Sprint Planner', desc: 'AI-powered sprint planning', icon: TrendingUp },
              { name: 'Test Generator', desc: 'Generate test cases from stories', icon: FileText },
            ].map((agent, index) => (
              <motion.div
                key={agent.name}
                variants={itemVariants}
                className="relative flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 opacity-60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200">
                  <agent.icon className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-slate-600 text-sm">{agent.name}</h4>
                    <Lock className="h-3 w-3 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-500 truncate">{agent.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Recent Runs */}
        {recentRuns.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Recent Runs</h5>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className={cn("h-2 w-2 rounded-full shrink-0", getStatusColor(run.status))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">
                      Epic Decomposition
                    </p>
                    <p className="text-xs text-slate-500">
                      {run.created_issue_count} stories • {formatTimeAgo(run.started_at)}
                    </p>
                  </div>
                  {run.quality_score && (
                    <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                      {Math.round(run.quality_score * 10)}/10
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <Link to="/dashboard/agents">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white">
              <Sparkles className="h-4 w-4 mr-2" />
              Open AI Agents
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
