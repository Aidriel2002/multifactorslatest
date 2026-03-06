import { supabase } from '../lib/supabase';

async function sendPush(userIds, title, message, url = '/') {
  if (!userIds || userIds.length === 0) return;
  console.log('🚀 [Push] Calling edge function with:', { userIds, title, message });
  try {
    const result = await supabase.functions.invoke('send-push-notification', {
      body: { user_ids: userIds, title, message, url }
    });
    console.log('🚀 [Push] Edge function result:', result);
  } catch (err) {
    console.error('🚀 [Push] Edge function error:', err);
  }
}

async function getAllAssignedUserIds(taskId, currentUserId = null) {
  if (!taskId) return [];
  try {
    const [assignmentsResult, taskResult] = await Promise.all([
      supabase.from('task_assignments').select('user_id').eq('task_id', taskId),
      supabase.from('tasks').select('assigned_to, created_by').eq('id', taskId).single()
    ]);

    const assignmentIds = (assignmentsResult.data || []).map(a => a.user_id);
    const createdById   = taskResult.data?.created_by || null;
    const fallbackIds   = assignmentIds.length === 0 && taskResult.data?.assigned_to ? [taskResult.data.assigned_to] : [];
    const allIds        = [...assignmentIds, ...fallbackIds, ...(createdById ? [createdById] : [])];

    return [...new Set(allIds)].filter(id => id && id !== currentUserId);
  } catch (err) {
    console.error('[Push] getAllAssignedUserIds threw:', err);
    return [];
  }
}

// ✅ Someone comments on a task
export async function notifyNewComment(task, commentText, commenterName, currentUserId = null) {
  if (!task?.id) return;
  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;
  const truncated = commentText?.length > 50 ? commentText.substring(0, 50) + '...' : commentText || '[attachment]';
  await sendPush(userIds, `💬 New Comment on "${task.title}"`, `${commenterName}: ${truncated}`, '/kanban');
}

// ✅ Task assigned to someone
export async function notifyTaskAssigned(taskId, assignedUserId, currentUserId = null) {
  if (!taskId || !assignedUserId) return;
  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
  if (!task) return;
  await sendPush([assignedUserId], `📋 Task Assigned`, `You have been assigned to "${task.title}"`, '/kanban');
}

// ✅ Task status changed (start, validate, complete)
export async function notifyTaskStatusChange(task, newStatus, currentUserId = null) {
  if (!task?.id) return;
  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;
  const statusLabels = {
    'in-progress': '🚀 Task Started',
    'validating':  '🔍 Task Ready for Review',
    'completed':   '✅ Task Completed',
    'todo':        '↩️ Task Moved to To Do',
  };
  const title = statusLabels[newStatus] || '📌 Task Updated';
  await sendPush(userIds, title, `"${task.title}" status changed`, '/kanban');
}

// ✅ Task confirmed/archived by admin
export async function notifyTaskConfirmed(task, currentUserId = null) {
  if (!task?.id) return;
  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;
  await sendPush(userIds, '🎉 Task Accepted', `"${task.title}" has been confirmed and archived`, '/kanban');
}