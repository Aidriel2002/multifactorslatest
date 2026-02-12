import { LayoutDashboard, Building2, ChevronRight } from 'lucide-react';

const LeftSidebar = ({ activeView, onViewChange, branches = [] }) => {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      count: null
    },
    {
      id: 'companies',
      label: 'Company List',
      icon: Building2,
      count: branches.length
    }
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo/Header */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">Kanban System</h1>
        <p className="text-xs text-gray-500 mt-1">Task Management</p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`
                  w-full flex items-center justify-between px-4 py-3 rounded-lg
                  transition-all duration-200 group
                  ${isActive 
                    ? 'bg-blue-50 text-blue-700 shadow-sm' 
                    : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className={`font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {item.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {item.count !== null && (
                    <span className={`
                      text-xs font-semibold px-2 py-0.5 rounded-full
                      ${isActive 
                        ? 'bg-blue-200 text-blue-800' 
                        : 'bg-gray-200 text-gray-600'
                      }
                    `}>
                      {item.count}
                    </span>
                  )}
                  <ChevronRight 
                    className={`
                      w-4 h-4 transition-transform
                      ${isActive ? 'text-blue-600 translate-x-1' : 'text-gray-400 opacity-0 group-hover:opacity-100'}
                    `} 
                  />
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          <p>© 2024 Kanban System</p>
        </div>
      </div>
    </div>
  );
};

export default LeftSidebar;