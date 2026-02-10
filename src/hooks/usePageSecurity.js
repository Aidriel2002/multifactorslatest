import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const usePageSecurity = (requirePermission) => {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const [permissionChecked, setPermissionChecked] = useState(false)

  useEffect(() => {
    if (loading) return

    const checkAccess = async () => {
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

      if (requirePermission) {
        const hasPermission = await requirePermission(profile)
        if (!hasPermission) {
          navigate('/dashboard', { replace: true })
          return
        }
      }

      setPermissionChecked(true)
    }

    checkAccess()
  }, [profile, loading, requirePermission, navigate])

  return { profile, loading: loading || !permissionChecked }
}