import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, FileText, Star, ArrowRight } from 'lucide-react'

import { prdService, type PRDTemplate } from '@/lib/api/prdService'

// Section type → human-readable label
const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  user_personas: 'User Personas',
  feature_specifications: 'Feature Specs',
  technical_requirements: 'Technical Reqs',
  risks_and_mitigations: 'Risks & Mitigations',
  timeline_and_milestones: 'Timeline',
}

interface PRDTemplateGalleryProps {
  /** Called when user selects a template — parent can pre-fill form or start generation */
  onSelectTemplate?: (template: PRDTemplate) => void
}

export function PRDTemplateGallery({ onSelectTemplate }: PRDTemplateGalleryProps) {
  const navigate = useNavigate()

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['prd-templates'],
    queryFn: () => prdService.getTemplates(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading templates...
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No templates available</p>
      </div>
    )
  }

  const handleSelect = (t: PRDTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(t)
    } else {
      navigate(`/dashboard/agents/prd-generator?template=${t.id}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Templates</h3>
        <span className="text-xs text-muted-foreground">{templates.length} available</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((t, idx) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="flex flex-col h-full hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  {t.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Default
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-xs line-clamp-2">
                  {t.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {t.sections.map((s) => (
                    <Badge key={s.type} variant="outline" className="text-[10px] font-normal">
                      {SECTION_LABELS[s.type] || s.type}
                      {s.required && <span className="text-destructive ml-0.5">*</span>}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  v{t.version} &bull; {t.sections.length} sections
                  {t.sections.filter(s => s.required).length > 0 &&
                    ` &bull; ${t.sections.filter(s => s.required).length} required`}
                </p>
              </CardContent>
              <CardFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleSelect(t)}
                >
                  Use Template
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
