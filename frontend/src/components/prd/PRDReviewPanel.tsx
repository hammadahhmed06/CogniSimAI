import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Loader2,
  RefreshCw,
  ArrowRight,
  FileText,
  Users,
  Target,
  Settings2,
  Shield,
  Clock,
  Pencil,
  History,
} from 'lucide-react'

import type { PRDDocument, SectionConfig } from './prd-types'
import { PRDSectionRenderer } from './PRDSectionRenderer'
import { PRDSectionEditor } from './PRDSectionEditor'
import { PRDQualityBadge } from './PRDQualityBadge'
import { PRDVersionTimeline } from './PRDVersionTimeline'
import { PRDDiffViewer } from './PRDDiffViewer'
import { PRDCommentThread } from './PRDCommentThread'
import { PRDReviewerAssignment } from './PRDReviewerAssignment'
import { prdVersionService } from '@/lib/api/prdVersionService'

const SECTION_LABELS: Record<string, SectionConfig> = {
  executive_summary: { label: 'Executive Summary', icon: FileText },
  user_personas: { label: 'User Personas', icon: Users },
  feature_specifications: { label: 'Feature Specifications', icon: Target },
  technical_requirements: { label: 'Technical Requirements', icon: Settings2 },
  risks_and_mitigations: { label: 'Risks & Mitigations', icon: Shield },
  timeline_and_phases: { label: 'Timeline & Phases', icon: Clock },
}

interface PRDReviewPanelProps {
  document: PRDDocument
  activeSection: string
  onSectionChange: (section: string) => void
  onRegenerateSection: (section: string) => void
  regeneratingSection: string | null
  sectionFeedback: Record<string, string>
  onFeedbackChange: (section: string, feedback: string) => void
  onContinueToExport: () => void
  onSaveSection?: (section: string, content: unknown) => Promise<void>
  onDocumentUpdated?: (doc: PRDDocument) => void
}

export function PRDReviewPanel({
  document: doc,
  activeSection,
  onSectionChange,
  onRegenerateSection,
  regeneratingSection,
  sectionFeedback,
  onFeedbackChange,
  onContinueToExport,
  onSaveSection,
  onDocumentUpdated,
}: PRDReviewPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [diffVersions, setDiffVersions] = useState<{ a: number; b: number } | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async (versionNumber: number) => {
    if (!doc.id) return
    setIsRestoring(true)
    try {
      const restored = await prdVersionService.restoreVersion(doc.id, versionNumber)
      toast.success(`Restored to version ${versionNumber}`)
      if (onDocumentUpdated && restored) {
        onDocumentUpdated(restored as unknown as PRDDocument)
      }
      setHistoryOpen(false)
    } catch (err) {
      toast.error('Failed to restore version')
      console.error(err)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleCompare = (versionA: number, versionB: number) => {
    setDiffVersions({ a: versionA, b: versionB })
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="grid grid-cols-1 lg:grid-cols-4 gap-6"
      >
        {/* Section Navigation Sidebar */}
        <Card className="lg:col-span-1 h-fit sticky top-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0.5 px-2">
              {Object.entries(SECTION_LABELS).map(([key, { label, icon: Icon }]) => (
                <button
                  key={key}
                  onClick={() => onSectionChange(key)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm transition-colors text-left',
                    activeSection === key
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-4">
            {/* Quality Score */}
            {doc.coherence_review && doc.coherence_review.overall_score > 0 && (
              <PRDQualityBadge
                score={doc.coherence_review.overall_score}
                variant="detailed"
                className="w-full"
              />
            )}

            {/* Version History Sheet */}
            {doc.id && (
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <History className="w-4 h-4 mr-2" />
                    Version History
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[460px] p-0">
                  <div className="p-6 border-b">
                    <h3 className="text-lg font-semibold">Version History</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Browse previous versions, compare changes, or restore
                    </p>
                  </div>
                  <ScrollArea className="h-[calc(100vh-120px)]">
                    <div className="p-4">
                      <PRDVersionTimeline
                        prdId={doc.id}
                        onRestore={handleRestore}
                        onCompare={handleCompare}
                      />
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            )}

            <Button className="w-full" onClick={onContinueToExport}>
              Continue to Export
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardFooter>
        </Card>

        {/* Content Area */}
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle>{SECTION_LABELS[activeSection]?.label}</CardTitle>
              <CardDescription>Review and refine this section</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRegenerateSection(activeSection)}
                disabled={regeneratingSection === activeSection || isEditing}
              >
                {regeneratingSection === activeSection ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Regenerate
              </Button>
              {onSaveSection && !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={doc.status === 'approved'}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ScrollArea className="h-[500px] pr-4">
              {isEditing && onSaveSection ? (
                <PRDSectionEditor
                  section={activeSection}
                  document={doc}
                  onSave={async (section, content) => {
                    await onSaveSection(section, content)
                    setIsEditing(false)
                  }}
                  onCancel={() => setIsEditing(false)}
                />
              ) : (
                <PRDSectionRenderer section={activeSection} document={doc} />
              )}
            </ScrollArea>

            {/* Feedback for regeneration */}
            {!isEditing && (
              <div className="mt-4 pt-4 border-t space-y-2">
                <Label htmlFor="feedback" className="text-sm text-muted-foreground">
                  Feedback for Regeneration (Optional)
                </Label>
                <Textarea
                  id="feedback"
                  placeholder="Provide specific feedback to improve this section..."
                  value={sectionFeedback[activeSection] || ''}
                  onChange={(e) => onFeedbackChange(activeSection, e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>
            )}

            {/* Section Comments */}
            {doc.id && !isEditing && (
              <PRDCommentThread
                prdId={doc.id}
                section={activeSection}
                className="mt-4"
              />
            )}
          </CardContent>
        </Card>

        {/* Reviewers Panel (below content on lg, side on xl) */}
        {doc.id && (
          <div className="lg:col-span-4 xl:col-span-4">
            <PRDReviewerAssignment prdId={doc.id} />
          </div>
        )}
      </motion.div>

      {/* Diff Viewer Dialog */}
      {doc.id && diffVersions && (
        <PRDDiffViewer
          prdId={doc.id}
          versionA={diffVersions.a}
          versionB={diffVersions.b}
          open={!!diffVersions}
          onClose={() => setDiffVersions(null)}
        />
      )}
    </>
  )
}
