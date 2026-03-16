import * as React from "react"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line } from "recharts"

type KpiCardProps = {
  title: string
  value: string | number
  to?: string
  icon?: React.ReactNode
  subtitle?: string
  timeframeText?: string
  deltaPct?: number
  trendData?: number[]
  loading?: boolean
  topRightBadge?: React.ReactNode
}

function toChartData(arr?: number[]) {
  if (!arr || arr.length === 0) return []
  return arr.map((y, i) => ({ x: i, y }))
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  to,
  icon,
  subtitle,
  timeframeText,
  deltaPct,
  trendData,
  loading,
  topRightBadge,
}) => {
  const positive = typeof deltaPct === "number" ? deltaPct >= 0 : undefined
  const colorClass = positive === undefined
    ? "text-slate-700"
    : positive
      ? "text-green-700"
      : "text-orange-700"

  const chartColor = positive === false ? "#ea580c" : "#16a34a" // orange-600 or green-600

  return (
    <Card className="relative group overflow-hidden border-blue-100 bg-gradient-to-br from-white to-blue-50/30 shadow-sm hover:shadow-lg transition-all duration-300 min-h-[160px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2">
      {to && (
        <Link
          to={to}
          aria-label={`View ${title} details`}
          title={`View ${title} details`}
          className="absolute inset-0 z-[5] rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        />
      )}

  <CardHeader className="relative pb-2 pr-16">
        <div className="flex items-center gap-3 mb-2">
          {icon && (
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-sm">
              {icon}
            </div>
          )}
          <CardDescription className="text-blue-700 font-semibold text-sm leading-tight">
            {title}
          </CardDescription>
        </div>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-3xl font-bold tabular-nums text-slate-800">{value}</CardTitle>
          {topRightBadge && (
            <div className="absolute right-3 top-3">{topRightBadge}</div>
          )}
        </div>
      </CardHeader>

      {/* Sparkline */}
      <div className="px-4 mt-2">
        <div className="h-8 sm:h-10">
          {loading ? (
            <div className="h-full w-full animate-pulse bg-gradient-to-r from-blue-100/40 to-blue-50/40 rounded" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={toChartData(trendData)}>
                <Line type="monotone" dataKey="y" stroke={chartColor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <CardFooter className="flex-col items-start gap-1 text-sm pt-1">
        {subtitle && (
          <div className="flex gap-2 font-semibold text-slate-700 items-center">{subtitle}</div>
        )}
        {typeof deltaPct === "number" && (
          <div className={`text-xs font-medium ${colorClass}`}>
            {deltaPct >= 0 ? "+" : ""}{deltaPct}% vs last period
          </div>
        )}
        {timeframeText && (
          <div className="text-slate-700 text-xs">{timeframeText}</div>
        )}
        {to && (
          <div className="inline-flex items-center gap-1 text-blue-800 text-xs font-medium mt-1">
            View details <span aria-hidden>›</span>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

export default KpiCard
