import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

function AccuracyBar({ coeff }) {
  const pct = Math.min(Math.round(coeff * 100), 100);
  const color = pct >= 85 ? colors.success : pct >= 65 ? colors.primary : '#F57C00';
  return (
    <View style={styles.barRow}>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barLabel, { color }]}>{coeff.toFixed(2)}</Text>
    </View>
  );
}

export default function Progress({ navigation }) {
  const {
    timeWiseSessions, timeWiseLevel, weeklyCheckIns, weeklyWins,
    totalSessions, currentStreak, planForwardSessions,
    focusControlSessions, memoryBankSessions, moodBridgeSessions,
  } = useStore(s => ({
    timeWiseSessions: s.timeWiseSessions || [],
    timeWiseLevel: s.timeWiseLevel || 1,
    weeklyCheckIns: s.weeklyCheckIns || [],
    weeklyWins: s.weeklyWins || [],
    totalSessions: s.totalSessions || 0,
    currentStreak: s.currentStreak || 0,
    planForwardSessions: s.planForwardSessions || [],
    focusControlSessions: s.focusControlSessions || [],
    memoryBankSessions: s.memoryBankSessions || [],
    moodBridgeSessions: s.moodBridgeSessions || [],
  }));

  const recentTW = timeWiseSessions.slice(-7);
  const avgCoeff = recentTW.length > 0
    ? recentTW.reduce((sum, s) => sum + (s.avgCoeff || 0), 0) / recentTW.length
    : null;

  const recentHitRate = focusControlSessions.slice(-5);
  const avgHit = recentHitRate.length > 0
    ? Math.round(recentHitRate.reduce((s, r) => s + (r.hitRate || 0), 0) / recentHitRate.length)
    : null;

  const recentMem = memoryBankSessions.slice(-5);
  const avgSpan = recentMem.length > 0
    ? Math.round(recentMem.reduce((s, r) => s + (r.maxSpanReached || 3), 0) / recentMem.length * 10) / 10
    : null;

  const moduleCounts = [
    { label: 'TimeWise', icon: '⏱', count: timeWiseSessions.length },
    { label: 'PlanForward', icon: '📋', count: planForwardSessions.length },
    { label: 'FocusControl', icon: '🎯', count: focusControlSessions.length },
    { label: 'MemoryBank', icon: '🧠', count: memoryBankSessions.length },
    { label: 'MoodBridge', icon: '🌊', count: moodBridgeSessions.length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>Progress</Text>

        {/* Overview stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Total sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentStreak}</Text>
            <Text style={styles.statLabel}>Day streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeklyCheckIns.length}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
        </View>

        {/* TimeWise accuracy */}
        <Text style={styles.sectionTitle}>⏱ Time Estimation Accuracy</Text>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardStat}>Level {timeWiseLevel} / 5</Text>
            {avgCoeff !== null && (
              <Text style={styles.cardStat}>Avg: {avgCoeff.toFixed(2)}</Text>
            )}
          </View>
          {recentTW.length === 0
            ? <Text style={styles.empty}>No sessions yet. Start TimeWise from the Home screen.</Text>
            : recentTW.map((s, i) => (
              <View key={i} style={styles.sessionRow}>
                <Text style={styles.sessionDate}>{s.date?.slice(5) || `Session ${i + 1}`}</Text>
                <AccuracyBar coeff={s.avgCoeff || 0} />
              </View>
            ))
          }
          <Text style={styles.cardNote}>Target: 0.85+ · 1.0 = perfect</Text>
        </View>

        {/* Focus & Memory */}
        <View style={styles.row2}>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.miniTitle}>🎯 Focus</Text>
            {avgHit !== null
              ? <>
                  <Text style={styles.bigNum}>{avgHit}%</Text>
                  <Text style={styles.cardNote}>Avg hit rate</Text>
                </>
              : <Text style={styles.empty}>No data yet</Text>
            }
          </View>
          <View style={[styles.card, { flex: 1 }]}>
            <Text style={styles.miniTitle}>🧠 Memory</Text>
            {avgSpan !== null
              ? <>
                  <Text style={styles.bigNum}>{avgSpan}</Text>
                  <Text style={styles.cardNote}>Avg span</Text>
                </>
              : <Text style={styles.empty}>No data yet</Text>
            }
          </View>
        </View>

        {/* Module usage */}
        <Text style={styles.sectionTitle}>Module usage</Text>
        <View style={styles.card}>
          {moduleCounts.map(m => (
            <View key={m.label} style={styles.moduleUsageRow}>
              <Text style={styles.moduleUsageIcon}>{m.icon}</Text>
              <Text style={styles.moduleUsageLabel}>{m.label}</Text>
              <View style={styles.usageBarBg}>
                <View style={[styles.usageBarFill, {
                  width: totalSessions > 0 ? `${Math.min((m.count / Math.max(totalSessions, 1)) * 100, 100)}%` : '0%'
                }]} />
              </View>
              <Text style={styles.moduleUsageCount}>{m.count}</Text>
            </View>
          ))}
        </View>

        {/* Win archive */}
        <Text style={styles.sectionTitle}>⚡ Win archive</Text>
        <View style={styles.card}>
          {weeklyWins.length === 0
            ? <Text style={styles.empty}>Wins appear here after ConfidenceCore sessions.</Text>
            : weeklyWins.slice(-5).reverse().map((w, i) => (
              <View key={i} style={[styles.winRow, i > 0 && styles.winBorder]}>
                <Text style={styles.winDate}>{w.date?.slice(5)}</Text>
                <Text style={styles.winText}>"{w.text}"</Text>
              </View>
            ))
          }
        </View>

        {/* Weekly check-in trend */}
        {weeklyCheckIns.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📊 Weekly check-ins</Text>
            <View style={styles.card}>
              {weeklyCheckIns.slice(-4).map((c, i) => (
                <View key={i} style={[styles.checkInRow, i > 0 && styles.winBorder]}>
                  <Text style={styles.winDate}>Week {c.week}</Text>
                  <Text style={styles.checkInScore}>HW: {c.homework}/5</Text>
                  <Text style={styles.checkInScore}>Class: {c.prepared}/5</Text>
                  <Text style={styles.checkInScore}>AM: {c.morning}/5</Text>
                </View>
              ))}
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: 18, paddingBottom: 40 },
  headline: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 8, marginTop: 4 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue: { fontSize: 26, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textLight, marginTop: 2, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EBEBEB' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardStat: { fontSize: 13, fontWeight: '700', color: colors.primary },
  cardNote: { fontSize: 11, color: colors.textLight, marginTop: 10, fontStyle: 'italic' },
  sessionRow: { marginBottom: 8 },
  sessionDate: { fontSize: 11, color: colors.textLight, marginBottom: 3 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barBg: { flex: 1, height: 10, backgroundColor: '#F0F0F0', borderRadius: 5, overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 5 },
  barLabel: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 0 },
  miniTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  bigNum: { fontSize: 36, fontWeight: '900', color: colors.text },
  empty: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
  moduleUsageRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  moduleUsageIcon: { fontSize: 16, marginRight: 8 },
  moduleUsageLabel: { fontSize: 13, color: colors.text, width: 90 },
  usageBarBg: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  usageBarFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
  moduleUsageCount: { fontSize: 13, fontWeight: '700', color: colors.text, width: 20, textAlign: 'right' },
  winRow: { paddingVertical: 8 },
  winBorder: { borderTopWidth: 1, borderColor: '#F0F0F0' },
  winDate: { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  winText: { fontSize: 14, color: colors.text, fontStyle: 'italic' },
  checkInRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  checkInScore: { fontSize: 12, color: colors.text, marginLeft: 10 },
});
