import { TrendingDownIcon, TrendingUpIcon, BotIcon, ClipboardListIcon, BarChartIcon, UsersIcon } from "lucide-react"
import { UserDashboardData } from "@/lib/services/userService"
import { Badge } from "@/components/ui/badge"
import { KpiCard } from "@/components/KpiCard"

interface SectionCardsProps {
  dashboardData?: UserDashboardData | null
}

export function SectionCards({ dashboardData }: SectionCardsProps) {
  // Use real data or fallback to default values
  const aiAgentsActive = dashboardData?.ai_agents_active || 4
  const aiAgentsTotal = dashboardData?.ai_agents_total || 6
  const storiesGenerated = dashboardData?.stories_generated || 156
  const storiesThisWeek = dashboardData?.stories_this_week || 128
  const storiesLastWeek = dashboardData?.stories_last_week || 142
  const sprintVelocity = dashboardData?.sprint_velocity || 42.5
  const teamEfficiency = dashboardData?.team_efficiency || 87

  // Calculate percentage changes
  const storiesChangePct = storiesLastWeek > 0
    ? ((storiesThisWeek - storiesLastWeek) / storiesLastWeek) * 100
    : 0
  const storiesChange = Math.round(storiesChangePct * 10) / 10
  const storiesTimeframeCopy = `${storiesThisWeek} this week vs ${storiesLastWeek} last week (${storiesChange >= 0 ? "+" : ""}${storiesChange}%)`
  const storiesSubtitle = storiesChange >= 0 ? "Up from last week" : "Down from last week"

  // Placeholder trend data to enrich KPIs visually
  const trendStories = [90, 110, 105, 130, 125, 140, storiesThisWeek]
  const trendVelocity = [30, 35, 33, 38, 41, 44, sprintVelocity]
  const trendEfficiency = [70, 75, 80, 76, 82, 85, teamEfficiency]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
      <KpiCard
        title="AI Agents Active"
        value={`${aiAgentsActive}/${aiAgentsTotal}`}
        to="/dashboard/integrations"
        icon={<BotIcon className="w-5 h-5 text-white" />}
        subtitle="Agents online"
        deltaPct={0}
        timeframeText="Across connected projects"
        trendData={[aiAgentsActive - 1, aiAgentsActive, aiAgentsActive, aiAgentsActive + 1]}
        topRightBadge={
          <Badge variant="outline" className="flex gap-1.5 rounded-xl text-xs border-green-200 text-green-700 bg-green-50 px-2 py-1">
            <TrendingUpIcon className="size-3" />
            Active
          </Badge>
        }
      />

      <KpiCard
        title="Stories Generated"
        value={storiesGenerated}
        to="/dashboard/issues"
        icon={<ClipboardListIcon className="w-5 h-5 text-white" />}
  subtitle={storiesSubtitle}
  deltaPct={storiesChange}
  timeframeText={storiesTimeframeCopy}
        trendData={trendStories}
        topRightBadge={
          <Badge variant="outline" className={`flex gap-1.5 rounded-xl text-xs px-2 py-1 ${
            storiesChange >= 0 
              ? 'border-green-200 text-green-700 bg-green-50' 
              : 'border-orange-200 text-orange-700 bg-orange-50'
          }`}>
            {storiesChange >= 0 ? <TrendingUpIcon className="size-3" /> : <TrendingDownIcon className="size-3" />}
            {storiesChange >= 0 ? '+' : ''}{storiesChange}%
          </Badge>
        }
      />

      <KpiCard
        title="Sprint Velocity"
        value={sprintVelocity}
        to="/dashboard/issues"
        icon={<BarChartIcon className="w-5 h-5 text-white" />}
        subtitle="Velocity improving"
        deltaPct={15}
  timeframeText="Avg story points per sprint (last 6 sprints)"
        trendData={trendVelocity}
        topRightBadge={
          <Badge variant="outline" className="flex gap-1.5 rounded-xl text-xs border-green-300 text-green-800 bg-green-50 px-2 py-1">
            <TrendingUpIcon className="size-3" />
            +15%
          </Badge>
        }
      />

      <KpiCard
        title="Team Efficiency"
        value={`${teamEfficiency}%`}
        to="/dashboard/issues"
        icon={<UsersIcon className="w-5 h-5 text-white" />}
  subtitle="Rolling 30-day average"
        deltaPct={12}
  timeframeText="Based on story completion rates"
        trendData={trendEfficiency}
        topRightBadge={
          <Badge variant="outline" className="flex gap-1.5 rounded-xl text-xs border-green-300 text-green-800 bg-green-50 px-2 py-1">
            <TrendingUpIcon className="size-3" />
            +12%
          </Badge>
        }
      />
    </div>
  )
}
