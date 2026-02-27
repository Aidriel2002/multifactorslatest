import { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  TrendingUp,
  ListChecks,
  Target
} from 'lucide-react';

const StaffDashboard = ({ 
  tasks = [], 
  currentUser,
  onTaskClick
}) => {
  const myTasks = tasks.filter(t => {
    if (t.assigned_users && Array.isArray(t.assigned_users)) {
      return t.assigned_users.some(user => user.id === currentUser?.id);
    }
    return t.assigned_to === currentUser?.id;
  });

  const totalTasks = myTasks.length;
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = myTasks.filter(t => t.status === 'in-progress').length;
  const todoTasks = myTasks.filter(t => t.status === 'todo').length;
  const validatingTasks = myTasks.filter(t => t.status === 'validating').length;
  
  const completionRate = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;

  // Group tasks by status
  const tasksByStatus = {
    todo: myTasks.filter(t => t.status === 'todo'),
    'in-progress': myTasks.filter(t => t.status === 'in-progress'),
    validating: myTasks.filter(t => t.status === 'validating'),
    completed: myTasks.filter(t => t.status === 'completed')
  };

  // Get overdue tasks
  const overdueTasks = myTasks.filter(t => 
    t.due_date && 
    new Date(t.due_date) < new Date() && 
    t.status !== 'completed'
  );

  // Get upcoming tasks (due in next 7 days)
  const upcomingTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const dueDate = new Date(t.due_date);
    const today = new Date();
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return dueDate > today && dueDate <= weekFromNow;
  });

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const TaskCard = ({ task }) => {
    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high':
          return 'text-red-600 bg-red-50 border-red-200';
        case 'medium':
          return 'text-amber-600 bg-amber-50 border-amber-200';
        case 'low':
          return 'text-green-600 bg-green-50 border-green-200';
        default:
          return 'text-gray-600 bg-gray-50 border-gray-200';
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed':
          return 'text-green-700 bg-green-50';
        case 'in-progress':
          return 'text-blue-700 bg-blue-50';
        case 'validating':
          return 'text-purple-700 bg-purple-50';
        case 'todo':
          return 'text-gray-700 bg-gray-50';
        default:
          return 'text-gray-700 bg-gray-50';
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return null;
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

    return (
      <div
        onClick={() => onTaskClick(task)}
        className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex-1 pr-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {task.title}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status.replace('-', ' ')}
          </span>
          
          {task.priority && (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          )}
          
          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            My Tasks
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Welcome back, {currentUser?.full_name}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Stats Grid */}
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              icon={ListChecks}
              label="Total"
              value={totalTasks}
              color="text-gray-700"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedTasks}
              color="text-green-600"
              subtitle={`${completionRate}%`}
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={inProgressTasks}
              color="text-blue-600"
            />
            <StatCard
              icon={Target}
              label="To Do"
              value={todoTasks}
              color="text-gray-600"
            />
          </div>
        </section>

        {/* Progress Bar */}
        <section className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Overall Progress</h3>
            </div>
            <span className="text-2xl font-bold text-blue-600">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4 text-center text-xs sm:text-sm">
            <div>
              <p className="text-gray-600">To Do</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{todoTasks}</p>
            </div>
            <div>
              <p className="text-gray-600">Active</p>
              <p className="text-lg sm:text-xl font-bold text-blue-600">{inProgressTasks}</p>
            </div>
            <div>
              <p className="text-gray-600">Review</p>
              <p className="text-lg sm:text-xl font-bold text-purple-600">{validatingTasks}</p>
            </div>
            <div>
              <p className="text-gray-600">Done</p>
              <p className="text-lg sm:text-xl font-bold text-green-600">{completedTasks}</p>
            </div>
          </div>
        </section>

        {/* Alerts */}
        {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overdueTasks.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Overdue ({overdueTasks.length})</h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {overdueTasks.slice(0, 3).map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {overdueTasks.length > 3 && (
                    <p className="text-xs text-red-700 text-center py-2">
                      +{overdueTasks.length - 3} more overdue tasks
                    </p>
                  )}
                </div>
              </div>
            )}
            
            {upcomingTasks.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Due Soon ({upcomingTasks.length})</h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {upcomingTasks.slice(0, 3).map(task => (
                    <TaskCard key={task.id} task={task} />
                  ))}
                  {upcomingTasks.length > 3 && (
                    <p className="text-xs text-amber-700 text-center py-2">
                      +{upcomingTasks.length - 3} more upcoming tasks
                    </p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* All Tasks by Status */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Tasks</h2>

          {totalTasks === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No tasks assigned</p>
              <p className="text-gray-400 text-sm mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* To Do */}
              {tasksByStatus.todo.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                    To Do ({tasksByStatus.todo.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus.todo.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress */}
              {tasksByStatus['in-progress'].length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    In Progress ({tasksByStatus['in-progress'].length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus['in-progress'].map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Validating */}
              {tasksByStatus.validating.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Validating ({tasksByStatus.validating.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus.validating.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed */}
              {tasksByStatus.completed.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Completed ({tasksByStatus.completed.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus.completed.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StaffDashboard;