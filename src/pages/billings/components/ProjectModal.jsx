import { useState } from 'react'

const ProjectModal = ({ isOpen, onClose, onSubmit, projects = [], onDelete, providers = [] }) => {
  const [projectName, setProjectName] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const handleSubmit = (e) => {
    if (e) e.preventDefault()

    if (!projectName.trim()) {
      alert('Please enter a project name')
      return
    }

    onSubmit({ project_name: projectName.trim() })
    setProjectName('')
  }

  const handleClose = () => {
    setProjectName('')
    setDeleteError('')
    onClose()
  }

  const handleDelete = (projectId) => {
    const project = projects.find(p => p.id === projectId)
    
    const projectProviders = providers.filter(prov => prov.project_id === projectId)
    
    if (projectProviders.length > 0) {
      setDeleteError(`Cannot delete "${project.project_name}" because it has ${projectProviders.length} provider(s). Please reassign or delete all providers first.`)
      return
    }
    
    setDeleteError('')
    onDelete && onDelete(projectId)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Add New Project
            </h2>
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Main Office Project"
                autoFocus
              />
            </div>

            {projects.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Existing Projects</h3>
                
                {deleteError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-800">{deleteError}</p>
                    </div>
                  </div>
                )}
                
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                  {projects.map((project) => {
                    const projectProviders = providers.filter(prov => prov.project_id === project.id)
                    return (
                    <div 
                      key={project.id} 
                      className="flex items-center justify-between p-3 hover:bg-gray-50 border-b last:border-b-0"
                    >
                      <div className="flex-1">
                        <span className="text-gray-800">{project.project_name}</span>
                        {projectProviders.length > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({projectProviders.length} provider{projectProviders.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(project.id)}
                        className="text-red-500 hover:text-red-700 transition"
                        title="Delete project"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )})}
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition font-medium"
              >
                Add Project
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectModal