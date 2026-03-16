import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  FileText,
  FileDown,
  Copy,
  Check,
  CheckCircle2,
  ArrowLeft,
  Wand2,
  Layers,
} from 'lucide-react'

import type { PRDDocument } from './prd-types'
import { PRDQualityBadge } from './PRDQualityBadge'
import { PRDFeatureToIssueDialog } from './PRDFeatureToIssueDialog'

interface PRDExportPanelProps {
  document: PRDDocument
  isExporting: boolean
  isApproving: boolean
  onExport: (format: 'markdown' | 'pdf') => void
  onCopyToClipboard: () => void
  onApprove: () => void
  onBackToReview: () => void
  onGenerateNew: () => void
}

export function PRDExportPanel({
  document: doc,
  isExporting,
  isApproving,
  onExport,
  onCopyToClipboard,
  onApprove,
  onBackToReview,
  onGenerateNew,
}: PRDExportPanelProps) {
  const [backlogDialogOpen, setBacklogDialogOpen] = useState(false)
  return (
    <>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-2xl mx-auto"
    >
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <CardTitle>PRD Ready for Export</CardTitle>
          <CardDescription>
            Your document is complete. Choose how to export or share it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Summary */}
          <div className="p-4 bg-muted/50 rounded-lg border space-y-3">
            <h4 className="font-medium">{doc.title}</h4>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline">
                {doc.user_personas?.length || 0} Personas
              </Badge>
              <Badge variant="outline">
                {doc.feature_specifications?.length || 0} Features
              </Badge>
              <Badge variant="outline">
                {doc.risks_and_mitigations?.length || 0} Risks
              </Badge>
              <Badge variant="outline">
                {doc.timeline_and_phases?.length || 0} Phases
              </Badge>
            </div>
            {doc.coherence_review && doc.coherence_review.overall_score > 0 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm text-muted-foreground">Quality:</span>
                <PRDQualityBadge score={doc.coherence_review.overall_score} />
              </div>
            )}
            {doc.generation_time_ms && (
              <p className="text-xs text-muted-foreground">
                Generated in {(doc.generation_time_ms / 1000).toFixed(1)}s
              </p>
            )}
          </div>

          {/* Export Options */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onExport('markdown')}
              disabled={isExporting}
            >
              <FileText className="w-6 h-6" />
              <span>Export as Markdown</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
              onClick={() => onExport('pdf')}
              disabled={isExporting}
            >
              <FileDown className="w-6 h-6" />
              <span>Export as PDF</span>
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={onCopyToClipboard}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy to Clipboard
            </Button>
            <Button
              variant="ghost"
              className="flex-1"
              onClick={onApprove}
              disabled={isApproving || doc.status === 'approved'}
            >
              {isApproving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              {doc.status === 'approved' ? 'Approved' : 'Approve PRD'}
            </Button>
          </div>

          {/* Create Backlog */}
          {doc.id && (
            <Button
              variant="outline"
              className="w-full h-auto py-3"
              onClick={() => setBacklogDialogOpen(true)}
            >
              <Layers className="w-5 h-5 mr-2" />
              Create Backlog from Features
            </Button>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBackToReview}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Review
          </Button>
          <Button onClick={onGenerateNew}>
            <Wand2 className="w-4 h-4 mr-2" />
            Generate New PRD
          </Button>
        </CardFooter>
      </Card>
    </motion.div>

    {/* Backlog Dialog */}
    <PRDFeatureToIssueDialog
      open={backlogDialogOpen}
      onClose={() => setBacklogDialogOpen(false)}
      document={doc}
    />
    </>
  )
}
