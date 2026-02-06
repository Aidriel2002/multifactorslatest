import { useState } from 'react'
import { usePageSecurity } from '../../../hooks/usePageSecurity'
import { canAccessBilling } from '../../../utils/rbac'

const PaymentModal = ({ isOpen, provider, onClose, onSubmit }) => {
  const { loading: securityLoading } = usePageSecurity(canAccessBilling)

  const [paymentForm, setPaymentForm] = useState({
    monthlyPayment: provider?.monthly_payment || 0,
    referenceNumber: '',
    installationFee: 0,
    isAdvance: false,
    monthsPaid: 1
  })

  const calculateTotal = () =>
    paymentForm.monthlyPayment * paymentForm.monthsPaid +
    paymentForm.installationFee

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(paymentForm, calculateTotal())
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
      <div className="bg-white rounded-lg max-w-md w-full overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Process Payment</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700">{provider?.site_name}</p>
            <p className="text-xs text-gray-500">{provider?.account_name}</p>
            <p className="text-xs text-gray-500 mt-1">Account: {provider?.account_number}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
              <input
                type="number"
                required
                value={paymentForm.monthlyPayment}
                onChange={(e) => setPaymentForm({...paymentForm, monthlyPayment: parseFloat(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
              <input
                type="text"
                required
                value={paymentForm.referenceNumber}
                onChange={(e) => setPaymentForm({...paymentForm, referenceNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter transaction reference"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Installation Fee (Optional)</label>
              <input
                type="number"
                value={paymentForm.installationFee}
                onChange={(e) => setPaymentForm({...paymentForm, installationFee: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                checked={paymentForm.isAdvance}
                onChange={(e) => setPaymentForm({...paymentForm, isAdvance: e.target.checked, monthsPaid: e.target.checked ? paymentForm.monthsPaid : 1})}
                className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label className="ml-2 text-sm text-gray-700">Advance Payment (Pay for multiple months)</label>
            </div>

            {paymentForm.isAdvance && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Months</label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={paymentForm.monthsPaid}
                  onChange={(e) => setPaymentForm({...paymentForm, monthsPaid: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Monthly × {paymentForm.monthsPaid}</span>
                <span className="font-medium">₱ {(paymentForm.monthlyPayment * paymentForm.monthsPaid).toLocaleString()}</span>
              </div>
              {paymentForm.installationFee > 0 && (
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Installation Fee</span>
                  <span className="font-medium">₱ {paymentForm.installationFee.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold text-gray-900">Total Amount</span>
                <span className="font-bold text-xl text-purple-600">₱ {calculateTotal().toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default PaymentModal