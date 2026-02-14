import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from '../../lib/supabase';
import LeftSidebar from './components/LeftSidebar';
import Dashboard from './components/Dashboard';
import StaffDashboard from './components/StaffDashboard';
import CompanyList from './components/CompanyList';
import KanbanColumn from './components/KanbanColumn_v2.jsx';
import TaskModal from './components/TaskModal';
import TaskDetailsModal from './components/TaskDetailsModal';
import Notifications from './components/Notifications';
import StaffList from './components/StaffList';
import StaffTasksView from './components/StaffTasksView';
import { usePageSecurity } from '../../hooks/usePageSecurity';
import { useStaleTaskChecker } from '../../hooks/useStaleTaskChecker';
import { Layers, ArrowLeft } from 'lucide-react';

const KanbanBoard = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [boards, setBoards] = useState([]);
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]); 
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffList, setShowStaffList] = useState(false);

  const { loading: securityLoading } = usePageSecurity(
    (user) => user?.role === 'admin' || user?.role === 'staff'
  );

  const { checkStaleTasks } = useStaleTaskChecker(currentUser, true, 60);

  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'validating', title: 'Validating' },
    { id: 'completed', title: 'Completed' }
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!securityLoading) {
      loadInitialData();
    }
  }, [securityLoading]);

  useEffect(() => {
    if (selectedBoard) {
      loadTasks(selectedBoard.id);
    } else {
      setTasks([]);
    }
  }, [selectedBoard]);

  useEffect(() => {
    if (selectedBranch) {
      loadBoards(selectedBranch.id);
    } else {
      setBoards([]);
      setSelectedBoard(null);
    }
  }, [selectedBranch]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const userProfile = await getCurrentUserProfile();
      setCurrentUser(userProfile);

      let branchesData;
      if (userProfile?.role === 'admin') {
        branchesData = await loadBranches();
      } else {
        branchesData = await loadStaffBranches(userProfile.id);
      }

      const [staffUsers, allTasksData] = await Promise.all([
        loadStaffUsers(),
        loadAllTasks(userProfile)
      ]);

      setBranches(branchesData);
      setUsers(staffUsers);
      setAllTasks(allTasksData);

    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    const { data, error } = await supabase
      .from('branches')
      .select('*')
      .order('created_at', { ascending: true});

    if (error) {
      console.error('Error loading branches:', error);
      return [];
    }

    return data || [];
  };

  const loadStaffBranches = async (userId) => {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('branch_id, branches(id, name, description, location)')
      .eq('assigned_to', userId);

    if (tasksError) {
      console.error('Error loading staff branches:', tasksError);
      return [];
    }

    const branchMap = new Map();
    tasksData?.forEach(task => {
      if (task.branches && !branchMap.has(task.branches.id)) {
        branchMap.set(task.branches.id, task.branches);
      }
    });

    return Array.from(branchMap.values());
  };

  const loadBoards = async (branchId) => {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading boards:', error);
      return [];
    }

    setBoards(data || []);
    setSelectedBoard(data?.[0] || null);
    return data || [];
  };

  const loadStaffUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, role, email')
      .eq('role', 'staff')
      .eq('status', 'approved');

    if (error) {
      console.error('Error loading staff:', error);
      return [];
    }

    return data || [];
  };

  const loadAllTasks = async (userProfile) => {
    try {
      const isAdmin = userProfile?.role === 'admin';
      
      let query = supabase.from('tasks').select('*');
      
      if (!isAdmin) {
        query = query.eq('assigned_to', userProfile.id);
      }
      
      const { data: tasksData, error: tasksError } = await query.order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      if (!tasksData || tasksData.length === 0) {
        return [];
      }

      const userIds = [...new Set([
        ...tasksData.map(t => t.assigned_to).filter(Boolean),
        ...tasksData.map(t => t.created_by).filter(Boolean)
      ])];

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      const userMap = {};
      (usersData || []).forEach(user => {
        userMap[user.id] = user.full_name;
      });

      const formattedTasks = tasksData.map(task => ({
        ...task,
        assigned_user: task.assigned_to ? {
          id: task.assigned_to,
          name: userMap[task.assigned_to] || 'Unknown'
        } : null,
        created_user: task.created_by ? {
          id: task.created_by,
          name: userMap[task.created_by] || 'Unknown'
        } : null
      }));

      return formattedTasks;
    } catch (err) {
      console.error('Error loading all tasks:', err);
      return [];
    }
  };

  const loadTasks = async (boardId) => {
    try {
      const isAdmin = currentUser?.role === 'admin';
      
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId);

      if (!isAdmin) {
        query = query.eq('assigned_to', currentUser.id);
      }

      const { data: tasksData, error: tasksError } = await query.order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      if (!tasksData || tasksData.length === 0) {
        setTasks([]);
        return;
      }

      const userIds = [...new Set([
        ...tasksData.map(t => t.assigned_to).filter(Boolean),
        ...tasksData.map(t => t.created_by).filter(Boolean)
      ])];

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', userIds);

      if (usersError) throw usersError;

      const userMap = {};
      (usersData || []).forEach(user => {
        userMap[user.id] = user.full_name;
      });

      const formattedTasks = tasksData.map(task => ({
        ...task,
        assigned_user: task.assigned_to ? {
          id: task.assigned_to,
          name: userMap[task.assigned_to] || 'Unknown'
        } : null,
        created_user: task.created_by ? {
          id: task.created_by,
          name: userMap[task.created_by] || 'Unknown'
        } : null
      }));

      setTasks(formattedTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setTasks([]);
    }
  };

  const handleAddBranch = async (branchData) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([
          {
            ...branchData,
            manager_id: branchData.manager_id || null,
            created_by: currentUser.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setBranches(prev => [...prev, data]);
      
      const newAllTasks = await loadAllTasks(currentUser);
      setAllTasks(newAllTasks);

    } catch (err) {
      console.error('Error creating branch:', err);
      alert('Failed to create branch. Please try again.');
    }
  };

  const handleEditBranch = async (branchId, branchData) => {
    try {
      const { error } = await supabase
        .from('branches')
        .update(branchData)
        .eq('id', branchId);

      if (error) throw error;

      setBranches(prev => prev.map(b => 
        b.id === branchId ? { ...b, ...branchData } : b
      ));

      if (selectedBranch?.id === branchId) {
        setSelectedBranch(prev => ({ ...prev, ...branchData }));
      }

    } catch (err) {
      console.error('Error updating branch:', err);
      alert('Failed to update branch. Please try again.');
    }
  };

  const handleSelectBranch = (branch) => {
    setSelectedBranch(branch);
    setActiveView('board');
    setShowStaffList(false);
  };

  const handleDeleteBranch = async (branchId) => {
    try {
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;

      setBranches(prev => prev.filter(b => b.id !== branchId));
      
      if (selectedBranch?.id === branchId) {
        setSelectedBranch(null);
        setActiveView('dashboard');
      }

      const newAllTasks = await loadAllTasks(currentUser);
      setAllTasks(newAllTasks);

    } catch (err) {
      console.error('Error deleting branch:', err);
      alert('Failed to delete branch. Please try again.');
    }
  };

  const createBoard = async () => {
    if (!selectedBranch) {
      alert('Please select a branch first.');
      return;
    }

    const name = prompt('Enter board name:');
    if (!name || !name.trim()) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .insert([
          {
            name: name.trim(),
            branch_id: selectedBranch.id,
            created_by: currentUser.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setBoards(prev => [...prev, data]);
      setSelectedBoard(data);

    } catch (err) {
      console.error('Error creating board:', err);
      alert('Failed to create board. Please try again.');
    }
  };

  const handleSubmitTask = async (taskData) => {
    if (!selectedBoard || !selectedBranch) {
      alert('Please select a branch and board first.');
      return;
    }

    try {
      setSaving(true);

      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            ...taskData,
            updated_by: currentUser.id
          })
          .eq('id', editingTask.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([
            {
              ...taskData,
              status: newTaskStatus,
              board_id: selectedBoard.id,
              branch_id: selectedBranch.id,
              created_by: currentUser.id,
              updated_by: currentUser.id
            }
          ]);

        if (error) throw error;
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      
      await loadTasks(selectedBoard.id);
      const newAllTasks = await loadAllTasks(currentUser);
      setAllTasks(newAllTasks);

    } catch (err) {
      console.error('Error saving task:', err);
      alert('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveTask = async (taskId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_by: currentUser.id
        })
        .eq('id', taskId);

      if (error) throw error;

      await loadTasks(selectedBoard.id);
      const newAllTasks = await loadAllTasks(currentUser);
      setAllTasks(newAllTasks);

    } catch (err) {
      console.error('Error moving task:', err);
      alert('Failed to move task. Please try again.');
    }
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setIsTaskDetailModalOpen(true);
  };

  const handleTaskUpdate = async () => {
    if (selectedBoard) {
      await loadTasks(selectedBoard.id);
    }
    const newAllTasks = await loadAllTasks(currentUser);
    setAllTasks(newAllTasks);
  };

  const handleNotificationClick = async (notification) => {
    if (notification.task_id) {
      const { data: taskData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', notification.task_id)
        .single();

      if (!error && taskData) {
        const userIds = [taskData.assigned_to, taskData.created_by].filter(Boolean);
        const { data: usersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', userIds);

        const userMap = {};
        (usersData || []).forEach(user => {
          userMap[user.id] = user.full_name;
        });

        const formattedTask = {
          ...taskData,
          assigned_user: taskData.assigned_to ? {
            id: taskData.assigned_to,
            name: userMap[taskData.assigned_to]
          } : null,
          created_user: taskData.created_by ? {
            id: taskData.created_by,
            name: userMap[taskData.created_by]
          } : null
        };

        handleTaskClick(formattedTask);
      }
    }
  };

  const handleStaffSelect = (staff) => {
    setSelectedStaff(staff);
  };

  const handleStaffListToggle = () => {
    setShowStaffList(!showStaffList);
    setSelectedStaff(null);
    setActiveView('staff');
  };

  const getTasksByStatus = (status) =>
    tasks.filter(task => task.status === status);

  if (loading || securityLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';
  const isStaff = currentUser?.role === 'staff';

  return (
    <div className="flex h-screen bg-gray-100">
      <LeftSidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view);
          setShowStaffList(false);
          setSelectedStaff(null);
        }}
        branches={branches}
        currentUser={currentUser}
        onSelectBranch={handleSelectBranch}
        onStaffListClick={isAdmin ? handleStaffListToggle : null}
      />

      {isAdmin && showStaffList && (
        <StaffList
          onStaffSelect={handleStaffSelect}
          selectedStaffId={selectedStaff?.id}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div 
          className="bg-white border-b px-6 py-3 flex items-center justify-end"
          style={{
            position: isMobile ? 'sticky' : 'relative',
            top: 0,
            zIndex: 30,
            flexShrink: 0
          }}
        >
          <Notifications 
            currentUser={currentUser}
            onNotificationClick={handleNotificationClick}
          />
        </div>

        <div className="flex-1 overflow-hidden flex" style={{ overflowY: 'auto' }}>
          {activeView === 'dashboard' && (
            <>
              {isAdmin ? (
                <Dashboard
                  branches={branches}
                  tasks={allTasks}
                  users={users}
                  currentUser={currentUser}
                  onAddBranch={handleAddBranch}
                  onSelectBranch={handleSelectBranch}
                />
              ) : (
                <StaffDashboard
                  tasks={allTasks}
                  currentUser={currentUser}
                  onTaskClick={handleTaskClick}
                />
              )}
            </>
          )}

          {isAdmin && activeView === 'companies' && (
            <CompanyList
              branches={branches}
              tasks={allTasks}
              currentUser={currentUser}
              onSelectBranch={handleSelectBranch}
              onEditBranch={handleEditBranch}
              onDeleteBranch={handleDeleteBranch}
            />
          )}

          {isAdmin && activeView === 'staff' && selectedStaff && (
            <StaffTasksView
              staff={selectedStaff}
              onTaskClick={handleTaskClick}
              onBack={() => setSelectedStaff(null)}
            />
          )}

          {activeView === 'board' && selectedBranch && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white border-b px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <button
                      onClick={() => {
                        setActiveView('dashboard');
                        setSelectedBranch(null);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Layers className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 flex-shrink-0" />
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
                          {selectedBranch.name}
                        </h1>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">Kanban Boards</p>
                    </div>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={createBoard}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm text-sm flex-shrink-0"
                    >
                      <Layers className="w-4 h-4" />
                      <span className="hidden sm:inline">Create Board</span>
                      <span className="sm:hidden">New</span>
                    </button>
                  )}
                </div>
              </div>

              {boards.length > 0 && (
                <div className="bg-gray-50 px-6 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Board:</label>
                    <select
                      value={selectedBoard?.id || ''}
                      onChange={(e) =>
                        setSelectedBoard(
                          boards.find(b => b.id === e.target.value)
                        )
                      }
                      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {boards.map(board => (
                        <option key={board.id} value={board.id}>
                          {board.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {boards.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <Layers className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Boards Yet</h2>
                    <p className="text-gray-600 mb-6">
                      {isAdmin 
                        ? 'Create a board to start organizing tasks for this branch.'
                        : 'No boards available yet for this branch.'}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={createBoard}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors shadow-md"
                      >
                        <Layers className="w-5 h-5" />
                        Create First Board
                      </button>
                    )}
                  </div>
                </div>
              ) : selectedBoard ? (
                <div 
                  className="flex-1 overflow-auto"
                  style={{
                    padding: isMobile ? '1rem' : '1.5rem'
                  }}
                >
                  <div 
                    style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: '1rem',
                      height: '100%',
                      minHeight: isMobile ? 'auto' : '100%'
                    }}
                  >
                    {columns.map(column => (
                      <div
                        key={column.id}
                        style={{
                          flex: isMobile ? 'none' : '1',
                          minWidth: isMobile ? '100%' : '0',
                          marginBottom: isMobile ? '1rem' : '0'
                        }}
                      >
                        <KanbanColumn
                          column={column}
                          tasks={getTasksByStatus(column.id)}
                          onAddTask={(status) => {
                            setNewTaskStatus(status);
                            setEditingTask(null);
                            setIsTaskModalOpen(true);
                          }}
                          onEditTask={(task) => {
                            setEditingTask(task);
                            setIsTaskModalOpen(true);
                          }}
                          onMoveTask={handleMoveTask}
                          canDelete={isAdmin}
                          canAddTask={isAdmin}
                          currentUser={currentUser}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={() => {
            setIsTaskModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleSubmitTask}
          task={editingTask}
          users={users}
          saving={saving}
        />
      )}

      <TaskDetailsModal
        isOpen={isTaskDetailModalOpen}
        onClose={() => {
          setIsTaskDetailModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        currentUser={currentUser}
        onTaskUpdate={handleTaskUpdate}
      />
    </div>
  );
};

export default KanbanBoard;