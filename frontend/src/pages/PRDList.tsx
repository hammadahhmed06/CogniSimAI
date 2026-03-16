import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FileText,
  Plus,
  Search,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Loader2,
  Eye,
} from 'lucide-react'

import { prdService } from '@/lib/api/prdService'
import { STATUS_COLORS, STATUS_LABELS } from '@/components/prd'
import { PRDQualityBadge } from '@/components/prd/PRDQualityBadge'
import { PRDTemplateGallery } from '@/components/prd/PRDTemplateGallery'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STATUS_ICONS: Record<string, any> = {
  draft: Clock,
  in_review: Eye,
  changes_requested: AlertTriangle,
  approved: CheckCircle2,
  archived: Archive,
}

function timeAgo(dateStr?: string): string {
  if (!dateStr) return 'Unknown'
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = Math.max(0, now - then)
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PRDListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data: prds = [], isLoading } = useQuery({
    queryKey: ['prds'],
    queryFn: () => prdService.list(),
  })

  const filtered = useMemo(() => {
    let list = prds
    if (statusFilter !== 'all') {
      list = list.filter(p => p.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p => p.title.toLowerCase().includes(q))
    }
    // Sort by updated_at desc
    return [...list].sort((a, b) => {
      const da = new Date(b.updated_at || b.created_at).getTime()
      const db = new Date(a.updated_at || a.created_at).getTime()
      return da - db
    })
  }, [prds, statusFilter, search])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: prds.length }
    for (const p of prds) {
      counts[p.status] = (counts[p.status] || 0) + 1
    }
    return counts
  }, [prds])

  return (
    <DashboardLayout>
      <div className="container py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">PRD Documents</h1>
            <p className="text-muted-foreground">
              Manage your product requirement documents
            </p>
          </div>
          <Button onClick={() => navigate('/dashboard/agents/prd-generator')}>
            <Plus className="w-4 h-4 mr-2" />
            Generate New PRD
          </Button>
        </div>

        {/* Tabs: My PRDs / Templates */}
        <Tabs defaultValue="prds" className="space-y-4">
          <TabsList>
            <TabsTrigger value="prds">My PRDs</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="prds" className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search PRDs..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Statuses ({statusCounts.all || 0})
                  </SelectItem>
                  {['draft', 'in_review', 'changes_requested', 'approved', 'archived'].map(s => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s] || s} ({statusCounts[s] || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

        {/* PRD Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            Loading PRDs...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-medium">No PRDs Found</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {search || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Generate your first PRD to get started'}
              </p>
              {!search && statusFilter === 'all' && (
                <Button
                  className="mt-4"
                  onClick={() => navigate('/dashboard/agents/prd-generator')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Generate PRD
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((prd, idx) => {
                const StatusIcon = STATUS_ICONS[prd.status] || Clock
                return (
                  <motion.div
                    key={prd.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className="hover:border-primary/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/dashboard/agents/prd-generator?prd_id=${prd.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base line-clamp-2 group-hover:text-primary transition-colors">
                            {prd.title}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={`shrink-0 ml-2 text-xs ${STATUS_COLORS[prd.status] || ''}`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {STATUS_LABELS[prd.status] || prd.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardFooter className="pt-0 pb-4 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Updated {timeAgo(prd.updated_at || prd.created_at)}
                        </span>
                        {prd.overall_quality_score != null && prd.overall_quality_score > 0 && (
                          <PRDQualityBadge score={prd.overall_quality_score} variant="compact" />
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
          </TabsContent>

          <TabsContent value="templates">
            <PRDTemplateGallery />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
