import { useState, useEffect } from 'react'
import { usePageSecurity } from '../../../hooks/usePageSecurity'
import { canAccessReports } from '../../../utils/rbac'

const AddReportModal = ({ isOpen, onClose, site, onSubmit }) => {
  const { loading: securityLoading } = usePageSecurity(canAccessReports)

  const [formData, setFormData] = useState({
    downtime_start: '',
    downtime_end: '',
    cause: ''
  })
  const [startDate, setStartDate] = useState('')
  const [startHour, setStartHour] = useState('')
  const [startMinute, setStartMinute] = useState('')
  const [endDate, setEndDate] = useState('')
  const [endHour, setEndHour] = useState('')
  const [endMinute, setEndMinute] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormData({
        downtime_start: '',
        downtime_end: '',
        cause: ''
      })
      setStartDate('')
      setStartHour('')
      setStartMinute('')
      setEndDate('')
      setEndHour('')
      setEndMinute('')
    }
  }, [isOpen])

  // Update formData.downtime_start when date/time changes
  useEffect(() => {
    if (startDate && startHour !== '' && startMinute !== '') {
      const hour = startHour.toString().padStart(2, '0')
      const minute = startMinute.toString().padStart(2, '0')
      setFormData(prev => ({...prev, downtime_start: `${startDate}T${hour}:${minute}`}))
    }
  }, [startDate, startHour, startMinute])

  // Update formData.downtime_end when date/time changes
  useEffect(() => {
    if (endDate && endHour !== '' && endMinute !== '') {
      const hour = endHour.toString().padStart(2, '0')
      const minute = endMinute.toString().padStart(2, '0')
      setFormData(prev => ({...prev, downtime_end: `${endDate}T${hour}:${minute}`}))
    }
  }, [endDate, endHour, endMinute])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSubmit(formData)
      setFormData({
        downtime_start: '',
        downtime_end: '',
        cause: ''
      })
      setStartDate('')
      setStartHour('')
      setStartMinute('')
      setEndDate('')
      setEndHour('')
      setEndMinute('')
    } catch (error) {
      console.error('Error submitting report:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateDuration = () => {
    if (formData.downtime_start && formData.downtime_end) {
      const start = new Date(formData.downtime_start)
      const end = new Date(formData.downtime_end)
      const diff = end - start
      
      if (diff > 0) {
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h ${minutes}m`
      }
    }
    return 'N/A'
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
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Add Downtime Report</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {site && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Site Code</p>
              <p className="text-lg font-bold text-blue-900">{site.site_code}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Downtime Start
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  required
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">HH</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="flex items-center text-gray-500">:</span>
                <select
                  required
                  value={startMinute}
                  onChange={(e) => setStartMinute(e.target.value)}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">MM</option>
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">24-hour format: 00 = midnight, 13 = 1PM, 23 = 11PM</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Downtime End
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  required
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">HH</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span className="flex items-center text-gray-500">:</span>
                <select
                  required
                  value={endMinute}
                  onChange={(e) => setEndMinute(e.target.value)}
                  className="w-20 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">MM</option>
                  {Array.from({ length: 60 }, (_, i) => (
                    <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500 mt-1">24-hour format: 00 = midnight, 13 = 1PM, 23 = 11PM</p>
            </div>

            {formData.downtime_start && formData.downtime_end && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Duration: <span className="font-semibold text-gray-900">{calculateDuration()}</span></p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cause of Downtime
              </label>
              <textarea
                required
                value={formData.cause}
                onChange={(e) => setFormData({...formData, cause: e.target.value})}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the cause of downtime..."
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> This report will be automatically logged to the "logs" sheet in your Google Spreadsheet.
              </p>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AddReportModal