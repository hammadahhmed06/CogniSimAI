import { type LucideIcon } from "lucide-react"

export interface RecentItem {
  id: string
  title: string
  url: string
  icon?: LucideIcon
  type: 'project' | 'issue' | 'sprint' | 'page'
  timestamp: number
}

export function addToRecent(item: Omit<RecentItem, 'timestamp'>) {
  try {
    const stored = localStorage.getItem('recent-items')
    const recentItems: RecentItem[] = stored ? JSON.parse(stored) : []
    
    // Remove if already exists (to update timestamp)
    const filtered = recentItems.filter(r => r.id !== item.id)
    
    // Add to front with current timestamp
    const newItem: RecentItem = {
      ...item,
      timestamp: Date.now()
    }
    
    filtered.unshift(newItem)
    
    // Keep only 20 recent items max
    if (filtered.length > 20) {
      filtered.splice(20)
    }
    
    localStorage.setItem('recent-items', JSON.stringify(filtered))
    // Trigger re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent('recent-updated'))
  } catch (e) {
    console.error('Failed to add recent item:', e)
  }
}

export function getRecentItems(): RecentItem[] {
  try {
    const stored = localStorage.getItem('recent-items')
    if (!stored) return []
    
    const items: RecentItem[] = JSON.parse(stored)
    
    // Filter out items older than 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    const filtered = items.filter(item => item.timestamp > sevenDaysAgo)
    
    // Sort by timestamp (most recent first)
    filtered.sort((a, b) => b.timestamp - a.timestamp)
    
    return filtered
  } catch (e) {
    console.error('Failed to load recent items:', e)
    return []
  }
}

export function clearRecentItems() {
  try {
    localStorage.removeItem('recent-items')
    window.dispatchEvent(new CustomEvent('recent-updated'))
  } catch (e) {
    console.error('Failed to clear recent items:', e)
  }
}
