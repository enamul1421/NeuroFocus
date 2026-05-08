import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from './src/store';
import { colors } from './src/theme';

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
import PlanForward from './src/screens/Modules/PlanForward';
import FocusControl from './src/screens/Modules/FocusControl';
import MemoryBank from './src/screens/Modules/MemoryBank';
import MoodBridge from './src/screens/Modules/MoodBridge';
import ConfidenceCore from './src/screens/Modules/ConfidenceCore';

// Weekly Planner
import WeeklyPlanner from './src/screens/WeeklyPlanner';
import AddTask from './src/screens/WeeklyPlanner/AddTask';
import WeeklyReview from './src/screens/WeeklyPlanner/WeeklyReview';
import WeeklyCalendar from './src/screens/WeeklyPlanner/WeeklyCalendar';

const Stack = createNativeStackNavigator();

const moduleHeader = {
  headerShown: true,
  headerTitle: '',
  headerBackTitle: '',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: '#F9F9F9' },
  headerTintColor: '#5B5EA6',
};

export default function App() {
  const { onboardingComplete, hydrate } = useStore(s => ({
    onboardingComplete: s.onboardingComplete,
    hydrate: s.hydrate,
  }));
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    hydrate().finally(() => setLoading(false));
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
          ) : (
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="WeeklyCheckIn" component={WeeklyCheckIn} options={moduleHeader} />
              <Stack.Screen name="TimeWise" component={TimeWise} options={moduleHeader} />
              <Stack.Screen name="PlanForwardPlaceholder" component={PlanForward} options={moduleHeader} />
              <Stack.Screen name="FocusControlPlaceholder" component={FocusControl} options={moduleHeader} />
              <Stack.Screen name="MoodBridgePlaceholder" component={MoodBridge} options={moduleHeader} />
              <Stack.Screen name="ConfidenceCorePlaceholder" component={ConfidenceCore} options={moduleHeader} />
              <Stack.Screen name="MemoryBankPlaceholder" component={MemoryBank} options={moduleHeader} />
              <Stack.Screen name="WeeklyPlanner" component={WeeklyPlanner} options={moduleHeader} />
              <Stack.Screen name="AddTask" component={AddTask} options={{ ...moduleHeader, headerShown: false }} />
              <Stack.Screen name="WeeklyReview" component={WeeklyReview} options={{ ...moduleHeader, headerShown: false }} />
              <Stack.Screen name="WeeklyCalendar" component={WeeklyCalendar} options={{ ...moduleHeader, headerShown: false }} />
              <Stack.Screen name="MorningRoutine" component={MorningRoutine} options={moduleHeader} />
              <Stack.Screen name="Progress" component={Progress} options={moduleHeader} />
              <Stack.Screen name="Admin" component={Admin} options={moduleHeader} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
