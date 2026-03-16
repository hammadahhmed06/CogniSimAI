import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  Loader2,
  Save,
  X,
  Plus,
  Trash2,
  Eye,
  Pencil,
} from 'lucide-react'

import type { PRDDocument } from './prd-types'
import { PRDSectionRenderer } from './PRDSectionRenderer'

interface PRDSectionEditorProps {
  section: string
  document: PRDDocument
  onSave: (section: string, content: unknown) => Promise<void>
  onCancel: () => void
}

export function PRDSectionEditor({ section, document, onSave, onCancel }: PRDSectionEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleSave = useCallback(async (data: unknown) => {
    setIsSaving(true)
    try {
      await onSave(section, data)
    } finally {
      setIsSaving(false)
    }
  }, [section, onSave])

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Editing</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <><Pencil className="w-3.5 h-3.5 mr-1" /> Edit</>
            ) : (
              <><Eye className="w-3.5 h-3.5 mr-1" /> Preview</>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {showPreview ? (
        <PRDSectionRenderer section={section} document={document} />
      ) : (
        <SectionForm
          section={section}
          document={document}
          onSave={handleSave}
          isSaving={isSaving}
        />
      )}

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
        {/* Save is triggered by the form's own save — this is just a visual anchor */}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURED SECTION FORMS
// ═══════════════════════════════════════════════════════════════════════════════

interface SectionFormProps {
  section: string
  document: PRDDocument
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}

function SectionForm({ section, document, onSave, isSaving }: SectionFormProps) {
  switch (section) {
    case 'executive_summary':
      return <ExecutiveSummaryForm data={document.executive_summary} onSave={onSave} isSaving={isSaving} />
    case 'user_personas':
      return <PersonasForm data={document.user_personas} onSave={onSave} isSaving={isSaving} />
    case 'feature_specifications':
      return <FeaturesForm data={document.feature_specifications} onSave={onSave} isSaving={isSaving} />
    case 'technical_requirements':
      return <TechnicalForm data={document.technical_requirements} onSave={onSave} isSaving={isSaving} />
    case 'risks_and_mitigations':
      return <RisksForm data={document.risks_and_mitigations} onSave={onSave} isSaving={isSaving} />
    case 'timeline_and_phases':
      return <TimelineForm data={document.timeline_and_phases} onSave={onSave} isSaving={isSaving} />
    default:
      return <p className="text-muted-foreground">No editor available for this section.</p>
  }
}

// ─── Save Button ─────────────────────────────────────────────────────────────

function SaveButton({ onClick, isSaving }: { onClick: () => void; isSaving: boolean }) {
  return (
    <Button onClick={onClick} disabled={isSaving} className="mt-4">
      {isSaving ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Save className="w-4 h-4 mr-2" />
      )}
      Save Changes
    </Button>
  )
}

// ─── Executive Summary ───────────────────────────────────────────────────────

function ExecutiveSummaryForm({
  data,
  onSave,
  isSaving,
}: {
  data: PRDDocument['executive_summary']
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}) {
  const [form, setForm] = useState({ ...data })

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Problem Statement</Label>
        <Textarea
          value={form.problem_statement}
          onChange={(e) => updateField('problem_statement', e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>Proposed Solution</Label>
        <Textarea
          value={form.proposed_solution}
          onChange={(e) => updateField('proposed_solution', e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>Target Audience</Label>
        <Input
          value={form.target_audience}
          onChange={(e) => updateField('target_audience', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>Key Benefits (one per line)</Label>
        <Textarea
          value={form.key_benefits?.join('\n') || ''}
          onChange={(e) => updateField('key_benefits', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>In Scope (one per line)</Label>
          <Textarea
            value={form.scope?.in_scope?.join('\n') || ''}
            onChange={(e) => updateField('scope', { ...form.scope, in_scope: e.target.value.split('\n').filter(Boolean) })}
            rows={3}
            className="resize-none"
          />
        </div>
        <div className="space-y-2">
          <Label>Out of Scope (one per line)</Label>
          <Textarea
            value={form.scope?.out_of_scope?.join('\n') || ''}
            onChange={(e) => updateField('scope', { ...form.scope, out_of_scope: e.target.value.split('\n').filter(Boolean) })}
            rows={3}
            className="resize-none"
          />
        </div>
      </div>
      <SaveButton onClick={() => onSave(form)} isSaving={isSaving} />
    </div>
  )
}

// ─── User Personas ───────────────────────────────────────────────────────────

function PersonasForm({
  data,
  onSave,
  isSaving,
}: {
  data: PRDDocument['user_personas']
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}) {
  const [personas, setPersonas] = useState([...(data || [])])

  const updatePersona = (index: number, field: string, value: unknown) => {
    setPersonas(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const addPersona = () => {
    setPersonas(prev => [...prev, { name: '', role: '', pain_points: [], goals: [], behaviors: [] }])
  }

  const removePersona = (index: number) => {
    setPersonas(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {personas.map((persona, i) => (
        <Card key={i} className="border-l-4 border-l-primary/40">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Persona {i + 1}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePersona(i)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={persona.name} onChange={(e) => updatePersona(i, 'name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <Input value={persona.role} onChange={(e) => updatePersona(i, 'role', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Pain Points (one per line)</Label>
              <Textarea
                value={persona.pain_points?.join('\n') || ''}
                onChange={(e) => updatePersona(i, 'pain_points', e.target.value.split('\n').filter(Boolean))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Goals (one per line)</Label>
              <Textarea
                value={persona.goals?.join('\n') || ''}
                onChange={(e) => updatePersona(i, 'goals', e.target.value.split('\n').filter(Boolean))}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addPersona}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Persona
      </Button>
      <SaveButton onClick={() => onSave(personas)} isSaving={isSaving} />
    </div>
  )
}

// ─── Feature Specifications ──────────────────────────────────────────────────

function FeaturesForm({
  data,
  onSave,
  isSaving,
}: {
  data: PRDDocument['feature_specifications']
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}) {
  const [features, setFeatures] = useState([...(data || [])])

  const updateFeature = (index: number, field: string, value: unknown) => {
    setFeatures(prev => prev.map((f, i) => i === index ? { ...f, [field]: value } : f))
  }

  const addFeature = () => {
    setFeatures(prev => [...prev, {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      user_story: '',
      acceptance_criteria: [],
      priority: 'medium' as const,
    }])
  }

  const removeFeature = (index: number) => {
    setFeatures(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {features.map((feature, i) => (
        <Card key={i}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Feature {i + 1}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFeature(i)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={feature.name} onChange={(e) => updateFeature(i, 'name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Priority</Label>
                <Select
                  value={feature.priority}
                  onValueChange={(v) => updateFeature(i, 'priority', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={feature.description}
                onChange={(e) => updateFeature(i, 'description', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">User Story</Label>
              <Textarea
                value={feature.user_story}
                onChange={(e) => updateFeature(i, 'user_story', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addFeature}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Feature
      </Button>
      <SaveButton onClick={() => onSave(features)} isSaving={isSaving} />
    </div>
  )
}

// ─── Technical Requirements ──────────────────────────────────────────────────

function TechnicalForm({
  data,
  onSave,
  isSaving,
}: {
  data: PRDDocument['technical_requirements']
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}) {
  const [form, setForm] = useState({ ...data })

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Architecture Overview</Label>
        <Textarea
          value={form.architecture_overview}
          onChange={(e) => updateField('architecture_overview', e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>API Specifications (one per line)</Label>
        <Textarea
          value={form.api_specifications?.join('\n') || ''}
          onChange={(e) => updateField('api_specifications', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>Security Requirements (one per line)</Label>
        <Textarea
          value={form.security_requirements?.join('\n') || ''}
          onChange={(e) => updateField('security_requirements', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="resize-none"
        />
      </div>
      <div className="space-y-2">
        <Label>Performance Requirements (one per line)</Label>
        <Textarea
          value={form.performance_requirements?.join('\n') || ''}
          onChange={(e) => updateField('performance_requirements', e.target.value.split('\n').filter(Boolean))}
          rows={3}
          className="resize-none"
        />
      </div>
      <SaveButton onClick={() => onSave(form)} isSaving={isSaving} />
    </div>
  )
}

// ─── Risks & Mitigations ────────────────────────────────────────────────────

function RisksForm({
  data,
  onSave,
  isSaving,
}: {
  data: PRDDocument['risks_and_mitigations']
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}) {
  const [risks, setRisks] = useState([...(data || [])])

  const updateRisk = (index: number, field: string, value: unknown) => {
    setRisks(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  const addRisk = () => {
    setRisks(prev => [...prev, {
      id: crypto.randomUUID(),
      title: '',
      description: '',
      category: '',
      level: 'medium' as const,
      probability: 'Medium',
      impact: 'Medium',
      mitigation: '',
    }])
  }

  const removeRisk = (index: number) => {
    setRisks(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-4">
      {risks.map((risk, i) => (
        <Card key={i} className={cn(
          'border-l-4',
          risk.level === 'critical' && 'border-l-red-500',
          risk.level === 'high' && 'border-l-orange-500',
          risk.level === 'medium' && 'border-l-yellow-500',
          risk.level === 'low' && 'border-l-green-500'
        )}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Risk {i + 1}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRisk(i)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Title</Label>
                <Input value={risk.title} onChange={(e) => updateRisk(i, 'title', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Level</Label>
                <Select value={risk.level} onValueChange={(v) => updateRisk(i, 'level', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={risk.description}
                onChange={(e) => updateRisk(i, 'description', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mitigation</Label>
              <Textarea
                value={risk.mitigation}
                onChange={(e) => updateRisk(i, 'mitigation', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addRisk}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Risk
      </Button>
      <SaveButton onClick={() => onSave(risks)} isSaving={isSaving} />
    </div>
  )
}

// ─── Timeline & Phases ──────────────────────────────────────────────────────

function TimelineForm({
  data,
  onSave,
  isSaving,
}: {
  data: PRDDocument['timeline_and_phases']
  onSave: (data: unknown) => Promise<void>
  isSaving: boolean
}) {
  const [phases, setPhases] = useState([...(data || [])])

  const updatePhase = (index: number, field: string, value: unknown) => {
    setPhases(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p))
  }

  const addPhase = () => {
    setPhases(prev => [...prev, {
      phase_number: prev.length + 1,
      name: '',
      description: '',
      duration: '',
      deliverables: [],
      milestones: [],
    }])
  }

  const removePhase = (index: number) => {
    setPhases(prev => prev.filter((_, i) => i !== index).map((p, i) => ({ ...p, phase_number: i + 1 })))
  }

  return (
    <div className="space-y-4">
      {phases.map((phase, i) => (
        <Card key={i}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Phase {phase.phase_number}</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePhase(i)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Name</Label>
                <Input value={phase.name} onChange={(e) => updatePhase(i, 'name', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration</Label>
                <Input value={phase.duration} onChange={(e) => updatePhase(i, 'duration', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                value={phase.description}
                onChange={(e) => updatePhase(i, 'description', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Deliverables (one per line)</Label>
              <Textarea
                value={phase.deliverables?.join('\n') || ''}
                onChange={(e) => updatePhase(i, 'deliverables', e.target.value.split('\n').filter(Boolean))}
                rows={2}
                className="resize-none"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Milestones (one per line)</Label>
              <Textarea
                value={phase.milestones?.join('\n') || ''}
                onChange={(e) => updatePhase(i, 'milestones', e.target.value.split('\n').filter(Boolean))}
                rows={2}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={addPhase}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Phase
      </Button>
      <SaveButton onClick={() => onSave(phases)} isSaving={isSaving} />
    </div>
  )
}
