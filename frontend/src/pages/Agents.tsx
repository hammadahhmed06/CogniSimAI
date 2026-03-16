import { useState, useMemo, useContext } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Sparkles, 
  BrainCircuit, 
  Wand2, 
  Users, 
  Bot, 
  ChevronRight, 
  Clock, 
  TrendingUp, 
  FileText, 
  Lock, 
  Zap,
  Target,
  ArrowUpRight,
  Play,
  BarChart3,
  CheckCircle2,
  Loader2,
  Send,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { agentService, AgentRunSummary, FeatureRequestCreate } from '@/lib/api/agentService'
import { TeamContext } from '@/components/TeamProvider'
import { toast } from 'sonner'


const AGENTS = [
  {
    id: 'epic-decomposer',
    name: 'Epic Architect',
    status: 'Active',
    statusColor: 'emerald',
    description: 'Transform complex epics into well-structured, backlog-ready user stories with detailed acceptance criteria and story point estimates.',
    highlights: [
      'AI-powered story generation with quality guardrails',
      'Automatic duplicate detection against existing backlog',
      'Per-story regeneration and fine-tuning controls',
      'Acceptance criteria with testable conditions',
      'Story point estimation based on complexity'
    ],
    cta: 'Launch Agent',
    href: '/dashboard/agents/epic-decomposer',
    persona: 'Product Managers • Tech Leads',
    icon: Wand2,
    gradient: 'from-blue-500 to-blue-600',
    bgGradient: 'from-blue-50 to-white',
    borderColor: 'border-blue-200',
    hoverBorder: 'hover:border-blue-300',
  },
  {
    id: 'prd-generator',
    name: 'PRD Generator',
    status: 'Active',
    statusColor: 'emerald',
    description: 'Generate comprehensive Product Requirements Documents with multi-agent orchestration for enterprise-grade documentation.',
    highlights: [
      'Multi-agent pipeline for thorough analysis',
      'Executive summary, personas & user journeys',
      'Feature specifications with acceptance criteria',
      'Technical requirements & risk assessment',
      'Section-level regeneration & version control'
    ],
    cta: 'Launch Agent',
    href: '/dashboard/agents/prd-generator',
    persona: 'Product Managers • Business Analysts',
    icon: FileText,
    gradient: 'from-purple-500 to-purple-600',
    bgGradient: 'from-purple-50 to-white',
    borderColor: 'border-purple-200',
    hoverBorder: 'hover:border-purple-300',
  },
]

