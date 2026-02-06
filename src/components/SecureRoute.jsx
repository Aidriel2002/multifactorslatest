import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Wrapper component that checks permissions before rendering children
 * Usage: <SecureRoute requirePermission={canAccessBilling}>{children}</SecureRoute>
 */
export const SecureRoute = ({ children, requirePermission }) => {
  const { profile, loading } = useAuth()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Check if user is authenticated
  if (!profile) {
    return <Navigate to="/" replace />
  }

  // Check if user is approved
  if (profile.status !== 'approved') {
    if (profile.status === 'pending') {
      return <Navigate to="/pending-approval" replace />
    }
    if (profile.status === 'rejected') {
      return <Navigate to="/account-rejected" replace />
    }
    return <Navigate to="/" replace />
  }

  // Check specific permission if provided
  if (requirePermission && !requirePermission(profile)) {
    return <Navigate to="/" replace />
  }

  return children
}

/**
 * Admin-only route wrapper
 */
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
    return <Navigate to="/" replace />
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