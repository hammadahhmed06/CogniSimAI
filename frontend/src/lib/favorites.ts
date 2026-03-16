import { type LucideIcon } from "lucide-react"

export interface FavoriteItem {
  id: string
  title: string
  url: string
  icon?: LucideIcon
  type: 'project' | 'issue' | 'sprint'
}

// Export utility functions to manage favorites
export function addToFavorites(item: FavoriteItem) {
  try {
    const stored = localStorage.getItem('favorites')
    const favorites: FavoriteItem[] = stored ? JSON.parse(stored) : []
    
    // Don't add duplicates
    if (favorites.some(f => f.id === item.id)) {
      return
    }
    
    favorites.unshift(item)
    // Keep only 10 favorites max
    if (favorites.length > 10) {
      favorites.pop()
    }
    
    localStorage.setItem('favorites', JSON.stringify(favorites))
    // Trigger re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent('favorites-updated'))
  } catch (e) {
    console.error('Failed to add favorite:', e)
  }
}

export function removeFromFavorites(itemId: string) {
  try {
    const stored = localStorage.getItem('favorites')
    if (!stored) return
    
    const favorites: FavoriteItem[] = JSON.parse(stored)
    const filtered = favorites.filter(f => f.id !== itemId)
    
    localStorage.setItem('favorites', JSON.stringify(filtered))
    window.dispatchEvent(new CustomEvent('favorites-updated'))
  } catch (e) {
    console.error('Failed to remove favorite:', e)
  }
}

export function getFavorites(): FavoriteItem[] {
  try {
    const stored = localStorage.getItem('favorites')
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    console.error('Failed to load favorites:', e)
    return []
  }
}
