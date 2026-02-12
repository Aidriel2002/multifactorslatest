import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ListChecks, 
  Users, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Calendar
} from 'lucide-react';

const KanbanSidebar = ({ 
  tasks = [], 
  users = [], 
  selectedBoard = null, 
  currentUser = null 
}) => {
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    inProgress: 0,
    todo: 0,
    validating: 0,
    completionRate: 0,
    staffStats: []
  });

  useEffect(() => {
    if (tasks && users) {
      calculateStats();
    }
  }, [tasks, users]);

  const calculateStats = () => {
    // Ensure tasks and users are arrays
    const taskList = Array.isArray(tasks) ? tasks : [];
    const userList = Array.isArray(users) ? users : [];

    const total = taskList.length;
    const completed = taskList.filter(t => t.status === 'completed').length;
    const inProgress = taskList.filter(t => t.status === 'in-progress').length;
    const todo = taskList.filter(t => t.status === 'todo').length;
    const validating = taskList.filter(t => t.status === 'validating').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Calculate staff statistics
    const staffStats = userList.map(user => {
      const userTasks = taskList.filter(t => t.assigned_to === user.id);
      const userCompleted = userTasks.filter(t => t.status === 'completed').length;
      const userTotal = userTasks.length;
      const userCompletionRate = userTotal > 0 ? Math.round((userCompleted / userTotal) * 100) : 0;

      return {
        id: user.id,
        name: user.full_name || 'Unknown User',
        totalTasks: userTotal,
        completed: userCompleted,
        inProgress: userTasks.filter(t => t.status === 'in-progress').length,
        completionRate: userCompletionRate
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    setStats({
      total,
      completed,
      inProgress,
      todo,
      validating,
      completionRate,
      staffStats
    });
  };

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{label}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-lg ${color.replace('text', 'bg').replace('600', '100')}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </div>
  );

  const StaffRow = ({ staff }) => (
    <div className="bg-white p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-sm text-gray-900">{staff.name}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded ${
          staff.completionRate >= 80 ? 'bg-green-100 text-green-700' :
          staff.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>
          {staff.completionRate}%
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-600">
        <span className="flex items-center gap-1">
          <ListChecks className="w-3 h-3" />
          {staff.totalTasks} total
        </span>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-green-600" />
          {staff.completed} done
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-blue-600" />
          {staff.inProgress} active
        </span>
      </div>
      {/* Progress bar */}
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all ${
            staff.completionRate >= 80 ? 'bg-green-600' :
            staff.completionRate >= 50 ? 'bg-yellow-600' :
            'bg-red-600'
          }`}
          style={{ width: `${staff.completionRate}%` }}
        />
      </div>
    </div>
  );

  return (
    <div className="w-80 bg-gray-50 border-l border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-1">
          <LayoutDashboard className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Dashboard</h2>
        </div>
        {selectedBoard && (
          <p className="text-xs text-gray-500">{selectedBoard.name}</p>
        )}
      </div>

      <div className="p-4 space-y-6">
        {/* Overview Stats */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Overview
          </h3>
          <div className="space-y-3">
            <StatCard
              icon={ListChecks}
              label="Total Tasks"
              value={stats.total}
              color="text-gray-600"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={stats.completed}
              color="text-green-600"
              subtitle={`${stats.completionRate}% completion rate`}
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={stats.inProgress}
              color="text-blue-600"
            />
            <StatCard
              icon={AlertCircle}
              label="To Do"
              value={stats.todo}
              color="text-orange-600"
            />
          </div>
        </div>

        {/* Overall Completion Rate */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Overall Progress</span>
            <span className="text-2xl font-bold text-blue-600">{stats.completionRate}%</span>
          </div>
          <div className="w-full bg-white rounded-full h-3 shadow-inner">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Staff Performance */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Performance
          </h3>
          <div className="space-y-2">
            {stats.staffStats.length > 0 ? (
              stats.staffStats.map(staff => (
                <StaffRow key={staff.id} staff={staff} />
              ))
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p>No staff assigned yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-gray-700">
              <p className="font-semibold mb-1">Board Activity</p>
              <p>Track your team's progress and completion rates in real-time.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KanbanSidebar;