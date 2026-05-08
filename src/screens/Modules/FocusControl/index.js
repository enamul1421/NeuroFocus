import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Animated } from 'react-native';
import { logSession } from '../../../services/logger';
import { useStore } from '../../../store';
import { colors } from '../../../theme';

// School-themed Go/No-Go: tap HOMEWORK items, ignore DISTRACTIONS
const ITEMS = [
  { label: '📚 Read chapter 4', isTarget: true },
  { label: '📝 Write essay outline', isTarget: true },
  { label: '🔢 Solve math problems', isTarget: true },
  { label: '📖 Study vocab', isTarget: true },
  { label: '✏️ Take class notes', isTarget: true },
  { label: '📱 Check Instagram', isTarget: false },
  { label: '🎮 Play video games', isTarget: false },
  { label: '📺 Watch YouTube', isTarget: false },
  { label: '💬 Text friends', isTarget: false },
  { label: '😴 Take a nap', isTarget: false },
];

const PHASE = { INTRO: 'intro', RUNNING: 'running', SUMMARY: 'summary' };
const TRIAL_DURATION = 800; // ms each item shown
const TRIALS = 20;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function FocusControl({ navigation }) {
  const participantCode = useStore(s => s.participantCode);
  const [phase, setPhase] = useState(PHASE.INTRO);
  const [trialIndex, setTrialIndex] = useState(0);
  const [currentItem, setCurrentItem] = useState(null);
  const [results, setResults] = useState([]);
  const [feedback, setFeedback] = useState(null); // 'hit' | 'miss' | 'false_alarm' | 'correct_reject'
  const trials = useRef([]);
  const responded = useRef(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  function buildTrials() {
    const sequence = [];
    while (sequence.length < TRIALS) sequence.push(...shuffle(ITEMS));
    return sequence.slice(0, TRIALS);
  }

  function startTask() {
    trials.current = buildTrials();
    setTrialIndex(0);
    setResults([]);
    setPhase(PHASE.RUNNING);
  }

  const runTrial = useCallback((idx) => {
    if (idx >= TRIALS) {
      setPhase(PHASE.SUMMARY);
      return;
    }
    responded.current = false;
    setFeedback(null);
    setCurrentItem(trials.current[idx]);
    setTimeout(() => {
      if (!responded.current) {
        // No response
        const item = trials.current[idx];
        const result = { isTarget: item.isTarget, responded: false,
          outcome: item.isTarget ? 'miss' : 'correct_reject' };
        setResults(prev => {
          const next = [...prev, result];
          if (idx + 1 < TRIALS) {
            setTimeout(() => runTrial(idx + 1), 300);
          } else {
            setTimeout(() => setPhase(PHASE.SUMMARY), 300);
          }
          return next;
        });
      }
    }, TRIAL_DURATION);
  }, []);

  useEffect(() => {
    if (phase === PHASE.RUNNING) runTrial(0);
  }, [phase]);

  function handleTap() {
    if (!currentItem || responded.current) return;
    responded.current = true;
    const item = currentItem;
    const outcome = item.isTarget ? 'hit' : 'false_alarm';
    setFeedback(outcome);

    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    setResults(prev => {
      const next = [...prev, { isTarget: item.isTarget, responded: true, outcome }];
      const nextIdx = trialIndex + 1;
      setTrialIndex(nextIdx);
      if (nextIdx < TRIALS) {
        setTimeout(() => runTrial(nextIdx), 400);
      } else {
        setTimeout(() => setPhase(PHASE.SUMMARY), 400);
      }
      return next;
    });
    setTrialIndex(i => i + 1);
  }

  async function handleSummaryDone() {
    const hits = results.filter(r => r.outcome === 'hit').length;
    const misses = results.filter(r => r.outcome === 'miss').length;
    const falseAlarms = results.filter(r => r.outcome === 'false_alarm').length;
    const targets = results.filter(r => r.isTarget).length;
    const hitRate = targets > 0 ? Math.round((hits / targets) * 100) : 0;
    const faRate = Math.round((falseAlarms / TRIALS) * 100);

    await logSession(participantCode, {
      module: 'FocusControl',
      totalTrials: results.length,
      hits, misses, falseAlarms,
      hitRate, falseAlarmRate: faRate,
    });
    navigation.goBack();
  }

  if (phase === PHASE.INTRO) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.moduleTag}>🎯 FocusControl</Text>
        <Text style={styles.headline}>Go / No-Go</Text>
        <Text style={styles.body}>
          Tap every time you see a <Text style={styles.bold}>homework task</Text>.
          Don't tap for distractions.
        </Text>
        <View style={styles.exampleRow}>
          <View style={[styles.exampleBox, { borderColor: colors.success }]}>
            <Text style={styles.exampleText}>📚 Read chapter → TAP</Text>
          </View>
          <View style={[styles.exampleBox, { borderColor: '#E57373' }]}>
            <Text style={styles.exampleText}>📱 Instagram → DON'T TAP</Text>
          </View>
        </View>
        <Text style={styles.body}>Items appear fast. React quickly but accurately.</Text>
        <View style={styles.goalBox}>
          <Text style={styles.goalLabel}>WHAT YOU'LL GAIN</Text>
          <Text style={styles.goalText}>With practice, I'll be able to sit down and actually finish my homework without getting pulled away</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={startTask}>
        <Text style={styles.buttonText}>Start →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.RUNNING) {
    const bgColor = feedback === 'false_alarm' ? '#FFEBEE' :
                    feedback === 'hit' ? '#E8F5E9' : colors.background;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <View style={styles.runningContent}>
          <Text style={styles.trialCounter}>{Math.min(trialIndex + 1, TRIALS)} / {TRIALS}</Text>
          <TouchableOpacity style={styles.itemCard} onPress={handleTap} activeOpacity={0.7}>
            <Text style={styles.itemLabel}>{currentItem?.label || ''}</Text>
          </TouchableOpacity>
          <Text style={styles.tapHint}>
            {currentItem?.isTarget ? 'Tap if it\'s homework!' : 'Tap if it\'s homework!'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === PHASE.SUMMARY) {
    const hits = results.filter(r => r.outcome === 'hit').length;
    const falseAlarms = results.filter(r => r.outcome === 'false_alarm').length;
    const targets = results.filter(r => r.isTarget).length;
    const hitRate = targets > 0 ? Math.round((hits / targets) * 100) : 0;
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>🎯 FocusControl — Complete</Text>
          <Text style={styles.headline}>Results</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hitRate}%</Text>
              <Text style={styles.statLabel}>Hit rate</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{falseAlarms}</Text>
              <Text style={styles.statLabel}>False alarms</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{hits}</Text>
              <Text style={styles.statLabel}>Correct hits</Text>
            </View>
          </View>
          <Text style={styles.body}>
            {falseAlarms <= 2 ? "Excellent impulse control — very few false alarms." :
             falseAlarms <= 5 ? "Good focus. Keep working on stopping the impulse to tap distractors." :
             "Inhibitory control takes practice. Each session builds the skill."}
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={handleSummaryDone}>
          <Text style={styles.buttonText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 16 },
  runningContent: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 12 },
  bold: { fontWeight: '800', color: colors.text },
  goalBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1.5, borderColor: colors.primary },
  goalLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },
  exampleRow: { gap: 10, marginVertical: 16 },
  exampleBox: { borderWidth: 1.5, borderRadius: 10, padding: 12 },
  exampleText: { fontSize: 15, color: colors.text },
  trialCounter: { fontSize: 14, color: colors.textLight, marginBottom: 40, fontWeight: '600' },
  itemCard: {
    width: 280, minHeight: 120, backgroundColor: '#fff',
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    padding: 20, borderWidth: 2, borderColor: '#EBEBEB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  itemLabel: { fontSize: 22, color: colors.text, fontWeight: '700', textAlign: 'center' },
  tapHint: { marginTop: 30, fontSize: 14, color: colors.textLight, fontStyle: 'italic' },
  statsGrid: { flexDirection: 'row', gap: 12, marginVertical: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
