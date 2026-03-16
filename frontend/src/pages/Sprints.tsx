// NOTE: All Jira features have been removed - OAuth only
import { DashboardLayout } from '@/components/DashboardLayout'
import { PageHeader } from '@/components/PageHeader'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export default function Sprints() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <PageHeader
          title="Sprints"
          description="Feature disabled - Jira integration removed"
        />
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All Jira sprint management features have been removed. Only OAuth authentication (connect/disconnect) is available.
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  )
}
