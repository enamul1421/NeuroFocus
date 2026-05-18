import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography } from '../../theme';

export default function Screen1Welcome({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NeuroFocus</Text>
        </View>

        <Text style={styles.headline}>Built for brains{'\n'}like ours.</Text>

        <Text style={styles.body}>
          NeuroFocus was designed by a neurodivergent high schooler,
          for neurodivergent high schoolers.
        </Text>

        <Text style={styles.body}>
          20+ tools across 4 areas. Built on real science. Used daily, at our own pace.
        </Text>

        <View style={styles.pillList}>
          {['🌅 Daily Habits', '🧠 Brain Gym', '🌱 Life Skills', '🆘 Anytime Support'].map(area => (
            <View key={area} style={styles.pill}>
              <Text style={styles.pillText}>{area}</Text>
            </View>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Screen2Profile')}
        accessibilityLabel="Get started with NeuroFocus setup"
      >
        <Text style={styles.buttonText}>Let's set up your profile →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 28, justifyContent: 'center' },
  badge: {
    backgroundColor: colors.primary,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  headline: {
    fontSize: 38,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 46,
    marginBottom: 20,
  },
  body: {
    fontSize: 18,
    color: colors.textLight,
    lineHeight: 26,
    marginBottom: 16,
  },
  pillList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  pill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  pillText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  button: {
    backgroundColor: colors.primary,
    marginHorizontal: 28,
    marginBottom: 32,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
