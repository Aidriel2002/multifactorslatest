import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getStaffPermissions, PERMISSION_TYPES } from '../utils/rbac'
import './AdminSidebar.css'

const menuItemsConfig = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: '📊',
    roles: ['admin', 'staff'],
    requiresPermission: null
  },
  {
    label: 'User Approval',
    path: '/admin/approval',
    icon: '✅',
    roles: ['admin'],
    requiresPermission: null
  },
  {
    label: 'Contacts',
    path: '/contacts/dashboard',
    icon: '📇',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.CONTACTS
  },
  {
    label: 'Expenses',
    path: '/expenses',
    icon: '💸',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.EXPENSES
  },
  {
    label: 'Landing Page Setup',
    path: '/manageproject',
    icon: '⚙️',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.PRODUCTS
  },
  { type: 'header', label: 'Integration' },
  {
    label: 'Kanban',
    path: '/kanban',
    icon: '🗂️',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.REPORTS
  },
  {
    label: 'DICT Reports',
    path: '/dictreport',
    icon: '📈',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.REPORTS
  },
  {
    label: 'Billings',
    path: '/billings',
    icon: '💰',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.BILLING
  },
  {
    label: 'Quotation',
    path: '/quotation',
    icon: '📝',
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.QUOTATIONS
  },
  {
    label: 'Tax Calculator',
    path: 'https://multifactorstax.netlify.app',
    icon: '📱',
    external: true,
    roles: ['admin', 'staff'],
    requiresPermission: null
  },
]

const AdminSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [visibleMenuItems, setVisibleMenuItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isSidebarOpen])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const filterMenuItems = async () => {
      if (!profile) {
        setVisibleMenuItems([])
        setLoading(false)
        return
      }

      const userRole = profile.role

      let staffPermissions = []
      if (userRole === 'staff') {
        staffPermissions = await getStaffPermissions(profile.id)
      }

      const filtered = menuItemsConfig.filter(item => {
        if (item.type === 'header') return true
        if (!item.roles) return true
        if (!item.roles.includes(userRole)) return false
        if (userRole === 'admin') return true
        if (userRole === 'staff') {
          if (!item.requiresPermission) return true
          if (staffPermissions.includes(PERMISSION_TYPES.ALL_ACCESS)) return true
          return staffPermissions.includes(item.requiresPermission)
        }
        return false
      })

      setVisibleMenuItems(filtered)
      setLoading(false)
    }

    filterMenuItems()
  }, [profile])

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

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev)
    setShowUserMenu(false)
  }

  if (loading) {
    return (
      <>
        <button
          className="burger-menu"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <span className="burger-line"></span>
          <span className="burger-line"></span>
          <span className="burger-line"></span>
        </button>
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h1 className="sidebar-title">Multifactors Sales</h1>
          </div>
          <div className="sidebar-loading">
            <div className="loading-spinner"></div>
          </div>
        </aside>
      </>
    )
  }

  return (
    <>
      <button
        className={`burger-menu ${isSidebarOpen ? 'is-open' : ''}`}
        onClick={toggleSidebar}
        aria-label="Toggle menu"
        aria-expanded={isSidebarOpen}
      >
        <span className="burger-line"></span>
        <span className="burger-line"></span>
        <span className="burger-line"></span>
      </button>

      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      <aside className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="sidebar-title">Multifactors Sales</h1>
          <button
            className="close-sidebar"
            onClick={closeSidebar}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleMenuItems.map((item, index) => (
            item.type === 'header' ? (
              <div key={index} className="nav-header">
                <p className="nav-header-text">{item.label}</p>
              </div>
            ) : item.external ? (
              <a
                key={index}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className="nav-link"
                onClick={closeSidebar}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </a>
            ) : (
              <Link
                key={index}
                to={item.path}
                className={`nav-link ${isActive(item.path) ? 'active' : ''}`}
                onClick={closeSidebar}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-menu-container">
            <button
              onClick={() => setShowUserMenu(prev => !prev)}
              className="user-menu-button"
              aria-expanded={showUserMenu}
            >
              <div className="user-avatar">
                {profile?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <p className="user-name">{profile?.full_name}</p>
                <p className="user-role">{profile?.role}</p>
              </div>
              <svg
                className={`dropdown-icon ${showUserMenu ? 'rotated' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <Link
                  to="/settings"
                  onClick={() => {
                    setShowUserMenu(false)
                    closeSidebar()
                  }}
                  className="dropdown-item"
                >
                  <svg className="dropdown-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Account Settings</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="dropdown-item logout"
                >
                  <svg className="dropdown-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
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

export default AdminSidebar