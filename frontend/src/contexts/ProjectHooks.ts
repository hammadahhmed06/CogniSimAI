import { useContext } from 'react';
import { ProjectContext } from './ProjectContext';

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProject must be used within ProjectProvider');
  return { project: ctx.project, projectId: ctx.projectId, loading: ctx.projectLoading };
};

export const useProjectIssues = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error('useProjectIssues must be used within ProjectProvider');
  return { issues: ctx.issues, loading: ctx.issuesLoading, refetch: ctx.refetchIssues };
};
