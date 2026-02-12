import { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Calendar,
  Edit,
  Trash2,
  Search,
  TrendingUp
} from 'lucide-react';

const CompanyList = ({ 
  branches = [], 
  currentUser,
  onSelectBranch,
  onEditBranch,
  onDeleteBranch,
  tasks = []
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [editingBranch, setEditingBranch] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    location: '',
    manager_id: ''
  });

  // Calculate stats for each branch
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
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleEditClick = (e, branch) => {
    e.stopPropagation(); // Prevent card click
    setEditingBranch(branch);
    setEditForm({
      name: branch.name,
      description: branch.description || '',
      location: branch.location || '',
      manager_id: branch.manager_id || ''
    });
  };

  const handleDeleteClick = (e, branch) => {
    e.stopPropagation(); // Prevent card click
    if (confirm(`Are you sure you want to delete ${branch.name}?`)) {
      onDeleteBranch(branch.id);
    }
  };

  const handleSaveEdit = async () => {
    await onEditBranch(editingBranch.id, editForm);
    setEditingBranch(null);
  };

  const BranchCard = ({ branch }) => (
    <div 
      onClick={() => onSelectBranch(branch)}
      className="bg-white rounded-lg border border-gray-200 hover:shadow-lg hover:border-blue-300 transition-all overflow-hidden cursor-pointer"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{branch.name}</h3>
              {branch.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4" />
                  {branch.location}
                </p>
              )}
            </div>
          </div>
          <span className={`
            px-3 py-1 rounded-full text-xs font-bold
            ${branch.stats.completionRate >= 80 ? 'bg-green-100 text-green-700' :
              branch.stats.completionRate >= 50 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'}
          `}>
            {branch.stats.completionRate}%
          </span>
        </div>
        
        {branch.description && (
          <p className="text-sm text-gray-600 line-clamp-2">{branch.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Total Tasks</p>
            <p className="text-lg font-bold text-gray-900">{branch.stats.totalTasks}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">Completed</p>
            <p className="text-lg font-bold text-green-600">{branch.stats.completed}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-1">In Progress</p>
            <p className="text-lg font-bold text-blue-600">{branch.stats.inProgress}</p>
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
      <div className="p-4 flex items-center justify-between">
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          Created {formatDate(branch.created_at)}
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => handleEditClick(e, branch)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit Branch"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => handleDeleteClick(e, branch)}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Branch"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <h1 className="text-3xl font-bold text-gray-900">Company List</h1>
        <p className="text-gray-600 mt-1">Manage all company branches</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search branches by name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <select
              value={filterBy}
              onChange={(e) => setFilterBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Branches ({branchesWithStats.length})</option>
              <option value="high">High Performance (≥80%)</option>
              <option value="medium">Medium Performance (50-79%)</option>
              <option value="low">Needs Attention (≤50%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Branch Cards */}
      <div className="p-8">
        {filteredBranches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBranches.map(branch => (
              <BranchCard key={branch.id} branch={branch} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || filterBy !== 'all' ? 'No branches found' : 'No branches yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filterBy !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Get started by adding your first branch'}
            </p>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {branches.length > 0 && (
        <div className="fixed bottom-8 left-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-xs text-gray-600">Total Branches</p>
              <p className="text-2xl font-bold text-gray-900">{branches.length}</p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Edit Branch</h2>
              <p className="text-sm text-gray-600 mt-1">Update branch information</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Name *
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
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingBranch(null)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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