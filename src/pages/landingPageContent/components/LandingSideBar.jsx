import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { 
  Settings, 
  Package, 
  FolderKanban,
  ArrowLeft,
  User,
  LogOut,
  ChevronDown,
  X,
  Menu
} from 'lucide-react'

const landingMenuItems = [
  { label: 'Manage Projects', path: '/manageproject', icon: FolderKanban },
  { label: 'Manage Products', path: '/manageproduct', icon: Package },
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
      {/* Mobile Menu Button */}
      {!isDesktop && (
        <button
          onClick={() => setIsSidebarOpen(prev => !prev)}
          aria-label="Toggle menu"
          aria-expanded={isSidebarOpen}
          style={{
            position: 'fixed',
            top: '1rem',
            left: '1rem',
            zIndex: 50,
            background: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '0.5rem',
            cursor: 'pointer',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
          }}
        >
          {isSidebarOpen ? (
            <X className="w-5 h-5 text-gray-700" />
          ) : (
            <Menu className="w-5 h-5 text-gray-700" />
          )}
        </button>
      )}

      {/* Overlay */}
      {!isDesktop && isSidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 40,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          position: isDesktop ? 'relative' : 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          width: '16rem',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          transform: isDesktop ? 'translateX(0)' : isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 45,
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Settings className="w-5 h-5 text-blue-600" />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#111827' }}>
              Landing Page Setup
            </h2>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#6B7280' }}>
            Manage website content
          </p>
        </div>

        {/* Back to Dashboard */}
        <div style={{
          padding: '1rem',
          borderBottom: '1px solid #e5e7eb',
          flexShrink: 0
        }}>
          <Link
            to="/admin"
            onClick={closeSidebar}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: '500',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DBEAFE'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EFF6FF'}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Multifactors Sales</span>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {landingMenuItems.map((item, index) => {
              const Icon = item.icon
              const active = isActive(item.path)
              return (
                <Link
                  key={index}
                  to={item.path}
                  onClick={closeSidebar}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    backgroundColor: active ? '#2563EB' : 'transparent',
                    color: active ? 'white' : '#374151',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    transition: 'all 0.2s',
                    boxShadow: active ? '0 1px 3px 0 rgba(0, 0, 0, 0.1)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = '#F3F4F6'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Info Card */}
        <div style={{
          margin: '0 1rem 1rem 1rem',
          padding: '0.75rem',
          backgroundColor: '#EFF6FF',
          border: '1px solid #BFDBFE',
          borderRadius: '0.5rem',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem' }}>
            <Settings className="w-4 h-4 text-blue-600 mt-0.5" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.75rem', color: '#1E40AF' }}>
              <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Content Management</p>
              <p style={{ lineHeight: '1.4' }}>
                Update your website's projects and products from here.
              </p>
            </div>
          </div>
        </div>

        {/* User Menu */}
        <div style={{
          borderTop: '1px solid #e5e7eb',
          padding: '1rem',
          flexShrink: 0
        }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(prev => !prev)}
              aria-expanded={showUserMenu}
              style={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                gap: '0.75rem'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1D4ED8',
                fontWeight: 'bold',
                fontSize: '0.875rem',
                flexShrink: 0
              }}>
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                <p style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '600', 
                  color: '#111827',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {profile?.full_name}
                </p>
                <p style={{ 
                  fontSize: '0.75rem', 
                  color: '#6B7280',
                  textTransform: 'capitalize'
                }}>
                  {profile?.role}
                </p>
              </div>
              <ChevronDown 
                className="w-4 h-4 text-gray-400"
                style={{
                  flexShrink: 0,
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              />
            </button>

            {showUserMenu && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                marginBottom: '0.5rem',
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                zIndex: 10
              }}>
                <Link
                  to="/settings"
                  onClick={() => { setShowUserMenu(false); closeSidebar() }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'white',
                    border: 'none',
                    textDecoration: 'none',
                    color: '#374151',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <User className="w-4 h-4" style={{ flexShrink: 0 }} />
                  <span>Account Settings</span>
                </Link>

                <button
                  onClick={handleSignOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    backgroundColor: 'white',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <LogOut className="w-4 h-4" style={{ flexShrink: 0 }} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

export default LandingSideBar