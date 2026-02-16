import { useState, useEffect } from 'react';
import { supabase, taskAPI } from '../../lib/supabase';
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
import ToReviewView from './components/ToReview.jsx';
import HistoryView from './components/HistoryView.jsx';
import AddBoardModal from './components/AddBoardModal';
import { usePageSecurity } from '../../hooks/usePageSecurity';
import { useStaleTaskChecker } from '../../hooks/useStaleTaskChecker';
import { Layers, ArrowLeft, ChevronDown } from 'lucide-react';

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
  const [isAddBoardModalOpen, setIsAddBoardModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [newTaskStatus, setNewTaskStatus] = useState('todo');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showStaffList, setShowStaffList] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

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

    const sortedBoards = (data || []).sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    );

    setBoards(sortedBoards);
    setSelectedBoard(sortedBoards[0] || null);
    return sortedBoards;
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

      // Load comments for all tasks from task_comments table
      const taskIds = tasksData.map(t => t.id);
      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('id, task_id, comment, created_at, user_id, read_by')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
      }

      // Group comments by task_id
      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) {
          commentsByTask[comment.task_id] = [];
        }
        commentsByTask[comment.task_id].push({
          id: comment.id,
          task_id: comment.task_id,
          content: comment.comment, // Map 'comment' field to 'content' for consistency
          created_at: comment.created_at,
          created_by: comment.user_id,
          read_by: comment.read_by || [],
          user: {
            id: comment.user_id,
            name: userMap[comment.user_id] || 'Unknown User'
          }
        });
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
        } : null,
        comments: commentsByTask[task.id] || []
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
      
      // Use taskAPI to get tasks with assigned_users populated
      const tasksData = await taskAPI.getAllTasksForBoard(boardId);
      
      // Filter by current user if not admin
      const filteredTasks = isAdmin 
        ? tasksData 
        : tasksData.filter(t => 
            t.assigned_to === currentUser.id || 
            (t.assigned_users && t.assigned_users.some(u => u.id === currentUser.id))
          );

      // Load comments for filtered tasks from task_comments table
      const taskIds = filteredTasks.map(t => t.id);
      const { data: commentsData } = await supabase
        .from('task_comments')
        .select('id, task_id, comment, created_at, user_id, read_by')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });

      // Get user info for comment authors
      const commentUserIds = [...new Set((commentsData || []).map(c => c.user_id))];
      const { data: commentUsersData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', commentUserIds);

      const commentUserMap = {};
      (commentUsersData || []).forEach(user => {
        commentUserMap[user.id] = user.full_name;
      });

      // Group comments by task_id
      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) {
          commentsByTask[comment.task_id] = [];
        }
        commentsByTask[comment.task_id].push({
          id: comment.id,
          task_id: comment.task_id,
          content: comment.comment, // Map 'comment' field to 'content' for consistency
          created_at: comment.created_at,
          created_by: comment.user_id,
          read_by: comment.read_by || [],
          user: {
            id: comment.user_id,
            name: commentUserMap[comment.user_id] || 'Unknown User'
          }
        });
      });

      // Format for compatibility with existing code
      const formattedTasks = filteredTasks.map(task => ({
        ...task,
        assigned_user: task.assigned_users && task.assigned_users.length > 0 ? {
          id: task.assigned_users[0].id,
          name: task.assigned_users[0].full_name
        } : null,
        comments: commentsByTask[task.id] || []
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

  const handleCreateBoard = async (boardName) => {
    if (!selectedBranch) {
      alert('Please select a branch first.');
      return;
    }

    try {
      setSaving(true);

      const { data, error } = await supabase
        .from('boards')
        .insert([
          {
            name: boardName,
            branch_id: selectedBranch.id,
            created_by: currentUser.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      const updatedBoards = [...boards, data].sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );

      setBoards(updatedBoards);
      setSelectedBoard(data);
      setIsAddBoardModalOpen(false);

    } catch (err) {
      console.error('Error creating board:', err);
      alert('Failed to create board. Please try again.');
    } finally {
      setSaving(false);
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
        const { data, error } = await taskAPI.updateTask(editingTask.id, {
          ...taskData,
          updated_by: currentUser.id
        });

        if (error) throw error;
      } else {
        const { data, error } = await taskAPI.createTask({
          ...taskData,
          status: newTaskStatus,
          board_id: selectedBoard.id,
          branch_id: selectedBranch.id,
          created_by: currentUser.id,
          updated_by: currentUser.id
        });

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
      const now = new Date().toISOString();
      const updateData = { 
        status: newStatus,
        changed_by: currentUser.id
      };

      switch (newStatus) {
        case 'in-progress':
          updateData.in_progress_at = now;
          const { data: currentTask } = await supabase
            .from('tasks')
            .select('started_at')
            .eq('id', taskId)
            .single();
          
          if (!currentTask?.started_at) {
            updateData.started_at = now;
          }
          break;
        case 'validating':
          updateData.validating_at = now;
          break;
        case 'completed':
          updateData.completed_at = now;
          break;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
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
    if (notification.type === 'navigate_to_review') {
      setActiveView('review');
      return;
    }
    
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

        // Load comments for this task from task_comments table
        const { data: commentsData } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskData.id)
          .order('created_at', { ascending: true });

        const formattedComments = (commentsData || []).map(comment => ({
          id: comment.id,
          task_id: comment.task_id,
          content: comment.comment, // Map 'comment' field to 'content' for consistency
          created_at: comment.created_at,
          created_by: comment.user_id,
          read_by: comment.read_by || [],
          user: {
            id: comment.user_id,
            name: userMap[comment.user_id] || 'Unknown User'
          }
        }));

        const formattedTask = {
          ...taskData,
          assigned_user: taskData.assigned_to ? {
            id: taskData.assigned_to,
            name: userMap[taskData.assigned_to]
          } : null,
          created_user: taskData.created_by ? {
            id: taskData.created_by,
            name: userMap[taskData.created_by]
          } : null,
          comments: formattedComments
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

  const handleTaskConfirm = async (taskId) => {
    const newAllTasks = await loadAllTasks(currentUser);
    setAllTasks(newAllTasks);
    
    if (selectedBoard) {
      await loadTasks(selectedBoard.id);
    }
  };

  const handleRefresh = async () => {
    const newAllTasks = await loadAllTasks(currentUser);
    setAllTasks(newAllTasks);
  };

  const handleMarkCommentsAsRead = async (taskId) => {
    try {
      // Get the task's comments from task_comments table
      const { data: comments, error: fetchError } = await supabase
        .from('task_comments')
        .select('id, read_by')
        .eq('task_id', taskId);

      if (fetchError) throw fetchError;

      if (!comments || comments.length === 0) {
        return; // No comments to mark as read
      }

      // Update each comment to add current user to read_by array
      const updates = comments.map(comment => {
        const readBy = comment.read_by || [];
        if (!readBy.includes(currentUser.id)) {
          readBy.push(currentUser.id);
        }
        return supabase
          .from('task_comments')
          .update({ read_by: readBy })
          .eq('id', comment.id);
      });

      await Promise.all(updates);

      // Refresh all tasks to update the UI
      const newAllTasks = await loadAllTasks(currentUser);
      setAllTasks(newAllTasks);

    } catch (err) {
      console.error('Error marking comments as read:', err);
    }
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
                  onMarkCommentsAsRead={handleMarkCommentsAsRead}
                  onTasksRefresh={handleRefresh}
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

          {isAdmin && activeView === 'review' && (
            <ToReviewView
              currentUser={currentUser}
              onTaskConfirm={handleTaskConfirm}
              onRefresh={handleRefresh}
            />
          )}

          {activeView === 'history' && (
            <HistoryView
              currentUser={currentUser}
              isAdmin={isAdmin}
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
                      onClick={() => setIsAddBoardModalOpen(true)}
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
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-500" />
                      Active Board:
                    </label>
                    <div className="relative flex-1 max-w-md">
                      <select
                        value={selectedBoard?.id || ''}
                        onChange={(e) =>
                          setSelectedBoard(
                            boards.find(b => b.id === e.target.value)
                          )
                        }
                        className="w-full appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer hover:border-gray-400 font-medium text-gray-900"
                      >
                        {boards.map(board => (
                          <option key={board.id} value={board.id}>
                            {board.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {boards.length} {boards.length === 1 ? 'board' : 'boards'}
                    </div>
                  </div>
                </div>
              )}

              {boards.length === 0 ? (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div className="text-center max-w-md">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <Layers className="w-12 h-12 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Boards Yet</h2>
                    <p className="text-gray-600 mb-6">
                      {isAdmin 
                        ? 'Create a board to start organizing tasks for this branch.'
                        : 'No boards available yet for this branch.'}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => setIsAddBoardModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition-colors shadow-md font-medium"
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
        <>
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

          <AddBoardModal
            isOpen={isAddBoardModalOpen}
            onClose={() => setIsAddBoardModalOpen(false)}
            onSubmit={handleCreateBoard}
            existingBoards={boards}
            saving={saving}
          />
        </>
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