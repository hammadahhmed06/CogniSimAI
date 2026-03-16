import React, { createContext, useContext, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '@/lib/api/projectService';
import { issuesService } from '@/lib/api/issuesService';

// Light-weight structural types (replace with generated API types when available)
interface ProjectLite {
  id: string;
  name?: string;
  key?: string;
  type?: string;
  description?: string;
  status?: string;
}
interface IssueLite { id: string; title: string; issue_key: string; status?: string; type?: string }

interface ProjectContextValue {
  projectId?: string;
  project?: ProjectLite;
  projectLoading: boolean;
  issues?: IssueLite[];
  issuesLoading: boolean;
  refetchIssues: () => void;
}

const ProjectContext = createContext<ProjectContextValue | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const params = useParams();
  const location = useLocation();
  // Derive projectId only for routes under /dashboard/projects/:projectId
  const pathMatch = /\/dashboard\/projects\/([^/]+)/.exec(location.pathname);
  const rawId = pathMatch?.[1];
  const isUuid = !!rawId && /^[0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12}$/.test(rawId);

  const projectQuery = useQuery({
    queryKey: ['project', rawId],
    queryFn: () => (isUuid ? projectService.getProject(rawId!) : projectService.getProjectBySlug(rawId!)),
    enabled: !!rawId,
  });

  const resolvedProjectId = projectQuery.data?.id;
  const issuesQuery = useQuery({
    queryKey: ['project-issues', resolvedProjectId],
    queryFn: () => issuesService.listByProject(resolvedProjectId!),
    enabled: !!resolvedProjectId,
  });

  const value: ProjectContextValue = useMemo(() => ({
    projectId: resolvedProjectId,
    project: projectQuery.data as ProjectLite | undefined,
    projectLoading: projectQuery.isLoading,
    issues: Array.isArray(issuesQuery.data) ? (issuesQuery.data as IssueLite[]) : undefined,
    issuesLoading: issuesQuery.isLoading,
    refetchIssues: () => issuesQuery.refetch(),
  }), [resolvedProjectId, projectQuery, issuesQuery]);

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

// Hooks colocated for now; if fast-refresh warning persists they can be moved.
// Hooks moved to separate file to avoid fast-refresh warnings.
export { ProjectContext };
