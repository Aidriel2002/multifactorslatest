import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'

const billingsMenuItems = [
  { label: 'Dashboard', path: '/billings', icon: '📊' },
  { label: 'Providers', path: '/billings/providers', icon: '🏢' },
  { label: 'Pay Bill', path: '/billings/to-pay', icon: '💰' },
  { label: 'Activity Logs', path: '/billings/logs', icon: '📋' },
  { label: 'Payment History', path: '/billings/payments', icon: '💳' },
]

const BillingsSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    return location.pathname === path
  }

  return (
    <div className="flex flex-col h-screen bg-green text-white w-64 fixed left-0 top-0">
      {/* Logo/Header */}
      <div className="p-4 border-b border-green-700">
        <h1 className="text-xl font-bold">💰 Billing System</h1>
        <p className="text-xs text-green-200 mt-1">Payment Management</p>
      </div>

      {/* Back to Main Link */}
      <div className="px-4 py-3 border-b border-green-700">
        <Link
          to="/admin"
          className="flex items-center px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="text-sm font-medium">Multifactors Sales</span>
        </Link>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {billingsMenuItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-green-600 text-white'
                : 'text-purple-100 hover:bg-green-700 hover:text-white'
            }`}
          >
            <span className="text-xl mr-3">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="border-t border-green-700 p-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center w-full px-3 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-3">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">{profile?.full_name}</p>
              <p className="text-xs text-purple-200 capitalize">{profile?.role}</p>
            </div>
            <svg
              className={`w-5 h-5 text-purple-200 transition-transform ${
                showUserMenu ? 'rotate-180' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-green-700 rounded-lg shadow-lg overflow-hidden">
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-4 py-3 hover:bg-green-600 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-3 text-green-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="text-sm">Account Settings</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center w-full px-4 py-3 hover:bg-green-600 transition-colors text-left text-red-300 hover:text-red-200"
              >
                <svg
                  className="w-5 h-5 mr-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-sm">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BillingsSidebar