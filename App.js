import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from './src/store';
import { colors } from './src/theme';
import { ThemeProvider } from './src/context/theme';
import CelebrationModal from './src/components/CelebrationModal';
import SleepGuardModal from './src/components/SleepGuardModal';
import Consent from './src/screens/Consent';

// Onboarding
import Screen1Welcome from './src/screens/Onboarding/Screen1Welcome';
import Screen2Profile from './src/screens/Onboarding/Screen2Profile';
import Screen3Challenges from './src/screens/Onboarding/Screen3Challenges';
import Screen4Research from './src/screens/Onboarding/Screen4Research';

// Main screens
import Home from './src/screens/Home';
import WeeklyCheckIn from './src/screens/Research/WeeklyCheckIn';
import MorningRoutine from './src/screens/MorningRoutine';
import Progress from './src/screens/Progress';
import Admin from './src/screens/Admin';

// All 6 modules
import TimeWise from './src/screens/Modules/TimeWise';
import FocusControl from './src/screens/Modules/FocusControl';
import MemoryBank from './src/screens/Modules/MemoryBank';
import MoodBridge from './src/screens/Modules/MoodBridge';
import ConfidenceCore from './src/screens/Modules/ConfidenceCore';

// Weekly Planner
import WeeklyPlanner from './src/screens/WeeklyPlanner';
import AddTask from './src/screens/WeeklyPlanner/AddTask';
import WeeklyReview from './src/screens/WeeklyPlanner/WeeklyReview';
import WeeklyCalendar from './src/screens/WeeklyPlanner/WeeklyCalendar';
import NotificationSettings from './src/screens/NotificationSettings';
import BaselineAssessment from './src/screens/BaselineAssessment';
import ResearcherDashboard from './src/screens/ResearcherDashboard';
import { scheduleAllNotifications, scheduleSleepNotifications } from './src/services/notifications';
import SleepGuard from './src/screens/Modules/SleepGuard';
import CoolDown from './src/screens/Modules/CoolDown';
import ConnectWell from './src/screens/Modules/ConnectWell';
import TrueNorth from './src/screens/Modules/TrueNorth';
import GlassBreak from './src/screens/Modules/GlassBreak';
import TransitionTimer from './src/screens/TransitionTimer';
import StillPoint from './src/screens/Modules/StillPoint';
import QuietMode from './src/screens/Modules/QuietMode';
import FocusWatch from './src/screens/Modules/FocusWatch';
import OwnershipReflect from './src/screens/OwnershipReflect';
import ThoughtCheck from './src/screens/Modules/ThoughtCheck';
import HardMoment from './src/screens/Modules/HardMoment';
import WorryBreak from './src/screens/Modules/WorryBreak';
import SensoryShield from './src/screens/Modules/SensoryShield';
import SpeakUp from './src/screens/Modules/SpeakUp';
import FlexSwitch from './src/screens/Modules/FlexSwitch';

const Stack = createNativeStackNavigator();

const moduleHeader = {
  headerShown: true,
  headerTitle: '',
  headerBackTitle: '',
  headerShadowVisible: false,
  headerTintColor: '#5B5EA6',
};

export default function App() {
  const { onboardingComplete, consentGiven, hydrate, pendingCelebration, clearCelebration, themeMode } = useStore(s => ({
    onboardingComplete: s.onboardingComplete,
    consentGiven: s.consentGiven,
    hydrate: s.hydrate,
    pendingCelebration: s.pendingCelebration,
    clearCelebration: s.clearCelebration,
    themeMode: s.themeMode || 'system',
  }));
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    hydrate().then(() => {
      const { moduleNotifications, sleepTargetTime } = useStore.getState();
      scheduleAllNotifications(moduleNotifications);
      if (sleepTargetTime) scheduleSleepNotifications(sleepTargetTime.hour, sleepTargetTime.minute);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary }}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={{ color: '#fff', marginTop: 16, fontSize: 16, fontWeight: '600' }}>NeuroFocus</Text>
      </View>
    );
  }

  return (
    <ThemeProvider override={themeMode}>
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {!onboardingComplete ? (
            <>
              <Stack.Screen name="Screen1Welcome" component={Screen1Welcome} />
              <Stack.Screen name="Screen2Profile" component={Screen2Profile} />
              <Stack.Screen name="Screen3Challenges" component={Screen3Challenges} />
              <Stack.Screen name="Screen4Research" component={Screen4Research} />
            </>
          ) : !consentGiven ? (
            <>
              <Stack.Screen name="Consent" component={Consent} />
            </>
          ) : (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="WeeklyCheckIn" component={WeeklyCheckIn} options={moduleHeader} />
              <Stack.Screen name="TimeWise" component={TimeWise} />
              <Stack.Screen name="FocusControlPlaceholder" component={FocusControl} />
              <Stack.Screen name="MoodBridgePlaceholder" component={MoodBridge} />
              <Stack.Screen name="ConfidenceCorePlaceholder" component={ConfidenceCore} />
              <Stack.Screen name="MemoryBankPlaceholder" component={MemoryBank} />
              <Stack.Screen name="WeeklyPlanner" component={WeeklyPlanner} options={moduleHeader} />
              <Stack.Screen name="AddTask" component={AddTask} options={moduleHeader} />
              <Stack.Screen name="WeeklyReview" component={WeeklyReview} options={moduleHeader} />
              <Stack.Screen name="WeeklyCalendar" component={WeeklyCalendar} options={moduleHeader} />
              <Stack.Screen name="MorningRoutine" component={MorningRoutine} options={moduleHeader} />
              <Stack.Screen name="Progress" component={Progress} options={moduleHeader} />
              <Stack.Screen name="Admin" component={Admin} options={moduleHeader} />
              <Stack.Screen name="NotificationSettings" component={NotificationSettings} options={moduleHeader} />
              <Stack.Screen name="BaselineAssessment" component={BaselineAssessment} options={moduleHeader} />
              <Stack.Screen name="ResearcherDashboard" component={ResearcherDashboard} options={moduleHeader} />
              <Stack.Screen name="SleepGuard" component={SleepGuard} />
              <Stack.Screen name="CoolDown" component={CoolDown} />
              <Stack.Screen name="ConnectWell" component={ConnectWell} />
              <Stack.Screen name="TrueNorth" component={TrueNorth} />
              <Stack.Screen name="GlassBreak" component={GlassBreak} />
              <Stack.Screen name="TransitionTimer" component={TransitionTimer} options={moduleHeader} />
              <Stack.Screen name="StillPoint" component={StillPoint} />
              <Stack.Screen name="QuietMode" component={QuietMode} />
              <Stack.Screen name="FocusWatch" component={FocusWatch} />
              <Stack.Screen name="OwnershipReflect" component={OwnershipReflect} options={moduleHeader} />
              <Stack.Screen name="ThoughtCheck" component={ThoughtCheck} />
              <Stack.Screen name="HardMoment" component={HardMoment} />
              <Stack.Screen name="WorryBreak" component={WorryBreak} />
              <Stack.Screen name="SensoryShield" component={SensoryShield} />
              <Stack.Screen name="SpeakUp" component={SpeakUp} />
              <Stack.Screen name="FlexSwitch" component={FlexSwitch} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
      <CelebrationModal celebration={pendingCelebration} onDismiss={clearCelebration} />
      <SleepGuardModal />
    </SafeAreaProvider>
    </ThemeProvider>
  );
}
