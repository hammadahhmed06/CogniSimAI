/**
 * Agent Settings Page
 * 
 * Enterprise agent customization - allows workspaces to customize
 * agent instructions, prompts, and behavior.
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Settings,
  Wand2,
  FileText,
  Plus,
  Save,
  Trash2,
  Star,
  StarOff,
  ChevronRight,
  Brain,
  MessageSquare,
  Globe,
  Building2,
  BookOpen,
  Sliders,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  agentConfigService,
  AgentConfig,
  AgentConfigCreate,
  AgentConfigUpdate,
  AgentType,
  getAgentTypeName,
} from '@/lib/api/agentConfigService'

const AGENT_TYPES: { value: AgentType; label: string; icon: typeof Wand2; color: string }[] = [
  { value: 'epic_decomposer', label: 'Epic Architect', icon: Wand2, color: 'blue' },
  { value: 'prd_generator', label: 'PRD Generator', icon: FileText, color: 'purple' },
]

const TONE_OPTIONS = [
  { value: 'professional', label: 'Professional' },
  { value: 'technical', label: 'Technical' },
  { value: 'casual', label: 'Casual' },
  { value: 'formal', label: 'Formal' },
  { value: 'concise', label: 'Concise' },
]

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ja', label: 'Japanese' },
]

export default function AgentSettingsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedAgentType, setSelectedAgentType] = useState<AgentType>('epic_decomposer')
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newConfigName, setNewConfigName] = useState('')

  // Fetch configurations
  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['agent-configs', selectedAgentType],
    queryFn: () => agentConfigService.list(selectedAgentType, false),
  })

  // Get selected config
  const selectedConfig = selectedConfigId 
    ? configs.find(c => c.id === selectedConfigId)
    : configs.find(c => c.is_default) || configs[0]

  // Form state
  const [formState, setFormState] = useState<Partial<AgentConfigUpdate>>({})

  // Initialize form state when selected config changes
  useEffect(() => {
    if (selectedConfig) {
      setFormState({
        name: selectedConfig.name,
        description: selectedConfig.description,
        is_default: selectedConfig.is_default,
        is_active: selectedConfig.is_active,
        instructions: selectedConfig.instructions,
        epic_decomposer_config: selectedConfig.epic_decomposer_config,
        prd_generator_config: selectedConfig.prd_generator_config,
      })
    }
  }, [selectedConfig])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: AgentConfigCreate) => agentConfigService.create(data),
    onSuccess: (newConfig) => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
      setSelectedConfigId(newConfig.id)
      setIsCreateDialogOpen(false)
      setNewConfigName('')
      toast.success('Configuration created successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to create configuration: ${error.message}`)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, update }: { id: string; update: AgentConfigUpdate }) =>
      agentConfigService.update(id, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
      toast.success('Configuration saved successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to save configuration: ${error.message}`)
    },
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => agentConfigService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-configs'] })
      setSelectedConfigId(null)
      toast.success('Configuration deleted')
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete configuration: ${error.message}`)
    },
  })

  const handleCreateConfig = () => {
    if (!newConfigName.trim()) return
    createMutation.mutate({
      agent_type: selectedAgentType,
      name: newConfigName.trim(),
      instructions: {},
    })
  }

  const handleSave = () => {
    if (!selectedConfig) return
    updateMutation.mutate({
      id: selectedConfig.id,
      update: formState,
    })
  }

  const updateInstructions = (field: string, value: string | Record<string, string>) => {
    setFormState(prev => ({
      ...prev,
      instructions: {
        ...prev.instructions,
        [field]: value,
      },
    }))
  }

  const updateAgentConfig = (field: string, value: unknown) => {
    if (selectedAgentType === 'epic_decomposer') {
      setFormState(prev => ({
        ...prev,
        epic_decomposer_config: {
          ...prev.epic_decomposer_config,
          [field]: value,
        },
      }))
    } else {
      setFormState(prev => ({
        ...prev,
        prd_generator_config: {
          ...prev.prd_generator_config,
          [field]: value,
        },
      }))
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-slate-600" />
              Agent Settings
            </h1>
            <p className="text-slate-600 mt-1">
              Customize AI agent behavior, instructions, and output preferences
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard/agents')}>
            Back to Agents
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar - Agent Type & Config Selection */}
          <div className="col-span-3 space-y-4">
            {/* Agent Type Selector */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Agent Type</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {AGENT_TYPES.map((agent) => (
                  <button
                    key={agent.value}
                    onClick={() => {
                      setSelectedAgentType(agent.value)
                      setSelectedConfigId(null)
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all',
                      selectedAgentType === agent.value
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                    )}
                  >
                    <agent.icon className={cn(
                      'h-5 w-5',
                      selectedAgentType === agent.value ? 'text-blue-600' : 'text-slate-500'
                    )} />
                    <span className={cn(
                      'font-medium text-sm',
                      selectedAgentType === agent.value ? 'text-blue-900' : 'text-slate-700'
                    )}>
                      {agent.label}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            {/* Configuration Selector */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Configurations</CardTitle>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Configuration</DialogTitle>
                        <DialogDescription>
                          Create a new configuration for {getAgentTypeName(selectedAgentType)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="config-name">Configuration Name</Label>
                          <Input
                            id="config-name"
                            placeholder="e.g., Technical Team Config"
                            value={newConfigName}
                            onChange={(e) => setNewConfigName(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateConfig}
                          disabled={!newConfigName.trim() || createMutation.isPending}
                        >
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-sm text-slate-500">Loading...</div>
                ) : configs.length === 0 ? (
                  <div className="text-sm text-slate-500 text-center py-4">
                    No configurations yet.
                    <br />
                    <button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="text-blue-600 hover:underline mt-1"
                    >
                      Create one
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {configs.map((config) => (
                      <button
                        key={config.id}
                        onClick={() => setSelectedConfigId(config.id)}
                        className={cn(
                          'w-full flex items-center justify-between p-2 rounded-md text-left text-sm transition-all',
                          (selectedConfig?.id === config.id)
                            ? 'bg-blue-100 text-blue-900'
                            : 'hover:bg-slate-100 text-slate-700'
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{config.name}</span>
                          {config.is_default && (
                            <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        {!config.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Configuration Editor */}
          <div className="col-span-9">
            {!selectedConfig ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-medium text-slate-900">No Configuration Selected</h3>
                  <p className="text-slate-500 mt-1 max-w-md">
                    Select a configuration from the sidebar or create a new one to customize agent behavior.
                  </p>
                  <Button 
                    className="mt-4"
                    onClick={() => setIsCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Configuration
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Config Header */}
                <Card>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <Input
                        value={formState.name || ''}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0"
                        placeholder="Configuration Name"
                      />
                      {formState.is_default && (
                        <Badge className="bg-amber-100 text-amber-800">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFormState(prev => ({ ...prev, is_default: !prev.is_default }))
                        }}
                      >
                        {formState.is_default ? (
                          <>
                            <StarOff className="h-4 w-4 mr-1" />
                            Unset Default
                          </>
                        ) : (
                          <>
                            <Star className="h-4 w-4 mr-1" />
                            Set as Default
                          </>
                        )}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this configuration?')) {
                            deleteMutation.mutate(selectedConfig.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button onClick={handleSave} disabled={updateMutation.isPending}>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs for different settings */}
                <Tabs defaultValue="instructions" className="space-y-4">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="instructions" className="gap-2">
                      <Brain className="h-4 w-4" />
                      Instructions
                    </TabsTrigger>
                    <TabsTrigger value="context" className="gap-2">
                      <Building2 className="h-4 w-4" />
                      Context
                    </TabsTrigger>
                    <TabsTrigger value="output" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Output
                    </TabsTrigger>
                    <TabsTrigger value="agent-specific" className="gap-2">
                      <Sliders className="h-4 w-4" />
                      Agent Settings
                    </TabsTrigger>
                  </TabsList>

                  {/* Instructions Tab */}
                  <TabsContent value="instructions">
                    <Card>
                      <CardHeader>
                        <CardTitle>Custom Instructions</CardTitle>
                        <CardDescription>
                          Add custom instructions that will be included in the agent's prompts
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="system-prefix">System Prompt Prefix</Label>
                          <Textarea
                            id="system-prefix"
                            placeholder="Text to add at the beginning of the system prompt..."
                            value={formState.instructions?.system_prompt_prefix || ''}
                            onChange={(e) => updateInstructions('system_prompt_prefix', e.target.value)}
                            rows={3}
                          />
                          <p className="text-xs text-slate-500">
                            This text will be prepended to the agent's system prompt
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="custom-instructions">Custom Instructions</Label>
                          <Textarea
                            id="custom-instructions"
                            placeholder="Enter specific instructions for the agent...&#10;&#10;Example:&#10;- Always use technical terminology from our domain&#10;- Include security considerations in every story&#10;- Reference our design system components"
                            value={formState.instructions?.custom_instructions || ''}
                            onChange={(e) => updateInstructions('custom_instructions', e.target.value)}
                            rows={6}
                          />
                          <p className="text-xs text-slate-500">
                            These instructions will guide the agent's behavior and output
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="system-suffix">System Prompt Suffix</Label>
                          <Textarea
                            id="system-suffix"
                            placeholder="Text to add at the end of the system prompt..."
                            value={formState.instructions?.system_prompt_suffix || ''}
                            onChange={(e) => updateInstructions('system_prompt_suffix', e.target.value)}
                            rows={3}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Context Tab */}
                  <TabsContent value="context">
                    <Card>
                      <CardHeader>
                        <CardTitle>Domain Context</CardTitle>
                        <CardDescription>
                          Provide industry and company-specific context for better output
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="industry-context">Industry Context</Label>
                          <Textarea
                            id="industry-context"
                            placeholder="e.g., We are a fintech company focused on B2B payments...&#10;Our products serve enterprise finance teams..."
                            value={formState.instructions?.industry_context || ''}
                            onChange={(e) => updateInstructions('industry_context', e.target.value)}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company-context">Company Context</Label>
                          <Textarea
                            id="company-context"
                            placeholder="e.g., We use a microservices architecture...&#10;Our design system is called 'Pulse'..."
                            value={formState.instructions?.company_context || ''}
                            onChange={(e) => updateInstructions('company_context', e.target.value)}
                            rows={3}
                          />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                          <Label>Domain Glossary</Label>
                          <p className="text-xs text-slate-500 mb-2">
                            Define terms specific to your domain (coming soon)
                          </p>
                          <div className="bg-slate-50 rounded-lg p-4 text-center text-sm text-slate-500">
                            Glossary editor coming soon
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Output Tab */}
                  <TabsContent value="output">
                    <Card>
                      <CardHeader>
                        <CardTitle>Output Preferences</CardTitle>
                        <CardDescription>
                          Configure tone, language, and output format
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Tone</Label>
                            <Select
                              value={formState.instructions?.tone || 'professional'}
                              onValueChange={(v) => updateInstructions('tone', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select tone" />
                              </SelectTrigger>
                              <SelectContent>
                                {TONE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>Language</Label>
                            <Select
                              value={formState.instructions?.language || 'en'}
                              onValueChange={(v) => updateInstructions('language', v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                {LANGUAGE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="output-format">Output Format Override</Label>
                          <Textarea
                            id="output-format"
                            placeholder="Custom output format instructions..."
                            value={formState.instructions?.output_format_override || ''}
                            onChange={(e) => updateInstructions('output_format_override', e.target.value)}
                            rows={4}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Agent-Specific Settings Tab */}
                  <TabsContent value="agent-specific">
                    {selectedAgentType === 'epic_decomposer' ? (
                      <Card>
                        <CardHeader>
                          <CardTitle>Epic Architect Settings</CardTitle>
                          <CardDescription>
                            Configure story generation parameters
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Min Stories</Label>
                              <Input
                                type="number"
                                min={1}
                                max={20}
                                value={formState.epic_decomposer_config?.min_stories ?? 3}
                                onChange={(e) => updateAgentConfig('min_stories', parseInt(e.target.value))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default Stories</Label>
                              <Input
                                type="number"
                                min={3}
                                max={15}
                                value={formState.epic_decomposer_config?.default_stories ?? 6}
                                onChange={(e) => updateAgentConfig('default_stories', parseInt(e.target.value))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Stories</Label>
                              <Input
                                type="number"
                                min={3}
                                max={30}
                                value={formState.epic_decomposer_config?.max_stories ?? 12}
                                onChange={(e) => updateAgentConfig('max_stories', parseInt(e.target.value))}
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-4">
                            <h4 className="font-medium">Include in Output</h4>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="include-risks">Risk Assessment</Label>
                                <Switch
                                  id="include-risks"
                                  checked={formState.epic_decomposer_config?.include_risks ?? true}
                                  onCheckedChange={(v) => updateAgentConfig('include_risks', v)}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="include-points">Story Points (Beta)</Label>
                                <Switch
                                  id="include-points"
                                  checked={formState.epic_decomposer_config?.include_story_points ?? false}
                                  onCheckedChange={(v) => updateAgentConfig('include_story_points', v)}
                                />
                              </div>
                              <div className="flex items-center justify-between">
                                <Label htmlFor="include-deps">Dependencies</Label>
                                <Switch
                                  id="include-deps"
                                  checked={formState.epic_decomposer_config?.include_dependencies ?? false}
                                  onCheckedChange={(v) => updateAgentConfig('include_dependencies', v)}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle>PRD Generator Settings</CardTitle>
                          <CardDescription>
                            Configure PRD generation parameters
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Min Features</Label>
                              <Input
                                type="number"
                                min={3}
                                max={15}
                                value={formState.prd_generator_config?.min_features ?? 5}
                                onChange={(e) => updateAgentConfig('min_features', parseInt(e.target.value))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Default Max Features</Label>
                              <Input
                                type="number"
                                min={5}
                                max={20}
                                value={formState.prd_generator_config?.default_max_features ?? 10}
                                onChange={(e) => updateAgentConfig('default_max_features', parseInt(e.target.value))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max Features</Label>
                              <Input
                                type="number"
                                min={5}
                                max={30}
                                value={formState.prd_generator_config?.max_features ?? 15}
                                onChange={(e) => updateAgentConfig('max_features', parseInt(e.target.value))}
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-4">
                            <h4 className="font-medium">Include Sections</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { key: 'include_executive_summary', label: 'Executive Summary' },
                                { key: 'include_personas', label: 'User Personas' },
                                { key: 'include_features', label: 'Feature Specs' },
                                { key: 'include_technical_requirements', label: 'Technical Requirements' },
                                { key: 'include_risks', label: 'Risk Assessment' },
                                { key: 'include_timeline', label: 'Timeline' },
                                { key: 'include_success_metrics', label: 'Success Metrics' },
                              ].map((item) => (
                                <div key={item.key} className="flex items-center justify-between">
                                  <Label htmlFor={item.key}>{item.label}</Label>
                                  <Switch
                                    id={item.key}
                                    checked={(formState.prd_generator_config as Record<string, boolean>)?.[item.key] ?? true}
                                    onCheckedChange={(v) => updateAgentConfig(item.key, v)}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
