# Enterprise PRD System — Complete Implementation Plan

> **Date:** February 23, 2026  
> **Scope:** 8 Phases, 35+ Tasks  
> **Goal:** Transform the PRD agent from a single-user generator into an enterprise-grade requirements management system  

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                       │
│                                                                      │
│  ┌──────────┐  ┌─────────────┐  ┌──────────┐  ┌─────────────────┐  │
│  │ PRD List  │  │ PRD Wizard  │  │ PRD      │  │ Template        │  │
│  │ Page      │  │ (Refactored)│  │ Review & │  │ Gallery &       │  │
│  │ (NEW)     │  │             │  │ Collab   │  │ Builder (NEW)   │  │
│  │           │  │ InputForm   │  │ (NEW)    │  │                 │  │
│  │ • History │  │ Progress    │  │ Comments │  │ • Industry      │  │
│  │ • Filter  │  │ ReviewPanel │  │ Approvals│  │ • Custom        │  │
│  │ • Status  │  │ ExportPanel │  │ Assign   │  │ • Compliance    │  │
│  └──────────┘  │ VersionPanel│  └──────────┘  └─────────────────┘  │
│                │ EditPanel   │                                       │
│                └─────────────┘                                       │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              Shared Components                                │    │
│  │  SectionEditor │ DiffViewer │ QualityBadge │ FeatureMapper   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │              API Services                                     │    │
│  │  prdService │ prdVersionService │ prdCollabService (NEW)     │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (FastAPI)                                 │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Routes                                                       │    │
│  │  /api/prd/* │ /api/prd/{id}/create-backlog (NEW)             │    │
│  │  /api/prd/{id}/comments (NEW)                                │    │
│  │  /api/prd/{id}/reviewers (NEW)                               │    │
│  │  /api/prd/{id}/export/jira (IMPLEMENT)                       │    │
│  │  /api/prd/templates (EXPAND)                                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Agents                                                       │    │
│  │  Discovery │ Personas │ Features │ Technical │ Risks │ Timeline│   │
│  │  Coherence │ (all Gemini-only)                               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │  Models                                                       │    │
│  │  PRDDocument │ PRDComment (NEW) │ PRDReviewer (NEW)          │    │
│  │  PRDTemplate (EXPAND) │ BacklogMapping (NEW)                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      DATABASE (Supabase)                             │
│                                                                      │
│  Existing: prd_documents │ prd_audit_log │ prd_versions             │
│  Existing: issues │ issue_activity │ issue_dependencies             │
│  NEW: prd_comments │ prd_reviewers │ prd_templates (custom)        │
│  MODIFY: issues (add prd_id, prd_feature_id columns)               │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Cleanup & Foundation

### 1.1 Remove Confluence from Frontend UI

**Files:** `frontend/src/pages/PRDGenerator.tsx`

| Task | Detail |
|------|--------|
| Remove `useConfluence` state | Delete `const [useConfluence, setUseConfluence] = useState(false)` at L487 |
| Remove `confluence_space_key` from input type | Delete from `PRDInput` interface at L62 |
| Remove Confluence toggle in input form | Delete the entire `<Collapsible>` block for Confluence at L927-L947 |
| Remove Confluence from `handleGenerate` payload | Remove the spread at L559: `...(useConfluence && input.confluence_space_key ...)` |

### 1.2 Remove Confluence from Backend

**Files:** `cognisim_ai_backend/app/api/routes/prd.py`, `cognisim_ai_backend/app/models/prd_models.py`

| Task | Detail |
|------|--------|
| Remove `CONFLUENCE` from `ExportFormat` enum | Delete `CONFLUENCE = "confluence"` from `prd_models.py` L72 |
| Remove Confluence export 501 handler | Delete `elif format == ExportFormat.CONFLUENCE:` block in `prd.py` L917-918 |
| Remove `confluence_page_ids` from `PRDInput` | Delete field from `prd_models.py` L117-119 |
| Remove `confluence_page_ids` from `PRDGenerateRequest` | Delete field from `prd.py` L65 |
| Remove `atlassian_integration_id` from `PRDGenerateRequest` | Delete field from `prd.py` L66 |
| Remove `ConfluenceContext` model | Delete from `prd_models.py` L683-686 |
| Drop `confluence` from `EnrichedContext` | Remove `confluence: Optional[ConfluenceContext]` field |
| Clean `_save_prd_document` | Remove `confluence_space_key` insert field (L226) |

### 1.3 Clean Backend PRD Generate Request

**File:** `cognisim_ai_backend/app/api/routes/prd.py`

Remove unused/non-functional context fields:
- Keep: `jira_epic_key`, `jira_integration_id`, `slack_channel_ids`, `slack_integration_id`, `github_repo`
- Remove: `confluence_page_ids`, `atlassian_integration_id`

---

## Phase 2: PRD UI Overhaul — Enterprise Clean Design

### 2.1 Component Architecture (Split the 1550-line Monolith)

**Current:** Single `PRDGenerator.tsx` (1550 lines) handles everything.  
**Target:** Modular component tree:

```
frontend/src/pages/PRDGenerator.tsx          (≤ 200 lines — orchestrator only)
frontend/src/components/prd/
├── PRDInputForm.tsx                          (Input step — problem, users, context)
├── PRDProgressView.tsx                       (Generating step — progress bar)
├── PRDReviewPanel.tsx                        (Review step — section nav + content)
├── PRDExportPanel.tsx                        (Export step — actions + create backlog)
├── PRDSectionRenderer.tsx                    (Individual section rendering)
├── PRDSectionEditor.tsx                      (Inline markdown editing — Phase 3)
├── PRDVersionTimeline.tsx                    (Version history sidebar — Phase 4)
├── PRDDiffViewer.tsx                         (Side-by-side diff — Phase 4)
├── PRDQualityBadge.tsx                       (Section-level quality scores)
├── PRDFeatureToIssueDialog.tsx               (Feature → Issue mapper — Phase 5)
├── PRDCommentThread.tsx                      (Section comments — Phase 7)
├── PRDReviewerAssignment.tsx                 (Reviewer management — Phase 7)
└── PRDTemplateGallery.tsx                    (Template browser — Phase 8)
```

### 2.2 PRDInputForm Component

**Clean enterprise-grade input form with:**

```tsx
// Structured layout with clear visual hierarchy

<Card className="border-0 shadow-sm">
  <CardHeader>
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div>
        <CardTitle>New PRD</CardTitle>
        <CardDescription>Define the product requirements</CardDescription>
      </div>
    </div>
  </CardHeader>
  
  <CardContent className="space-y-6">
    {/* Product Name — prominent top field */}
    <FormField label="Product Name" optional>
      <Input placeholder="e.g., Customer Portal v2.0" />
    </FormField>
    
    {/* Problem Statement — large textarea with character count */}
    <FormField label="Problem Statement" required charCount min={50} max={5000}>
      <Textarea rows={6} placeholder="Describe the user pain points..." />
    </FormField>
    
    {/* Target Users — tag-style input */}
    <FormField label="Target Users" required hint="At least 2 user types">
      <TagInput placeholder="Add user type and press Enter..." />
    </FormField>
    
    {/* Success Metrics — structured repeatable fields */}
    <FormField label="Success Metrics" optional>
      <Textarea rows={3} placeholder="Define measurable success criteria..." />
    </FormField>
    
    {/* Constraints */}
    <FormField label="Constraints" optional>
      <Textarea rows={3} placeholder="Budget, timeline, technical limitations..." />
    </FormField>
    
    {/* Context Sources — collapsible section */}
    <ContextSourcesSection>
      <JiraContextToggle />      {/* Keep */}
      <SlackContextToggle />     {/* Keep */}
      <GitHubContextToggle />    {/* NEW — for github_repo field */}
    </ContextSourcesSection>
    
    {/* Generation Options — advanced toggle */}
    <AdvancedOptions>
      <Slider label="Max Features" min={3} max={25} default={10} />
      <Switch label="Include Technical Requirements" default={true} />
      <TemplateSelector />       {/* NEW — template version picker */}
    </AdvancedOptions>
  </CardContent>
  
  <CardFooter>
    <Button size="lg" className="w-full">
      <Sparkles className="mr-2 h-4 w-4" />
      Generate PRD
    </Button>
  </CardFooter>
