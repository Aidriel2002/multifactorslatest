import { supabase } from '../lib/supabase';

let notificationQueue = [];
let batchTimeout = null;

// ── Send push via Supabase Edge Function ───────────────────────────
async function sendPush(userIds, title, message, url = '/') {
  try {
    await supabase.functions.invoke('send-push', {
      body: { user_ids: userIds, title, message, url }
    })
  } catch (err) {
    console.error('Push send error:', err)
  }
}

async function processBatch() {
  if (notificationQueue.length === 0) return;
  
  const batch = [...notificationQueue];
  notificationQueue = [];
  
  try {
    const { error } = await supabase.from('notifications').insert(batch);
    if (error) console.error('Batch notification insert error:', error);
  } catch (error) {
    console.error('Batch notification error:', error);
  }
}

function queueNotification(notification) {
  notificationQueue.push(notification);
  if (batchTimeout) clearTimeout(batchTimeout);
  batchTimeout = setTimeout(processBatch, 100);
}

// Always fetch fresh assigned users from DB to catch ALL staff on a task
async function getAllAssignedUserIds(taskId, currentUserId) {
  try {
    const { data, error } = await supabase
      .from('task_assignments')
      .select('user_id')
      .eq('task_id', taskId);

    if (error) throw error;

    const ids = (data || [])
      .map(a => a.user_id)
      .filter(id => id && id !== currentUserId);

    return [...new Set(ids)];
  } catch (err) {
    console.error('Error fetching assigned users for notification:', err);
    return [];
  }
}

export async function notifyTaskStatusChange(task, newStatus, currentUserId = null) {
  if (!task?.id) return;

  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;

  const statusLabels = {
    'todo': 'To Do',
    'in-progress': 'In Progress',
    'validating': 'Validating',
    'completed': 'Completed'
  };

  const notificationType = newStatus === 'completed' ? 'task_completed' : 'task_moved';
  const title = 'Task Status Updated'
  const message = `Task "${task.title}" moved to ${statusLabels[newStatus] || newStatus}`;

  userIds.forEach(userId => {
    queueNotification({
      user_id: userId,
      type: notificationType,
      title,
      message,
      task_id: task.id,
      is_read: false,
      created_at: new Date().toISOString()
    });
  });

  // ── Send push notification ──
  await sendPush(userIds, title, message, '/kanban')
}

export async function notifyNewComment(task, commentText, commenterName, currentUserId = null) {
  if (!task?.id) return;

  const userIds = await getAllAssignedUserIds(task.id, currentUserId);
  if (userIds.length === 0) return;

  const truncated = commentText.length > 50
    ? commentText.substring(0, 50) + '...'
    : commentText;

  const title = 'New Comment'
  const message = `${commenterName} commented on "${task.title}": ${truncated}`;

  userIds.forEach(userId => {
    queueNotification({
      user_id: userId,
      type: 'new_comment',
      title,
      message,
      task_id: task.id,
      is_read: false,
      created_at: new Date().toISOString()
    });
  });

  // ── Send push notification ──
  await sendPush(userIds, title, message, '/kanban')
}

export async function notifyTaskAssigned(task, assignedUserIds, currentUserId = null) {
  if (!task?.id || !assignedUserIds?.length) return;

  const usersToNotify = assignedUserIds.filter(id => id !== currentUserId);
  if (usersToNotify.length === 0) return;

  const title = 'Task Assigned'
  const message = `You have been assigned to task "${task.title}"`

  usersToNotify.forEach(userId => {
    queueNotification({
      user_id: userId,
      type: 'task_assigned',
      title,
      message,
      task_id: task.id,
      is_read: false,
      created_at: new Date().toISOString()
    });
  });

  // ── Send push notification ──
  await sendPush(usersToNotify, title, message, '/kanban')
}