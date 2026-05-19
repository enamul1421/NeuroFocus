import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calcLevel, checkNewBadges, BADGES, LEVELS } from '../utils/achievements';
import { syncToSheets } from '../services/sheets';

const STORAGE_KEY = 'neurofocus_state';

export const useStore = create((set, get) => ({
  // Onboarding
  onboardingComplete: false,
  userNickname: '',
  trustedAdultName: '',
  diagnoses: [],
  topChallenges: [],
  participantCode: '',
  isResearchParticipant: false,

  setOnboardingData: (data) => set(data),
  completeOnboarding: () => set({ onboardingComplete: true }),

  // Session state
  currentStreak: 0,
  totalSessions: 0,
  lastSessionDate: null,

  // Consent
  consentGiven: false,
  consentDate: null,
  setConsent: (given) => {
    set({ consentGiven: given, consentDate: given ? new Date().toISOString() : null });
    get().persist();
  },

  // Theme
  themeMode: 'system', // 'system' | 'light' | 'dark'
  setThemeMode: (mode) => { set({ themeMode: mode }); get().persist(); },

  // Skip today — { moduleKey: 'YYYY-MM-DD' }
  skippedModules: {},

  skipModule: (key) => {
    const today = new Date().toISOString().split('T')[0];
    set({ skippedModules: { ...get().skippedModules, [key]: today } });
    get().persist();
  },

  unskipModule: (key) => {
    const updated = { ...get().skippedModules };
    delete updated[key];
    set({ skippedModules: updated });
    get().persist();
  },

  // XP & Achievements
  xp: 0,
  level: 1,
  unlockedBadges: [],
  pendingCelebration: null,

  awardXP: (baseXP) => {
    const s = get();
    const newBadgeIds = checkNewBadges(s);
    const bonusXP = newBadgeIds.length * 100;
    const totalNewXP = baseXP + bonusXP;
    const newTotalXP = s.xp + totalNewXP;
    const oldLevel = s.level;
    const newLevel = calcLevel(newTotalXP);
    const newBadges = newBadgeIds.map(id => BADGES[id]);
    const levelName = LEVELS[newLevel - 1]?.name;
    const shouldCelebrate = newBadges.length > 0 || newLevel > oldLevel;
    set({
      xp: newTotalXP,
      level: newLevel,
      unlockedBadges: [...s.unlockedBadges, ...newBadgeIds],
      pendingCelebration: shouldCelebrate ? {
        xpGained: totalNewXP,
        newBadges,
        leveledUp: newLevel > oldLevel,
        newLevel,
        levelName,
      } : null,
    });
    get().persist();
  },

  clearCelebration: () => set({ pendingCelebration: null }),

  // TimeWise
  timeWiseSessions: [],
  timeWiseLevel: 1,

  addTimeWiseSession: (session) => {
    set({
      timeWiseSessions: [...get().timeWiseSessions, session],
      totalSessions: get().totalSessions + 1,
    });
    get().updateStreak();
    get().awardXP(session.coeff >= 0.85 && session.coeff <= 1.15 ? 75 : 50);
    syncToSheets('TimeWise', get().participantCode, session);
  },

  // Weekly Planner
  plannerTasks: [],
  weeklyReviews: [],
  reviewNotificationTime: { hour: 10, minute: 0 }, // Saturday 10am default

  addPlannerTask: (task) => {
    set({ plannerTasks: [...get().plannerTasks, task] });
    get().persist();
  },

  updatePlannerTask: (taskId, updates) => {
    set({
      plannerTasks: get().plannerTasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    });
    get().persist();
  },

  markStepComplete: (taskId, stepId, completed) => {
    set({
      plannerTasks: get().plannerTasks.map(t => {
        if (t.id !== taskId) return t;
        return {
          ...t,
          steps: t.steps.map(s =>
            s.id === stepId ? { ...s, completed } : s
          ),
        };
      }),
    });
    get().persist();
  },

  deletePlannerTask: (taskId) => {
    set({ plannerTasks: get().plannerTasks.filter(t => t.id !== taskId) });
    get().persist();
  },

  addWeeklyReview: (review) => {
    set({ weeklyReviews: [...get().weeklyReviews, review] });
    get().persist();
  },

  setReviewNotificationTime: (hour, minute) => {
    set({ reviewNotificationTime: { hour, minute } });
    get().persist();
  },

  // PlanForward (legacy sessions kept for data continuity)
  planForwardSessions: [],

  addPlanForwardSession: (session) => {
    set({
      planForwardSessions: [...get().planForwardSessions, session],
      totalSessions: get().totalSessions + 1,
    });
    get().persist();
  },

  // FocusControl
  focusControlSessions: [],
  focusNogoRatio: 0.4,

  addFocusControlSession: (session) => {
    set({
      focusControlSessions: [...get().focusControlSessions, session],
      totalSessions: get().totalSessions + 1,
    });
    get().updateStreak();
    get().awardXP(session.brakeScore >= 80 ? 75 : 50);
    syncToSheets('FocusControl', get().participantCode, session);
  },

  setFocusNogoRatio: (ratio) => {
    set({ focusNogoRatio: ratio });
    get().persist();
  },

  // MemoryBank
  memoryBankSessions: [],
  memoryBankLevels: { digitsFwd: 3, digitsBwd: 3, spatial: 3 },

  addMemoryBankSession: (session) => {
    set({
      memoryBankSessions: [...get().memoryBankSessions, session],
      totalSessions: get().totalSessions + 1,
    });
    get().updateStreak();
    get().awardXP(50);
    syncToSheets('MemoryBank', get().participantCode, session);
  },

  setMemoryBankLevel: (mode, level) => {
    set({ memoryBankLevels: { ...get().memoryBankLevels, [mode]: level } });
    get().persist();
  },

  // MoodBridge
  moodBridgeSessions: [],

  addMoodBridgeSession: (session) => {
    set({
      moodBridgeSessions: [...get().moodBridgeSessions, session],
      totalSessions: get().totalSessions + 1,
    });
    get().updateStreak();
    get().awardXP(session.delta > 0 ? 60 : 50);
    syncToSheets('MoodBridge', get().participantCode, session);
  },

  // ConfidenceCore — win archive
  weeklyWins: [],

  addWin: (win) => {
    set({ weeklyWins: [...get().weeklyWins, win] });
    get().awardXP(30);
    syncToSheets('ConfidenceCore', get().participantCode, win);
  },

  // Anger self-monitoring
  angerCheckIns: [],
  addAngerCheckIn: (checkIn) => {
    set({ angerCheckIns: [...get().angerCheckIns, checkIn] });
    syncToSheets('AngerCheckIn', get().participantCode, checkIn);
    get().persist();
  },

  // SocialBattery — social energy tracking (autism + ADHD)
  socialBatteryLogs: [],
  addSocialBatteryLog: (log) => {
    set({ socialBatteryLogs: [...get().socialBatteryLogs, log] });
    syncToSheets('SocialBattery', get().participantCode, log);
    get().persist();
  },

  // OwnershipReflect — weekly self-monitoring
  ownershipReflections: [],
  addOwnershipReflection: (r) => {
    set({ ownershipReflections: [...get().ownershipReflections, r] });
    get().awardXP(20);
    syncToSheets('OwnershipReflect', get().participantCode, r);
    get().persist();
  },

  // SleepQuality morning check-in
  sleepQualityLogs: [],
  addSleepQualityLog: (log) => {
    const filtered = get().sleepQualityLogs.filter(l => l.date !== log.date);
    set({ sleepQualityLogs: [...filtered, log] });
    syncToSheets('SleepQuality', get().participantCode, log);
    get().persist();
  },

  // StillPoint — mindfulness
  stillPointSessions: [],
  addStillPointSession: (session) => {
    set({ stillPointSessions: [...get().stillPointSessions, session] });
    get().awardXP(session.mode === 'quick' ? 30 : 50);
    syncToSheets('StillPoint', get().participantCode, session);
    get().persist();
  },

  // QuietMode — autism shutdown response
  quietModeLogs: [],
  addQuietModeLog: (log) => {
    set({ quietModeLogs: [...get().quietModeLogs, log] });
    syncToSheets('QuietMode', get().participantCode, log);
    get().persist();
  },

  // FocusWatch — sustained attention training
  focusWatchSessions: [],
  addFocusWatchSession: (session) => {
    set({ focusWatchSessions: [...get().focusWatchSessions, session], totalSessions: get().totalSessions + 1 });
    get().updateStreak();
    get().awardXP(50);
    syncToSheets('FocusWatch', get().participantCode, session);
    get().persist();
  },

  // Medication reminder
  medicationEnabled: false,
  medicationTimes:   [{ hour: 8, minute: 0 }],
  medicationLogs:    [],

  setMedicationReminder: (enabled, times) => {
    set({ medicationEnabled: enabled, medicationTimes: times });
    get().persist();
  },

  addMedicationLog: (log) => {
    const filtered = get().medicationLogs.filter(l => l.date !== log.date);
    set({ medicationLogs: [...filtered, log] });
    get().persist();
  },

  // Hyperfocus breaker
  hyperfocusEnabled:         false,
  hyperfocusIntervalMinutes: 90,

  setHyperfocusBreaker: (enabled, intervalMinutes) => {
    set({ hyperfocusEnabled: enabled, hyperfocusIntervalMinutes: intervalMinutes });
    get().persist();
  },

  // BodyCheckIn — interoception / body awareness
  bodyCheckIns: [],
  addBodyCheckIn: (checkIn) => {
    set({ bodyCheckIns: [...get().bodyCheckIns, checkIn] });
    syncToSheets('BodyCheckIn', get().participantCode, checkIn);
    get().persist();
  },

  // ThoughtCheck — CBT thought records (simplified)
  thoughtCheckSessions: [],
  addThoughtCheckSession: (session) => {
    set({ thoughtCheckSessions: [...get().thoughtCheckSessions, session] });
    get().awardXP(50);
    syncToSheets('ThoughtCheck', get().participantCode, session);
    get().persist();
  },

  // HardMoment — DESR + self-compassion (emotional pain from criticism/rejection)
  hardMomentSessions: [],
  addHardMomentSession: (session) => {
    set({ hardMomentSessions: [...get().hardMomentSessions, session] });
    get().awardXP(55);
    syncToSheets('HardMoment', get().participantCode, session);
    get().persist();
  },

  // WorryBreak — anxiety / rumination
  worryBreakSessions: [],
  addWorryBreakSession: (session) => {
    set({ worryBreakSessions: [...get().worryBreakSessions, session] });
    get().awardXP(45);
    syncToSheets('WorryBreak', get().participantCode, session);
    get().persist();
  },

  // SensoryShield — sensory overwhelm toolkit
  sensoryLogs: [],
  addSensoryLog: (log) => {
    set({ sensoryLogs: [...get().sensoryLogs, log] });
    syncToSheets('SensoryShield', get().participantCode, log);
    get().persist();
  },

  // SpeakUp — self-advocacy (no session log needed — reference only)

  // FlexSwitch — cognitive flexibility / task-switching
  flexSwitchSessions: [],
  addFlexSwitchSession: (session) => {
    set({ flexSwitchSessions: [...get().flexSwitchSessions, session], totalSessions: get().totalSessions + 1 });
    get().updateStreak();
    get().awardXP(50);
    syncToSheets('FlexSwitch', get().participantCode, session);
    get().persist();
  },

  // GlassBreak — task initiation / freeze breaker
  glassBreakSessions: [],
  addGlassBreakSession: (session) => {
    set({ glassBreakSessions: [...get().glassBreakSessions, session], totalSessions: get().totalSessions + 1 });
    get().updateStreak();
    get().awardXP(session.roundsCompleted * 50);
    syncToSheets('GlassBreak', get().participantCode, session);
    get().persist();
  },

  // TrueNorth — values identification + daily alignment
  trueNorthValues: [],
  trueNorthLogs:   [],

  setTrueNorthValues: (values) => {
    set({ trueNorthValues: values });
    get().persist();
  },

  addTrueNorthLog: (log) => {
    const existing = get().trueNorthLogs;
    const filtered = existing.filter(l => l.date !== log.date);
    set({ trueNorthLogs: [...filtered, log] });
    get().awardXP(log.allAligned ? 60 : 40);
    syncToSheets('TrueNorth', get().participantCode, log);
    get().persist();
  },

  // ConnectWell — social skills + perspective-taking
  connectWellSessions: [],
  addConnectWellSession: (session) => {
    set({ connectWellSessions: [...get().connectWellSessions, session], totalSessions: get().totalSessions + 1 });
    get().updateStreak();
    get().awardXP(60);
    syncToSheets('ConnectWell', get().participantCode, session);
    get().persist();
  },

  // CoolDown
  coolDownLogs: [],
  addCoolDownLog: (log) => {
    set({ coolDownLogs: [...get().coolDownLogs, log] });
    get().awardXP(70);
    syncToSheets('CoolDown', get().participantCode, log);
    get().persist();
  },

  // ScreenShift
  screenShiftGoalHours: 3,
  screenShiftLogs: [],

  setScreenShiftGoal: (hours) => {
    set({ screenShiftGoalHours: hours });
    get().persist();
  },

  addScreenShiftLog: (log) => {
    const logs = get().screenShiftLogs;
    const filtered = logs.filter(l => l.date !== log.date);
    set({ screenShiftLogs: [...filtered, log] });
    get().awardXP(log.metGoal ? 50 : 20);
    syncToSheets('ScreenShift', get().participantCode, log);
    get().persist();
  },

  // SleepGuard
  sleepTargetTime: { hour: 22, minute: 30 }, // 10:30 PM default
  sleepLogs: [],

  setSleepTargetTime: (hour, minute) => {
    set({ sleepTargetTime: { hour, minute } });
    get().persist();
  },

  addSleepLog: (log) => {
    const logs = get().sleepLogs;
    const today = new Date().toISOString().split('T')[0];
    const filtered = logs.filter(l => l.date !== today);
    set({ sleepLogs: [...filtered, log] });
    if (log.onTime) get().awardXP(150);
    syncToSheets('SleepGuard', get().participantCode, log);
    get().persist();
  },

  // Morning Routine
  morningTasks: [
    { id: '1', label: 'Wake up & get out of bed', icon: '⏰', mins: 5 },
    { id: '2', label: 'Shower or wash face',      icon: '🚿', mins: 10 },
    { id: '3', label: 'Get dressed',              icon: '👕', mins: 5 },
    { id: '4', label: 'Eat breakfast',            icon: '🍳', mins: 10 },
    { id: '5', label: 'Pack bag',                 icon: '🎒', mins: 5 },
  ],
  nightBeforeTasks: [
    { id: 'n1', label: 'Pick outfit for tomorrow',         icon: '👕', mins: 3 },
    { id: 'n2', label: 'Pack bag & gather everything',     icon: '🎒', mins: 5 },
    { id: 'n3', label: "Check tomorrow's schedule",        icon: '📅', mins: 2 },
    { id: 'n4', label: 'Charge phone & devices',           icon: '🔋', mins: 1 },
    { id: 'n5', label: 'Prepare lunch or snacks',          icon: '🥗', mins: 5 },
  ],
  morningLogs: [],
  morningNotificationTime: { hour: 7, minute: 0 },

  setMorningTasks: (tasks) => {
    set({ morningTasks: tasks });
    get().persist();
  },

  setNightBeforeTasks: (tasks) => {
    set({ nightBeforeTasks: tasks });
    get().persist();
  },

  addMorningLog: (log) => {
    set({ morningLogs: [...get().morningLogs, log] });
    get().updateStreak();
    get().awardXP(40);
    syncToSheets('DailyRoutine', get().participantCode, log);
  },

  setMorningNotificationTime: (hour, minute) => {
    set({ morningNotificationTime: { hour, minute } });
    get().persist();
  },

  // Module notification schedules
  moduleNotifications: {
    routine_morning:  { hour: 7,  minute: 0,  enabled: true },
    routine_night:    { hour: 22, minute: 0,  enabled: true },
    timewise:         { hour: 16, minute: 0,  enabled: true },
    moodbridge:       { hour: 16, minute: 30, enabled: true },
    focuscontrol:     { hour: 17, minute: 0,  enabled: true },
    memorybank:       { hour: 17, minute: 30, enabled: true },
    weeklyplanner:    { hour: 10, minute: 0,  enabled: true },
    weekly_practice:  { hour: 16, minute: 30, enabled: true }, // Tue & Thu 4:30pm
    // Life Skills — per-module ideal frequencies
    confidencecore:   { hour: 18, minute: 30, enabled: true }, // daily 6:30pm
    truenorth:        { hour: 19, minute: 0,  enabled: true }, // daily 7pm
    stillpoint:       { hour: 19, minute: 30, enabled: true }, // Mon/Wed/Fri 7:30pm
    connectwell:      { hour: 17, minute: 30, enabled: true }, // Mon/Wed 5:30pm
    thoughtcheck:     { hour: 17, minute: 0,  enabled: true }, // Tue/Thu 5pm
  },

  setModuleNotification: (key, settings) => {
    const updated = {
      ...get().moduleNotifications,
      [key]: { ...get().moduleNotifications[key], ...settings },
    };
    set({ moduleNotifications: updated });
    get().persist();
  },

  // Baseline & follow-up assessments (Week 0, 6, 12)
  baselineAssessments: [],

  addBaselineAssessment: (assessment) => {
    set({ baselineAssessments: [...get().baselineAssessments, assessment] });
    syncToSheets('Assessment', get().participantCode, assessment);
    get().persist();
  },

  // Research check-in
  weeklyCheckIns: [],

  addWeeklyCheckIn: (checkIn) => {
    set({ weeklyCheckIns: [...get().weeklyCheckIns, checkIn] });
    get().persist();
  },

  // Streak tracking
  updateStreak: () => {
    const today = new Date().toISOString().split('T')[0];
    const last = get().lastSessionDate;
    if (last === today) return;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const newStreak = last === yesterday ? get().currentStreak + 1 : 1;
    set({ currentStreak: newStreak, lastSessionDate: today });
    get().persist();
  },

  // Persistence
  persist: async () => {
    const s = get();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      onboardingComplete: s.onboardingComplete,
      userNickname: s.userNickname,
      trustedAdultName: s.trustedAdultName,
      diagnoses: s.diagnoses,
      topChallenges: s.topChallenges,
      participantCode: s.participantCode,
      isResearchParticipant: s.isResearchParticipant,
      currentStreak: s.currentStreak,
      totalSessions: s.totalSessions,
      lastSessionDate: s.lastSessionDate,
      xp: s.xp,
      level: s.level,
      unlockedBadges: s.unlockedBadges,
      skippedModules: s.skippedModules,
      themeMode: s.themeMode,
      consentGiven: s.consentGiven,
      consentDate: s.consentDate,
      timeWiseSessions: s.timeWiseSessions,
      timeWiseLevel: s.timeWiseLevel,
      planForwardSessions: s.planForwardSessions,
      focusControlSessions: s.focusControlSessions,
      focusNogoRatio: s.focusNogoRatio,
      memoryBankSessions: s.memoryBankSessions,
      memoryBankLevels:   s.memoryBankLevels,
      moodBridgeSessions: s.moodBridgeSessions,
      weeklyWins: s.weeklyWins,
      weeklyCheckIns: s.weeklyCheckIns,
      morningTasks: s.morningTasks,
      nightBeforeTasks: s.nightBeforeTasks,
      morningLogs: s.morningLogs,
      morningNotificationTime: s.morningNotificationTime,
      plannerTasks: s.plannerTasks,
      weeklyReviews: s.weeklyReviews,
      reviewNotificationTime: s.reviewNotificationTime,
      moduleNotifications: s.moduleNotifications,
      screenShiftGoalHours: s.screenShiftGoalHours,
      screenShiftLogs:      s.screenShiftLogs,
      sleepTargetTime: s.sleepTargetTime,
      sleepLogs: s.sleepLogs,
      socialBatteryLogs:         s.socialBatteryLogs,
      ownershipReflections:      s.ownershipReflections,
      sleepQualityLogs:          s.sleepQualityLogs,
      stillPointSessions:        s.stillPointSessions,
      quietModeLogs:             s.quietModeLogs,
      focusWatchSessions:        s.focusWatchSessions,
      medicationEnabled:         s.medicationEnabled,
      medicationTimes:           s.medicationTimes,
      medicationLogs:            s.medicationLogs,
      hyperfocusEnabled:         s.hyperfocusEnabled,
      hyperfocusIntervalMinutes: s.hyperfocusIntervalMinutes,
      bodyCheckIns:              s.bodyCheckIns,
      thoughtCheckSessions:  s.thoughtCheckSessions,
      hardMomentSessions:    s.hardMomentSessions,
      worryBreakSessions:    s.worryBreakSessions,
      sensoryLogs:          s.sensoryLogs,
      flexSwitchSessions:   s.flexSwitchSessions,
      glassBreakSessions:   s.glassBreakSessions,
      trueNorthValues:      s.trueNorthValues,
      trueNorthLogs:        s.trueNorthLogs,
      connectWellSessions:  s.connectWellSessions,
      coolDownLogs: s.coolDownLogs,
      angerCheckIns: s.angerCheckIns,
      baselineAssessments: s.baselineAssessments,
    }));
  },

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) set(prev => ({ ...prev, ...JSON.parse(raw) }));
  },
}));
