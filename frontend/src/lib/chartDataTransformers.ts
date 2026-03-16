import { differenceInDays, format, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import type { Issue } from './api/issuesService'
import type { Sprint, ProjectStatsResponse } from './api/projectService'

/**
 * Chart Data Transformers
 * Utilities to convert raw API data into chart-ready formats
 */

// ============================================================================
// 1. DISTRIBUTION CHARTS
// ============================================================================

/**
 * Groups issues by a specific field (type, priority, assignee, etc.)
 */
export const groupByField = (
  issues: Issue[],
  field: keyof Issue,
  defaultLabel = 'Unassigned'
): Record<string, number> => {
  return issues.reduce((acc, issue) => {
    const value = String(issue[field] || defaultLabel)
    acc[value] = (acc[value] || 0) + 1
    return acc
  }, {} as Record<string, number>)
}

/**
 * Converts a record object to chart data format with name and value
 */
export const toChartData = (
  record: Record<string, number>,
  colorMap?: Record<string, string>
) => {
  return Object.entries(record)
    .map(([name, value]) => ({
      name,
      value,
      color: colorMap?.[name.toLowerCase()] || undefined
    }))
    .sort((a, b) => b.value - a.value) // Sort by value descending
}

/**
 * Get distribution data for all common issue fields
 */
export const getIssueDistributions = (issues: Issue[]) => {
  return {
    type: toChartData(groupByField(issues, 'type', 'Untyped'), {
      story: '#10b981',
      task: '#3b82f6',
      bug: '#ef4444',
      epic: '#8b5cf6',
      untyped: '#94a3b8'
    }),
    priority: toChartData(groupByField(issues, 'priority', 'None'), {
      highest: '#dc2626',
      high: '#f97316',
      medium: '#eab308',
      low: '#3b82f6',
      lowest: '#6b7280',
      none: '#94a3b8'
    }),
    assignee: toChartData(groupByField(issues, 'assignee_name', 'Unassigned')),
    status: toChartData(groupByField(issues, 'status', 'Unknown'))
  }
}

// ============================================================================
// 2. VELOCITY CHART
// ============================================================================

/**
 * Calculates velocity data by sprint (committed vs completed issues)
 */
export const calculateVelocityBySprint = (
  sprints: Sprint[],
  issues: Issue[],
  maxSprints = 6
) => {
  const closedSprints = sprints
    .filter(s => s.state === 'closed')
    .sort((a, b) => {
      // Sort by end date, most recent first
      if (!a.end_date) return 1
      if (!b.end_date) return -1
      return new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
    })
    .slice(0, maxSprints)
    .reverse() // Show oldest to newest on chart

  return closedSprints.map(sprint => {
    const sprintIssues = issues.filter(i => i.sprint_id === sprint.id)
    const completedIssues = sprintIssues.filter(i => i.status === 'done')
    
    return {
      name: sprint.name,
      sprint: sprint.name,
      committed: sprintIssues.length,
      completed: completedIssues.length,
      completionRate: sprintIssues.length > 0 
        ? Math.round((completedIssues.length / sprintIssues.length) * 100)
        : 0
    }
  })
}

/**
 * Calculate average velocity across recent sprints
 */
export const calculateAverageVelocity = (
  velocityData: ReturnType<typeof calculateVelocityBySprint>
) => {
  if (velocityData.length === 0) return 0
  const totalCompleted = velocityData.reduce((sum, v) => sum + v.completed, 0)
  return Math.round(totalCompleted / velocityData.length)
}

// ============================================================================
// 3. CYCLE TIME CHART
// ============================================================================

interface CycleTimeDataPoint {
  key: string
  title: string
  days: number
  createdAt: Date
  completedAt: Date
}

/**
 * Calculates cycle time for completed issues (approximation using created_at -> updated_at)
 */
export const calculateCycleTimes = (issues: Issue[]): CycleTimeDataPoint[] => {
  const completedWithTimestamps = issues.filter(i => 
    i.status === 'done' && 
    i.created_at && 
    i.updated_at
  )
  
  return completedWithTimestamps.map(issue => {
    const created = new Date(issue.created_at!)
    const completed = new Date(issue.updated_at!)
    const days = Math.max(0, differenceInDays(completed, created)) // Ensure non-negative
    
    return {
      key: issue.issue_key,
      title: issue.title,
      days,
      createdAt: created,
      completedAt: completed
    }
  })
}

/**
 * Groups cycle times by month and calculates averages
 */
export const groupCycleTimesByMonth = (issues: Issue[], maxMonths = 6) => {
  const cycleTimes = calculateCycleTimes(issues)
  const byMonth: Record<string, number[]> = {}
  
  cycleTimes.forEach(ct => {
    const month = format(ct.completedAt, 'MMM yyyy')
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(ct.days)
  })
  
  return Object.entries(byMonth)
    .map(([month, days]) => ({
      month,
      avgDays: days.reduce((a, b) => a + b, 0) / days.length,
      minDays: Math.min(...days),
      maxDays: Math.max(...days),
      count: days.length
    }))
    .sort((a, b) => {
      // Sort chronologically
      const dateA = new Date(a.month)
      const dateB = new Date(b.month)
      return dateA.getTime() - dateB.getTime()
    })
    .slice(-maxMonths) // Last N months
}

/**
 * Groups cycle times by week for more granular view
 */
export const groupCycleTimesByWeek = (issues: Issue[], maxWeeks = 12) => {
  const cycleTimes = calculateCycleTimes(issues)
  const byWeek: Record<string, number[]> = {}
  
  cycleTimes.forEach(ct => {
    const week = format(ct.completedAt, 'MMM dd')
    if (!byWeek[week]) byWeek[week] = []
    byWeek[week].push(ct.days)
  })
  
  return Object.entries(byWeek)
    .map(([week, days]) => ({
      week,
      avgDays: days.reduce((a, b) => a + b, 0) / days.length,
      count: days.length
    }))
    .slice(-maxWeeks)
}

// ============================================================================
// 4. BURNDOWN CHART
// ============================================================================

/**
 * Generates ideal burndown line for a sprint
 */
export const generateIdealBurndown = (
  totalIssues: number,
  startDate: string,
  endDate: string
) => {
  try {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = eachDayOfInterval({ start, end })
    const totalDays = days.length
    
    if (totalDays === 0) return []
    
    return days.map((date, index) => ({
      day: `Day ${index + 1}`,
      date: format(date, 'MMM dd'),
      fullDate: format(date, 'yyyy-MM-dd'),
      planned: Math.max(0, Math.round(totalIssues - (totalIssues / totalDays) * index)),
      actual: null as number | null
    }))
  } catch (error) {
    console.error('Error generating burndown:', error)
    return []
  }
}

/**
 * Calculates sprint burndown with ideal line and current actual point
 */
export const calculateSprintBurndown = (
  sprint: Sprint | undefined,
  sprintIssues: Issue[]
) => {
  if (!sprint || !sprint.start_date || !sprint.end_date) {
    return []
  }
  
  const idealLine = generateIdealBurndown(
    sprintIssues.length,
    sprint.start_date,
    sprint.end_date
  )
  
  // Add current actual remaining work at the current day or end
  const remainingIssues = sprintIssues.filter(i => i.status !== 'done').length
  const today = new Date()
  const sprintEnd = new Date(sprint.end_date)
  const currentDate = today > sprintEnd ? sprintEnd : today
  
  // Find the closest day to today in the ideal line
  const currentDayIndex = idealLine.findIndex(d => {
    const lineDate = new Date(d.fullDate)
    return lineDate >= currentDate
  })
  
  if (currentDayIndex >= 0 && idealLine[currentDayIndex]) {
    idealLine[currentDayIndex].actual = remainingIssues
  } else if (idealLine.length > 0) {
    // If past sprint end, add to last day
    idealLine[idealLine.length - 1].actual = remainingIssues
  }
  
  return idealLine
}

// ============================================================================
// 5. CUMULATIVE FLOW DIAGRAM
// ============================================================================

/**
 * Generates cumulative flow snapshot from current status distribution
 */
export const generateCumulativeFlowSnapshot = (stats: ProjectStatsResponse) => {
  return [{
    date: format(new Date(), 'MMM dd'),
    fullDate: format(new Date(), 'yyyy-MM-dd'),
    todo: stats.category_counts.todo,
    inProgress: stats.category_counts.in_progress,
    done: stats.category_counts.done,
    total: stats.total
  }]
}

/**
 * Calculates cumulative flow data from issues (approximation)
 * Groups issues by week based on created_at
 */
export const generateCumulativeFlowFromIssues = (issues: Issue[], weeks = 6) => {
  // Group issues by week created
  const weeklyData: Record<string, { todo: number; inProgress: number; done: number }> = {}
  
  issues.forEach(issue => {
    if (!issue.created_at) return
    
    const week = format(new Date(issue.created_at), 'MMM dd')
    if (!weeklyData[week]) {
      weeklyData[week] = { todo: 0, inProgress: 0, done: 0 }
    }
    
    // Approximate status distribution
    if (issue.status === 'done') {
      weeklyData[week].done++
    } else if (issue.status === 'in_progress' || issue.status === 'doing') {
      weeklyData[week].inProgress++
    } else {
      weeklyData[week].todo++
    }
  })
  
  return Object.entries(weeklyData)
    .map(([week, counts]) => ({
      week,
      ...counts
    }))
    .slice(-weeks)
}

// ============================================================================
// 6. METRICS CALCULATIONS
// ============================================================================

/**
 * Calculates completion rate percentage
 */
export const calculateCompletionRate = (stats: ProjectStatsResponse): number => {
  if (stats.total === 0) return 0
  return Math.round((stats.category_counts.done / stats.total) * 100)
}

/**
 * Calculates velocity trend (comparing current to previous period)
 */
export const calculateVelocityTrend = (
  currentVelocity: number,
  previousVelocity: number
): { trend: number; direction: 'up' | 'down' | 'stable' } => {
  if (previousVelocity === 0) {
    return { trend: 0, direction: 'stable' }
  }
  
  const trend = Math.round(((currentVelocity - previousVelocity) / previousVelocity) * 100)
  
  return {
    trend: Math.abs(trend),
    direction: trend > 0 ? 'up' : trend < 0 ? 'down' : 'stable'
  }
}

/**
 * Filters issues by date range based on created_at
 */
export const filterIssuesByDateRange = (
  issues: Issue[],
  days: number
): Issue[] => {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - days)
  
  return issues.filter(issue => {
    if (!issue.created_at) return false
    const createdDate = new Date(issue.created_at)
    return createdDate >= cutoffDate
  })
}

/**
 * Generates CSV content from chart data
 */
export const generateCSVContent = (
  data: Record<string, unknown>[],
  filename: string
): string => {
  if (data.length === 0) return ''
  
  const headers = Object.keys(data[0])
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header]
      // Escape values containing commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }).join(',')
  )
  
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Downloads CSV file
 */
export const downloadCSV = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
