import { useState, useEffect } from 'react';
import { X, Users, Check, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const AssignStaffModal = ({ isOpen, onClose, branch, onUpdate }) => {
  const [staffList, setStaffList] = useState([]);
  const [assignedStaff, setAssignedStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && branch) {
      loadStaff();
      loadAssignedStaff();
    }
  }, [isOpen, branch]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'staff')
        .eq('status', 'approved')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setStaffList(data || []);
    } catch (err) {
      console.error('Error loading staff:', err);
      setError('Failed to load staff members');
    } finally {
      setLoading(false);
    }
  };

  const loadAssignedStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_branches')
        .select('staff_id')
        .eq('branch_id', branch.id);

      if (error) throw error;
      
      const staffIds = (data || []).map(item => item.staff_id);
      setAssignedStaff(staffIds);
    } catch (err) {
      console.error('Error loading assigned staff:', err);
    }
  };

  const toggleStaff = (staffId) => {
    setAssignedStaff(prev => {
      if (prev.includes(staffId)) {
        return prev.filter(id => id !== staffId);
      } else {
        return [...prev, staffId];
      }
    });
  };

  const handleSelectAll = () => {
    if (assignedStaff.length === staffList.length) {
      setAssignedStaff([]);
    } else {
      setAssignedStaff(staffList.map(s => s.id));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Delete existing assignments for this branch
      const { error: deleteError } = await supabase
        .from('staff_branches')
        .delete()
        .eq('branch_id', branch.id);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (assignedStaff.length > 0) {
        const assignments = assignedStaff.map(staffId => ({
          staff_id: staffId,
          branch_id: branch.id,
          created_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('staff_branches')
          .insert(assignments);

        if (insertError) throw insertError;
      }

      if (onUpdate) {
        await onUpdate();
      }

      onClose();
    } catch (err) {
      console.error('Error saving staff assignments:', err);
      setError('Failed to save staff assignments. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Assign Staff</h2>
              <p className="text-sm text-gray-600">{branch?.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={saving}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Select Staff Members
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {assignedStaff.length} of {staffList.length} selected
              </p>
            </div>
            {staffList.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                disabled={loading}
              >
                {assignedStaff.length === staffList.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No approved staff members available</p>
            </div>
          ) : (
            <div className="space-y-2">
              {staffList.map(staff => {
                const isSelected = assignedStaff.includes(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={`
                      relative p-4 rounded-lg border-2 transition-all cursor-pointer
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                        ${isSelected 
                          ? 'bg-blue-600 border-blue-600' 
                          : 'bg-white border-gray-300'
                        }
                      `}>
                        {isSelected && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {staff.full_name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {staff.email}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors font-medium"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Assignments
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignStaffModal;