export const BADGES = {
  // First-time hooks (easy, earned in first session)
  first_session:  { id: 'first_session',  icon: '🚀', name: 'First Step',       desc: 'Complete your first session' },
  first_routine:  { id: 'first_routine',  icon: '🌅', name: 'Day Starter',      desc: 'Complete the daily routine' },
  first_win:      { id: 'first_win',      icon: '⚡', name: 'First Win',        desc: 'Log your first win' },

  // FocusControl
  focus_first:    { id: 'focus_first',    icon: '🎯', name: 'Focus Activated',  desc: 'Complete FocusControl' },
  focus_pro:      { id: 'focus_pro',      icon: '🎯', name: 'Brake Master',     desc: 'Score 80+ three times' },

  // MemoryBank
  memory_first:   { id: 'memory_first',   icon: '🧠', name: 'Memory Spark',     desc: 'Complete MemoryBank' },
  memory_level5:  { id: 'memory_level5',  icon: '🧠', name: 'Memory Master',    desc: 'Reach span level 5' },

  // MoodBridge
  mood_first:     { id: 'mood_first',     icon: '🌊', name: 'Mood Check',       desc: 'Complete MoodBridge' },
  mood_all_ex:    { id: 'mood_all_ex',    icon: '🌊', name: 'Mood Explorer',    desc: 'Try all 5 exercises' },

  // TimeWise
  time_first:     { id: 'time_first',     icon: '⏱', name: 'Time Guesser',     desc: 'Complete TimeWise' },
  time_accurate:  { id: 'time_accurate',  icon: '⏱', name: 'Time Master',      desc: '3 accurate predictions' },

  // ConfidenceCore
  win_five:       { id: 'win_five',       icon: '⚡', name: 'Win Collector',    desc: 'Log 5 wins' },
  win_ten:        { id: 'win_ten',        icon: '⚡', name: 'Champion Mind',    desc: 'Log 10 wins' },

  // Streaks
  streak_3:       { id: 'streak_3',       icon: '🔥', name: '3-Day Streak',     desc: '3 days in a row' },
  streak_7:       { id: 'streak_7',       icon: '🔥', name: 'Week Warrior',     desc: '7 days in a row' },
  streak_14:      { id: 'streak_14',      icon: '🔥', name: 'Two Weeks Strong', desc: '14 days in a row' },
  streak_30:      { id: 'streak_30',      icon: '👑', name: 'Unstoppable',      desc: '30 days in a row' },

  // Sleep streaks
  sleep_3:        { id: 'sleep_3',        icon: '🌙', name: 'Sleep Starter',    desc: '3 nights recharged on time' },
  sleep_7:        { id: 'sleep_7',        icon: '🌙', name: 'Sleep Champion',   desc: '7 nights recharged on time' },
  sleep_14:       { id: 'sleep_14',       icon: '⭐', name: 'Recharge Master',  desc: '14 nights recharged on time' },

  // Milestones
  sessions_10:    { id: 'sessions_10',    icon: '🌟', name: 'Getting Serious',  desc: '10 total sessions' },
  sessions_25:    { id: 'sessions_25',    icon: '🏆', name: 'Committed',        desc: '25 sessions' },
  sessions_50:    { id: 'sessions_50',    icon: '👑', name: 'NeuroFocus Pro',   desc: '50 sessions' },
};

export const LEVELS = [
  { level: 1,  xp: 0,    name: 'Brain Beginner'   },
  { level: 2,  xp: 100,  name: 'Focus Starter'    },
  { level: 3,  xp: 250,  name: 'Mind Builder'     },
  { level: 4,  xp: 450,  name: 'Skill Trainer'    },
  { level: 5,  xp: 700,  name: 'Focus Pro'        },
  { level: 6,  xp: 1000, name: 'Memory Expert'    },
  { level: 7,  xp: 1400, name: 'Emotion Master'   },
  { level: 8,  xp: 1900, name: 'Time Wizard'      },
  { level: 9,  xp: 2600, name: 'NeuroFocus Elite' },
  { level: 10, xp: 3500, name: 'Brain Champion'   },
];

export function calcLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return LEVELS[i].level;
  }
  return 1;
}

export function levelInfo(xp) {
  const level = calcLevel(xp);
  const current = LEVELS[level - 1];
  const next = LEVELS[level] || null;
  const xpIntoLevel = xp - current.xp;
  const xpNeeded = next ? next.xp - current.xp : 1;
  const progress = next ? xpIntoLevel / xpNeeded : 1;
  return { level, name: current.name, progress: Math.min(progress, 1), xpToNext: next ? next.xp - xp : 0 };
}

export function sleepStreak(sleepLogs = []) {
  const onTime = [...sleepLogs].filter(l => l.onTime).sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (let i = 0; i < onTime.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (onTime[i].date === expected.toISOString().split('T')[0]) streak++;
    else break;
  }
  return streak;
}

export function checkNewBadges(state) {
  const {
    focusControlSessions = [], memoryBankSessions = [], moodBridgeSessions = [],
    weeklyWins = [], timeWiseSessions = [], morningLogs = [],
    totalSessions = 0, currentStreak = 0, unlockedBadges = [],
    memoryBankLevels = {}, sleepLogs = [],
  } = state;

  const already = new Set(unlockedBadges);
  const earned = [];
  const add = (id) => { if (!already.has(id)) earned.push(id); };

  if (totalSessions >= 1)                                                    add('first_session');
  if (morningLogs.length >= 1)                                               add('first_routine');
  if (weeklyWins.length >= 1)                                                add('first_win');

  if (focusControlSessions.length >= 1)                                      add('focus_first');
  if (focusControlSessions.filter(s => s.brakeScore >= 80).length >= 3)     add('focus_pro');

  if (memoryBankSessions.length >= 1)                                        add('memory_first');
  if (Object.values(memoryBankLevels).some(l => l >= 5))                    add('memory_level5');

  if (moodBridgeSessions.length >= 1)                                        add('mood_first');
  const exercises = new Set(moodBridgeSessions.map(s => s.exercise).filter(Boolean));
  if (exercises.size >= 5)                                                   add('mood_all_ex');

  if (timeWiseSessions.length >= 1)                                          add('time_first');
  if (timeWiseSessions.filter(s => s.coeff >= 0.85 && s.coeff <= 1.15).length >= 3) add('time_accurate');

  if (weeklyWins.length >= 5)                                                add('win_five');
  if (weeklyWins.length >= 10)                                               add('win_ten');

  if (currentStreak >= 3)                                                    add('streak_3');
  if (currentStreak >= 7)                                                    add('streak_7');
  if (currentStreak >= 14)                                                   add('streak_14');
  if (currentStreak >= 30)                                                   add('streak_30');

  if (totalSessions >= 10)                                                   add('sessions_10');
  if (totalSessions >= 25)                                                   add('sessions_25');
  if (totalSessions >= 50)                                                   add('sessions_50');

  const ss = sleepStreak(sleepLogs);
  if (ss >= 3)                                                               add('sleep_3');
  if (ss >= 7)                                                               add('sleep_7');
  if (ss >= 14)                                                              add('sleep_14');

  return earned;
}
