import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Share, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(arr) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10;
}

function sessionsPerWeek(sessions, nWeeks = 12) {
  const weeks = Array(nWeeks).fill(0);
  const now = Date.now();
  sessions.forEach(s => {
    const daysAgo = Math.floor((now - new Date(s.date).getTime()) / 86400000);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx >= 0 && weekIdx < nWeeks) weeks[nWeeks - 1 - weekIdx]++;
  });
  return weeks;
}

function MetricRow({ label, value, unit = '', color: c }) {
  const cl = useColors();
  return (
    <View style={[styles.metricRow, { borderColor: cl.border }]}>
      <Text style={[styles.metricLabel, { color: cl.textLight }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: c || cl.primary }]}>
        {value ?? '—'}{value != null ? unit : ''}
      </Text>
    </View>
  );
}

function Section({ title, children }) {
  const cl = useColors();
  return (
    <View style={[styles.section, { backgroundColor: cl.surface, borderColor: cl.border }]}>
      <Text style={[styles.sectionTitle, { color: cl.primary }]}>{title}</Text>
      {children}
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResearcherDashboard({
  navigation }) {
  const colors = useColors();
  const state = useStore(s => s);
  const [exporting, setExporting] = useState(false);

  const {
    participantCode, userNickname, diagnoses, totalSessions, currentStreak,
    focusControlSessions = [], memoryBankSessions = [], moodBridgeSessions = [],
    timeWiseSessions = [], morningLogs = [], weeklyWins = [],
    weeklyCheckIns = [], baselineAssessments = [], plannerTasks = [],
    xp, level,
  } = state;

  // ── Module compliance ─────────────────────────────────────────────────────
  const allModuleSessions = [
    ...focusControlSessions, ...memoryBankSessions,
    ...moodBridgeSessions, ...timeWiseSessions, ...morningLogs,
  ];
  const complianceWeeks = sessionsPerWeek(allModuleSessions);
  const avgWeekly = avg(complianceWeeks.filter(n => n > 0));
  const compliantWeeks = complianceWeeks.filter(n => n >= 3).length;

  // ── Module averages ───────────────────────────────────────────────────────
  const fcAvgBrake = avg(focusControlSessions.map(s => s.brakeScore).filter(Boolean));
  const fcAvgDPrime = avg(focusControlSessions.map(s => s.dPrime).filter(Boolean));
  const fcAvgFA = avg(focusControlSessions.map(s => s.faRate).filter(Boolean));
  const mbAvgLevel = avg(memoryBankSessions.map(s => s.maxLevel).filter(Boolean));
  const twAvgCoeff = avg(timeWiseSessions.map(s => s.coeff).filter(Boolean));
  const moodAvgDelta = avg(moodBridgeSessions.map(s => (s.postScore || 0) - (s.preScore || 0)));
  const routineRate = morningLogs.length > 0
    ? Math.round(morningLogs.filter(l => l.allCompleted).length / morningLogs.length * 100) : null;

  // ── Assessments ───────────────────────────────────────────────────────────
  const assessByWeek = {};
  baselineAssessments.forEach(a => { assessByWeek[a.week] = a; });

  // ── Export ────────────────────────────────────────────────────────────────
  async function exportData() {
    setExporting(true);
    try {
      const exportPayload = {
        exportDate: new Date().toISOString(),
        participant: { code: participantCode, nickname: userNickname, diagnoses },
        summary: { totalSessions, currentStreak, xp, level, weeklyWins: weeklyWins.length },
        modules: {
          focusControl: focusControlSessions,
          memoryBank: memoryBankSessions,
          moodBridge: moodBridgeSessions,
          timeWise: timeWiseSessions,
          dailyRoutine: morningLogs,
          confidenceCore: weeklyWins,
        },
        assessments: baselineAssessments,
        weeklyCheckIns,
        plannerTasks: plannerTasks.map(t => ({
          title: t.title, deadline: t.deadline, type: t.type,
          stepsTotal: t.steps.length,
          stepsComplete: t.steps.filter(s => s.completed).length,
        })),
      };

      const json = JSON.stringify(exportPayload, null, 2);
      const uri = `${FileSystem.cacheDirectory}neurofocus_${participantCode || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      await Share.share({ url: uri, title: 'NeuroFocus Research Data' });
    } catch (e) {
      Alert.alert('Export failed', e.message);
    }
    setExporting(false);
  }

  // ── Compliance bar ────────────────────────────────────────────────────────
  const maxBar = Math.max(...complianceWeeks, 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={[styles.headline, { color: colors.text }]}>Researcher Dashboard</Text>
        <Text style={[styles.sub, { color: colors.textLight }]}>
          Participant: {participantCode || 'Not set'} · {userNickname || 'No name'}
        </Text>

        {/* ── Compliance chart ── */}
        <Section title="SESSION COMPLIANCE (12 WEEKS)">
          <View style={styles.barChart}>
            {complianceWeeks.map((n, i) => (
              <View key={i} style={styles.barCol}>
                <View style={[styles.bar, {
                  height: Math.max(4, (n / maxBar) * 80),
                  backgroundColor: n >= 3 ? colors.primary : n > 0 ? colors.primary + '55' : colors.border,
                }]} />
                {i % 4 === 0 && <Text style={[styles.barLabel, { color: colors.textLight }]}>W{i + 1}</Text>}
              </View>
            ))}
          </View>
          <MetricRow label="Avg sessions/week" value={avgWeekly} />
          <MetricRow label="Compliant weeks (≥3/wk)" value={compliantWeeks} unit={`/12`} />
          <MetricRow label="Total sessions" value={totalSessions} />
          <MetricRow label="Current streak" value={currentStreak} unit=" days" />
        </Section>

        {/* ── Module metrics ── */}
        <Section title="MODULE PERFORMANCE">
          <Text style={[styles.modHead, { color: colors.textLight }]}>FocusControl ({focusControlSessions.length} sessions)</Text>
          <MetricRow label="Avg brake score" value={fcAvgBrake} unit="/100" />
          <MetricRow label="Avg d-prime" value={fcAvgDPrime} />
          <MetricRow label="Avg false alarm rate" value={fcAvgFA} unit="%" />

          <Text style={[styles.modHead, { color: colors.textLight }]}>MemoryBank ({memoryBankSessions.length} sessions)</Text>
          <MetricRow label="Avg max span level" value={mbAvgLevel} unit="/9" />

          <Text style={[styles.modHead, { color: colors.textLight }]}>TimeWise ({timeWiseSessions.length} sessions)</Text>
          <MetricRow label="Avg accuracy coefficient" value={twAvgCoeff} />

          <Text style={[styles.modHead, { color: colors.textLight }]}>MoodBridge ({moodBridgeSessions.length} sessions)</Text>
          <MetricRow label="Avg pre→post mood delta" value={moodAvgDelta} />

          <Text style={[styles.modHead, { color: colors.textLight }]}>Daily Routine ({morningLogs.length} logs)</Text>
          <MetricRow label="Full completion rate" value={routineRate} unit="%" />

          <Text style={[styles.modHead, { color: colors.textLight }]}>ConfidenceCore</Text>
          <MetricRow label="Total wins logged" value={weeklyWins.length} />
        </Section>

        {/* ── Assessments ── */}
        <Section title="BASELINE ASSESSMENTS">
          {[0, 6, 12].map(week => {
            const a = assessByWeek[week];
            return (
              <View key={week} style={[styles.assessRow, { borderColor: colors.border }]}>
                <Text style={[styles.assessWeek, { color: colors.primary }]}>Week {week}</Text>
                {a ? (
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.assessData, { color: colors.text }]}>
                      CFQ: {a.cfqTotal}/20
                    </Text>
                    {a.efScores && (
                      <Text style={[styles.assessSub, { color: colors.textLight }]}>
                        EF: Time={a.efScores.timewise} · Focus={a.efScores.focus} · Mem={a.efScores.memory} · Mood={a.efScores.mood} · Conf={a.efScores.confidence} · Plan={a.efScores.planning}
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.assessPending, { color: colors.textLight }]}>Not completed</Text>
                )}
              </View>
            );
          })}
        </Section>

        {/* ── Weekly check-ins ── */}
        <Section title={`WEEKLY CHECK-INS (${weeklyCheckIns.length})`}>
          <MetricRow label="Avg homework completion" value={avg(weeklyCheckIns.map(c => c.homework).filter(Boolean))} unit="/5" />
          <MetricRow label="Avg class preparedness" value={avg(weeklyCheckIns.map(c => c.prepared).filter(Boolean))} unit="/5" />
          <MetricRow label="Avg morning routine" value={avg(weeklyCheckIns.map(c => c.morning).filter(Boolean))} unit="/5" />
        </Section>

        {/* ── Export ── */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={exportData}
          disabled={exporting}
        >
          <Text style={styles.exportBtnText}>
            {exporting ? '⏳ Exporting...' : '📤 Export Data (JSON)'}
          </Text>
        </TouchableOpacity>
        <Text style={[styles.exportHint, { color: colors.textLight }]}>
          Exports all session data, assessments, and check-ins as a JSON file you can share via email or AirDrop.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 20, paddingBottom: 40 },
  back:      { marginBottom: 12 },
  backText:  { fontSize: 15, fontWeight: '600' },
  headline:  { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  sub:       { fontSize: 13, marginBottom: 20 },

  section:      { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },

  metricRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1 },
  metricLabel: { fontSize: 13 },
  metricValue: { fontSize: 13, fontWeight: '800' },

  modHead: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 10, marginBottom: 4 },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', height: 90, gap: 3, marginBottom: 12 },
  barCol:   { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar:      { width: '100%', borderRadius: 2 },
  barLabel: { fontSize: 8, marginTop: 2 },

  assessRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 8, borderBottomWidth: 1 },
  assessWeek:   { fontSize: 13, fontWeight: '800', width: 56 },
  assessData:   { fontSize: 13, fontWeight: '700' },
  assessSub:    { fontSize: 11, marginTop: 2, lineHeight: 16 },
  assessPending:{ fontSize: 13, fontStyle: 'italic' },

  exportBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  exportHint:    { fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18 },
});
