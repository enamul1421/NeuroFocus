import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'neurofocus_state';

export const useStore = create((set, get) => ({
  // Onboarding
  onboardingComplete: false,
  userNickname: '',
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

  // TimeWise
  timeWiseSessions: [],
  timeWiseLevel: 1,

  addTimeWiseSession: (session) => {
    set({
      timeWiseSessions: [...get().timeWiseSessions, session],
      totalSessions: get().totalSessions + 1,
    });
    get().persist();
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
    get().persist();
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
    get().persist();
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
    get().persist();
  },

  // ConfidenceCore — win archive
  weeklyWins: [],

  addWin: (win) => {
    set({ weeklyWins: [...get().weeklyWins, win] });
    get().persist();
  },

  // Morning Routine
  morningTasks: [
    { id: '1', label: 'Wake up & get out of bed', mins: 5 },
    { id: '2', label: 'Shower or wash face', mins: 10 },
    { id: '3', label: 'Get dressed', mins: 5 },
    { id: '4', label: 'Eat breakfast', mins: 10 },
    { id: '5', label: 'Pack bag', mins: 5 },
  ],
  morningLogs: [],

  setMorningTasks: (tasks) => {
    set({ morningTasks: tasks });
    get().persist();
  },

  addMorningLog: (log) => {
    set({ morningLogs: [...get().morningLogs, log] });
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
      diagnoses: s.diagnoses,
      topChallenges: s.topChallenges,
      participantCode: s.participantCode,
      isResearchParticipant: s.isResearchParticipant,
      currentStreak: s.currentStreak,
      totalSessions: s.totalSessions,
      lastSessionDate: s.lastSessionDate,
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
      morningLogs: s.morningLogs,
      plannerTasks: s.plannerTasks,
      weeklyReviews: s.weeklyReviews,
      reviewNotificationTime: s.reviewNotificationTime,
    }));
  },

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) set(JSON.parse(raw));
  },
}));
