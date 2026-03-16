// ═══════════════════════════════════════════════════════════════════════════════
// PRD Shared Types — Used across all PRD components
// ═══════════════════════════════════════════════════════════════════════════════

import type { ComponentType } from 'react'

export interface PRDInput {
  problem_statement: string
  target_users: string
  success_metrics?: string
  constraints?: string
  jira_epic_key?: string
  slack_channel_id?: string
  template_version?: string
}

export interface UserPersona {
  name: string
  role: string
  pain_points: string[]
  goals: string[]
  behaviors: string[]
}

export interface AcceptanceCriteria {
  given: string
  when: string
  then: string
}

export interface FeatureSpec {
  id: string
  name: string
  description: string
  user_story: string
  acceptance_criteria: AcceptanceCriteria[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  estimated_effort?: string
  dependencies?: string[]
}

export interface TechnicalRequirements {
  architecture_overview: string
  api_specifications: string[]
  data_models: string[]
  integrations: string[]
  security_requirements: string[]
  performance_requirements: string[]
  scalability_requirements?: string[]
}

export interface RiskItem {
  id: string
  title: string
  description: string
  category: string
  level: 'critical' | 'high' | 'medium' | 'low'
  probability: string
  impact: string
  mitigation: string
  owner?: string
  contingency?: string
}

export interface TimelinePhase {
  phase_number: number
  name: string
  description: string
  duration: string
  deliverables: string[]
  milestones: string[]
  dependencies?: string[]
}

export interface CoherenceIssue {
  section: string
  issue: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  suggestion: string
}

export interface CoherenceReview {
  issues: CoherenceIssue[]
  overall_score: number
  recommendations: string[]
}

export interface ExecutiveSummary {
  problem_statement: string
  proposed_solution: string
  target_audience: string
  key_benefits: string[]
  success_metrics: string[]
  scope: { in_scope: string[]; out_of_scope: string[] }
}

export interface PRDDocument {
  id: string
  title: string
  status: 'draft' | 'in_review' | 'changes_requested' | 'approved' | 'archived'
  executive_summary: ExecutiveSummary
  user_personas: UserPersona[]
  feature_specifications: FeatureSpec[]
  technical_requirements: TechnicalRequirements
  risks_and_mitigations: RiskItem[]
  timeline_and_phases: TimelinePhase[]
  coherence_review: CoherenceReview
  generation_time_ms?: number
  tokens_used?: number
}

export interface StreamEvent {
  type:
    | 'progress'
    | 'section_start'
    | 'section_complete'
    | 'complete'
    | 'saved'
    | 'run_created'
    | 'context_complete'
    | 'result'
    | 'error'
  section?: string
  data?: Record<string, unknown>
  message?: string
  percent?: number
  stage?: string
  error?: string
  prd_id?: string
  run_id?: string
}

// Wizard Steps
export type WizardStep = 'input' | 'generating' | 'review' | 'export'

export interface SectionConfig {
  label: string
  icon: ComponentType<{ className?: string }>
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

export const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  low: 'bg-green-500/10 text-green-500 border-green-500/20',
}

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  generating: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  in_review: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  changes_requested: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  approved: 'bg-green-500/10 text-green-500 border-green-500/20',
  archived: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  generating: 'Generating',
  in_review: 'In Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  archived: 'Archived',
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOCAL STORAGE DRAFT HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const DRAFT_KEY = 'prd_generator_draft'

export const saveDraft = (input: PRDInput) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...input, savedAt: Date.now() }))
  } catch (e) {
    console.error('Failed to save draft:', e)
  }
}

export const loadDraft = (): PRDInput | null => {
  try {
    const saved = localStorage.getItem(DRAFT_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (parsed.savedAt && Date.now() - parsed.savedAt > 7 * 24 * 60 * 60 * 1000) {
        localStorage.removeItem(DRAFT_KEY)
        return null
      }
      return parsed
    }
  } catch (e) {
    console.error('Failed to load draft:', e)
  }
  return null
}

export const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION MAPPING & ADAPTATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

type UnknownRecord = Record<string, unknown>

export const isRecord = (value: unknown): value is UnknownRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export const toStringSafe = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return fallback
  return String(value)
}

export const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.map(v => toStringSafe(v)).filter(Boolean)
}

/** Map backend section IDs to UI section keys */
export const mapBackendSectionToUiSection = (section?: string): string | null => {
  if (!section) return null
  switch (section) {
    case 'executive_summary':
      return 'executive_summary'
    case 'personas':
      return 'user_personas'
    case 'features':
      return 'feature_specifications'
    case 'technical':
      return 'technical_requirements'
    case 'risks':
      return 'risks_and_mitigations'
    case 'timeline':
      return 'timeline_and_phases'
    default:
      return section
  }
}

