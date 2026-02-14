import { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar,
  Edit,
  Trash2,
  Search,
  TrendingUp,
  Plus
} from 'lucide-react';

const CompanyList = ({ 
  branches = [], 
  currentUser,
  onSelectBranch,
  onEditBranch,
  onDeleteBranch,
  onAddBranch,
  tasks = [],
  users = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [editingBranch, setEditingBranch] = useState(null);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    location: ''
  });
  const [newBranch, setNewBranch] = useState({
    name: '',
    description: '',
    location: ''
  });

  const branchesWithStats = branches.map(branch => {
    const branchTasks = tasks.filter(t => t.branch_id === branch.id);
    const completed = branchTasks.filter(t => t.status === 'completed').length;
    const inProgress = branchTasks.filter(t => t.status === 'in-progress').length;
    const total = branchTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      ...branch,
      stats: {
        totalTasks: total,
        completed,
        inProgress,
        completionRate
      }
    };
  });

  // Filter branches
  const filteredBranches = branchesWithStats.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (branch.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterBy === 'all') return matchesSearch;
    if (filterBy === 'high') return matchesSearch && branch.stats.completionRate >= 80;
    if (filterBy === 'medium') return matchesSearch && branch.stats.completionRate >= 50 && branch.stats.completionRate < 80;
    if (filterBy === 'low') return matchesSearch && branch.stats.completionRate < 50;
    
    return matchesSearch;
  });

  const isAdmin = currentUser?.role === 'admin';

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEditClick = (e, branch) => {
    e.stopPropagation();
    setEditingBranch(branch);
    setEditForm({
      name: branch.name || '',
      description: branch.description || '',
      location: branch.location || ''
    });
  };

  const handleDeleteClick = (e, branch) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete ${branch.name}?`)) {
      onDeleteBranch(branch.id);
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      alert('Branch name is required');
      return;
    }

    try {
      // Clean the data - convert empty strings to null for optional fields
      const updateData = {
        name: editForm.name.trim()
      };

      // Only include optional fields if they have values, otherwise set to null
      if (editForm.description && editForm.description.trim()) {
        updateData.description = editForm.description.trim();
      } else {
        updateData.description = null;
      }

      if (editForm.location && editForm.location.trim()) {
        updateData.location = editForm.location.trim();
      } else {
        updateData.location = null;
      }

      await onEditBranch(editingBranch.id, updateData);
      setEditingBranch(null);
      setEditForm({ name: '', description: '', location: '' });
    } catch (error) {
      console.error('Error editing branch:', error);
      alert(`Failed to update branch: ${error.message || 'Please try again.'}`);
    }
  };

  const handleAddBranch = async () => {
    if (!newBranch.name.trim()) {
      alert('Branch name is required');
      return;
    }

    try {
      // Clean the data - convert empty strings to null for optional fields
      const branchData = {
        name: newBranch.name.trim()
      };

      if (newBranch.description && newBranch.description.trim()) {
        branchData.description = newBranch.description.trim();
      }

      if (newBranch.location && newBranch.location.trim()) {
        branchData.location = newBranch.location.trim();
      }

      await onAddBranch(branchData);
      setNewBranch({ name: '', description: '', location: '' });
      setShowBranchModal(false);
    } catch (error) {
      console.error('Error adding branch:', error);
      alert(`Failed to add branch: ${error.message || 'Please try again.'}`);
    }
  };

  const BranchCard = ({ branch }) => (
    <div 
      onClick={() => onSelectBranch(branch)}
      className="bg-white rounded-lg border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all overflow-hidden cursor-pointer"
    >
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-5 md:w-6 h-5 md:h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold text-gray-900">{branch.name}</h3>
              {branch.location && (
                <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 md:w-4 h-3 md:h-4" />
                  {branch.location}
                </p>
              )}
            </div>
          </div>
          <span className={`
            px-2 md:px-3 py-1 rounded-full text-xs font-bold
            ${branch.stats.completionRate >= 80 ? 'bg-green-100 text-green-700' :
              branch.stats.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'}
          `}>
            {branch.stats.completionRate}%
          </span>
        </div>
        
        {branch.description && (
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{branch.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total</p>
            <p className="text-base md:text-lg font-bold text-gray-900">{branch.stats.totalTasks}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Done</p>
            <p className="text-base md:text-lg font-bold text-green-600">{branch.stats.completed}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Active</p>
            <p className="text-base md:text-lg font-bold text-blue-600">{branch.stats.inProgress}</p>
          </div>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                branch.stats.completionRate >= 80 ? 'bg-green-500' :
                branch.stats.completionRate >= 50 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${branch.stats.completionRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 md:p-4 flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3 md:w-3.5 h-3 md:h-3.5" />
          <span className="hidden sm:inline">Created {formatDate(branch.created_at)}</span>
          <span className="sm:hidden">{formatDate(branch.created_at)}</span>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-1 md:gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleEditClick(e, branch)}
              className="p-1.5 md:p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit Branch"
            >
              <Edit className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </button>
            <button
              onClick={(e) => handleDeleteClick(e, branch)}
              className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Branch"
            >
              <Trash2 className="w-3.5 md:w-4 h-3.5 md:h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Branch List</h1>
            <p className="text-sm md:text-base text-gray-600 mt-1">Manage all branches</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowBranchModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg flex items-center gap-2 transition-colors shadow-md text-sm md:text-base"
            >
              <Plus className="w-4 md:w-5 h-4 md:h-5" />
              <span className="hidden sm:inline">Add Branch</span>
              <span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Sticky Filters and Search */}
      <div className="sticky top-[80px] md:top-[100px] z-10 bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex flex-col gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search branches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-gray-600 whitespace-nowrap">Filter:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="flex-1 md:flex-initial px-3 md:px-4 py-2 text-xs md:text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All ({branchesWithStats.length})</option>
              <option value="high">High (≥80%)</option>
              <option value="medium">Medium (50-79%)</option>
              <option value="low">Low (≤50%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scrollable Branch Cards */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        {filteredBranches.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredBranches.map(branch => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16">
            <Building2 className="w-12 md:w-16 h-12 md:h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || filterBy !== 'all' ? 'No branches found' : 'No branches yet'}
            </h3>
            <p className="text-sm md:text-base text-gray-600 mb-6">
              {searchQuery || filterBy !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Get started by adding your first branch'}
            </p>
            {isAdmin && !searchQuery && filterBy === 'all' && (
              <button
                onClick={() => setShowBranchModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Your First Branch
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary Stats - Hidden on mobile to avoid overlap */}
      {branches.length > 0 && (
        <div className="hidden md:block fixed bottom-8 left-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Total Branches</p>
              <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Add Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Add New Branch</h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Create a new company branch</p>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manila Branch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={newBranch.location}
                  onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Manila, Philippines"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={newBranch.description}
                  onChange={(e) => setNewBranch({ ...newBranch, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Branch description..."
                />
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowBranchModal(false);
                  setNewBranch({ name: '', description: '', location: '' });
                }}
                className="px-4 md:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBranch}
                className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm md:text-base"
              >
                Add Branch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 md:p-6 border-b border-gray-200">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">Edit Branch</h2>
              <p className="text-xs md:text-sm text-gray-600 mt-1">Update branch information</p>
            </div>
            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter location"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="p-4 md:p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setEditingBranch(null);
                  setEditForm({ name: '', description: '', location: '' });
                }}
                className="px-4 md:px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 md:px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm md:text-base"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyList;