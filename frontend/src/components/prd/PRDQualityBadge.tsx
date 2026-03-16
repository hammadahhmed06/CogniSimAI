import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Shield, TrendingUp, AlertTriangle } from 'lucide-react'

interface PRDQualityBadgeProps {
  score: number
  variant?: 'compact' | 'detailed'
  className?: string
}

function getScoreConfig(score: number): { label: string; color: string; bg: string; icon: typeof TrendingUp } {
  const pct = Math.round(score * 100)
  if (pct >= 80) {
    return { label: 'Excellent', color: 'text-green-600', bg: 'bg-green-500/10 border-green-500/20', icon: TrendingUp }
  }
  if (pct >= 60) {
    return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-500/10 border-blue-500/20', icon: Shield }
  }
  if (pct >= 40) {
    return { label: 'Fair', color: 'text-yellow-600', bg: 'bg-yellow-500/10 border-yellow-500/20', icon: AlertTriangle }
  }
  return { label: 'Needs Work', color: 'text-red-600', bg: 'bg-red-500/10 border-red-500/20', icon: AlertTriangle }
}

export function PRDQualityBadge({ score, variant = 'compact', className }: PRDQualityBadgeProps) {
  const pct = Math.round(score * 100)
  const config = getScoreConfig(score)
  const Icon = config.icon

  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn(config.bg, config.color, 'gap-1 cursor-default', className)}>
              <Icon className="w-3 h-3" />
              {pct}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">Quality Score: {config.label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className={cn('p-3 rounded-lg border', config.bg, className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Icon className={cn('w-4 h-4', config.color)} />
          <span className="text-xs font-medium text-muted-foreground">Quality Score</span>
        </div>
        <span className={cn('text-sm font-semibold', config.color)}>{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
      <p className={cn('text-xs mt-1.5 font-medium', config.color)}>{config.label}</p>
    </div>
  )
}
