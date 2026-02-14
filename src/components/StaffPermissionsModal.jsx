import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { clearPermissionsCache } from '../utils/rbac'
import { useAuth } from '../contexts/AuthContext'

const PERMISSIONS = {
  billing: { label: 'Billings', icon: '💰', description: 'Access billing dashboard and payment management' },
  contacts: { label: 'Contacts', icon: '📇', description: 'Manage customer contacts and information' },
  quotations: { label: 'Quotations', icon: '📝', description: 'Create and manage quotations' },
  reports: { label: 'DICT Reports', icon: '📈', description: 'View and generate reports' },
  products: { label: 'Landing Page Setup', icon: '⚙️', description: 'Manage Products and Projects page setup' },
  expenses: { label: 'Expenses', icon: '💸', description: 'Track and manage expenses' },
  kanban: { label: 'Kanban', icon: '🗂️', description: 'Manage Kanban boards and tasks' },
}

const StaffPermissionsModal = ({ isOpen, onClose, user, onUpdate }) => {
  const { profile: currentUserProfile, refreshProfile } = useAuth()
  const [permissions, setPermissions] = useState([])
  const [branches, setBranches] = useState([])
  const [assignedBranches, setAssignedBranches] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [allAccess, setAllAccess] = useState(false)

  useEffect(() => {
    if (isOpen && user) {
      loadPermissions()
      loadBranches()
      loadAssignedBranches()
    }
  }, [isOpen, user])

  const loadPermissions = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('permission')
        .eq('user_id', user.id)

      if (error) throw error

      const userPermissions = data?.map(p => p.permission) || []
      
      const hasAllAccess = userPermissions.includes('all_access')
      setAllAccess(hasAllAccess)
      
      if (!hasAllAccess) {
        setPermissions(userPermissions)
      } else {
        setPermissions([])
      }
    } catch (error) {
      console.error('Error loading permissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('name')

      if (error) throw error
      setBranches(data || [])
    } catch (error) {
      console.error('Error loading branches:', error)
    }
  }

  const loadAssignedBranches = async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('staff_branches')
        .select('branch_id')
        .eq('staff_id', user.id)

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading assigned branch:', error)
      } else if (data && data.length > 0) {
        setAssignedBranches([data[0].branch_id])
      } else {
        setAssignedBranches([])
      }
    } catch (error) {
      console.error('Error loading assigned branch:', error)
    }
  }

  const handlePermissionToggle = (permission) => {
    if (allAccess) return 
    setPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    )
  }

  const handleAllAccessToggle = () => {
    const newAllAccess = !allAccess
    setAllAccess(newAllAccess)
    
    if (newAllAccess) {
      setPermissions([])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save permissions
      await supabase
        .from('staff_permissions')
        .delete()
        .eq('user_id', user.id)

      let permissionsToInsert = []
      
      if (allAccess) {
        permissionsToInsert = [{ user_id: user.id, permission: 'all_access' }]
      } else if (permissions.length > 0) {
        permissionsToInsert = permissions.map(p => ({ user_id: user.id, permission: p }))
      }

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('staff_permissions')
          .insert(permissionsToInsert)

        if (error) throw error
      }

      // Save branch assignment to staff_branches table
      await supabase
        .from('staff_branches')
        .delete()
        .eq('staff_id', user.id)

      if (assignedBranches.length > 0) {
        const { error: branchError } = await supabase
          .from('staff_branches')
          .insert({
            staff_id: user.id,
            branch_id: assignedBranches[0],
            created_at: new Date().toISOString()
          })

        if (branchError) {
          console.error('Branch assignment error:', branchError)
          throw branchError
        }
      }

      clearPermissionsCache(user.id)

      if (currentUserProfile?.id === user.id) {
        await refreshProfile()
      }

      alert('Permissions and branch assignment updated successfully!')
      onUpdate?.()
      onClose()
    } catch (error) {
      console.error('Error saving:', error)
      alert('Failed to update: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full relative z-10 max-h-[90vh] overflow-y-auto">
          <div className="bg-green-900 px-6 py-4 sticky top-0 z-20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-white">
                Manage Staff Permissions
              </h3>
              <button
                onClick={onClose}
                className="text-green-300 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="bg-gray-50 px-6 py-4 border-b">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg">
                {user?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-center">
              <div className="animate-spin h-8 w-8 mx-auto border-b-2 border-green-600 rounded-full" />
            </div>
          ) : (
            <>
              <div className="px-6 py-4">
                {/* Permissions Section */}
                <div className="mb-8">
                  <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🔐</span>
                    Feature Permissions
                  </h4>

                  <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                    <label className="flex items-start cursor-pointer">
                      <div className="flex items-center h-6">
                        <input
                          type="checkbox"
                          checked={allAccess}
                          onChange={handleAllAccessToggle}
                          className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                        />
                      </div>
                      <div className="ml-3">
                        <span className="text-base font-semibold text-gray-900 flex items-center">
                          🌟 Grant All Access
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Recommended
                          </span>
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          Give access to all features except User Approval. This is the easiest way to grant comprehensive permissions.
                        </p>
                        {allAccess && (
                          <div className="mt-2 text-sm text-green-700 font-medium">
                            ✓ Staff member will have access to: Billings, Contacts, Quotations, Reports, Products, and Expenses
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">OR Grant Specific Permissions</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {Object.entries(PERMISSIONS).map(([key, { label, icon, description }]) => (
                      <div
                        key={key}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          allAccess
                            ? 'bg-gray-50 border-gray-200 opacity-50'
                            : permissions.includes(key)
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200 hover:border-green-200'
                        }`}
                      >
                        <label className="flex items-start cursor-pointer">
                          <div className="flex items-center h-6">
                            <input
                              type="checkbox"
                              checked={allAccess || permissions.includes(key)}
                              onChange={() => handlePermissionToggle(key)}
                              disabled={allAccess}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 disabled:opacity-50"
                            />
                          </div>
                          <div className="ml-3 flex-1">
                            <span className="text-sm font-medium text-gray-900 flex items-center">
                              <span className="mr-2">{icon}</span>
                              {label}
                            </span>
                            <p className="text-xs text-gray-600 mt-1">{description}</p>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>Note:</strong> Staff members will never have access to User Approval, regardless of permissions granted. Only admins can approve or reject users.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Branch Assignment Section */}
                <div className="border-t pt-6">
                  <h4 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">🏢</span>
                    Branch Assignment
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Assign this staff member to a specific branch. They will be automatically organized under this branch.
                  </p>

                  {branches.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-500">No branches available</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Branch
                        </label>
                        <select
                          value={assignedBranches[0] || ''}
                          onChange={(e) => setAssignedBranches(e.target.value ? [e.target.value] : [])}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        >
                          <option value="">No Branch Assigned</option>
                          {branches.map(branch => (
                            <option key={branch.id} value={branch.id}>
                              {branch.name} {branch.location && `- ${branch.location}`}
                            </option>
                          ))}
                        </select>
                      </div>

                      {assignedBranches.length > 0 && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-800">
                                Assigned to: {branches.find(b => b.id === assignedBranches[0])?.name}
                              </p>
                              {branches.find(b => b.id === assignedBranches[0])?.location && (
                                <p className="text-xs text-green-700 mt-1">
                                  📍 {branches.find(b => b.id === assignedBranches[0])?.location}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {assignedBranches.length === 0 && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-yellow-800">No branch assigned</p>
                              <p className="text-xs text-yellow-700 mt-1">
                                This staff member will appear in the "Unassigned" section
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center sticky bottom-0">
                <div className="text-sm text-gray-600">
                  {allAccess ? (
                    <span className="font-medium text-green-700">✓ All Access Granted</span>
                  ) : (
                    <span>
                      {permissions.length} permission{permissions.length !== 1 ? 's' : ''} selected
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving...
                      </span>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default StaffPermissionsModal