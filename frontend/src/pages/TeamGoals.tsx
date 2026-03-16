import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertCircle, Plus, Trash2, Edit, Target } from 'lucide-react'
import { useTeam } from '@/hooks/useTeam'
import { teamService, TeamGoalResponse } from '@/lib/api/teamService'

export default function TeamGoals() {
  const { currentTeam } = useTeam()
  const teamId = currentTeam?.id
  const queryClient = useQueryClient()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<TeamGoalResponse | null>(null)

  const { data: goals, isLoading } = useQuery({
    queryKey: ['team-goals', teamId],
    queryFn: () => teamService.listGoals(teamId!),
    enabled: !!teamId,
  })

  const createGoal = useMutation({
    mutationFn: (data: { title: string; description?: string; target_value: number; quarter?: string; owner_id?: string }) =>
      teamService.createGoal(teamId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-goals', teamId] })
      setIsCreateOpen(false)
    },
  })

  const updateGoal = useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: Partial<TeamGoalResponse> }) =>
      teamService.updateGoal(teamId!, goalId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-goals', teamId] })
      setEditingGoal(null)
    },
  })

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) => teamService.deleteGoal(teamId!, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-goals', teamId] })
    },
  })

  const handleCreateGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createGoal.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      target_value: parseFloat(formData.get('target_value') as string),
      quarter: formData.get('quarter') as string,
    })
  }

  const handleUpdateGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingGoal) return
    const formData = new FormData(e.currentTarget)
    updateGoal.mutate({
      goalId: editingGoal.id,
      data: {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        target_value: parseFloat(formData.get('target_value') as string),
        current_value: parseFloat(formData.get('current_value') as string),
        quarter: formData.get('quarter') as string,
      },
    })
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Goals & OKRs</h1>
            <p className="text-gray-600 mt-2">Track and manage team objectives and key results</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateGoal}>
                <DialogHeader>
                  <DialogTitle>Create New Goal</DialogTitle>
                  <DialogDescription>Set a new objective for your team to achieve.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Goal Title *</Label>
                    <Input id="title" name="title" required placeholder="e.g., Increase deployment frequency" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="Describe the goal and why it matters" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="target_value">Target Value *</Label>
                      <Input id="target_value" name="target_value" type="number" step="0.01" required placeholder="100" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quarter">Quarter</Label>
                      <Select name="quarter">
                        <SelectTrigger>
                          <SelectValue placeholder="Select quarter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                          <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                          <SelectItem value="Q3 2024">Q3 2024</SelectItem>
                          <SelectItem value="Q4 2024">Q4 2024</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createGoal.isPending}>
                    {createGoal.isPending ? 'Creating...' : 'Create Goal'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <Target className="h-12 w-12 mx-auto text-gray-400 animate-pulse" />
            <p className="text-gray-500 mt-2">Loading goals...</p>
          </div>
        ) : goals && goals.length > 0 ? (
          <div className="grid gap-4">
            {goals.map((goal) => {
              const progress = goal.target_value > 0 ? (goal.current_value / goal.target_value) * 100 : 0
              return (
                <Card key={goal.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <Target className="h-5 w-5 text-blue-600" />
                          {goal.title}
                        </CardTitle>
                        {goal.description && (
                          <CardDescription className="mt-2">{goal.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingGoal(goal)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete goal "${goal.title}"?`)) {
                              deleteGoal.mutate(goal.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-semibold">
                          {goal.current_value} / {goal.target_value} ({Math.round(progress)}%)
                        </span>
                      </div>
                      <Progress value={progress} className={getProgressColor(progress)} />
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {goal.quarter && (
                        <Badge variant="outline">{goal.quarter}</Badge>
                      )}
                      {goal.owner_name && (
                        <span className="text-muted-foreground">Owner: {goal.owner_name}</span>
                      )}
                      <span className="text-muted-foreground ml-auto">
                        Updated {new Date(goal.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="text-lg font-semibold mt-4">No goals yet</h3>
              <p className="text-muted-foreground mt-2">Create your first team goal to get started.</p>
              <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Goal
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Edit Goal Dialog */}
        <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
          <DialogContent>
            <form onSubmit={handleUpdateGoal}>
              <DialogHeader>
                <DialogTitle>Edit Goal</DialogTitle>
                <DialogDescription>Update goal details and progress.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Goal Title *</Label>
                  <Input id="edit-title" name="title" required defaultValue={editingGoal?.title} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea id="edit-description" name="description" defaultValue={editingGoal?.description || ''} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-current">Current Value *</Label>
                    <Input
                      id="edit-current"
                      name="current_value"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingGoal?.current_value || 0}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-target">Target Value *</Label>
                    <Input
                      id="edit-target"
                      name="target_value"
                      type="number"
                      step="0.01"
                      required
                      defaultValue={editingGoal?.target_value}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-quarter">Quarter</Label>
                  <Select name="quarter" defaultValue={editingGoal?.quarter || ''}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Q1 2024">Q1 2024</SelectItem>
                      <SelectItem value="Q2 2024">Q2 2024</SelectItem>
                      <SelectItem value="Q3 2024">Q3 2024</SelectItem>
                      <SelectItem value="Q4 2024">Q4 2024</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={updateGoal.isPending}>
                  {updateGoal.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
