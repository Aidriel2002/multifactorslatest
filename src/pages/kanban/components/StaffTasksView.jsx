import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, Clock, AlertCircle, User, ArrowLeft, Plus, X, Building2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getCurrentUserProfile } from '../../../lib/supabase';

const StaffTasksView = ({ staff, onTaskClick, onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [branches, setBranches] = useState([]);
  const [boards, setBoards] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBoard, setSelectedBoard] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [staffBranches, setStaffBranches] = useState([]); // Changed to array for multiple branches
  const [branchMap, setBranchMap] = useState({}); // Map of branch_id to branch data

  useEffect(() => {
    if (staff?.id) {
      loadStaffTasks();
      loadCurrentUser();
      loadBranches();
      loadStaffBranches();
    }
  }, [staff?.id]);

  useEffect(() => {
    if (selectedBranch) {
      loadBoards(selectedBranch);
    } else {
      setBoards([]);
      setSelectedBoard('');
    }
  }, [selectedBranch]);

  // Auto-select staff's first branch if they have one
  useEffect(() => {
    if (staffBranches.length > 0 && isAddTaskModalOpen && !selectedBranch) {
      setSelectedBranch(staffBranches[0]);
    }
  }, [staffBranches, isAddTaskModalOpen]);

  const loadCurrentUser = async () => {
    try {
      const userProfile = await getCurrentUserProfile();
      setCurrentUser(userProfile);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const loadStaffBranches = async () => {
    if (!staff?.id) return;

    try {
      const { data, error } = await supabase
        .from('staff_branches')
        .select('branch_id')
        .eq('staff_id', staff.id);

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading staff branches:', error);
      } else if (data && data.length > 0) {
        setStaffBranches(data.map(item => item.branch_id));
      } else {
        setStaffBranches([]);
      }
    } catch (err) {
      console.error('Error loading staff branches:', err);
    }
  };

  const loadBranches = async () => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setBranches(data || []);
      
      // Create branch map for quick lookups
      const map = {};
      data?.forEach(branch => {
        map[branch.id] = branch;
      });
      setBranchMap(map);
    } catch (err) {
      console.error('Error loading branches:', err);
    }
  };

  const loadBoards = async (branchId) => {
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBoards(data || []);
      if (data && data.length > 0) {
        setSelectedBoard(data[0].id);
      }
    } catch (err) {
      console.error('Error loading boards:', err);
    }
  };

  const loadStaffTasks = async () => {
    if (!staff?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', staff.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(data || []);
    } catch (err) {
      console.error('Error loading staff tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!taskTitle.trim()) {
      alert('Please enter a task title');
      return;
    }

    if (!selectedBranch || !selectedBoard) {
      alert('Please select a branch and board');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase
        .from('tasks')
        .insert([
          {
            title: taskTitle.trim(),
            description: taskDescription.trim(),
            priority: taskPriority,
            due_date: taskDueDate || null,
            status: 'todo',
            board_id: selectedBoard,
            branch_id: selectedBranch,
            assigned_to: staff.id,
            created_by: currentUser?.id,
            updated_by: currentUser?.id
          }
        ]);

      if (error) throw error;

      // Reset form
      setTaskTitle('');
      setTaskDescription('');
      setTaskPriority('medium');
      setTaskDueDate('');
      // Only reset branch if staff doesn't have assigned branches
      if (staffBranches.length === 0) {
        setSelectedBranch('');
      }
      setSelectedBoard('');
      setIsAddTaskModalOpen(false);

      // Reload tasks
      await loadStaffTasks();

      alert('Task created successfully!');
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Failed to create task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getFilteredTasks = () => {
    if (filter === 'all') return tasks;
    return tasks.filter(task => task.status === filter);
  };

  const getStatusStats = () => {
    return {
      all: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      'in-progress': tasks.filter(t => t.status === 'in-progress').length,
      validating: tasks.filter(t => t.status === 'validating').length,
      completed: tasks.filter(t => t.status === 'completed').length
    };
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'validating':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'todo':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

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

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (task) => {
    return task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  };

  const stats = getStatusStats();
  const filteredTasks = getFilteredTasks();

  // Check if staff has branches assigned
  const staffHasBranches = staffBranches.length > 0;

  const FilterButton = ({ value, label, count, icon: Icon }) => (
    <button
      onClick={() => setFilter(value)}
      className={`filter-btn ${
        filter === value
          ? 'bg-blue-100 text-blue-700 border border-blue-300'
          : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {Icon && <Icon className="filter-btn-icon" />}
      <span className="filter-label-full">{label}</span>
      <span className={`filter-btn-count ${
        filter === value ? 'bg-blue-200' : 'bg-gray-200'
      }`}>
        {count}
      </span>
    </button>
  );

  const TaskCard = ({ task }) => {
    const branchName = branchMap[task.branch_id]?.name || 'Unknown Branch';
    
    return (
      <div
        onClick={() => onTaskClick(task)}
        className="task-card"
      >
        {/* Branch Name Badge at Top */}
        <div className="flex items-center gap-1.5 mb-2">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {branchName}
          </span>
        </div>

        <div className="flex items-start justify-between task-title">
          <h3 className="font-semibold text-gray-900 flex-1 pr-2 line-clamp-2">
            {task.title}
          </h3>
        </div>

        {task.description && (
          <p className="task-description text-gray-600 line-clamp-2">
            {task.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
          <span className={`task-badge rounded font-medium border ${getStatusColor(task.status)}`}>
            {task.status.replace('-', ' ')}
          </span>
          
          {task.priority && (
            <span className={`task-badge rounded font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          )}
          
          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${
              isOverdue(task) ? 'text-red-600 font-semibold' : 'text-gray-500'
            }`}>
              <Calendar className="w-3 h-3" />
              <span className="date-full">{formatDate(task.due_date)}</span>
              <span className="date-short">{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              {isOverdue(task) && <span className="overdue-full">(Overdue)</span>}
              {isOverdue(task) && <span className="overdue-short">!</span>}
            </span>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="loading-spinner animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 staff-tasks-view" style={{ height: '100vh', overflow: 'hidden' }}>
      <style>{`
        .staff-tasks-view {
          padding-bottom: 5rem;
        }

        @media (min-width: 768px) {
          .staff-tasks-view {
            padding-bottom: 0 !important;
          }
        }

        /* Filter Button Styles */
        .filter-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.625rem;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          transition: all 0.2s;
          white-space: nowrap;
          min-width: fit-content;
        }

        @media (min-width: 768px) {
          .filter-btn {
            gap: 0.5rem !important;
            padding: 0.5rem 1rem !important;
            font-size: 0.875rem !important;
          }
        }

        .filter-btn-icon {
          width: 0.875rem;
          height: 0.875rem;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .filter-btn-icon {
            width: 1rem !important;
            height: 1rem !important;
          }
        }

        .filter-btn-count {
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .filter-btn-count {
            padding: 0.125rem 0.5rem !important;
          }
        }

        /* Filter Label - Hide on mobile, show on tablet+ */
        .filter-label-full {
          display: none;
        }

        @media (min-width: 768px) {
          .filter-label-full {
            display: inline !important;
          }
        }

        /* Header Styles */
        .staff-header {
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 0.75rem 1rem;
          position: sticky;
          top: 0;
          z-index: 20;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .staff-header {
            padding: 1rem 1.5rem !important;
          }
        }

        .staff-avatar {
          width: 2rem;
          height: 2rem;
          font-size: 1rem;
          background-color: #dbeafe;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          color: #1d4ed8;
        }

        @media (min-width: 768px) {
          .staff-avatar {
            width: 2.5rem !important;
            height: 2.5rem !important;
            font-size: 1.125rem !important;
          }
        }

        .staff-name {
          font-size: 1rem;
          font-weight: bold;
          color: #111827;
        }

        @media (min-width: 768px) {
          .staff-name {
            font-size: 1.25rem !important;
          }
        }

        .staff-email {
          font-size: 0.75rem;
          max-width: 200px;
          color: #4b5563;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .staff-email {
            font-size: 0.875rem !important;
            max-width: none !important;
          }
        }

        .back-btn {
          padding: 0.375rem;
          background: transparent;
          border: none;
          cursor: pointer;
          border-radius: 0.5rem;
          transition: background-color 0.2s;
        }

        .back-btn:hover {
          background-color: #f3f4f6;
        }

        @media (min-width: 768px) {
          .back-btn {
            padding: 0.5rem !important;
          }
        }

        .back-btn-icon {
          width: 1rem;
          height: 1rem;
          color: #4b5563;
        }

        @media (min-width: 768px) {
          .back-btn-icon {
            width: 1.25rem !important;
            height: 1.25rem !important;
          }
        }

        /* Add Task Button */
        .add-task-btn {
          padding: 0.5rem 0.75rem;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.75rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          cursor: pointer;
          transition: background-color 0.2s;
          white-space: nowrap;
        }

        .add-task-btn:hover {
          background: #1d4ed8;
        }

        @media (min-width: 768px) {
          .add-task-btn {
            padding: 0.5rem 1rem !important;
            font-size: 0.875rem !important;
            gap: 0.5rem !important;
          }
        }

        .add-task-btn-icon {
          width: 0.875rem;
          height: 0.875rem;
        }

        @media (min-width: 768px) {
          .add-task-btn-icon {
            width: 1rem !important;
            height: 1rem !important;
          }
        }

        /* Task Card Styles */
        .task-card {
          background: white;
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
          transition: all 0.2s;
          cursor: pointer;
        }

        @media (min-width: 768px) {
          .task-card {
            padding: 1rem !important;
          }
        }

        .task-title {
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }

        @media (min-width: 768px) {
          .task-title {
            font-size: 1rem !important;
            margin-bottom: 0.75rem !important;
          }
        }

        .task-description {
          font-size: 0.75rem;
          margin-bottom: 0.5rem;
          color: #4b5563;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .task-description {
            font-size: 0.875rem !important;
            margin-bottom: 0.75rem !important;
          }
        }

        .task-badge {
          padding: 0.125rem 0.375rem;
          font-size: 0.75rem;
          border-radius: 0.25rem;
          font-weight: 500;
        }

        @media (min-width: 768px) {
          .task-badge {
            padding: 0.25rem 0.5rem !important;
          }
        }

        /* Tasks Grid */
        .tasks-grid {
          flex: 1;
          overflow-y: auto;
          padding: 1rem;
          width: 100%;
        }

        @media (min-width: 768px) {
          .tasks-grid {
            padding: 1.5rem !important;
          }
        }

        .tasks-grid-container {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;
          width: 100%;
        }

        @media (min-width: 768px) {
          .tasks-grid-container {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 1rem !important;
          }
        }

        @media (min-width: 1024px) {
          .tasks-grid-container {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        .task-card:hover {
          border-color: #60a5fa;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        /* Loading Spinner */
        .loading-spinner {
          width: 2rem;
          height: 2rem;
          border-bottom: 2px solid #2563eb;
          border-radius: 9999px;
        }

        @media (min-width: 768px) {
          .loading-spinner {
            width: 3rem !important;
            height: 3rem !important;
          }
        }

        /* Empty State */
        .empty-icon {
          width: 3rem;
          height: 3rem;
          color: #d1d5db;
          margin: 0 auto 0.75rem;
        }

        @media (min-width: 768px) {
          .empty-icon {
            width: 4rem !important;
            height: 4rem !important;
          }
        }

        .empty-title {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        @media (min-width: 768px) {
          .empty-title {
            font-size: 1rem !important;
          }
        }

        .empty-subtitle {
          font-size: 0.75rem;
          color: #9ca3af;
          margin-top: 0.25rem;
        }

        @media (min-width: 768px) {
          .empty-subtitle {
            font-size: 0.875rem !important;
          }
        }

        /* Date Display Responsive */
        .date-full {
          display: none;
        }

        .date-short {
          display: inline;
        }

        @media (min-width: 640px) {
          .date-full {
            display: inline !important;
          }
          .date-short {
            display: none !important;
          }
        }

        .overdue-full {
          display: none;
        }

        .overdue-short {
          display: inline;
        }

        @media (min-width: 640px) {
          .overdue-full {
            display: inline !important;
          }
          .overdue-short {
            display: none !important;
          }
        }

        /* Scrollbar Hide */
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        /* Filter Container */
        .filters-container {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
          margin-left: -1rem;
          margin-right: -1rem;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        @media (min-width: 768px) {
          .filters-container {
            gap: 0.5rem !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 0.75rem;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          padding: 1.25rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .modal-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
          flex: 1;
        }

        .modal-body {
          padding: 1.25rem;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.375rem;
        }

        .form-input, .form-select, .form-textarea {
          width: 100%;
          padding: 0.625rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          box-sizing: border-box;
        }

        .form-input:focus, .form-select:focus, .form-textarea:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
        }

        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }

        .modal-footer {
          padding: 1rem 1.25rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.625rem 1.25rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .btn-cancel {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-cancel:hover {
          background: #f9fafb;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-primary:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }
      `}</style>

      {/* Header */}
      <div className="staff-header">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={onBack}
              className="back-btn hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="back-btn-icon text-gray-600" />
            </button>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="staff-avatar bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                {staff?.full_name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="staff-name font-bold text-gray-900">{staff?.full_name}</h2>
                <p className="staff-email text-gray-600 truncate">{staff?.email}</p>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setIsAddTaskModalOpen(true)}
            className="add-task-btn"
          >
            <Plus className="add-task-btn-icon" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Filters */}
        <div className="filters-container scrollbar-hide">
          <FilterButton value="all" label="All Tasks" count={stats.all} />
          <FilterButton value="todo" label="To Do" count={stats.todo} icon={AlertCircle} />
          <FilterButton value="in-progress" label="In Progress" count={stats['in-progress']} icon={Clock} />
          <FilterButton value="validating" label="Validating" count={stats.validating} icon={CheckCircle} />
          <FilterButton value="completed" label="Completed" count={stats.completed} icon={CheckCircle} />
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="tasks-grid">
        {filteredTasks.length === 0 ? (
          <div className="flex items-center justify-center h-48 md:h-64">
            <div className="text-center">
              <User className="empty-icon text-gray-300 mx-auto mb-3" />
              <p className="empty-title text-gray-500 font-medium">No tasks found</p>
              <p className="empty-subtitle text-gray-400 mt-1">
                {filter === 'all' 
                  ? 'This staff member has no assigned tasks'
                  : `No ${filter.replace('-', ' ')} tasks`
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="tasks-grid-container">
            {filteredTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="modal-overlay" onClick={() => setIsAddTaskModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Task for {staff?.full_name}</h3>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="modal-body">
              {/* Show branch selector - filter to only staff's assigned branches if they have any */}
              <div className="form-group">
                <label className="form-label">Branch *</label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="form-select"
                  required
                >
                  <option value="">Select Branch</option>
                  {branches
                    .filter(branch => !staffHasBranches || staffBranches.includes(branch.id))
                    .map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                </select>
                {staffHasBranches && (
                  <p className="text-xs text-gray-500 mt-1">
                    Showing only branches assigned to this staff member
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Board *</label>
                <select
                  value={selectedBoard}
                  onChange={(e) => setSelectedBoard(e.target.value)}
                  className="form-select"
                  required
                  disabled={!selectedBranch || boards.length === 0}
                >
                  <option value="">Select Board</option>
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>
                      {board.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="form-input"
                  placeholder="Enter task title"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  className="form-textarea"
                  placeholder="Enter task description"
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                  className="form-select"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                className="btn btn-cancel"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="btn btn-primary"
                disabled={saving || !taskTitle.trim() || !selectedBranch || !selectedBoard}
              >
                {saving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTasksView;