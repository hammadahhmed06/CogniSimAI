// Project-scoped Integrations page - uses the dashboard integrations component
// within the project tab layout for consistent navigation
import { ProjectTabLayout } from '@/components/ProjectTabLayout'
import DashboardIntegrations from './DashboardIntegrations'

export default function ProjectIntegrationsPage(){
  return (
    <ProjectTabLayout>
      <DashboardIntegrations />
    </ProjectTabLayout>
  )
}