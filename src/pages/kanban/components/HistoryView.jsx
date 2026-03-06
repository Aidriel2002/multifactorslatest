import { useState, useEffect, useMemo, useRef } from 'react';
import {
  History, Calendar, User, Building2, Layers,
  Search, Filter, Clock, CheckCircle2, RefreshCw,
  ChevronDown, ChevronUp, ArrowUpDown, Award, Timer,
  CalendarCheck, Hourglass, Users, Loader2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ─── Date / Time Helpers ─────────────────────────────────────────────────────

const formatDateTime = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return null; }
};

const formatDate = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch { return null; }
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    const diffMs = Date.now() - date.getTime();
    const mins   = Math.floor(diffMs / 60000);
    const hours  = Math.floor(diffMs / 3600000);
    const days   = Math.floor(diffMs / 86400000);
    const weeks  = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    if (mins  < 1)   return 'just now';
    if (mins  < 60)  return `${mins}m ago`;
    if (hours < 24)  return `${hours}h ago`;
    if (days  < 7)   return `${days}d ago`;
    if (weeks < 5)   return `${weeks}w ago`;
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  } catch { return null; }
};

const formatDuration = (interval) => {
  if (!interval) return null;
  try {
    const str = String(interval);
    const dayTime = str.match(/(\d+)\s+days?\s+(\d+):(\d+):(\d+)/);
    if (dayTime) {
      const [, d, h, m] = dayTime.map(Number);
      if (d > 0 && h > 0) return `${d}d ${h}h ${m}m`;
      if (d > 0) return `${d}d ${m}m`;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }
    const hms = str.match(/^(\d+):(\d+):(\d+)/);
    if (hms) {
      const [, h, m, s] = hms.map(Number);
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }
    const iso = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (iso) {
      const h = iso[1] ? +iso[1] : 0;
      const m = iso[2] ? +iso[2] : 0;
      if (h > 0) return `${h}h ${m}m`;
      return `${m}m`;
    }
    if (/^\d+$/.test(str.trim())) {
      const total = parseInt(str);
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }
  } catch (e) { console.error('formatDuration:', e); }
  return null;
};

const getLatestDate = (task) => {
  const candidates = [
    task.confirmed_at,
    task.completed_at,
    task.validating_at,
    task.in_progress_at,
    task.started_at,
    task.created_at,
  ].filter(Boolean).map(d => new Date(d).getTime()).filter(n => !isNaN(n));
  return candidates.length ? Math.max(...candidates) : 0;
};

const deriveStatus = (task) => {
  if (task.confirmed_at)   return 'confirmed';
  if (task.completed_at)   return 'completed';
  if (task.validating_at)  return 'validating';
  if (task.in_progress_at) return 'in-progress';
  if (task.started_at)     return 'started';
  return 'created';
};

