import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'

const AdminDashboard = () => {
  const { profile } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      setUsers(data || [])
      setLoading(false)
    }

    fetchUsers()
  }, [])

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Dashboard Overview
          </h1>
          <p className="text-sm text-gray-600">
            Welcome back, {profile?.full_name}
          </p>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {[
            { label: 'Total Users', value: stats.total },
            { label: 'Pending', value: stats.pending },
            { label: 'Approved', value: stats.approved },
            { label: 'Rejected', value: stats.rejected },
          ].map((item, i) => (
            <div key={i} className="bg-white shadow rounded-lg p-5">
              <dt className="text-sm text-gray-500">{item.label}</dt>
              <dd className="text-lg font-semibold">{item.value}</dd>
            </div>
          ))}
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>

          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            users.slice(0, 5).map(user => (
              <div
                key={user.id}
                className="flex justify-between py-3 border-b last:border-0"
              >
                <div>
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default AdminDashboard
