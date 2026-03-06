import { useState, useEffect } from 'react';
import { X, Calendar, User, AlertCircle, UserPlus, XCircle } from 'lucide-react';

const TaskModal = ({ isOpen, onClose, onSubmit, task, users = [], saving }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assigned_to: [],
    due_date: ''
  });

  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  useEffect(() => {
    if (task) {
      let assignedIds = [];
      if (task.assigned_users && Array.isArray(task.assigned_users)) {
        assignedIds = task.assigned_users.map(u => u.id);
      } else if (task.assigned_to) {
        assignedIds = [task.assigned_to];
      }
      
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        assigned_to: assignedIds,
        due_date: task.due_date || ''
      });
    } else {
      resetForm();
    }
  }, [task, isOpen]);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      assigned_to: [],
      due_date: ''
    });
    setErrors({});
    setSearchTerm('');
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const taskData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      assigned_to: formData.assigned_to.length > 0 ? formData.assigned_to : null,
      due_date: formData.due_date || null
    };

    onSubmit(taskData);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addStaff = (userId) => {
    if (!formData.assigned_to.includes(userId)) {
      setFormData({
        ...formData,
        assigned_to: [...formData.assigned_to, userId]
      });
    }
    setSearchTerm('');
    setShowStaffDropdown(false);
  };

  const removeStaff = (userId) => {
    setFormData({
      ...formData,
      assigned_to: formData.assigned_to.filter(id => id !== userId)
    });
  };

  const getUserById = (userId) => {
    return users.find(user => user.id === userId);
  };

  const availableStaff = users.filter(user => 
    !formData.assigned_to.includes(user.id) &&
    (user.name || user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className={`w-full px-4 py-2 border ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              } rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none`}
              placeholder="Enter task title"
              disabled={saving}
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.title}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none"
              placeholder="Enter task description..."
              rows="4"
              disabled={saving}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                disabled={saving}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="validating">Validating</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                disabled={saving}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserPlus size={16} className="inline mr-1" />
                Assign Staff
              </label>

              {formData.assigned_to.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.assigned_to.map(userId => {
                    const user = getUserById(userId);
                    return (
                      <div
                        key={userId}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2"
                      >
                        <User size={14} />
                        <span>{user?.name || user?.full_name || 'Unknown'}</span>
                        <button
                          type="button"
                          onClick={() => removeStaff(userId)}
                          className="hover:text-blue-900"
                          disabled={saving}
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowStaffDropdown(true);
                  }}
                  onFocus={() => setShowStaffDropdown(true)}
                  placeholder="Search and add staff..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                  disabled={saving}
                />

                {showStaffDropdown && availableStaff.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {availableStaff.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addStaff(user.id)}
                        className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-2 border-b last:border-b-0"
                      >
                        <User size={16} className="text-gray-500" />
                        <span className="font-medium">
                          {user.name || user.full_name || 'Unnamed'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({user.role})
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {showStaffDropdown && availableStaff.length === 0 && searchTerm && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 text-sm text-gray-500">
                    No staff found
                  </div>
                )}
              </div>

              {formData.assigned_to.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, assigned_to: [] })}
                  className="mt-2 text-sm text-red-600 hover:text-red-700"
                  disabled={saving}
                >
                  Clear all staff
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={16} className="inline mr-1" />
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) =>
                  setFormData({ ...formData, due_date: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                disabled={saving}
              />
            </div>
          </div>

          {formData.assigned_to.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>{formData.assigned_to.length}</strong> staff member{formData.assigned_to.length !== 1 ? 's' : ''} assigned to this task
              </p>
            </div>
          )}

          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;