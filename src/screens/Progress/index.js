import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useStore } from '../../store';
import { colors } from '../../theme';

const W = Dimensions.get('window').width;
const CHART_W = W - 48;
const CHART_H = 160;

const CHART_CFG = {
  backgroundColor: '#fff',
  backgroundGradientFrom: '#fff',
  backgroundGradientTo: '#fff',
  decimalPlaces: 1,
  color: (opacity = 1) => `rgba(91, 94, 166, ${opacity})`,
  labelColor: () => '#999',
  propsForBackgroundLines: { stroke: '#F5F5F5', strokeDasharray: '' },
  propsForDots: { r: '4', strokeWidth: '2', stroke: '#5B5EA6' },
  propsForLabels: { fontSize: 10 },
};

const BAR_CFG = { ...CHART_CFG, decimalPlaces: 0, barRadius: 4 };

// ── Weekly aggregation ────────────────────────────────────────────────────────
// Returns {labels, data} with only weeks that have data (max nWeeks)

function weeklyData(sessions, valueField, aggregator = 'avg', nWeeks = 8) {
  const today = new Date(); today.setHours(23, 59, 59, 0);
  const result = [];

  for (let i = nWeeks - 1; i >= 0; i--) {
    const wEnd = new Date(today);
    wEnd.setDate(today.getDate() - i * 7);
    const wStart = new Date(wEnd);
    wStart.setDate(wEnd.getDate() - 6);
    wStart.setHours(0, 0, 0, 0);

    const wSessions = sessions.filter(s => {
      const d = new Date(s.date || s.createdAt || 0);
      return d >= wStart && d <= wEnd;
    });

    if (wSessions.length === 0) continue;

    const vals = wSessions
      .map(s => s[valueField])
      .filter(v => v !== undefined && v !== null && !isNaN(v));

    if (vals.length === 0) continue;

    let value;
    if (aggregator === 'avg')   value = vals.reduce((a, b) => a + b, 0) / vals.length;
    if (aggregator === 'max')   value = Math.max(...vals);
    if (aggregator === 'count') value = wSessions.length;
    if (aggregator === 'sum')   value = vals.reduce((a, b) => a + b, 0);

    const label = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    result.push({ label, value: Math.round(value * 10) / 10 });
  }

  return {
    labels: result.map(r => r.label),
    data:   result.map(r => r.value),
  };
}

// ── Chart helpers ─────────────────────────────────────────────────────────────

function NoData({ msg = 'Complete sessions to see weekly trends' }) {
  return (
    <View style={styles.noData}>
      <Text style={styles.noDataText}>{msg}</Text>
    </View>
  );
}

