import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import BillingsSidebar from './components/BillingSidebar'
import BillingNavbar from './components/BillingNavbar'

const Providers = () => {
  const [providers, setProviders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    site_name: '',
    account_name: '',
    account_number: '',
    email: '',
    phone: '',
    due_day: '',
    monthly_payment: '',
    remarks: 'Unpaid'
  })

  useEffect(() => {
    const fetchProviders = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching providers:', error)
      } else {
        setProviders(data || [])
      }
      setLoading(false)
    }

    fetchProviders()
  }, [])

  const getDueDate = (dueDay, lastPaidMonth) => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()
    
    // Create due date for current month
    let dueDate = new Date(currentYear, currentMonth, parseInt(dueDay))
    
    // If last payment was made this month, move to next month
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

  const handleOpenModal = (provider = null) => {
    if (provider) {
      setEditingProvider(provider)
      setFormData({
        site_name: provider.site_name,
        account_name: provider.account_name,
        account_number: provider.account_number,
        email: provider.email,
        phone: provider.phone,
        due_day: provider.due_day,
        monthly_payment: provider.monthly_payment,
        remarks: provider.remarks || 'Unpaid'
      })
    } else {
      setEditingProvider(null)
      setFormData({
        site_name: '',
        account_name: '',
        account_number: '',
        email: '',
        phone: '',
        due_day: '',
        monthly_payment: '',
        remarks: 'Unpaid'
      })
    }
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingProvider(null)
    setFormData({
      site_name: '',
      account_name: '',
      account_number: '',
      email: '',
      phone: '',
      due_day: '',
      monthly_payment: '',
      remarks: 'Unpaid'
    })
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()

    // Validate required fields
    if (!formData.site_name || !formData.account_name || !formData.account_number || 
        !formData.email || !formData.phone || !formData.due_day || !formData.monthly_payment) {
      alert('Please fill in all required fields')
      return
    }

    const submitData = {
      site_name: formData.site_name,
      account_name: formData.account_name,
      account_number: formData.account_number,
      email: formData.email,
      phone: formData.phone,
      due_day: parseInt(formData.due_day),
      monthly_payment: parseFloat(formData.monthly_payment),
      remarks: formData.remarks
    }

    // If marking as paid, update last_paid_month
    if (formData.remarks === 'Paid') {
      submitData.last_paid_month = new Date().toISOString()
    }

    if (editingProvider) {
      const { error } = await supabase
        .from('providers')
        .update(submitData)
        .eq('id', editingProvider.id)

      if (error) {
        console.error('Error updating provider:', error)
        alert(`Failed to update provider: ${error.message}`)
      } else {
        alert('Provider updated successfully')
        handleCloseModal()
        setLoading(true)
        const { data } = await supabase.from('providers').select('*').order('created_at', { ascending: false })
        setProviders(data || [])
        setLoading(false)
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
        handleCloseModal()
        setLoading(true)
        const { data } = await supabase.from('providers').select('*').order('created_at', { ascending: false })
        setProviders(data || [])
        setLoading(false)
      }
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
        setLoading(true)
        const { data } = await supabase.from('providers').select('*').order('created_at', { ascending: false })
        setProviders(data || [])
        setLoading(false)
      }
    }
  }

  const filteredProviders = providers.filter(p =>
    p.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDueDate = (dueDay, lastPaidMonth) => {
    const dueDate = getDueDate(dueDay, lastPaidMonth)
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <BillingsSidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        <BillingNavbar 
          title="Providers" 
          subtitle="Manage your billing providers and their information"
          onAddProvider={() => handleOpenModal()}
        />

        <div className="p-6">
          <div className="mb-6 w-full flex items-center gap-4">
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

            <div>
              <button
                onClick={() => handleOpenModal()}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Add Provider
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg overflow-hidden">
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
                  {filteredProviders.map((provider) => (
                    <tr key={provider.id} className="hover:bg-gray-50">
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${provider.monthly_payment?.toLocaleString()}
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
                          onClick={() => handleOpenModal(provider)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(provider.id)}
                          className="text-red-600 hover:text-red-900"
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
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingProvider ? 'Edit Provider' : 'Add New Provider'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                    <input
                      type="text"
                      required
                      value={formData.site_name}
                      onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                    <input
                      type="text"
                      required
                      value={formData.account_name}
                      onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <input
                      type="text"
                      required
                      value={formData.account_number}
                      onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Day (1-31)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={formData.due_day}
                      onChange={(e) => setFormData({...formData, due_day: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 15 for the 15th of each month"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                    <input
                      type="number"
                      required
                      value={formData.monthly_payment}
                      onChange={(e) => setFormData({...formData, monthly_payment: parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      value={formData.remarks}
                      onChange={(e) => setFormData({...formData, remarks: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    {editingProvider ? 'Update Provider' : 'Add Provider'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Providers