import { useState, useEffect } from 'react'
import { usePageSecurity } from '../../hooks/usePageSecurity'
import { canApproveUsers, clearPermissionsCache } from '../../utils/rbac'
import { supabase } from '../../lib/supabase'
import StaffPermissionsModal from '../../components/StaffPermissionsModal'

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => setIsDesktop(e.matches)
    setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return isDesktop
}

const ApprovalPage = () => {
  const { profile, loading: securityLoading } = usePageSecurity(canApproveUsers)
  const isDesktop = useIsDesktop()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUser, setSelectedUser] = useState(null)
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false)

  const itemsPerPage = 5

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

  useEffect(() => {
    if (securityLoading) return

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
  }, [securityLoading])

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

  const handleManagePermissions = (user) => {
    setSelectedUser(user)
    setIsPermissionsModalOpen(true)
  }

  const handlePermissionsUpdate = async () => {
    if (selectedUser) {
      clearPermissionsCache(selectedUser.id)
    }
    await fetchUsers()
  }

  const filteredUsers = users.filter(user =>
    filter === 'all' ? true : user.status === filter
  )

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

  const statusBadge = (status) => {
    const base = 'inline-flex px-2 py-1 text-xs leading-5 font-semibold rounded-full'
    if (status === 'approved') return `${base} bg-green-100 text-green-800`
    if (status === 'pending') return `${base} bg-yellow-100 text-yellow-800`
    return `${base} bg-red-100 text-red-800`
  }

  if (securityLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Removed AdminSidebar - it should be in your App.jsx or layout component */}

      <div className="min-h-screen transition-all">
        <div
          className="bg-white shadow px-4 py-3 sticky top-0 z-10"
          style={{ paddingTop: isDesktop ? '1rem' : '4rem', paddingLeft: isDesktop ? '1.5rem' : '1rem', paddingRight: isDesktop ? '1.5rem' : '1rem' }}
        >
          <h1 className="text-2xl font-bold text-gray-900">User Approval</h1>
          <p className="text-sm text-gray-600">
            Review and manage user registrations and permissions
          </p>
        </div>

        <div className="p-4" style={{ padding: isDesktop ? '1.5rem' : '0.75rem' }}>

          <div
            className="grid gap-4 mb-6"
            style={{ gridTemplateColumns: isDesktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)' }}
          >
            {[
              { label: 'Total Users', value: stats.total },
              { label: 'Pending', value: stats.pending },
              { label: 'Approved', value: stats.approved },
              { label: 'Rejected', value: stats.rejected },
            ].map((item, i) => (
              <div key={i} className="bg-white shadow rounded-lg p-4">
                <dt className="text-sm font-medium text-gray-500 truncate">{item.label}</dt>
                <dd className="text-lg font-semibold text-gray-900 mt-1">{item.value}</dd>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'pending', 'approved', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => {
                  setFilter(status)
                  setCurrentPage(1)
                }}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  filter === status
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-white shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-8 w-8 mx-auto border-b-2 border-green-600 rounded-full" />
              </div>
            ) : currentUsers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">No users found</div>
            ) : (
              <>
                {isDesktop ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {['#', 'User', 'Role', 'Status', 'Registered', 'Actions'].map(col => (
                            <th
                              key={col}
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 bg-white">
                        {currentUsers.map((user, index) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {startIndex + index + 1}
                            </td>

                            <td className="px-6 py-4">
                              <div className="font-medium text-sm text-gray-900">{user.full_name}</div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </td>

                            <td className="px-6 py-4">
                              <select
                                value={user.role}
                                disabled={user.id === profile?.id}
                                onChange={e => updateUserRole(user.id, e.target.value)}
                                className="border border-gray-300 rounded px-2 py-1 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                <option value="user">User</option>
                                <option value="staff">Staff</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>

                            <td className="px-6 py-4">
                              <span className={statusBadge(user.status)}>{user.status}</span>
                            </td>

                            <td className="px-6 py-4 text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString()}
                            </td>

                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-2">
                                {user.status !== 'approved' && (
                                  <button
                                    onClick={() => updateUserStatus(user.id, 'approved')}
                                    className="text-green-600 hover:text-green-900 text-sm font-medium hover:bg-green-50 px-2 py-1 rounded transition-colors"
                                  >
                                    Approve
                                  </button>
                                )}
                                {user.status !== 'rejected' && user.status !== 'approved' && (
                                  <button
                                    onClick={() => updateUserStatus(user.id, 'rejected')}
                                    className="text-red-600 hover:text-red-900 text-sm font-medium hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                  >
                                    Reject
                                  </button>
                                )}
                                {user.role === 'staff' && user.status === 'approved' && (
                                  <button
                                    onClick={() => handleManagePermissions(user)}
                                    className="text-green-600 hover:text-green-900 text-sm font-medium hover:bg-green-50 px-2 py-1 rounded transition-colors whitespace-nowrap"
                                  >
                                    Manage
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {currentUsers.map((user, index) => (
                      <div key={user.id} className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-xs font-semibold text-gray-500">
                            #{startIndex + index + 1}
                          </div>
                          <span className={statusBadge(user.status)}>{user.status}</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">User</label>
                            <div className="font-medium text-sm text-gray-900">{user.full_name}</div>
                            <div className="text-xs text-gray-500">{user.email}</div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Role</label>
                            <select
                              value={user.role}
                              disabled={user.id === profile?.id}
                              onChange={e => updateUserRole(user.id, e.target.value)}
                              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm disabled:bg-gray-100"
                            >
                              <option value="user">User</option>
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-gray-500 uppercase block mb-1">Registered</label>
                            <div className="text-sm text-gray-900">
                              {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-2">
                            {user.status !== 'approved' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'approved')}
                                className="flex-1 text-green-600 hover:text-green-900 text-sm font-medium bg-green-50 hover:bg-green-100 px-3 py-2 rounded transition-colors"
                              >
                                Approve
                              </button>
                            )}
                            {user.status !== 'rejected' && user.status !== 'approved' && (
                              <button
                                onClick={() => updateUserStatus(user.id, 'rejected')}
                                className="flex-1 text-red-600 hover:text-red-900 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-2 rounded transition-colors"
                              >
                                Reject
                              </button>
                            )}
                            {user.role === 'staff' && user.status === 'approved' && (
                              <button
                                onClick={() => handleManagePermissions(user)}
                                className="w-full text-green-600 hover:text-green-900 text-sm font-medium bg-green-50 hover:bg-green-100 px-3 py-2 rounded transition-colors"
                              >
                                Manage 
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <div
                    className="flex justify-between items-center gap-3 px-4 py-3 border-t border-gray-200"
                    style={{ flexDirection: isDesktop ? 'row' : 'column' }}
                  >
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="w-full px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-50 transition-colors"
                      style={{ maxWidth: isDesktop ? '120px' : '100%' }}
                    >
                      Previous
                    </button>

                    <span className="text-sm text-gray-600">
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="w-full px-4 py-2 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed text-sm hover:bg-gray-50 transition-colors"
                      style={{ maxWidth: isDesktop ? '120px' : '100%' }}
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

      <StaffPermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        onUpdate={handlePermissionsUpdate}
      />
    </div>
  )
}

export default ApprovalPage