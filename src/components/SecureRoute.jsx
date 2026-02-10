import { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const SecureRoute = ({ children, requirePermission }) => {
  const { profile, loading: authLoading } = useAuth()
  const [hasPermission, setHasPermission] = useState(false)
  const [checkingPermission, setCheckingPermission] = useState(true)

  useEffect(() => {
    const checkPermission = async () => {
      if (authLoading || !profile) {
        setCheckingPermission(true)
        return
      }

      setCheckingPermission(true)

      try {
        if (requirePermission) {
          const result = requirePermission(profile)
          const permitted = result instanceof Promise ? await result : result
          setHasPermission(permitted)
        } else {
          setHasPermission(true)
        }
      } catch (error) {
        console.error('Error checking permission:', error)
        setHasPermission(false)
      } finally {
        setCheckingPermission(false)
      }
    }

    checkPermission()
  }, [profile, authLoading, requirePermission])

  if (authLoading || checkingPermission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/" replace />
  }

  if (profile.status !== 'approved') {
    if (profile.status === 'pending') {
      return <Navigate to="/pending-approval" replace />
    }
    if (profile.status === 'rejected') {
      return <Navigate to="/account-rejected" replace />
    }
    return <Navigate to="/" replace />
  }

  if (requirePermission && !hasPermission) {
    return <Navigate to="/admin" replace />
  }

  return children
}

export const AdminOnlyRoute = ({ children }) => {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile || profile.status !== 'approved' || profile.role !== 'admin') {
    return <Navigate to="/admin" replace />
  }

  return children
}

export const ApprovedOnlyRoute = ({ children }) => {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!profile || profile.status !== 'approved') {
    return <Navigate to="/" replace />
  }

  return children
}