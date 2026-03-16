import { cn } from '@/lib/utils'
import { Check, ChevronRight, Edit3, Eye, FileDown, Zap } from 'lucide-react'

import type { WizardStep } from './prd-types'

const STEPS = [
  { key: 'input' as const, label: 'Input', icon: Edit3 },
  { key: 'generating' as const, label: 'Generating', icon: Zap },
  { key: 'review' as const, label: 'Review', icon: Eye },
  { key: 'export' as const, label: 'Export', icon: FileDown },
]

interface PRDStepIndicatorProps {
  currentStep: WizardStep
}

export function PRDStepIndicator({ currentStep }: PRDStepIndicatorProps) {
  const currentIndex = STEPS.findIndex(s => s.key === currentStep)

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((s, i) => {
        const isActive = s.key === currentStep
        const isCompleted = currentIndex > i
        const Icon = s.icon

        return (
          <div key={s.key} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full transition-all',
                isActive && 'bg-primary text-primary-foreground',
                isCompleted && 'bg-primary/20 text-primary',
                !isActive && !isCompleted && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-2 text-muted-foreground" />
            )}
          </div>
        )
      })}
    </div>
  )
}
