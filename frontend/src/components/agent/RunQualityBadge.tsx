import { Badge } from '@/components/ui/badge'

export function RunQualityBadge({ score }: { score?: number }) {
  if (score == null) return null
  let color = 'bg-gray-600'
  if (score >= 0.85) color = 'bg-emerald-600'
  else if (score >= 0.7) color = 'bg-teal-600'
  else if (score >= 0.5) color = 'bg-amber-600'
  else color = 'bg-rose-600'
  return (
    <Badge className={`${color} text-white gap-1`}>
      <span className="font-semibold">Quality</span>
      <span>{(score*100).toFixed(0)}%</span>
    </Badge>
  )
}
