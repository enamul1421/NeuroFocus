import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import {
  View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity,
} from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';
import { BADGES, levelInfo } from '../../utils/achievements';

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

// ── Daily anger aggregation (last 7 days) ─────────────────────────────────────
function dailyAngerData(checkIns) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayCheckins = checkIns.filter(c => c.timestamp && c.timestamp.startsWith(dateStr));
    const avg = dayCheckins.length
      ? Math.round((dayCheckins.reduce((s, c) => s + c.rating, 0) / dayCheckins.length) * 10) / 10
      : 0;
    const label = d.toLocaleDateString('en-US', { weekday: 'short' });
    result.push({ label, value: avg, count: dayCheckins.length });
  }
  return {
    labels: result.map(r => r.label),
    data:   result.map(r => r.value),
    counts: result.map(r => r.count),
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
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Progress({
  navigation }) {
  const colors = useColors();
  const {
    timeWiseSessions, timeWiseLevel, weeklyCheckIns, weeklyWins,
    totalSessions, currentStreak, focusControlSessions,
    memoryBankSessions, moodBridgeSessions, morningLogs,
    plannerTasks, xp, unlockedBadges, baselineAssessments,
    angerCheckIns, coolDownLogs,
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
    plannerTasks:        s.plannerTasks        || [],
    xp:                  s.xp                 || 0,
    unlockedBadges:      s.unlockedBadges      || [],
    baselineAssessments: s.baselineAssessments || [],
    angerCheckIns:       s.angerCheckIns       || [],
    coolDownLogs:        s.coolDownLogs        || [],
  }));

  const lvl = levelInfo(xp);
  const allBadges = Object.values(BADGES);
  const hasWeek0 = baselineAssessments.some(a => a.week === 0);
  const nextWeek  = hasWeek0 ? (baselineAssessments.some(a => a.week === 6) ? (baselineAssessments.some(a => a.week === 12) ? null : 12) : 6) : 0;

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

  // ── Anger self-monitoring ─────────────────────────────────────────────────
  const angerDaily = dailyAngerData(angerCheckIns);
  const hasAngerData = angerDaily.data.some(v => v > 0);
  const recentAvg = angerDaily.data.slice(-3).filter(v => v > 0);
  const recentMean = recentAvg.length ? recentAvg.reduce((a, b) => a + b, 0) / recentAvg.length : 0;
  const coolDownsThisWeek = coolDownLogs.filter(l => {
    const d = new Date(l.timestamp || 0);
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  }).length;
  const angerInsight = recentMean >= 8
    ? `High tension this week (avg ${recentMean.toFixed(1)}). CoolDown has your back.`
    : recentMean >= 6
    ? `Some tension detected (avg ${recentMean.toFixed(1)}). Monitoring is working.`
    : recentMean > 0
    ? `Staying regulated this week (avg ${recentMean.toFixed(1)}). Great work.`
    : null;

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.headline, { color: colors.text }]}>Progress</Text>

        {/* ── Assessment banner ── */}
        {nextWeek !== null && (
          <TouchableOpacity
            style={styles.assessBanner}
            onPress={() => navigation.navigate('BaselineAssessment', { week: nextWeek })}
          >
            <Text style={styles.assessIcon}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.assessTitle}>Week {nextWeek} Assessment due</Text>
              <Text style={styles.assessSub}>11 questions · ~5 min · measures your EF growth</Text>
            </View>
            <Text style={styles.assessArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Level & XP ── */}
        <View style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNum}>{lvl.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelName}>{lvl.name}</Text>
              <Text style={styles.xpText}>{xp} XP{lvl.xpToNext > 0 ? ` · ${lvl.xpToNext} to next level` : ' · MAX LEVEL'}</Text>
            </View>
          </View>
          <View style={styles.xpBarBg}>
            <View style={[styles.xpBarFill, { width: `${Math.round(lvl.progress * 100)}%` }]} />
          </View>
        </View>

        {/* ── Badges ── */}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={styles.cardTitle}>Badges — {unlockedBadges.length}/{allBadges.length}</Text>
          <View style={styles.badgeGrid}>
            {allBadges.map(b => {
              const unlocked = unlockedBadges.includes(b.id);
              return (
                <View key={b.id} style={[styles.badgeTile, !unlocked && styles.badgeTileLocked]}>
                  <Text style={[styles.badgeTileIcon, !unlocked && styles.badgeTileIconLocked]}>{b.icon}</Text>
                  <Text style={[styles.badgeTileName, !unlocked && styles.badgeTileNameLocked]} numberOfLines={2}>{b.name}</Text>
                </View>
              );
            })}
          </View>
        </View>

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

        {/* ── Anger self-monitoring ── */}
        <ChartCard title="😤 Anger Levels — Last 7 Days">
          <Text style={styles.cardSubtitle}>Daily avg · 0 = calm · 10 = explosive · tap CoolDown at 6+</Text>
          {!hasAngerData ? (
            <NoData msg="Check in daily on the Home screen to see your anger trend" />
          ) : (
            <>
              <BarChart
                data={{ labels: angerDaily.labels, datasets: [{ data: angerDaily.data }] }}
                width={CHART_W} height={CHART_H}
                chartConfig={{
                  ...BAR_CFG,
                  color: (op = 1) => `rgba(244, 67, 54, ${op})`,
                  decimalPlaces: 1,
                }}
                style={styles.chart}
                fromZero
                showValuesOnTopOfBars
                withInnerLines={false}
              />
              <View style={styles.angerRow}>
                <View style={[styles.angerThreshLine, { flex: 1 }]}>
                  <View style={styles.angerThreshDash} />
                  <Text style={styles.angerThreshLabel}>6 = CoolDown threshold</Text>
                </View>
                {coolDownsThisWeek > 0 && (
                  <View style={styles.coolDownBadge}>
                    <Text style={styles.coolDownBadgeText}>🆘 {coolDownsThisWeek}× this week</Text>
                  </View>
                )}
              </View>
              {angerInsight && (
                <Text style={[
                  styles.angerInsight,
                  { color: recentMean >= 6 ? '#B71C1C' : '#388E3C' },
                ]}>{angerInsight}</Text>
              )}
            </>
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

  assessBanner:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryLight, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, padding: 14, marginBottom: 16 },
  assessIcon:    { fontSize: 24 },
  assessTitle:   { fontSize: 14, fontWeight: '800', color: colors.primary },
  assessSub:     { fontSize: 12, color: colors.primary, opacity: 0.8, marginTop: 2 },
  assessArrow:   { fontSize: 18, color: colors.primary, fontWeight: '700' },

  // Level card
  levelCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EBEBEB' },
  levelHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  levelBadge:  { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  levelNum:    { fontSize: 24, fontWeight: '900', color: '#fff' },
  levelName:   { fontSize: 16, fontWeight: '800', color: colors.text },
  xpText:      { fontSize: 12, color: colors.textLight, marginTop: 2 },
  xpBarBg:     { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4 },
  xpBarFill:   { height: 8, backgroundColor: colors.primary, borderRadius: 4 },

  // Anger chart
  angerRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  angerThreshLine:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  angerThreshDash:   { width: 24, height: 1, borderWidth: 1, borderStyle: 'dashed', borderColor: '#FF9800' },
  angerThreshLabel:  { fontSize: 11, color: '#FF9800', fontWeight: '600' },
  coolDownBadge:     { backgroundColor: '#FFCDD2', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  coolDownBadgeText: { fontSize: 11, color: '#B71C1C', fontWeight: '700' },
  angerInsight:      { fontSize: 12, fontWeight: '600', marginTop: 8 },

  // Badge gallery
  badgeGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  badgeTile:          { width: 72, alignItems: 'center', padding: 8, backgroundColor: '#F8F8FF', borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary + '40' },
  badgeTileLocked:    { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
  badgeTileIcon:      { fontSize: 26, marginBottom: 4 },
  badgeTileIconLocked:{ opacity: 0.25 },
  badgeTileName:      { fontSize: 10, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  badgeTileNameLocked:{ color: '#BDBDBD' },
});
