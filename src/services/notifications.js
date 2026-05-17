import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const MODULE_SCHEDULES = {
  routine_morning: {
    label: 'Daily Routine — Morning',
    icon: '🌅',
    daysLabel: 'Mon – Fri',
    weekdays: [2, 3, 4, 5, 6], // expo: 1=Sun … 7=Sat
    body: 'Morning routine time! Start our day strong. 💪',
  },
  routine_night: {
    label: 'Daily Routine — Night Prep',
    icon: '🌙',
    daysLabel: 'Sun – Thu',
    weekdays: [1, 2, 3, 4, 5], // night before school days
    body: 'Prep for tomorrow. 5 minutes now = calm morning. 🌙',
  },
  timewise: {
    label: 'TimeWise',
    icon: '⏱',
    daysLabel: 'Mon – Fri',
    weekdays: [2, 3, 4, 5, 6],
    body: 'TimeWise session! Train our internal clock. ⏱',
  },
  moodbridge: {
    label: 'MoodBridge',
    icon: '🌊',
    daysLabel: 'Mon – Fri',
    weekdays: [2, 3, 4, 5, 6],
    body: 'MoodBridge check-in. How are we feeling? 🌊',
  },
  focuscontrol: {
    label: 'FocusControl',
    icon: '🎯',
    daysLabel: 'Mon – Fri',
    weekdays: [2, 3, 4, 5, 6],
    body: 'FocusControl training. Build that mental brake. 🎯',
  },
  memorybank: {
    label: 'MemoryBank',
    icon: '🧠',
    daysLabel: 'Mon – Fri',
    weekdays: [2, 3, 4, 5, 6],
    body: 'MemoryBank session. Sharpen our working memory. 🧠',
  },
  confidencecore: {
    label: 'ConfidenceCore',
    icon: '⚡',
    daysLabel: 'Daily',
    weekdays: [1, 2, 3, 4, 5, 6, 7], // daily — log today's win while fresh
    body: 'ConfidenceCore — log a win from today before we forget it. ⚡',
  },
  truenorth: {
    label: 'TrueNorth — Values Check',
    icon: '🧭',
    daysLabel: 'Daily',
    weekdays: [1, 2, 3, 4, 5, 6, 7], // daily — 60-second drift check
    body: 'TrueNorth check — did we show up as ourselves today? 60 seconds. 🧭',
  },
  stillpoint: {
    label: 'StillPoint — Mindfulness',
    icon: '🍃',
    daysLabel: 'Mon, Wed, Fri',
    weekdays: [2, 4, 6], // 3x/week minimum for measurable benefit
    body: 'StillPoint — 2 or 5 minutes of mindfulness. Our brain needs this. 🍃',
  },
  connectwell: {
    label: 'ConnectWell — Social Practice',
    icon: '🤝',
    daysLabel: 'Mon & Wed',
    weekdays: [2, 4], // 2x/week for HAB correction
    body: 'ConnectWell — a quick social scenario. Sharpen how we read situations. 🤝',
  },
  thoughtcheck: {
    label: 'ThoughtCheck — Mind Check',
    icon: '🧩',
    daysLabel: 'Tue & Thu',
    weekdays: [3, 5], // 2x/week for CBT practice
    body: 'ThoughtCheck — any critical thoughts worth examining today? 🧩',
  },
  weeklyplanner: {
    label: 'Weekly Planner',
    icon: '📋',
    daysLabel: 'Saturday',
    weekdays: [7],
    body: 'Weekly Planner — plan ahead before the week sneaks up. 📋',
  },
  weekly_practice: {
    label: 'Brain Gym',
    icon: '🧠',
    daysLabel: 'Tue & Thu (default)',
    weekdays: [3, 5], // Tuesday & Thursday
    body: 'Brain training time. Even one session today moves us forward. 🎯',
  },
};

export async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleModuleNotification(key, config) {
  const schedule = MODULE_SCHEDULES[key];
  if (!schedule) return;

  // Cancel all existing for this key
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const mine = all.filter(n => n.identifier.startsWith(`nf_${key}_`));
  await Promise.all(mine.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));

  if (!config.enabled) return;

  for (const weekday of schedule.weekdays) {
    await Notifications.scheduleNotificationAsync({
      identifier: `nf_${key}_${weekday}`,
      content: {
        title: `NeuroFocus 🧠`,
        body: schedule.body,
        sound: true,
      },
      trigger: {
        weekday,
        hour: config.hour,
        minute: config.minute,
        repeats: true,
      },
    });
  }
}

export async function scheduleAllNotifications(moduleNotifications) {
  const granted = await requestPermissions();
  if (!granted) return;
  for (const [key, config] of Object.entries(moduleNotifications)) {
    await scheduleModuleNotification(key, config);
  }
}

export async function scheduleSleepNotifications(hour, minute) {
  // Cancel existing sleep notifications
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter(n => n.identifier.startsWith('sleep_')).map(n =>
      Notifications.cancelScheduledNotificationAsync(n.identifier)
    )
  );

  // Schedule at -60, -30, -15, 0 min relative to bedtime
  const alerts = [
    { offset: 60, id: 'sleep_60', title: '😴 SleepGuard', body: '60 minutes to bedtime. Start wrapping up.' },
    { offset: 30, id: 'sleep_30', title: '😴 SleepGuard', body: '30 minutes — time to dim the screens.' },
    { offset: 15, id: 'sleep_15', title: '😴 SleepGuard', body: '15 minutes — start your wind-down now.' },
    { offset: 0,  id: 'sleep_0',  title: '🌙 Bedtime',    body: 'Our brain needs rest to grow. Open SleepGuard.' },
  ];

  for (const a of alerts) {
    let h = hour;
    let m = minute - a.offset;
    while (m < 0) { m += 60; h = (h - 1 + 24) % 24; }

    await Notifications.scheduleNotificationAsync({
      identifier: a.id,
      content: { title: a.title, body: a.body, sound: true },
      trigger: { hour: h, minute: m, repeats: true },
    });
  }
}

export async function scheduleMedicationReminder(enabled, hour, minute) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter(n => n.identifier.startsWith('med_')).map(n =>
      Notifications.cancelScheduledNotificationAsync(n.identifier)
    )
  );
  if (!enabled) return;
  await Notifications.scheduleNotificationAsync({
    identifier: 'med_daily',
    content: { title: '💊 Medication reminder', body: 'Time to take our medication.', sound: true },
    trigger: { hour, minute, repeats: true },
  });
}

export async function scheduleHyperfocusBreaker(enabled, intervalMinutes) {
  const all = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    all.filter(n => n.identifier.startsWith('hf_')).map(n =>
      Notifications.cancelScheduledNotificationAsync(n.identifier)
    )
  );
  if (!enabled) return;
  // Schedule 8 notifications from now at the interval
  const now = Date.now();
  for (let i = 1; i <= 8; i++) {
    const fireAt = new Date(now + i * intervalMinutes * 60 * 1000);
    await Notifications.scheduleNotificationAsync({
      identifier: `hf_${i}`,
      content: {
        title: '👀 Look up',
        body:  `We have been at this for ${intervalMinutes} minutes. Check in — hungry? tired? still on track?`,
        sound: true,
      },
      trigger: { date: fireAt },
    }).catch(() => {});
  }
}

