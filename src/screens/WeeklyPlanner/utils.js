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

// ── Step date suggestion (ADHD-informed) ────────────────────────────────────
// Evidence base:
//   • Start TODAY — time blindness means "later" = never (Barkley, 2011)
//   • Front-load — momentum before motivation fades; avoids deadline panic
//   • 2-day buffer — ADHD procrastination prevention (avoid exam-eve cramming)
//   • 15-min break buffer — task-switching cost higher in ADHD (Geurts et al.)
//   • Study windows: weekdays 4–9 PM (post-school), weekends 10 AM–6 PM
//
// suggestStepDates(deadlineISO, stepDurations[], existingTasks[])
// → returns ISO string[] with conflict-free, break-buffered default times

const BREAK_MS = 15 * 60 * 1000;   // 15-min ADHD transition buffer
const SLOT_STEP_MS = 30 * 60 * 1000; // nudge forward 30 min when slot taken

function studyWindow(date) {
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  return isWeekend ? [10, 18] : [16, 21]; // [startHour, endHour]
}

function nextWindowStart(date) {
  const d = new Date(date);
  const [sh] = studyWindow(d);
  if (d.getHours() < sh) { d.setHours(sh, 0, 0, 0); return d; }
  // Past end of window → next day
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  d.setHours(studyWindow(d)[0], 0, 0, 0);
  return d;
}

function findFreeSlot(candidateStart, durationMin, booked, deadline) {
  let c = new Date(candidateStart);
  const deadlineMs = deadline.getTime();
  for (let iter = 0; iter < 200; iter++) {
    if (c.getTime() > deadlineMs) break;
    const [sh, eh] = studyWindow(c);
    const h = c.getHours();
    const sessionEndHour = h + durationMin / 60;
    if (h < sh || sessionEndHour > eh + 0.5) {
      c = nextWindowStart(c);
      continue;
    }
    const start = c.getTime();
    const end = start + durationMin * 60000;
    if (!booked.some(b => start < b.end && b.start < end)) return c.toISOString();
    c = new Date(start + SLOT_STEP_MS);
  }
  return c.toISOString(); // fallback — deadline pressure, no free slot
}

export function suggestStepDates(deadlineISO, stepDurations, existingTasks = []) {
  const n = stepDurations.length;
  if (n === 0) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const deadline = new Date(deadlineISO);
  deadline.setHours(0, 0, 0, 0);

  const totalDays = Math.max(Math.round((deadline - today) / 86400000), 0);
  const bufferDays = Math.min(2, Math.max(0, totalDays - n));
  const usableDays = Math.max(totalDays - bufferDays, 0);

  // Build booked intervals from existing tasks (+ ADHD break buffer on each side)
  const booked = [];
  for (const task of existingTasks) {
    for (const step of (task.steps || [])) {
      for (const sess of (step.sessions || [])) {
        if (!sess.scheduledDate) continue;
        const s = new Date(sess.scheduledDate).getTime();
        const e = s + (sess.durationMin || 30) * 60000;
        booked.push({ start: s - BREAK_MS, end: e + BREAK_MS });
      }
    }
  }

  const dates = [];
  for (let i = 0; i < n; i++) {
    const dur = stepDurations[i] || 30;

    // Front-loaded day offset (exponent > 1 → earlier steps packed forward)
    let dayOffset = 0;
    if (n > 1) {
      const frac = i / (n - 1);
      dayOffset = Math.min(Math.round(Math.pow(frac, 1.4) * usableDays), totalDays);
    }
    const candidateDay = new Date(today);
    candidateDay.setDate(today.getDate() + dayOffset);
    candidateDay.setHours(studyWindow(candidateDay)[0], 0, 0, 0);

    const iso = findFreeSlot(candidateDay, dur, booked, deadline);
    dates.push(iso);

    // Reserve this slot so next steps don't collide with it
    const s = new Date(iso).getTime();
    booked.push({ start: s - BREAK_MS, end: s + dur * 60000 + BREAK_MS });
  }
  return dates;
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
