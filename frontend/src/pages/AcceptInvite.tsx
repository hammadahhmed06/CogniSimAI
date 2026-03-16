import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { apiBase } from '@/lib/api/client';
import { supabase } from '@/lib/supabase/client';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing your invitation...');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [invitedEmailHint, setInvitedEmailHint] = useState<string | null>(null);

  const token = searchParams.get('token');
  const teamIdParam = searchParams.get('team');
  const workspaceIdParam = searchParams.get('workspace');

  useEffect(() => {
    const acceptInvitation = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Invalid invitation link. Please check your email and try again.');
        return;
      }

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Attach Supabase access token (backend expects Bearer auth)
        try {
          const { data } = await supabase.auth.getSession()
          const accessToken = data.session?.access_token
          const email = data.session?.user?.email || null
          setCurrentEmail(email)
          if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
        } catch {
          // ignore
        }

        const response = await fetch(apiBase('/api/auth/accept-invite'), {
          method: 'POST',
          headers,
          body: JSON.stringify({
            token,
            team_id: teamIdParam,
            workspace_id: workspaceIdParam,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setStatus('success');
          setTeamId(data.team_id);

          // Ensure we switch into the inviter's workspace context (especially important for team invites)
          if (data.workspace_id) {
            try { localStorage.setItem('activeWorkspaceId', String(data.workspace_id)) } catch { /* ignore */ }
          }
          
          if (data.already_member) {
            setMessage('You are already a member of this team!');
          } else {
            setMessage(`Welcome! You've successfully joined the team as a ${data.role}.`);
          }

          // Redirect to team or dashboard after 3 seconds
          setTimeout(() => {
            if (data.team_id) {
              try { localStorage.setItem('currentTeamId', String(data.team_id)) } catch { /* ignore */ }
              navigate(`/dashboard/team`);
            } else if (data.workspace_id) {
              navigate(`/dashboard/workspace/${data.workspace_id}/members`);
            } else {
              navigate('/dashboard');
            }
          }, 3000);
        } else {
          const error = await response.json();
          setStatus('error');
          
          if (response.status === 401) {
            setMessage('Please sign in first to accept this invitation.');
            setTimeout(() => {
              const redirectPath = `/accept-invite${window.location.search}`
              navigate(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
            }, 2000);
          } else if (response.status === 404) {
            setMessage('This invitation is no longer valid or has already been used.');
          } else if (response.status === 400) {
            setMessage(error.detail || 'This invitation has expired.');
          } else if (response.status === 403) {
            const detail = (error && typeof error === 'object' ? (error as any).detail : null)
            if (detail && typeof detail === 'object') {
              if (typeof detail.message === 'string') setMessage(detail.message)
              if (typeof detail.invited_email_hint === 'string') setInvitedEmailHint(detail.invited_email_hint)
              if (typeof detail.current_email === 'string') setCurrentEmail(detail.current_email)
            } else {
              setMessage('This invitation was sent to a different email address.');
            }
          } else {
            setMessage('Failed to accept invitation. Please try again or contact support.');
          }
        }
      } catch (error) {
        console.error('Accept invite error:', error);
        setStatus('error');
        setMessage('Network error. Please check your connection and try again.');
      }
    };

    acceptInvitation();
  }, [token, teamIdParam, workspaceIdParam, navigate]);

  const handleSignOutAndContinue = async () => {
    try {
      await supabase.auth.signOut()
    } catch {
      // ignore
    }
    const redirectPath = `/accept-invite${window.location.search}`
    navigate(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CogniSim AI</h1>
            <p className="text-gray-600 mt-2">Team Invitation</p>
          </div>

          {/* Status Content */}
          <div className="text-center">
            {status === 'loading' && (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                <p className="text-gray-700 font-medium">{message}</p>
                <p className="text-sm text-gray-500">Please wait...</p>
              </div>
            )}

            {status === 'success' && (
              <div className="space-y-4">
                <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                <p className="text-gray-700 font-medium">{message}</p>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Redirecting...</span>
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="space-y-4">
                <XCircle className="w-12 h-12 text-red-600 mx-auto" />
                <p className="text-gray-700 font-medium">{message}</p>
                {(currentEmail || invitedEmailHint) && (
                  <div className="text-sm text-gray-600 space-y-1">
                    {currentEmail && (
                      <p>
                        Signed in as: <span className="font-mono">{currentEmail}</span>
                      </p>
                    )}
                    {invitedEmailHint && (
                      <p>
                        Invite was sent to: <span className="font-mono">{invitedEmailHint}</span>
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleSignOutAndContinue}
                    className="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Sign out and continue
                  </button>
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                  <button
                    onClick={() => {
                      const redirectPath = `/accept-invite${window.location.search}`
                      navigate(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`)
                    }}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-center text-xs text-gray-500">
              Need help? Contact us at{' '}
              <a href="mailto:support@cognisim.ai" className="text-blue-600 hover:underline">
                support@cognisim.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
