import { useState } from 'react';
import { Plus, MoreVertical, Trash2, Calendar, User } from 'lucide-react';

const KanbanColumn = ({ 
  column, 
  tasks = [], 
  onAddTask, 
  onEditTask,
  onMoveTask,
  canDelete,
  canAddTask = false, // Only true for "todo" column
  currentUser
}) => {
  const [draggedOver, setDraggedOver] = useState(false);

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

  const TaskCard = ({ task }) => {
    const isAdmin = currentUser?.role === 'admin';
    const canEdit = isAdmin; // Only admin can edit tasks
    
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

        <div className="flex items-center justify-between text-xs">
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
          {task.assigned_user && (
            <span className="flex items-center gap-1 text-gray-500">
              <User className="w-3 h-3" />
              {task.assigned_user}
            </span>
          )}
        </div>
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
      {/* Column Header */}
      <div className={`p-4 rounded-t-lg border-2 ${getColumnColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900">{column.title}</h3>
          <span className="bg-white px-2.5 py-1 rounded-full text-sm font-semibold text-gray-700">
            {tasks.length}
          </span>
        </div>
        
        {/* Add Task Button - Only show for "todo" column and if canAddTask is true */}
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

      {/* Tasks Container */}
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