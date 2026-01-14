import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const adminMenuItems = [
  { label: 'Dashboard', path: '/admin', icon: '📊' },
  { label: 'User Approval', path: '/admin/approval', icon: '✅' },
  { label: 'DICT Reports', path: '/dictreport', icon: '📈' },
  { label: 'Contacts', path: '/admin/analytics', icon: '📉' },
  { label: 'Billings', path: '/billings', icon: '💰' },
  { label: 'System Settings', path: '/admin/system', icon: '⚙️' },
]

const AdminSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <aside className="fixed top-0 left-0 h-screen w-64 bg-green-900 text-white z-50 flex flex-col">
      <div className="p-4 border-b border-green-700">
        <h1 className="text-xl font-bold">Multifactors Sales</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {adminMenuItems.map((item, index) => (
          <Link
            key={index}
            to={item.path}
            className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
              isActive(item.path)
                ? 'bg-green-600 text-white'
                : 'text-gray-300 hover:bg-green-800 hover:text-white'
            }`}
          >
            <span className="text-xl mr-3">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-green-700 p-4">
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center w-full px-3 py-2 rounded-lg hover:bg-green-800 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold mr-3">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-white">{profile?.full_name}</p>
              <p className="text-xs text-green-400 capitalize">{profile?.role}</p>
            </div>
            <svg
              className={`w-5 h-5 text-green-400 transition-transform ${
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
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-green-800 rounded-lg shadow-lg overflow-hidden">
              <Link
                to="/settings"
                onClick={() => setShowUserMenu(false)}
                className="flex items-center px-4 py-3 hover:bg-green-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-3 text-green-400"
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
                className="flex items-center w-full px-4 py-3 hover:bg-green-700 transition-colors text-left text-red-400 hover:text-red-300"
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
    </aside>
  )
}

export default AdminSidebar
