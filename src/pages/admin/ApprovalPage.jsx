import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'

const ApprovalPage = () => {
  const { profile } = useAuth()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 5

  // Fetch users (reusable)
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return
    }

    setUsers(data || [])
  }

  // Initial load only
  useEffect(() => {
    let mounted = true

    const loadUsers = async () => {
      setLoading(true)
      await fetchUsers()
      if (mounted) setLoading(false)
    }

    loadUsers()

    return () => {
      mounted = false
    }
  }, [])

  const updateUserStatus = async (userId, status) => {
    const { error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)

    if (error) {
      console.error(error)
      alert('Failed to update status')
    } else {
      await fetchUsers()
      alert(`User ${status} successfully`)
    }
  }

  const updateUserRole = async (userId, role) => {
    const { error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', userId)

    if (error) {
      console.error(error)
      alert('Failed to update role')
    } else {
      await fetchUsers()
      alert('Role updated')
    }
  }

  // Filtering
  const filteredUsers = users.filter(user =>
    filter === 'all' ? true : user.status === filter
  )

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentUsers = filteredUsers.slice(startIndex, endIndex)

  const stats = {
    total: users.length,
    pending: users.filter(u => u.status === 'pending').length,
    approved: users.filter(u => u.status === 'approved').length,
    rejected: users.filter(u => u.status === 'rejected').length,
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />

      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="bg-white shadow px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">User Approval</h1>
          <p className="text-sm text-gray-600">
            Review and manage user registrations
          </p>
        </div>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {[
              { label: 'Total Users', value: stats.total },
              { label: 'Pending', value: stats.pending },
              { label: 'Approved', value: stats.approved },
              { label: 'Rejected', value: stats.rejected },
            ].map((item, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-5">
                <dt className="text-sm font-medium text-gray-500 truncate">
                  {item.label}
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </div>

          {/* Filters (RESET PAGE HERE ✅) */}
          <div className="flex space-x-2 mb-4">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => {
                  setFilter(status)
                  setCurrentPage(1)
                }}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 mx-auto border-b-2 border-blue-600 rounded-full" />
              </div>
            ) : currentUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No users found
              </div>
            ) : (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Registered</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y bg-white">
                    {currentUsers.map((user, index) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {startIndex + index + 1}
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </td>

                        <td className="px-6 py-4">
                          <select
                            value={user.role}
                            disabled={user.id === profile?.id}
                            onChange={e =>
                              updateUserRole(user.id, e.target.value)
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="employee">Employee</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-sm font-medium">
                            {user.status}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>

                        <td className="px-6 py-4 space-x-2">
                          {user.status !== 'approved' && (
                            <button
                              onClick={() =>
                                updateUserStatus(user.id, 'approved')
                              }
                              className="text-green-600"
                            >
                              Approve
                            </button>
                          )}
                          {user.status !== 'rejected' && (
                            <button
                              onClick={() =>
                                updateUserStatus(user.id, 'rejected')
                              }
                              className="text-red-600"
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center px-4 py-3 border-t">
                    <button
                      onClick={() =>
                        setCurrentPage(p => Math.max(p - 1, 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() =>
                        setCurrentPage(p => Math.min(p + 1, totalPages))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ApprovalPage
