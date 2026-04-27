import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'neurofocus_state';

export const useStore = create((set, get) => ({
  // Onboarding
  onboardingComplete: false,
  userNickname: '',
  diagnoses: [],          // ['adhd', 'asd', 'dyslexia', 'anxiety', 'other']
  topChallenges: [],      // up to 2 from 6 options
  participantCode: '',    // e.g. 'P001'; empty = not in study
  isResearchParticipant: false,

  setOnboardingData: (data) => set(data),
  completeOnboarding: () => set({ onboardingComplete: true }),

  // Session state
  currentStreak: 0,
  totalSessions: 0,
  lastSessionDate: null,

  // TimeWise data
  timeWiseSessions: [],   // array of { date, accuracyCoefficients[], avgCoeff, intervals[] }
  timeWiseLevel: 1,       // 1–5

  addTimeWiseSession: (session) => {
    const sessions = [...get().timeWiseSessions, session];
    set({ timeWiseSessions: sessions });
    // Level up check: avg accuracy >= 0.85 over last 3 sessions
    if (sessions.length >= 3) {
      const recent = sessions.slice(-3).map(s => s.avgCoeff);
      const avg = recent.reduce((a, b) => a + b, 0) / 3;
      if (avg >= 0.85 && get().timeWiseLevel < 5) {
        set({ timeWiseLevel: get().timeWiseLevel + 1 });
      }
    }
    get().persist();
  },

  // Research check-in data
  weeklyCheckIns: [],     // array of { week, date, homework, prepared, morning }

  addWeeklyCheckIn: (checkIn) => {
    set({ weeklyCheckIns: [...get().weeklyCheckIns, checkIn] });
    get().persist();
  },

  // Persistence
  persist: async () => {
    const state = get();
    const toSave = {
      onboardingComplete: state.onboardingComplete,
      userNickname: state.userNickname,
      diagnoses: state.diagnoses,
      topChallenges: state.topChallenges,
      participantCode: state.participantCode,
      isResearchParticipant: state.isResearchParticipant,
      currentStreak: state.currentStreak,
      totalSessions: state.totalSessions,
      lastSessionDate: state.lastSessionDate,
      timeWiseSessions: state.timeWiseSessions,
      timeWiseLevel: state.timeWiseLevel,
      weeklyCheckIns: state.weeklyCheckIns,
    };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  },

  hydrate: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      set(saved);
    }
  },
}));
