import { useState, useEffect, useCallback } from 'react';
import { projectAPI } from '../../lib/supabase';
import ProjectModal from './components/ProjectModal';
import { usePageSecurity } from '../../hooks/usePageSecurity';
import { canManageProjects } from '../../utils/rbac';
import LandingSideBar from './components/LandingSideBar';

const ManageProject = () => {
  const [projects, setProjects] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { loading: securityLoading } = usePageSecurity(canManageProjects);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectAPI.getAll();
      setProjects(data);
    } catch (err) {
      console.error('Error loading projects:', err);
      setErrorMessage('Failed to load projects. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!securityLoading) {
      loadProjects();
    }
  }, [loadProjects, securityLoading]);

  useEffect(() => {
    const subscription = projectAPI.subscribeToChanges((payload) => {
      if (payload.eventType === 'INSERT') {
        setProjects(prev => {
          const exists = prev.some(p => p.id === payload.new.id);
          if (exists) return prev;
          return [payload.new, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        setProjects(prev => prev.map(p => 
          p.id === payload.new.id ? payload.new : p
        ));
      } else if (payload.eventType === 'DELETE') {
        setProjects(prev => prev.filter(p => p.id !== payload.old.id));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const openModal = useCallback((project = null) => {
    setEditingProject(project);
    setIsModalOpen(true);
    setErrorMessage('');
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingProject(null);
    setSaving(false);
  }, []);

  const showSuccess = useCallback((message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  }, []);

  const handleSubmit = useCallback(async (projectData) => {
    try {
      setSaving(true);
      setErrorMessage('');

      if (editingProject) {
        await projectAPI.update(editingProject.id, projectData);
        showSuccess('Project updated successfully!');
      } else {
        await projectAPI.create(projectData);
        showSuccess('Project added successfully!');
      }
      
      closeModal();
    } catch (err) {
      console.error('Error saving project:', err);
      const errorMsg = err.message || 'Failed to save project. Please try again.';
      setErrorMessage(errorMsg);
      setSaving(false);
      throw err;
    }
  }, [editingProject, showSuccess, closeModal]);

  const handleDelete = useCallback(async (id) => {
    if (window.confirm('Are you sure you want to delete this project? This will also delete the associated image.')) {
      try {
        await projectAPI.delete(id);
        showSuccess('Project deleted successfully!');
      } catch (err) {
        console.error('Error deleting project:', err);
        setErrorMessage('Failed to delete project. Please try again.');
      }
    }
  }, [showSuccess]);

  const getFilteredProjects = useCallback(() => {
    let filtered = projects;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.project_name.toLowerCase().includes(query) ||
        p.location.toLowerCase().includes(query) ||
        (p.date && p.date.includes(query))
      );
    }

    return filtered;
  }, [projects, searchQuery]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const filteredProjects = getFilteredProjects();

  if (loading || securityLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
        <LandingSideBar />

      <div className="flex-1 ml-0 overflow-y-auto">
        <div className="bg-white shadow">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Manage Projects</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Total projects: <span className="font-semibold text-green-600">{projects.length}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => openModal()}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200"
              >
                + Add New Project
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Projects
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by project name, location, or date..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
            />
          </div>

          {errorMessage && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <span>{errorMessage}</span>
              <button 
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-red-700 hover:text-red-900 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {successMessage && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
              <button 
                type="button"
                onClick={() => setSuccessMessage('')}
                className="text-green-700 hover:text-green-900 font-bold"
              >
                ×
              </button>
            </div>
          )}

          {filteredProjects.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Image
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Project Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Display Order
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProjects.map((project) => (
                      <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {project.image_url ? (
                            <img
                              src={project.image_url}
                              alt={project.project_name}
                              className="h-16 w-24 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="h-16 w-24 bg-gray-200 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-xs">No image</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {project.project_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{project.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(project.date)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {project.display_order ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              #{project.display_order}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            type="button"
                            onClick={() => openModal(project)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(project.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-lg">
              <p className="text-gray-500 text-xl">
                {projects.length === 0 
                  ? 'No projects yet. Click "Add New Project" to get started.'
                  : 'No projects match your search.'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-4 text-green-600 hover:text-green-700 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          )}
        </div>

        <ProjectModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSubmit={handleSubmit}
          editingProject={editingProject}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default ManageProject;