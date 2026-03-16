import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { UserIcon, SettingsIcon, CreditCardIcon, LogOutIcon, BellIcon } from 'lucide-react'

export function UserProfileDropdown() {
  const { user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      // Redirect will be handled by the auth context
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email
    if (!name) return 'U'
    
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name[0].toUpperCase()
  }

  const getUserDisplayName = () => {
    return user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User'
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-full justify-start px-2 hover:bg-blue-50">
          <div className="flex items-center gap-3 w-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.user_metadata?.avatar_url} alt={getUserDisplayName()} />
              <AvatarFallback className="bg-blue-600 text-white text-sm">
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-start flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate w-full text-left">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-slate-500 truncate w-full text-left">
                {user.email}
              </p>
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{getUserDisplayName()}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/account-settings" className="flex items-center gap-2 cursor-pointer">
            <UserIcon className="h-4 w-4" />
            Account Settings
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/subscription" className="flex items-center gap-2 cursor-pointer">
            <CreditCardIcon className="h-4 w-4" />
            Subscription
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/notifications" className="flex items-center gap-2 cursor-pointer">
            <BellIcon className="h-4 w-4" />
            Notifications
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOutIcon className="h-4 w-4" />
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