</Card>
```

### 2.3 PRDReviewPanel Component

**Enterprise-grade review experience:**

```tsx
<div className="flex h-[calc(100vh-12rem)]">
  {/* Left Nav — Section list with quality indicators */}
  <aside className="w-64 border-r bg-muted/30 p-4 space-y-1">
    {sections.map(section => (
      <button
        key={section.id}
        onClick={() => setActiveSection(section.id)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm",
          "transition-all hover:bg-muted",
          activeSection === section.id && "bg-primary/10 text-primary font-medium"
        )}
      >
        <div className="flex items-center gap-2">
          <section.icon className="h-4 w-4" />
          <span>{section.label}</span>
        </div>
        
        {/* Quality score badge — NEW */}
        <PRDQualityBadge score={sectionScores[section.id]} />
      </button>
    ))}
    
    {/* Overall Quality Score */}
    <div className="mt-6 p-4 rounded-lg border bg-card">
      <p className="text-xs text-muted-foreground mb-1">Overall Quality</p>
      <div className="flex items-center gap-2">
        <Progress value={qualityScore} className="flex-1" />
        <span className="text-sm font-bold">{qualityScore}/100</span>
      </div>
    </div>
    
    {/* Version History button — NEW */}
    <Button variant="outline" className="w-full mt-4" onClick={toggleVersionPanel}>
      <History className="mr-2 h-4 w-4" />
      Version History
    </Button>
  </aside>
  
  {/* Main Content */}
  <main className="flex-1 overflow-y-auto p-6">
    {/* Section Header with Edit/Regenerate actions */}
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-semibold">{activeSection.label}</h2>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={toggleEdit}>
          <Pencil className="mr-2 h-3 w-3" />
          {isEditing ? 'Preview' : 'Edit'}
        </Button>
        <Button variant="outline" size="sm" onClick={handleRegenerate}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Regenerate
        </Button>
      </div>
    </div>
    
    {/* Content (view or edit mode) */}
    {isEditing ? (
      <PRDSectionEditor section={activeSection} onSave={handleSave} />
    ) : (
      <PRDSectionRenderer section={activeSection} data={sectionData} />
    )}
    
    {/* Section Comments — NEW */}
    <PRDCommentThread prdId={prdId} section={activeSection.id} />
  </main>
  
  {/* Version History Sidebar — conditionally shown */}
  {showVersions && (
    <PRDVersionTimeline prdId={prdId} onRestore={handleRestore} />
  )}
