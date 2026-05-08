import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

const ALL_MODULES = [
  {
    key: 'time',
    label: 'TimeWise',
    icon: '⏱',
    route: 'TimeWise',
    desc: 'Train your internal clock',
    goal: 'Accuracy coefficient → 0.85+',
  },
  {
    key: 'planning',
    label: 'Weekly Planner',
    icon: '📋',
    route: 'WeeklyPlanner',
    desc: 'Plan tasks before they sneak up',
    goal: 'Add tasks, schedule steps, review weekly',
  },
  {
    key: 'focus',
    label: 'FocusControl',
    icon: '🎯',
    route: 'FocusControlPlaceholder',
    desc: 'Stop impulses before they happen',
    goal: 'Hit rate → 90%+, false alarms → 0',
  },
  {
    key: 'memory',
    label: 'MemoryBank',
    icon: '🧠',
    route: 'MemoryBankPlaceholder',
    desc: 'Hold more in your working memory',
    goal: 'Digit span → level 6+',
  },
  {
    key: 'emotion',
    label: 'MoodBridge',
    icon: '🌊',
    route: 'MoodBridgePlaceholder',
    desc: 'Regulate emotions before they derail you',
    goal: 'Mood improves from pre to post session',
  },
  {
    key: 'confidence',
    label: 'ConfidenceCore',
    icon: '⚡',
    route: 'ConfidenceCorePlaceholder',
    desc: 'Build belief in your own capability',
    goal: 'Win archive grows every session',
  },
];

const CHALLENGE_TO_KEY = {
  time: 'time', initiation: 'planning', planning: 'planning',
  focus: 'focus', emotion: 'emotion', confidence: 'confidence',
};

export default function Home({ navigation }) {
  const { userNickname, topChallenges, currentStreak, totalSessions, weeklyCheckIns } = useStore(s => ({
    userNickname: s.userNickname,
    topChallenges: s.topChallenges,
    currentStreak: s.currentStreak,
    totalSessions: s.totalSessions,
    weeklyCheckIns: s.weeklyCheckIns,
  }));

  const todayKeys = new Set(['time']);
  topChallenges.forEach(c => { if (CHALLENGE_TO_KEY[c]) todayKeys.add(CHALLENGE_TO_KEY[c]); });

  const todayModules = ALL_MODULES.filter(m => todayKeys.has(m.key));

  const isCheckInDue = (() => {
    if (weeklyCheckIns.length === 0) return true;
    const last = new Date(weeklyCheckIns[weeklyCheckIns.length - 1].date);
    return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) >= 6;
  })();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  })();

  function ModuleRow({ mod, today }) {
    return (
      <TouchableOpacity
        style={[styles.moduleRow, today && styles.moduleRowToday]}
        onPress={() => navigation.navigate(mod.route)}
      >
        <Text style={styles.moduleIcon}>{mod.icon}</Text>
        <View style={styles.moduleInfo}>
          <View style={styles.moduleNameRow}>
            <Text style={styles.moduleName}>{mod.label}</Text>
            {today && <View style={styles.todayBadge}><Text style={styles.todayBadgeText}>Today</Text></View>}
          </View>
          <Text style={styles.moduleDesc}>{mod.desc}</Text>
          <Text style={styles.moduleGoal}>🎯 {mod.goal}</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}{userNickname ? `, ${userNickname}` : ''}</Text>
            <Text style={styles.subGreeting}>NeuroFocus</Text>
          </View>
          {currentStreak > 0 && (
            <View style={styles.streak}>
              <Text style={styles.streakText}>🔥 {currentStreak}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
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
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>

        {/* Weekly check-in */}
        {isCheckInDue && (
          <TouchableOpacity style={styles.checkInBanner} onPress={() => navigation.navigate('WeeklyCheckIn')}>
            <Text style={styles.moduleIcon}>📊</Text>
            <View style={styles.moduleInfo}>
              <Text style={[styles.moduleName, { color: colors.primary }]}>Weekly check-in</Text>
              <Text style={styles.moduleDesc}>3 questions about homework, class, and mornings</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Today */}
        <Text style={styles.sectionLabel}>TODAY</Text>
        <View style={styles.card}>
          {todayModules.map((mod, i) => (
            <View key={mod.key}>
              <ModuleRow mod={mod} today />
              {i < todayModules.length - 1 && <View style={styles.divider} />}
            </View>
          ))}
        </View>

        {/* Quick access */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('MorningRoutine')}>
            <Text style={styles.quickIcon}>☀️</Text>
            <Text style={styles.quickLabel}>Morning</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.quickIcon}>📈</Text>
            <Text style={styles.quickLabel}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Admin')}>
            <Text style={styles.quickIcon}>🔒</Text>
            <Text style={styles.quickLabel}>Admin</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, paddingBottom: 36 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text },
  subGreeting: { fontSize: 13, color: colors.textLight, marginTop: 1 },
  streak: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontSize: 15, color: colors.primary, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textLight, marginTop: 2 },

  checkInBanner: {
    backgroundColor: colors.primaryLight, borderRadius: 14, borderWidth: 1.5,
    borderColor: colors.primary, flexDirection: 'row', alignItems: 'center',
    padding: 14, marginBottom: 14,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '800', color: colors.textLight,
    letterSpacing: 1.2, marginBottom: 8, marginTop: 4,
  },

  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 16, overflow: 'hidden' },

  moduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  moduleRowToday: { backgroundColor: '#FAFAFE' },
  moduleIcon: { fontSize: 22, marginRight: 12, width: 30, textAlign: 'center' },
  moduleInfo: { flex: 1 },
  moduleNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  moduleName: { fontSize: 15, fontWeight: '800', color: colors.text },
  moduleDesc: { fontSize: 13, color: colors.textLight, marginBottom: 3 },
  moduleGoal: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  todayBadge: { backgroundColor: colors.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  todayBadgeText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  arrow: { fontSize: 18, color: colors.primary, fontWeight: '700', marginLeft: 8 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginLeft: 56 },

  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', padding: 12, alignItems: 'center' },
  quickIcon: { fontSize: 20, marginBottom: 4 },
  quickLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
});