/** Convert backend PRD shape (sections-based) to the UI PRDDocument shape */
export const adaptBackendPrdToUi = (backend: unknown, input: PRDInput, savedId?: string): PRDDocument => {
  const backendRec: UnknownRecord = isRecord(backend) ? backend : {}
  const sections: UnknownRecord = isRecord(backendRec.sections) ? (backendRec.sections as UnknownRecord) : {}

  const exec: UnknownRecord | null = isRecord(sections.executive_summary) ? (sections.executive_summary as UnknownRecord) : null
  const personas: unknown[] = Array.isArray(sections.personas) ? (sections.personas as unknown[]) : []
  const features: unknown[] = Array.isArray(sections.features) ? (sections.features as unknown[]) : []
  const technical: UnknownRecord | null = isRecord(sections.technical) ? (sections.technical as UnknownRecord) : null
  const risks: unknown[] = Array.isArray(sections.risks) ? (sections.risks as unknown[]) : []
  const timeline: unknown[] = Array.isArray(sections.timeline) ? (sections.timeline as unknown[]) : []

  const successMetrics: string[] = exec && Array.isArray(exec.success_metrics)
    ? (exec.success_metrics as unknown[]).map((m) => {
        const mRec: UnknownRecord = isRecord(m) ? m : {}
        const name = toStringSafe(mRec.name, 'Metric')
        const target = mRec.target ? `: ${toStringSafe(mRec.target)}` : ''
        const measurement = mRec.measurement ? ` (${toStringSafe(mRec.measurement)})` : ''
        return `${name}${target}${measurement}`
      })
    : []

  const inScope: string[] = features
    .map((f) => {
      const fRec: UnknownRecord = isRecord(f) ? f : {}
      return toStringSafe(fRec.title)
    })
    .filter(Boolean)

  const outOfScope: string[] = features
    .flatMap((f) => {
      const fRec: UnknownRecord = isRecord(f) ? f : {}
      const oos = fRec.out_of_scope
      if (Array.isArray(oos)) return toStringArray(oos)
      if (oos) return [toStringSafe(oos)].filter(Boolean)
      return []
    })
    .filter(Boolean)

  const statusRaw = toStringSafe(backendRec.status, 'draft')
  const status: PRDDocument['status'] =
    statusRaw === 'draft' || statusRaw === 'in_review' || statusRaw === 'approved' || statusRaw === 'archived' || statusRaw === 'changes_requested'
      ? statusRaw
      : 'draft'

  return {
    id: savedId || toStringSafe(backendRec.id),
    title: toStringSafe(backendRec.title) || `PRD: ${input.problem_statement.slice(0, 50)}`,
    status,
    executive_summary: {
      problem_statement: toStringSafe(exec?.problem_statement, input.problem_statement),
      proposed_solution: toStringSafe(exec?.solution_overview),
      target_audience: input.target_users,
      key_benefits: toStringArray(exec?.key_objectives),
      success_metrics: successMetrics,
      scope: {
        in_scope: inScope,
        out_of_scope: outOfScope,
      },
    },
    user_personas: personas.map((p) => {
      const pRec: UnknownRecord = isRecord(p) ? p : {}
      return {
        name: toStringSafe(pRec.name, 'Persona'),
        role: toStringSafe(pRec.role),
        pain_points: toStringArray(pRec.pain_points),
        goals: toStringArray(pRec.goals),
        behaviors: toStringArray(pRec.use_cases),
      }
    }),
    feature_specifications: features.map((f) => {
      const fRec: UnknownRecord = isRecord(f) ? f : {}
      const priorityRaw = toStringSafe(fRec.priority)
      const priority: FeatureSpec['priority'] =
        priorityRaw === 'P0'
          ? 'critical'
          : priorityRaw === 'P1'
            ? 'high'
            : priorityRaw === 'P2'
              ? 'medium'
              : 'low'

      const acceptanceCriteriaRaw = Array.isArray(fRec.acceptance_criteria) ? (fRec.acceptance_criteria as unknown[]) : []
      const acceptance_criteria: AcceptanceCriteria[] = acceptanceCriteriaRaw.map((ac) => {
        if (typeof ac === 'string') {
          return { given: '', when: '', then: ac }
        }
        if (isRecord(ac)) {
          const thenText =
            toStringSafe(ac.then) ||
            toStringSafe(ac.text) ||
            toStringSafe(ac.criterion) ||
            (() => {
              try {
                return JSON.stringify(ac)
              } catch {
                return ''
              }
            })()
          return { given: '', when: '', then: thenText }
        }
        return { given: '', when: '', then: toStringSafe(ac) }
      })

      return {
        id: toStringSafe(fRec.id),
        name: toStringSafe(fRec.title),
        description: toStringSafe(fRec.description),
        user_story: fRec.user_value
          ? `As a user, I want ${toStringSafe(fRec.title)} so that ${toStringSafe(fRec.user_value)}`
          : '',
        acceptance_criteria,
        priority,
        estimated_effort: typeof fRec.estimated_effort === 'string' ? fRec.estimated_effort : undefined,
        dependencies: toStringArray(fRec.dependencies),
      }
    }),
    technical_requirements: {
      architecture_overview: toStringSafe(technical?.architecture_overview),
      api_specifications: Array.isArray(technical?.api_specifications)
        ? toStringArray(technical?.api_specifications)
        : technical?.api_specifications
          ? [toStringSafe(technical.api_specifications)].filter(Boolean)
          : [],
      data_models: toStringArray(technical?.data_requirements),
      integrations: Array.isArray(technical?.integrations)
        ? (technical?.integrations as unknown[])
            .map((i) => {
              if (typeof i === 'string') return i
              if (isRecord(i)) return toStringSafe(i.name)
              return ''
            })
            .filter(Boolean)
        : [],
      security_requirements: toStringArray(technical?.security_requirements),
      performance_requirements: toStringArray(technical?.performance_requirements),
      scalability_requirements: toStringArray(technical?.scalability_considerations),
    },
    risks_and_mitigations: risks.map((r) => {
      const rRec: UnknownRecord = isRecord(r) ? r : {}
      const probability = toStringSafe(rRec.probability)
      const impact = toStringSafe(rRec.impact)
      const level: RiskItem['level'] =
        probability === 'High' || impact === 'High'
          ? 'high'
          : probability === 'Medium' || impact === 'Medium'
            ? 'medium'
            : 'low'
      return {
        id: toStringSafe(rRec.id),
        title: toStringSafe(rRec.title),
        description: toStringSafe(rRec.description),
        category: toStringSafe(rRec.category),
        level,
        probability,
        impact,
        mitigation: toStringSafe(rRec.mitigation),
        owner: typeof rRec.owner === 'string' ? rRec.owner : undefined,
        contingency: typeof rRec.contingency === 'string' ? rRec.contingency : undefined,
      }
    }),
    timeline_and_phases: timeline.map((t, idx) => {
      const tRec: UnknownRecord = isRecord(t) ? t : {}
      const objectives = Array.isArray(tRec.objectives) ? (tRec.objectives as unknown[]).map(o => toStringSafe(o)).filter(Boolean) : []
      return {
        phase_number: idx + 1,
        name: toStringSafe(tRec.phase, `Phase ${idx + 1}`),
        description: objectives.length > 0 ? objectives.join('\n') : '',
        duration: toStringSafe(tRec.duration),
        deliverables: toStringArray(tRec.deliverables),
        milestones: toStringArray(tRec.milestones),
        dependencies: toStringArray(tRec.dependencies),
      }
    }),
    coherence_review: {
      issues: [],
      overall_score: typeof backendRec.quality_score === 'number' ? (backendRec.quality_score as number) : 0,
      recommendations: [],
    },
    generation_time_ms: typeof backendRec.generation_time_ms === 'number' ? (backendRec.generation_time_ms as number) : undefined,
    tokens_used: typeof backendRec.tokens_used === 'number' ? (backendRec.tokens_used as number) : undefined,
  }
}

