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
import ToReviewView from './components/ToReview.jsx';
import HistoryView from './components/HistoryView.jsx';
import AddBoardModal from './components/AddBoardModal';
import { usePageSecurity } from '../../hooks/usePageSecurity';
import { useStaleTaskChecker } from '../../hooks/useStaleTaskChecker';
import { Layers, ArrowLeft, ChevronDown } from 'lucide-react';
import { notifyTaskAssigned } from '../../utils/NotificationHelpers';

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
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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

  // ─── Data Loading ────────────────────────────────────────────────────────────

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
      .order('created_at', { ascending: true });

    if (error) { console.error('Error loading branches:', error); return []; }
    return data || [];
  };

  // FIX: checks both task_assigned_users (view) and legacy assigned_to
  const loadStaffBranches = async (userId) => {
    try {
      // Read from view is fine for SELECT
      const { data: assignedTaskIds, error: assignError } = await supabase
        .from('task_assigned_users')
        .select('task_id')
        .eq('user_id', userId);

      if (assignError) console.error('Error loading staff task assignments:', assignError);

      // Also get tasks via legacy assigned_to column
      const { data: legacyTasks, error: legacyError } = await supabase
        .from('tasks')
        .select('branch_id, branches(id, name, description, location)')
        .eq('assigned_to', userId);

      if (legacyError) console.error('Error loading legacy assigned tasks:', legacyError);

      const taskIds = (assignedTaskIds || []).map(a => a.task_id);
      let junctionTasks = [];

      if (taskIds.length > 0) {
        const { data, error } = await supabase
          .from('tasks')
          .select('branch_id, branches(id, name, description, location)')
          .in('id', taskIds);

        if (error) console.error('Error loading branches for staff tasks:', error);
        else junctionTasks = data || [];
      }

      const branchMap = new Map();
      [...(legacyTasks || []), ...junctionTasks].forEach(task => {
        if (task.branches && !branchMap.has(task.branches.id)) {
          branchMap.set(task.branches.id, task.branches);
        }
      });

      return Array.from(branchMap.values());
    } catch (err) {
      console.error('Error in loadStaffBranches:', err);
      return [];
    }
  };

  const loadBoards = async (branchId) => {
    const { data, error } = await supabase
      .from('boards')
      .select('*')
      .eq('branch_id', branchId)
      .order('created_at', { ascending: true });

    if (error) { console.error('Error loading boards:', error); return []; }

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

    if (error) { console.error('Error loading staff:', error); return []; }
    return data || [];
  };

  const loadAllTasks = async (userProfile) => {
    try {
      const isAdmin = userProfile?.role === 'admin';
      let tasksData = [];

      if (isAdmin) {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        tasksData = data || [];
      } else {
        // Get via junction table (view SELECT is fine)
        const { data: assignedTaskIds, error: assignError } = await supabase
          .from('task_assigned_users')
          .select('task_id')
          .eq('user_id', userProfile.id);

        if (assignError) throw assignError;

        const taskIds = (assignedTaskIds || []).map(a => a.task_id);

        // Also check legacy assigned_to
        const { data: legacyTasksData, error: legacyError } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', userProfile.id)
          .order('created_at', { ascending: false });

        if (legacyError) throw legacyError;

        let junctionTasksData = [];
        if (taskIds.length > 0) {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .in('id', taskIds)
            .order('created_at', { ascending: false });
          if (error) throw error;
          junctionTasksData = data || [];
        }

        // Merge and deduplicate
        const allRaw = [...(legacyTasksData || []), ...junctionTasksData];
        const seen = new Set();
        tasksData = allRaw.filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        });
      }

      if (!tasksData || tasksData.length === 0) return [];

      const taskIds = tasksData.map(t => t.id);

      // Read assignments from the VIEW (SELECT is fine)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assigned_users')
        .select('task_id, user_id, assigned_at, assigned_by')
        .in('task_id', taskIds);

      if (assignmentsError) console.error('Error loading assignments:', assignmentsError);

      const userIds = [...new Set([
        ...(assignmentsData || []).map(a => a.user_id),
        ...tasksData.map(t => t.created_by).filter(Boolean)
      ])];

      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .in('id', userIds);

      if (usersError) throw usersError;

      const userMap = {};
      (usersData || []).forEach(user => { userMap[user.id] = user; });

      const assignmentsByTask = {};
      (assignmentsData || []).forEach(assignment => {
        if (!assignmentsByTask[assignment.task_id]) {
          assignmentsByTask[assignment.task_id] = [];
        }
        const user = userMap[assignment.user_id];
        if (user) {
          assignmentsByTask[assignment.task_id].push({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            assigned_at: assignment.assigned_at,
            assigned_by: assignment.assigned_by
          });
        }
      });

      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments')
        .select('id, task_id, comment, created_at, user_id, read_by')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });

      if (commentsError) console.error('Error loading comments:', commentsError);

      const commentUserIds = [...new Set((commentsData || []).map(c => c.user_id))];
      const commentUserIdsToFetch = commentUserIds.filter(id => !userMap[id]);

      if (commentUserIdsToFetch.length > 0) {
        const { data: commentUsersData } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', commentUserIdsToFetch);
        (commentUsersData || []).forEach(user => { userMap[user.id] = user; });
      }

      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) commentsByTask[comment.task_id] = [];
        commentsByTask[comment.task_id].push({
          id: comment.id,
          task_id: comment.task_id,
          content: comment.comment,
          created_at: comment.created_at,
          created_by: comment.user_id,
          read_by: comment.read_by || [],
          user: {
            id: comment.user_id,
            name: userMap[comment.user_id]?.full_name || 'Unknown User'
          }
        });
      });

      return tasksData.map(task => {
        const assignedUsers = assignmentsByTask[task.id] || [];
        return {
          ...task,
          assigned_users: assignedUsers,
          assigned_user: assignedUsers.length > 0
            ? { id: assignedUsers[0].id, name: assignedUsers[0].full_name }
            : null,
          assigned_to: assignedUsers.length > 0 ? assignedUsers[0].id : task.assigned_to,
          created_user: task.created_by
            ? { id: task.created_by, name: userMap[task.created_by]?.full_name || 'Unknown' }
            : null,
          comments: commentsByTask[task.id] || []
        };
      });
    } catch (err) {
      console.error('Error loading all tasks:', err);
      return [];
    }
  };

  const loadTasks = async (boardId) => {
    try {
      const isAdmin = currentUser?.role === 'admin';

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) { setTasks([]); return; }

      const taskIds = tasksData.map(t => t.id);

      // Read from view (SELECT is fine)
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assigned_users')
        .select('task_id, user_id, assigned_at, assigned_by')
        .in('task_id', taskIds);

      if (assignmentsError) console.error('Error loading assignments:', assignmentsError);

      const userIds = [...new Set((assignmentsData || []).map(a => a.user_id))];
      let usersData = [];
      if (userIds.length > 0) {
        const { data, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .in('id', userIds);
        if (usersError) console.error('Error loading users:', usersError);
        else usersData = data || [];
      }

      const userMap = {};
      usersData.forEach(user => { userMap[user.id] = user; });

      const assignmentsByTask = {};
      (assignmentsData || []).forEach(assignment => {
        if (!assignmentsByTask[assignment.task_id]) assignmentsByTask[assignment.task_id] = [];
        const user = userMap[assignment.user_id];
        if (user) {
          assignmentsByTask[assignment.task_id].push({
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            assigned_at: assignment.assigned_at,
            assigned_by: assignment.assigned_by
          });
        }
      });

      const { data: commentsData } = await supabase
        .from('task_comments')
        .select('id, task_id, comment, created_at, user_id, read_by')
        .in('task_id', taskIds)
        .order('created_at', { ascending: true });

      const commentUserIds = [...new Set((commentsData || []).map(c => c.user_id))];
      const { data: commentUsersData } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', commentUserIds);

      const commentUserMap = {};
      (commentUsersData || []).forEach(user => { commentUserMap[user.id] = user.full_name; });

      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) commentsByTask[comment.task_id] = [];
        commentsByTask[comment.task_id].push({
          id: comment.id,
          task_id: comment.task_id,
          content: comment.comment,
          created_at: comment.created_at,
          created_by: comment.user_id,
          read_by: comment.read_by || [],
          user: {
            id: comment.user_id,
            name: commentUserMap[comment.user_id] || 'Unknown User'
          }
        });
      });

      const formattedTasks = tasksData.map(task => {
        const assignedUsers = assignmentsByTask[task.id] || [];
        return {
          ...task,
          assigned_users: assignedUsers,
          assigned_user: assignedUsers.length > 0
            ? { id: assignedUsers[0].id, name: assignedUsers[0].full_name }
            : null,
          comments: commentsByTask[task.id] || []
        };
      });

      const filteredTasks = isAdmin
        ? formattedTasks
        : formattedTasks.filter(task =>
            task.assigned_users.some(u => u.id === currentUser.id) ||
            task.assigned_to === currentUser.id
          );

      setTasks(filteredTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setTasks([]);
    }
  };

  // ─── Branch / Board Handlers ─────────────────────────────────────────────────

  const handleAddBranch = async (branchData) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([{ ...branchData, manager_id: branchData.manager_id || null, created_by: currentUser.id }])
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
      setBranches(prev => prev.map(b => b.id === branchId ? { ...b, ...branchData } : b));
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
      const { error } = await supabase.from('branches').delete().eq('id', branchId);
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
    if (!selectedBranch) { alert('Please select a branch first.'); return; }
    try {
      setSaving(true);
      const { data, error } = await supabase
        .from('boards')
        .insert([{ name: boardName, branch_id: selectedBranch.id, created_by: currentUser.id }])
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

  // ─── Task Handlers ───────────────────────────────────────────────────────────

  // FIX: All writes go to 'task_assignments' (real table), reads from 'task_assigned_users' (view)
  const handleSubmitTask = async (taskData) => {
    if (!selectedBoard || !selectedBranch) {
      alert('Please select a branch and board first.');
      return;
    }

    try {
      setSaving(true);

      if (editingTask) {
        // UPDATE
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            status: taskData.status,
            priority: taskData.priority,
            due_date: taskData.due_date,
            updated_by: currentUser.id,
            assigned_to: taskData.assigned_to?.length > 0 ? taskData.assigned_to[0] : null
          })
          .eq('id', editingTask.id);

        if (updateError) throw updateError;

        if (taskData.assigned_to && Array.isArray(taskData.assigned_to)) {
          // Read current from VIEW
          const { data: currentAssignments } = await supabase
            .from('task_assigned_users')
            .select('user_id')
            .eq('task_id', editingTask.id);

          const currentUserIds = (currentAssignments || []).map(a => a.user_id);
          const newUserIds = taskData.assigned_to;
          const usersToAdd = newUserIds.filter(id => !currentUserIds.includes(id));
          const usersToRemove = currentUserIds.filter(id => !newUserIds.includes(id));

          if (usersToRemove.length > 0) {
            // WRITE to real table
            await supabase
              .from('task_assignments')
              .delete()
              .eq('task_id', editingTask.id)
              .in('user_id', usersToRemove);
          }

          if (usersToAdd.length > 0) {
            // WRITE to real table
            const newAssignments = usersToAdd.map(userId => ({
              task_id: editingTask.id,
              user_id: userId,
              assigned_by: currentUser.id,
              assigned_at: new Date().toISOString()
            }));

            const { error: addError } = await supabase
              .from('task_assignments')
              .insert(newAssignments);

            if (addError && addError.code !== '23505') {
              console.error('Error adding users:', addError);
            }

            await notifyTaskAssigned(editingTask, usersToAdd, currentUser.id);
          }
        } else {
          // Clear all — WRITE to real table
          await supabase
            .from('task_assignments')
            .delete()
            .eq('task_id', editingTask.id);
        }

      } else {
        // CREATE
        const { data: newTask, error: createError } = await supabase
          .from('tasks')
          .insert([{
            title: taskData.title,
            description: taskData.description,
            status: taskData.status || 'todo',
            priority: taskData.priority,
            due_date: taskData.due_date,
            board_id: selectedBoard.id,
            branch_id: selectedBranch.id,
            created_by: currentUser.id,
            updated_by: currentUser.id,
            assigned_to: taskData.assigned_to?.length > 0 ? taskData.assigned_to[0] : null
          }])
          .select()
          .single();

        if (createError) throw createError;

        if (taskData.assigned_to?.length > 0) {
          // WRITE to real table
          const assignments = taskData.assigned_to.map(userId => ({
            task_id: newTask.id,
            user_id: userId,
            assigned_by: currentUser.id,
            assigned_at: new Date().toISOString()
          }));

          const { error: assignError } = await supabase
            .from('task_assignments')
            .insert(assignments);

          if (assignError && assignError.code !== '23505') {
            console.error('Error assigning users:', assignError);
          }

          await notifyTaskAssigned(newTask, taskData.assigned_to, currentUser.id);
        }
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
      const updateData = { status: newStatus, changed_by: currentUser.id };

      if (newStatus === 'in-progress') {
        updateData.in_progress_at = now;
        const { data: currentTask } = await supabase
          .from('tasks')
          .select('started_at')
          .eq('id', taskId)
          .single();
        if (!currentTask?.started_at) updateData.started_at = now;
      } else if (newStatus === 'validating') {
        updateData.validating_at = now;
      } else if (newStatus === 'completed') {
        updateData.completed_at = now;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
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
    if (selectedBoard) await loadTasks(selectedBoard.id);
    const newAllTasks = await loadAllTasks(currentUser);
    setAllTasks(newAllTasks);
  };

  const handleTaskConfirm = async (taskId) => {
    const newAllTasks = await loadAllTasks(currentUser);
    setAllTasks(newAllTasks);
    if (selectedBoard) await loadTasks(selectedBoard.id);
  };

  const handleRefresh = async () => {
    const newAllTasks = await loadAllTasks(currentUser);
    setAllTasks(newAllTasks);
  };

  const handleMarkCommentsAsRead = async (taskId) => {
    try {
      const { data: comments, error: fetchError } = await supabase
        .from('task_comments')
        .select('id, read_by')
        .eq('task_id', taskId);

      if (fetchError) throw fetchError;
      if (!comments || comments.length === 0) return;

      const updates = comments.map(comment => {
        const readBy = comment.read_by || [];
        if (!readBy.includes(currentUser.id)) readBy.push(currentUser.id);
        return supabase
          .from('task_comments')
          .update({ read_by: readBy })
          .eq('id', comment.id);
      });

      await Promise.all(updates);
      const newAllTasks = await loadAllTasks(currentUser);
      setAllTasks(newAllTasks);
    } catch (err) {
      console.error('Error marking comments as read:', err);
    }
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
        (usersData || []).forEach(user => { userMap[user.id] = user.full_name; });

        const { data: commentsData } = await supabase
          .from('task_comments')
          .select('*')
          .eq('task_id', taskData.id)
          .order('created_at', { ascending: true });

        const formattedComments = (commentsData || []).map(comment => ({
          id: comment.id,
          task_id: comment.task_id,
          content: comment.comment,
          created_at: comment.created_at,
          created_by: comment.user_id,
          read_by: comment.read_by || [],
          user: { id: comment.user_id, name: userMap[comment.user_id] || 'Unknown User' }
        }));

        handleTaskClick({
          ...taskData,
          assigned_user: taskData.assigned_to
            ? { id: taskData.assigned_to, name: userMap[taskData.assigned_to] }
            : null,
          created_user: taskData.created_by
            ? { id: taskData.created_by, name: userMap[taskData.created_by] }
            : null,
          comments: formattedComments
        });
      }
    }
  };

  // ─── Staff Handlers ──────────────────────────────────────────────────────────

  const handleStaffSelect = (staff) => setSelectedStaff(staff);

  const handleStaffListToggle = () => {
    setShowStaffList(!showStaffList);
    setSelectedStaff(null);
    setActiveView('staff');
  };

  const getTasksByStatus = (status) => tasks.filter(task => task.status === status);

  // ─── Render ──────────────────────────────────────────────────────────────────

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

          {/* ── Dashboard ── */}
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

          {/* ── Companies ── */}
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

          {/* ── To Review ── */}
          {isAdmin && activeView === 'review' && (
            <ToReviewView
              currentUser={currentUser}
              onTaskConfirm={handleTaskConfirm}
              onRefresh={handleRefresh}
            />
          )}

          {/* ── History ── */}
          {activeView === 'history' && (
            <HistoryView
              currentUser={currentUser}
              isAdmin={isAdmin}
            />
          )}

          {/* ── Staff Tasks View ── */}
          {isAdmin && activeView === 'staff' && selectedStaff && (
            <StaffTasksView
              staff={selectedStaff}
              onTaskClick={handleTaskClick}
              onBack={() => setSelectedStaff(null)}
            />
          )}

          {/* ── Kanban Board ── */}
          {activeView === 'board' && selectedBranch && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Board header */}
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
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 hidden sm:block">
                        Kanban Boards
                      </p>
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

              {/* Board selector */}
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
                          setSelectedBoard(boards.find(b => b.id === e.target.value))
                        }
                        className="w-full appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer hover:border-gray-400 font-medium text-gray-900"
                      >
                        {boards.map(board => (
                          <option key={board.id} value={board.id}>{board.name}</option>
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

              {/* Empty state */}
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
                <div className="flex-1 overflow-auto p-4 md:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* ── Modals ── */}
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