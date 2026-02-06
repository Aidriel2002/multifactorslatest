import { useState } from 'react'
import { usePageSecurity } from '../../../hooks/usePageSecurity'
import { canAccessBilling } from '../../../utils/rbac'

const ProviderModal = ({ isOpen, provider, projects, onClose, onSubmit }) => {
  const { loading: securityLoading } = usePageSecurity(canAccessBilling)

  const getInitialFormData = () => {
    if (provider) {
      return {
        site_name: provider.site_name || '',
        account_name: provider.account_name || '',
        account_number: provider.account_number || '',
        email: provider.email || '',
        phone: provider.phone || '',
        due_day: provider.due_day || '',
        monthly_payment: provider.monthly_payment || '',
        remarks: provider.remarks || 'Unpaid',
        project_id: provider.project_id || ''
      }
    }
    return {
      site_name: '',
      account_name: '',
      account_number: '',
      email: '',
      phone: '',
      due_day: '',
      monthly_payment: '',
      remarks: 'Unpaid',
      project_id: ''
    }
  }

  const [formData, setFormData] = useState(getInitialFormData())

  if (isOpen && provider && formData.site_name === '' && provider.site_name) {
    setFormData(getInitialFormData())
  }

  const handleSubmit = (e) => {
    if (e) e.preventDefault()

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
      remarks: formData.remarks,
      project_id: formData.project_id || null
    }

    if (formData.remarks === 'Paid') {
      submitData.last_paid_month = new Date().toISOString()
    }

    onSubmit(submitData, provider?.id)
  }

  const handleClose = () => {
    setFormData({
      site_name: '',
      account_name: '',
      account_number: '',
      email: '',
      phone: '',
      due_day: '',
      monthly_payment: '',
      remarks: 'Unpaid',
      project_id: ''
    })
    onClose()
  }

  if (!isOpen) return null
  if (securityLoading) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="animate-spin h-12 w-12 border-b-2 border-purple-600 rounded-full" />
    </div>
  )
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {provider ? 'Edit Provider' : 'Add New Provider'}
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a project (optional)</option>
                  {projects.map(project => (
                    <option key={project.id} value={project.id}>
                      {project.project_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.site_name}
                  onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., PLDT"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_name}
                  onChange={(e) => setFormData({...formData, account_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Account holder name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({...formData, account_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Account or reference number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="contact@provider.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="+63 XXX XXX XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Day (1-31) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="31"
                  value={formData.due_day}
                  onChange={(e) => setFormData({...formData, due_day: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g., 15 for the 15th"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Payment <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.monthly_payment}
                  onChange={(e) => setFormData({...formData, monthly_payment: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status
                </label>
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

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition font-medium"
              >
                {provider ? 'Update Provider' : 'Add Provider'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ProviderModal