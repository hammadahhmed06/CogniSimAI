interface DuplicateMatch { story_index: number; story_title: string; existing_title: string; similarity: number }

export function DuplicateWarnings({ matches }: { matches?: DuplicateMatch[] }) {
  if (!matches || matches.length === 0) return null
  return (
    <div className="mt-3 space-y-2">
      <h4 className="text-sm font-medium text-amber-600">Potential Duplicates</h4>
      <ul className="text-xs space-y-1 list-disc ml-4">
        {matches.map(m => (
          <li key={m.story_index}>
            <span className="font-semibold">{m.story_title}</span> ↔ {m.existing_title} <span className="text-muted-foreground">(sim {m.similarity.toFixed(2)})</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
