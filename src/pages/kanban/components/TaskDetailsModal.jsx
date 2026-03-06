import { useState } from 'react';
import {
  X, Calendar, User, Users, Clock, Flag,
  CheckCircle2, Circle, AlertCircle,
  Columns, Play, Send, BadgeCheck, ArrowRight
} from 'lucide-react';
import CommentSection from './CommentSection';
import { supabase } from '../../../lib/supabase';

const STATUS_CFG = {
  'todo':        { label: 'To Do',       Icon: Circle,       accent: '#64748b', badgeCls: 'bg-slate-100 text-slate-700 ring-slate-300'    },
  'in-progress': { label: 'In Progress', Icon: Play,         accent: '#3b82f6', badgeCls: 'bg-blue-100 text-blue-700 ring-blue-300'      },
  'validating':  { label: 'Validating',  Icon: AlertCircle,  accent: '#8b5cf6', badgeCls: 'bg-violet-100 text-violet-700 ring-violet-300' },
  'completed':   { label: 'Completed',   Icon: CheckCircle2, accent: '#10b981', badgeCls: 'bg-emerald-100 text-emerald-700 ring-emerald-300' },
};

const PRIORITY_CFG = {
  low:    { label: 'Low',    color: '#0ea5e9', badgeCls: 'bg-sky-100 text-sky-700 ring-sky-300'     },
  medium: { label: 'Medium', color: '#f59e0b', badgeCls: 'bg-amber-100 text-amber-700 ring-amber-300' },
  high:   { label: 'High',   color: '#ef4444', badgeCls: 'bg-rose-100 text-rose-700 ring-rose-300'   },
};

const NEXT_ACTION = {
  'todo':        { next: 'in-progress', label: 'Start Task',        Icon: Play,       cls: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',       shadow: 'shadow-blue-200'    },
  'in-progress': { next: 'validating',  label: 'Validate', Icon: Send,       cls: 'bg-violet-600 hover:bg-violet-700 active:bg-violet-800', shadow: 'shadow-violet-200'  },
  'validating':  { next: 'completed',   label: 'Mark as Complete',  Icon: BadgeCheck, cls: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800', shadow: 'shadow-emerald-200' },
};

const AVATAR_BG = [
  'from-blue-400 to-indigo-500',
  'from-violet-400 to-purple-500',
  'from-rose-400 to-pink-500',
  'from-amber-400 to-orange-500',
  'from-teal-400 to-cyan-500',
  'from-green-400 to-emerald-500',
];

const fmtDate     = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
const fmtDateTime = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const initial     = str => (str || '?')[0].toUpperCase();

const Avatar = ({ name, idx = 0 }) => (
  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${AVATAR_BG[idx % AVATAR_BG.length]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
    <span className="text-white text-xs font-bold">{initial(name)}</span>
  </div>
);

const SectionLabel = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
    <Icon size={11} />
    {text}
  </div>
);

const TaskDetailsModal = ({ isOpen, onClose, task, currentUser, onTaskUpdate, onNavigateToBoard }) => {
  const [moving, setMoving] = useState(false);

  if (!isOpen || !task) return null;

  const statusCfg   = STATUS_CFG[task.status]     || STATUS_CFG['todo'];
  const priorityCfg = PRIORITY_CFG[task.priority]  || PRIORITY_CFG['medium'];
  const nextAction  = NEXT_ACTION[task.status];
  const { Icon: StatusIcon } = statusCfg;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

  let assignedUsers = [];
  if (Array.isArray(task.assigned_users) && task.assigned_users.length > 0) {
    assignedUsers = task.assigned_users;
  } else if (task.assigned_user) {
    assignedUsers = [{ id: task.assigned_user.id, full_name: task.assigned_user.name }];
  }
  const assigneeNames =
    Array.isArray(task.assignees) && task.assignees.length > 0
      ? task.assignees
      : assignedUsers.map(u => u.full_name || u.name).filter(Boolean);

  const hasMultiple = assigneeNames.length > 1;

  const handleMoveStatus = async () => {
    if (!nextAction?.next || moving) return;
    setMoving(true);
    try {
      const now    = new Date().toISOString();
      const update = { status: nextAction.next, changed_by: currentUser?.id };
      if (nextAction.next === 'in-progress') {
        update.in_progress_at = now;
        const { data: t } = await supabase.from('tasks').select('started_at').eq('id', task.id).single();
        if (!t?.started_at) update.started_at = now;
      } else if (nextAction.next === 'validating') {
        update.validating_at = now;
      } else if (nextAction.next === 'completed') {
        update.completed_at = now;
      }
      await supabase.from('tasks').update(update).eq('id', task.id);
      if (onTaskUpdate) await onTaskUpdate();
      onClose();
    } catch (err) {
      console.error('Move status error:', err);
    } finally {
      setMoving(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .tdm-root { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; }
        .tdm-scroll { scrollbar-width: thin; scrollbar-color: #e2e8f0 transparent; }
        .tdm-scroll::-webkit-scrollbar { width: 4px; }
        .tdm-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }
        @keyframes tdm-up   { from { transform: translateY(100%); opacity:0 } to { transform: translateY(0); opacity:1 } }
        @keyframes tdm-fade { from { opacity:0 } to { opacity:1 } }
        .tdm-sheet    { animation: tdm-up   0.3s cubic-bezier(.22,1,.36,1); }
        .tdm-backdrop { animation: tdm-fade 0.2s ease; }
        @media (min-width:640px) { .tdm-sheet { animation: tdm-fade 0.18s ease; } }
      `}</style>

      <div className="tdm-root fixed inset-0 z-50 flex items-end sm:items-center justify-center">

        <div className="tdm-backdrop absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={onClose} />

        <div
          className="tdm-sheet relative w-full sm:max-w-lg sm:mx-4 flex flex-col bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden"
          style={{ maxHeight: '96vh' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="h-1.5 w-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${statusCfg.accent}, ${priorityCfg.color})` }} />

          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-gray-100">
            <div className="sm:hidden w-9 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${statusCfg.accent}18` }}>
                <StatusIcon size={18} style={{ color: statusCfg.accent }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${statusCfg.badgeCls}`}>
                    {statusCfg.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${priorityCfg.badgeCls}`}>
                    <Flag size={9} />
                    {priorityCfg.label}
                  </span>
                  {isOverdue && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 bg-red-50 text-red-600 ring-red-300">
                      <Clock size={9} /> Overdue
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-gray-900 leading-snug break-words">{task.title}</h2>
              </div>

              <button onClick={onClose}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="tdm-scroll flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">

            {assigneeNames.length > 0 && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <SectionLabel
                  icon={hasMultiple ? Users : User}
                  text={hasMultiple ? `Assigned Users (${assigneeNames.length})` : 'Assigned To'}
                />
                <div className="space-y-2.5">
                  {assignedUsers.length > 0 ? (
                    assignedUsers.map((u, i) => {
                      const name = u.full_name || u.name || '';
                      return (
                        <div key={u.id || i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
                          <Avatar name={name} idx={i} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">{name}</p>
                            {u.role && <p className="text-xs text-gray-400 capitalize mt-0.5">{u.role}</p>}
                            {u.email && !u.role && <p className="text-xs text-gray-400 mt-0.5 truncate">{u.email}</p>}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    assigneeNames.map((name, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2.5 shadow-sm">
                        <Avatar name={name} idx={i} />
                        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className={`grid gap-3 ${task.due_date ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {task.due_date && (
                <div className={`rounded-xl border p-3.5 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
                  <SectionLabel icon={Calendar} text="Due Date" />
                  <p className={`text-sm font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                    {fmtDate(task.due_date)}
                  </p>
                  {isOverdue && <p className="text-xs text-red-500 mt-0.5 font-medium">Past due</p>}
                </div>
              )}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <SectionLabel icon={Clock} text="Created" />
                <p className="text-sm font-bold text-gray-900">{fmtDateTime(task.created_at)}</p>
              </div>
            </div>

            {task.created_user && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <SectionLabel icon={User} text="Created By" />
                <div className="flex items-center gap-2.5">
                  <Avatar name={task.created_user.name} idx={5} />
                  <p className="text-sm font-semibold text-gray-900">{task.created_user.name}</p>
                </div>
              </div>
            )}

            {task.description && (
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                <SectionLabel icon={Flag} text="Description" />
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {task.description}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
              <div className="px-4 pt-3.5 pb-1">
                <SectionLabel icon={Circle} text="Comments" />
              </div>
              <div className="px-4 pb-4">
                <CommentSection task={task} currentUser={currentUser} onCommentAdded={onTaskUpdate} />
              </div>
            </div>

            <div className="h-1" />
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 bg-white px-5 py-3 flex gap-2.5">

            {task.status === 'completed' ? (
              <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-semibold text-sm ring-1 ring-emerald-200">
                <CheckCircle2 size={15} />
                Task Completed
              </div>
            ) : nextAction ? (
              <button
                onClick={handleMoveStatus}
                disabled={moving}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all active:scale-95 disabled:opacity-60 ${nextAction.cls} ${nextAction.shadow}`}
              >
                {moving
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <nextAction.Icon size={15} />
                }
                {moving ? 'Updating…' : nextAction.label}
              </button>
            ) : null}

            {onNavigateToBoard && (
              <button
                onClick={() => { onNavigateToBoard(task); onClose(); }}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 active:bg-gray-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
              >
                <Columns size={15} />
                Go to Column
                <ArrowRight size={13} className="opacity-70" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default TaskDetailsModal;