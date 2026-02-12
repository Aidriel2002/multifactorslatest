import { useState } from 'react';
import { 
  Plus, 
  Building2, 
  TrendingUp, 
  Users, 
  ListChecks,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trophy,
  MapPin,
  UserCircle
} from 'lucide-react';

const Dashboard = ({ 
  branches = [], 
  tasks = [], 
  users = [], 
  currentUser,
  onAddBranch,
  onSelectBranch 
}) => {
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({
    name: '',
    description: '',
    location: '',
    manager_id: ''
  });

  // Calculate overall statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = tasks.filter(t => t.status === 'todo').length;
  const overallCompletionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Calculate branch statistics
  const branchStats = branches.map(branch => {
    const branchTasks = tasks.filter(t => t.branch_id === branch.id);
    const branchCompleted = branchTasks.filter(t => t.status === 'completed').length;
    const branchTotal = branchTasks.length;
    const completionRate = branchTotal > 0 
      ? Math.round((branchCompleted / branchTotal) * 100) 
      : 0;

    return {
      ...branch,
      totalTasks: branchTotal,
      completedTasks: branchCompleted,
      completionRate
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  // Calculate staff statistics
  const staffStats = users.map(user => {
    const userTasks = tasks.filter(t => t.assigned_to === user.id);
    const userCompleted = userTasks.filter(t => t.status === 'completed').length;
    const userTotal = userTasks.length;
    const completionRate = userTotal > 0 
      ? Math.round((userCompleted / userTotal) * 100) 
      : 0;

    return {
      id: user.id,
      name: user.full_name || 'Unknown User',
      totalTasks: userTotal,
      completed: userCompleted,
      inProgress: userTasks.filter(t => t.status === 'in-progress').length,
      completionRate
    };
  }).sort((a, b) => b.completionRate - a.completionRate);

  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) {
      alert('Branch name is required');
      return;
    }

    await onAddBranch(newBranch);
    setNewBranch({ name: '', description: '', location: '', manager_id: '' });
    setShowBranchModal(false);
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle, trend }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className={`text-3xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${color.replace('text', 'bg').replace('600', '100')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          <TrendingUp className="w-3 h-3 text-green-600" />
          <span className="text-green-600 font-medium">{trend}</span>
          <span className="text-gray-500">vs last month</span>
        </div>
      )}
    </div>
  );

  const StaffCard = ({ staff, rank }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all">
      <div className="flex items-center gap-3 mb-3">
        {rank <= 3 && (
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full font-bold text-white text-sm
            ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-orange-600'}
          `}>
            {rank}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{staff.name}</span>
            <span className={`
              text-xs font-bold px-2.5 py-1 rounded-full
              ${staff.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                staff.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'}
            `}>
              {staff.completionRate}%
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
        <span className="flex items-center gap-1">
          <ListChecks className="w-3.5 h-3.5" />
          {staff.totalTasks} tasks
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          {staff.completed} done
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          {staff.inProgress} active
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all ${
            staff.completionRate >= 80 ? 'bg-green-500' :
            staff.completionRate >= 50 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${staff.completionRate}%` }}
        />
      </div>
    </div>
  );

  const BranchCard = ({ branch, rank }) => (
    <div 
      className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onSelectBranch(branch)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {rank <= 3 && (
            <Trophy className={`w-5 h-5 ${
              rank === 1 ? 'text-yellow-500' : 
              rank === 2 ? 'text-gray-400' : 
              'text-orange-600'
            }`} />
          )}
          <div>
            <h3 className="font-semibold text-gray-900">{branch.name}</h3>
            {branch.location && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {branch.location}
              </p>
            )}
          </div>
        </div>
        <span className={`
          text-lg font-bold px-3 py-1 rounded-lg
          ${branch.completionRate >= 80 ? 'bg-green-100 text-green-700' :
            branch.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'}
        `}>
          {branch.completionRate}%
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
        <span>{branch.totalTasks} tasks</span>
        <span className="text-green-600">{branch.completedTasks} completed</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className={`h-2.5 rounded-full transition-all ${
            branch.completionRate >= 80 ? 'bg-green-500' :
            branch.completionRate >= 50 ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${branch.completionRate}%` }}
        />
      </div>
    </div>
  );

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Overview of all branches and performance</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowBranchModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-md"
            >
              <Plus className="w-5 h-5" />
              Add Branch
            </button>
          )}
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Overview Statistics */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Building2}
              label="Total Branches"
              value={branches.length}
              color="text-purple-600"
            />
            <StatCard
              icon={ListChecks}
              label="Total Tasks"
              value={totalTasks}
              color="text-gray-600"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedTasks}
              color="text-green-600"
              subtitle={`${overallCompletionRate}% completion rate`}
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={inProgressTasks}
              color="text-blue-600"
            />
          </div>
        </section>

        {/* Overall Progress */}
        <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Overall Company Progress</h3>
            <span className="text-4xl font-bold text-blue-600">{overallCompletionRate}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-4 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${overallCompletionRate}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div className="text-center">
              <p className="text-gray-600">To Do</p>
              <p className="text-xl font-bold text-orange-600">{todoTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">In Progress</p>
              <p className="text-xl font-bold text-blue-600">{inProgressTasks}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Completed</p>
              <p className="text-xl font-bold text-green-600">{completedTasks}</p>
            </div>
          </div>
        </section>

        {/* Staff Performance */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Staff Performance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffStats.length > 0 ? (
              staffStats.slice(0, 6).map((staff, index) => (
                <StaffCard key={staff.id} staff={staff} rank={index + 1} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No staff assigned yet</p>
              </div>
            )}
          </div>
        </section>

        {/* Productive Branches */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Most Productive Branches
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branchStats.length > 0 ? (
              branchStats.map((branch, index) => (
                <BranchCard key={branch.id} branch={branch} rank={index + 1} />
              ))
            ) : (
              <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No branches yet</p>
                {isAdmin && (
                  <button
                    onClick={() => setShowBranchModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add First Branch
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Add Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Add New Branch</h2>
              <p className="text-sm text-gray-600 mt-1">Create a new company branch</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manila Branch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manila, Philippines"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBranch.description}
                  onChange={(e) => setNewBranch({ ...newBranch, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Branch description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Manager
                </label>
                <select
                  value={newBranch.manager_id}
                  onChange={(e) => setNewBranch({ ...newBranch, manager_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select manager (optional)</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowBranchModal(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBranch}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Add Branch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;