function ChartCard({ title, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Progress({ navigation }) {
  const {
    timeWiseSessions, timeWiseLevel, weeklyCheckIns, weeklyWins,
    totalSessions, currentStreak, focusControlSessions,
    memoryBankSessions, moodBridgeSessions, morningLogs,
    weeklyReviews, plannerTasks,
  } = useStore(s => ({
    timeWiseSessions:    s.timeWiseSessions    || [],
    timeWiseLevel:       s.timeWiseLevel       || 1,
    weeklyCheckIns:      s.weeklyCheckIns      || [],
    weeklyWins:          s.weeklyWins          || [],
    totalSessions:       s.totalSessions       || 0,
    currentStreak:       s.currentStreak       || 0,
    focusControlSessions:s.focusControlSessions|| [],
    memoryBankSessions:  s.memoryBankSessions  || [],
    moodBridgeSessions:  s.moodBridgeSessions  || [],
    morningLogs:         s.morningLogs         || [],
    weeklyReviews:       s.weeklyReviews       || [],
    plannerTasks:        s.plannerTasks        || [],
  }));

  // ── TimeWise ──────────────────────────────────────────────────────────────
  const twWeekly = weeklyData(timeWiseSessions, 'avgCoeff', 'avg');

  // ── FocusControl ──────────────────────────────────────────────────────────
  const fcWeekly = weeklyData(focusControlSessions, 'brakeScore', 'avg');
  const faWeekly = weeklyData(focusControlSessions, 'faRate', 'avg');

  // ── MemoryBank ────────────────────────────────────────────────────────────
  const mbWeekly = weeklyData(memoryBankSessions, 'maxLevel', 'max');

  // ── MoodBridge ────────────────────────────────────────────────────────────
  const moodWeekly = weeklyData(
    moodBridgeSessions.map(s => ({ ...s, delta: (s.postScore || 0) - (s.preScore || 0) })),
    'delta', 'avg'
  );

  // ── Morning Routine ───────────────────────────────────────────────────────
  const morningWeekly = weeklyData(
    morningLogs.map(l => ({ ...l, completed: l.allCompleted ? 100 : 0 })),
    'completed', 'avg'
  );

  // ── Weekly check-ins ──────────────────────────────────────────────────────
  const ciHW   = weeklyData(weeklyCheckIns.map(c => ({ ...c, date: c.date || new Date().toISOString() })), 'homework', 'avg');
  const ciClass = weeklyData(weeklyCheckIns.map(c => ({ ...c, date: c.date || new Date().toISOString() })), 'prepared', 'avg');
  const ciAM   = weeklyData(weeklyCheckIns.map(c => ({ ...c, date: c.date || new Date().toISOString() })), 'morning', 'avg');

  // ── Module usage (all-time bar chart) ─────────────────────────────────────
  const moduleData = {
    labels: ['TimeWise', 'Focus', 'Memory', 'Mood', 'Wins'],
    datasets: [{ data: [
      timeWiseSessions.length,
      focusControlSessions.length,
      memoryBankSessions.length,
      moodBridgeSessions.length,
      weeklyWins.length,
    ]}],
  };

  // ── Win categories ────────────────────────────────────────────────────────
  const winCats = ['academic', 'social', 'challenge', 'adhd', 'creative', 'helped'];
  const winCatLabels = ['Study', 'Social', 'Challenge', 'ADHD', 'Creative', 'Helped'];
  const winCatData = winCats.map(c => weeklyWins.filter(w => w.category === c).length);
  const hasWins = winCatData.some(v => v > 0);

  // ── Planner completion ────────────────────────────────────────────────────
  const totalSteps = plannerTasks.reduce((s, t) => s + t.steps.length, 0);
  const completedSteps = plannerTasks.reduce((s, t) => s + t.steps.filter(st => st.completed).length, 0);
  const plannerPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>Progress</Text>

        {/* Overview stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{currentStreak > 0 ? `🔥 ${currentStreak}` : '—'}</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{weeklyWins.length}</Text>
            <Text style={styles.statLabel}>Wins logged</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{plannerPct}%</Text>
            <Text style={styles.statLabel}>Tasks done</Text>
          </View>
        </View>

        {/* ── TimeWise ── */}
        <ChartCard title="⏱ Time Estimation Accuracy (weekly avg)">
          <Text style={styles.cardSubtitle}>Target: 0.85+ · Level {timeWiseLevel} / 5</Text>
          {twWeekly.data.length < 1 ? <NoData /> : (
            <>
              <LineChart
                data={{ labels: twWeekly.labels, datasets: [{ data: twWeekly.data, color: () => colors.primary }] }}
                width={CHART_W} height={CHART_H}
                chartConfig={CHART_CFG}
                bezier
                style={styles.chart}
                fromZero={false}
                yAxisSuffix=""
                withInnerLines={false}
              />
              <View style={styles.targetLine}>
                <View style={styles.targetDash} />
                <Text style={styles.targetLabel}>0.85 target</Text>
              </View>
            </>
          )}
        </ChartCard>

        {/* ── FocusControl ── */}
        <ChartCard title="🎯 Brake Score (weekly avg)">
          <Text style={styles.cardSubtitle}>Inhibitory control strength · higher = better</Text>
          {fcWeekly.data.length < 1 ? <NoData /> : (
            <BarChart
              data={{ labels: fcWeekly.labels, datasets: [{ data: fcWeekly.data }] }}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...BAR_CFG, decimalPlaces: 0 }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              withInnerLines={false}
            />
          )}
        </ChartCard>

        {/* ── FocusControl false alarms ── */}
        {faWeekly.data.length >= 1 && (
          <ChartCard title="🎯 False Alarm Rate % (weekly avg)">
            <Text style={styles.cardSubtitle}>Distractions you tapped · target: under 10%</Text>
            <BarChart
              data={{ labels: faWeekly.labels, datasets: [{ data: faWeekly.data }] }}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...BAR_CFG, color: (op = 1) => `rgba(244, 67, 54, ${op})`, decimalPlaces: 0 }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              withInnerLines={false}
            />
          </ChartCard>
        )}

        {/* ── MemoryBank ── */}
        <ChartCard title="🧠 Memory Span — Max Level (weekly)">
          <Text style={styles.cardSubtitle}>Target: level 6+ · higher = stronger working memory</Text>
          {mbWeekly.data.length < 1 ? <NoData /> : (
            <LineChart
              data={{ labels: mbWeekly.labels, datasets: [{ data: mbWeekly.data, color: () => '#4CAF50' }] }}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...CHART_CFG, color: (op = 1) => `rgba(76, 175, 80, ${op})`, decimalPlaces: 0, propsForDots: { r: '4', strokeWidth: '2', stroke: '#4CAF50' } }}
              bezier
              style={styles.chart}
              fromZero
              withInnerLines={false}
            />
          )}
        </ChartCard>

        {/* ── MoodBridge ── */}
        <ChartCard title="🌊 Mood Change Per Session (weekly avg)">
          <Text style={styles.cardSubtitle}>Positive = mood improved after exercise</Text>
          {moodWeekly.data.length < 1 ? <NoData /> : (
            <BarChart
              data={{ labels: moodWeekly.labels, datasets: [{ data: moodWeekly.data }] }}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...BAR_CFG, color: (op = 1) => `rgba(33, 150, 243, ${op})`, decimalPlaces: 1 }}
              style={styles.chart}
              fromZero={false}
              showValuesOnTopOfBars
              withInnerLines={false}
            />
          )}
        </ChartCard>

        {/* ── Morning Routine ── */}
        {morningWeekly.data.length >= 1 && (
          <ChartCard title="☀️ Daily Routine Completion % (weekly)">
            <Text style={styles.cardSubtitle}>% of days with full routine completed</Text>
            <BarChart
              data={{ labels: morningWeekly.labels, datasets: [{ data: morningWeekly.data }] }}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...BAR_CFG, color: (op = 1) => `rgba(255, 152, 0, ${op})`, decimalPlaces: 0 }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              withInnerLines={false}
            />
          </ChartCard>
        )}

        {/* ── Weekly check-ins ── */}
        {ciHW.data.length >= 1 && (
          <ChartCard title="📊 Weekly Check-in Scores">
            <Text style={styles.cardSubtitle}>Homework / Class / Morning · scale 1–5</Text>
            <LineChart
              data={{
                labels: ciHW.labels,
                datasets: [
                  { data: ciHW.data,   color: () => '#5B5EA6', strokeWidth: 2 },
                  { data: ciClass.data.length ? ciClass.data : ciHW.data.map(() => 0), color: () => '#4CAF50', strokeWidth: 2 },
                  { data: ciAM.data.length   ? ciAM.data   : ciHW.data.map(() => 0), color: () => '#FF9800', strokeWidth: 2 },
                ],
                legend: ['Homework', 'Class', 'Morning'],
              }}
              width={CHART_W} height={CHART_H + 30}
              chartConfig={{ ...CHART_CFG, decimalPlaces: 0 }}
              bezier
              style={styles.chart}
              fromZero
              withInnerLines={false}
            />
          </ChartCard>
        )}

        {/* ── Module usage ── */}
        <ChartCard title="📈 Total Sessions Per Module">
          <Text style={styles.cardSubtitle}>All-time usage across modules</Text>
          {moduleData.datasets[0].data.every(v => v === 0) ? <NoData /> : (
            <BarChart
              data={moduleData}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...BAR_CFG, decimalPlaces: 0 }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              withInnerLines={false}
            />
          )}
        </ChartCard>

        {/* ── Win categories ── */}
        {hasWins && (
          <ChartCard title="⚡ Wins by Category">
            <Text style={styles.cardSubtitle}>All-time strength distribution</Text>
            <BarChart
              data={{ labels: winCatLabels, datasets: [{ data: winCatData }] }}
              width={CHART_W} height={CHART_H}
              chartConfig={{ ...BAR_CFG, color: (op = 1) => `rgba(255, 193, 7, ${op})`, decimalPlaces: 0 }}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              withInnerLines={false}
            />
          </ChartCard>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll:    { padding: 24, paddingBottom: 40 },
  headline:  { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox:  { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue:{ fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel:{ fontSize: 10, color: colors.textLight, marginTop: 2, textAlign: 'center' },

  card:       { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EBEBEB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle:  { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 2 },
  cardSubtitle:{ fontSize: 11, color: colors.textLight, marginBottom: 12 },

  chart: { borderRadius: 10, marginLeft: -8 },

  targetLine:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  targetDash:  { flex: 1, height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#FF9800' },
  targetLabel: { fontSize: 11, color: '#FF9800', fontWeight: '600' },

  noData:     { paddingVertical: 28, alignItems: 'center' },
  noDataText: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
});
