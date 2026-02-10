import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const usePageSecurity = (requirePermission) => {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return

    if (!profile) {
      navigate('/', { replace: true })
      return
    }

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

    if (requirePermission && !requirePermission(profile)) {
      navigate('/', { replace: true })
    }
  }, [profile, loading, requirePermission, navigate])

  return { profile, loading }
}