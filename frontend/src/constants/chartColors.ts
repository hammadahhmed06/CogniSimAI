/**
 * Chart Color Constants
 * Centralized color definitions for consistent data visualization across all analytics pages
 * These colors are also defined in tailwind.config.ts under theme.extend.colors.chart
 */

export const CHART_COLORS = {
  // Primary chart colors
  primary: '#3b82f6',
  secondary: '#10b981',
  tertiary: '#8b5cf6',
  quaternary: '#f59e0b',
  quinary: '#ef4444',
  
  // Semantic colors
  success: '#10b981',
  warning: '#eab308',
  danger: '#ef4444',
  info: '#06b6d4',
  neutral: '#94a3b8',
  
  // Issue type colors
  type: {
    story: '#10b981',
    task: '#3b82f6',
    bug: '#ef4444',
    epic: '#8b5cf6',
    untyped: '#94a3b8',
  },
  
  // Priority colors
  priority: {
    highest: '#dc2626',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
    lowest: '#6b7280',
    none: '#94a3b8',
  },
  
  // Status colors
  status: {
    todo: '#94a3b8',
    'in-progress': '#3b82f6',
    doing: '#3b82f6',
    done: '#10b981',
    completed: '#10b981',
  },
  
  // Multi-series palette (for assignees, teams, etc.)
  palette: [
    '#10b981', // green
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
  ],
}

/**
 * Get color for issue type
 */
export const getTypeColor = (type: string | null | undefined): string => {
  if (!type) return CHART_COLORS.type.untyped
  const normalized = type.toLowerCase()
  return CHART_COLORS.type[normalized as keyof typeof CHART_COLORS.type] || CHART_COLORS.neutral
}

/**
 * Get color for priority level
 */
export const getPriorityColor = (priority: string | null | undefined): string => {
  if (!priority) return CHART_COLORS.priority.none
  const normalized = priority.toLowerCase()
  return CHART_COLORS.priority[normalized as keyof typeof CHART_COLORS.priority] || CHART_COLORS.neutral
}

/**
 * Get color for status
 */
export const getStatusColor = (status: string | null | undefined): string => {
  if (!status) return CHART_COLORS.neutral
  const normalized = status.toLowerCase()
  return CHART_COLORS.status[normalized as keyof typeof CHART_COLORS.status] || CHART_COLORS.neutral
}

/**
 * Get color from palette by index (wraps around)
 */
export const getPaletteColor = (index: number): string => {
  return CHART_COLORS.palette[index % CHART_COLORS.palette.length]
}

/**
 * Chart tooltip styles (consistent across all charts)
 */
export const TOOLTIP_STYLES = {
  contentStyle: {
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  },
}

/**
 * Chart axis styles (consistent across all charts)
 */
export const AXIS_STYLES = {
  stroke: '#64748b',
  style: { fontSize: '12px' },
}

/**
 * Chart grid styles (consistent across all charts)
 */
export const GRID_STYLES = {
  strokeDasharray: '3 3',
  stroke: '#e2e8f0',
}
