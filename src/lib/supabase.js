// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Replace with your Supabase project credentials
const supabaseUrl = 'https://btdssviozjizppcogwbl.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ0ZHNzdmlvemppenBwY29nd2JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MzE0MjMsImV4cCI6MjA4MzMwNzQyM30.7Qd1EgRdQy8KflZnzp1gdwr4GUBTpITbnfDa7hEjEas'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to get current user profile
export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }

  return data
}

// Helper function to check if user is approved
export const isUserApproved = async () => {
  const profile = await getCurrentUserProfile()
  return profile?.status === 'approved'
}

// Helper function to check if user is admin
export const isAdmin = async () => {
  const profile = await getCurrentUserProfile()
  return profile?.role === 'admin' && profile?.status === 'approved'
}