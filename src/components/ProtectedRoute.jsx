import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export const ProtectedRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.status === 'pending') {
    return <Navigate to="/pending-approval" replace />
  }

  if (profile.status === 'rejected') {
    return <Navigate to="/account-rejected" replace />
  }

  if (profile.status !== 'approved') {
    return <Navigate to="/login" replace />
  }

  return children
}

export const AdminRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.status !== 'approved' || profile.role !== 'admin') {
    return <Navigate to="/employee" replace />
  }

  return children
}

export const EmployeeRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }

  if (profile.status !== 'approved') {
    return <Navigate to="/login" replace />
  }

  if (profile.role !== 'employee') {
    return <Navigate to="/admin" replace />
  }

  return children
}

export const PublicRoute = ({ children }) => {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (user && profile) {
    if (profile.status === 'pending') {
      return <Navigate to="/pending-approval" replace />
    }

    if (profile.status === 'rejected') {
      return <Navigate to="/account-rejected" replace />
    }

    if (profile.status === 'approved') {
      if (profile.role === 'admin') {
        return <Navigate to="/admin" replace />
      }
      if (profile.role === 'employee') {
        return <Navigate to="/employee" replace />
      }
    }
  }

  return children
}
