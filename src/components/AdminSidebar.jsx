import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getStaffPermissions, PERMISSION_TYPES } from '../utils/rbac'
import { 
  LayoutDashboard,
  CheckCircle,
  BookUser,
  Receipt,
  Settings,
  TrendingUp,
  Kanban,
  FileText,
  Calculator,
  DollarSign,
  ExternalLink,
  ChevronDown,
  X,
  LogOut,
  User
} from 'lucide-react'

const menuItemsConfig = [
  {
    label: 'Dashboard',
    path: '/admin',
    icon: LayoutDashboard,
    roles: ['admin', 'staff'],
    requiresPermission: null
  },
  {
    label: 'User Approval',
    path: '/admin/approval',
    icon: CheckCircle,
    roles: ['admin'],
    requiresPermission: null
  },
  {
    label: 'Contacts',
    path: '/contacts/dashboard',
    icon: BookUser,
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.CONTACTS
  },
  {
    label: 'Expenses',
    path: '/expenses',
    icon: Receipt,
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.EXPENSES
  },
  {
    label: 'Landing Page Setup',
    path: '/manageproduct',  // FIXED: Changed from /manageproject to /manageproduct
    icon: Settings,
    roles: ['admin', 'staff'],
    requiresPermission: [PERMISSION_TYPES.PRODUCTS, PERMISSION_TYPES.PROJECTS] // Accept EITHER permission
  },
  { type: 'header', label: 'Integration' },
  {
    label: 'Kanban',
    path: '/kanban',
    icon: Kanban,
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.KANBAN
  },
  {
    label: 'DICT Reports',
    path: '/dictreport',
    icon: TrendingUp,
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.REPORTS
  },
  {
    label: 'Billings',
    path: '/billings',
    icon: DollarSign,
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.BILLING
  },
  {
    label: 'Quotation',
    path: '/quotation',
    icon: FileText,
    roles: ['admin', 'staff'],
    requiresPermission: PERMISSION_TYPES.QUOTATIONS
  },
  {
    label: 'Tax Calculator',
    path: 'https://multifactorstax.netlify.app',
    icon: Calculator,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isMobileMenuOpen])

  useEffect(() => {
    setIsMobileMenuOpen(false)
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
          
          // Handle array of permissions (OR logic - any permission grants access)
          if (Array.isArray(item.requiresPermission)) {
            return item.requiresPermission.some(perm => staffPermissions.includes(perm))
          }
          
          // Handle single permission
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
    setIsMobileMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  const handleNavClick = (callback) => {
    callback()
    setIsMobileMenuOpen(false)
    setShowUserMenu(false)
  }

  const NavItem = ({ icon: Icon, label, path, active, onClick, external }) => (
    external ? (
      <a
        href={path}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => handleNavClick(() => {})}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          active
            ? 'bg-green-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-semibold flex-1">{label}</span>
        <ExternalLink className="w-4 h-4" />
      </a>
    ) : (
      <Link
        to={path}
        onClick={() => handleNavClick(onClick)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
          active
            ? 'bg-green-600 text-white shadow-md'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-semibold">{label}</span>
      </Link>
    )
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .burger-menu {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            width: 2rem;
            height: 2rem;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 0;
            z-index: 10;
          }

          .burger-menu span {
            width: 2rem;
            height: 0.25rem;
            background: #1f2937;
            border-radius: 10px;
            transition: all 0.3s linear;
            position: relative;
            transform-origin: 1px;
          }

          .burger-menu.open span:first-child {
            transform: rotate(45deg);
          }

          .burger-menu.open span:nth-child(2) {
            opacity: 0;
            transform: translateX(20px);
          }

          .burger-menu.open span:nth-child(3) {
            transform: rotate(-45deg);
          }

          .mobile-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 40;
            display: none;
          }

          .mobile-overlay.open {
            display: block;
          }

          .sidebar-mobile {
            position: fixed;
            top: 0;
            left: -100%;
            height: 100vh;
            width: 16rem;
            background: white;
            transition: left 0.3s ease-in-out;
            z-index: 50;
          }

          .sidebar-mobile.open {
            left: 0;
          }
        }

        @media (min-width: 769px) {
          .burger-menu {
            display: none;
          }

          .mobile-overlay {
            display: none !important;
          }

          .sidebar-mobile {
            position: relative;
            left: 0;
            width: 16rem;
          }
        }

        .user-menu-dropdown {
          position: absolute;
          bottom: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          margin-bottom: 0.5rem;
          overflow: hidden;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          width: 100%;
          padding: 0.75rem 1rem;
          text-align: left;
          color: #374151;
          background: white;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .dropdown-item:hover {
          background-color: #f3f4f6;
        }

        .dropdown-item.logout {
          color: #dc2626;
        }

        .dropdown-item.logout:hover {
          background-color: #fee2e2;
        }
      `}</style>

      {/* Mobile Burger Menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          className={`burger-menu ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'open' : ''}`}
        onClick={toggleMobileMenu}
      />

      {/* Sidebar */}
      <div className={`sidebar-mobile ${isMobileMenuOpen ? 'open' : ''} bg-white border-r border-gray-200 flex flex-col h-screen`}>
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">
                Multifactors Sales
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {profile?.full_name}
              </p>
            </div>
            <button 
              onClick={toggleMobileMenu}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {visibleMenuItems.map((item, index) => (
            item.type === 'header' ? (
              <div key={index} className="pt-4 pb-2">
                <p className="px-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            ) : (
              <NavItem
                key={index}
                icon={item.icon}
                label={item.label}
                path={item.path}
                active={isActive(item.path)}
                onClick={() => {}}
                external={item.external}
              />
            )
          ))}
        </div>

        {/* Footer - User Menu */}
        <div className="p-4 border-t border-gray-200 relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-gray-500 capitalize">
                {profile?.role}
              </p>
            </div>
            <ChevronDown 
              className={`w-5 h-5 text-gray-400 transition-transform ${
                showUserMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {showUserMenu && (
            <div className="user-menu-dropdown">
              <Link
                to="/settings"
                onClick={() => {
                  setShowUserMenu(false)
                  setIsMobileMenuOpen(false)
                }}
                className="dropdown-item"
              >
                <User className="w-4 h-4" />
                <span>Account Settings</span>
              </Link>
              <button
                onClick={handleSignOut}
                className="dropdown-item logout"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default AdminSidebar