import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { usePageSecurity } from '../../hooks/usePageSecurity'
import { canAccessBilling } from '../../utils/rbac'
import BillingsSidebar from './components/BillingSidebar'
import BillingNavbar from './components/BillingNavbar'
import ProviderModal from './components/ProviderModal'
import ProjectModal from './components/ProjectModal'
import { ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react'

const Providers = () => {
  const { loading: securityLoading } = usePageSecurity(canAccessBilling)


  const [providers, setProviders] = useState([])
  const [projects, setProjects] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expandedProjects, setExpandedProjects] = useState({})
  
  const [filters, setFilters] = useState({
    accountName: '',
    paymentStatus: '',
    sortDueDate: ''
  })

  useEffect(() => {
     if (securityLoading) return

    const fetchData = async () => {
      setLoading(true)
      
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false })

      if (providersError) {
        console.error('Error fetching providers:', providersError)
      } else {
        setProviders(providersData || [])
      }

      // Fetch projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .order('project_name', { ascending: true })

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
      } else {
        setProjects(projectsData || [])
      }

      setLoading(false)
    }

    fetchData()
  }, [securityLoading])

  useEffect(() => {
    const initialExpanded = {}
    projects.forEach(project => {
      initialExpanded[project.id] = true
    })
    initialExpanded['unassigned'] = true
    setExpandedProjects(initialExpanded)
  }, [projects])

  const refreshData = async () => {
    setLoading(true)
    
    const { data: providersData, error: providersError } = await supabase
      .from('providers')
      .select('*')
      .order('created_at', { ascending: false })

    if (providersError) {
      console.error('Error fetching providers:', providersError)
    } else {
      setProviders(providersData || [])
    }

    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('project_name', { ascending: true })

    if (projectsError) {
      console.error('Error fetching projects:', projectsError)
    } else {
      setProjects(projectsData || [])
    }

    setLoading(false)
  }

  const getDueDate = (dueDay, lastPaidMonth) => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    let dueDate = new Date(currentYear, currentMonth, parseInt(dueDay))
    
    if (lastPaidMonth) {
      const lastPaid = new Date(lastPaidMonth)
      if (lastPaid.getMonth() === currentMonth && lastPaid.getFullYear() === currentYear) {
        dueDate = new Date(currentYear, currentMonth + 1, parseInt(dueDay))
      }
    }
    
    return dueDate
  }

  const getPaymentStatus = (dueDay, lastPaidMonth, remarks) => {
    if (remarks === 'Paid') return 'paid'
    
    const today = new Date()
    const dueDate = getDueDate(dueDay, lastPaidMonth)
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

    if (daysUntilDue < 0) return 'overdue'
    if (daysUntilDue <= 7) return 'due-soon'
    return 'upcoming'
  }

  const formatDueDate = (dueDay, lastPaidMonth) => {
    const dueDate = getDueDate(dueDay, lastPaidMonth)
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const StatusBadge = ({ status }) => {
    const configs = {
      paid: { bg: 'bg-green-100', text: 'text-green-800', label: 'Paid' },
      upcoming: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Upcoming' },
      'due-soon': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Due Soon' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' }
    }

    const config = configs[status] || configs.upcoming

    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const handleOpenProviderModal = (provider = null) => {
    setEditingProvider(provider)
    setIsProviderModalOpen(true)
  }

  const handleCloseProviderModal = () => {
    setIsProviderModalOpen(false)
    setEditingProvider(null)
  }

  const handleOpenProjectModal = () => {
    setIsProjectModalOpen(true)
  }

  const handleCloseProjectModal = () => {
    setIsProjectModalOpen(false)
  }

  const handleProviderSubmit = async (submitData, providerId) => {
    if (providerId) {
      const { error } = await supabase
        .from('providers')
        .update(submitData)
        .eq('id', providerId)

      if (error) {
        console.error('Error updating provider:', error)
        alert(`Failed to update provider: ${error.message}`)
      } else {
        alert('Provider updated successfully')
        handleCloseProviderModal()
        refreshData()
      }
    } else {
      const { error } = await supabase
        .from('providers')
        .insert([submitData])

      if (error) {
        console.error('Error adding provider:', error)
        alert(`Failed to add provider: ${error.message}`)
      } else {
        alert('Provider added successfully')
        handleCloseProviderModal()
        refreshData()
      }
    }
  }

  const handleProjectSubmit = async (submitData) => {
    const { error } = await supabase
      .from('projects')
      .insert([submitData])

    if (error) {
      console.error('Error adding project:', error)
      alert(`Failed to add project: ${error.message}`)
    } else {
      alert('Project added successfully')
      handleCloseProjectModal()
      refreshData()
    }
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this provider?')) {
      const { error } = await supabase
        .from('providers')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting provider:', error)
        alert('Failed to delete provider')
      } else {
        alert('Provider deleted successfully')
        refreshData()
      }
    }
  }

  const getProjectName = (projectId) => {
    if (projectId === 'unassigned') return 'Unassigned Providers'
    const project = projects.find(p => p.id === projectId)
    return project ? project.project_name : 'Unknown Project'
  }

  const getTotalMonthlyPayment = (projectProviders) => {
    return projectProviders.reduce((sum, p) => sum + (p.monthly_payment || 0), 0)
  }

  const getFilteredProviders = () => {
    return providers.filter(p => {
      const matchesSearch =
        p.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesAccountName = !filters.accountName || p.account_name?.toLowerCase().includes(filters.accountName.toLowerCase())
      const matchesPaymentStatus = !filters.paymentStatus || p.remarks === filters.paymentStatus

      return matchesSearch && matchesAccountName && matchesPaymentStatus
    })
  }

  const groupProvidersByProject = () => {
    const filteredProviders = getFilteredProviders()
    const grouped = {}

    filteredProviders.forEach(provider => {
      const projectId = provider.project_id || 'unassigned'
      if (!grouped[projectId]) {
        grouped[projectId] = []
      }
      grouped[projectId].push(provider)
    })

    if (filters.sortDueDate) {
      Object.keys(grouped).forEach(projectId => {
        grouped[projectId].sort((a, b) => {
          const dateA = getDueDate(a.due_day, a.last_paid_month)
          const dateB = getDueDate(b.due_day, b.last_paid_month)
          return filters.sortDueDate === 'asc' ? dateA - dateB : dateB - dateA
        })
      })
    }

    return grouped
  }

  const groupedProviders = groupProvidersByProject()
  const uniqueAccountNames = [...new Set(providers.map(p => p.account_name).filter(Boolean))]

  const handleDeleteProject = async (id) => {
  if (window.confirm('Are you sure you want to delete this project?')) {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting project:', error)
      alert('Failed to delete project')
    } else {
      alert('Project deleted successfully')
      refreshData()
    }
  }
}

if (securityLoading) {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="animate-spin h-12 w-12 border-b-2 border-purple-600 rounded-full" />
    </div>
  )
}

  return (
    <div className="flex h-screen bg-gray-100">
      <BillingsSidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        <BillingNavbar 
          title="Providers" 
          subtitle="Manage your billing providers and their information"
        />

        <div className="p-6">
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search providers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={filters.accountName}
                onChange={(e) => setFilters({...filters, accountName: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Accounts</option>
                {uniqueAccountNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters({...filters, paymentStatus: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">All Status</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
              </select>
              <select
                value={filters.sortDueDate}
                onChange={(e) => setFilters({...filters, sortDueDate: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="">Sort by Due Date</option>
                <option value="asc">Due Date: Ascending</option>
                <option value="desc">Due Date: Descending</option>
              </select>
              <button
                onClick={() => handleOpenProjectModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium whitespace-nowrap"
              >
                Add Project
              </button>

              <button
                onClick={() => handleOpenProviderModal()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition font-medium whitespace-nowrap"
              >
                Add Provider
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : Object.keys(groupedProviders).length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-500 text-lg mb-2">No providers found</p>
              <p className="text-gray-400 text-sm">Try adjusting your filters or add your first provider</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedProviders).map(([projectId, projectProviders]) => (
                <div key={projectId} className="bg-white rounded-lg shadow overflow-hidden">
                  <div
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200 cursor-pointer hover:from-purple-100 hover:to-blue-100 transition"
                    onClick={() => toggleProject(projectId)}
                  >
                    <div className="flex items-center gap-3">
                      <button className="text-gray-600 hover:text-gray-900">
                        {expandedProjects[projectId] ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      {expandedProjects[projectId] ? (
                        <FolderOpen className="w-6 h-6 text-purple-600" />
                      ) : (
                        <Folder className="w-6 h-6 text-purple-600" />
                      )}
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {getProjectName(projectId)}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {projectProviders.length} provider{projectProviders.length !== 1 ? 's' : ''} · 
                          Total: ₱{getTotalMonthlyPayment(projectProviders).toLocaleString()}/month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {projectProviders.some(p => getPaymentStatus(p.due_day, p.last_paid_month, p.remarks) === 'overdue') && (
                        <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">
                          {projectProviders.filter(p => getPaymentStatus(p.due_day, p.last_paid_month, p.remarks) === 'overdue').length} Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {expandedProjects[projectId] && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Number</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Payment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {projectProviders.map((provider) => (
                            <tr key={provider.id} className="hover:bg-gray-50 transition">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={getPaymentStatus(provider.due_day, provider.last_paid_month, provider.remarks)} />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {provider.site_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {provider.account_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {provider.account_number}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {provider.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDueDate(provider.due_day, provider.last_paid_month)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                ₱{provider.monthly_payment?.toLocaleString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  provider.remarks === 'Paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {provider.remarks}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                                <button
                                  onClick={() => handleOpenProviderModal(provider)}
                                  className="text-purple-600 hover:text-purple-900 font-medium transition"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(provider.id)}
                                  className="text-red-600 hover:text-red-900 font-medium transition"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ProviderModal
        isOpen={isProviderModalOpen}
        provider={editingProvider}
        projects={projects}
        onClose={handleCloseProviderModal}
        onSubmit={handleProviderSubmit}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={handleCloseProjectModal}
        onSubmit={handleProjectSubmit}
        projects={projects}
        providers={providers}
        onDelete={handleDeleteProject}   
      />


    </div>
  )
}

export default Providers