const UPCOMING = [
  {
    name: 'Sprint Planner',
    description: 'AI-powered sprint planning based on velocity, priorities, and team capacity.',
    icon: TrendingUp,
    eta: 'Q1 2026'
  },
  {
    name: 'Test Generator',
    description: 'Generate comprehensive test cases from user stories automatically.',
    icon: FileText,
    eta: 'Q1 2026'
  },
  {
    name: 'Retro Insights',
    description: 'Summarize retrospective notes and generate actionable follow-ups.',
    icon: Target,
    eta: 'Q2 2026'
  },
  {
    name: 'Code Reviewer',
    description: 'AI-assisted code review with best practice suggestions.',
    icon: BrainCircuit,
    eta: 'Q2 2026'
  },
]

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const teamContext = useContext(TeamContext)
  const currentTeamId = teamContext?.currentTeam?.id
  
  // Feedback dialog state
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackCategory, setFeedbackCategory] = useState<FeatureRequestCreate['category']>('agent_request')
  const [feedbackTitle, setFeedbackTitle] = useState('')
  const [feedbackDescription, setFeedbackDescription] = useState('')
  const [feedbackPriority, setFeedbackPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Fetch agent runs
  const agentRunsQuery = useQuery({
    queryKey: ['agent-runs', currentTeamId],
    queryFn: () => agentService.listRuns({ limit: 50 }),
    staleTime: 30000,
    enabled: !!currentTeamId,
    retry: false
  })

  const handleSubmitFeedback = async () => {
    if (!feedbackTitle.trim() || !feedbackDescription.trim()) {
      toast.error('Please fill in all required fields')
      return
    }
    
    setIsSubmittingFeedback(true)
    try {
      await agentService.submitFeedback({
        category: feedbackCategory,
        title: feedbackTitle.trim(),
        description: feedbackDescription.trim(),
        priority: feedbackPriority,
      })
      toast.success('Thank you! Your feedback has been submitted.')
      setFeedbackOpen(false)
      setFeedbackTitle('')
      setFeedbackDescription('')
      setFeedbackCategory('agent_request')
      setFeedbackPriority('medium')
    } catch (error) {
      toast.error('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmittingFeedback(false)
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const runs = agentRunsQuery.data || []
    const totalRuns = runs.length
    const storiesGenerated = runs.reduce((acc, r) => acc + (r.created_issue_count || 0), 0)
    const completedRuns = runs.filter(r => r.status === 'completed').length
    const successRate = totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 0
    const scoresWithValues = runs.filter(r => r.quality_score != null)
    const avgQualityScore = scoresWithValues.length > 0 
      ? scoresWithValues.reduce((acc, r) => acc + (r.quality_score || 0), 0) / scoresWithValues.length
      : 0

    // Recent runs
    const recentRuns = runs.slice(0, 5)
    const lastRun = runs[0]

    return { totalRuns, storiesGenerated, successRate, avgQualityScore, recentRuns, lastRun }
  }, [agentRunsQuery.data])

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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full">
          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-200">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">AI Agents</h1>
                  <p className="text-slate-600 mt-1">
                    Intelligent automation copilots for product and delivery teams
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/dashboard/agents/settings">
                    <Settings className="h-4 w-4" />
                    Agent Settings
                  </Link>
                </Button>
                <Button asChild variant="outline" className="gap-2">
                  <Link to="/dashboard/projects">
                    <Users className="h-4 w-4" />
                    Manage Projects
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { 
                label: 'Total Runs', 
                value: stats.totalRuns, 
                icon: Play, 
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                iconBg: 'bg-blue-100'
              },
              { 
                label: 'Stories Generated', 
                value: stats.storiesGenerated, 
                icon: FileText, 
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                iconBg: 'bg-emerald-100'
              },
              { 
                label: 'Success Rate', 
                value: `${stats.successRate}%`, 
                icon: CheckCircle2, 
                color: 'text-purple-600',
                bg: 'bg-purple-50',
                iconBg: 'bg-purple-100'
              },
              { 
                label: 'Avg Quality', 
                value: stats.avgQualityScore > 0 ? `${Math.round(stats.avgQualityScore * 10)}/10` : '—', 
                icon: BarChart3, 
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                iconBg: 'bg-amber-100'
              },
            ].map((stat, index) => (
              <Card key={stat.label} className={cn("border-slate-200 shadow-sm", stat.bg)}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", stat.iconBg)}>
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                    <div>
                      <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* Hero Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 md:p-8 shadow-sm">
              {/* Subtle background effects */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_52%)]" aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(147,51,234,0.06),transparent_60%)]" aria-hidden />
              
              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4 max-w-2xl">
                  <Badge className="w-fit bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Intelligent Workflow Copilots
                  </Badge>
                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                      Automate planning with trusted AI partners
                    </h2>
                    <p className="text-slate-600 leading-relaxed">
                      Each agent is fine-tuned on pragmatic delivery patterns. Start with the Epic Architect 
                      to generate clean, actionable stories that slot straight into your backlog.
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-3 text-sm text-slate-700 lg:min-w-[280px]">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-slate-100">
                    <div className="p-1.5 rounded-md bg-amber-100">
                      <Wand2 className="h-4 w-4 text-amber-600" />
                    </div>
                    <span>No hallucinated scope — guardrails keep suggestions grounded</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-slate-100">
                    <div className="p-1.5 rounded-md bg-blue-100">
                      <BrainCircuit className="h-4 w-4 text-blue-600" />
                    </div>
                    <span>Optimised prompts ensure consistent, high-quality output</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-white/80 border border-slate-100">
                    <div className="p-1.5 rounded-md bg-emerald-100">
                      <Users className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span>Designed for PMs, Tech Leads, and cross-functional teams</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Left Column - Active Agents */}
            <div className="lg:col-span-7 space-y-6">
              {/* Active Agent Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Active Agents
                </h3>
                
                {AGENTS.map((agent) => (
                  <Card 
                    key={agent.id} 
                    className={cn(
                      "overflow-hidden transition-all duration-300",
                      agent.borderColor,
                      agent.hoverBorder,
                      "hover:shadow-lg"
                    )}
                  >
                    {/* Gradient accent bar */}
                    <div className={cn("h-1 bg-gradient-to-r", agent.gradient)} />
                    
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl",
                            "bg-gradient-to-br shadow-lg shadow-blue-200",
                            agent.gradient
                          )}>
                            <agent.icon className="h-7 w-7 text-white" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-xl font-semibold text-slate-900">
                                {agent.name}
                              </CardTitle>
                              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                                {agent.status}
                              </Badge>
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {agent.persona}
                            </Badge>
                          </div>
                        </div>
                        

                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <CardDescription className="text-slate-600 text-sm leading-relaxed">
                        {agent.description}
                      </CardDescription>
                      
                      {/* Features */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Features</h4>
                        <ul className="grid gap-1.5">
                          {agent.highlights.map((point) => (
                            <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                        <div className="text-center p-3 rounded-lg bg-slate-50">
                          <p className="text-2xl font-bold text-blue-600">{stats.totalRuns}</p>
                          <p className="text-xs text-slate-500">Total Runs</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50">
                          <p className="text-2xl font-bold text-emerald-600">{stats.storiesGenerated}</p>
                          <p className="text-xs text-slate-500">Stories Created</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-slate-50">
                          <p className="text-2xl font-bold text-purple-600">
                            {stats.avgQualityScore > 0 ? `${Math.round(stats.avgQualityScore * 10)}/10` : '—'}
                          </p>
                          <p className="text-xs text-slate-500">Avg Quality</p>
                        </div>
                      </div>
                      
                      {/* Last Run Info */}
                      {stats.lastRun && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Last run: {formatTimeAgo(stats.lastRun.started_at)}</span>
                          {stats.lastRun.created_issue_count > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600 font-medium">
                                {stats.lastRun.created_issue_count} stories generated
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </CardContent>
                    
                    <CardFooter className="bg-slate-50/50 border-t border-slate-100">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs text-slate-500">
                          Ship faster without sacrificing story quality
                        </span>
                        <Button asChild className={cn(
                          "gap-2 bg-gradient-to-r hover:shadow-md transition-all",
                          agent.gradient
                        )}>
                          <Link to={agent.href}>
                            <Sparkles className="h-4 w-4" />
                            {agent.cta}
                            <ArrowUpRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </motion.div>
            </div>

            {/* Right Column - Recent Runs & Coming Soon */}
            <div className="lg:col-span-5 space-y-6">
              {/* Recent Runs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-slate-900">
                        Recent Runs
                      </CardTitle>
                      <Badge variant="outline" className="text-xs">
                        {stats.recentRuns.length} runs
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {agentRunsQuery.isLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                      </div>
                    ) : stats.recentRuns.length > 0 ? (
                      stats.recentRuns.map((run) => (
                        <motion.div
                          key={run.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                        >
                          <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", getStatusColor(run.status))} />
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
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Play className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-600 font-medium">No runs yet</p>
                        <p className="text-xs text-slate-500 mt-1">Launch an agent to get started</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Coming Soon */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-base font-semibold text-slate-900">
                        Coming Soon
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      Expanding the agent roster to cover more workflows
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {UPCOMING.map((agent, index) => (
                      <motion.div
                        key={agent.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 + index * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/50"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-200">
                          <agent.icon className="h-4 w-4 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-700 text-sm">{agent.name}</h4>
                            <Lock className="h-3 w-3 text-slate-400" />
                          </div>
                          <p className="text-xs text-slate-500 truncate">{agent.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {agent.eta}
                        </Badge>
                      </motion.div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Feedback Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
              >
                <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-blue-100">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                          Request a New Agent
                        </h4>
                        <p className="text-xs text-slate-600 mb-3">
                          We're actively expanding the agent roster. Tell us which workflows you'd like automated next.
                        </p>
                        <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2 text-xs">
                              Submit Feedback
                              <ArrowUpRight className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-blue-600" />
                                Submit Feedback
                              </DialogTitle>
                              <DialogDescription>
                                Help us improve by sharing your ideas, reporting issues, or requesting new features.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={feedbackCategory} onValueChange={(v) => setFeedbackCategory(v as FeatureRequestCreate['category'])}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="agent_request">
                                      <span className="flex items-center gap-2">
                                        <Bot className="h-4 w-4 text-purple-500" />
                                        Request New Agent
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="improvement">
                                      <span className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-blue-500" />
                                        Suggest Improvement
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="bug_report">
                                      <span className="flex items-center gap-2">
                                        <Target className="h-4 w-4 text-red-500" />
                                        Report Bug
                                      </span>
                                    </SelectItem>
                                    <SelectItem value="general">
                                      <span className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-500" />
                                        General Feedback
                                      </span>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              <div className="grid gap-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                  id="title"
                                  value={feedbackTitle}
                                  onChange={(e) => setFeedbackTitle(e.target.value)}
                                  placeholder={feedbackCategory === 'agent_request' ? 'e.g., Sprint Planning Agent' : 'Brief summary...'}
                                />
                              </div>
                              
                              <div className="grid gap-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                  id="description"
                                  value={feedbackDescription}
                                  onChange={(e) => setFeedbackDescription(e.target.value)}
                                  placeholder={feedbackCategory === 'agent_request' 
                                    ? 'Describe the agent functionality, use cases, and how it would help your workflow...'
                                    : 'Provide details about your feedback...'}
                                  rows={4}
                                />
                              </div>
                              
                              <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select value={feedbackPriority} onValueChange={(v) => setFeedbackPriority(v as 'low' | 'medium' | 'high')}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="low">Low - Nice to have</SelectItem>
                                    <SelectItem value="medium">Medium - Would improve workflow</SelectItem>
                                    <SelectItem value="high">High - Critical for my work</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setFeedbackOpen(false)}>
                                Cancel
                              </Button>
                              <Button 
                                onClick={handleSubmitFeedback} 
                                disabled={isSubmittingFeedback || !feedbackTitle.trim() || !feedbackDescription.trim()}
                                className="gap-2"
                              >
                                {isSubmittingFeedback ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                Submit
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
    </DashboardLayout>
  )
}
