import { useState, useEffect } from 'react';
import { History, Calendar, User, Building2, Layers, Search, Filter, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const HistoryView = ({ currentUser, isAdmin }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBranch, setFilterBranch] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
    if (isAdmin) {
      loadBranches();
    }
  }, [currentUser, isAdmin]);

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

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      // ONLY load from task_history table - confirmed tasks only
      const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .order('confirmed_at', { ascending: false });

      if (error) throw error;

      setHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err.message || 'Failed to load history');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleString('en-US', {
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
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Invalid date';
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatDuration = (interval) => {
    if (!interval) return 'N/A';
    
    try {
      const intervalStr = String(interval);
      
      const daysMatch = intervalStr.match(/(\d+)\s+days?\s+(\d+):(\d+):(\d+)/);
      if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        const hours = parseInt(daysMatch[2]);
        const minutes = parseInt(daysMatch[3]);
        
        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      }
      
      const timeMatch = intervalStr.match(/(\d+):(\d+):(\d+)/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      }
      
      // Try ISO duration format
      const isoMatch = intervalStr.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
      if (isoMatch) {
        const hours = isoMatch[1] ? parseInt(isoMatch[1]) : 0;
        const minutes = isoMatch[2] ? parseInt(isoMatch[2]) : 0;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
      }
    } catch (err) {
      console.error('Error formatting duration:', err, interval);
    }
    
    return 'N/A';
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

  const getFilteredHistory = () => {
    let filtered = history;

    if (filterBranch !== 'all') {
      filtered = filtered.filter(task => task.branch_id === filterBranch);
    }

    if (filterDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (filterDateRange) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(task => {
        const confirmedDate = new Date(task.confirmed_at);
        return confirmedDate >= filterDate;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(task => 
        task.title?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assigned_user_name?.toLowerCase().includes(query) ||
        task.branch_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const filteredHistory = getFilteredHistory();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <History className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Task History</h1>
              <p className="text-sm text-gray-600">
                {isAdmin ? 'All completed and confirmed tasks' : 'Your completed tasks'}
              </p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {isAdmin && (
            <div className="relative">
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
          )}

          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border-b px-6 py-3">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Total History:</span>
            <span className="font-bold text-gray-900">{history.length}</span>
          </div>
          {(filterBranch !== 'all' || filterDateRange !== 'all' || searchQuery.trim()) && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Filtered:</span>
              <span className="font-bold text-gray-900">{filteredHistory.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <History className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {history.length === 0 ? 'No History Yet' : 'No Results Found'}
            </h3>
            <p className="text-gray-600 max-w-md">
              {history.length === 0 
                ? 'Completed and confirmed tasks will appear here.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map(task => (
              <HistoryTaskCard
                key={task.id}
                task={task}
                formatDateTime={formatDateTime}
                formatDate={formatDate}
                formatDuration={formatDuration}
                getPriorityColor={getPriorityColor}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const HistoryTaskCard = ({ task, formatDateTime, formatDate, formatDuration, getPriorityColor, isAdmin }) => {
  const [isExpanded, setIsExpanded] = useState(false);


  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div 
        className="px-4 py-3 border-b bg-gradient-to-r from-green-50 to-emerald-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
              <h3 className="font-semibold text-gray-900 truncate">
                {task.title || 'Untitled Task'}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Building2 className="w-3 h-3" />
              <span>{task.branch_name || 'Unknown Branch'}</span>
              <span>•</span>
              <Layers className="w-3 h-3" />
              <span>{task.board_name || 'Unknown Board'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-4">
            {task.priority && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-b">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-gray-500 block mb-1">Assigned To:</span>
            <div className="flex items-center gap-1">
              <User className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900 truncate">
                {task.assigned_user_name || 'Unassigned'}
              </span>
            </div>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Time Taken:</span>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              <span className="font-medium text-gray-900">
                {formatDuration(task.total_time_taken)}
              </span>
            </div>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Completed:</span>
            <span className="font-medium text-gray-900">
              {formatDate(task.completed_at)}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block mb-1">Confirmed:</span>
            <span className="font-medium text-gray-900">
              {formatDate(task.confirmed_at)}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 py-4 space-y-4">
          {task.description && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Description</h4>
              <p className="text-sm text-gray-600">{task.description}</p>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
            <div className="space-y-2">
              {task.created_at && (
                <TimelineItem
                  color="blue"
                  label="Created"
                  time={formatDateTime(task.created_at)}
                  detail={task.created_user_name ? `By: ${task.created_user_name}` : undefined}
                />
              )}
              
              {task.started_at && (
                <TimelineItem
                  color="yellow"
                  label="Started"
                  time={formatDateTime(task.started_at)}
                />
              )}
              
              {task.in_progress_at && (
                <TimelineItem
                  color="blue"
                  label="In Progress"
                  time={formatDateTime(task.in_progress_at)}
                />
              )}
              
              {task.validating_at && (
                <TimelineItem
                  color="purple"
                  label="Validating"
                  time={formatDateTime(task.validating_at)}
                />
              )}
              
              {task.completed_at && (
                <TimelineItem
                  color="green"
                  label="Completed"
                  time={formatDateTime(task.completed_at)}
                />
              )}
              
              {task.confirmed_at && (
                <TimelineItem
                  color="emerald"
                  label="Confirmed & Archived"
                  time={formatDateTime(task.confirmed_at)}
                  detail={task.confirmed_user_name ? `By: ${task.confirmed_user_name}` : undefined}
                />
              )}
            </div>
          </div>

          {task.due_date && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-1">Due Date</h4>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(task.due_date)}</span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-2 border-t bg-gray-50">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {isExpanded ? 'Show Less' : 'Show More Details'}
        </button>
      </div>
    </div>
  );
};

const TimelineItem = ({ color, label, time, detail }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-600'
  };

  return (
    <div className="flex items-start gap-3">
      <div className={`w-2 h-2 ${colorClasses[color]} rounded-full mt-1.5`}></div>
      <div className="flex-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">{label}</span>
          <span className="font-medium text-gray-900">{time}</span>
        </div>
        {detail && (
          <span className="text-xs text-gray-500">{detail}</span>
        )}
      </div>
    </div>
  );
};

export default HistoryView;