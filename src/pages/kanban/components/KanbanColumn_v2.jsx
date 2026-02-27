import { useState } from 'react';
import { Plus, MoreVertical, Calendar, User, Play, ArrowRight, CheckCircle } from 'lucide-react';
import { notifyTaskStatusChange } from '../../../utils/notificationHelpers';

const KanbanColumn = ({ 
  column, 
  tasks = [], 
  onAddTask, 
  onEditTask,
  onMoveTask,
  canAddTask = false,
  currentUser
}) => {
  const [draggedOver, setDraggedOver] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState(null);

  const handleDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('taskId', task.id);
    e.dataTransfer.setData('sourceStatus', task.status);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDraggedOver(true);
  };

  const handleDragLeave = () => {
    setDraggedOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDraggedOver(false);

    const taskId = e.dataTransfer.getData('taskId');
    const sourceStatus = e.dataTransfer.getData('sourceStatus');

    if (sourceStatus !== column.id && onMoveTask) {
      await onMoveTask(taskId, column.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleStatusProgress = async (task) => {
    if (processingTaskId === task.id) return;

    setProcessingTaskId(task.id);
    
    try {
      let newStatus = task.status;
      
      switch (task.status) {
        case 'todo':
          newStatus = 'in-progress';
          break;
        case 'in-progress':
          newStatus = 'validating';
          break;
        case 'validating':
          newStatus = 'completed';
          break;
        default:
          newStatus = task.status;
      }

      if (onMoveTask) {
        await onMoveTask(task.id, newStatus);
      }

      notifyTaskStatusChange(task, newStatus, currentUser?.id);
    } catch (error) {
      console.error('Error progressing task status:', error);
      alert('Failed to update task status. Please try again.');
    } finally {
      setProcessingTaskId(null);
    }
  };

  const getProgressButtonLabel = (status) => {
    switch (status) {
      case 'todo':
        return 'Start';
      case 'in-progress':
        return 'Next';
      case 'validating':
        return 'Submit';
      default:
        return null;
    }
  };

  const getProgressButtonIcon = (status) => {
    switch (status) {
      case 'todo':
        return Play;
      case 'in-progress':
        return ArrowRight;
      case 'validating':
        return CheckCircle;
      default:
        return null;
    }
  };

  const TaskCard = ({ task }) => {
    const isAdmin = currentUser?.role === 'admin';
    
    const assignedUsers = task.assigned_users || [];
    const isAssignedToMe = assignedUsers.some(user => user.id === currentUser?.id) || task.assigned_to === currentUser?.id;
    
    const canEdit = isAdmin;
    const canProgress = isAssignedToMe && task.status !== 'completed';
    
    const buttonLabel = getProgressButtonLabel(task.status);
    const ButtonIcon = getProgressButtonIcon(task.status);
    const isProcessing = processingTaskId === task.id;
    
    return (
      <div
        draggable={true}
        onDragStart={(e) => handleDragStart(e, task)}
        className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-move group"
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 flex-1 pr-2">{task.title}</h4>
          {canEdit && (
            <button
              onClick={() => onEditTask(task)}
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-2">
            {task.priority && (
              <span className={`px-2 py-1 rounded-full font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-gray-500">
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
        </div>

        {assignedUsers.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
              <User className="w-3 h-3" />
              <span className="font-medium">
                Assigned to {assignedUsers.length} {assignedUsers.length === 1 ? 'person' : 'people'}:
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {assignedUsers.slice(0, 3).map((user, index) => (
                <span
                  key={user.id || index}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium"
                  title={user.full_name || user.name || 'Unknown'}
                >
                  <div className="w-4 h-4 bg-blue-200 rounded-full flex items-center justify-center text-blue-800 font-bold text-[10px]">
                    {(user.full_name || user.name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[80px] truncate">
                    {user.full_name || user.name || 'Unknown'}
                  </span>
                </span>
              ))}
              {assignedUsers.length > 3 && (
                <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  +{assignedUsers.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {canProgress && buttonLabel && ButtonIcon && (
          <button
            onClick={() => handleStatusProgress(task)}
            disabled={isProcessing}
            className={`w-full py-2 px-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
              isProcessing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : task.status === 'todo'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : task.status === 'in-progress'
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : task.status === 'validating'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <ButtonIcon className="w-4 h-4" />
                <span>{buttonLabel}</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  };

  const getColumnColor = () => {
    switch (column.id) {
      case 'todo':
        return 'border-orange-300 bg-orange-50';
      case 'in-progress':
        return 'border-blue-300 bg-blue-50';
      case 'validating':
        return 'border-purple-300 bg-purple-50';
      case 'completed':
        return 'border-green-300 bg-green-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className={`p-4 rounded-t-lg border-2 ${getColumnColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">{column.title}</h3>
          <span className="bg-white px-2.5 py-1 rounded-full text-sm font-semibold text-gray-700">
            {tasks.length}
          </span>
        </div>
        
        {canAddTask && column.id === 'todo' && (
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full mt-2 px-3 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex-1 p-4 space-y-3 bg-gray-50 rounded-b-lg border-2 border-t-0 min-h-[500px] transition-colors ${
          draggedOver ? 'bg-blue-100 border-blue-400' : 'border-gray-200'
        }`}
      >
        {tasks.length > 0 ? (
          tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
            {draggedOver ? 'Drop task here' : 'No tasks'}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;