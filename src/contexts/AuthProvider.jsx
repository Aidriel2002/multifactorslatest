import { useEffect, useState } from 'react'
import { supabase, getCurrentUserProfile } from '../lib/supabase'
import { AuthContext } from './AuthContext'

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile()
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile()
      } else {
        setProfile(null)
        setLoading(false)
        clearAPICache()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const clearAPICache = async () => {
    try {
      const { clearCache } = await import('../utils/apiValidation')
      clearCache()
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  const loadProfile = async () => {
    try {
      const userProfile = await getCurrentUserProfile()
      setProfile(userProfile)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) {
      await clearAPICache()
      await loadProfile()
    }
    return { data, error }
  }

  const signOut = async () => {
    await clearAPICache()
    const { error } = await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    return { error }
  }

  const refreshProfile = async () => {
    await clearAPICache()
    await loadProfile()
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isApproved: profile?.status === 'approved',
    isAdmin: profile?.role === 'admin' && profile?.status === 'approved',
    isPending: profile?.status === 'pending',
    isRejected: profile?.status === 'rejected',
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}