import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Users,
  Target,
  Shield,
  Clock,
  CheckCircle2,
  TriangleAlert,
} from 'lucide-react'

import type { PRDDocument } from './prd-types'
import { PRIORITY_COLORS } from './prd-types'

interface PRDSectionRendererProps {
  section: string
  document: PRDDocument
}

export function PRDSectionRenderer({ section, document: doc }: PRDSectionRendererProps) {
  switch (section) {
    case 'executive_summary':
      return <ExecutiveSummarySection summary={doc.executive_summary} />
    case 'user_personas':
      return <PersonasSection personas={doc.user_personas} />
    case 'feature_specifications':
      return <FeaturesSection features={doc.feature_specifications} />
    case 'technical_requirements':
      return <TechnicalSection tech={doc.technical_requirements} />
    case 'risks_and_mitigations':
      return <RisksSection risks={doc.risks_and_mitigations} />
    case 'timeline_and_phases':
      return <TimelineSection phases={doc.timeline_and_phases} />
    default:
      return <p className="text-muted-foreground">Select a section to view</p>
  }
}

// ─── Executive Summary ───────────────────────────────────────────────────────

function ExecutiveSummarySection({ summary }: { summary: PRDDocument['executive_summary'] }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-2">Problem Statement</h4>
        <p className="text-muted-foreground leading-relaxed">{summary?.problem_statement}</p>
      </div>
      <div>
        <h4 className="font-medium mb-2">Proposed Solution</h4>
        <p className="text-muted-foreground leading-relaxed">{summary?.proposed_solution}</p>
      </div>
      <div>
        <h4 className="font-medium mb-2">Key Benefits</h4>
        <ul className="list-disc list-inside text-muted-foreground space-y-1">
          {summary?.key_benefits?.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      </div>
      {summary?.success_metrics?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Success Metrics</h4>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            {summary.success_metrics.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-medium mb-2">In Scope</h4>
          <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
            {summary?.scope?.in_scope?.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-medium mb-2">Out of Scope</h4>
          <ul className="list-disc list-inside text-muted-foreground text-sm space-y-1">
            {summary?.scope?.out_of_scope?.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ─── User Personas ───────────────────────────────────────────────────────────

function PersonasSection({ personas }: { personas: PRDDocument['user_personas'] }) {
  return (
    <div className="space-y-6">
      {personas?.map((persona, i) => (
        <Card key={i} className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              {persona.name}
            </CardTitle>
            <CardDescription>{persona.role}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h5 className="text-sm font-medium text-red-500 mb-1">Pain Points</h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                {persona.pain_points?.map((p, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <TriangleAlert className="w-3 h-3 mt-1 text-red-400 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h5 className="text-sm font-medium text-green-500 mb-1">Goals</h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                {persona.goals?.map((g, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Target className="w-3 h-3 mt-1 text-green-400 shrink-0" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
            {persona.behaviors?.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-blue-500 mb-1">Behaviors</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {persona.behaviors.map((b, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3 h-3 mt-1 text-blue-400 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Feature Specifications ──────────────────────────────────────────────────

function FeaturesSection({ features }: { features: PRDDocument['feature_specifications'] }) {
  return (
    <div className="space-y-4">
      {features?.map((feature, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{feature.name}</CardTitle>
              <div className="flex items-center gap-2">
                {feature.estimated_effort && (
                  <Badge variant="outline" className="text-xs">
                    {feature.estimated_effort}
                  </Badge>
                )}
                <Badge className={PRIORITY_COLORS[feature.priority]}>
                  {feature.priority}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{feature.description}</p>
            {feature.user_story && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm italic">&ldquo;{feature.user_story}&rdquo;</p>
              </div>
            )}
            {feature.acceptance_criteria?.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Acceptance Criteria</h5>
                <div className="space-y-2">
                  {feature.acceptance_criteria.map((ac, j) => (
                    <div key={j} className="text-sm p-2 bg-muted/50 rounded border border-border/50">
                      {ac.given && <p><strong>Given</strong> {ac.given}</p>}
                      {ac.when && <p><strong>When</strong> {ac.when}</p>}
                      <p><strong>Then</strong> {ac.then}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {feature.dependencies && feature.dependencies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-muted-foreground">Dependencies:</span>
                {feature.dependencies.map((d, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Technical Requirements ──────────────────────────────────────────────────

function TechnicalSection({ tech }: { tech: PRDDocument['technical_requirements'] }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-medium mb-2">Architecture Overview</h4>
        <p className="text-muted-foreground leading-relaxed">{tech?.architecture_overview}</p>
      </div>
      {tech?.api_specifications?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">API Specifications</h4>
          <ul className="space-y-1">
            {tech.api_specifications.map((api, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <code className="px-1.5 py-0.5 bg-muted rounded text-xs">{api}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tech?.data_models?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Data Models</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {tech.data_models.map((dm, i) => <li key={i}>{dm}</li>)}
          </ul>
        </div>
      )}
      {tech?.integrations?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Integrations</h4>
          <div className="flex flex-wrap gap-2">
            {tech.integrations.map((intg, i) => (
              <Badge key={i} variant="secondary">{intg}</Badge>
            ))}
          </div>
        </div>
      )}
      {tech?.security_requirements?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Security Requirements
          </h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {tech.security_requirements.map((req, i) => <li key={i}>{req}</li>)}
          </ul>
        </div>
      )}
      {tech?.performance_requirements?.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Performance Requirements</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {tech.performance_requirements.map((req, i) => <li key={i}>{req}</li>)}
          </ul>
        </div>
      )}
      {tech?.scalability_requirements && tech.scalability_requirements.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Scalability</h4>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
            {tech.scalability_requirements.map((req, i) => <li key={i}>{req}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Risks & Mitigations ────────────────────────────────────────────────────

function RisksSection({ risks }: { risks: PRDDocument['risks_and_mitigations'] }) {
  return (
    <div className="space-y-4">
      {risks?.map((risk, i) => (
        <Card key={i} className={cn(
          'border-l-4',
          risk.level === 'critical' && 'border-l-red-500',
          risk.level === 'high' && 'border-l-orange-500',
          risk.level === 'medium' && 'border-l-yellow-500',
          risk.level === 'low' && 'border-l-green-500'
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{risk.title}</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">{risk.category}</Badge>
                <Badge className={PRIORITY_COLORS[risk.level]}>{risk.level}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{risk.description}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <span className="text-xs text-muted-foreground">Probability</span>
                <p className="font-medium">{risk.probability}</p>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <span className="text-xs text-muted-foreground">Impact</span>
                <p className="font-medium">{risk.impact}</p>
              </div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <h5 className="text-sm font-medium text-green-600 mb-1">Mitigation Strategy</h5>
              <p className="text-sm">{risk.mitigation}</p>
            </div>
            {risk.contingency && (
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <h5 className="text-sm font-medium text-blue-600 mb-1">Contingency Plan</h5>
                <p className="text-sm">{risk.contingency}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Timeline & Phases ──────────────────────────────────────────────────────

function TimelineSection({ phases }: { phases: PRDDocument['timeline_and_phases'] }) {
  return (
    <div className="space-y-4">
      {phases?.map((phase, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {phase.phase_number}
                </div>
                {phase.name}
              </CardTitle>
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {phase.duration}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {phase.description && (
              <p className="text-sm text-muted-foreground">{phase.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h5 className="text-sm font-medium mb-2">Deliverables</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {phase.deliverables?.map((d, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h5 className="text-sm font-medium mb-2">Milestones</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {phase.milestones?.map((m, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Target className="w-3 h-3 text-primary shrink-0" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            {phase.dependencies && phase.dependencies.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-xs text-muted-foreground">Dependencies:</span>
                {phase.dependencies.map((d, j) => (
                  <Badge key={j} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
