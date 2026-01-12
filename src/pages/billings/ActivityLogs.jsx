import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import BillingsSidebar from './components/BillingSidebar'
import BillingNavbar from './components/BillingNavbar'

const ActivityLogs = () => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true)
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('type', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching logs:', error)
      } else {
        setLogs(data || [])
      }
      setLoading(false)
    }

    loadLogs()

    const subscription = supabase
      .channel('activity_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'activity_logs' },
        loadLogs
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [filter])

  const getLogIcon = (type) => {
    switch (type) {
      case 'payment':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'create':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'update':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'delete':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  const formatTimestamp = (timestamp) => {
  // Convert the UTC timestamp string to a Date object
  const date = new Date(timestamp + 'Z') // 'Z' forces it to be UTC

  return date.toLocaleString('en-PH', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}



  return (
    <div className="flex h-screen bg-gray-100">
      <BillingsSidebar />
      <div className="flex-1 ml-64 overflow-y-auto">
        <BillingNavbar 
          title="Activity Logs" 
          subtitle="Track all billing system activities and changes"
        />

        <div className="p-6">
          {/* Filter Tabs */}
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <div className="flex space-x-2">
              {['all', 'payment', 'create', 'update', 'delete', 'error'].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    filter === type
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Logs List */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No activity logs found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                        log.type === 'payment' ? 'bg-green-100' :
                        log.type === 'error' ? 'bg-red-100' :
                        log.type === 'create' ? 'bg-blue-100' :
                        log.type === 'update' ? 'bg-yellow-100' :
                        log.type === 'delete' ? 'bg-red-100' :
                        'bg-gray-100'
                      }`}>
                        <div className={`${
                          log.type === 'payment' ? 'text-green-600' :
                          log.type === 'error' ? 'text-red-600' :
                          log.type === 'create' ? 'text-blue-600' :
                          log.type === 'update' ? 'text-yellow-600' :
                          log.type === 'delete' ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {getLogIcon(log.type)}
                        </div>
                      </div>
                      <div className="ml-4 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900">{log.action}</h3>
                          <span className="text-xs text-gray-500"> {formatTimestamp(log.created_at)}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">{log.details}</p>
                        <p className="mt-1 text-xs text-gray-500">By: {log.user_name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityLogs
