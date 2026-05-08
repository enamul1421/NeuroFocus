import * as Notifications from 'expo-notifications';

// ── Horizon calculation ──────────────────────────────────────────────────────
export function getHorizon(deadlineISO) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineISO);
  deadline.setHours(0, 0, 0, 0);
  const days = Math.round((deadline - today) / (1000 * 60 * 60 * 24));
  if (days < 0)  return 'overdue';
  if (days <= 7) return 'this_week';
  if (days <= 21) return 'next_2_3_weeks';
  return 'next_4_6_weeks';
}

export const HORIZON_LABELS = {
  this_week:      { label: 'This Week',      emoji: '🔴', color: '#F44336' },
  next_2_3_weeks: { label: 'Next 2-3 Weeks', emoji: '🟡', color: '#FF9800' },
  next_4_6_weeks: { label: 'Next 4-6 Weeks', emoji: '🟢', color: '#4CAF50' },
  overdue:        { label: 'Overdue',         emoji: '⚠️', color: '#9E9E9E' },
};

// ── Date formatting ──────────────────────────────────────────────────────────
export function formatDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function daysUntil(isoString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoString);
  d.setHours(0, 0, 0, 0);
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

// ── Step suggestion ──────────────────────────────────────────────────────────
// Given deadline ISO and step pct, suggest a scheduled date
export function suggestStepDate(deadlineISO, pct, totalPctBefore) {
  const today = new Date();
  const deadline = new Date(deadlineISO);
  const totalMs = deadline - today;
  const offsetMs = (totalPctBefore / 100) * totalMs;
  const suggested = new Date(today.getTime() + offsetMs);
  return suggested.toISOString();
}

// ── Notifications ────────────────────────────────────────────────────────────
export async function scheduleStepNotification(step, taskTitle) {
  if (!step.scheduledDate) return null;
  const triggerDate = new Date(step.scheduledDate);
  if (triggerDate <= new Date()) return null;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📋 Time to work: ${taskTitle}`,
        body: step.name,
        sound: true,
      },
      trigger: { type: 'date', date: triggerDate },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelStepNotification(notificationId) {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {}
}

export async function scheduleWeeklyReview(hour, minute) {
  // Cancel all existing weekly review notifications first
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const n of scheduled) {
    if (n.content.data?.type === 'weekly_review') {
      await Notifications.cancelScheduledNotificationAsync(n.identifier);
    }
  }
  // Schedule new weekly Saturday notification
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📋 Weekly Planning Review',
      body: "How did last week go? Add new tasks for the week ahead.",
      sound: true,
      data: { type: 'weekly_review' },
    },
    trigger: {
      type: 'weekly',
      weekday: 7, // Saturday (1=Sunday, 7=Saturday)
      hour,
      minute,
    },
  });
}
