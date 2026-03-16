/* Local project storage utility */
export type LocalIssue = { id: string; key: string; summary: string; status: string; priority?: string; assignee?: string; sprintId?: string | null; createdAt: string };
export type LocalSprint = { id: string; name: string; state: 'future'|'active'|'closed'; goal?: string; startDate?: string; endDate?: string; createdAt: string };
export type LocalProject = { id: string; key: string; name: string; type: 'scrum'|'kanban'; issues: LocalIssue[]; sprints: LocalSprint[]; createdAt: string };
const STORAGE_KEY = 'cognisim_local_projects_v1';
function load(): LocalProject[] { try { const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): []; } catch { return []; } }
function save(p: LocalProject[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore persistence errors (quota/private mode) */ } }
export const localProjects = {
  list(): LocalProject[] { return load(); },
  get(id: string) { return load().find(p=>p.id===id); },
  create(name: string, keyInput: string, type: 'scrum'|'kanban'): LocalProject { const key = (keyInput||'PRJ').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,10)||'PRJ'; const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,6)}`; const project: LocalProject = { id, key, name: name.trim()||key, type, issues: [], sprints: [], createdAt: new Date().toISOString() }; const ps = load(); ps.push(project); save(ps); return project; },
  addIssue(projectId: string, summary: string) { const ps = load(); const p = ps.find(pr=>pr.id===projectId); if(!p) return null; const seq = p.issues.length+1; const key = `${p.key}-${seq}`; const issue: LocalIssue={ id:key, key, summary: summary||key, status:'todo', createdAt:new Date().toISOString(), sprintId:null }; p.issues.push(issue); save(ps); return issue; },
  updateIssue(projectId: string, key: string, patch: Partial<LocalIssue>) { const ps=load(); const p=ps.find(pr=>pr.id===projectId); if(!p) return; const i=p.issues.find(ii=>ii.key===key); if(!i) return; Object.assign(i,patch); save(ps); },
  createSprint(projectId: string, name?: string, goal?: string, startDate?: string, endDate?: string) { const ps=load(); const p=ps.find(pr=>pr.id===projectId); if(!p) return null; const seq=p.sprints.length+1; const sprint: LocalSprint={ id:`${p.key}-S${seq}`, name: name||`Sprint ${seq}`, state:'future', goal, startDate, endDate, createdAt:new Date().toISOString() }; p.sprints.push(sprint); save(ps); return sprint; },
  listSprints(projectId: string) { return this.get(projectId)?.sprints || []; },
  listIssues(projectId: string) { return this.get(projectId)?.issues || []; },
  assignIssueToSprint(projectId: string, issueKey: string, sprintId: string | null) { this.updateIssue(projectId, issueKey, { sprintId }); },
  startSprint(projectId: string, sprintId: string) { const ps=load(); const p=ps.find(pr=>pr.id===projectId); if(!p) return; p.sprints.forEach(s=>{ if(s.id===sprintId) s.state='active'; else if(s.state==='active') s.state='closed'; }); save(ps); },
  completeSprint(projectId: string, sprintId: string) { const ps=load(); const p=ps.find(pr=>pr.id===projectId); if(!p) return; const s=p.sprints.find(sp=>sp.id===sprintId); if(!s) return; s.state='closed'; save(ps); }
};
export function isLocalBoardId(id?: string|null){ return !!id && id.startsWith('local-'); }
