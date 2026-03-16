import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, MoreVertical, Loader2 } from 'lucide-react'
import { issueService, type IssueDTO } from '@/lib/api/issueService'
import { projectService, type Project } from '@/lib/api/projectService'
import { toast } from 'sonner'

const mockColumns = [
  { id: 'todo', title: 'To Do', color: 'border-t-gray-400' },
  { id: 'in_progress', title: 'In Progress', color: 'border-t-blue-500' },
  { id: 'review', title: 'Code Review', color: 'border-t-purple-500' },
  { id: 'done', title: 'Done', color: 'border-t-green-500' },
]

export default function Boards() {
  const [selectedProject, setSelectedProject] = useState('all')
  const [tasks, setTasks] = useState<IssueDTO[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [projectsData, issuesData] = await Promise.all([projectService.listProjects(), issueService.listIssues({ limit: 100 })])
        setProjects(projectsData)
        setTasks(issuesData.items || [])
      } catch (error) {
        console.error('Failed to load data:', error)
        toast.error('Failed to load board data')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const filteredTasks = selectedProject === 'all' ? tasks : tasks.filter(task => task.project_id === selectedProject)
  const getTasksByStatus = (status: string) => filteredTasks.filter(task => task.status?.toLowerCase() === status.toLowerCase())
  const getTypeColor = (type: string) => ({ story: 'bg-green-100 text-green-700', task: 'bg-blue-100 text-blue-700', bug: 'bg-red-100 text-red-700', epic: 'bg-purple-100 text-purple-700' }[type?.toLowerCase() as keyof { story: string, task: string, bug: string, epic: string }] || 'bg-gray-100 text-gray-700')
  const getPriorityColor = (priority: string) => { const lowerPriority = priority?.toLowerCase() || ''; if (lowerPriority === 'high' || lowerPriority === 'critical') return 'text-red-600'; if (lowerPriority === 'medium') return 'text-orange-600'; if (lowerPriority === 'low') return 'text-blue-600'; return 'text-gray-600' }

  return (<DashboardLayout><div className="h-full flex flex-col"><div className="border-b bg-white px-6 py-4"><div className="flex items-center justify-between"><h1 className="text-2xl font-semibold text-gray-900">Board</h1><div className="flex items-center gap-3"><Select value={selectedProject} onValueChange={setSelectedProject}><SelectTrigger className="w-[200px] border-gray-300"><SelectValue placeholder="Select project" /></SelectTrigger><SelectContent><SelectItem value="all">All Projects</SelectItem>{projects.map(project => (<SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>))}</SelectContent></Select><Button className="bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4 mr-2" />Create</Button></div></div></div><div className="flex-1 overflow-x-auto bg-gray-50 p-6">{loading ? (<div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>) : (<div className="flex gap-4 min-w-max">{mockColumns.map(column => { const columnTasks = getTasksByStatus(column.id); return (<div key={column.id} className="flex-shrink-0 w-80"><div className="bg-white rounded-lg border border-gray-200 shadow-sm"><div className={`px-4 py-3 border-t-4 ${column.color} flex items-center justify-between`}><div className="flex items-center gap-2"><h3 className="font-semibold text-gray-900">{column.title}</h3><Badge variant="secondary" className="bg-gray-100 text-gray-700 text-xs">{columnTasks.length}</Badge></div><Button variant="ghost" size="icon" className="h-7 w-7"><Plus className="h-4 w-4" /></Button></div><div className="p-3 space-y-3 min-h-[600px] max-h-[calc(100vh-200px)] overflow-y-auto">{columnTasks.map(task => (<Card key={task.id} className="hover:shadow-md transition-all cursor-pointer border border-gray-200"><CardContent className="p-3 space-y-2"><div className="flex items-start justify-between gap-2"><div className="flex-1"><h4 className="font-medium text-sm text-gray-900 hover:text-blue-600 transition-colors">{task.title}</h4></div><Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0"><MoreVertical className="h-3 w-3" /></Button></div><div className="flex items-center gap-2"><span className="font-medium text-xs text-blue-600 hover:underline">{task.issue_key}</span>{task.type && (<Badge className={`${getTypeColor(task.type)} border-0 text-xs font-normal`}>{task.type.charAt(0).toUpperCase() + task.type.slice(1)}</Badge>)}</div><div className="flex items-center justify-between pt-2"><span className={`text-xs font-medium ${getPriorityColor(task.priority || 'medium')}`}>{task.priority ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1) : 'Medium'}</span>{task.assignee_name && (<div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">{task.assignee_name.split(' ').map(n => n[0]).join('')}</div>)}</div></CardContent></Card>))}{columnTasks.length === 0 && (<div className="text-center py-12 text-gray-400 text-sm">Drop tasks here</div>)}</div></div></div>)})}</div>)}</div></div></DashboardLayout>)
}
