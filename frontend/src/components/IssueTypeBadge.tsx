import React from 'react'

const colorMap: Record<string, string> = {
  epic: 'bg-purple-100 text-purple-700 border-purple-300',
  story: 'bg-green-100 text-green-700 border-green-300',
  bug: 'bg-red-100 text-red-700 border-red-300',
  task: 'bg-slate-100 text-slate-600 border-slate-300'
}

export const IssueTypeBadge: React.FC<{ type?: string; className?: string }> = ({ type, className }) => {
  if(!type) return null
  const key = type.toLowerCase()
  return (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border font-medium ${colorMap[key] || 'bg-slate-100 text-slate-600 border-slate-300'} ${className || ''}`}>{type}</span>
  )
}
