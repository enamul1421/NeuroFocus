import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput
} from 'react-native';
import { useStore } from '../../../store';
import { logSession } from '../../../services/logger';
import { colors, useColors } from '../../../theme';
import SpeakButton from '../../../components/SpeakButton';
import AnimatedGuide from '../../../components/AnimatedGuide';
import SessionProgress from '../../../components/SessionProgress';

const TASKS = [
  'Do homework',
  'Read a chapter',
  'Write a paragraph',
  'Study for a test',
  'Pack my school bag',
  'Get ready in the morning',
  'Eat a meal',
  'Clean my room',
  'Other...',
];

const DURATIONS = [5, 10, 15, 20, 25, 30, 45, 60];

const PHASE = { INTRO: 'intro', PREDICT: 'predict', RUNNING: 'running', RESULT: 'result' };

export default function TimeWise({
  navigation }) {
  const colors = useColors();
  const { timeWiseSessions, addTimeWiseSession, participantCode } = useStore(s => ({
    timeWiseSessions: s.timeWiseSessions,
    addTimeWiseSession: s.addTimeWiseSession,
    participantCode: s.participantCode,
  }));

  const [phase, setPhase] = useState(PHASE.INTRO);
  const [selectedTask, setSelectedTask] = useState(null);
  const [customTask, setCustomTask] = useState('');
  const [predictedMin, setPredictedMin] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [lastResult, setLastResult] = useState(null);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (phase === PHASE.RUNNING) {
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  function startTask() {
    setElapsedSec(0);
    setPhase(PHASE.RUNNING);
  }

  async function markDone() {
    const actualSec = Math.floor((Date.now() - startRef.current) / 1000);
    const actualMin = Math.round((actualSec / 60) * 10) / 10;
    const coeff = actualMin > 0 ? Math.round((predictedMin / actualMin) * 100) / 100 : null;
    const taskLabel = selectedTask === 'Other...' ? (customTask.trim() || 'Other') : selectedTask;

    const session = {
      date: new Date().toISOString().split('T')[0],
      task: taskLabel,
      predictedMin,
      actualMin,
      coeff,
    };

    setLastResult(session);
    addTimeWiseSession(session);

    await logSession(participantCode, {
      module: 'TimeWise',
      task: taskLabel,
      predictedMin,
      actualMin,
      accuracyCoefficient: coeff,
    });

    setPhase(PHASE.RESULT);
  }

  const taskLabel = selectedTask === 'Other...' ? (customTask.trim() || 'Other') : selectedTask;
  const phaseStep = { intro: 0, predict: 1, running: 2, result: 3 }[phase] ?? 0;
  const scrollRef = useRef(null);

  // ── INTRO ──
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={phaseStep} total={4} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: colors.text }]}>⏱ TimeWise</Text>
          <Text style={[styles.headline, { color: colors.text }]}>Task Duration Prediction</Text>
          <SpeakButton text="Our brains are wired for big ideas, creativity, and energy — and we can absolutely train them to master time too. Every time we guess how long something takes and then check how close we were, we build a real superpower called time awareness. Scientists have proven this kind of practice actually rewires the brain and makes us sharper. Session by session, we get calmer, more confident, and more in control of our day. We are not behind — we are training. Pick a task, make our best guess, do it, and see how close we are. We've got this." size="sm" style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
          <AnimatedGuide placeholder="timewise" label="Predict · Do · Compare" width={110} height={110} />
          <Text style={[styles.body, { color: colors.text }]}>Guess. Do it. See how close you were.</Text>
          <View style={[styles.goalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.goalLabel, { color: colors.text }]}>WHAT YOU'LL GAIN</Text>
            <Text style={[styles.goalText, { color: colors.text }]}>My brain always underestimates. With practice, I'll learn by how much — and start adding the buffer before I'm late</Text>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={() => setPhase(PHASE.PREDICT)}>
          <Text style={styles.buttonText}>Pick a task →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── PREDICT ──
  if (phase === PHASE.PREDICT) {
    const canStart = selectedTask && predictedMin &&
      (selectedTask !== 'Other...' || customTask.trim().length > 0);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={phaseStep} total={4} />
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: colors.text }]}>Step 1 — Predict</Text>
          <Text style={[styles.headline, { color: colors.text }]}>What am I doing?</Text>

          {TASKS.map(t => (
            <TouchableOpacity
              key={t}
              style={[styles.taskOption, selectedTask === t && styles.taskSelected]}
              onPress={() => {
                setSelectedTask(t);
                setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
              }}
            >
              <Text style={[styles.taskOptionText, selectedTask === t && styles.taskOptionTextSelected]}>{t}</Text>
            </TouchableOpacity>
          ))}

          {selectedTask === 'Other...' && (
            <TextInput
              style={[styles.taskInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
              placeholder="Describe your task..."
              value={customTask}
              onChangeText={setCustomTask}
              placeholderTextColor={colors.textLight}
            />
          )}

          {selectedTask && (
            <>
              <Text style={[styles.headline, { marginTop: 28, marginBottom: 4, color: colors.primary }]}>
                👇 Step 2 — How long will it take?
              </Text>
              <Text style={[styles.body, { marginBottom: 12, color: colors.textLight }]}>
                Pick a time — then Start timer unlocks.
              </Text>
              <View style={styles.durationGrid}>
                {DURATIONS.map(d => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationChip, predictedMin === d && styles.durationChipSelected]}
                    onPress={() => setPredictedMin(d)}
                  >
                    <Text style={[styles.durationText, predictedMin === d && styles.durationTextSelected]}>
                      {d} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </ScrollView>
        <TouchableOpacity
          style={[styles.button, !canStart && styles.buttonDisabled]}
          onPress={canStart ? startTask : undefined}
          activeOpacity={canStart ? 0.8 : 1}
        >
          <Text style={styles.buttonText}>Start timer →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── RUNNING ──
  if (phase === PHASE.RUNNING) {
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={phaseStep} total={4} />
        <View style={styles.content}>
          <Text style={[styles.moduleTag, { color: colors.text }]}>⏱ Timer running</Text>
          <Text style={[styles.taskRunning, { color: colors.text }]}>{taskLabel}</Text>
          <Text style={styles.elapsed}>{mins}:{secs.toString().padStart(2, '0')}</Text>
          <Text style={[styles.elapsedLabel, { color: colors.text }]}>elapsed</Text>
          <View style={[styles.hintBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.hint, { color: colors.text }]}>Put the phone down and get it done.</Text>
            <Text style={[styles.hint, { color: colors.text }]}>Tap Done when I'm finished.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={markDone}>
          <Text style={styles.buttonText}>Mark Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── RESULT ──
  if (phase === PHASE.RESULT && lastResult) {
    const { task, predictedMin: pred, actualMin: act, coeff: c } = lastResult;
    const underestimated = c < 1.0;
    const pctOff = Math.round(Math.abs(1 - c) * 100);
    const accurate = c >= 0.85 && c <= 1.15;

    let headline, feedback;
    if (accurate) {
      headline = 'Really close.';
      feedback = `I predicted ${pred} min and it took ${act} min. My frontal cortex is calibrating well.`;
    } else if (underestimated) {
      headline = 'I underestimated.';
      feedback = c < 0.5
        ? `I thought ${pred} min — it took ${act} min. Off by ${pctOff}%. This is a large gap. Very common with ADHD. Keep logging to find my personal multiplier.`
        : `I underestimated by ${pctOff}%. My brain assumed it'd be faster. Keep tracking — I'll start to see my pattern.`;
    } else {
      headline = 'I overestimated.';
      feedback = `I predicted ${pred} min but finished in ${act} min — ${pctOff}% faster than expected. Less common, but worth knowing.`;
    }

    const pastSessions = timeWiseSessions.slice(-6);
    const avgCoeff = pastSessions.length > 1
      ? (pastSessions.reduce((a, s) => a + (s.coeff || 0), 0) / pastSessions.length).toFixed(2)
      : null;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={phaseStep} total={4} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: colors.text }]}>⏱ TimeWise — Result</Text>
          <Text style={[styles.headline, { color: colors.text }]}>{headline}</Text>

          <View style={styles.resultRow}>
            <View style={[styles.resultBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resultLabel, { color: colors.text }]}>I predicted</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{pred}</Text>
              <Text style={styles.resultUnit}>min</Text>
            </View>
            <View style={[styles.resultBox, { backgroundColor: colors.surface }]}>
              <Text style={[styles.resultLabel, { color: colors.text }]}>It actually took</Text>
              <Text style={[styles.resultValue, { color: colors.text }]}>{act}</Text>
              <Text style={styles.resultUnit}>min</Text>
            </View>
          </View>

          <View style={[styles.coeffBox, { backgroundColor: colors.surface }]}>
            <Text style={styles.coeffLabel}>Accuracy coefficient</Text>
            <Text style={[styles.coeffValue, { color: accurate ? colors.success : colors.primary }]}>
              {c?.toFixed(2)}
            </Text>
            <Text style={[styles.coeffSub, { color: colors.text }]}>1.0 = perfect · below 1.0 = underestimated</Text>
          </View>

          <Text style={[styles.body, { color: colors.text }]}>{feedback}</Text>

          {pastSessions.length >= 2 && (
            <View style={[styles.trendBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.trendTitle, { color: colors.text }]}>MY PATTERN ({pastSessions.length} sessions)</Text>
              {avgCoeff && (
                <Text style={[styles.trendAvg, { color: colors.text }]}>Average coefficient: {avgCoeff}
                  {avgCoeff < 1.0 ? ` — I typically underestimate by ${Math.round((1 - avgCoeff) * 100)}%` : ''}
                </Text>
              )}
              {pastSessions.map((s, i) => (
                <View key={i} style={styles.trendRow}>
                  <Text style={[styles.trendTask, { color: colors.text }]} numberOfLines={1}>{s.task}</Text>
                  <Text style={[styles.trendPred, { color: colors.text }]}>{s.predictedMin}→{s.actualMin}m</Text>
                  <Text style={[styles.trendCoeff, { color: s.coeff >= 0.85 && s.coeff <= 1.15 ? colors.success : colors.primary }]}>
                    {s.coeff?.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, paddingBottom: 16 },

  headlineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 0 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 12 },
  hint: { fontSize: 15, color: colors.textLight, lineHeight: 22, textAlign: 'center' },

  goalBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1.5, borderColor: colors.primary },
  goalLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },

  taskOption: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 14, marginBottom: 8 },
  taskSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  taskOptionText: { fontSize: 15, color: colors.text },
  taskOptionTextSelected: { color: colors.primary, fontWeight: '700' },
  taskInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, backgroundColor: '#fff', marginBottom: 8 },

  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  durationChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#fff' },
  durationChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  durationText: { fontSize: 14, fontWeight: '700', color: colors.text },
  durationTextSelected: { color: '#fff' },

  taskRunning: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 32, textAlign: 'center' },
  elapsed: { fontSize: 72, fontWeight: '900', color: colors.primary, textAlign: 'center', letterSpacing: 2 },
  elapsedLabel: { fontSize: 14, color: colors.textLight, textAlign: 'center', marginBottom: 32 },
  hintBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, alignItems: 'center' },

  resultRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  resultBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0' },
  resultLabel: { fontSize: 12, color: colors.textLight, marginBottom: 6 },
  resultValue: { fontSize: 36, fontWeight: '900', color: colors.text },
  resultUnit: { fontSize: 13, color: colors.textLight, marginTop: 2 },

  coeffBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', marginBottom: 16 },
  coeffLabel: { fontSize: 12, color: colors.textLight, marginBottom: 4 },
  coeffValue: { fontSize: 42, fontWeight: '900', marginBottom: 4 },
  coeffSub: { fontSize: 12, color: colors.textLight, textAlign: 'center' },

  trendBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EBEBEB', marginTop: 8 },
  trendTitle: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 6 },
  trendAvg: { fontSize: 13, color: colors.text, fontWeight: '600', marginBottom: 10 },
  trendRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderColor: '#F0F0F0' },
  trendTask: { flex: 1, fontSize: 13, color: colors.textLight },
  trendPred: { fontSize: 12, color: colors.textLight, marginRight: 12 },
  trendCoeff: { fontSize: 14, fontWeight: '800', width: 40, textAlign: 'right' },

  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#C5C5E8' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
});