/** Generate markdown from a PRD document */
export const generateMarkdown = (doc: PRDDocument): string => {
  let md = `# ${doc.title}\n\n`
  md += `**Status:** ${doc.status}\n\n`

  if (doc.executive_summary) {
    md += `## Executive Summary\n\n`
    md += `### Problem Statement\n${doc.executive_summary.problem_statement}\n\n`
    md += `### Proposed Solution\n${doc.executive_summary.proposed_solution}\n\n`
    md += `### Target Audience\n${doc.executive_summary.target_audience}\n\n`
    md += `### Key Benefits\n${doc.executive_summary.key_benefits?.map(b => `- ${b}`).join('\n')}\n\n`
  }

  if (doc.user_personas?.length) {
    md += `## User Personas\n\n`
    doc.user_personas.forEach((p, i) => {
      md += `### ${i + 1}. ${p.name} (${p.role})\n`
      md += `**Pain Points:** ${p.pain_points?.join(', ')}\n`
      md += `**Goals:** ${p.goals?.join(', ')}\n\n`
    })
  }

  if (doc.feature_specifications?.length) {
    md += `## Feature Specifications\n\n`
    doc.feature_specifications.forEach((f, i) => {
      md += `### ${i + 1}. ${f.name}\n`
      md += `${f.description}\n\n`
      md += `**Priority:** ${f.priority}\n`
      md += `**User Story:** ${f.user_story}\n\n`
    })
  }

  if (doc.technical_requirements) {
    md += `## Technical Requirements\n\n`
    md += `### Architecture\n${doc.technical_requirements.architecture_overview}\n\n`
  }

  if (doc.risks_and_mitigations?.length) {
    md += `## Risks & Mitigations\n\n`
    doc.risks_and_mitigations.forEach((r, i) => {
      md += `### ${i + 1}. ${r.title}\n`
      md += `**Level:** ${r.level} | **Category:** ${r.category}\n`
      md += `**Mitigation:** ${r.mitigation}\n\n`
    })
  }

  if (doc.timeline_and_phases?.length) {
    md += `## Timeline & Phases\n\n`
    doc.timeline_and_phases.forEach(p => {
      md += `### Phase ${p.phase_number}: ${p.name}\n`
      md += `**Duration:** ${p.duration}\n`
      md += `**Deliverables:** ${p.deliverables?.join(', ')}\n\n`
    })
  }

  return md
}
