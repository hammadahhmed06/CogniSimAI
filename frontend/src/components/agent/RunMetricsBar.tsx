import { ReactNode } from 'react'

function Metric({ label, value, suffix, children }: { label: string; value?: ReactNode; suffix?: string; children?: ReactNode }) {
  if (value == null && !children) return null
  return (
    <div className="flex flex-col items-start text-xs">
      <span className="uppercase tracking-wide text-[10px] text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums flex items-center gap-1">{value}{suffix}{children}</span>
    </div>
  )
}

export function RunMetricsBar(props: { input_tokens?: number; output_tokens?: number; total_tokens?: number; warnings_count?: number }) {
  const { input_tokens, output_tokens, total_tokens, warnings_count } = props
  return (
    <div className="flex gap-4 flex-wrap text-xs mt-3 p-2 rounded-md border bg-muted/30">
      <Metric label="Input">{input_tokens}</Metric>
      <Metric label="Output">{output_tokens}</Metric>
      <Metric label="Total">{total_tokens}</Metric>
      <Metric label="Warnings" value={warnings_count} />
    </div>
  )
}
