import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { UserService, UserProfile } from '@/lib/services/userService'
import { DashboardLayout } from '@/components/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { UserIcon, MailIcon, PhoneIcon, BuildingIcon, BriefcaseIcon, CalendarIcon, ShieldIcon, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import PasswordRequirements from '@/components/PasswordRequirements'
import { meetsAllPasswordRequirements } from '@/lib/password'

export default function AccountSettings() {
  const { user } = useAuth()
  const location = useLocation()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    company: '',
    position: '',
    phone: '',
  })
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdConfirm, setPwdConfirm] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [reauthAt, setReauthAt] = useState<number | null>(null)
  const [reauthLoading, setReauthLoading] = useState(false)
  const [secMsg, setSecMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // no email code cooldown logic

  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return

      try {
        let userProfile = await UserService.getUserProfile(user.id)
        
        if (!userProfile) {
          // Create profile if it doesn't exist
          userProfile = await UserService.createUserProfile(user)
        }

        if (userProfile) {
          setProfile(userProfile)
          setFormData({
            full_name: userProfile.full_name || '',
            company: userProfile.company || '',
            position: userProfile.position || '',
            phone: userProfile.phone || '',
          })
          setAvatarPreview(userProfile.avatar_url || null)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadUserProfile()
    }
  }, [user])

  // Auto-scroll to section if URL contains a hash (e.g., #security)
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#','')
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [location.hash])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    if (!user || !profile) return

    setSaving(true)
    setMessage(null)

    try {
      const updatedProfile = await UserService.updateUserProfile(user.id, formData)
      if (formData.full_name) {
        await UserService.updateAuthProfileName(formData.full_name)
      }
      
      if (updatedProfile) {
        setProfile(updatedProfile)
        setMessage({ type: 'success', text: 'Profile updated successfully!' })
      } else {
        setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
      }
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage({ type: 'error', text: 'An error occurred. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    try {
      const url = await UserService.uploadAvatar(user.id, file)
      if (url) {
        setAvatarPreview(url)
        setMessage({ type: 'success', text: 'Profile photo updated.' })
      } else {
        setMessage({ type: 'error', text: 'Failed to upload photo.' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to upload photo.' })
    } finally {
      setUploadingAvatar(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your profile...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Account Settings</h1>
              <p className="text-blue-700">Manage your profile and account preferences</p>
            </div>
          </div>
        </div>

        {/* Quick section nav */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => document.getElementById('profile')?.scrollIntoView({ behavior: 'smooth' })}>Profile</Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('security')?.scrollIntoView({ behavior: 'smooth' })}>Security</Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('danger')?.scrollIntoView({ behavior: 'smooth' })}>Danger Zone</Button>
          <Button variant="outline" size="sm" onClick={() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' })}>Account Details</Button>
        </div>

        {/* Account Information */}
        <Card id="profile">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information and contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Avatar */}
              <div className="space-y-2 md:col-span-2">
                <Label>Profile Photo</Label>
                <div className="flex items-center gap-4">
                  <img src={avatarPreview || '/avatars/cognisim-avatar.jpg'} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />
                  <div>
                    <Input id="avatar" type="file" accept="image/*" onChange={onAvatarChange} disabled={uploadingAvatar}
                      className="cursor-pointer" />
                    <p className="text-xs text-slate-500 mt-1">JPG, PNG up to 2MB.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange('full_name', e.target.value)}
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => handleInputChange('company', e.target.value)}
                  placeholder="Your company name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  placeholder="Your job title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setFormData({
                  full_name: profile?.full_name || '',
                  company: profile?.company || '',
                  position: profile?.position || '',
                  phone: profile?.phone || '',
                })}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
  <Card id="security">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>Manage password and sessions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 md:max-w-md">
              {/* Reauthenticate */}
              <Label htmlFor="current_password">Current Password</Label>
              <Input id="current_password" type="password" value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} placeholder="Enter your current password" />
              <div className="flex gap-2">
                <Button variant="outline" disabled={reauthLoading} onClick={async () => {
                  if (!user?.email || !currentPwd) return
                  setMessage(null)
                  setSecMsg(null)
                  setReauthLoading(true)
                  try {
                    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPwd })
                    if (error) throw error
                    setReauthAt(Date.now())
                    setSecMsg({ type: 'success', text: 'Reauthenticated. You can update your password for the next 5 minutes.' })
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Reauthentication failed.'
                    setSecMsg({ type: 'error', text: msg })
                  }
                  finally { setReauthLoading(false) }
                }}>Reauthenticate</Button>
              </div>
              {secMsg && (
                <p className={"text-xs mt-1 " + (secMsg.type === 'success' ? 'text-green-700' : 'text-red-700')}>{secMsg.text}</p>
              )}
              {/* Removed email code flow */}
              {reauthAt && (Date.now() - reauthAt < 5 * 60 * 1000) ? (
                <p className="text-xs text-green-700">Reauthenticated {Math.floor((Date.now() - reauthAt)/1000)}s ago. Expires in {Math.max(0, 300 - Math.floor((Date.now() - reauthAt)/1000))}s.</p>
              ) : (
                <p className="text-xs text-slate-600">Reauthentication required before changing password.</p>
              )}

              <Label htmlFor="new_password" className="pt-2">New Password</Label>
              <Input id="new_password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Enter a new password" />
              <Label htmlFor="confirm_password" className="pt-2">Confirm Password</Label>
              <Input id="confirm_password" type="password" value={pwdConfirm} onChange={(e) => setPwdConfirm(e.target.value)} placeholder="Re-enter new password" />
              <PasswordRequirements password={pwd} />
              <div className="flex gap-2 pt-2">
                <Button disabled={pwdSaving || !pwd || pwd !== pwdConfirm || !meetsAllPasswordRequirements(pwd) || !(reauthAt && (Date.now() - reauthAt < 5 * 60 * 1000))} onClick={async () => {
                  setPwdSaving(true)
                  setMessage(null)
                  try {
                    const { error } = await supabase.auth.updateUser({ password: pwd })
                    if (error) throw error
                    setPwd('')
                    setPwdConfirm('')
                    setCurrentPwd('')
                    setReauthAt(null)
                    setMessage({ type: 'success', text: 'Password updated successfully.' })
                  } catch (e: unknown) {
                    const msg = e instanceof Error ? e.message : 'Failed to update password.'
                    setMessage({ type: 'error', text: msg })
                  } finally {
                    setPwdSaving(false)
                  }
                }}>Update Password</Button>
                <Button variant="outline" onClick={() => { setPwd(''); setPwdConfirm(''); setCurrentPwd(''); }}>Reset</Button>
              </div>
            </div>
            <div className="pt-2">
              <Button variant="outline" onClick={async () => {
                try { await supabase.auth.signOut({ scope: 'global' }) } catch (err) { console.warn('global signOut failed', err) }
                setMessage({ type: 'success', text: 'Signed out from all devices.' })
              }}>Sign out of all devices</Button>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
  <Card id="danger">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Delete your account and data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border rounded-md bg-red-50 border-red-200">
              <div>
                <p className="font-medium text-red-800">Delete Account</p>
                <p className="text-sm text-red-700">This action is irreversible and will remove your data.</p>
              </div>
              <Button variant="destructive" disabled={!(reauthAt && (Date.now() - reauthAt < 5 * 60 * 1000))} onClick={async () => {
                if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return
                try {
                  const token = (await supabase.auth.getSession()).data.session?.access_token
                  const resp = await fetch('/api/account', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
                  if (resp.ok) {
                    await supabase.auth.signOut()
                    window.location.href = '/'
                  } else {
                    setMessage({ type: 'error', text: 'Failed to delete account.' })
                  }
                } catch (e) {
                  setMessage({ type: 'error', text: 'Failed to delete account.' })
                }
              }}>Delete</Button>
            </div>
            {!(reauthAt && (Date.now() - reauthAt < 5 * 60 * 1000)) && (
              <p className="text-xs text-red-700 mt-2">Reauthentication required: verify your current password or email code to enable deletion.</p>
            )}
          </CardContent>
        </Card>

        {/* Account Details */}
  <Card id="details">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Account Details
            </CardTitle>
            <CardDescription>
              Information about your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <MailIcon className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Email Address</p>
                  <p className="text-sm text-slate-600">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarIcon className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Member Since</p>
                  <p className="text-sm text-slate-600">
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <BuildingIcon className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Company</p>
                  <p className="text-sm text-slate-600">{profile?.company || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <BriefcaseIcon className="w-5 h-5 text-slate-500" />
                <div>
                  <p className="font-medium">Position</p>
                  <p className="text-sm text-slate-600">{profile?.position || 'Not specified'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
            <CardDescription>
              Your current account status and subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Active
              </Badge>
              <span className="text-sm text-slate-600">Your account is active and all features are available.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
