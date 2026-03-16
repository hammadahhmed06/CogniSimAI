import { supabase } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  company: string | null
  position: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface UserDashboardData {
  ai_agents_active: number
  ai_agents_total: number
  stories_generated: number
  stories_this_week: number
  stories_last_week: number
  sprint_velocity: number
  team_efficiency: number
  epics: Epic[]
  recent_activity: ActivityItem[]
}

export interface Epic {
  id: string
  title: string
  type: 'Epic' | 'User Story'
  status: 'In Process' | 'Done' | 'To Do' | 'Review'
  target: number
  limit: number
  reviewer: string
  created_at: string
  user_id: string
}

export interface ActivityItem {
  id: string
  header: string
  type: string
  status: string
  target: string
  limit: string
  reviewer: string
  created_at: string
  user_id: string
}

export interface UserSettings {
  email_notifications: boolean
  push_notifications: boolean
  theme: string
}

export class UserService {
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  static async createUserProfile(user: User): Promise<UserProfile | null> {
    try {
      const profile: Partial<UserProfile> = {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
        company: null,
        position: null,
        phone: null,
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert(profile)
        .select()
        .single()

      if (error) {
        console.error('Error creating user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error creating user profile:', error)
      return null
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()

      if (error) {
        console.error('Error updating user profile:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error updating user profile:', error)
      return null
    }
  }

  static async getUserDashboardData(userId: string): Promise<UserDashboardData | null> {
    try {
      // Get user's epics and activities
      const [epicsResponse, activitiesResponse] = await Promise.all([
        supabase
          .from('user_epics')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('user_activities')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      if (epicsResponse.error) {
        console.error('Error fetching epics:', epicsResponse.error)
      }

      if (activitiesResponse.error) {
        console.error('Error fetching activities:', activitiesResponse.error)
      }

      const epics = epicsResponse.data || []
      const activities = activitiesResponse.data || []

      // Calculate metrics from user data
      const totalEpics = epics.length
      const completedEpics = epics.filter(epic => epic.status === 'Done').length
      const inProgressEpics = epics.filter(epic => epic.status === 'In Process').length
      
      // Calculate stories this week vs last week
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      
      const storiesThisWeek = activities.filter(activity => 
        activity.type === 'User Story' && new Date(activity.created_at) >= weekAgo
      ).length
      
      const storiesLastWeek = activities.filter(activity => 
        activity.type === 'User Story' && 
        new Date(activity.created_at) >= twoWeeksAgo && 
        new Date(activity.created_at) < weekAgo
      ).length

      return {
        ai_agents_active: 4, // This could be fetched from user settings
        ai_agents_total: 6,
        stories_generated: activities.filter(a => a.type === 'User Story').length,
        stories_this_week: storiesThisWeek,
        stories_last_week: storiesLastWeek,
        sprint_velocity: Math.round((completedEpics / Math.max(totalEpics, 1)) * 50), // Calculate based on completion rate
        team_efficiency: Math.round((completedEpics / Math.max(totalEpics, 1)) * 100),
        epics: epics.slice(0, 5), // Show top 5 recent epics
        recent_activity: activities
      }
    } catch (error) {
      console.error('Error fetching user dashboard data:', error)
      return null
    }
  }

  static async createSampleDataForUser(userId: string): Promise<void> {
    try {
      // Create sample epics
      const sampleEpics = [
        {
          title: 'User Authentication Epic',
          type: 'Epic',
          status: 'In Process',
          target: 18,
          limit: 5,
          reviewer: 'AI Agent - Epic Architect',
          user_id: userId
        },
        {
          title: 'Dashboard Implementation',
          type: 'Epic',
          status: 'Done',
          target: 29,
          limit: 24,
          reviewer: 'AI Agent - Epic Architect',
          user_id: userId
        },
        {
          title: 'Project Integration Setup',
          type: 'User Story',
          status: 'Done',
          target: 10,
          limit: 13,
          reviewer: 'AI Agent - Estimator',
          user_id: userId
        }
      ]

      const { error: epicsError } = await supabase
        .from('user_epics')
        .insert(sampleEpics)

      if (epicsError) {
        console.error('Error creating sample epics:', epicsError)
      }

      // Create sample activities
      const sampleActivities = sampleEpics.map((epic, index) => ({
        header: epic.title,
        type: epic.type,
        status: epic.status,
        target: epic.target.toString(),
        limit: epic.limit.toString(),
        reviewer: epic.reviewer,
        user_id: userId
      }))

      const { error: activitiesError } = await supabase
        .from('user_activities')
        .insert(sampleActivities)

      if (activitiesError) {
        console.error('Error creating sample activities:', activitiesError)
      }

    } catch (error) {
      console.error('Error creating sample data:', error)
    }
  }

  // Sync display name to Supabase Auth metadata
  static async updateAuthProfileName(fullName: string): Promise<void> {
    try {
      await supabase.auth.updateUser({
        data: { full_name: fullName }
      })
    } catch (e) {
      console.error('Error updating auth profile name:', e)
    }
  }

  // Upload avatar to Supabase Storage 'avatars' bucket and update profile with public URL
  static async uploadAvatar(userId: string, file: File): Promise<string | null> {
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
      const path = `user/${userId}.${ext}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        cacheControl: '3600'
      })
      if (uploadError) {
        console.error('Avatar upload error:', uploadError)
        return null
      }
      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = pub?.publicUrl || null
      if (publicUrl) {
        await this.updateUserProfile(userId, { avatar_url: publicUrl })
        try { await supabase.auth.updateUser({ data: { avatar_url: publicUrl } }) } catch (e) { console.warn('auth avatar sync failed', e) }
      }
      return publicUrl
    } catch (e) {
      console.error('Error uploading avatar:', e)
      return null
    }
  }

  // User settings (notifications/preferences)
  static async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('email_notifications, push_notifications, theme')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching user settings:', error)
        return null
      }
      if (!data) {
        return { email_notifications: true, push_notifications: false, theme: 'system' }
      }
      return data as UserSettings
    } catch (e) {
      console.error('Error fetching user settings:', e)
      return null
    }
  }

  static async upsertUserSettings(userId: string, updates: Partial<UserSettings>): Promise<boolean> {
    try {
      const payload = { user_id: userId, ...updates, updated_at: new Date().toISOString() }
      const { error } = await supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
      if (error) {
        console.error('Error upserting user settings:', error)
        return false
      }
      return true
    } catch (e) {
      console.error('Error upserting user settings:', e)
      return false
    }
  }
}
