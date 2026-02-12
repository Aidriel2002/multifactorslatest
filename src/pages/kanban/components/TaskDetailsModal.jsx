import { useState, useEffect } from 'react';
import { X, Calendar, User, MessageSquare, Send, Edit2, Trash2, AlertCircle } from 'lucide-react';
import { kanbanAPI } from '../../../lib/supabase';

const TaskDetailsModal = ({ isOpen, onClose, task, currentUser, onTaskUpdate }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      loadComments();
      
      // Subscribe to comment changes
      const subscription = kanbanAPI.subscribeToComments(task.id, (payload) => {
        if (payload.eventType === 'INSERT') {
          setComments(prev => [...prev, payload.new]);
        } else if (payload.eventType === 'UPDATE') {
          setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
        } else if (payload.eventType === 'DELETE') {
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [isOpen, task]);

  const loadComments = async () => {
    if (!task) return;
    
    try {
      setLoading(true);
      const data = await kanbanAPI.getComments(task.id);
      setComments(data);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      await kanbanAPI.addComment(task.id, newComment.trim());
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async () => {
    if (!editingComment || !editingComment.comment.trim()) return;

    try {
      await kanbanAPI.updateComment(editingComment.id, editingComment.comment.trim());
      setEditingComment(null);
    } catch (err) {
      console.error('Error updating comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;

    try {
      await kanbanAPI.deleteComment(commentId);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
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

  const formatDueDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Task Info */}
          <div className="mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{task.title}</h3>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[task.status]}`}>
                {statusLabels[task.status]}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${priorityColors[task.priority]}`}>
                {task.priority?.charAt(0).toUpperCase() + task.priority?.slice(1)} Priority
              </span>
            </div>

            {/* Description */}
            {task.description && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            {/* Meta Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Assigned To */}
              {task.assigned_user && (
                <div className="flex items-center text-sm">
                  <User size={16} className="mr-2 text-gray-400" />
                  <span className="text-gray-600 mr-2">Assigned to:</span>
                  <span className="font-medium text-gray-900">{task.assigned_user.name}</span>
                </div>
              )}

              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-center text-sm">
                  <Calendar size={16} className="mr-2 text-gray-400" />
                  <span className="text-gray-600 mr-2">Due:</span>
                  <span className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatDueDate(task.due_date)}
                    {isOverdue && ' (Overdue)'}
                  </span>
                </div>
              )}

              {/* Created By */}
              {task.created_user && (
                <div className="flex items-center text-sm">
                  <User size={16} className="mr-2 text-gray-400" />
                  <span className="text-gray-600 mr-2">Created by:</span>
                  <span className="font-medium text-gray-900">{task.created_user.name}</span>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-center text-sm">
                <Calendar size={16} className="mr-2 text-gray-400" />
                <span className="text-gray-600 mr-2">Created:</span>
                <span className="text-gray-900">{formatDate(task.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="border-t pt-6">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center">
              <MessageSquare size={20} className="mr-2" />
              Comments ({comments.length})
            </h4>

            {/* Comments List */}
            <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm mr-2">
                          {comment.user?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{comment.user?.name}</p>
                          <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                        </div>
                      </div>
                      
                      {currentUser?.id === comment.user_id && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingComment(comment)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {editingComment?.id === comment.id ? (
                      <div className="mt-2">
                        <textarea
                          value={editingComment.comment}
                          onChange={(e) => setEditingComment({ ...editingComment, comment: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none"
                          rows="2"
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <button
                            onClick={() => setEditingComment(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateComment}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-700 text-sm whitespace-pre-wrap">{comment.comment}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="mt-4">
              <div className="flex space-x-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none"
                  rows="3"
                  disabled={submitting}
                />
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetailsModal;