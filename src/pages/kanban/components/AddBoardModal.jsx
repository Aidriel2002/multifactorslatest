import { useState, useEffect } from 'react';
import { X, Layers, AlertCircle } from 'lucide-react';

const AddBoardModal = ({ isOpen, onClose, onSubmit, existingBoards, saving }) => {
  const [boardName, setBoardName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setBoardName('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const trimmedName = boardName.trim();
    
    if (!trimmedName) {
      setError('Board name is required');
      return;
    }

    // Check for duplicate names (case-insensitive)
    const isDuplicate = existingBoards.some(
      board => board.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (isDuplicate) {
      setError('A board with this name already exists');
      return;
    }

    onSubmit(trimmedName);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Layers className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Create New Board</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board Name
            </label>
            <input
              type="text"
              value={boardName}
              onChange={(e) => {
                setBoardName(e.target.value);
                setError('');
              }}
              placeholder="Enter board name..."
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                error ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={saving}
              autoFocus
            />
            {error && (
              <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={saving}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  Create Board
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddBoardModal;