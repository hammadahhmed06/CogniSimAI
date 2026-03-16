import { FormEvent, useEffect, useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '@/components/DashboardLayout'
import { toast } from 'sonner'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { prdService } from '@/lib/api/prdService'

import {
  PRDInputForm,
  PRDProgressView,
  PRDReviewPanel,
  PRDExportPanel,
  PRDStepIndicator,
  saveDraft,
  loadDraft,
  clearDraft,
  adaptBackendPrdToUi,
  mapBackendSectionToUiSection,
  generateMarkdown,
  isRecord,
} from '@/components/prd'

import type { PRDInput, PRDDocument, WizardStep } from '@/components/prd'

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION LABELS (for regeneration toasts)
// ═══════════════════════════════════════════════════════════════════════════════

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  user_personas: 'User Personas',
  feature_specifications: 'Feature Specifications',
  technical_requirements: 'Technical Requirements',
  risks_and_mitigations: 'Risks & Mitigations',
  timeline_and_phases: 'Timeline & Phases',
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function PRDGeneratorPage() {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('input')

  // Input form state
  const [input, setInput] = useState<PRDInput>({
    problem_statement: '',
    target_users: '',
    success_metrics: '',
    constraints: '',
  })

  // Context source toggles
  const [useJira, setUseJira] = useState(false)
  const [useSlack, setUseSlack] = useState(false)

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState<{ message: string; percent: number; stage: string } | null>(null)
  const [sectionsCompleted, setSectionsCompleted] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Result state
  const [prdDocument, setPrdDocument] = useState<PRDDocument | null>(null)
  const [activeSection, setActiveSection] = useState<string>('executive_summary')

  // Section editing
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null)
  const [sectionFeedback, setSectionFeedback] = useState<Record<string, string>>({})

  // Export state
  const [isExporting, setIsExporting] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const { activeWorkspaceId } = useWorkspace()

  // ─────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ─────────────────────────────────────────────────────────────────────────

  // Load draft on mount
  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setInput(draft)
      toast.info('Restored your previous draft')
    }
  }, [])

  // Auto-save draft
  useEffect(() => {
    if (input.problem_statement || input.target_users) {
      const timer = setTimeout(() => saveDraft(input), 2000)
      return () => clearTimeout(timer)
    }
  }, [input])

  // ─────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────────────────────────────────

  const handleInputChange = useCallback((field: keyof PRDInput, value: string) => {
    setInput(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleGenerate = async (event?: FormEvent) => {
    event?.preventDefault()

    if (!input.problem_statement.trim()) {
      toast.error("Please describe the problem you're solving")
      return
    }

    if (!input.target_users.trim()) {
      toast.error('Please describe your target users')
      return
    }

    setIsGenerating(true)
    setStep('generating')
    setError(null)
    setSectionsCompleted(new Set())
    setPrdDocument(null)
    setProgress({ message: 'Initializing PRD generation...', percent: 0, stage: 'init' })

    try {
      const requestInput: PRDInput = {
        ...input,
        ...(useJira && input.jira_epic_key && { jira_epic_key: input.jira_epic_key }),
        ...(useSlack && input.slack_channel_id && { slack_channel_id: input.slack_channel_id }),
      }

      await prdService.generateStream(requestInput, (event) => {
        if (event.type === 'progress') {
          setProgress({
            message: event.message || '',
            percent: event.percent || 0,
            stage: event.stage || 'init',
          })
        } else if (event.type === 'section_start') {
          setProgress({
            message: event.message || '',
            percent: event.percent || 0,
            stage: event.stage || 'generating',
          })
        } else if (event.type === 'section_complete' && event.section) {
          const uiSection = mapBackendSectionToUiSection(event.section)
          if (uiSection) setSectionsCompleted(prev => new Set([...prev, uiSection]))
        } else if (event.type === 'saved') {
          const savedId = event.prd_id
          if (savedId) {
            setPrdDocument(prev => (prev ? { ...prev, id: savedId } : prev))
          }
        } else if (event.type === 'complete') {
          const backendPrd = event.data && isRecord(event.data) ? event.data.prd : undefined
          if (backendPrd) {
            setPrdDocument(prev => {
              const existingId = prev?.id
              return adaptBackendPrdToUi(backendPrd, input, existingId)
            })
            clearDraft()
            setStep('review')
            toast.success('PRD generated successfully!')
          }
        } else if (event.type === 'result') {
          const result = event.data as { prd: PRDDocument }
          if (result?.prd) {
            setPrdDocument(result.prd)
            clearDraft()
            setStep('review')
            toast.success('PRD generated successfully!')
          }
        } else if (event.type === 'error') {
          setError(event.error || 'Generation failed')
          toast.error(event.error || 'Generation failed')
          setStep('input')
        }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate PRD'
      setError(message)
      toast.error(message)
      setStep('input')
    } finally {
      setIsGenerating(false)
      setProgress(null)
    }
  }

  const handleRegenerateSection = async (section: string) => {
    if (!prdDocument?.id) {
      toast.error('No PRD document available')
      return
    }

    setRegeneratingSection(section)
    try {
      const result = await prdService.regenerateSection(
        prdDocument.id,
        section,
        sectionFeedback[section]
      )

      setPrdDocument(prev => prev ? { ...prev, [section]: result[section] } : null)
      setSectionFeedback(prev => ({ ...prev, [section]: '' }))
      toast.success(`${SECTION_LABELS[section] || section} regenerated`)
    } catch {
      toast.error('Failed to regenerate section')
    } finally {
      setRegeneratingSection(null)
    }
  }

  const handleExport = async (format: 'markdown' | 'pdf') => {
    if (!prdDocument?.id) {
      toast.error('No PRD document to export')
      return
    }

    setIsExporting(true)
    try {
      const blob = await prdService.export(prdDocument.id, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${prdDocument.title.replace(/[^a-z0-9]/gi, '_')}.${format === 'markdown' ? 'md' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`PRD exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Failed to export PRD')
    } finally {
      setIsExporting(false)
    }
  }

  const handleApprove = async () => {
    if (!prdDocument?.id) return

    setIsApproving(true)
    try {
      await prdService.approve(prdDocument.id)
      setPrdDocument(prev => prev ? { ...prev, status: 'approved' } : null)
      toast.success('PRD approved!')
    } catch {
      toast.error('Failed to approve PRD')
    } finally {
      setIsApproving(false)
    }
  }

  const handleCopyToClipboard = () => {
    if (!prdDocument) return
    const markdown = generateMarkdown(prdDocument)
    navigator.clipboard.writeText(markdown)
    toast.success('PRD copied to clipboard')
  }

  const handleReset = () => {
    setStep('input')
    setPrdDocument(null)
    setSectionsCompleted(new Set())
    setActiveSection('executive_summary')
    setError(null)
  }

  const handleClear = () => {
    setInput({ problem_statement: '', target_users: '' })
  }

  const handleFeedbackChange = (section: string, feedback: string) => {
    setSectionFeedback(prev => ({ ...prev, [section]: feedback }))
  }

  const handleSaveSection = async (section: string, content: unknown) => {
    if (!prdDocument?.id) {
      toast.error('No PRD document available')
      return
    }

    try {
      await prdService.updateSection(prdDocument.id, section, content as Record<string, unknown>)
      // Update local state
      setPrdDocument(prev => prev ? { ...prev, [section]: content } : null)
      toast.success(`${SECTION_LABELS[section] || section} updated`)
    } catch {
      toast.error('Failed to save section')
      throw new Error('Failed to save section')
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <div className="container py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">PRD Generator</h1>
          <p className="text-muted-foreground">
            Create comprehensive product requirement documents with AI assistance
          </p>
        </div>

        {/* Step Indicator */}
        <PRDStepIndicator currentStep={step} />

        {/* Content */}
        <AnimatePresence mode="wait">
          {step === 'input' && (
            <PRDInputForm
              input={input}
              onInputChange={handleInputChange}
              onGenerate={handleGenerate}
              onClear={handleClear}
              isGenerating={isGenerating}
              useJira={useJira}
              setUseJira={setUseJira}
              useSlack={useSlack}
              setUseSlack={setUseSlack}
            />
          )}

          {step === 'generating' && (
            <PRDProgressView
              progress={progress}
              sectionsCompleted={sectionsCompleted}
              error={error}
              onCancel={handleReset}
            />
          )}

          {step === 'review' && prdDocument && (
            <PRDReviewPanel
              document={prdDocument}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
              onRegenerateSection={handleRegenerateSection}
              regeneratingSection={regeneratingSection}
              sectionFeedback={sectionFeedback}
              onFeedbackChange={handleFeedbackChange}
              onContinueToExport={() => setStep('export')}
              onSaveSection={handleSaveSection}
              onDocumentUpdated={setPrdDocument}
            />
          )}

          {step === 'export' && prdDocument && (
            <PRDExportPanel
              document={prdDocument}
              isExporting={isExporting}
              isApproving={isApproving}
              onExport={handleExport}
              onCopyToClipboard={handleCopyToClipboard}
              onApprove={handleApprove}
              onBackToReview={() => setStep('review')}
              onGenerateNew={handleReset}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  )
}
