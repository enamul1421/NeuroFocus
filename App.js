import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from './src/store';
import { colors } from './src/theme';

// Screens
import Screen1Welcome from './src/screens/Onboarding/Screen1Welcome';
import Screen2Profile from './src/screens/Onboarding/Screen2Profile';
import Screen3Challenges from './src/screens/Onboarding/Screen3Challenges';
import Screen4Research from './src/screens/Onboarding/Screen4Research';
import Home from './src/screens/Home';
import TimeWise from './src/screens/Modules/TimeWise';
import WeeklyCheckIn from './src/screens/Research/WeeklyCheckIn';

// Placeholder for modules not yet built
function ComingSoon({ route, navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 28 }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>🚧</Text>
      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 8 }}>
        {route.name.replace('Placeholder', '')} Coming Soon
      </Text>
      <Text style={{ fontSize: 16, color: colors.textLight, textAlign: 'center', lineHeight: 24 }}>
        This module is under construction. TimeWise is available now.
      </Text>
      <Text
        style={{ marginTop: 24, fontSize: 16, color: colors.primary, fontWeight: '700' }}
        onPress={() => navigation.goBack()}
      >
        ← Back
      </Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

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
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {!onboardingComplete ? (
            // Onboarding flow
            <>
              <Stack.Screen name="Screen1Welcome" component={Screen1Welcome} />
              <Stack.Screen name="Screen2Profile" component={Screen2Profile} />
              <Stack.Screen name="Screen3Challenges" component={Screen3Challenges} />
              <Stack.Screen name="Screen4Research" component={Screen4Research} />
            </>
          ) : (
            // Main app
            <>
              <Stack.Screen name="Home" component={Home} />
              <Stack.Screen name="TimeWise" component={TimeWise} />
              <Stack.Screen name="WeeklyCheckIn" component={WeeklyCheckIn} />
              {/* Stage 2+ modules — placeholders */}
              <Stack.Screen name="PlanForwardPlaceholder" component={ComingSoon} />
              <Stack.Screen name="FocusControlPlaceholder" component={ComingSoon} />
              <Stack.Screen name="MoodBridgePlaceholder" component={ComingSoon} />
              <Stack.Screen name="ConfidenceCorePlaceholder" component={ComingSoon} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
