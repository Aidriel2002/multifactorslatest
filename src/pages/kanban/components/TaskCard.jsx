import { useState } from 'react';
import { Calendar, User, MessageSquare, Edit, Trash2, MoreVertical } from 'lucide-react';

const TaskCard = ({ task, onEdit, onDelete, onViewDetails, canDelete, isDragging }) => {
  const [showMenu, setShowMenu] = useState(false);

  const priorityColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isDragging ? 'opacity-50' : ''
      }`}
      onClick={() => onViewDetails(task)}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 text-sm flex-1 pr-2 line-clamp-2">
          {task.title}
        </h3>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
          >
            <MoreVertical size={16} />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                >
                  <Edit size={14} className="mr-2" />
                  Edit
                </button>
                {canDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(task.id);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="mb-3">
        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] || priorityColors.medium}`}>
          {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-3">
          {task.assigned_user && (
            <div className="flex items-center" title={task.assigned_user.name}>
              <User size={14} className="mr-1" />
              <span className="truncate max-w-[80px]">{task.assigned_user.name?.split(' ')[0]}</span>
            </div>
          )}
          
          {task.due_date && (
            <div className={`flex items-center ${isOverdue ? 'text-red-600' : ''}`} title="Due date">
              <Calendar size={14} className="mr-1" />
              <span>{formatDate(task.due_date)}</span>
            </div>
          )}
        </div>

        {task.comment_count > 0 && (
          <div className="flex items-center">
            <MessageSquare size={14} className="mr-1" />
            <span>{task.comment_count}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;