</div>
```

### 2.4 PRDExportPanel Component

**Enterprise export step with backlog conversion:**

```tsx
<div className="max-w-3xl mx-auto space-y-8">
  {/* PRD Summary Card */}
  <Card>
    <CardContent className="grid grid-cols-3 gap-4 p-6">
      <StatCard label="Features" value={featureCount} />
      <StatCard label="Quality Score" value={`${qualityScore}/100`} />
      <StatCard label="Est. Duration" value={totalDuration} />
    </CardContent>
  </Card>
  
  {/* Export Actions */}
  <div className="grid grid-cols-2 gap-4">
    <ExportCard
      icon={FileDown} title="Download Markdown"
      description="Full PRD in .md format"
      onClick={handleExportMarkdown}
    />
    <ExportCard
      icon={FileText} title="Download PDF"
      description="Formatted PDF document"
      onClick={handleExportPDF}
    />
    <ExportCard
      icon={Copy} title="Copy to Clipboard"
      description="Copy markdown to clipboard"
      onClick={handleCopy}
    />
    <ExportCard
      icon={ExternalLink} title="Push to Jira"    {/* PHASE 6 */}
      description="Create Jira epic with stories"
      onClick={handleJiraExport}
      badge="Enterprise"
    />
  </div>
  
  {/* PRD → Issues Conversion — NEW (Phase 5) */}
  <Card className="border-primary/20">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-primary" />
        Create Backlog from PRD
      </CardTitle>
      <CardDescription>
        Convert {featureCount} features into actionable issues in your backlog
      </CardDescription>
    </CardHeader>
    <CardContent>
      <PRDFeatureToIssueDialog
        features={prdDocument.sections.features}
        onCreateBacklog={handleCreateBacklog}
      />
    </CardContent>
  </Card>
  
  {/* Approval */}
  <div className="flex justify-end gap-3">
    <Button variant="outline" onClick={handleRequestReview}>
      <UserPlus className="mr-2 h-4 w-4" />
      Request Review
    </Button>
    <Button onClick={handleApprove} className="bg-green-600 hover:bg-green-700">
      <CheckCircle className="mr-2 h-4 w-4" />
      Approve PRD
    </Button>
  </div>
</div>
```

### 2.5 Section-Level Quality Scores in UI

**File:** New component `frontend/src/components/prd/PRDQualityBadge.tsx`

```tsx
// Color-coded quality badge per section
// score >= 80 → green, >= 60 → yellow, < 60 → red

interface Props { score?: number }

export function PRDQualityBadge({ score }: Props) {
  if (score == null) return null
  
  const color = score >= 80 ? 'text-green-600 bg-green-50'
    : score >= 60 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50'
  
  return (
    <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded", color)}>
      {Math.round(score)}
    </span>
  )
}
```

**Backend change:** Ensure `section_scores` dict is returned in the PRD GET response — it's already stored by `_save_prd_document` but need to verify it's included in the API response shape.

---

## Phase 3: Inline Section Editing

### 3.1 Markdown Editor Component

**File:** `frontend/src/components/prd/PRDSectionEditor.tsx`

```tsx
// Simple markdown editor with live preview toggle
// Uses a plain <textarea> with monospace font for v1
// Can upgrade to @uiw/react-md-editor or Monaco later

interface Props {
  sectionId: string
  initialContent: string  // JSON stringified section data
  onSave: (sectionId: string, content: any) => Promise<void>
  onCancel: () => void
}

export function PRDSectionEditor({ sectionId, initialContent, onSave, onCancel }: Props) {
  const [content, setContent] = useState(initialContent)
  const [isSaving, setIsSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // For structured sections (personas, features), provide
  // field-level editing with add/remove capability
  
  // For text sections (executive_summary), provide
  // rich text fields for vision, problem_statement, solution_overview
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
          {showPreview ? <Code className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
      
      {showPreview ? (
        <PRDSectionRenderer section={sectionId} data={JSON.parse(content)} />
      ) : (
        <StructuredSectionEditor
          sectionId={sectionId}
          data={JSON.parse(content)}
          onChange={(data) => setContent(JSON.stringify(data))}
        />
      )}
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => { setIsSaving(true); onSave(sectionId, JSON.parse(content)) }}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}
```

### 3.2 Backend: Section Update Endpoint (Already Exists)

The endpoint `PATCH /api/prd/{prd_id}/sections/{section}` already exists in [prd.py](cognisim_ai_backend/app/api/routes/prd.py). Verify it:
- Accepts the new section data
- Creates a version snapshot before overwriting
- Logs an audit event
- Returns updated section

### 3.3 Auto-Versioning on Manual Edits

**Backend change:** In the section update handler (`PATCH /api/prd/{prd_id}/sections/{section}`), call the existing version creation logic before applying the edit:

```python
# Before applying the edit, snapshot current state
_create_version_snapshot(prd_id, user_id, change_summary=f"Manual edit: {section}")

# Then apply the update
# ... existing logic ...
```

### 3.4 Track Changes (AI-Generated vs Human-Edited)

**DB:** Add `edited_sections` JSONB column to `prd_documents`:
```json
{
  "executive_summary": {"edited_by": "user_id", "edited_at": "iso", "original_hash": "..."},
  "features": {"edited_by": "user_id", "edited_at": "iso", "original_hash": "..."}
}
```

**Frontend:** Show a small "Edited" badge next to sections that have been manually modified, with tooltip showing who edited and when.

---

## Phase 4: Version History UI

### 4.1 Version Timeline Sidebar

**File:** `frontend/src/components/prd/PRDVersionTimeline.tsx`

```tsx
interface Props {
  prdId: string
  onRestore: (versionNumber: number) => void
  onCompare: (v1: number, v2: number) => void
}

export function PRDVersionTimeline({ prdId, onRestore, onCompare }: Props) {
  const { data: versions } = useQuery({
    queryKey: ['prd-versions', prdId],
    queryFn: () => prdVersionService.listVersions(prdId),
  })
  
  return (
    <aside className="w-80 border-l bg-muted/30 p-4 overflow-y-auto">
      <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
        <History className="h-4 w-4" />
        Version History
      </h3>
      
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
        
        {versions?.map((version, i) => (
          <div key={version.id} className="relative pl-8 pb-6">
            {/* Timeline dot */}
            <div className={cn(
              "absolute left-1.5 w-3 h-3 rounded-full border-2",
              i === 0 ? "bg-primary border-primary" : "bg-background border-muted-foreground"
            )} />
            
            {/* Version card */}
            <div className="p-3 rounded-lg border bg-card hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">v{version.version_number}</span>
                <time className="text-xs text-muted-foreground">
                  {formatRelativeTime(version.created_at)}
                </time>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {version.change_summary || 'Version snapshot'}
              </p>
              
              {version.changed_sections && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {version.changed_sections.map(s => (
                    <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 text-xs"
                  onClick={() => onCompare(version.version_number, versions[0].version_number)}>
                  Compare
                </Button>
                {i > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-orange-600"
                    onClick={() => onRestore(version.version_number)}>
                    Restore
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
```

### 4.2 Side-by-Side Diff Viewer

**File:** `frontend/src/components/prd/PRDDiffViewer.tsx`

```tsx
interface Props {
  prdId: string
  versionA: number
  versionB: number
  onClose: () => void
}

export function PRDDiffViewer({ prdId, versionA, versionB, onClose }: Props) {
  const { data: comparison } = useQuery({
    queryKey: ['prd-compare', prdId, versionA, versionB],
    queryFn: () => prdVersionService.compareVersions(prdId, versionA, versionB),
  })
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compare v{versionA} → v{versionB}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {comparison?.differences.map((diff, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <div className="bg-muted px-4 py-2 text-sm font-medium">
                {diff.section} / {diff.field}
              </div>
              <div className="grid grid-cols-2 divide-x">
                <div className="p-4 bg-red-50/50">
                  <p className="text-xs text-muted-foreground mb-1">v{versionA}</p>
                  <pre className="text-sm whitespace-pre-wrap">{formatValue(diff.old_value)}</pre>
                </div>
                <div className="p-4 bg-green-50/50">
                  <p className="text-xs text-muted-foreground mb-1">v{versionB}</p>
                  <pre className="text-sm whitespace-pre-wrap">{formatValue(diff.new_value)}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

### 4.3 Restore with Confirmation

```tsx
// Confirmation dialog before restoring a version
<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="outline" size="sm">Restore v{n}</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Restore Version {n}?</AlertDialogTitle>
      <AlertDialogDescription>
        This will create a new version from v{n}'s snapshot.
        Your current content will be preserved as a version in history.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleRestore(n)}>
        Restore
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Phase 5: PRD → Issues Pipeline

### 5.1 Database Migration

**File:** `cognisim_ai_backend/supabase/migrations/YYYYMMDDTHHMMSS_add_prd_tracking_to_issues.sql`

```sql
-- Add PRD traceability columns to issues table
ALTER TABLE issues
  ADD COLUMN IF NOT EXISTS prd_id UUID REFERENCES prd_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS prd_feature_id TEXT;

-- Index for querying issues by PRD
CREATE INDEX IF NOT EXISTS idx_issues_prd_id ON issues(prd_id) WHERE prd_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN issues.prd_id IS 'Source PRD document that generated this issue';
COMMENT ON COLUMN issues.prd_feature_id IS 'Feature ID within the PRD (e.g., F1, F2)';
```

### 5.2 Backend: Create Backlog Endpoint

**File:** `cognisim_ai_backend/app/api/routes/prd.py` — Add new endpoint

```python
class CreateBacklogRequest(BaseModel):
    """Request to create backlog issues from PRD features."""
    feature_ids: Optional[List[str]] = None  # None = all features
    project_id: Optional[UUID] = None        # Target project
    auto_assign: bool = False                 # Auto-assign based on personas
    include_acceptance_criteria: bool = True
    
class BacklogCreationResult(BaseModel):
    """Result of backlog creation."""
    created_count: int
    issues: List[Dict[str, Any]]  # issue_id, issue_key, feature_id, title
    skipped: List[str]            # Feature IDs that were skipped (e.g., already exist)


PRIORITY_MAP = {
    "P0": "critical",
    "P1": "high",
    "P2": "medium",
    "P3": "low",
}

EFFORT_TO_POINTS = {
    "S": 1,
    "M": 3,
    "L": 5,
    "XL": 8,
    "XXL": 13,
}


@router.post("/{prd_id}/create-backlog")
async def create_backlog_from_prd(
    prd_id: UUID,
    request: CreateBacklogRequest,
    current_user: UserModel = Depends(get_current_user),
    wctx: WorkspaceContext = Depends(get_workspace_context),
) -> BacklogCreationResult:
    """Convert PRD features into backlog issues."""
    workspace_id = wctx.workspace_id
    
    # 1. Fetch the PRD
    prd_data = _get_prd_document(prd_id, current_user.id, workspace_id)
    
    # 2. Extract features
    sections = prd_data.get("sections", {})
    features_raw = sections.get("features", prd_data.get("feature_specifications", []))
    if not features_raw:
        raise HTTPException(status_code=400, detail="No features found in PRD")
    
    # 3. Filter to requested features (if specified)
    if request.feature_ids:
        features_raw = [f for f in features_raw if f.get("id") in request.feature_ids]
    
    # 4. Check which features already have issues
    existing = supabase.table("issues").select("prd_feature_id") \
        .eq("prd_id", str(prd_id)) \
        .execute()
    existing_feature_ids = {r["prd_feature_id"] for r in (existing.data or [])}
    
    # 5. Map features to issues
    created_issues = []
    skipped = []
    
    for feature in features_raw:
        fid = feature.get("id", "")
        if fid in existing_feature_ids:
            skipped.append(fid)
            continue
        
        # Map acceptance criteria
        ac_list = []
        if request.include_acceptance_criteria:
            for ac in feature.get("acceptance_criteria", []):
                if isinstance(ac, str):
                    ac_list.append({"text": ac, "done": False})
                elif isinstance(ac, dict):
                    text = ac.get("description", ac.get("text", ""))
                    if ac.get("given") and ac.get("when") and ac.get("then"):
                        text = f"Given {ac['given']}, When {ac['when']}, Then {ac['then']}"
                    ac_list.append({"text": text, "done": False})
        
        # Build issue description
        desc_parts = [feature.get("description", "")]
        if feature.get("user_value"):
            desc_parts.append(f"\n**User Value:** {feature['user_value']}")
        if feature.get("target_personas"):
            desc_parts.append(f"\n**Target Personas:** {', '.join(feature['target_personas'])}")
        if feature.get("out_of_scope"):
            desc_parts.append(f"\n**Out of Scope:** {', '.join(feature['out_of_scope'])}")
        
        # Map effort estimate to story points
        effort = (feature.get("estimated_effort") or "M").upper()
        story_points = EFFORT_TO_POINTS.get(effort, 3)
        
        # Map priority
        priority_raw = feature.get("priority", "P2")
        priority = PRIORITY_MAP.get(priority_raw, "medium")
        
        issue_payload = {
            "id": str(uuid4()),
            "issue_key": f"PRD-{fid}",  # Will be overwritten by DB trigger
            "title": feature.get("title", f"Feature {fid}"),
            "description": "\n".join(desc_parts),
            "type": "story",
            "priority": priority,
            "status": "todo",
            "story_points": story_points,
            "acceptance_criteria": ac_list,
            "workspace_id": str(workspace_id),
            "project_id": str(request.project_id) if request.project_id else None,
            "prd_id": str(prd_id),
            "prd_feature_id": fid,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        try:
            result = supabase.table("issues").insert(issue_payload).execute()
            if result.data:
                created_issues.append({
                    "issue_id": result.data[0]["id"],
                    "issue_key": result.data[0].get("issue_key", issue_payload["issue_key"]),
                    "feature_id": fid,
                    "title": feature.get("title", ""),
                })
        except Exception as e:
            logger.error(f"Failed to create issue for feature {fid}: {e}")
            skipped.append(fid)
    
    # 6. Log audit event
    _log_audit_event(
        prd_id=prd_id,
        action="create_backlog",
        user_id=current_user.id,
        user_email=current_user.email,
        new_value={"created": len(created_issues), "skipped": skipped},
    )
    
    return BacklogCreationResult(
        created_count=len(created_issues),
        issues=created_issues,
        skipped=skipped,
    )
```

### 5.3 Frontend: Feature → Issue Mapping Dialog

**File:** `frontend/src/components/prd/PRDFeatureToIssueDialog.tsx`

```tsx
interface FeatureSpec {
  id: string
  title: string
  priority: string
  estimated_effort?: string
  acceptance_criteria: string[]
  description: string
}

interface Props {
  prdId: string
  features: FeatureSpec[]
  onSuccess: (result: BacklogCreationResult) => void
}

export function PRDFeatureToIssueDialog({ prdId, features, onSuccess }: Props) {
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(
    new Set(features.map(f => f.id))
  )
  const [projectId, setProjectId] = useState<string>('')
  const [isCreating, setIsCreating] = useState(false)
  
  const priorityMap = { P0: 'critical', P1: 'high', P2: 'medium', P3: 'low' }
  const effortMap = { S: '1 SP', M: '3 SP', L: '5 SP', XL: '8 SP' }
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="w-full" size="lg">
          <Layers className="mr-2 h-4 w-4" />
          Create {features.length} Issues from Features
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Backlog from PRD Features</DialogTitle>
          <DialogDescription>
            Select which features to convert into issues. Each feature
            becomes a story with acceptance criteria.
          </DialogDescription>
        </DialogHeader>
        
        {/* Project selector */}
        <div className="mb-4">
          <Label>Target Project (optional)</Label>
          <ProjectSelector value={projectId} onChange={setProjectId} />
        </div>
        
        {/* Feature checklist with preview */}
        <div className="space-y-2">
          {features.map(feature => (
            <div
              key={feature.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                selectedFeatures.has(feature.id) 
                  ? "border-primary/30 bg-primary/5" 
                  : "opacity-50"
              )}
            >
              <Checkbox
                checked={selectedFeatures.has(feature.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selectedFeatures)
                  checked ? next.add(feature.id) : next.delete(feature.id)
                  setSelectedFeatures(next)
                }}
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{feature.title}</span>
                  <Badge variant={feature.priority === 'P0' ? 'destructive' : 'secondary'}>
                    {feature.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    → {priorityMap[feature.priority]} · {effortMap[feature.estimated_effort || 'M']}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {feature.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {feature.acceptance_criteria.length} acceptance criteria
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {selectedFeatures.size} of {features.length} features selected
            </p>
            <Button
              onClick={handleCreate}
              disabled={selectedFeatures.size === 0 || isCreating}
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create {selectedFeatures.size} Issues
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### 5.4 Frontend API Service Addition

**File:** `frontend/src/lib/api/prdService.ts` — Add method

```typescript
createBacklog: async (
  prdId: string,
  opts: {
    feature_ids?: string[]
    project_id?: string
    include_acceptance_criteria?: boolean
  } = {}
): Promise<{
  created_count: number
  issues: { issue_id: string; issue_key: string; feature_id: string; title: string }[]
  skipped: string[]
}> => {
  return apiFetch(apiBase(`/api/prd/${prdId}/create-backlog`), {
    method: 'POST',
    body: JSON.stringify(opts),
  })
},
```

---

## Phase 6: Jira Export

### 6.1 Backend: Implement Jira Export

**File:** `cognisim_ai_backend/app/api/routes/prd.py` — Replace the 501 stub

```python
elif format == ExportFormat.JIRA:
    # Create a Jira epic from the PRD, then stories for each feature
    from app.services.jira_service import get_jira_client
    
    # Get user's Jira integration
    jira_integration = supabase.table("integrations") \
        .select("*") \
        .eq("workspace_id", str(workspace_id)) \
        .eq("provider", "jira") \
        .eq("status", "active") \
        .single().execute()
    
    if not jira_integration.data:
        raise HTTPException(status_code=400, detail="No active Jira integration found")
    
    jira = get_jira_client(jira_integration.data)
    
    # Create epic
    epic = jira.create_issue(
        project=request.jira_project_key,
        summary=data.get("title", "PRD"),
        description=_export_to_markdown(data),
        issuetype={"name": "Epic"},
    )
    
    # Create stories for each feature
    features = sections.get("features", [])
    stories = []
    for feature in features:
        story = jira.create_issue(
            project=request.jira_project_key,
            summary=feature.get("title"),
            description=_format_feature_for_jira(feature),
            issuetype={"name": "Story"},
            parent={"key": epic.key},
        )
        stories.append({"key": story.key, "feature_id": feature.get("id")})
    
    return Response(
        content=json.dumps({
            "epic_key": epic.key,
            "stories": stories,
            "total_created": len(stories) + 1,
        }),
        media_type="application/json",
    )
```

### 6.2 Frontend: Jira Export Configuration Dialog

```tsx
// Dialog asking for Jira project key before exporting
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Export to Jira</DialogTitle>
    </DialogHeader>
    
    <div className="space-y-4">
      <div>
        <Label>Jira Project</Label>
        <Select value={jiraProjectKey} onValueChange={setJiraProjectKey}>
          {jiraProjects.map(p => (
            <SelectItem key={p.key} value={p.key}>{p.name} ({p.key})</SelectItem>
          ))}
        </Select>
      </div>
      
      <div className="p-3 rounded-lg bg-muted">
        <p className="text-sm font-medium">Will create:</p>
        <ul className="text-sm text-muted-foreground mt-1 space-y-1">
          <li>• 1 Epic: {prdTitle}</li>
          <li>• {featureCount} Stories (one per feature)</li>
          <li>• Acceptance criteria mapped to each story</li>
        </ul>
      </div>
    </div>
    
    <DialogFooter>
      <Button onClick={handleJiraExport}>
        <ExternalLink className="mr-2 h-4 w-4" />
        Push to Jira
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Phase 7: Collaborative Review Workflow

### 7.1 Database: PRD Comments + Reviewers Tables

**File:** `cognisim_ai_backend/supabase/migrations/YYYYMMDDTHHMMSS_add_prd_collaboration.sql`

```sql
-- PRD Comments (threaded, section-scoped)
CREATE TABLE IF NOT EXISTS prd_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID NOT NULL REFERENCES prd_documents(id) ON DELETE CASCADE,
  section TEXT,                   -- NULL = document-level comment
  parent_id UUID REFERENCES prd_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  author_email TEXT,
  body TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_prd_comments_prd ON prd_comments(prd_id);
CREATE INDEX idx_prd_comments_section ON prd_comments(prd_id, section);

-- PRD Reviewers (assignment + approval tracking)
CREATE TABLE IF NOT EXISTS prd_reviewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID NOT NULL REFERENCES prd_documents(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewer_email TEXT,
  role TEXT DEFAULT 'reviewer',    -- 'reviewer', 'approver'
  status TEXT DEFAULT 'pending',   -- 'pending', 'approved', 'changes_requested'
  feedback TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(prd_id, reviewer_id)
);

CREATE INDEX idx_prd_reviewers_prd ON prd_reviewers(prd_id);
```

### 7.2 Backend: PRD Collaboration Routes

**File:** `cognisim_ai_backend/app/api/routes/prd.py` — Add endpoints

```python
# ═══════════════════════════════════════════════════════════════════
# COLLABORATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

class PRDCommentCreate(BaseModel):
    section: Optional[str] = None
    parent_id: Optional[UUID] = None
    body: str = Field(..., min_length=1, max_length=5000)

class PRDCommentResponse(BaseModel):
    id: UUID
    prd_id: UUID
    section: Optional[str]
    parent_id: Optional[UUID]
    author_id: UUID
    author_email: Optional[str]
    body: str
    resolved: bool
    created_at: str
    replies: List["PRDCommentResponse"] = []

class PRDReviewerAssign(BaseModel):
    reviewer_email: str
    role: str = "reviewer"  # reviewer | approver

class PRDReviewResponse(BaseModel):
    status: str  # approved | changes_requested
    feedback: Optional[str] = None


@router.get("/{prd_id}/comments")
async def list_prd_comments(prd_id: UUID, section: Optional[str] = None, ...):
    """List comments for a PRD, optionally filtered by section."""
    ...

@router.post("/{prd_id}/comments")
async def add_prd_comment(prd_id: UUID, body: PRDCommentCreate, ...):
    """Add a comment to a PRD section."""
    ...

@router.patch("/{prd_id}/comments/{comment_id}/resolve")
async def resolve_comment(prd_id: UUID, comment_id: UUID, ...):
    """Mark a comment as resolved."""
    ...

@router.get("/{prd_id}/reviewers")
async def list_reviewers(prd_id: UUID, ...):
    """List assigned reviewers for a PRD."""
    ...

@router.post("/{prd_id}/reviewers")
async def assign_reviewer(prd_id: UUID, body: PRDReviewerAssign, ...):
    """Assign a reviewer to the PRD."""
    ...

@router.post("/{prd_id}/reviewers/{reviewer_id}/respond")
async def reviewer_respond(prd_id: UUID, reviewer_id: UUID, body: PRDReviewResponse, ...):
    """Reviewer submits their approval or change request."""
    ...
```

### 7.3 Frontend: Comment Thread Component

**File:** `frontend/src/components/prd/PRDCommentThread.tsx`

```tsx
interface Props {
  prdId: string
  section?: string
}

export function PRDCommentThread({ prdId, section }: Props) {
  // Collapsible comment thread at the bottom of each section
  // Shows comment count badge, sorted newest-first
  // Reply support (1 level), resolve/unresolve toggle
  // Thread indicator for each comment
  
  return (
    <div className="mt-8 pt-6 border-t">
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4" />
          <span>{comments.length} Comments</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4">
          {/* New comment input */}
          <div className="flex gap-2">
            <Textarea placeholder="Add a comment..." rows={2} />
            <Button size="sm">Post</Button>
          </div>
          
          {/* Comment list */}
          {comments.map(comment => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
```

### 7.4 Frontend: Reviewer Assignment UI

**File:** `frontend/src/components/prd/PRDReviewerAssignment.tsx`

```tsx
// Appears in the Export/Actions panel
// Dropdown to select team members → assign as reviewer or approver
// Shows assigned reviewers with their status (pending/approved/changes_requested)
// When all required approvers approve → status auto-updates to "approved"
```

### 7.5 Status Workflow Enhancement

**Update `PRDStatus` enum** in `prd_models.py`:

```python
class PRDStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    IN_REVIEW = "in_review"
    CHANGES_REQUESTED = "changes_requested"  # NEW
    APPROVED = "approved"
    ARCHIVED = "archived"
```

The frontend status badge should reflect the workflow:
- `draft` → gray
- `generating` → blue + spinner
- `in_review` → yellow
- `changes_requested` → orange
- `approved` → green
- `archived` → muted

---

## Phase 8: PRD List Page & Template System

### 8.1 PRD List/History Page

**File:** `frontend/src/pages/PRDList.tsx` (NEW)

```tsx
// New route: /dashboard/agents/prd-generator → shows list (when PRDs exist)
// or redirect to /dashboard/agents/prd-generator/new for creation

export default function PRDListPage() {
  const { data: prds } = useQuery({
    queryKey: ['prds'],
    queryFn: () => prdService.list(),
  })
  
  return (
    <DashboardLayout>
      <PageHeader
        title="PRD Documents"
        description="Product Requirements Documents generated by AI"
        action={
          <Button asChild>
            <Link to="/dashboard/agents/prd-generator/new">
              <Plus className="mr-2 h-4 w-4" />
              New PRD
            </Link>
          </Button>
        }
      />
      
      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <StatusFilter />
        <SearchInput placeholder="Search PRDs..." />
        <DateRangeFilter />
      </div>
      
      {/* PRD Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prds?.items.map(prd => (
          <Link key={prd.id} to={`/dashboard/agents/prd-generator/${prd.id}`}>
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <PRDStatusBadge status={prd.status} />
                  <time className="text-xs text-muted-foreground">
                    {formatDate(prd.created_at)}
                  </time>
                </div>
                <CardTitle className="text-base mt-2 line-clamp-2">
                  {prd.title || 'Untitled PRD'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {prd.section_count} sections
                    </span>
                  </div>
                  {prd.quality_score && (
                    <PRDQualityBadge score={prd.quality_score} />
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </DashboardLayout>
  )
}
```

**Routing updates in `App.tsx`:**
```tsx
<Route path="/dashboard/agents/prd-generator" element={<PRDListPage />} />
<Route path="/dashboard/agents/prd-generator/new" element={<PRDGeneratorPage />} />
<Route path="/dashboard/agents/prd-generator/:prdId" element={<PRDGeneratorPage />} />  {/* View/Edit existing */}
```

### 8.2 Custom Template Builder

**Database:**
```sql
CREATE TABLE IF NOT EXISTS prd_templates_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0',
  sections JSONB NOT NULL,        -- Array of section definitions
  required_sections TEXT[],
  compliance_standards TEXT[],
  industry TEXT,                   -- 'saas', 'healthcare', 'fintech', etc.
  is_public BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Backend endpoint:**
```python
@router.post("/templates")
async def create_template(...) -> PRDTemplate:
    """Create a custom PRD template for the workspace."""
    ...

@router.get("/templates")  
async def list_templates(...) -> List[PRDTemplate]:
    """List built-in + custom templates for the workspace."""
    # Return built-in templates + workspace custom templates
    ...
```

### 8.3 Template Gallery UI

**File:** `frontend/src/components/prd/PRDTemplateGallery.tsx`

```tsx
// Shows a grid of template cards (built-in + custom)
// Each card shows: name, description, section count, industry tag
// "Use Template" button → pre-fills template_version in the input form
// "Create Custom" button → opens template builder

export function PRDTemplateGallery({ onSelectTemplate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map(template => (
        <Card key={template.version} className="hover:border-primary/50 transition-colors cursor-pointer">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">{template.version}</Badge>
              {template.industry && <Badge>{template.industry}</Badge>}
            </div>
            <CardTitle className="text-base">{template.name}</CardTitle>
            <CardDescription>{template.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              {template.sections.length} sections · 
              {template.compliance_standards.length} compliance standards
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => onSelectTemplate(template)}>
              Use Template
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
```

---

## Global UI Improvements (Cross-Cutting)

### Sidebar Enhancement

**File:** `frontend/src/components/app-sidebar.tsx`

Add "PRDs" as a top-level nav item (not buried under AI Agents):

```tsx
const primaryNav: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Projects", url: "/dashboard/projects", icon: FolderKanban },
  { title: "Issues", url: "/dashboard/issues", icon: Bug },
  { title: "PRDs", url: "/dashboard/agents/prd-generator", icon: FileText },  // NEW
]
```

### Toast Notifications for Long Operations

Replace `console.error` with `toast.error()` / `toast.success()` throughout the PRD wizard:
- "PRD generated successfully" + quality score
- "X issues created from PRD"
- "Version restored to v{n}"
- "Comment posted" 
- "Review requested from {name}"

### Loading States

Replace raw spinners with skeleton loading patterns:
- Section content skeletons during regeneration
- Card skeletons on PRD list page
- Version list skeletons

### Error Boundaries

Wrap PRD components in error boundaries with retry capability:
```tsx
<ErrorBoundary fallback={<PRDErrorState onRetry={refetch} />}>
  <PRDReviewPanel ... />
</ErrorBoundary>
```

---

## File Change Summary

### New Files to Create

| File | Phase | Purpose |
|------|-------|---------|
| `frontend/src/components/prd/PRDInputForm.tsx` | 2 | Clean input form component |
| `frontend/src/components/prd/PRDProgressView.tsx` | 2 | Generation progress component |
| `frontend/src/components/prd/PRDReviewPanel.tsx` | 2 | Review step with section nav |
| `frontend/src/components/prd/PRDExportPanel.tsx` | 2 | Export actions + backlog creation |
| `frontend/src/components/prd/PRDSectionRenderer.tsx` | 2 | Section content rendering |
| `frontend/src/components/prd/PRDQualityBadge.tsx` | 2 | Quality score badge |
| `frontend/src/components/prd/PRDSectionEditor.tsx` | 3 | Inline markdown/structured editor |
| `frontend/src/components/prd/PRDVersionTimeline.tsx` | 4 | Version history sidebar |
| `frontend/src/components/prd/PRDDiffViewer.tsx` | 4 | Side-by-side diff viewer |
| `frontend/src/components/prd/PRDFeatureToIssueDialog.tsx` | 5 | Feature → Issue mapping dialog |
| `frontend/src/components/prd/PRDCommentThread.tsx` | 7 | Section-level comments |
| `frontend/src/components/prd/PRDReviewerAssignment.tsx` | 7 | Reviewer management |
| `frontend/src/components/prd/PRDTemplateGallery.tsx` | 8 | Template browser & builder |
| `frontend/src/pages/PRDList.tsx` | 8 | PRD document list page |
| `frontend/src/lib/api/prdCollabService.ts` | 7 | Collaboration API client |
| `cognisim_ai_backend/supabase/migrations/*_add_prd_tracking_to_issues.sql` | 5 | Issues DB migration |
| `cognisim_ai_backend/supabase/migrations/*_add_prd_collaboration.sql` | 7 | Comments & reviewers DB |
| `cognisim_ai_backend/supabase/migrations/*_add_prd_templates_custom.sql` | 8 | Custom templates DB |

### Files to Modify

| File | Phase | Changes |
|------|-------|---------|
| `frontend/src/pages/PRDGenerator.tsx` | 1, 2 | Remove Confluence, refactor into sub-components |
| `frontend/src/App.tsx` | 8 | Add PRD list + detail routes |
| `frontend/src/components/app-sidebar.tsx` | 2 | Add PRDs nav item |
| `frontend/src/lib/api/prdService.ts` | 5, 6 | Add `createBacklog()`, update export methods |
| `cognisim_ai_backend/app/api/routes/prd.py` | 1, 5, 6, 7 | Remove Confluence, add backlog/collab endpoints |
| `cognisim_ai_backend/app/models/prd_models.py` | 1, 7 | Remove Confluence models, add `CHANGES_REQUESTED` status |
| `cognisim_ai_backend/app/api/routes/issues.py` | 5 | Handle `prd_id` / `prd_feature_id` fields |

---

## Implementation Order (Dependency Graph)

```
Phase 1 (Cleanup) ──┐
                     ├──▶ Phase 2 (UI Overhaul) ──┬──▶ Phase 3 (Inline Editing)
                     │                             │
                     │                             ├──▶ Phase 4 (Version History)
                     │                             │
                     │                             └──▶ Phase 5 (PRD → Issues) ──▶ Phase 6 (Jira Export)
                     │
                     └──▶ Phase 7 (Collaboration) ──▶ Phase 8 (List Page + Templates)
```

**Parallelizable:** Phases 3, 4, and 5 can run in parallel after Phase 2 is complete.

---

## Success Criteria

| Metric | Target |
|--------|--------|
| PRDGenerator.tsx lines | < 250 (from 1550) |
| Component count in `components/prd/` | 13+ |
| PRD → Issues conversion rate | 100% of features mappable |
| Section editing latency | < 500ms save |
| Version comparison load time | < 1s |
| Confluence references in codebase | 0 |
| Mobile-responsive review panel | Yes |
| Enterprise status workflow states | 6 (draft → generating → in_review → changes_requested → approved → archived) |
