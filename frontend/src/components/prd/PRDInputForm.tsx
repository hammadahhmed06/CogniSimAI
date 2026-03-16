import { FormEvent, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Sparkles,
  Target,
  Users,
  Brain,
  Lightbulb,
} from 'lucide-react'

import type { PRDInput } from './prd-types'

interface PRDInputFormProps {
  input: PRDInput
  onInputChange: (field: keyof PRDInput, value: string) => void
  onGenerate: (e?: FormEvent) => void
  onClear: () => void
  isGenerating: boolean
  useJira: boolean
  setUseJira: (v: boolean) => void
  useSlack: boolean
  setUseSlack: (v: boolean) => void
}

export function PRDInputForm({
  input,
  onInputChange,
  onGenerate,
  onClear,
  isGenerating,
  useJira,
  setUseJira,
  useSlack,
  setUseSlack,
}: PRDInputFormProps) {
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    onGenerate(e)
  }, [onGenerate])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto"
    >
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>AI-Powered PRD Generator</CardTitle>
              <CardDescription>
                Describe your product idea and let AI create a comprehensive PRD document
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Problem Statement */}
            <div className="space-y-2">
              <Label htmlFor="problem">
                Problem Statement <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="problem"
                placeholder="What problem are you trying to solve? Be specific about the pain points and current challenges..."
                value={input.problem_statement}
                onChange={(e) => onInputChange('problem_statement', e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Describe the core problem, its impact, and why it needs to be solved now.
              </p>
            </div>

            {/* Target Users */}
            <div className="space-y-2">
              <Label htmlFor="users">
                Target Users <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="users"
                placeholder="Who are the primary users? Describe their roles, needs, and behaviors..."
                value={input.target_users}
                onChange={(e) => onInputChange('target_users', e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Success Metrics */}
            <div className="space-y-2">
              <Label htmlFor="metrics">Success Metrics (Optional)</Label>
              <Textarea
                id="metrics"
                placeholder="How will you measure success? Include KPIs, targets, and timeframes..."
                value={input.success_metrics || ''}
                onChange={(e) => onInputChange('success_metrics', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Constraints */}
            <div className="space-y-2">
              <Label htmlFor="constraints">Constraints (Optional)</Label>
              <Textarea
                id="constraints"
                placeholder="Technical, timeline, budget, or regulatory constraints..."
                value={input.constraints || ''}
                onChange={(e) => onInputChange('constraints', e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            <Separator />

            {/* Context Sources */}
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                Enrich with Context (Optional)
              </Label>

              <div className="grid gap-4">
                {/* Jira */}
                <Collapsible open={useJira} onOpenChange={setUseJira}>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 rounded flex items-center justify-center">
                        <Target className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Jira Epic</p>
                        <p className="text-xs text-muted-foreground">Pull context from existing epic</p>
                      </div>
                    </div>
                    <Switch checked={useJira} onCheckedChange={setUseJira} />
                  </div>
                  <CollapsibleContent className="pt-2">
                    <Input
                      placeholder="Enter Jira Epic Key (e.g., PROJ-123)"
                      value={input.jira_epic_key || ''}
                      onChange={(e) => onInputChange('jira_epic_key', e.target.value)}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Slack */}
                <Collapsible open={useSlack} onOpenChange={setUseSlack}>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500/10 rounded flex items-center justify-center">
                        <Users className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Slack</p>
                        <p className="text-xs text-muted-foreground">Include discussion context</p>
                      </div>
                    </div>
                    <Switch checked={useSlack} onCheckedChange={setUseSlack} />
                  </div>
                  <CollapsibleContent className="pt-2">
                    <Input
                      placeholder="Enter Slack Channel ID"
                      value={input.slack_channel_id || ''}
                      onChange={(e) => onInputChange('slack_channel_id', e.target.value)}
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClear}>
            Clear
          </Button>
          <Button onClick={() => onGenerate()} disabled={isGenerating}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generate PRD
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  )
}
