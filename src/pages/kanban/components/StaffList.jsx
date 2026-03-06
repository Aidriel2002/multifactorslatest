import { useState, useEffect, useRef } from 'react';
import { Users, ChevronDown, ChevronRight, Building2, User, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

const StaffList = ({ onStaffSelect, selectedStaffId }) => {
  const [branches, setBranches] = useState([]);
  const [staffByBranch, setStaffByBranch] = useState({});
  const [expandedBranches, setExpandedBranches] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const hasSelectedRandom = useRef(false);

  useEffect(() => {
    loadStaffData();

    const staffBranchesChannel = supabase
      .channel('staff_branches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'staff_branches'
        },
        () => {
          loadStaffData();
        }
      )
      .subscribe();

    const staffChannel = supabase
      .channel('staff_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'users',
          filter: 'role=eq.staff'
        },
        () => {
          loadStaffData();
        }
      )
      .subscribe();

    const branchesChannel = supabase
      .channel('branches_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'branches'
        },
        () => {
          loadStaffData();
        }
      )
      .subscribe();

    const taskAssignmentsChannel = supabase
      .channel('task_assignments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_assignments'
        },
        () => {
          setTimeout(() => loadStaffData(), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(staffBranchesChannel);
      supabase.removeChannel(staffChannel);
      supabase.removeChannel(branchesChannel);
      supabase.removeChannel(taskAssignmentsChannel);
    };
  }, []);

  const loadStaffData = async () => {
    try {
      setLoading(true);

      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('*')
        .order('name');

      if (branchesError) throw branchesError;

      const { data: staffData, error: staffError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'staff')
        .eq('status', 'approved')
        .order('full_name');

      if (staffError) throw staffError;

      const { data: staffBranchesData, error: staffBranchesError } = await supabase
        .from('staff_branches')
        .select('staff_id, branch_id');

      if (staffBranchesError && staffBranchesError.code !== 'PGRST116') {
        console.error('Error loading staff branches:', staffBranchesError);
      }

      const staffGrouped = {};
      
      branchesData?.forEach(branch => {
        staffGrouped[branch.id] = [];
      });

      staffGrouped['unassigned'] = [];

      const assignedStaffIds = new Set();

      if (staffBranchesData && staffBranchesData.length > 0) {
        staffBranchesData.forEach(assignment => {
          if (!assignment.staff_id || !assignment.branch_id) return;
          
          assignedStaffIds.add(assignment.staff_id);
          
          const staff = staffData?.find(s => s.id === assignment.staff_id);
          
          if (staff && staffGrouped[assignment.branch_id]) {
            const existingStaff = staffGrouped[assignment.branch_id].find(s => s.id === staff.id);
            if (!existingStaff) {
              staffGrouped[assignment.branch_id].push(staff);
            }
          }
        });
      }

      staffData?.forEach(staff => {
        if (!assignedStaffIds.has(staff.id)) {
          staffGrouped['unassigned'].push(staff);
        }
      });

      setBranches(branchesData || []);
      setStaffByBranch(staffGrouped);

      const allStaff = staffData || [];
      if (allStaff.length > 0 && !hasSelectedRandom.current && !selectedStaffId && onStaffSelect) {
        const randomStaff = allStaff[Math.floor(Math.random() * allStaff.length)];
        onStaffSelect(randomStaff);
        hasSelectedRandom.current = true;
      }

    } catch (err) {
      console.error('Error loading staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleBranch = (branchId) => {
    setExpandedBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchId)) {
        newSet.delete(branchId);
      } else {
        newSet.add(branchId);
      }
      return newSet;
    });
  };

  const handleStaffSelect = (staff) => {
    onStaffSelect(staff);
    setIsMobileOpen(false);
  };

  if (loading) {
    return (
      <div className="w-full md:w-80 bg-white border-r border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .staff-list-mobile {
            position: fixed;
            top: 0;
            right: -100%;
            height: 100vh;
            width: 85%;
            max-width: 22rem;
            background: white;
            transition: right 0.3s ease-in-out;
            z-index: 100;
            box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
          }

          .staff-list-mobile.open {
            right: 0;
          }

          .staff-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 90;
            display: none;
          }

          .staff-overlay.open {
            display: block;
          }

          .staff-toggle-btn {
            position: fixed;
            bottom: 1.25rem;
            right: 1.25rem;
            z-index: 80;
            background: #2563eb;
            color: white;
            padding: 0.875rem 1.25rem;
            border-radius: 9999px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
            font-size: 0.875rem;
            border: none;
            cursor: pointer;
            transition: all 0.2s;
          }

          .staff-toggle-btn:hover {
            background: #1d4ed8;
            transform: scale(1.05);
          }

          .staff-toggle-btn:active {
            transform: scale(0.95);
          }

          .content-with-staff-btn {
            padding-bottom: 5rem !important;
          }
        }

        @media (min-width: 769px) {
          .staff-list-mobile {
            position: relative;
            right: 0;
            width: 20rem;
            box-shadow: none;
          }

          .staff-overlay {
            display: none !important;
          }

          .staff-toggle-btn {
            display: none;
          }

          .content-with-staff-btn {
            padding-bottom: 0 !important;
          }
        }
      `}</style>

      {/* Mobile Toggle Button */}
      <button 
        className="staff-toggle-btn"
        onClick={() => setIsMobileOpen(true)}
      >
        <Users className="w-5 h-5" />
        <span className="font-semibold">Staff</span>
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`staff-overlay ${isMobileOpen ? 'open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Staff List Panel */}
      <div className={`staff-list-mobile ${isMobileOpen ? 'open' : ''} bg-white border-r border-gray-200 flex flex-col h-full`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900">Staff Members</h2>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="md:hidden p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {Object.values(staffByBranch).flat().filter((v, i, a) => a.findIndex(t => t.id === v.id) === i).length} members
          </p>
        </div>

        {/* Staff List */}
        <div className="flex-1 overflow-y-auto p-2">
          {(() => {
            const totalStaff = Object.values(staffByBranch).flat().filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
            
            if (totalStaff.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Users className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm font-medium mb-1">No staff members</p>
                  <p className="text-gray-400 text-xs">Staff members will appear here once they are added</p>
                </div>
              );
            }

            return (
              <>
                {branches.map(branch => {
                  const branchStaff = staffByBranch[branch.id] || [];
                  if (branchStaff.length === 0) return null;
                  
                  const isExpanded = expandedBranches.has(branch.id);

                  return (
                    <div key={branch.id} className="mb-2">
                      <button
                        onClick={() => toggleBranch(branch.id)}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-500" />
                          <span className="truncate">{branch.name}</span>
                          <span className="text-xs text-gray-500">({branchStaff.length})</span>
                        </div>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1">
                          {branchStaff.map(staff => (
                            <button
                              key={`${branch.id}-${staff.id}`}
                              onClick={() => handleStaffSelect(staff)}
                              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                                selectedStaffId === staff.id
                                  ? 'bg-blue-50 text-blue-700 font-medium'
                                  : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                                {staff.full_name?.charAt(0).toUpperCase()}
                              </div>
                              <span className="truncate">{staff.full_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned Staff */}
                {staffByBranch['unassigned']?.length > 0 && (
                  <div className="mb-2">
                    <button
                      onClick={() => toggleBranch('unassigned')}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>Unassigned</span>
                        <span className="text-xs text-gray-500">({staffByBranch['unassigned'].length})</span>
                      </div>
                      {expandedBranches.has('unassigned') ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </button>

                    {expandedBranches.has('unassigned') && (
                      <div className="ml-4 mt-1 space-y-1">
                        {staffByBranch['unassigned'].map(staff => (
                          <button
                            key={staff.id}
                            onClick={() => handleStaffSelect(staff)}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                              selectedStaffId === staff.id
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-semibold text-gray-600">
                              {staff.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate">{staff.full_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
};

export default StaffList;