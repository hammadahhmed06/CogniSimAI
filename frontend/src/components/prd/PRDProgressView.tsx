import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Loader2,
  AlertTriangle,
  CircleCheck,
  FileText,
  Users,
  Target,
  Settings2,
  Shield,
  Clock,
} from 'lucide-react'

import type { SectionConfig } from './prd-types'

const SECTION_LABELS: Record<string, SectionConfig> = {
  executive_summary: { label: 'Executive Summary', icon: FileText },
  user_personas: { label: 'User Personas', icon: Users },
  feature_specifications: { label: 'Feature Specifications', icon: Target },
  technical_requirements: { label: 'Technical Requirements', icon: Settings2 },
  risks_and_mitigations: { label: 'Risks & Mitigations', icon: Shield },
  timeline_and_phases: { label: 'Timeline & Phases', icon: Clock },
}

interface PRDProgressViewProps {
  progress: { message: string; percent: number; stage: string } | null
  sectionsCompleted: Set<string>
  error: string | null
  onCancel: () => void
}

export function PRDProgressView({ progress, sectionsCompleted, error, onCancel }: PRDProgressViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <CardTitle>Generating Your PRD</CardTitle>
          <CardDescription>
            Our AI agents are working together to create your document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{progress?.message || 'Processing...'}</span>
              <span className="font-medium">{progress?.percent || 0}%</span>
            </div>
            <Progress value={progress?.percent || 0} className="h-2" />
          </div>

          {/* Section Progress Grid */}
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(SECTION_LABELS).map(([key, { label, icon: Icon }]) => {
              const isCompleted = sectionsCompleted.has(key)
              const isCurrent = progress?.stage === key

              return (
                <div
                  key={key}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border transition-all',
                    isCompleted && 'bg-green-500/10 border-green-500/20',
                    isCurrent && 'bg-primary/10 border-primary/20 animate-pulse',
                    !isCompleted && !isCurrent && 'bg-muted/50'
                  )}
                >
                  {isCompleted ? (
                    <CircleCheck className="w-4 h-4 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className={cn(
                    'text-sm',
                    isCompleted && 'text-green-600',
                    isCurrent && 'text-primary font-medium',
                    !isCompleted && !isCurrent && 'text-muted-foreground'
                  )}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
