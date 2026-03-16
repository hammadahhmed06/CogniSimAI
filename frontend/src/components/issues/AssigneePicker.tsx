import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { membersService, type Member } from '@/lib/api/membersService'
import { TeamContext } from '@/components/TeamProvider'

export type AssigneeOption = {
  value: string
  label: string
  meta?: string
}

function displayName(m: Member): { label: string; meta?: string } {
  const full = (m.full_name || '').trim()
  const email = (m.email || '').trim()

  // Primary label: full name when present; else email.
  let label = full || email

  // Last resort: never dump a full UUID in the UI.
  if (!label) {
    const id = (m.user_id || '').trim()
    label = id ? `${id.slice(0, 8)}…` : 'Unknown'
  }

  // Secondary: show email under name (or omit if it's already the label).
  const meta = email && label !== email ? email : undefined
  return { label, meta }
}

export function AssigneePicker({
  value,
  onChange,
  placeholder = 'Unassigned',
  disabled,
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}) {
  const teamCtx = React.useContext(TeamContext)
  const teamId = teamCtx?.currentTeam?.id

  const membersQuery = useQuery({
    queryKey: ['workspace-members-for-assignee', teamId],
    queryFn: async () => {
      const page = await membersService.list({ team_id: teamId || undefined, limit: 200, offset: 0, sort: 'name' })
      return page.items || []
    },
    staleTime: 60_000,
  })

  const [open, setOpen] = React.useState(false)

  const options: AssigneeOption[] = React.useMemo(() => {
    const members = membersQuery.data || []
    const mapped = members
      .map((m) => {
        const d = displayName(m)
        return {
          value: d.label,
          label: d.label,
          meta: d.meta,
        }
      })
      // De-dupe by value
      .filter((o, idx, arr) => arr.findIndex(x => x.value.toLowerCase() === o.value.toLowerCase()) === idx)
      .sort((a, b) => a.label.localeCompare(b.label))

    return mapped
  }, [membersQuery.data])

  const selected = value?.trim() ? value.trim() : ''

  // Prefer the searchable picker whenever we can query workspace members.
  const canSearchMembers = true

  return (
    <div className={cn('w-full', className)}>
      {canSearchMembers ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                'w-full justify-between',
                !selected && 'text-muted-foreground',
                'hover:text-foreground'
              )}
            >
              <span className="inline-flex items-center gap-2 min-w-0">
                <User className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="truncate">{selected || placeholder}</span>
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="z-[200] w-[320px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search by name or email…" />
              <CommandList>
                {membersQuery.isLoading && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">Loading members…</div>
                )}
                {membersQuery.isError && (
                  <div className="px-3 py-2 text-sm text-destructive">Failed to load members.</div>
                )}
                {!membersQuery.isLoading && !membersQuery.isError && (
                  <CommandEmpty>No members found.</CommandEmpty>
                )}
                <CommandGroup heading="Assignee">
                  <CommandItem
                    value="__unassigned__"
                    className="group"
                    onSelect={() => {
                      onChange('')
                      setOpen(false)
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', !selected ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate group-data-[selected=true]:text-accent-foreground">{placeholder}</span>
                  </CommandItem>
                  {options.map((opt) => {
                    const isSelected = opt.value.toLowerCase() === selected.toLowerCase()
                    // Include email in searchable value
                    const searchValue = `${opt.label} ${opt.meta || ''}`.trim()
                    return (
                      <CommandItem
                        key={opt.value}
                        value={searchValue}
                        className="group"
                        onSelect={() => {
                          onChange(opt.value)
                          setOpen(false)
                        }}
                      >
                        <Check className={cn('mr-2 h-4 w-4', isSelected ? 'opacity-100' : 'opacity-0')} />
                        <div className="min-w-0">
                          <div className="truncate group-data-[selected=true]:text-accent-foreground">{opt.label}</div>
                          {opt.meta && (
                            <div className="truncate text-xs text-muted-foreground group-data-[selected=true]:text-accent-foreground">
                              {opt.meta}
                            </div>
                          )}
                        </div>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      ) : (
        // Fallback: free-text assignee (still supports the feature even without teams)
        <input
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        />
      )}
    </div>
  )
}
