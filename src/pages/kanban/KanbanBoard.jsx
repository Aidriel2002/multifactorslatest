import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getCurrentUserProfile } from '../../lib/supabase';
import LeftSidebar from './components/LeftSidebar';
import Dashboard from './components/Dashboard';
import StaffDashboard from './components/StaffDashboard';
import CompanyList from './components/CompanyList';
import KanbanColumn from './components/KanbanColumn_v2.jsx';
import TaskModal from './components/TaskModal';
import TaskDetailsModal from './components/TaskDetailsModal'; // Your existing modal
import { usePageSecurity } from '../../hooks/usePageSecurity';
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

  const { loading: securityLoading } = usePageSecurity(
    (user) => user?.role === 'admin' || user?.role === 'staff'
  );

  const columns = [
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'validating', title: 'Validating' },
    { id: 'completed', title: 'Completed' }
  ];

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

      const [branchesData, staffUsers, userProfile, allTasksData] = await Promise.all([
        loadBranches(),
        loadStaffUsers(),
        getCurrentUserProfile(),
        loadAllTasks()
      ]);

      setBranches(branchesData);
      setUsers(staffUsers);
      setCurrentUser(userProfile);
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
      .select('id, full_name, role')
      .eq('role', 'staff')
      .eq('status', 'approved');

    if (error) {
      console.error('Error loading staff:', error);
      return [];
    }

    return data || [];
  };

  const loadAllTasks = async () => {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, full_name),
        created_user:users!tasks_created_by_fkey(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading all tasks:', error);
      return [];
    }

    // Format for your existing TaskDetailsModal
    return (data || []).map(task => ({
      ...task,
      assigned_user: task.assigned_user ? {
        id: task.assigned_user.id,
        name: task.assigned_user.full_name
      } : null,
      created_user: task.created_user ? {
        id: task.created_user.id,
        name: task.created_user.full_name
      } : null
    }));
  };

  const loadTasks = async (boardId) => {
    const isAdmin = currentUser?.role === 'admin';
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, full_name),
        created_user:users!tasks_created_by_fkey(id, full_name)
      `)
      .eq('board_id', boardId);

    // Filter tasks: Staff only see their assigned tasks, Admin sees all
    if (!isAdmin) {
      query = query.eq('assigned_to', currentUser.id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tasks:', error);
      return;
    }

    // Format for your existing TaskDetailsModal
    const formattedTasks = (data || []).map(task => ({
      ...task,
      assigned_user: task.assigned_user ? {
        id: task.assigned_user.id,
        name: task.assigned_user.full_name
      } : null,
      created_user: task.created_user ? {
        id: task.created_user.id,
        name: task.created_user.full_name
      } : null
    }));

    setTasks(formattedTasks);
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
      
      // Reload all tasks to update dashboard
      const newAllTasks = await loadAllTasks();
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

      // Update local state
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

      // Reload all tasks
      const newAllTasks = await loadAllTasks();
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
          .update(taskData)
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
              created_by: currentUser.id
            }
          ]);

        if (error) throw error;
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      
      // Reload tasks for selected board and all tasks for dashboard
      await loadTasks(selectedBoard.id);
      const newAllTasks = await loadAllTasks();
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
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      // Reload tasks
      await loadTasks(selectedBoard.id);
      const newAllTasks = await loadAllTasks();
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
    // Reload tasks after update from modal
    if (selectedBoard) {
      await loadTasks(selectedBoard.id);
    }
    const newAllTasks = await loadAllTasks();
    setAllTasks(newAllTasks);
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
      {/* Left Sidebar Navigation - Only show for admin */}
      {isAdmin && (
        <LeftSidebar
          activeView={activeView}
          onViewChange={setActiveView}
          branches={branches}
        />
      )}

      {/* Main Content */}
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

      {isAdmin && activeView === 'board' && selectedBranch && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setActiveView('dashboard');
                    setSelectedBranch(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <Layers className="w-6 h-6 text-blue-600" />
                    <h1 className="text-2xl font-bold text-gray-900">{selectedBranch.name}</h1>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Kanban Boards</p>
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={createBoard}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Layers className="w-4 h-4" />
                  Create Board
                </button>
              )}
            </div>
          </div>

          {/* Board Selector */}
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

          {/* Kanban Columns */}
          {boards.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center max-w-md">
                <Layers className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  No Boards Yet
                </h2>
                <p className="text-gray-600 mb-6">
                  Create a board to start organizing tasks for this branch.
                </p>
                <button
                  onClick={createBoard}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors shadow-md"
                >
                  <Layers className="w-5 h-5" />
                  Create First Board
                </button>
              </div>
            </div>
          ) : selectedBoard ? (
            <div className="flex-1 p-6 overflow-auto">
              <div className="grid grid-cols-4 gap-4 h-full">
                {columns.map(column => (
                  <KanbanColumn
                    key={column.id}
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
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Task Modal - Only admin can create/edit */}
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

      {/* Task Detail Modal - Use your existing TaskDetailsModal */}
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