import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

const MODULE_CONFIG = {
  time:       { key: 'TimeWise',       label: 'TimeWise',       icon: '⏱', mins: '8 min',  route: 'TimeWise' },
  initiation: { key: 'PlanForward',    label: 'PlanForward',    icon: '📋', mins: '6 min',  route: 'PlanForwardPlaceholder' },
  planning:   { key: 'PlanForward',    label: 'PlanForward',    icon: '📋', mins: '6 min',  route: 'PlanForwardPlaceholder' },
  focus:      { key: 'FocusControl',   label: 'FocusControl',   icon: '🎯', mins: '5 min',  route: 'FocusControlPlaceholder' },
  emotion:    { key: 'MoodBridge',     label: 'MoodBridge',     icon: '🌊', mins: '4 min',  route: 'MoodBridgePlaceholder' },
  confidence: { key: 'ConfidenceCore', label: 'ConfidenceCore', icon: '⚡', mins: '4 min',  route: 'ConfidenceCorePlaceholder' },
};

export default function Home({ navigation }) {
  const { userNickname, topChallenges, currentStreak, totalSessions, weeklyCheckIns } = useStore(s => ({
    userNickname: s.userNickname,
    topChallenges: s.topChallenges,
    currentStreak: s.currentStreak,
    totalSessions: s.totalSessions,
    weeklyCheckIns: s.weeklyCheckIns,
  }));

  // Build today's session: user's top 2 challenges + TimeWise always included
  const sessionModules = (() => {
    const keys = new Set(['time']); // TimeWise always in Stage 1
    topChallenges.forEach(c => keys.add(c));
    return [...keys].slice(0, 3).map(k => MODULE_CONFIG[k]).filter(Boolean);
  })();

  // Check if weekly check-in is due (Sunday, or no check-in this week)
  const isCheckInDue = (() => {
    if (weeklyCheckIns.length === 0) return true;
    const lastCheckIn = new Date(weeklyCheckIns[weeklyCheckIns.length - 1].date);
    const daysSince = (Date.now() - lastCheckIn.getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 6;
  })();

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greeting}{userNickname ? `, ${userNickname}` : ''}!
          </Text>
          {currentStreak > 0 && (
            <View style={styles.streak}>
              <Text style={styles.streakText}>🔥 {currentStreak}-day streak</Text>
            </View>
          )}
        </View>

        {/* Today's session card */}
        <View style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>Today's session</Text>
          <Text style={styles.sessionSubtitle}>
            ~{sessionModules.reduce((sum, m) => sum + parseInt(m.mins), 0)} minutes total
          </Text>

          {sessionModules.map((mod, i) => (
            <TouchableOpacity
              key={i}
              style={styles.moduleRow}
              onPress={() => navigation.navigate(mod.route)}
              accessibilityLabel={`Start ${mod.label} module`}
            >
              <Text style={styles.moduleIcon}>{mod.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleName}>{mod.label}</Text>
                <Text style={styles.moduleMins}>{mod.mins}</Text>
              </View>
              <Text style={styles.moduleArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly check-in banner */}
        {isCheckInDue && (
          <TouchableOpacity
            style={styles.checkInBanner}
            onPress={() => navigation.navigate('WeeklyCheckIn')}
          >
            <Text style={styles.checkInIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkInTitle}>Weekly check-in</Text>
              <Text style={styles.checkInSub}>3 quick questions about your week</Text>
            </View>
            <Text style={styles.moduleArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeklyCheckIns.length}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
        </View>

        {/* Stage 1 note */}
        <Text style={styles.stageNote}>
          Stage 1 build · More modules coming soon
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 24, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  streak: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  sessionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sessionSubtitle: { fontSize: 13, color: colors.textLight, marginBottom: 16 },
  moduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: '#F0F0F0',
  },
  moduleIcon: { fontSize: 22, marginRight: 14 },
  moduleName: { fontSize: 16, fontWeight: '700', color: colors.text },
  moduleMins: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  moduleArrow: { fontSize: 20, color: colors.primary, fontWeight: '700' },
  checkInBanner: {
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  checkInIcon: { fontSize: 22, marginRight: 14 },
  checkInTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  checkInSub: { fontSize: 13, color: colors.primary, opacity: 0.8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  stageNote: { textAlign: 'center', fontSize: 12, color: '#CCC', fontStyle: 'italic' },
});
