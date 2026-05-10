import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

// ── Module groups ─────────────────────────────────────────────────────────────

const GROUPS = [
  {
    key: 'daily',
    label: 'TODAY',
    color: '#FF9800',
    bg: '#FFF8F0',
    hint: 'Build daily habits — do these every day',
    modules: [
      { key: 'routine',  label: 'Daily Routine',  icon: '☀️', route: 'MorningRoutine',          desc: 'Morning prep + night before',     goal: 'Complete every day' },
      { key: 'time',     label: 'TimeWise',        icon: '⏱', route: 'TimeWise',                desc: 'Train your internal clock',       goal: 'Accuracy → 0.85+' },
      { key: 'mood',     label: 'MoodBridge',      icon: '🌊', route: 'MoodBridgePlaceholder',   desc: 'Check in and regulate emotions',  goal: 'Mood improves pre → post' },
    ],
  },
  {
    key: 'weekly',
    label: 'THIS WEEK',
    color: colors.primary,
    bg: colors.primaryLight,
    hint: '3–5 sessions per week for training effect',
    modules: [
      { key: 'focus',   label: 'FocusControl',   icon: '🎯', route: 'FocusControlPlaceholder', desc: 'Stop impulses before they happen', goal: 'Brake score → 80+' },
      { key: 'memory',  label: 'MemoryBank',      icon: '🧠', route: 'MemoryBankPlaceholder',   desc: 'Hold more in working memory',     goal: 'Digit span → level 6+' },
      { key: 'planner', label: 'Weekly Planner',  icon: '📋', route: 'WeeklyPlanner',           desc: 'Plan tasks before they sneak up', goal: 'Add tasks · review weekly' },
    ],
  },
  {
    key: 'anytime',
    label: 'ANYTIME',
    color: '#4CAF50',
    bg: '#F1F8E9',
    hint: 'After any win, or when you need a lift',
    modules: [
      { key: 'confidence', label: 'ConfidenceCore', icon: '⚡', route: 'ConfidenceCorePlaceholder', desc: 'Build belief in your capability', goal: 'Win archive grows every session' },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Home({ navigation }) {
  const {
    userNickname, currentStreak, totalSessions, weeklyCheckIns,
    timeWiseSessions, focusControlSessions, memoryBankSessions,
    moodBridgeSessions, morningLogs, weeklyWins, plannerTasks,
  } = useStore(s => ({
    userNickname:         s.userNickname,
    currentStreak:        s.currentStreak,
    totalSessions:        s.totalSessions,
    weeklyCheckIns:       s.weeklyCheckIns      || [],
    timeWiseSessions:     s.timeWiseSessions     || [],
    focusControlSessions: s.focusControlSessions || [],
    memoryBankSessions:   s.memoryBankSessions   || [],
    moodBridgeSessions:   s.moodBridgeSessions   || [],
    morningLogs:          s.morningLogs          || [],
    weeklyWins:           s.weeklyWins           || [],
    plannerTasks:         s.plannerTasks         || [],
  }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  })();

  const isCheckInDue = (() => {
    if (weeklyCheckIns.length === 0) return true;
    const last = new Date(weeklyCheckIns[weeklyCheckIns.length - 1].date);
    return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) >= 6;
  })();

  // ── Daily completion badges ───────────────────────────────────────────────

  const today = new Date().toDateString();

  function doneToday(sessions) {
    return sessions.some(s => new Date(s.date).toDateString() === today);
  }

  const routineDone  = morningLogs.some(l => new Date(l.date).toDateString() === today && l.allCompleted);
  const timeDone     = doneToday(timeWiseSessions);
  const moodDone     = doneToday(moodBridgeSessions);

  // ── This-week session counts ──────────────────────────────────────────────

  function sessionsThisWeek(sessions) {
    const monday = new Date();
    monday.setDate(monday.getDate() - (monday.getDay() === 0 ? 6 : monday.getDay() - 1));
    monday.setHours(0, 0, 0, 0);
    return sessions.filter(s => new Date(s.date) >= monday).length;
  }

  const fcThisWeek  = sessionsThisWeek(focusControlSessions);
  const mbThisWeek  = sessionsThisWeek(memoryBankSessions);
  const activeTasks = plannerTasks.filter(t => t.status === 'active').length;

  // ── Per-module done state ─────────────────────────────────────────────────

  function moduleState(key) {
    if (key === 'routine')    return { done: routineDone, badge: null };
    if (key === 'time')       return { done: timeDone,    badge: null };
    if (key === 'mood')       return { done: moodDone,    badge: null };
    if (key === 'focus')      return { done: false, badge: `${fcThisWeek} this week` };
    if (key === 'memory')     return { done: false, badge: `${mbThisWeek} this week` };
    if (key === 'planner')    return { done: false, badge: `${activeTasks} active` };
    if (key === 'confidence') return { done: false, badge: weeklyWins.length > 0 ? `${weeklyWins.length} wins` : null };
    return { done: false, badge: null };
  }

  // ─────────────────────────────────────────────────────────────────────────

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
            <Text style={styles.statValue}>{weeklyWins.length}</Text>
            <Text style={styles.statLabel}>Wins</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{activeTasks}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
        </View>

        {/* Weekly check-in */}
        {isCheckInDue && (
          <TouchableOpacity style={styles.checkInBanner} onPress={() => navigation.navigate('WeeklyCheckIn')}>
            <Text style={styles.checkInIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.checkInTitle}>Weekly check-in due</Text>
              <Text style={styles.checkInSub}>3 questions · takes 1 minute</Text>
            </View>
            <Text style={styles.checkInArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Module groups */}
        {GROUPS.map(group => (
          <View key={group.key} style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: group.color }]} />
              <Text style={[styles.groupLabel, { color: group.color }]}>{group.label}</Text>
            </View>
            <Text style={styles.groupHint}>{group.hint}</Text>

            <View style={[styles.groupCard, { borderColor: group.color + '30' }]}>
              {group.modules.map((mod, i) => {
                const { done, badge } = moduleState(mod.key);
                return (
                  <View key={mod.key}>
                    <TouchableOpacity
                      style={styles.moduleRow}
                      onPress={() => navigation.navigate(mod.route)}
                    >
                      <Text style={styles.moduleIcon}>{mod.icon}</Text>
                      <Text style={styles.moduleName}>{mod.label}</Text>
                      <View style={styles.moduleBadges}>
                        {done && (
                          <View style={styles.doneBadge}>
                            <Text style={styles.doneBadgeText}>✓</Text>
                          </View>
                        )}
                        {!done && badge && (
                          <View style={[styles.countBadge, { backgroundColor: group.color + '18' }]}>
                            <Text style={[styles.countBadgeText, { color: group.color }]}>{badge}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.arrow, { color: group.color }]}>›</Text>
                    </TouchableOpacity>
                    {i < group.modules.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Footer: Progress + Admin */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.footerIcon}>📈</Text>
            <Text style={styles.footerLabel}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerBtn} onPress={() => navigation.navigate('Admin')}>
            <Text style={styles.footerIcon}>🔒</Text>
            <Text style={styles.footerLabel}>Admin</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { padding: 18, paddingBottom: 36 },

  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  greeting:   { fontSize: 22, fontWeight: '800', color: colors.text },
  subGreeting:{ fontSize: 13, color: colors.textLight, marginTop: 1 },
  streak:     { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  streakText: { fontSize: 15, color: colors.primary, fontWeight: '800' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  statBox:  { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue:{ fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel:{ fontSize: 10, color: colors.textLight, marginTop: 1, textAlign: 'center' },

  checkInBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryLight, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, padding: 12, marginBottom: 20 },
  checkInIcon:   { fontSize: 22 },
  checkInTitle:  { fontSize: 14, fontWeight: '800', color: colors.primary },
  checkInSub:    { fontSize: 12, color: colors.primary, opacity: 0.8, marginTop: 1 },
  checkInArrow:  { fontSize: 18, color: colors.primary, fontWeight: '700' },

  groupBlock:  { marginBottom: 20 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  groupDot:    { width: 8, height: 8, borderRadius: 4 },
  groupLabel:  { fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  groupHint:   { fontSize: 12, color: colors.textLight, marginBottom: 8 },
  groupCard:   { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },

  moduleRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  moduleIcon:   { fontSize: 20, width: 26, textAlign: 'center' },
  moduleName:   { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  moduleBadges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  arrow:        { fontSize: 18, fontWeight: '700', marginLeft: 2 },
  divider:      { height: 1, backgroundColor: '#F5F5F5', marginLeft: 54 },

  doneBadge:     { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  doneBadgeText: { fontSize: 10, color: '#4CAF50', fontWeight: '700' },
  countBadge:     { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  countBadgeText: { fontSize: 10, fontWeight: '700' },

  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  footerBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', padding: 12, alignItems: 'center' },
  footerIcon:{ fontSize: 20, marginBottom: 4 },
  footerLabel:{ fontSize: 12, fontWeight: '700', color: colors.text },
});