const STATUS_META = {
  confirmed:    { label: 'Confirmed',    pill: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500' },
  completed:    { label: 'Completed',    pill: 'bg-green-100 text-green-700 border-green-200',       bar: 'bg-green-500' },
  validating:   { label: 'Validating',   pill: 'bg-violet-100 text-violet-700 border-violet-200',   bar: 'bg-violet-500' },
  'in-progress':{ label: 'In Progress',  pill: 'bg-blue-100 text-blue-700 border-blue-200',         bar: 'bg-blue-500' },
  started:      { label: 'Started',      pill: 'bg-sky-100 text-sky-700 border-sky-200',            bar: 'bg-sky-400' },
  created:      { label: 'Created',      pill: 'bg-gray-100 text-gray-600 border-gray-200',         bar: 'bg-gray-300' },
};

const PRIORITY_PILL = {
  high:   'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low:    'bg-emerald-100 text-emerald-700 border-emerald-200',
};

// ─── Deduplication ────────────────────────────────────────────────────────────

const deduplicateHistory = (rows) => {
  const map = new Map();

  rows.forEach(row => {
    const key = row.task_id;

    if (!map.has(key)) {
      map.set(key, {
        ...row,
        assignees: row.assigned_user_name ? [row.assigned_user_name] : [],
      });
      return;
    }

    const merged = map.get(key);

    if (row.assigned_user_name && !merged.assignees.includes(row.assigned_user_name)) {
      merged.assignees.push(row.assigned_user_name);
    }

    const dateFields = [
      'created_at', 'started_at', 'in_progress_at', 'validating_at',
      'completed_at', 'confirmed_at', 'archived_at', 'changed_at',
    ];
    dateFields.forEach(f => {
      if (row[f] && (!merged[f] || new Date(row[f]) > new Date(merged[f]))) {
        merged[f] = row[f];
      }
    });

    if (!merged.description        && row.description)        merged.description        = row.description;
    if (!merged.confirmed_user_name && row.confirmed_user_name) merged.confirmed_user_name = row.confirmed_user_name;
    if (!merged.created_user_name   && row.created_user_name)   merged.created_user_name   = row.created_user_name;
    if (!merged.total_time_taken    && row.total_time_taken)    merged.total_time_taken    = row.total_time_taken;
  });

  return Array.from(map.values());
};

// ─── Enrich history rows with assignments from task_assigned_users ────────────

const enrichWithAssignments = async (dedupedRows) => {
  if (!dedupedRows.length) return dedupedRows;

  const taskIds = dedupedRows.map(r => r.task_id).filter(Boolean);
  if (!taskIds.length) return dedupedRows;

  // Read assignments from the VIEW (same as KanbanBoard)
  const { data: assignmentsData, error: assignmentsError } = await supabase
    .from('task_assignments')
    .select('task_id, user_id, assigned_at, assigned_by')
    .in('task_id', taskIds);

  if (assignmentsError) {
    console.error('Error loading assignments for history:', assignmentsError);
    return dedupedRows;
  }

  const userIds = [...new Set((assignmentsData || []).map(a => a.user_id))];
  let userMap = {};

  if (userIds.length > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .in('id', userIds);

    if (usersError) {
      console.error('Error loading users for history assignments:', usersError);
    } else {
      (usersData || []).forEach(u => { userMap[u.id] = u; });
    }
  }

  // Build a map of task_id -> array of assignee names
  const assigneesByTask = {};
  (assignmentsData || []).forEach(a => {
    const user = userMap[a.user_id];
    if (!user) return;
    if (!assigneesByTask[a.task_id]) assigneesByTask[a.task_id] = [];
    if (!assigneesByTask[a.task_id].includes(user.full_name)) {
      assigneesByTask[a.task_id].push(user.full_name);
    }
  });

  // Merge into deduped rows — prefer live assignment data over task_history names
  return dedupedRows.map(row => {
    const liveAssignees = assigneesByTask[row.task_id];
    if (liveAssignees && liveAssignees.length > 0) {
      return { ...row, assignees: liveAssignees };
    }
    // Fall back to whatever deduplication already collected
    return row;
  });
};

// ─── Timeline Step ────────────────────────────────────────────────────────────

const TIMELINE_COLORS = {
  slate:   { border: 'border-slate-200 bg-slate-50',   dot: 'bg-slate-400',   text: 'text-slate-600' },
  blue:    { border: 'border-blue-200 bg-blue-50',     dot: 'bg-blue-500',    text: 'text-blue-700' },
  amber:   { border: 'border-amber-200 bg-amber-50',   dot: 'bg-amber-500',   text: 'text-amber-700' },
  violet:  { border: 'border-violet-200 bg-violet-50', dot: 'bg-violet-500',  text: 'text-violet-700' },
  emerald: { border: 'border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  green:   { border: 'border-green-200 bg-green-50',   dot: 'bg-green-600',   text: 'text-green-800' },
};

const TimelineStep = ({ label, time, active, detail, colorKey, isLast }) => {
  const c = TIMELINE_COLORS[colorKey] || TIMELINE_COLORS.slate;
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex flex-col items-center flex-shrink-0 w-5">
        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 border-2 ${
          active ? `${c.dot} border-transparent` : 'bg-white border-gray-300'
        }`} />
        {!isLast && (
          <div className={`w-px mt-1 ${active ? 'bg-gray-300' : 'bg-gray-200'}`} style={{ minHeight: 16 }} />
        )}
      </div>

      <div className={`flex-1 mb-1 px-3 py-1.5 rounded-lg border text-xs ${
        active ? `${c.border} ${c.text}` : 'border-gray-100 bg-white text-gray-400'
      }`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-semibold">{label}</span>
          {active && time
            ? <span className="font-mono">{formatDateTime(time)}</span>
            : <span className="italic opacity-50">—</span>
          }
        </div>
        {detail && active && (
          <p className="opacity-75 mt-0.5">{detail}</p>
        )}
      </div>
    </div>
  );
};

// ─── History Card ─────────────────────────────────────────────────────────────

const HistoryTaskCard = ({ task }) => {
  const [expanded, setExpanded] = useState(false);
  const status = deriveStatus(task);
  const meta   = STATUS_META[status] || STATUS_META.created;
  const isLive = !task.confirmed_at;
  const duration = formatDuration(task.total_time_taken);
  const latestTs = new Date(getLatestDate(task)).toISOString();

  const steps = [
    { key: 'created',      label: 'Created',              time: task.created_at,     colorKey: 'slate',   detail: task.created_user_name ? `By ${task.created_user_name}` : null },
    { key: 'started',      label: 'Started',              time: task.started_at,     colorKey: 'blue' },
    { key: 'in_progress',  label: 'In Progress',          time: task.in_progress_at, colorKey: 'amber' },
    { key: 'validating',   label: 'Validating',           time: task.validating_at,  colorKey: 'violet' },
    { key: 'completed',    label: 'Completed',            time: task.completed_at,   colorKey: 'emerald' },
    { key: 'confirmed',    label: 'Confirmed & Archived', time: task.confirmed_at,   colorKey: 'green',   detail: task.confirmed_user_name ? `By ${task.confirmed_user_name}` : null },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className={`h-1 ${meta.bar}`} />

      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isLive ? 'bg-blue-100' : 'bg-emerald-100'
        }`}>
          {isLive
            ? <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 text-sm leading-snug pr-1">
              {task.title || 'Untitled Task'}
            </h3>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.priority && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${PRIORITY_PILL[task.priority] || ''}`}>
                  {task.priority}
                </span>
              )}
              {expanded
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            {task.branch_name && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Building2 className="w-3 h-3" />{task.branch_name}
              </span>
            )}
            {task.board_name && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Layers className="w-3 h-3" />{task.board_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-gray-100 bg-gray-50 divide-x divide-gray-100">
        <div className="px-3 py-2 min-w-0">
          <span className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
            {(task.assignees?.length || 0) > 1
              ? <><Users className="w-3 h-3" />Assigned Users</>
              : <><User className="w-3 h-3" />Assigned To</>
            }
          </span>
          {task.assignees?.length > 0
            ? task.assignees.map((name, i) => (
                <p key={i} className="text-xs font-semibold text-gray-800 truncate">{name}</p>
              ))
            : <p className="text-xs font-semibold text-gray-400">Unassigned</p>
          }
        </div>

        <div className="px-3 py-2 flex flex-col items-center justify-center gap-0.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${meta.pill}`}>
            {meta.label}
          </span>
          <span className="text-xs text-gray-400">{formatRelativeTime(latestTs)}</span>
        </div>

        <div className="px-3 py-2 flex flex-col items-center justify-center">
          <span className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
            <Timer className="w-3 h-3" />Duration
          </span>
          <span className="text-sm font-bold text-gray-800">{duration || '—'}</span>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">

          {task.description && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-gray-700 leading-relaxed">{task.description}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">People</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <InfoChip
                label={task.assignees?.length > 1 ? 'Assigned Users' : 'Assigned To'}
                icon={task.assignees?.length > 1 ? <Users className="w-3 h-3" /> : <User className="w-3 h-3" />}
              >
                {task.assignees?.length > 0
                  ? task.assignees.map((n, i) => (
                      <span key={i} className="block text-sm font-semibold text-gray-800">{n}</span>
                    ))
                  : <span className="text-sm font-semibold text-gray-400">Unassigned</span>
                }
              </InfoChip>
              <InfoChip label="Created By" icon={<User className="w-3 h-3" />}>
                <span className="text-sm font-semibold text-gray-800">{task.created_user_name || '—'}</span>
              </InfoChip>
              <InfoChip label="Confirmed By" icon={<Award className="w-3 h-3" />}>
                <span className="text-sm font-semibold text-gray-800">{task.confirmed_user_name || '—'}</span>
              </InfoChip>
            </div>
          </div>

          {task.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">Due:</span>
              <span className="text-sm font-semibold text-gray-800">{formatDate(task.due_date)}</span>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Timeline
              <span className="ml-2 font-normal normal-case">
                ({steps.filter(s => s.time).length}/{steps.length} stages)
              </span>
            </p>
            <div>
              {steps.map((step, i) => (
                <TimelineStep
                  key={step.key}
                  label={step.label}
                  time={step.time}
                  active={!!step.time}
                  colorKey={step.colorKey}
                  detail={step.detail}
                  isLast={i === steps.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const InfoChip = ({ label, icon, children }) => (
  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
    <p className="text-xs text-gray-400 flex items-center gap-1 mb-1">{icon} {label}</p>
    {children}
  </div>
);

const StatPill = ({ icon, label, value, colorClass }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colorClass}`}>
    {icon}
    <div>
      <p className="text-xs text-gray-500 leading-none">{label}</p>
      <p className="text-base font-bold text-gray-900 leading-tight">{value}</p>
    </div>
  </div>
);

// ─── Main HistoryView ─────────────────────────────────────────────────────────

const HistoryView = ({ currentUser, isAdmin }) => {
  const [history, setHistory]             = useState([]);  // already deduped + enriched
  const [rawHistory, setRawHistory]       = useState([]);
  const [loading, setLoading]             = useState(true);
  const [searchQuery, setSearchQuery]     = useState('');
  const [filterBranch, setFilterBranch]   = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortField, setSortField]         = useState('latest');
  const [sortDir, setSortDir]             = useState('desc');
  const [branches, setBranches]           = useState([]);
  const [error, setError]                 = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    loadHistory();
    if (isAdmin) loadBranches();

    const channel = supabase
      .channel('history-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_history' },
        () => {
          // On any change just reload to keep assignments in sync
          loadHistory();
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, isAdmin]);

  // Whenever rawHistory changes, deduplicate then enrich with live assignments
  useEffect(() => {
    if (rawHistory.length === 0) { setHistory([]); return; }
    const deduped = deduplicateHistory(rawHistory);
    enrichWithAssignments(deduped).then(enriched => setHistory(enriched));
  }, [rawHistory]);

  const loadBranches = async () => {
    const { data } = await supabase.from('branches').select('id, name').order('name');
    if (data) setBranches(data);
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('task_history')
        .select('*')
        .order('confirmed_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setRawHistory(data || []);
    } catch (err) {
      console.error('Error loading history:', err);
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let data = [...history];

    if (filterBranch !== 'all')   data = data.filter(t => t.branch_id === filterBranch);
    if (filterPriority !== 'all') data = data.filter(t => t.priority  === filterPriority);
    if (filterStatus !== 'all')   data = data.filter(t => deriveStatus(t) === filterStatus);

    if (filterDateRange !== 'all') {
      const cutoff = new Date();
      if      (filterDateRange === 'today') cutoff.setHours(0, 0, 0, 0);
      else if (filterDateRange === 'week')  cutoff.setDate(cutoff.getDate() - 7);
      else if (filterDateRange === 'month') cutoff.setMonth(cutoff.getMonth() - 1);
      else if (filterDateRange === 'year')  cutoff.setFullYear(cutoff.getFullYear() - 1);
      data = data.filter(t => getLatestDate(t) >= cutoff.getTime());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      data = data.filter(t =>
        t.title?.toLowerCase().includes(q)           ||
        t.description?.toLowerCase().includes(q)     ||
        t.assignees?.some(a => a.toLowerCase().includes(q)) ||
        t.branch_name?.toLowerCase().includes(q)     ||
        t.board_name?.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let va, vb;
      if (sortField === 'latest') {
        va = getLatestDate(a);
        vb = getLatestDate(b);
      } else if (sortField === 'confirmed_at' || sortField === 'completed_at') {
        va = a[sortField] ? new Date(a[sortField]).getTime() : 0;
        vb = b[sortField] ? new Date(b[sortField]).getTime() : 0;
      } else {
        va = (a[sortField] || '').toString().toLowerCase();
        vb = (b[sortField] || '').toString().toLowerCase();
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });

    return data;
  }, [history, filterBranch, filterPriority, filterStatus, filterDateRange, searchQuery, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortBtn = ({ field, label }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
        sortField === field
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      {label}
      {sortField === field
        ? <span className="ml-0.5">{sortDir === 'desc' ? '↓' : '↑'}</span>
        : <ArrowUpDown className="w-3 h-3 ml-0.5" />
      }
    </button>
  );

  const clearFilters = () => {
    setFilterBranch('all');
    setFilterPriority('all');
    setFilterDateRange('all');
    setFilterStatus('all');
    setSearchQuery('');
  };

  const hasFilters = filterBranch !== 'all' || filterPriority !== 'all' ||
                     filterDateRange !== 'all' || filterStatus !== 'all' || searchQuery.trim();

  const now = new Date();
  const thisMonth = history.filter(t => {
    const d = new Date(getLatestDate(t));
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const thisWeek = history.filter(t => {
    const c = new Date(); c.setDate(c.getDate() - 7);
    return getLatestDate(t) >= c.getTime();
  }).length;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Task History</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                {isAdmin ? 'All tasks — live updates' : 'Your tasks — live updates'}
              </p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Filters grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2.5">
          <div className="relative col-span-2 sm:col-span-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {isAdmin && (
            <div className="relative">
              <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 appearance-none outline-none">
                <option value="all">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 appearance-none outline-none">
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="validating">Validating</option>
              <option value="in-progress">In Progress</option>
              <option value="started">Started</option>
              <option value="created">Created</option>
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <select value={filterDateRange} onChange={e => setFilterDateRange(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 appearance-none outline-none">
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>
        </div>

        {/* Sort row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400 font-medium">Sort:</span>
            <SortBtn field="latest"       label="Latest Activity" />
            <SortBtn field="confirmed_at" label="Confirmed" />
            <SortBtn field="title"        label="Title" />
            {hasFilters && (
              <button onClick={clearFilters}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 transition-colors ml-1">
                Clear filters
              </button>
            )}
          </div>
          <span className="text-xs text-gray-500">
            <span className="font-bold text-gray-800">{filteredAndSorted.length}</span>
            {' '}of{' '}
            <span className="font-bold text-gray-800">{history.length}</span> tasks
          </span>
        </div>
      </div>

      {/* ── Stats bar ── */}
      {history.length > 0 && (
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-white border-b border-gray-100">
          <StatPill icon={<CheckCircle2 className="w-4 h-4 text-emerald-600"/>} label="Total"        value={history.length}                                        colorClass="bg-emerald-50 border-emerald-100" />
          <StatPill icon={<CalendarCheck className="w-4 h-4 text-blue-600"/>}   label="This Month"   value={thisMonth}                                             colorClass="bg-blue-50 border-blue-100" />
          <StatPill icon={<Timer className="w-4 h-4 text-violet-600"/>}         label="This Week"    value={thisWeek}                                              colorClass="bg-violet-50 border-violet-100" />
          <StatPill icon={<Hourglass className="w-4 h-4 text-amber-600"/>}      label="High Priority" value={history.filter(t => t.priority === 'high').length}   colorClass="bg-amber-50 border-amber-100" />
        </div>
      )}

      {/* ── Task list ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filteredAndSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
              <History className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-1">
              {history.length === 0 ? 'No history yet' : 'No results found'}
            </h3>
            <p className="text-sm text-gray-400 max-w-xs">
              {history.length === 0
                ? 'Tasks appear here as they are created and progress.'
                : 'Try adjusting your search or filters.'}
            </p>
            {hasFilters && (
              <button onClick={clearFilters}
                className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-w-4xl mx-auto">
            {filteredAndSorted.map(task => (
              <HistoryTaskCard key={task.task_id || task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;