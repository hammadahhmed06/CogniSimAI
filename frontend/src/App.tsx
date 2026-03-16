
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { WorkspaceProvider } from "@/contexts/WorkspaceContext";
import { ProjectProvider } from "@/contexts/ProjectContext";
import { TeamProvider } from "@/components/TeamProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthFailureListener } from "@/components/AuthFailureListener";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Subscription = lazy(() => import("./pages/Subscription"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Integrations = lazy(() => import("./pages/Integrations"));
const DashboardIntegrations = lazy(() => import("./pages/DashboardIntegrations"));
const JiraSettings = lazy(() => import("./pages/JiraSettings"));
const JiraConflicts = lazy(() => import("./pages/JiraConflicts"));
const JiraOAuthCallback = lazy(() => import("./pages/JiraOAuthCallback"));
const SlackSettings = lazy(() => import("./pages/SlackSettings"));
const Features = lazy(() => import("./pages/Features"));
const Pricing = lazy(() => import("./pages/Pricing"));
const About = lazy(() => import("./pages/About"));
const IssuesPage = lazy(() => import("./pages/Issues"));
const SprintsPage = lazy(() => import("./pages/Sprints"));
const BoardsPage = lazy(() => import("./pages/Boards"));
const ProjectsPage = lazy(() => import("./pages/Projects"));
const ProjectHubPage = lazy(() => import("./pages/ProjectHub"));
const ProjectBoardPage = lazy(() => import("./pages/ProjectBoard"));
const ProjectBacklogPage = lazy(() => import("./pages/ProjectBacklog"));
const ProjectReportsPage = lazy(() => import("./pages/ProjectReports"));
const ProjectActivityPage = lazy(() => import("./pages/ProjectActivity"));
const ProjectSettingsPage = lazy(() => import("./pages/ProjectSettings"));
const ProjectIntegrationsPage = lazy(() => import("./pages/ProjectIntegrations"));
const WorkspacesPage = lazy(() => import("./pages/Workspaces"));
const WorkspaceMembersPage = lazy(() => import("./pages/WorkspaceMembers"));
const TeamSettingsPage = lazy(() => import("./pages/TeamSettings"));
const TeamMembersPage = lazy(() => import("./pages/TeamMembers"));
const TeamInvitePage = lazy(() => import("./pages/TeamInvite"));
const TeamOverviewPage = lazy(() => import("./pages/TeamOverview"));
const TeamsIndexPage = lazy(() => import("./pages/Teams"));
const TeamAnalyticsPage = lazy(() => import("./pages/TeamAnalytics"));
const TeamGoalsPage = lazy(() => import("./pages/TeamGoals"));
const TeamResourcesPage = lazy(() => import("./pages/TeamResources"));
const TeamChatPage = lazy(() => import("./pages/TeamChat"));
const MembersPage = lazy(() => import("./pages/Members"));
const AgentsPage = lazy(() => import("./pages/Agents"));
const AgentSettingsPage = lazy(() => import("./pages/AgentSettings"));
const EpicDecomposerPage = lazy(() => import("./pages/EpicDecomposer"));
const PRDGeneratorPage = lazy(() => import("./pages/PRDGenerator"));
const PRDListPage = lazy(() => import("./pages/PRDList"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const DocumentationPage = lazy(() => import("./pages/Documentation"));
const SupportPage = lazy(() => import("./pages/Support"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

const App = () => {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <TeamProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <AuthFailureListener />
                <ProjectProvider>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/features" element={<Features />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/about" element={<About />} />
                      <Route path="/integrations" element={<Integrations />} />
                      <Route path="/dashboard" element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } />
                      <Route path="/account-settings" element={
                        <ProtectedRoute>
                          <AccountSettings />
                        </ProtectedRoute>
                      } />
                      <Route path="/subscription" element={
                        <ProtectedRoute>
                          <Subscription />
                        </ProtectedRoute>
                      } />
                      <Route path="/notifications" element={
                        <ProtectedRoute>
                          <Notifications />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/integrations" element={
                        <ProtectedRoute>
                          <DashboardIntegrations />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/integrations/jira/settings" element={
                        <ProtectedRoute>
                          <JiraSettings />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/integrations/slack/settings" element={
                        <ProtectedRoute>
                          <SlackSettings />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/jira-conflicts" element={
                        <ProtectedRoute>
                          <JiraConflicts />
                        </ProtectedRoute>
                      } />
                      <Route path="/jira/oauth/callback" element={<JiraOAuthCallback />} />
                      <Route path="/dashboard/sprints" element={
                        <ProtectedRoute>
                          <SprintsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/boards" element={
                        <ProtectedRoute>
                          <BoardsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/projects" element={
                        <ProtectedRoute>
                          <ProjectsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/projects/:projectId" element={<ProtectedRoute><ProjectHubPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/board" element={<ProtectedRoute><ProjectBoardPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/backlog" element={<ProtectedRoute><ProjectBacklogPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/reports" element={<ProtectedRoute><ProjectReportsPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/sprints" element={<Navigate to="../board" replace />} />
                      <Route path="/dashboard/projects/:projectId/activity" element={<ProtectedRoute><ProjectActivityPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/settings" element={<ProtectedRoute><ProjectSettingsPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/issues" element={<ProtectedRoute><IssuesPage /></ProtectedRoute>} />
                      <Route path="/dashboard/projects/:projectId/integrations" element={<ProtectedRoute><ProjectIntegrationsPage /></ProtectedRoute>} />
                      <Route path="/dashboard/workspaces" element={
                        <ProtectedRoute>
                          <WorkspacesPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/workspace/:workspaceId/members" element={
                        <ProtectedRoute>
                          <WorkspaceMembersPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/settings" element={
                        <ProtectedRoute>
                          <TeamSettingsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team" element={
                        <ProtectedRoute>
                          <TeamOverviewPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/teams" element={
                        <ProtectedRoute>
                          <TeamsIndexPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/members" element={
                        <ProtectedRoute>
                          <TeamMembersPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/members" element={
                        <ProtectedRoute>
                          <MembersPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/invite" element={
                        <ProtectedRoute>
                          <TeamInvitePage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/analytics" element={
                        <ProtectedRoute>
                          <TeamAnalyticsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/goals" element={
                        <ProtectedRoute>
                          <TeamGoalsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/resources" element={
                        <ProtectedRoute>
                          <TeamResourcesPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/team/chat" element={
                        <ProtectedRoute>
                          <TeamChatPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/issues" element={
                        <ProtectedRoute>
                          <IssuesPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/agents" element={
                        <ProtectedRoute>
                          <AgentsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/agents/epic-decomposer" element={
                        <ProtectedRoute>
                          <EpicDecomposerPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/prds" element={
                        <ProtectedRoute>
                          <PRDListPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/agents/prd-generator" element={
                        <ProtectedRoute>
                          <PRDGeneratorPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/dashboard/agents/settings" element={
                        <ProtectedRoute>
                          <AgentSettingsPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                      <Route path="/terms-of-service" element={<TermsOfService />} />
                      <Route path="/auth/login" element={<LoginPage />} />
                      <Route path="/auth/signup" element={<SignupPage />} />
                      <Route path="/auth/callback" element={<AuthCallback />} />
                      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                      <Route path="/auth/reset-password" element={<ResetPassword />} />
                      <Route path="/accept-invite" element={<AcceptInvite />} />
                      <Route path="/docs" element={
                        <ProtectedRoute>
                          <DocumentationPage />
                        </ProtectedRoute>
                      } />
                      <Route path="/support" element={
                        <ProtectedRoute>
                          <SupportPage />
                        </ProtectedRoute>
                      } />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </ProjectProvider>
              </BrowserRouter>
            </TooltipProvider>
          </TeamProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
