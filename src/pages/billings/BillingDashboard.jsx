import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import BillingsSidebar from './components/BillingSidebar'
import BillingNavbar from './components/BillingNavbar'
import { useNavigate } from 'react-router-dom'


const BillingDashboard = () => {
  const navigate = useNavigate()
  const [providers, setProviders] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      setLoading(true)
      
      // Fetch providers
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('*')
        .order('due_day', { ascending: true })

      // Fetch recent payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment_history')
        .select(`
          *,
          providers (site_name, account_name)
        `)
        .order('payment_date', { ascending: false })
        .limit(5)

      if (!isMounted) return

      if (providersError) {
        console.error('Error fetching providers:', providersError)
      } else {
        setProviders(providersData || [])
      }

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError)
      } else {
        setRecentPayments(paymentsData || [])
      }

      setLoading(false)
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

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

  const stats = {
    totalRevenue: providers.reduce((sum, p) => sum + (p.monthly_payment || 0), 0),
    pendingPayments: providers
      .filter(p => getPaymentStatus(p.due_day, p.last_paid_month, p.remarks) !== 'paid')
      .reduce((sum, p) => sum + (p.monthly_payment || 0), 0),
    activeProviders: providers.length,
    overdueCount: providers.filter(p => getPaymentStatus(p.due_day, p.last_paid_month, p.remarks) === 'overdue').length,
    paidThisMonth: providers.filter(p => p.remarks === 'Paid').length
  }

  const upcomingDue = providers
    .filter(p => {
      const status = getPaymentStatus(p.due_day, p.last_paid_month, p.remarks)
      return status === 'due-soon' || status === 'overdue'
    })
    .slice(0, 5)

  return (
    <div className="flex h-screen bg-gray-100">
      <BillingsSidebar />

      <div className="flex-1 ml-64 overflow-y-auto">
        <BillingNavbar 
          title="Billing Dashboard" 
          subtitle="Overview of your billing and payment activities"
        />

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>

          ) : (
            <>
            
              {/* Stats Grid */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
                {/* Quick Actions */}
              <div className="mt-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    <h3 className="text-lg font-semibold mb-1">Ready to manage your bills?</h3>
                    <p className="text-purple-100 text-sm">Process payments, view history, and manage your providers</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => navigate('/billings/to-pay')}
                      className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition shadow-md"
                    >
                      Pay Bills 
                    </button>

                    <button
                      onClick={() => navigate('/billings/providers')}
                      className="px-6 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-400 transition"
                    >
                      Manage Providers
                    </button>

                  </div>
                </div>
              </div>
                {/* Total Revenue */}
                <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-green-500">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">Total</dt>
                          <dd className="text-xl font-bold text-gray-900">₱ {stats.totalRevenue.toLocaleString()}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-yellow-500">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">Pending Payment</dt>
                          <dd className="text-xl font-bold text-gray-900">₱ {stats.pendingPayments.toLocaleString()}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-blue-500">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">Active Providers</dt>
                          <dd className="text-xl font-bold text-gray-900">{stats.activeProviders}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-red-500">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">Overdue Payment</dt>
                          <dd className="text-xl font-bold text-gray-900">{stats.overdueCount}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-lg rounded-lg border-l-4 border-purple-500">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <dl>
                          <dt className="text-xs font-medium text-gray-500 truncate">Paid This Month</dt>
                          <dd className="text-xl font-bold text-gray-900">{stats.paidThisMonth}</dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-yellow-50 to-orange-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg className="h-5 w-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Upcoming Due Bills
                    </h3>
                  </div>
                  <div className="p-6">
                    {upcomingDue.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p>No upcoming bills due soon!</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {upcomingDue.map((provider) => {
                          const status = getPaymentStatus(provider.due_day, provider.last_paid_month, provider.remarks)
                          const dueDate = getDueDate(provider.due_day, provider.last_paid_month)
                          
                          return (
                            <div key={provider.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900">{provider.site_name}</h4>
                                <p className="text-xs text-gray-500">{provider.account_name}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  Due: {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">₱ {provider.monthly_payment.toLocaleString()}</p>
                                <span className={`inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                                  status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {status === 'overdue' ? 'Overdue' : 'Due Soon'}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <svg className="h-5 w-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Recent Payments
                    </h3>
                  </div>
                  <div className="p-6">
                    {recentPayments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <svg className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p>No payment history yet</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentPayments.map((payment) => {
                          const paymentDate = new Date(payment.payment_date)
                          
                          return (
                            <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900">
                                  {payment.providers?.site_name || 'Unknown Provider'}
                                </h4>
                                <p className="text-xs text-gray-500">{payment.providers?.account_name}</p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </p>
                                {payment.reference_number && (
                                  <p className="text-xs text-gray-500 mt-1">Ref: {payment.reference_number}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-green-600">₱ {payment.total_amount.toLocaleString()}</p>
                                <span className="inline-block mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Completed
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default BillingDashboard