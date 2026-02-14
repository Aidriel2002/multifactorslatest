import { X, Calendar, User } from 'lucide-react';
import CommentSection from './CommentSection';

const TaskDetailsModal = ({ isOpen, onClose, task, currentUser, onTaskUpdate }) => {
  const formatDueDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const statusColors = {
    'todo': 'bg-gray-100 text-gray-800',
    'in-progress': 'bg-blue-100 text-blue-800',
    'validating': 'bg-purple-100 text-purple-800',
    'completed': 'bg-green-100 text-green-800'
  };

  const statusLabels = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'validating': 'Validating',
    'completed': 'Completed'
  };

  if (!isOpen || !task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50">
      <div 
        className="bg-white rounded-t-2xl sm:rounded-lg w-full h-[95vh] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] overflow-hidden flex flex-col shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Improved mobile spacing and touch targets */}
        <div className="border-b px-4 sm:px-6 py-4 sm:py-4 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex-1 pr-2">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 active:text-gray-700 transition-colors p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg touch-manipulation shrink-0"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content - Improved scrolling and spacing */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5 sm:py-6">
          {/* Task Info */}
          <div className="mb-6 sm:mb-8">
            {/* Title - Better line height for readability */}
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 leading-tight break-words">
              {task.title}
            </h3>

            {/* Badges - Better spacing on mobile */}
            <div className="flex flex-wrap gap-2 mb-5">
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </span>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${priorityColors[task.priority]}`}>
                {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)} Priority
              </span>
            </div>

            {/* Description - Improved readability */}
            {task.description && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2 text-base">Description</h4>
                <p className="text-gray-600 whitespace-pre-wrap text-base leading-relaxed break-words">
                  {task.description}
                </p>
              </div>
            )}

            {/* Meta Information - Better mobile layout */}
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
              {/* Assigned To */}
              {task.assigned_user && (
                <div className="flex items-start sm:items-center py-2 sm:py-0">
                  <User size={18} className="mr-3 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center min-w-0 flex-1">
                    <span className="text-gray-600 text-sm sm:mr-2 mb-0.5 sm:mb-0">Assigned to:</span>
                    <span className="font-medium text-gray-900 text-base truncate">{task.assigned_user.name}</span>
                  </div>
                </div>
              )}

              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-start sm:items-center py-2 sm:py-0">
                  <Calendar size={18} className="mr-3 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center min-w-0 flex-1">
                    <span className="text-gray-600 text-sm sm:mr-2 mb-0.5 sm:mb-0">Due:</span>
                    <span className={`font-medium text-base ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                      {formatDueDate(task.due_date)}
                      {isOverdue && <span className="block sm:inline"> (Overdue)</span>}
                    </span>
                  </div>
                </div>
              )}

              {/* Created By */}
              {task.created_user && (
                <div className="flex items-start sm:items-center py-2 sm:py-0">
                  <User size={18} className="mr-3 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                  <div className="flex flex-col sm:flex-row sm:items-center min-w-0 flex-1">
                    <span className="text-gray-600 text-sm sm:mr-2 mb-0.5 sm:mb-0">Created by:</span>
                    <span className="font-medium text-gray-900 text-base truncate">{task.created_user.name}</span>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-start sm:items-center py-2 sm:py-0">
                <Calendar size={18} className="mr-3 text-gray-400 flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="flex flex-col sm:flex-row sm:items-center min-w-0 flex-1">
                  <span className="text-gray-600 text-sm sm:mr-2 mb-0.5 sm:mb-0">Created:</span>
                  <span className="text-gray-900 text-base">{formatDate(task.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <CommentSection task={task} currentUser={currentUser} />
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;