import { Plus } from 'lucide-react';
import TaskCard from './TaskCard';

const KanbanColumn = ({ 
  column, 
  tasks, 
  onAddTask, 
  onEditTask, 
  onDeleteTask, 
  onViewDetails,
  canDelete,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd
}) => {
  const columnStyles = {
    todo: {
      bg: 'bg-gray-50',
      border: 'border-gray-300',
      header: 'bg-gray-100',
      text: 'text-gray-700'
    },
    'in-progress': {
      bg: 'bg-blue-50',
      border: 'border-blue-300',
      header: 'bg-blue-100',
      text: 'text-blue-700'
    },
    validating: {
      bg: 'bg-purple-50',
      border: 'border-purple-300',
      header: 'bg-purple-100',
      text: 'text-purple-700'
    },
    completed: {
      bg: 'bg-green-50',
      border: 'border-green-300',
      header: 'bg-green-100',
      text: 'text-green-700'
    }
  };

  const style = columnStyles[column.id] || columnStyles.todo;

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className={`${style.header} ${style.border} border-2 rounded-t-lg p-4`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`font-bold text-lg ${style.text}`}>
            {column.title}
          </h2>
          <span className={`${style.text} text-sm font-semibold bg-white px-2 py-1 rounded-full`}>
            {tasks.length}
          </span>
        </div>
        <button
          onClick={() => onAddTask(column.id)}
          className={`w-full ${style.text} hover:bg-white/50 border-2 border-dashed ${style.border} rounded-lg py-2 flex items-center justify-center text-sm font-medium transition-colors`}
        >
          <Plus size={16} className="mr-1" />
          Add Task
        </button>
      </div>

      {/* Column Content */}
      <div
        className={`flex-1 ${style.bg} ${style.border} border-x-2 border-b-2 rounded-b-lg p-4 overflow-y-auto min-h-[500px]`}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, column.id)}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => onDragStart(e, task)}
              onDragEnd={onDragEnd}
            >
              <TaskCard
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onViewDetails={onViewDetails}
                canDelete={canDelete}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;