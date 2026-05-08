import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { logSession } from '../../../services/logger';
import { useStore } from '../../../store';
import { colors } from '../../../theme';

const PHASE = { INTRO: 'intro', SHOW: 'show', RECALL: 'recall', FEEDBACK: 'feedback', SUMMARY: 'summary' };
const DIGITS = '0123456789';

function randomDigits(length) {
  return Array.from({ length }, () => DIGITS[Math.floor(Math.random() * 10)]).join(' ');
}

export default function MemoryBank({ navigation }) {
  const participantCode = useStore(s => s.participantCode);
  const [phase, setPhase] = useState(PHASE.INTRO);
  const [mode, setMode] = useState('forward'); // 'forward' | 'backward'
  const [spanLength, setSpanLength] = useState(3);
  const [sequence, setSequence] = useState('');
  const [userAnswer, setUserAnswer] = useState([]);
  const [trialNum, setTrialNum] = useState(0);
  const [results, setResults] = useState([]);
  const [showSequence, setShowSequence] = useState(true);
  const digits = sequence.split(' ');

  function startTrial(span = spanLength, m = mode) {
    const seq = randomDigits(span);
    setSequence(seq);
    setUserAnswer([]);
    setShowSequence(true);
    setPhase(PHASE.SHOW);
    setTimeout(() => {
      setShowSequence(false);
      setPhase(PHASE.RECALL);
    }, span * 900 + 500);
  }

  function tapDigit(d) {
    setUserAnswer(prev => [...prev, d]);
  }

  function submitAnswer() {
    const target = mode === 'forward' ? digits : [...digits].reverse();
    const correct = userAnswer.join('') === target.join('');
    const result = { spanLength, mode, correct };
    const newResults = [...results, result];
    setResults(newResults);
    setPhase(PHASE.FEEDBACK);

    setTimeout(() => {
      if (trialNum + 1 >= 6) {
        setPhase(PHASE.SUMMARY);
      } else {
        setTrialNum(t => t + 1);
        const consecutiveCorrect = newResults.slice(-2).every(r => r.correct);
        const newSpan = consecutiveCorrect ? Math.min(spanLength + 1, 8) : spanLength;
        setSpanLength(newSpan);
        startTrial(newSpan, mode);
      }
    }, 1500);
  }

  async function finishSession() {
    const correctCount = results.filter(r => r.correct).length;
    const maxSpan = Math.max(...results.map(r => r.spanLength));
    await logSession(participantCode, {
      module: 'MemoryBank',
      mode,
      trialsCompleted: results.length,
      correctCount,
      maxSpanReached: maxSpan,
    });
    navigation.goBack();
  }

  if (phase === PHASE.INTRO) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.moduleTag}>🧠 MemoryBank</Text>
        <Text style={styles.headline}>Working Memory</Text>
        <Text style={styles.body}>
          Digits appear one at a time. Remember them in order, then tap them back.
        </Text>
        <View style={styles.goalBox}>
          <Text style={styles.goalLabel}>WHAT YOU'LL GAIN</Text>
          <Text style={styles.goalText}>With practice, you'll stop losing track mid-task and actually remember instructions the first time</Text>
        </View>
        <Text style={styles.label}>Choose mode:</Text>
        <TouchableOpacity
          style={[styles.modeOption, mode === 'forward' && styles.modeSelected]}
          onPress={() => setMode('forward')}
        >
          <Text style={styles.modeTitle}>Forward span</Text>
          <Text style={styles.modeSub}>Repeat digits in the same order</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeOption, mode === 'backward' && styles.modeSelected]}
          onPress={() => setMode('backward')}
        >
          <Text style={styles.modeTitle}>Backward span</Text>
          <Text style={styles.modeSub}>Repeat digits in reverse order (harder)</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => startTrial()}>
        <Text style={styles.buttonText}>Start →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.SHOW) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.trialCounter}>Trial {trialNum + 1} / 6 · Span {spanLength}</Text>
        <Text style={styles.headline}>Remember this:</Text>
        <View style={styles.sequenceDisplay}>
          {showSequence
            ? <Text style={styles.sequenceText}>{sequence}</Text>
            : <Text style={styles.sequenceHidden}>···</Text>}
        </View>
        <Text style={styles.body}>
          {mode === 'forward' ? 'Repeat in the same order.' : 'Repeat in REVERSE order.'}
        </Text>
      </View>
    </SafeAreaView>
  );

  if (phase === PHASE.RECALL) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.trialCounter}>Your turn · Span {spanLength}</Text>
        <Text style={styles.headline}>
          {mode === 'forward' ? 'Tap the digits in order:' : 'Tap the digits in REVERSE:'}
        </Text>
        <View style={styles.answerRow}>
          {userAnswer.map((d, i) => (
            <View key={i} style={styles.answerBox}>
              <Text style={styles.answerDigit}>{d}</Text>
            </View>
          ))}
          {Array.from({ length: Math.max(0, spanLength - userAnswer.length) }).map((_, i) => (
            <View key={`empty-${i}`} style={[styles.answerBox, styles.answerEmpty]} />
          ))}
        </View>
        <View style={styles.numpad}>
          {['1','2','3','4','5','6','7','8','9','⌫','0','✓'].map(k => (
            <TouchableOpacity
              key={k}
              style={[styles.numKey, k === '✓' && styles.numKeySubmit, k === '⌫' && styles.numKeyDelete]}
              onPress={() => {
                if (k === '⌫') setUserAnswer(prev => prev.slice(0, -1));
                else if (k === '✓') submitAnswer();
                else if (userAnswer.length < spanLength) tapDigit(k);
              }}
              disabled={k === '✓' && userAnswer.length < spanLength}
            >
              <Text style={[styles.numKeyText, k === '✓' && styles.numKeyTextSubmit]}>
                {k}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );

  if (phase === PHASE.FEEDBACK) {
    const lastResult = results[results.length - 1];
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: lastResult?.correct ? '#E8F5E9' : '#FFF3E0' }]}>
        <View style={styles.content}>
          <Text style={[styles.feedbackBig, { color: lastResult?.correct ? colors.success : '#F57C00' }]}>
            {lastResult?.correct ? '✓ Correct!' : '✗ Not quite'}
          </Text>
          <Text style={styles.body}>
            {lastResult?.correct ? 'Great recall.' : `The sequence was: ${sequence}${mode === 'backward' ? '\nReversed: ' + digits.reverse().join(' ') : ''}`}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (phase === PHASE.SUMMARY) {
    const correct = results.filter(r => r.correct).length;
    const maxSpan = Math.max(...results.map(r => r.spanLength));
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>🧠 MemoryBank — Complete</Text>
          <Text style={styles.headline}>Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{correct}/6</Text>
              <Text style={styles.statLabel}>Correct</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{maxSpan}</Text>
              <Text style={styles.statLabel}>Max span</Text>
            </View>
          </View>
          <Text style={styles.body}>
            {maxSpan >= 6 ? "Strong working memory span — above average for teens." :
             maxSpan >= 4 ? "Good session. Consistent practice grows the span over weeks." :
             "Working memory is trainable. Regular sessions will show real progress."}
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={finishSession}>
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
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  trialCounter: { fontSize: 13, color: colors.textLight, fontWeight: '600', marginBottom: 16 },
  goalBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: colors.primary },
  goalLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },
  modeOption: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 16, marginBottom: 10 },
  modeSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  modeTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modeSub: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  sequenceDisplay: { alignItems: 'center', marginVertical: 32 },
  sequenceText: { fontSize: 48, fontWeight: '900', color: colors.text, letterSpacing: 12 },
  sequenceHidden: { fontSize: 48, color: colors.textLight, letterSpacing: 12 },
  answerRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 20, flexWrap: 'wrap' },
  answerBox: { width: 44, height: 52, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  answerEmpty: { backgroundColor: '#E0E0E0' },
  answerDigit: { fontSize: 22, fontWeight: '800', color: '#fff' },
  numpad: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 16 },
  numKey: { width: 72, height: 56, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#E0E0E0' },
  numKeySubmit: { backgroundColor: colors.primary, borderColor: colors.primary },
  numKeyDelete: { backgroundColor: '#F5F5F5' },
  numKeyText: { fontSize: 22, fontWeight: '700', color: colors.text },
  numKeyTextSubmit: { color: '#fff' },
  feedbackBig: { fontSize: 36, fontWeight: '900', marginBottom: 16, textAlign: 'center', marginTop: 60 },
  statsRow: { flexDirection: 'row', gap: 16, marginVertical: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue: { fontSize: 32, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
