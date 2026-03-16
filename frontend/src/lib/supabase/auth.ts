import { supabase } from './client'
import type { User, AuthError } from '@supabase/supabase-js'

export interface AuthResponse {
  user: User | null
  error: AuthError | null
}

export interface SignUpData {
  email: string
  password: string
  fullName: string
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  static async signUp({ email, password, fullName }: SignUpData): Promise<AuthResponse> {
    try {
      console.log('Starting signup process for:', email)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          // For development, you might want to set emailRedirectTo
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      console.log('Supabase signup response:', { data, error })

      if (error) {
        console.error('Signup error:', error)
        return { user: null, error }
      }

      // Check if user was created but needs email confirmation
      if (data.user && !data.session) {
        console.log('User created but needs email confirmation:', data.user.id)
        // Return success but indicate email confirmation is needed
        return { user: data.user, error: null }
      }

      // If user is created and confirmed, try to create a record in the users table (optional)
      if (data.user) {
        console.log('User created successfully:', data.user.id)
        try {
          const { error: profileError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email!,
              full_name: fullName,
            })

          if (profileError) {
            console.warn('Could not create user profile (this is optional):', profileError)
            // Don't return error - user creation was successful even without profile
          } else {
            console.log('User profile created successfully')
          }
        } catch (profileException) {
          console.warn('Users table might not exist yet:', profileException)
          // Continue - user authentication works without the users table
        }
      }

      return { user: data.user, error: null }
    } catch (error) {
      console.error('Unexpected signup error:', error)
      return {
        user: null,
        error: error as AuthError
      }
    }
  }

  static async signIn({ email, password }: SignInData): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      return { user: data.user, error }
    } catch (error) {
      return {
        user: null,
        error: error as AuthError
      }
    }
  }

  static async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        console.error('Error getting current user:', error)
        return null
      }
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  }

  static async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  static async updatePassword(password: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  static async signInWithProvider(
    provider: 'google' | 'github',
    redirect?: string
  ): Promise<{ error: AuthError | null }> {
    try {
      // Preserve intended redirect across the OAuth roundtrip
      const redirectSuffix = redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''
      const redirectTo = `${window.location.origin}/auth/callback${redirectSuffix}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // For local dev, PKCE is used automatically; we pass the full URL back
          // so AuthCallback can exchange the code reliably.
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })
      return { error }
    } catch (error) {
      console.error(`${provider} auth error:`, error)
      return { error: error as AuthError }
    }
  }

  static async sendMagicLink(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        }
      })
      return { error }
    } catch (error) {
      return { error: error as AuthError }
    }
  }

  static async inviteUser(email: string): Promise<{ error: AuthError | null }> {
    try {
      // Call backend API which uses Supabase admin invite (auth.email.template.invite)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const response = await fetch(`${apiUrl}/api/auth/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          redirect: `${window.location.origin}/auth/signup?invited=true`
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Failed to send invitation' }))
        return {
          error: {
            message: errorData.detail || 'Failed to send invitation',
            name: 'InvitationError',
            status: response.status
          } as AuthError
        }
      }

      return { error: null }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Failed to send invitation',
          name: 'NetworkError',
          status: 0
        } as AuthError
      }
    }
  }
}
