import { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  User,
  TrendingUp,
  ListChecks,
  Trophy,
  Target,
  Zap
} from 'lucide-react';

const StaffDashboard = ({ 
  tasks = [], 
  currentUser,
  onTaskClick
}) => {
  // Filter only tasks assigned to current user
  const myTasks = tasks.filter(t => t.assigned_to === currentUser?.id);

  // Calculate staff statistics
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

  const StatCard = ({ icon: Icon, label, value, color, subtitle, bgColor }) => (
    <div className={`${bgColor} p-6 rounded-xl border-2 ${color.replace('text', 'border')} shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">{label}</p>
          <p className={`text-4xl font-black ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-600 mt-2 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-xl ${color} bg-opacity-10`}>
          <Icon className={`w-8 h-8 ${color}`} strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );

  const TaskCard = ({ task }) => {
    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high':
          return 'bg-red-500 text-white';
        case 'medium':
          return 'bg-amber-500 text-white';
        case 'low':
          return 'bg-emerald-500 text-white';
        default:
          return 'bg-gray-500 text-white';
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'completed':
          return 'bg-green-100 text-green-800 border-green-300';
        case 'in-progress':
          return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'validating':
          return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'todo':
          return 'bg-orange-100 text-orange-800 border-orange-300';
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300';
      }
    };

    const formatDate = (dateString) => {
      if (!dateString) return null;
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

    return (
      <div
        onClick={() => onTaskClick(task)}
        className="bg-white p-5 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 cursor-pointer group transform hover:-translate-y-1"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-gray-900 flex-1 pr-2 text-lg group-hover:text-blue-600 transition-colors">
            {task.title}
          </h3>
          <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${getStatusColor(task.status)}`}>
            {task.status.replace('-', ' ').toUpperCase()}
          </span>
          
          {task.due_date && (
            <div className={`flex items-center gap-2 text-sm font-semibold ${
              isOverdue ? 'text-red-600' : 'text-gray-600'
            }`}>
              <Calendar className="w-4 h-4" />
              <span>{formatDate(task.due_date)}</span>
              {isOverdue && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-black uppercase">
                  Overdue
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b-4 border-blue-600 px-8 py-6 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">
              My Dashboard
            </h1>
            <p className="text-gray-600 font-medium text-lg">
              Welcome back, <span className="text-blue-600 font-bold">{currentUser?.full_name}</span>!
            </p>
          </div>
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg">
            <Trophy className="w-6 h-6" />
            <div>
              <p className="text-sm font-bold uppercase tracking-wide opacity-90">Your Score</p>
              <p className="text-3xl font-black">{completionRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Overview Statistics */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-blue-600" strokeWidth={3} />
            Performance Overview
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={ListChecks}
              label="Total Tasks"
              value={totalTasks}
              color="text-gray-700"
              bgColor="bg-white"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed"
              value={completedTasks}
              color="text-green-600"
              subtitle={`${completionRate}% completion rate`}
              bgColor="bg-green-50"
            />
            <StatCard
              icon={Clock}
              label="In Progress"
              value={inProgressTasks}
              color="text-blue-600"
              bgColor="bg-blue-50"
            />
            <StatCard
              icon={Target}
              label="To Do"
              value={todoTasks}
              color="text-orange-600"
              bgColor="bg-orange-50"
            />
          </div>
        </section>

        {/* Overall Progress Bar */}
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-xl border-4 border-blue-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <Zap className="w-7 h-7" strokeWidth={3} />
              Your Progress
            </h3>
            <span className="text-5xl font-black text-white drop-shadow-lg">{completionRate}%</span>
          </div>
          <div className="w-full bg-white bg-opacity-30 rounded-full h-6 shadow-inner mb-6">
            <div 
              className="bg-gradient-to-r from-yellow-400 via-orange-500 to-pink-500 h-6 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white text-sm font-bold uppercase tracking-wide mb-1 opacity-90">To Do</p>
              <p className="text-3xl font-black text-white">{todoTasks}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white text-sm font-bold uppercase tracking-wide mb-1 opacity-90">In Progress</p>
              <p className="text-3xl font-black text-white">{inProgressTasks}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white text-sm font-bold uppercase tracking-wide mb-1 opacity-90">Validating</p>
              <p className="text-3xl font-black text-white">{validatingTasks}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-white text-sm font-bold uppercase tracking-wide mb-1 opacity-90">Completed</p>
              <p className="text-3xl font-black text-white">{completedTasks}</p>
            </div>
          </div>
        </section>

        {/* Alerts Section */}
        {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <AlertCircle className="w-7 h-7 text-red-600" strokeWidth={3} />
              Attention Required
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {overdueTasks.length > 0 && (
                <div className="bg-red-50 border-4 border-red-300 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-black text-red-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6" />
                    Overdue Tasks ({overdueTasks.length})
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {overdueTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
              
              {upcomingTasks.length > 0 && (
                <div className="bg-amber-50 border-4 border-amber-300 p-6 rounded-2xl shadow-lg">
                  <h3 className="text-xl font-black text-amber-900 mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    Upcoming (Next 7 Days) ({upcomingTasks.length})
                  </h3>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {upcomingTasks.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tasks by Status */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
            <ListChecks className="w-7 h-7 text-blue-600" strokeWidth={3} />
            All My Tasks
          </h2>

          {totalTasks === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border-4 border-gray-200 shadow-lg">
              <ListChecks className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-xl font-bold">No tasks assigned yet</p>
              <p className="text-gray-400 mt-2">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* To Do Tasks */}
              {tasksByStatus.todo.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border-4 border-orange-300 shadow-lg">
                  <h3 className="text-xl font-black text-orange-900 mb-4 flex items-center gap-2">
                    <Target className="w-6 h-6" />
                    To Do ({tasksByStatus.todo.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasksByStatus.todo.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* In Progress Tasks */}
              {tasksByStatus['in-progress'].length > 0 && (
                <div className="bg-white p-6 rounded-2xl border-4 border-blue-300 shadow-lg">
                  <h3 className="text-xl font-black text-blue-900 mb-4 flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    In Progress ({tasksByStatus['in-progress'].length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasksByStatus['in-progress'].map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Validating Tasks */}
              {tasksByStatus.validating.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border-4 border-purple-300 shadow-lg">
                  <h3 className="text-xl font-black text-purple-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-6 h-6" />
                    Validating ({tasksByStatus.validating.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tasksByStatus.validating.map(task => (
                      <TaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Tasks */}
              {tasksByStatus.completed.length > 0 && (
                <div className="bg-white p-6 rounded-2xl border-4 border-green-300 shadow-lg">
                  <h3 className="text-xl font-black text-green-900 mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6" />
                    Completed ({tasksByStatus.completed.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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