import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const usePageSecurity = (requirePermission) => {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    // Not logged in
    if (!profile) {
      navigate('/', { replace: true })
      return
    }

    // Not approved
    if (profile.status !== 'approved') {
      if (profile.status === 'pending') {
        navigate('/pending-approval', { replace: true })
      } else if (profile.status === 'rejected') {
        navigate('/account-rejected', { replace: true })
      } else {
        navigate('/', { replace: true })
      }
      return
    }

    // Check specific permission
    if (requirePermission && !requirePermission(profile)) {
      navigate('/', { replace: true })
    }
  }, [profile, loading, requirePermission, navigate])

  return { profile, loading }
}