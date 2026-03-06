import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  CheckCircle2, Clock, AlertCircle, Calendar, TrendingUp, ListChecks, Target
} from 'lucide-react';

const StaffDashboard = ({ tasks = [], currentUser, onTaskClick }) => {
  const [localTasks, setLocalTasks] = useState(tasks);
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  const fetchMyTasks = useCallback(async () => {
    if (!currentUser?.id) return;
    if (fetchInProgress.current) return; 
    fetchInProgress.current = true;

    try {
      const { data: junctionRows } = await supabase
        .from('task_assignments')
        .select('task_id')
        .eq('user_id', currentUser.id);

      const junctionTaskIds = (junctionRows || []).map(r => r.task_id);

      const [legacyResult, junctionResult] = await Promise.all([
        supabase.from('tasks').select('*').eq('assigned_to', currentUser.id),
        junctionTaskIds.length > 0
          ? supabase.from('tasks').select('*').in('id', junctionTaskIds)
          : Promise.resolve({ data: [] })
      ]);

      const allRaw = [...(legacyResult.data || []), ...(junctionResult.data || [])];
      const seen = new Set();
      const deduped = allRaw.filter(t => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      if (!isMounted.current) return;

      setLocalTasks(deduped.map(t => ({
        ...t,
        assigned_users: t.assigned_users || [],
        comments: t.comments || []
      })));

      if (deduped.length === 0) return;

      const taskIds = deduped.map(t => t.id);

      const [assignmentsResult, commentsResult] = await Promise.all([
        supabase.from('task_assignments')
          .select('task_id, user_id, assigned_at, assigned_by')
          .in('task_id', taskIds),
        supabase.from('task_comments')
          .select('id, task_id, comment, created_at, user_id, read_by')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true })
      ]);

      if (!isMounted.current) return;

      const assignmentUserIds = [...new Set((assignmentsResult.data || []).map(a => a.user_id))];
      const commentUserIds    = [...new Set((commentsResult.data    || []).map(c => c.user_id))];
      const allUserIds        = [...new Set([...assignmentUserIds, ...commentUserIds])];

      let userMap = {};
      if (allUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users').select('id, full_name, email, role').in('id', allUserIds);
        (usersData || []).forEach(u => { userMap[u.id] = u; });
      }

      if (!isMounted.current) return;

      const assignmentsByTask = {};
      (assignmentsResult.data || []).forEach(a => {
        if (!assignmentsByTask[a.task_id]) assignmentsByTask[a.task_id] = [];
        const u = userMap[a.user_id];
        if (u) assignmentsByTask[a.task_id].push({
          id: u.id, full_name: u.full_name, email: u.email, role: u.role,
          assigned_at: a.assigned_at, assigned_by: a.assigned_by
        });
      });

      const commentsByTask = {};
      (commentsResult.data || []).forEach(c => {
        if (!commentsByTask[c.task_id]) commentsByTask[c.task_id] = [];
        commentsByTask[c.task_id].push({
          id: c.id, task_id: c.task_id, content: c.comment,
          created_at: c.created_at, created_by: c.user_id, read_by: c.read_by || [],
          user: { id: c.user_id, name: userMap[c.user_id]?.full_name || 'Unknown' }
        });
      });

      const enriched = deduped.map(task => {
        const assignedUsers = assignmentsByTask[task.id] || [];
        return {
          ...task,
          assigned_users: assignedUsers,
          assigned_user: assignedUsers[0]
            ? { id: assignedUsers[0].id, name: assignedUsers[0].full_name }
            : null,
          assigned_to: assignedUsers[0]?.id || task.assigned_to,
          comments: commentsByTask[task.id] || []
        };
      });

      if (!isMounted.current) return;
      setLocalTasks(enriched);

    } catch (err) {
      console.error('[StaffDashboard] fetchMyTasks error:', err);
    } finally {
      fetchInProgress.current = false;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    fetchMyTasks();
  }, [fetchMyTasks]);

  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`staff-rt-${currentUser.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => { fetchMyTasks(); }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignments',
          filter: `user_id=eq.${currentUser.id}` }, 
        () => { fetchMyTasks(); }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') fetchMyTasks();
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, fetchMyTasks]);

  const myTasks = localTasks.filter(t => {
    const inJunction = Array.isArray(t.assigned_users) &&
      t.assigned_users.some(u => u.id === currentUser?.id);
    const inLegacy = t.assigned_to === currentUser?.id;
    return inJunction || inLegacy;
  });

  const totalTasks      = myTasks.length;
  const completedTasks  = myTasks.filter(t => t.status === 'completed').length;
  const inProgressTasks = myTasks.filter(t => t.status === 'in-progress').length;
  const todoTasks       = myTasks.filter(t => t.status === 'todo').length;
  const validatingTasks = myTasks.filter(t => t.status === 'validating').length;
  const completionRate  = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const tasksByStatus = {
    todo:          myTasks.filter(t => t.status === 'todo'),
    'in-progress': myTasks.filter(t => t.status === 'in-progress'),
    validating:    myTasks.filter(t => t.status === 'validating'),
    completed:     myTasks.filter(t => t.status === 'completed')
  };

  const overdueTasks = myTasks.filter(t =>
    t.due_date && new Date(t.due_date) < new Date() && t.status !== 'completed'
  );

  const upcomingTasks = myTasks.filter(t => {
    if (!t.due_date || t.status === 'completed') return false;
    const due = new Date(t.due_date);
    const now = new Date();
    return due > now && due <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  });

  const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <Icon className={`w-5 h-5 ${color}`} strokeWidth={2} />
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm font-medium text-gray-900">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  const TaskCard = ({ task }) => {
    const getPriorityColor = (p) => {
      if (p === 'high')   return 'text-red-600 bg-red-50 border-red-200';
      if (p === 'medium') return 'text-amber-600 bg-amber-50 border-amber-200';
      if (p === 'low')    return 'text-green-600 bg-green-50 border-green-200';
      return 'text-gray-600 bg-gray-50 border-gray-200';
    };
    const getStatusColor = (s) => {
      if (s === 'completed')   return 'text-green-700 bg-green-50';
      if (s === 'in-progress') return 'text-blue-700 bg-blue-50';
      if (s === 'validating')  return 'text-purple-700 bg-purple-50';
      return 'text-gray-700 bg-gray-50';
    };
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
    const formatDate = (d) => d
      ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;

    return (
      <div
        onClick={() => onTaskClick(task)}
        className="bg-white p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer group"
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900 flex-1 pr-2 group-hover:text-blue-600 transition-colors line-clamp-2">
            {task.title}
          </h3>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status.replace('-', ' ')}
          </span>
          {task.priority && (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          )}
          {task.due_date && (
            <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              <Calendar className="w-3 h-3" />
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {currentUser?.full_name}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <section>
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard icon={ListChecks}   label="Total"       value={totalTasks}      color="text-gray-700" />
            <StatCard icon={CheckCircle2} label="Completed"   value={completedTasks}  color="text-green-600" subtitle={`${completionRate}%`} />
            <StatCard icon={Clock}        label="In Progress" value={inProgressTasks} color="text-blue-600" />
            <StatCard icon={Target}       label="To Do"       value={todoTasks}       color="text-gray-600" />
          </div>
        </section>

        <section className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-700" />
              <h3 className="text-base font-semibold text-gray-900">Overall Progress</h3>
            </div>
            <span className="text-2xl font-bold text-blue-600">{completionRate}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-blue-600 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }} />
          </div>
          <div className="grid grid-cols-4 gap-2 sm:gap-4 mt-4 text-center text-xs sm:text-sm">
            <div><p className="text-gray-600">To Do</p>    <p className="text-lg sm:text-xl font-bold text-gray-900">{todoTasks}</p></div>
            <div><p className="text-gray-600">Active</p>   <p className="text-lg sm:text-xl font-bold text-blue-600">{inProgressTasks}</p></div>
            <div><p className="text-gray-600">Review</p>   <p className="text-lg sm:text-xl font-bold text-purple-600">{validatingTasks}</p></div>
            <div><p className="text-gray-600">Done</p>     <p className="text-lg sm:text-xl font-bold text-green-600">{completedTasks}</p></div>
          </div>
        </section>

        {(overdueTasks.length > 0 || upcomingTasks.length > 0) && (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {overdueTasks.length > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Overdue ({overdueTasks.length})</h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {overdueTasks.slice(0, 3).map(task => <TaskCard key={task.id} task={task} />)}
                  {overdueTasks.length > 3 && (
                    <p className="text-xs text-red-700 text-center py-2">+{overdueTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
            {upcomingTasks.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-amber-900">Due Soon ({upcomingTasks.length})</h3>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {upcomingTasks.slice(0, 3).map(task => <TaskCard key={task.id} task={task} />)}
                  {upcomingTasks.length > 3 && (
                    <p className="text-xs text-amber-700 text-center py-2">+{upcomingTasks.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">All Tasks</h2>
          {totalTasks === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
              <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No tasks assigned</p>
              <p className="text-gray-400 text-sm mt-1">Check back later for new assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasksByStatus.todo.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full" />
                    To Do ({tasksByStatus.todo.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus.todo.map(t => <TaskCard key={t.id} task={t} />)}
                  </div>
                </div>
              )}
              {tasksByStatus['in-progress'].length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    In Progress ({tasksByStatus['in-progress'].length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus['in-progress'].map(t => <TaskCard key={t.id} task={t} />)}
                  </div>
                </div>
              )}
              {tasksByStatus.validating.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full" />
                    Validating ({tasksByStatus.validating.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus.validating.map(t => <TaskCard key={t.id} task={t} />)}
                  </div>
                </div>
              )}
              {tasksByStatus.completed.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    Completed ({tasksByStatus.completed.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {tasksByStatus.completed.map(t => <TaskCard key={t.id} task={t} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default StaffDashboard;