import { useState, useEffect } from 'react';
import { ClipboardCheck, Calendar, User, CheckCircle, Building2, Layers, Search, Filter, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const ToReviewView = ({ currentUser, onTaskConfirm, onRefresh }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [branches, setBranches] = useState([]);
  const [confirming, setConfirming] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPendingTasks();
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setBranches(data || []);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadPendingTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get all completed tasks that aren't confirmed
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'completed')
        .eq('is_confirmed', false)
        .order('completed_at', { ascending: false });

      if (tasksError) throw tasksError;

      if (!tasksData || tasksData.length === 0) {
        setTasks([]);
        setLoading(false);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set([
        ...tasksData.map(t => t.assigned_to).filter(Boolean),
        ...tasksData.map(t => t.created_by).filter(Boolean)
      ])];

      // Get unique branch IDs
      const branchIds = [...new Set(tasksData.map(t => t.branch_id).filter(Boolean))];

      // Get unique board IDs
      const boardIds = [...new Set(tasksData.map(t => t.board_id).filter(Boolean))];

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Fetch branches
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name')
        .in('id', branchIds);

      if (branchesError) throw branchesError;

      // Fetch boards
      const { data: boardsData, error: boardsError } = await supabase
        .from('boards')
        .select('id, name')
        .in('id', boardIds);

      if (boardsError) throw boardsError;

      // Create lookup maps
      const userMap = {};
      (usersData || []).forEach(user => {
        userMap[user.id] = user.full_name;
      });

      const branchMap = {};
      (branchesData || []).forEach(branch => {
        branchMap[branch.id] = branch.name;
      });

      const boardMap = {};
      (boardsData || []).forEach(board => {
        boardMap[board.id] = board.name;
      });

      // Enhance tasks with related data
      const enhancedTasks = tasksData.map(task => ({
        ...task,
        assigned_user: task.assigned_to ? {
          id: task.assigned_to,
          full_name: userMap[task.assigned_to] || 'Unknown'
        } : null,
        created_user: task.created_by ? {
          id: task.created_by,
          full_name: userMap[task.created_by] || 'Unknown'
        } : null,
        branches: task.branch_id ? {
          id: task.branch_id,
          name: branchMap[task.branch_id] || 'Unknown Branch'
        } : null,
        boards: task.board_id ? {
          id: task.board_id,
          name: boardMap[task.board_id] || 'Unknown Board'
        } : null
      }));

      setTasks(enhancedTasks);
    } catch (err) {
      console.error('Error loading pending review tasks:', err);
      setError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTask = async (taskId) => {
    if (!currentUser?.id) {
      alert('User not authenticated');
      return;
    }

    try {
      setConfirming(taskId);
      setError(null);

      const { error } = await supabase.rpc('archive_task_to_history', {
        task_uuid: taskId,
        confirming_user_id: currentUser.id
      });

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      if (onTaskConfirm) {
        onTaskConfirm(taskId);
      }
      if (onRefresh) {
        onRefresh();
      }

    } catch (err) {
      console.error('Error confirming task:', err);
      alert(`Failed to confirm task: ${err.message || 'Unknown error'}`);
    } finally {
      setConfirming(null);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'low':
        return 'bg-green-100 text-green-700 border-green-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    if (filterBranch !== 'all') {
      filtered = filtered.filter(task => task.branch_id === filterBranch);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assigned_user?.full_name?.toLowerCase().includes(query) ||
        task.branches?.name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks to review...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">To Review</h1>
              <p className="text-sm text-gray-600">Completed tasks awaiting confirmation</p>
            </div>
          </div>
          <button
            onClick={loadPendingTasks}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative min-w-[200px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Branches</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total Pending:</span>
            <span className="font-bold text-gray-900">{tasks.length}</span>
          </div>
          {filterBranch !== 'all' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Filtered:</span>
              <span className="font-bold text-gray-900">{filteredTasks.length}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {tasks.length === 0 ? 'All Caught Up!' : 'No Results Found'}
            </h3>
            <p className="text-gray-600 max-w-md">
              {tasks.length === 0 
                ? 'There are no completed tasks waiting for review at the moment.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map(task => (
              <TaskReviewCard
                key={task.id}
                task={task}
                onConfirm={handleConfirmTask}
                confirming={confirming === task.id}
                formatDateTime={formatDateTime}
                formatDate={formatDate}
                getPriorityColor={getPriorityColor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TaskReviewCard = ({ task, onConfirm, confirming, formatDateTime, formatDate, getPriorityColor }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-blue-900 truncate">
              {task.branches?.name || 'Unknown Branch'}
            </span>
          </div>
          {task.priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
          {task.title}
        </h3>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
          <Layers className="w-4 h-4" />
          <span>{task.boards?.name || 'Unknown Board'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div>
            <span className="text-gray-500 block mb-1">Assigned To:</span>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900 truncate">
                {task.assigned_user?.full_name || 'Unassigned'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Completed:</span>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">
                {formatDate(task.completed_at)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Started:</span>
            <span className="font-medium text-gray-900">
              {task.started_at ? formatDateTime(task.started_at) : 'N/A'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Completed:</span>
            <span className="font-medium text-gray-900">
              {formatDateTime(task.completed_at)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onConfirm(task.id)}
          disabled={confirming}
          className={`w-full py-2.5 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            confirming
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
          }`}
        >
          {confirming ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Confirming...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Confirm & Archive</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ToReviewView;