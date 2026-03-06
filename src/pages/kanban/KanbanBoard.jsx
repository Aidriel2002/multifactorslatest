import { useState, useEffect, useRef } from 'react';
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
import { Layers, ArrowLeft, ChevronDown, X, LayoutGrid } from 'lucide-react';
import { notifyTaskAssigned } from '../../utils/NotificationHelpers';
import { cacheGet, cacheSet, cacheInvalidate } from '../../utils/taskCache';


const BoardPickerModal = ({ isOpen, onClose, boards, selectedBoard, onSelectBoard, boardTaskCounts }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const getBadges = (boardId) => {
    const counts = boardTaskCounts[boardId] || {};
    return {
      todo:      counts.todo || 0,
      active:    (counts['in-progress'] || 0) + (counts['validating'] || 0),
      completed: counts.completed || 0,
    };
  };

  const BOARD_ROW_HEIGHT = 56;
  const MAX_VISIBLE      = 4;
  const listMaxHeight    = BOARD_ROW_HEIGHT * MAX_VISIBLE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-gray-900">Select Board</h2>
            <span className="text-xs text-gray-400 font-medium">
              {boards.length} {boards.length === 1 ? 'board' : 'boards'}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-4 px-5 py-2.5 bg-gray-50 border-b flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-3 h-3 rounded-full bg-red-500" />
            <span className="text-xs text-gray-500">To Do</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-3 h-3 rounded-full bg-yellow-400" />
            <span className="text-xs text-gray-500">In Progress / Validating</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex w-3 h-3 rounded-full bg-green-500" />
            <span className="text-xs text-gray-500">Completed</span>
          </div>
        </div>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: `${listMaxHeight}px`, scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}
        >
          <style>{`
            .board-picker-list::-webkit-scrollbar { width: 6px; }
            .board-picker-list::-webkit-scrollbar-track { background: transparent; }
            .board-picker-list::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
            .board-picker-list::-webkit-scrollbar-thumb:hover { background: #9ca3af; }
          `}</style>

          {boards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <LayoutGrid className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No boards available</p>
            </div>
          ) : (
            <ul className="board-picker-list divide-y divide-gray-100">
              {boards.map((board) => {
                const isSelected = selectedBoard?.id === board.id;
                const badges     = getBadges(board.id);
                const hasBadge   = badges.todo > 0 || badges.active > 0 || badges.completed > 0;
                return (
                  <li key={board.id} style={{ minHeight: `${BOARD_ROW_HEIGHT}px` }}>
                    <button
                      type="button"
                      onClick={() => { onSelectBoard(board); onClose(); }}
                      className={`w-full h-full flex items-center justify-between px-5 py-4 text-left transition-colors ${
                        isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-blue-600' : 'bg-gray-300'}`} />
                        <span className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                          {board.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
                        {badges.todo > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                            {badges.todo > 99 ? '99+' : badges.todo}
                          </span>
                        )}
                        {badges.active > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-yellow-400 text-white text-xs font-bold">
                            {badges.active > 99 ? '99+' : badges.active}
                          </span>
                        )}
                        {badges.completed > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold">
                            {badges.completed > 99 ? '99+' : badges.completed}
                          </span>
                        )}
                        {!hasBadge && <span className="text-xs text-gray-400 italic">No tasks</span>}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {boards.length > MAX_VISIBLE && (
          <div className="flex-shrink-0 px-5 py-2 bg-gray-50 border-t text-center">
            <span className="text-xs text-gray-400">Scroll to see all {boards.length} boards</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanBoard = () => {
  const [activeView, setActiveView]               = useState('dashboard');
  const [branches, setBranches]                   = useState([]);
  const [selectedBranch, setSelectedBranch]       = useState(null);
  const [boards, setBoards]                       = useState([]);
  const [selectedBoard, setSelectedBoard]         = useState(null);
  const [tasks, setTasks]                         = useState([]);
  const [boardTaskCounts, setBoardTaskCounts]     = useState({});
  const [allTasks, setAllTasks]                   = useState([]);
  const [allTasksLoading, setAllTasksLoading]     = useState(false);
  const [users, setUsers]                         = useState([]);
  const [currentUser, setCurrentUser]             = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen]     = useState(false);
  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [isAddBoardModalOpen, setIsAddBoardModalOpen]     = useState(false);
  const [isBoardPickerOpen, setIsBoardPickerOpen] = useState(false);
  const [selectedTask, setSelectedTask]           = useState(null);
  const [editingTask, setEditingTask]             = useState(null);
  const [newTaskStatus, setNewTaskStatus]         = useState('todo');
  const [loading, setLoading]                     = useState(true);
  const [saving, setSaving]                       = useState(false);
  const [isMobile, setIsMobile]                   = useState(window.innerWidth < 768);
  const [selectedStaff, setSelectedStaff]         = useState(null);
  const [showStaffList, setShowStaffList]         = useState(false);

  const { loading: securityLoading } = usePageSecurity(
    (user) => user?.role === 'admin' || user?.role === 'staff'
  );
  const { checkStaleTasks } = useStaleTaskChecker(currentUser, true, 60);

  const allTasksRef      = useRef(allTasks);
  const currentUserRef   = useRef(currentUser);
  const selectedBoardRef = useRef(selectedBoard);
  const selectedBranchRef= useRef(selectedBranch);
  const boardsRef        = useRef(boards);

  useEffect(() => { allTasksRef.current      = allTasks;       }, [allTasks]);
  useEffect(() => { currentUserRef.current   = currentUser;    }, [currentUser]);
  useEffect(() => { selectedBoardRef.current = selectedBoard;  }, [selectedBoard]);
  useEffect(() => { selectedBranchRef.current= selectedBranch; }, [selectedBranch]);
  useEffect(() => { boardsRef.current        = boards;         }, [boards]);

  const getBranchesKey    = (userId)   => `cache_branches_${userId}`;
  const getStaffUsersKey  = ()         => `cache_staff_users`;
  const getAllTasksKey     = (userId)   => `cache_all_tasks_${userId}`;
  const getBoardTasksKey  = (boardId)  => `cache_board_tasks_${boardId}`;
  const getBoardCountsKey = (branchId) => `cache_board_counts_${branchId}`;

  const columns = [
    { id: 'todo',       title: 'To Do' },
    { id: 'in-progress',title: 'In Progress' },
    { id: 'validating', title: 'Validating' },
    { id: 'completed',  title: 'Completed' }
  ];

 
  useEffect(() => {
    if (!currentUser) return;

    const handleTaskChange = async () => {
      const user  = currentUserRef.current;
      const board = selectedBoardRef.current;
      const branch= selectedBranchRef.current;
      const bList = boardsRef.current;

      if (!user) return;

      cacheInvalidate(getAllTasksKey(user.id));
      await loadAllTasksWithUser(user, true);

      if (board) {
        cacheInvalidate(getBoardTasksKey(board.id));
        await loadTasksForBoard(board.id, true, user);
        if (branch && bList.length > 0) {
          cacheInvalidate(getBoardCountsKey(branch.id));
          await loadAllBoardCountsForList(bList, true);
        }
      }
    };

    const channel = supabase
      .channel('kanban-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' },
        handleTaskChange
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_assignments' },
        handleTaskChange
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]); 


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!securityLoading) loadInitialData();
  }, [securityLoading]);

  useEffect(() => {
    if (selectedBoard) {
      loadTasksForBoard(selectedBoard.id, false, currentUser);
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
      setBoardTaskCounts({});
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (
      (activeView === 'dashboard' || activeView === 'companies') &&
      currentUser &&
      !allTasksLoading &&
      allTasks.length === 0
    ) {
      loadAllTasksWithUser(currentUser, false);
    }
  }, [activeView, currentUser]);

  useEffect(() => {
    if (!selectedBoard) return;
    const counts = {};
    tasks.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
    setBoardTaskCounts(prev => ({ ...prev, [selectedBoard.id]: counts }));
  }, [tasks, selectedBoard]);

  useEffect(() => {
    if (boards.length > 0) loadAllBoardCountsForList(boards);
  }, [boards]);


  const loadAllBoardCountsForList = async (boardList, forceRefresh = false) => {
    if (!boardList || boardList.length === 0) return;
    const branchId = boardList[0]?.branch_id;
    const cacheKey = getBoardCountsKey(branchId);

    if (!forceRefresh) {
      const cached = cacheGet(cacheKey);
      if (cached) { setBoardTaskCounts(cached); return; }
    }

    try {
      const boardIds = boardList.map(b => b.id);
      const { data, error } = await supabase
        .from('tasks').select('board_id, status').in('board_id', boardIds);
      if (error) throw error;

      const counts = {};
      (data || []).forEach(task => {
        if (!counts[task.board_id]) counts[task.board_id] = {};
        counts[task.board_id][task.status] = (counts[task.board_id][task.status] || 0) + 1;
      });
      cacheSet(cacheKey, counts, 2 * 60 * 1000);
      setBoardTaskCounts(counts);
    } catch (err) {
      console.error('Error loading board counts:', err);
    }
  };

  const loadAllBoardCounts = loadAllBoardCountsForList;


  const loadInitialData = async () => {
    try {
      setLoading(true);
      const userProfile = await getCurrentUserProfile();
      setCurrentUser(userProfile);
      currentUserRef.current = userProfile; 

      const branchesKey = getBranchesKey(userProfile.id);
      let branchesData = cacheGet(branchesKey);
      if (!branchesData) {
        branchesData = userProfile?.role === 'admin'
          ? await loadBranches()
          : await loadStaffBranches(userProfile.id);
        cacheSet(branchesKey, branchesData);
      }

      const staffUsersKey = getStaffUsersKey();
      let staffUsers = cacheGet(staffUsersKey);
      if (!staffUsers) {
        staffUsers = await loadStaffUsers();
        cacheSet(staffUsersKey, staffUsers);
      }

      setBranches(branchesData);
      setUsers(staffUsers);


      loadAllTasksWithUser(userProfile, false);

    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBranches = async () => {
    const { data, error } = await supabase
      .from('branches').select('*').order('created_at', { ascending: true });
    if (error) { console.error('Error loading branches:', error); return []; }
    return data || [];
  };

  const loadStaffBranches = async (userId) => {
    try {
      const { data: assignedTaskIds, error: assignError } = await supabase
        .from('task_assignments').select('task_id').eq('user_id', userId);
      if (assignError) console.error('Error loading staff task assignments:', assignError);

      const { data: legacyTasks, error: legacyError } = await supabase
        .from('tasks').select('branch_id, branches(id, name, description, location)').eq('assigned_to', userId);
      if (legacyError) console.error('Error loading legacy assigned tasks:', legacyError);

      const taskIds = (assignedTaskIds || []).map(a => a.task_id);
      let junctionTasks = [];
      if (taskIds.length > 0) {
        const { data, error } = await supabase
          .from('tasks').select('branch_id, branches(id, name, description, location)').in('id', taskIds);
        if (error) console.error('Error loading branches for staff tasks:', error);
        else junctionTasks = data || [];
      }

      const branchMap = new Map();
      [...(legacyTasks || []), ...junctionTasks].forEach(task => {
        if (task.branches && !branchMap.has(task.branches.id))
          branchMap.set(task.branches.id, task.branches);
      });
      return Array.from(branchMap.values());
    } catch (err) {
      console.error('Error in loadStaffBranches:', err);
      return [];
    }
  };

  const loadBoards = async (branchId) => {
    const { data, error } = await supabase
      .from('boards').select('*').eq('branch_id', branchId).order('created_at', { ascending: true });
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
      .from('users').select('id, full_name, role, email').eq('role', 'staff').eq('status', 'approved');
    if (error) { console.error('Error loading staff:', error); return []; }
    return data || [];
  };

  const loadAllTasksWithUser = async (userProfile, forceRefresh = false) => {
    if (!userProfile) return [];
    const cacheKey = getAllTasksKey(userProfile.id);
    if (!forceRefresh) {
      const cached = cacheGet(cacheKey);
      if (cached) { setAllTasks(cached); return cached; }
    }

    try {
      setAllTasksLoading(true);
      const isAdmin = userProfile?.role === 'admin';
      let tasksData = [];

      if (isAdmin) {
        const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        tasksData = data || [];
      } else {
        const { data: assignedTaskIds, error: assignError } = await supabase
          .from('task_assignments').select('task_id').eq('user_id', userProfile.id);
        if (assignError) throw assignError;
        const taskIds = (assignedTaskIds || []).map(a => a.task_id);

        const { data: legacyTasksData, error: legacyError } = await supabase
          .from('tasks').select('*').eq('assigned_to', userProfile.id).order('created_at', { ascending: false });
        if (legacyError) throw legacyError;

        let junctionTasksData = [];
        if (taskIds.length > 0) {
          const { data, error } = await supabase
            .from('tasks').select('*').in('id', taskIds).order('created_at', { ascending: false });
          if (error) throw error;
          junctionTasksData = data || [];
        }

        const allRaw = [...(legacyTasksData || []), ...junctionTasksData];
        const seen = new Set();
        tasksData = allRaw.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
      }

      if (!tasksData || tasksData.length === 0) {
        setAllTasks([]); cacheSet(cacheKey, []); return [];
      }

      const taskIds = tasksData.map(t => t.id);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments').select('task_id, user_id, assigned_at, assigned_by').in('task_id', taskIds);
      if (assignmentsError) console.error('Error loading assignments:', assignmentsError);

      const userIds = [...new Set([
        ...(assignmentsData || []).map(a => a.user_id),
        ...tasksData.map(t => t.created_by).filter(Boolean)
      ])];

      const { data: usersData, error: usersError } = await supabase
        .from('users').select('id, full_name, email, role').in('id', userIds);
      if (usersError) throw usersError;

      const userMap = {};
      (usersData || []).forEach(user => { userMap[user.id] = user; });

      const assignmentsByTask = {};
      (assignmentsData || []).forEach(assignment => {
        if (!assignmentsByTask[assignment.task_id]) assignmentsByTask[assignment.task_id] = [];
        const user = userMap[assignment.user_id];
        if (user) assignmentsByTask[assignment.task_id].push({
          id: user.id, full_name: user.full_name, email: user.email, role: user.role,
          assigned_at: assignment.assigned_at, assigned_by: assignment.assigned_by
        });
      });

      const { data: commentsData, error: commentsError } = await supabase
        .from('task_comments').select('id, task_id, comment, created_at, user_id, read_by')
        .in('task_id', taskIds).order('created_at', { ascending: true });
      if (commentsError) console.error('Error loading comments:', commentsError);

      const commentUserIds = [...new Set((commentsData || []).map(c => c.user_id))];
      const commentUserIdsToFetch = commentUserIds.filter(id => !userMap[id]);
      if (commentUserIdsToFetch.length > 0) {
        const { data: commentUsersData } = await supabase
          .from('users').select('id, full_name').in('id', commentUserIdsToFetch);
        (commentUsersData || []).forEach(user => { userMap[user.id] = user; });
      }

      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) commentsByTask[comment.task_id] = [];
        commentsByTask[comment.task_id].push({
          id: comment.id, task_id: comment.task_id, content: comment.comment,
          created_at: comment.created_at, created_by: comment.user_id, read_by: comment.read_by || [],
          user: { id: comment.user_id, name: userMap[comment.user_id]?.full_name || 'Unknown User' }
        });
      });

      const result = tasksData.map(task => {
        const assignedUsers = assignmentsByTask[task.id] || [];
        return {
          ...task,
          assigned_users: assignedUsers,
          assigned_user: assignedUsers.length > 0 ? { id: assignedUsers[0].id, name: assignedUsers[0].full_name } : null,
          assigned_to: assignedUsers.length > 0 ? assignedUsers[0].id : task.assigned_to,
          created_user: task.created_by ? { id: task.created_by, name: userMap[task.created_by]?.full_name || 'Unknown' } : null,
          comments: commentsByTask[task.id] || []
        };
      });

      cacheSet(cacheKey, result);
      setAllTasks(result);
      return result;
    } catch (err) {
      console.error('Error loading all tasks:', err);
      setAllTasks([]);
      return [];
    } finally {
      setAllTasksLoading(false);
    }
  };

  const loadAllTasks = (userProfile, forceRefresh = false) =>
    loadAllTasksWithUser(userProfile || currentUserRef.current, forceRefresh);

  const loadTasksForBoard = async (boardId, forceRefresh = false, userProfile = null) => {
    const user = userProfile || currentUserRef.current;
    if (!user) return;

    const cacheKey = getBoardTasksKey(boardId);
    if (!forceRefresh) {
      const cached = cacheGet(cacheKey);
      if (cached) { setTasks(cached); return; }
    }

    try {
      const isAdmin = user?.role === 'admin';

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks').select('*').eq('board_id', boardId).order('created_at', { ascending: false });
      if (tasksError) throw tasksError;
      if (!tasksData || tasksData.length === 0) { setTasks([]); cacheSet(cacheKey, []); return; }

      const taskIds = tasksData.map(t => t.id);

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('task_assignments').select('task_id, user_id, assigned_at, assigned_by').in('task_id', taskIds);
      if (assignmentsError) console.error('Error loading assignments:', assignmentsError);

      const userIds = [...new Set((assignmentsData || []).map(a => a.user_id))];
      let usersData = [];
      if (userIds.length > 0) {
        const { data, error: usersError } = await supabase
          .from('users').select('id, full_name, email, role').in('id', userIds);
        if (usersError) console.error('Error loading users:', usersError);
        else usersData = data || [];
      }

      const userMap = {};
      usersData.forEach(u => { userMap[u.id] = u; });

      const assignmentsByTask = {};
      (assignmentsData || []).forEach(assignment => {
        if (!assignmentsByTask[assignment.task_id]) assignmentsByTask[assignment.task_id] = [];
        const u = userMap[assignment.user_id];
        if (u) assignmentsByTask[assignment.task_id].push({
          id: u.id, full_name: u.full_name, email: u.email, role: u.role,
          assigned_at: assignment.assigned_at, assigned_by: assignment.assigned_by
        });
      });

      const { data: commentsData } = await supabase
        .from('task_comments').select('id, task_id, comment, created_at, user_id, read_by')
        .in('task_id', taskIds).order('created_at', { ascending: true });

      const commentUserIds = [...new Set((commentsData || []).map(c => c.user_id))];
      const { data: commentUsersData } = await supabase
        .from('users').select('id, full_name').in('id', commentUserIds);

      const commentUserMap = {};
      (commentUsersData || []).forEach(u => { commentUserMap[u.id] = u.full_name; });

      const commentsByTask = {};
      (commentsData || []).forEach(comment => {
        if (!commentsByTask[comment.task_id]) commentsByTask[comment.task_id] = [];
        commentsByTask[comment.task_id].push({
          id: comment.id, task_id: comment.task_id, content: comment.comment,
          created_at: comment.created_at, created_by: comment.user_id, read_by: comment.read_by || [],
          user: { id: comment.user_id, name: commentUserMap[comment.user_id] || 'Unknown User' }
        });
      });

      const formattedTasks = tasksData.map(task => {
        const assignedUsers = assignmentsByTask[task.id] || [];
        return {
          ...task,
          assigned_users: assignedUsers,
          assigned_user: assignedUsers.length > 0 ? { id: assignedUsers[0].id, name: assignedUsers[0].full_name } : null,
          comments: commentsByTask[task.id] || []
        };
      });

      const filteredTasks = isAdmin
        ? formattedTasks
        : formattedTasks.filter(task =>
            task.assigned_users.some(u => u.id === user.id) || task.assigned_to === user.id
          );

      cacheSet(cacheKey, filteredTasks);
      setTasks(filteredTasks);
    } catch (err) {
      console.error('Error loading tasks:', err);
      setTasks([]);
    }
  };

  const loadTasks = (boardId, forceRefresh = false) =>
    loadTasksForBoard(boardId, forceRefresh, currentUserRef.current);


  const refreshAllTasksIfLoaded = async (userProfile) => {
    cacheInvalidate(getAllTasksKey(userProfile.id));
    await loadAllTasksWithUser(userProfile, true);
  };

  const refreshBoardTasks = async (boardId) => {
    cacheInvalidate(getBoardTasksKey(boardId));
    await loadTasksForBoard(boardId, true, currentUserRef.current);
    if (selectedBranch) {
      cacheInvalidate(getBoardCountsKey(selectedBranch.id));
      await loadAllBoardCountsForList(boards, true);
    }
  };


  const handleAddBranch = async (branchData) => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert([{ ...branchData, manager_id: branchData.manager_id || null, created_by: currentUser.id }])
        .select().single();
      if (error) throw error;
      cacheInvalidate(getBranchesKey(currentUser.id));
      setBranches(prev => [...prev, data]);
      await refreshAllTasksIfLoaded(currentUser);
    } catch (err) {
      console.error('Error creating branch:', err);
      alert('Failed to create branch. Please try again.');
    }
  };

  const handleEditBranch = async (branchId, branchData) => {
    try {
      const { error } = await supabase.from('branches').update(branchData).eq('id', branchId);
      if (error) throw error;
      cacheInvalidate(getBranchesKey(currentUser.id));
      setBranches(prev => prev.map(b => b.id === branchId ? { ...b, ...branchData } : b));
      if (selectedBranch?.id === branchId) setSelectedBranch(prev => ({ ...prev, ...branchData }));
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
      cacheInvalidate(getBranchesKey(currentUser.id));
      setBranches(prev => prev.filter(b => b.id !== branchId));
      if (selectedBranch?.id === branchId) { setSelectedBranch(null); setActiveView('dashboard'); }
      await refreshAllTasksIfLoaded(currentUser);
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
        .select().single();
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

  const assignUserToTask = async (taskId, userId) => {
    const { error } = await supabase
      .from('task_assignments')
      .insert([{
        task_id:     taskId,
        user_id:     userId,
        assigned_by: currentUser.id,
        assigned_at: new Date().toISOString()
      }]);
    if (error) {
      if (error.code === '23505') {
        //
      } else {
        console.error('[Assign] Insert error for user', userId, ':', error);
      }
    } else {
      //
    }
  };


  const handleSubmitTask = async (taskData) => {
    if (!selectedBoard || !selectedBranch) { alert('Please select a branch and board first.'); return; }

    try {
      setSaving(true);

      if (editingTask) {
        const { error: updateError } = await supabase.from('tasks').update({
          title:       taskData.title,
          description: taskData.description,
          status:      taskData.status,
          priority:    taskData.priority,
          due_date:    taskData.due_date,
          updated_by:  currentUser.id,
          assigned_to: taskData.assigned_to?.length > 0 ? taskData.assigned_to[0] : null
        }).eq('id', editingTask.id);
        if (updateError) throw updateError;

        if (taskData.assigned_to && Array.isArray(taskData.assigned_to)) {
          const { data: currentAssignments } = await supabase
            .from('task_assignments').select('user_id').eq('task_id', editingTask.id);

          const currentUserIds = (currentAssignments || []).map(a => a.user_id);
          const newUserIds     = taskData.assigned_to;
          const usersToAdd     = newUserIds.filter(id => !currentUserIds.includes(id));
          const usersToRemove  = currentUserIds.filter(id => !newUserIds.includes(id));

          if (usersToRemove.length > 0) {
            await supabase.from('task_assignments').delete()
              .eq('task_id', editingTask.id).in('user_id', usersToRemove);
          }
          if (usersToAdd.length > 0) {
            await Promise.all(usersToAdd.map(userId => assignUserToTask(editingTask.id, userId)));
            for (const userId of usersToAdd) {
              await notifyTaskAssigned(editingTask.id, userId, currentUser.id);
            }
          }
        } else {
          await supabase.from('task_assignments').delete().eq('task_id', editingTask.id);
        }

      } else {
        const { data: newTask, error: createError } = await supabase.from('tasks').insert([{
          title:       taskData.title,
          description: taskData.description,
          status:      taskData.status || 'todo',
          priority:    taskData.priority,
          due_date:    taskData.due_date,
          board_id:    selectedBoard.id,
          branch_id:   selectedBranch.id,
          created_by:  currentUser.id,
          updated_by:  currentUser.id,
          assigned_to: taskData.assigned_to?.length > 0 ? taskData.assigned_to[0] : null
        }]).select().single();
        if (createError) throw createError;

        if (taskData.assigned_to?.length > 0) {
          await Promise.all(taskData.assigned_to.map(userId => assignUserToTask(newTask.id, userId)));
          for (const userId of taskData.assigned_to) {
            await notifyTaskAssigned(newTask.id, userId, currentUser.id);
          }
        }
      }

      setIsTaskModalOpen(false);
      setEditingTask(null);
      await refreshBoardTasks(selectedBoard.id);
      await refreshAllTasksIfLoaded(currentUser);

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
        const { data: currentTask } = await supabase.from('tasks').select('started_at').eq('id', taskId).single();
        if (!currentTask?.started_at) updateData.started_at = now;
      } else if (newStatus === 'validating') {
        updateData.validating_at = now;
      } else if (newStatus === 'completed') {
        updateData.completed_at = now;
      }

      const { error } = await supabase.from('tasks').update(updateData).eq('id', taskId);
      if (error) throw error;

      await refreshBoardTasks(selectedBoard.id);
      await refreshAllTasksIfLoaded(currentUser);
    } catch (err) {
      console.error('Error moving task:', err);
      alert('Failed to move task. Please try again.');
    }
  };

  const handleTaskClick   = (task) => { setSelectedTask(task); setIsTaskDetailModalOpen(true); };
  const handleTaskUpdate  = async () => { if (selectedBoard) await refreshBoardTasks(selectedBoard.id); await refreshAllTasksIfLoaded(currentUser); };
  const handleTaskConfirm = async () => { await refreshAllTasksIfLoaded(currentUser); if (selectedBoard) await refreshBoardTasks(selectedBoard.id); };
  const handleRefresh     = async () => { cacheInvalidate(getAllTasksKey(currentUser.id)); await loadAllTasksWithUser(currentUser, true); };

  const handleMarkCommentsAsRead = async (taskId) => {
    try {
      const { data: comments, error: fetchError } = await supabase
        .from('task_comments').select('id, read_by').eq('task_id', taskId);
      if (fetchError) throw fetchError;
      if (!comments || comments.length === 0) return;
      const updates = comments.map(comment => {
        const readBy = comment.read_by || [];
        if (!readBy.includes(currentUser.id)) readBy.push(currentUser.id);
        return supabase.from('task_comments').update({ read_by: readBy }).eq('id', comment.id);
      });
      await Promise.all(updates);
      await refreshAllTasksIfLoaded(currentUser);
    } catch (err) {
      console.error('Error marking comments as read:', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (notification.type === 'navigate_to_review') { setActiveView('review'); return; }
    if (notification.task_id) {
      const { data: taskData, error } = await supabase
        .from('tasks').select('*').eq('id', notification.task_id).single();
      if (!error && taskData) {
        const { data: assignmentsData } = await supabase
          .from('task_assignments').select('task_id, user_id, assigned_at, assigned_by')
          .eq('task_id', taskData.id);

        const allUserIds = [
          ...new Set([
            ...((assignmentsData || []).map(a => a.user_id)),
            taskData.assigned_to,
            taskData.created_by
          ].filter(Boolean))
        ];

        const { data: usersData } = await supabase
          .from('users').select('id, full_name, email, role').in('id', allUserIds);
        const userMap = {};
        (usersData || []).forEach(u => { userMap[u.id] = u; });

        const assignedUsers = (assignmentsData || [])
          .map(a => userMap[a.user_id])
          .filter(Boolean)
          .map(u => ({ id: u.id, full_name: u.full_name, email: u.email, role: u.role }));

        if (assignedUsers.length === 0 && taskData.assigned_to && userMap[taskData.assigned_to]) {
          const u = userMap[taskData.assigned_to];
          assignedUsers.push({ id: u.id, full_name: u.full_name, email: u.email, role: u.role });
        }

        const { data: commentsData } = await supabase.from('task_comments').select('*')
          .eq('task_id', taskData.id).order('created_at', { ascending: true });
        const formattedComments = (commentsData || []).map(comment => ({
          id: comment.id, task_id: comment.task_id, content: comment.comment,
          created_at: comment.created_at, created_by: comment.user_id, read_by: comment.read_by || [],
          user: { id: comment.user_id, name: userMap[comment.user_id]?.full_name || 'Unknown User' }
        }));

        handleTaskClick({
          ...taskData,
          assigned_users: assignedUsers,
          assigned_user: assignedUsers.length > 0
            ? { id: assignedUsers[0].id, name: assignedUsers[0].full_name }
            : null,
          created_user: taskData.created_by && userMap[taskData.created_by]
            ? { id: taskData.created_by, name: userMap[taskData.created_by].full_name }
            : null,
          comments: formattedComments
        });
      }
    }
  };


  const handleStaffSelect     = (staff) => setSelectedStaff(staff);
  const handleStaffListToggle = () => { setShowStaffList(!showStaffList); setSelectedStaff(null); setActiveView('staff'); };
  const getTasksByStatus      = (status) => tasks.filter(task => task.status === status);

  const activeCounts    = selectedBoard ? (boardTaskCounts[selectedBoard.id] || {}) : {};
  const headerTodo      = activeCounts['todo'] || 0;
  const headerActive    = (activeCounts['in-progress'] || 0) + (activeCounts['validating'] || 0);
  const headerCompleted = activeCounts['completed'] || 0;

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

  const renderDashboardLoader = () => (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-500 text-sm">Loading tasks...</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <LeftSidebar
        activeView={activeView}
        onViewChange={(view) => { setActiveView(view); setShowStaffList(false); setSelectedStaff(null); }}
        branches={branches}
        currentUser={currentUser}
        onSelectBranch={handleSelectBranch}
        onStaffListClick={isAdmin ? handleStaffListToggle : null}
      />

      {isAdmin && showStaffList && (
        <StaffList onStaffSelect={handleStaffSelect} selectedStaffId={selectedStaff?.id} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="bg-white border-b px-6 py-3 flex items-center justify-end"
          style={{ position: isMobile ? 'sticky' : 'relative', top: 0, zIndex: 30, flexShrink: 0 }}
        >
          <Notifications currentUser={currentUser} onNotificationClick={handleNotificationClick} />
        </div>

        <div className="flex-1 overflow-hidden flex" style={{ overflowY: 'auto' }}>

          {activeView === 'dashboard' && (
            <>
              {isAdmin
                ? allTasksLoading
                  ? renderDashboardLoader()
                  : <Dashboard
                      branches={branches} tasks={allTasks} users={users} currentUser={currentUser}
                      onAddBranch={handleAddBranch} onSelectBranch={handleSelectBranch}
                      onMarkCommentsAsRead={handleMarkCommentsAsRead} onTasksRefresh={handleRefresh}
                    />
                : allTasksLoading
                  ? renderDashboardLoader()
                  : <StaffDashboard tasks={allTasks} currentUser={currentUser} onTaskClick={handleTaskClick} />
              }
            </>
          )}

          {isAdmin && activeView === 'companies' && (
            allTasksLoading
              ? renderDashboardLoader()
              : <CompanyList
                  branches={branches} tasks={allTasks} currentUser={currentUser}
                  onSelectBranch={handleSelectBranch} onEditBranch={handleEditBranch} onDeleteBranch={handleDeleteBranch}
                />
          )}

          {isAdmin && activeView === 'review' && (
            <ToReviewView currentUser={currentUser} onTaskConfirm={handleTaskConfirm} onRefresh={handleRefresh} />
          )}

          {activeView === 'history' && (
            <HistoryView currentUser={currentUser} isAdmin={isAdmin} />
          )}

          {isAdmin && activeView === 'staff' && selectedStaff && (
            <StaffTasksView staff={selectedStaff} onTaskClick={handleTaskClick} onBack={() => setSelectedStaff(null)} />
          )}

          {activeView === 'board' && selectedBranch && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="bg-white border-b px-3 sm:px-6 py-3 sm:py-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
                    <button
                      onClick={() => { setActiveView('dashboard'); setSelectedBranch(null); }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      <ArrowLeft className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <Layers className="w-5 sm:w-6 h-5 sm:h-6 text-blue-600 flex-shrink-0" />
                        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{selectedBranch.name}</h1>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">Kanban Boards</p>
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
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b px-3 sm:px-6 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:block flex-shrink-0">Board</span>
                    <button
                      type="button"
                      onClick={() => setIsBoardPickerOpen(true)}
                      className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 bg-white border border-gray-200 hover:border-blue-400 hover:shadow-sm rounded-xl px-3 sm:px-4 py-2.5 transition-all group"
                    >
                      <LayoutGrid className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700 flex-1 text-left">
                        {selectedBoard?.name || 'Select a board'}
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {headerTodo > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                            {headerTodo > 99 ? '99+' : headerTodo}
                          </span>
                        )}
                        {headerActive > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-400 text-white text-xs font-bold">
                            {headerActive > 99 ? '99+' : headerActive}
                          </span>
                        )}
                        {headerCompleted > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-bold">
                            {headerCompleted > 99 ? '99+' : headerCompleted}
                          </span>
                        )}
                        <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 ml-0.5 transition-colors" />
                      </div>
                    </button>
                    <span className="flex-shrink-0 text-xs text-gray-400 font-medium hidden sm:block">
                      {boards.length} {boards.length === 1 ? 'board' : 'boards'}
                    </span>
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
                      {isAdmin ? 'Create a board to start organizing tasks for this branch.' : 'No boards available yet for this branch.'}
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
                        onAddTask={(status) => { setNewTaskStatus(status); setEditingTask(null); setIsTaskModalOpen(true); }}
                        onEditTask={(task) => { setEditingTask(task); setIsTaskModalOpen(true); }}
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

      <BoardPickerModal
        isOpen={isBoardPickerOpen}
        onClose={() => setIsBoardPickerOpen(false)}
        boards={boards}
        selectedBoard={selectedBoard}
        onSelectBoard={(board) => setSelectedBoard(board)}
        boardTaskCounts={boardTaskCounts}
      />

      {isAdmin && (
        <>
          <TaskModal
            isOpen={isTaskModalOpen}
            onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); }}
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
        onClose={() => { setIsTaskDetailModalOpen(false); setSelectedTask(null); }}
        task={selectedTask}
        currentUser={currentUser}
        onTaskUpdate={handleTaskUpdate}
        onNavigateToBoard={(task) => {
          const targetBoard = boards.find(b => b.id === task.board_id);
          const targetBranch = branches.find(b => b.id === task.branch_id);
          if (targetBranch) {
            setSelectedBranch(targetBranch);
            setActiveView('board');
          }
          if (targetBoard) {
            setSelectedBoard(targetBoard);
          }
          setIsTaskDetailModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
};

export default KanbanBoard;