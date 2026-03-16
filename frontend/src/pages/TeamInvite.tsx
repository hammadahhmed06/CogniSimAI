import { DashboardLayout } from '@/components/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTeam } from '@/hooks/useTeam'
import { useState, useEffect } from 'react'
import { teamService, TeamMember, WorkspaceUser } from '@/lib/api/teamService'
import { Mail, Copy, UserPlus, Search, Check, Loader2, Users, Link, Eye, Edit, Shield, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function TeamInvite() {
  const { currentTeam } = useTeam()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamMember['role']>('viewer')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  // Direct add member state
  const [userSearch, setUserSearch] = useState('')
  const [availableUsers, setAvailableUsers] = useState<WorkspaceUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [directRole, setDirectRole] = useState<TeamMember['role']>('viewer')
  const [addingUserId, setAddingUserId] = useState<string | null>(null)

  // Search for workspace users
  useEffect(() => {
    if (!currentTeam?.id) return
    
    const searchUsers = async () => {
      setIsSearching(true)
      try {
        const users = await teamService.listAvailableUsers(currentTeam.id, userSearch || undefined, 20)
        setAvailableUsers(users)
      } catch (error) {
        console.error('Failed to search users:', error)
      } finally {
        setIsSearching(false)
      }
    }
    
    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [currentTeam?.id, userSearch])

  const handleDirectAdd = async (user: WorkspaceUser) => {
    if (!currentTeam?.id || user.is_team_member) return
    
    setAddingUserId(user.id)
    try {
      await teamService.addMemberDirect(currentTeam.id, user.id, directRole)
      toast.success(`${user.full_name || user.email} added to team`)
      // Refresh the user list
      const users = await teamService.listAvailableUsers(currentTeam.id, userSearch || undefined, 20)
      setAvailableUsers(users)
    } catch (error) {
      toast.error('Failed to add member')
      console.error('Failed to add member:', error)
    } finally {
      setAddingUserId(null)
    }
  }

  const handleSendInvite = async () => {
    if (!email.trim()) return
    
    setIsLoading(true)
    try {
      const redirect = window.location.origin + '/accept-invite'
      if (!currentTeam) throw new Error('No team selected')
      const result = await teamService.inviteMember(currentTeam.id, email, role, redirect)
      
      if (result.email_sent) {
        toast.success(`Invitation sent to ${email}`)
      } else if (result.invitation_stored) {
        // Email failed but invitation was stored - show the link
        toast.info(
          `Email could not be sent. Share this link instead: ${result.invite_link}`,
          { duration: 10000 }
        )
        // Copy link to clipboard automatically
        navigator.clipboard.writeText(result.invite_link)
        toast.success('Invite link copied to clipboard')
      } else {
        toast.warning(result.message || 'Invitation created - share the link manually')
      }
      
      // Reset form after successful invite
      setEmail('')
      setMessage('')
      setRole('viewer')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation'
      toast.error(errorMessage)
      console.error('Failed to send invite:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const inviteLink = `${window.location.origin}/invite/${currentTeam?.id || 'team-id'}`

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast.success('Invite link copied to clipboard')
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email?.slice(0, 2).toUpperCase() || '??'
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="shrink-0"
            onClick={() => navigate('/dashboard/teams')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Invite Members</h1>
            <p className="text-slate-500 mt-1">
              Add new members to <span className="font-medium text-slate-700">{currentTeam?.name || 'your team'}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Direct Add Members Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:row-span-2"
          >
            <Card className="h-full border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Add Workspace Members</CardTitle>
                    <CardDescription>
                      Instantly add existing workspace members to this team
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="user-search" className="text-sm font-medium">Search Users</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="user-search"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name or email..."
                      className="pl-9 border-slate-200"
                    />
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="direct-role" className="text-sm font-medium">Default Role</Label>
                  <Select value={directRole} onValueChange={(v) => setDirectRole(v as TeamMember['role'])}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-slate-400" />
                          <span>Viewer</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4 text-blue-500" />
                          <span>Editor</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-500" />
                          <span>Admin</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      {isSearching ? 'Searching...' : `${availableUsers.length} users found`}
                    </span>
                    {isSearching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                  </div>
                  <div className="max-h-[380px] overflow-y-auto">
                    {availableUsers.length === 0 && !isSearching ? (
                      <div className="p-8 text-center">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                          <Users className="h-6 w-6 text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500">No users found in workspace</p>
                      </div>
                    ) : (
                      availableUsers.map((user, index) => (
                        <motion.div 
                          key={user.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center justify-between p-3 hover:bg-slate-50 border-b last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                                {getInitials(user.full_name, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {user.full_name || user.email}
                              </p>
                              {user.full_name && (
                                <p className="text-xs text-slate-500">{user.email}</p>
                              )}
                            </div>
                          </div>
                          {user.is_team_member ? (
                            <Badge variant="secondary" className="gap-1.5 bg-green-50 text-green-700 border-green-200">
                              <Check className="h-3 w-3" />
                              Member
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleDirectAdd(user)}
                              disabled={addingUserId === user.id}
                              className="gap-1.5 bg-blue-600 hover:bg-blue-700"
                            >
                              {addingUserId === user.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <UserPlus className="h-3.5 w-3.5" />
                              )}
                              Add
                            </Button>
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Email Invite Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Mail className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Send Email Invitation</CardTitle>
                    <CardDescription>
                      Invite someone who isn't in the workspace yet
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="border-slate-200"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="role" className="text-sm font-medium">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as TeamMember['role'])}>
                    <SelectTrigger className="border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-slate-400" />
                          <span>Viewer - Can view content</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="editor">
                        <div className="flex items-center gap-2">
                          <Edit className="w-4 h-4 text-blue-500" />
                          <span>Editor - Can edit content</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-purple-500" />
                          <span>Admin - Can manage team</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="message" className="text-sm font-medium">Personal Message (Optional)</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a personal note to your invitation..."
                    rows={3}
                    className="border-slate-200 resize-none"
                  />
                </div>

                <Button 
                  onClick={handleSendInvite} 
                  disabled={isLoading || !email.trim()}
                  className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  {isLoading ? 'Sending...' : 'Send Invitation'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Share Link Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Link className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Share Invite Link</CardTitle>
                    <CardDescription>
                      Share this link for quick team access
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="invite-link" className="text-sm font-medium">Invite Link</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invite-link"
                      value={inviteLink}
                      readOnly
                      className="bg-slate-50 border-slate-200 text-slate-600 font-mono text-sm"
                    />
                    <Button variant="outline" onClick={copyInviteLink} className="shrink-0 gap-2 border-slate-200">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <h4 className="font-medium text-amber-800 text-sm mb-1">Security Note</h4>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Anyone with this link can request to join your team. Admins will need to approve new members.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Role Permissions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-50/50">
              <CardTitle className="text-lg">Role Permissions</CardTitle>
              <CardDescription>
                Understand what each role can do in your team
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 border border-green-200 rounded-xl bg-green-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-700">Viewer</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-green-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      View team content
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Access dashboards
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      View reports
                    </li>
                  </ul>
                </div>
                <div className="p-4 border border-blue-200 rounded-xl bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Edit className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-blue-700">Editor</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-blue-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      All Viewer permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Create and edit content
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Manage projects
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Run experiments
                    </li>
                  </ul>
                </div>
                <div className="p-4 border border-purple-200 rounded-xl bg-purple-50/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5 text-purple-600" />
                    <h3 className="font-semibold text-purple-700">Admin</h3>
                  </div>
                  <ul className="text-sm space-y-1.5 text-purple-800">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      All Editor permissions
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Manage team members
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Configure settings
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      Access billing
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  )
}