import { useState, useEffect } from 'react';
import { X, Upload, Calendar } from 'lucide-react';
import { projectAPI } from '../../../lib/supabase';
import { supabase } from '../../../lib/supabase';

const ProjectModal = ({ isOpen, onClose, onSubmit, editingProject, saving }) => {
  const [formData, setFormData] = useState({
    project_name: '',
    location: '',
    date: '',
    description: '',
    image_url: '',
    display_order: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (editingProject) {
      setFormData({
        project_name: editingProject.project_name || '',
        location: editingProject.location || '',
        date: editingProject.date || '',
        description: editingProject.description || '',
        image_url: editingProject.image_url || '',
        display_order: editingProject.display_order || ''
      });
      setImagePreview(editingProject.image_url || '');
    } else {
      resetForm();
    }
  }, [editingProject, isOpen]);

  const resetForm = () => {
    setFormData({
      project_name: '',
      location: '',
      date: '',
      description: '',
      image_url: '',
      display_order: ''
    });
    setImageFile(null);
    setImagePreview('');
    setErrors({});
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors({ ...errors, image: 'Image size must be less than 5MB' });
        return;
      }

      if (!file.type.startsWith('image/')) {
        setErrors({ ...errors, image: 'Please select a valid image file' });
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setErrors({ ...errors, image: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.project_name.trim()) {
      newErrors.project_name = 'Project name is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!editingProject && !imageFile) {
      newErrors.image = 'Project image is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setUploading(true);
      let imageUrl = formData.image_url;

      // Upload new image if selected
      if (imageFile) {
        // Delete old image if updating
        if (editingProject?.image_url) {
          try {
            await projectAPI.deleteImage(editingProject.image_url);
          } catch (err) {
            console.error('Error deleting old image:', err);
          }
        }

        imageUrl = await projectAPI.uploadImage(imageFile);
      }

      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('You must be logged in to create a project');
      }

      const projectData = {
        project_name: formData.project_name.trim(),
        location: formData.location.trim(),
        date: formData.date,
        description: formData.description.trim(),
        image_url: imageUrl,
        display_order: formData.display_order ? parseInt(formData.display_order) : null,
        created_by: user.id
      };

      await onSubmit(projectData);
      resetForm();
    } catch (error) {
      console.error('Error submitting project:', error);
      setErrors({ submit: error.message || 'Failed to save project' });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {editingProject ? 'Edit Project' : 'Add New Project'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving || uploading}
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {errors.submit}
            </div>
          )}

          {/* Project Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.project_name}
              onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
              className={`w-full px-4 py-2 border ${errors.project_name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none`}
              placeholder="Enter project name"
              disabled={saving || uploading}
            />
            {errors.project_name && (
              <p className="mt-1 text-sm text-red-600">{errors.project_name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={`w-full px-4 py-2 border ${errors.location ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none`}
              placeholder="Enter project location"
              disabled={saving || uploading}
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600">{errors.location}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className={`w-full px-4 py-2 border ${errors.date ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none`}
                disabled={saving || uploading}
              />
              <Calendar className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={20} />
            </div>
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none resize-none"
              placeholder="Enter project description..."
              rows="4"
              disabled={saving || uploading}
            />
            <p className="mt-1 text-sm text-gray-500">Optional: Brief description of the project</p>
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Order (Optional)
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-600 focus:border-transparent outline-none"
              placeholder="Enter display order"
              min="1"
              disabled={saving || uploading}
            />
            <p className="mt-1 text-sm text-gray-500">Lower numbers appear first</p>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Image <span className="text-red-500">*</span>
            </label>
            <div className="space-y-4">
              {imagePreview && (
                <div className="relative w-full h-48 border-2 border-gray-300 rounded-lg overflow-hidden">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-10 h-10 mb-3 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, WEBP (MAX. 5MB)</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={saving || uploading}
                  />
                </label>
              </div>
            </div>
            {errors.image && (
              <p className="mt-1 text-sm text-red-600">{errors.image}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={saving || uploading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {saving || uploading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {uploading ? 'Uploading...' : 'Saving...'}
                </span>
              ) : (
                editingProject ? 'Update Project' : 'Add Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectModal;