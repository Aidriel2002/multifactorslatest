import { createContext, useContext } from 'react'

export const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const useIsAdmin = () => {
  const { profile } = useAuth()
  return profile?.role === 'admin' && profile?.status === 'approved'
}

export const useIsApproved = () => {
  const { profile } = useAuth()
  return profile?.status === 'approved'
}

export const useHasRole = (allowedRoles) => {
  const { profile } = useAuth()
  if (!profile || profile.status !== 'approved') return false
  return allowedRoles.includes(profile.role)
}

export const useCanDelete = () => {
  return useIsAdmin()
}

export const useCanEdit = () => {
  return useIsApproved()
}