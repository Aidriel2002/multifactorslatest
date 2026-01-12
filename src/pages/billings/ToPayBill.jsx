import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import BillingsSidebar from './components/BillingSidebar'
import BillingNavbar from './components/BillingNavbar'

const ToPayBill = () => {
  const { profile } = useAuth()

  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [paymentModal, setPaymentModal] = useState({
    isOpen: false,
    provider: null
  })

  const [paymentForm, setPaymentForm] = useState({
    monthlyPayment: 0,
    referenceNumber: '',
    installationFee: 0,
    isAdvance: false,
    monthsPaid: 1
  })

  /* =========================
     FETCH PROVIDERS
  ========================== */
  useEffect(() => {
    let isMounted = true

    const fetchProviders = async () => {
      setLoading(true)

      const { data, error } = await supabase
        .from('providers')
        .select('*')
        .order('due_day', { ascending: true })

      if (!isMounted) return

      if (error) {
        console.error('Error fetching providers:', error)
      } else {
        setProviders(data || [])
      }

      setLoading(false)
    }

    fetchProviders()

    return () => {
      isMounted = false
    }
  }, [])

  /* =========================
     HELPERS
  ========================== */
  const getDueDate = (dueDay, lastPaidMonth) => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentYear = today.getFullYear()

    let dueDate = new Date(currentYear, currentMonth, parseInt(dueDay))

    if (lastPaidMonth) {
      const lastPaid = new Date(lastPaidMonth)
      if (
        lastPaid.getMonth() === currentMonth &&
        lastPaid.getFullYear() === currentYear
      ) {
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
    return dueDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const StatusBadge = ({ status }) => {
    const map = {
      paid: 'bg-green-100 text-green-800',
      upcoming: 'bg-blue-100 text-blue-800',
      'due-soon': 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800'
    }

    const labels = {
      paid: 'Paid',
      upcoming: 'Upcoming',
      'due-soon': 'Due Soon',
      overdue: 'Overdue'
    }

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${map[status]}`}>
        {labels[status]}
      </span>
    )
  }

  /* =========================
     PAYMENT HANDLERS
  ========================== */
  const openPaymentModal = (provider) => {
    setPaymentModal({ isOpen: true, provider })
    setPaymentForm({
      monthlyPayment: provider.monthly_payment,
      referenceNumber: '',
      installationFee: 0,
      isAdvance: false,
      monthsPaid: 1
    })
  }

  const closePaymentModal = () => {
    setPaymentModal({ isOpen: false, provider: null })
  }

  const calculateTotal = () =>
    paymentForm.monthlyPayment * paymentForm.monthsPaid +
    paymentForm.installationFee

  const handlePayBill = async (e) => {
    e.preventDefault()

    const { provider } = paymentModal
    const totalAmount = calculateTotal()

    const { error } = await supabase.from('payment_history').insert([{
      provider_id: provider.id,
      monthly_payment: paymentForm.monthlyPayment,
      installation_fee: paymentForm.installationFee,
      total_amount: totalAmount,
      months_paid: paymentForm.monthsPaid,
      reference_number: paymentForm.referenceNumber,
      payment_date: new Date().toISOString(),
      status: 'completed'
    }])

    if (error) {
      alert('Payment failed')
      return
    }

    await supabase
      .from('providers')
      .update({
        remarks: 'Paid',
        last_paid_month: new Date().toISOString()
      })
      .eq('id', provider.id)

    await supabase.from('activity_logs').insert([{
      action: 'Payment processed',
      details: `₱${totalAmount.toLocaleString()} paid to ${provider.site_name}`,
      user_name: profile?.full_name,
      type: 'payment'
    }])

    await supabase.from('notifications').insert([{
      message: `Payment received from ${provider.site_name}`,
      type: 'payment',
      read: false
    }])

    alert('Payment successful')
    closePaymentModal()
    window.location.reload()
  }

  /* =========================
     CATEGORIZE BILLS
  ========================== */
  const categorizedBills = {
    overdue: [],
    dueSoon: [],
    upcoming: []
  }

  providers.forEach(p => {
    const matchesSearch =
      p.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return

    const status = getPaymentStatus(p.due_day, p.last_paid_month, p.remarks)

    if (status === 'overdue') {
      categorizedBills.overdue.push(p)
    } else if (status === 'due-soon') {
      categorizedBills.dueSoon.push(p)
    } else if (status === 'upcoming') {
      categorizedBills.upcoming.push(p)
    }
  })

  /* =========================
     RENDER TABLE SECTION
  ========================== */
  const renderBillSection = (title, bills, bgColor, icon) => {
    if (bills.length === 0) return null

    return (
      <div className="mb-8">
        <div className={`${bgColor} px-4 py-3 rounded-t-lg flex items-center gap-2`}>
          <span className="text-2xl">{icon}</span>
          <h2 className="text-lg font-bold text-gray-800">
            {title} ({bills.length})
          </h2>
        </div>
        <div className="bg-white shadow-lg rounded-b-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge
                      status={getPaymentStatus(
                        p.due_day,
                        p.last_paid_month,
                        p.remarks
                      )}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {p.site_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {p.account_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDueDate(p.due_day, p.last_paid_month)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    ₱ {p.monthly_payment.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      p.remarks === 'Paid' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {p.remarks}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => openPaymentModal(p)}
                      disabled={p.remarks === 'Paid'}
                      className={`px-4 py-2 rounded-md font-medium transition ${
                        p.remarks === 'Paid'
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {p.remarks === 'Paid' ? 'Paid' : 'Pay Bill'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  /* =========================
     JSX
  ========================== */
  return (
    <div className="flex h-screen bg-gray-100">
      <BillingsSidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        <BillingNavbar title="Bills to Pay" subtitle="Process and manage your bill payments" />

        <div className="p-6">
          {/* SEARCH */}
          <div className="mb-6">
            <div className="relative">
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
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-6 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Overdue Bills</p>
                      <p className="text-3xl font-bold text-red-700">{categorizedBills.overdue.length}</p>
                    </div>
                    <span className="text-4xl">🚨</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-6 rounded-lg border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">Due This Week</p>
                      <p className="text-3xl font-bold text-yellow-700">{categorizedBills.dueSoon.length}</p>
                    </div>
                    <span className="text-4xl">⏰</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Upcoming Bills</p>
                      <p className="text-3xl font-bold text-blue-700">{categorizedBills.upcoming.length}</p>
                    </div>
                    <span className="text-4xl">📅</span>
                  </div>
                </div>
              </div>

              {/* Categorized Bill Sections */}
              {renderBillSection(
                'Overdue Bills',
                categorizedBills.overdue,
                'bg-red-100',
                '🚨'
              )}

              {renderBillSection(
                'Due This Week',
                categorizedBills.dueSoon,
                'bg-yellow-100',
                '⏰'
              )}

              {renderBillSection(
                'Upcoming Bills',
                categorizedBills.upcoming,
                'bg-blue-100',
                '📅'
              )}

              {/* No Bills Message */}
              {categorizedBills.overdue.length === 0 &&
               categorizedBills.dueSoon.length === 0 &&
               categorizedBills.upcoming.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <svg className="h-16 w-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 text-lg">All bills are paid! 🎉</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {paymentModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Process Payment</h2>
                <button onClick={closePaymentModal} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-4 p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">{paymentModal.provider?.site_name}</p>
                <p className="text-xs text-gray-500">{paymentModal.provider?.account_name}</p>
                <p className="text-xs text-gray-500 mt-1">Account: {paymentModal.provider?.account_number}</p>
              </div>

              <div className="space-y-4">
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
                    onClick={closePaymentModal} 
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handlePayBill}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                  >
                    Confirm Payment
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

export default ToPayBill