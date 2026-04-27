import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated
} from 'react-native';
import { useStore } from '../../../store';
import { logSession } from '../../../services/logger';
import { accuracyCoefficient, accuracyLabel, accuracyTrend } from '../../../utils/scoring';
import { colors } from '../../../theme';

// Interval sets by level (milliseconds)
const LEVEL_INTERVALS = {
  1: [6000, 6000, 12000],       // 6s x2, 12s x1
  2: [12000, 30000, 30000],     // 12s x1, 30s x2
  3: [30000, 60000, 60000],     // 30s x1, 60s x2
  4: [60000, 120000, 120000],   // 1min x1, 2min x2
  5: [60000, 120000, 180000],   // 1min, 2min, 3min
};

const PHASE = { INTRO: 'intro', WAITING: 'waiting', RUNNING: 'running', RESULT: 'result', SUMMARY: 'summary' };

export default function TimeWise({ navigation }) {
  const { timeWiseLevel, addTimeWiseSession, participantCode } = useStore(s => ({
    timeWiseLevel: s.timeWiseLevel,
    addTimeWiseSession: s.addTimeWiseSession,
    participantCode: s.participantCode,
  }));

  const intervals = LEVEL_INTERVALS[timeWiseLevel] || LEVEL_INTERVALS[1];
  const [phase, setPhase] = useState(PHASE.INTRO);
  const [trialIndex, setTrialIndex] = useState(0);
  const [results, setResults] = useState([]);   // { actual, estimated, coeff }
  const startRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation while timer is running
  useEffect(() => {
    if (phase === PHASE.RUNNING) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [phase]);

  function startTrial() {
    startRef.current = Date.now();
    setPhase(PHASE.RUNNING);
  }

  function stopTrial() {
    const elapsed = Date.now() - startRef.current;
    const actual = intervals[trialIndex];
    const coeff = accuracyCoefficient(elapsed, actual);
    const result = { actual, estimated: elapsed, coeff };
    const newResults = [...results, result];
    setResults(newResults);
    setPhase(PHASE.RESULT);
  }

  function nextTrial() {
    if (trialIndex + 1 < intervals.length) {
      setTrialIndex(prev => prev + 1);
      setPhase(PHASE.WAITING);
    } else {
      finishSession(results);
    }
  }

  async function finishSession(finalResults) {
    const coeffs = finalResults.map(r => r.coeff).filter(Boolean);
    const avg = coeffs.length > 0
      ? Math.round((coeffs.reduce((a, b) => a + b, 0) / coeffs.length) * 100) / 100
      : null;

    const sessionData = {
      date: new Date().toISOString().split('T')[0],
      avgCoeff: avg,
      accuracyCoefficients: coeffs,
      intervals: intervals.map(i => i / 1000),
    };

    addTimeWiseSession(sessionData);

    await logSession(participantCode, {
      module: 'TimeWise',
      trialsCompleted: finalResults.length,
      accuracyCoefficients: coeffs,
      avgAccuracyCoefficient: avg,
      intervalsUsed: intervals.map(i => i / 1000),
      level: timeWiseLevel,
    });

    setPhase(PHASE.SUMMARY);
  }

  const currentActualSec = Math.round(intervals[trialIndex] / 1000);
  const currentResult = results[results.length - 1];

  // ── INTRO ──
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>⏱ TimeWise</Text>
          <Text style={styles.headline}>Time Estimation</Text>
          <Text style={styles.body}>
            A timer will start. Tap STOP when you think the time is up.
          </Text>
          <Text style={styles.body}>
            There's no clock to check — use your gut. This trains your brain's internal clock.
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>Level {timeWiseLevel} · {intervals.length} trials</Text>
          </View>
          <Text style={styles.hint}>
            Tip: Don't count seconds out loud. Just feel it.
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => setPhase(PHASE.WAITING)}>
          <Text style={styles.buttonText}>Let's go →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── WAITING (ready to start trial) ──
  if (phase === PHASE.WAITING) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.trialCounter}>Trial {trialIndex + 1} of {intervals.length}</Text>
          <Text style={styles.headline}>Get ready</Text>
          <Text style={styles.body}>
            You'll try to estimate <Text style={styles.bold}>{currentActualSec} seconds</Text>.
          </Text>
          <Text style={styles.body}>Tap START when you're ready. Tap STOP when you think the time is up.</Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={startTrial}>
          <Text style={styles.buttonText}>START</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── RUNNING (timer active) ──
  if (phase === PHASE.RUNNING) {
    return (
      <SafeAreaView style={[styles.container, styles.runningBg]}>
        <View style={styles.content}>
          <Text style={styles.trialCounter}>Trial {trialIndex + 1} of {intervals.length}</Text>
          <Text style={[styles.headline, { color: '#fff' }]}>Timer running…</Text>
          <Text style={[styles.body, { color: 'rgba(255,255,255,0.8)' }]}>
            Tap STOP when you think <Text style={{ fontWeight: '800' }}>{currentActualSec} seconds</Text> have passed.
          </Text>
        </View>
        <Animated.View style={{ transform: [{ scale: pulseAnim }], marginHorizontal: 28, marginBottom: 32 }}>
          <TouchableOpacity style={styles.stopButton} onPress={stopTrial}>
            <Text style={styles.stopButtonText}>STOP</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ── RESULT (show feedback for one trial) ──
  if (phase === PHASE.RESULT && currentResult) {
    const estimatedSec = Math.round(currentResult.estimated / 1000);
    const coeff = currentResult.coeff;
    const label = accuracyLabel(coeff);
    const isGood = Math.abs(1 - coeff) <= 0.20;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.trialCounter}>Trial {results.length} of {intervals.length}</Text>
          <Text style={styles.headline}>{label}</Text>

          <View style={styles.resultRow}>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Your estimate</Text>
              <Text style={styles.resultValue}>{estimatedSec}s</Text>
            </View>
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>Actual time</Text>
              <Text style={styles.resultValue}>{currentActualSec}s</Text>
            </View>
          </View>

          <View style={styles.coeffRow}>
            <Text style={styles.coeffLabel}>Accuracy: </Text>
            <Text style={[styles.coeffValue, { color: isGood ? colors.success : colors.primary }]}>
              {coeff?.toFixed(2)} {isGood ? '✓' : ''}
            </Text>
          </View>

          <Text style={styles.body}>
            {coeff < 0.75
              ? "You underestimated — your internal clock ran fast. Common with ADHD. Keep going."
              : coeff > 1.25
              ? "You overestimated — your internal clock ran slow. This is trainable."
              : "You're within a good range. Consistency builds over time."}
          </Text>
        </View>
        <TouchableOpacity style={styles.button} onPress={nextTrial}>
          <Text style={styles.buttonText}>
            {trialIndex + 1 < intervals.length ? 'Next trial →' : 'See summary →'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── SUMMARY (all trials done) ──
  if (phase === PHASE.SUMMARY) {
    const coeffs = results.map(r => r.coeff).filter(Boolean);
    const avg = coeffs.reduce((a, b) => a + b, 0) / coeffs.length;
    const avgLabel = accuracyLabel(avg);

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>⏱ TimeWise — Complete</Text>
          <Text style={styles.headline}>Session summary</Text>

          <View style={[styles.bigScore, { borderColor: colors.primary }]}>
            <Text style={styles.bigScoreLabel}>Average accuracy</Text>
            <Text style={styles.bigScoreValue}>{avg.toFixed(2)}</Text>
            <Text style={styles.bigScoreTarget}>Target: 0.85+</Text>
          </View>

          {results.map((r, i) => (
            <View key={i} style={styles.trialRow}>
              <Text style={styles.trialRowLabel}>Trial {i + 1} ({Math.round(r.actual / 1000)}s)</Text>
              <Text style={styles.trialRowValue}>{r.coeff?.toFixed(2)}</Text>
            </View>
          ))}

          <Text style={styles.body}>
            {avg >= 0.85
              ? "Excellent session. You're reaching Level " + Math.min(timeWiseLevel + 1, 5) + " territory."
              : "Keep at it — consistency matters more than any single session."}
          </Text>
        </ScrollView>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  runningBg: { backgroundColor: colors.primary },
  content: { flex: 1, padding: 28, justifyContent: 'center' },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  trialCounter: { fontSize: 13, color: colors.textLight, fontWeight: '600', marginBottom: 12 },
  headline: { fontSize: 32, fontWeight: '800', color: colors.text, marginBottom: 16 },
  body: { fontSize: 17, color: colors.textLight, lineHeight: 26, marginBottom: 12 },
  bold: { fontWeight: '800', color: colors.text },
  hint: { fontSize: 14, color: colors.primary, fontStyle: 'italic', marginTop: 8 },
  levelBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  levelText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  button: {
    backgroundColor: colors.primary,
    marginHorizontal: 28,
    marginBottom: 32,
    padding: 20,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  stopButton: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 14,
    alignItems: 'center',
  },
  stopButtonText: { color: colors.primary, fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  resultRow: { flexDirection: 'row', gap: 16, marginVertical: 20 },
  resultBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  resultLabel: { fontSize: 13, color: colors.textLight, marginBottom: 6 },
  resultValue: { fontSize: 32, fontWeight: '800', color: colors.text },
  coeffRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  coeffLabel: { fontSize: 17, color: colors.textLight },
  coeffValue: { fontSize: 22, fontWeight: '800' },
  bigScore: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  bigScoreLabel: { fontSize: 14, color: colors.textLight, marginBottom: 4 },
  bigScoreValue: { fontSize: 48, fontWeight: '900', color: colors.text },
  bigScoreTarget: { fontSize: 13, color: colors.textLight, marginTop: 4 },
  trialRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#EEE' },
  trialRowLabel: { fontSize: 15, color: colors.textLight },
  trialRowValue: { fontSize: 15, fontWeight: '700', color: colors.text },
});
