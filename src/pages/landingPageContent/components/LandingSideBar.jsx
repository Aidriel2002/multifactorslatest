import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import './LandingSideBar.css'

const landingMenuItems = [
  { label: 'Manage Projects', path: '/manageproject', icon: '🏢' },
  { label: 'Manage Products', path: '/manageproduct', icon: '📦' },
]

const LandingSideBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  )

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = (e) => {
      setIsDesktop(e.matches)
      if (e.matches) setIsSidebarOpen(false)
    }
    setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.body.style.overflow = isSidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isSidebarOpen])

  useEffect(() => {
    setIsSidebarOpen(false)
    setShowUserMenu(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    setIsSidebarOpen(false)
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const closeSidebar = () => {
    setIsSidebarOpen(false)
    setShowUserMenu(false)
  }

  return (
    <>
      {!isDesktop && (
        <button
          className={`landing-burger ${isSidebarOpen ? 'is-open' : ''}`}
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label="Toggle menu"
          aria-expanded={isSidebarOpen}
        >
          <span className="burger-line" />
          <span className="burger-line" />
          <span className="burger-line" />
        </button>
      )}

      {!isDesktop && (
        <div
          className={`landing-overlay ${isSidebarOpen ? 'active' : ''}`}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className="landing-sidebar"
        style={{
          transform: isDesktop ? 'translateX(0)' : isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)'
        }}
      >
        <div className="flex flex-col h-full w-full bg-green-900 text-white">

          <div className="p-4 border-b border-green-700 flex items-center justify-between flex-shrink-0">
            <div>
              <h1 className="text-lg font-bold leading-tight">Landing Page Setup</h1>
              <p className="text-xs text-green-200 mt-0.5">Landing Page Management</p>
            </div>
            {!isDesktop && (
              <button
                onClick={closeSidebar}
                aria-label="Close menu"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div className="px-4 py-3 border-b border-green-700 flex-shrink-0">
            <Link
              to="/admin"
              className="flex items-center px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 transition-colors"
              onClick={closeSidebar}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium">Multifactors Sales</span>
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto py-4">
            {landingMenuItems.map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-green-700 text-white'
                    : 'text-green-100 hover:bg-green-800 hover:text-white'
                }`}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="border-t border-green-700 p-4 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(prev => !prev)}
                className="flex items-center w-full px-3 py-2 rounded-lg hover:bg-green-800 transition-colors"
                aria-expanded={showUserMenu}
              >
                <div className="w-9 h-9 rounded-full bg-green-700 flex items-center justify-center text-white font-bold text-sm mr-3 flex-shrink-0">
                  {profile?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium truncate">{profile?.full_name}</p>
                  <p className="text-xs text-green-200 capitalize">{profile?.role}</p>
                </div>
                <svg
                  className="w-4 h-4 text-green-200 flex-shrink-0 transition-transform"
                  style={{ transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-green-800 rounded-lg shadow-lg overflow-hidden z-10">
                  <Link
                    to="/settings"
                    onClick={() => { setShowUserMenu(false); closeSidebar() }}
                    className="flex items-center px-4 py-3 hover:bg-green-700 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-green-200 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm">Account Settings</span>
                  </Link>

                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-3 hover:bg-green-700 transition-colors text-left text-red-300 hover:text-red-200"
                  >
                    <svg className="w-4 h-4 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="text-sm">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </aside>
    </>
  )
}

export default LandingSideBar