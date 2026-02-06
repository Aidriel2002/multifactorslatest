import { useState, useEffect } from 'react'
import { usePageSecurity } from '../../../hooks/usePageSecurity'
import { canAccessContacts } from '../../../utils/rbac'

const AddContactModal = ({ isOpen, onClose, onSubmit, contact }) => {
  const { loading: securityLoading } = usePageSecurity(canAccessContacts)

  const [formData, setFormData] = useState({
    site_name: '',
    name: '',
    contact_number: '',
    fb_account: '',
    province: '',
    city: '',
    project_name: '',
    contact_type: 'Contact Person'
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (contact) {
      setFormData({
        site_name: contact.site_name || '',
        name: contact.name || '',
        contact_number: contact.contact_number || '',
        fb_account: contact.fb_account || '',
        province: contact.province || '',
        city: contact.city || '',
        project_name: contact.project_name || '',
        contact_type: contact.contact_type || 'Contact Person'
      })
    } else {
      setFormData({
        site_name: '',
        name: '',
        contact_number: '',
        fb_account: '',
        province: '',
        city: '',
        project_name: '',
        contact_type: 'Contact Person'
      })
    }
  }, [contact])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit(formData)
      setFormData({
        site_name: '',
        name: '',
        contact_number: '',
        fb_account: '',
        province: '',
        city: '',
        project_name: '',
        contact_type: 'Contact Person'
      })
    } catch {
      alert('Failed to save contact')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        site_name: '',
        name: '',
        contact_number: '',
        fb_account: '',
        province: '',
        city: '',
        project_name: '',
        contact_type: 'Contact Person'
      })
      onClose()
    }
  }

  if (!isOpen) return null
  
  if (securityLoading) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full" />
    </div>
  )
}

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {contact ? 'Edit Contact' : 'Add New Contact'}
            </h2>
            <button 
              onClick={handleClose} 
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Site Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Site Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.site_name}
                  onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Site 001"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Full Name"
                />
              </div>

              {/* Contact Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact # <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formData.contact_number}
                  onChange={(e) => setFormData({...formData, contact_number: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 0912-345-6789"
                />
              </div>

              {/* FB Account */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FB Account
                </label>
                <input
                  type="text"
                  value={formData.fb_account}
                  onChange={(e) => setFormData({...formData, fb_account: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Facebook name or link"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Province <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.province}
                  onChange={(e) => setFormData({...formData, province: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Misamis Oriental"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City/Municipality <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Cagayan de Oro"
                />
              </div>

              {/* Project Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.project_name}
                  onChange={(e) => setFormData({...formData, project_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Phase 1, North Region"
                />
              </div>

              {/* Contact Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.contact_type}
                  onChange={(e) => setFormData({...formData, contact_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Contact Person">Contact Person</option>
                  <option value="Internet Provider">Internet Provider</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : (contact ? 'Update Contact' : 'Add Contact')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddContactModal