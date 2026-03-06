import { useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Kanban,
  Users,
  ChevronRight,
  ChevronDown,
  X,
  History,
  ClipboardCheck
} from 'lucide-react';
import PushNotificationToggle from '../../../components/PushNotificationToggle';


const LeftSidebar = ({ 
  activeView, 
  onViewChange, 
  branches = [],
  currentUser,
  onSelectBranch,
  onStaffListClick,
  pendingReviewCount = 0
}) => {
  const [expandedBranches, setExpandedBranches] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';

  const toggleBranches = () => {
    setExpandedBranches(!expandedBranches);
  };

  const handleNavClick = (callback) => {
    if (callback) {
      callback();
    }
    setIsMobileMenuOpen(false);
  };

  const NavItem = ({ icon: Icon, label, active, onClick, badge }) => (
    <button
      onClick={() => handleNavClick(onClick)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all relative ${
        active
          ? 'bg-blue-600 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-semibold flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
          active 
            ? 'bg-white text-blue-600' 
            : 'bg-red-500 text-white'
        }`}>
          {badge}
        </span>
      )}
    </button>
    
  );

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
      `}</style>

      {/* Mobile Burger Menu */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button 
          className={`burger-menu ${isMobileMenuOpen ? 'open' : ''}`}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
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
        onClick={() => setIsMobileMenuOpen(false)}
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
                {currentUser?.full_name || 'User'}
              </p>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <NavItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeView === 'dashboard'}
            onClick={() => onViewChange('dashboard')}
          />

          {isAdmin && (
            <NavItem
              icon={Building2}
              label="Branches"
              active={activeView === 'companies'}
              onClick={() => onViewChange('companies')}
            />
          )}

          {isAdmin && onStaffListClick && (
            <NavItem
              icon={Users}
              label="Staff"
              active={activeView === 'staff'}
              onClick={onStaffListClick}
            />
          )}

          {isAdmin && (
            <NavItem
              icon={ClipboardCheck}
              label="To Review"
              active={activeView === 'review'}
              onClick={() => onViewChange('review')}
              badge={pendingReviewCount}
            />
          )}

          <NavItem
            icon={History}
            label="History"
            active={activeView === 'history'}
            onClick={() => onViewChange('history')}
          />

          {isStaff && branches.length > 0 && (
            <div className="pt-4">
              <button
                onClick={toggleBranches}
                className="w-full flex items-center justify-between px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Kanban className="w-4 h-4" />
                  <span>Work Order</span>
                </div>
                {expandedBranches ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {expandedBranches && (
                <div className="mt-2 space-y-1 pl-2">
                  {branches.map(branch => (
                    <button
                      key={branch.id}
                      onClick={() => handleNavClick(() => onSelectBranch(branch))}
                      className={`w-full text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                        activeView === 'board' 
                          ? 'bg-blue-50 text-blue-700 font-semibold' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <span className="truncate">{branch.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <PushNotificationToggle />

        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            {isAdmin ? 'Administrator' : isStaff ? 'Staff Member' : 'User'}
          </div>
        </div>
      </div>
    </>
  );
};

export default LeftSidebar;