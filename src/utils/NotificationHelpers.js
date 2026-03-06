import { supabase } from '../lib/supabase';

// ── Send push via Supabase Edge Function ───────────────────────────
// The DB triggers now handle all in-app notification inserts.
// These JS functions only send push notifications (web push / FCM).

async function sendPush(userIds, title, message, url = '/') {
  if (!userIds || userIds.length === 0) return;
  try {
    await supabase.functions.invoke('send-push', {
      body: { user_ids: userIds, title, message, url }
    });
  } catch (err) {
    console.error('[Push] Error:', err);
  }
}

// ── Get ALL unique user IDs assigned to a task ─────────────────────
// Used only for targeting push notifications.
async function getAllAssignedUserIds(taskId, currentUserId = null) {
  if (!taskId) return [];

  try {
    const [assignmentsResult, taskResult] = await Promise.all([
      supabase
        .from('task_assignments')
        .select('user_id')
        .eq('task_id', taskId),
      supabase
        .from('tasks')
        .select('assigned_to, created_by')
        .eq('id', taskId)
        .single()
    ]);

    const assignmentIds = (assignmentsResult.data || []).map(a => a.user_id);
    const createdById   = taskResult.data?.created_by || null;

    // Fallback to legacy assigned_to only if junction table is empty
    let fallbackIds = [];
    if (assignmentIds.length === 0 && taskResult.data?.assigned_to) {
      fallbackIds = [taskResult.data.assigned_to];
    }

    const allIds = [...assignmentIds, ...fallbackIds, ...(createdById ? [createdById] : [])];
    return [...new Set(allIds)].filter(id => id && id !== currentUserId);

  } catch (err) {
    console.error('[Push] getAllAssignedUserIds threw:', err);
    return [];
  }
}

// ── Notify status change (push only) ──────────────────────────────
export async function notifyTaskStatusChange(task, newStatus, currentUserId = null) {
  if (!task?.id) return;
  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;
  const statusLabels = { 'todo': 'To Do', 'in-progress': 'In Progress', 'validating': 'Validating', 'completed': 'Completed' };
  await sendPush(userIds, 'Task Status Updated', `Task "${task.title}" moved to ${statusLabels[newStatus] || newStatus}`, '/kanban');
}

// ── Notify new comment (push only) ────────────────────────────────
export async function notifyNewComment(task, commentText, commenterName, currentUserId = null, commentId = null) {
  if (!task?.id) return;
  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;
  const truncated = commentText && commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText || '[attachment]';
  await sendPush(userIds, 'New Comment', `${commenterName} commented on "${task.title}": ${truncated}`, '/kanban');
}

// ── Notify task assigned (push only) ──────────────────────────────
export async function notifyTaskAssigned(task, assignedUserIds, currentUserId = null) {
  if (!task?.id || !assignedUserIds?.length) return;
  const usersToNotify = [...new Set(assignedUserIds)].filter(id => id && id !== currentUserId);
  if (usersToNotify.length === 0) return;
  await sendPush(usersToNotify, 'Task Assigned', `You have been assigned to task "${task.title}"`, '/kanban');
}