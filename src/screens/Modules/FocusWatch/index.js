import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

// FocusWatch — sustained attention / vigilance training.
// Colored circles appear every 2s. Tap ONLY the target color.
// Targets = 20% of trials. Tracks hit rate, false alarms, lapse index
// (misses in 2nd half vs 1st half — the hallmark of ADHD attention decay).

const PHASE   = { INTRO: 'intro', PLAY: 'play', RESULT: 'result' };
const ACCENT  = '#F57F17';
const ACCENT_LIGHT = '#FFF8E1';

const COLORS = [
  { id: 'red',    label: 'RED',    hex: '#E53935' },
  { id: 'blue',   label: 'BLUE',   hex: '#1E88E5' },
  { id: 'green',  label: 'GREEN',  hex: '#43A047' },
  { id: 'yellow', label: 'YELLOW', hex: '#FDD835' },
  { id: 'purple', label: 'PURPLE', hex: '#8E24AA' },
];

const SESSION_SECS  = 180; // 3 min = ~90 stimuli at 2s intervals
const STIM_INTERVAL = 2000;
const TARGET_RATE   = 0.20;

function pickColor(exclude) {
  const pool = COLORS.filter(c => c.id !== exclude?.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

function buildSequence(total) {
  const seq = [];
  for (let i = 0; i < total; i++) {
    seq.push({ isTarget: Math.random() < TARGET_RATE });
  }
  return seq;
}

export default function FocusWatch({ navigation }) {
  const colors = useColors();
  const { addFocusWatchSession } = useStore(s => ({ addFocusWatchSession: s.addFocusWatchSession }));

  const [phase,       setPhase]       = useState(PHASE.INTRO);
  const [target,      setTarget]      = useState(null);        // target color
  const [current,     setCurrent]     = useState(null);        // current displayed color
  const [trialIdx,    setTrialIdx]    = useState(0);
  const [elapsed,     setElapsed]     = useState(0);
  const [results,     setResults]     = useState([]);
  const [feedback,    setFeedback]    = useState(null);        // 'hit'|'fa'|null

  const seqRef       = useRef([]);
  const trialTimerRef= useRef(null);
  const clockRef     = useRef(null);
  const elapsedRef   = useRef(0);
  const feedbackRef  = useRef(null);

  const totalTrials  = Math.floor(SESSION_SECS / (STIM_INTERVAL / 1000));

  useEffect(() => () => {
    clearInterval(trialTimerRef.current);
    clearInterval(clockRef.current);
    clearTimeout(feedbackRef.current);
  }, []);

  function startGame() {
    const t = COLORS[Math.floor(Math.random() * COLORS.length)];
    setTarget(t);
    const seq = buildSequence(totalTrials);
    seqRef.current = seq;
    setTrialIdx(0);
    setElapsed(0);
    elapsedRef.current = 0;
    setResults([]);
    setFeedback(null);
    setPhase(PHASE.PLAY);

    showTrial(0, seq, t);

    clockRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
  }

  function showTrial(idx, seq, t) {
    if (idx >= seq.length) return;
    const s = seq[idx];
    const displayed = s.isTarget ? t : pickColor(t);
    setCurrent(displayed);
    setTrialIdx(idx);

    trialTimerRef.current = setTimeout(() => {
      // Missed target = lapse
      setResults(prev => {
        if (s.isTarget) return [...prev, { isTarget: true, responded: false, half: idx < seq.length / 2 ? 1 : 2 }];
        return prev;
      });
      clearTimeout(feedbackRef.current);
      setFeedback(null);
      showTrial(idx + 1, seq, t);
    }, STIM_INTERVAL);
  }

  function handleTap() {
    if (!current || phase !== PHASE.PLAY) return;
    const s = seqRef.current[trialIdx];
    const isHit = s?.isTarget;
    const isFA  = !s?.isTarget;

    clearTimeout(trialTimerRef.current);
    setFeedback(isHit ? 'hit' : 'fa');

    setResults(prev => [
      ...prev,
      { isTarget: !!s?.isTarget, responded: true, correct: isHit, half: trialIdx < totalTrials / 2 ? 1 : 2 },
    ]);

    feedbackRef.current = setTimeout(() => {
      setFeedback(null);
      const next = trialIdx + 1;
      if (next >= seqRef.current.length) {
        finishGame();
      } else {
        showTrial(next, seqRef.current, target);
      }
    }, 300);
  }

  function finishGame() {
    clearInterval(clockRef.current);
    clearTimeout(trialTimerRef.current);
    setPhase(PHASE.RESULT);
  }

  // Compute stats
  const targets    = results.filter(r => r.isTarget);
  const hits       = targets.filter(r => r.responded && r.correct);
  const misses     = targets.filter(r => !r.responded);
  const falseAlarms= results.filter(r => !r.isTarget && r.responded);
  const hitRate    = targets.length ? Math.round(hits.length / targets.length * 100) : 0;
  const faRate     = results.filter(r => !r.isTarget).length
    ? Math.round(falseAlarms.length / results.filter(r => !r.isTarget).length * 100) : 0;

  const h1Misses = misses.filter(r => r.half === 1).length;
  const h2Misses = misses.filter(r => r.half === 2).length;
  const lapseIndex = h2Misses - h1Misses; // positive = attention decayed over time

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    const demoTarget = COLORS[1]; // show blue as demo
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👁</Text>
          <Text style={[styles.title, { color: colors.text }]}>FocusWatch</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Colored circles appear one at a time. Tap only the target color.
            Most circles are NOT the target — stay sharp.
          </Text>

          <View style={[styles.demoCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <View style={[styles.demoCircle, { backgroundColor: demoTarget.hex }]} />
            <Text style={[styles.demoLabel, { color: ACCENT }]}>Target color assigned at start</Text>
            <Text style={[styles.demoSub, { color: colors.textLight }]}>
              3 minutes · tap target only · ~20% are targets
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
            onPress={startGame}
          >
            <Text style={styles.primaryBtnText}>Start →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PLAY ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.PLAY) {
    const progress = Math.round((trialIdx / totalTrials) * 100);
    const bgColor  = feedback === 'hit' ? '#1B5E20'
      : feedback === 'fa' ? '#B71C1C'
      : colors.background;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <SessionProgress current={progress} total={100} color={ACCENT} />
        <View style={styles.center}>
          {/* Target reminder */}
          <View style={styles.targetBar}>
            <Text style={[styles.targetBarLabel, { color: colors.textLight }]}>TARGET: </Text>
            <View style={[styles.targetDot, { backgroundColor: target?.hex }]} />
            <Text style={[styles.targetBarLabel, { color: colors.textLight }]}>{target?.label}</Text>
          </View>

          {/* Stimulus */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleTap}
            style={[styles.stimCircle, { backgroundColor: current?.hex ?? '#888' }]}
          />

          <Text style={[styles.tapHint, { color: feedback ? '#fff' : colors.textLight }]}>
            {feedback === 'hit' ? '✓ Hit' : feedback === 'fa' ? '✗ False alarm' : 'Tap if target'}
          </Text>

          <Text style={[styles.timeLeft, { color: colors.textLight }]}>
            {Math.floor((SESSION_SECS - elapsed) / 60)}:{String((SESSION_SECS - elapsed) % 60).padStart(2, '0')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.RESULT) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>👁</Text>
          <Text style={[styles.title, { color: colors.text }]}>Done  +50 XP</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={[styles.statVal, { color: ACCENT }]}>{hitRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Hit rate</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' }]}>
              <Text style={[styles.statVal, { color: '#B71C1C' }]}>{faRate}%</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>False alarms</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statVal, { color: lapseIndex > 2 ? '#E65100' : '#2E7D32' }]}>
                {lapseIndex > 0 ? `+${lapseIndex}` : lapseIndex}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Lapse index</Text>
            </View>
          </View>

          <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.insightText, { color: colors.text }]}>
              {lapseIndex > 3
                ? '🔍 Attention faded in the second half — common in ADHD. The pattern itself is useful data.'
                : lapseIndex > 0
                ? '📊 Small attention drop over time — normal range. Consistency builds with practice.'
                : '🎯 Attention held steady from start to finish. Strong vigilance today.'}
            </Text>
            {hitRate < 50 && (
              <Text style={[styles.insightSub, { color: colors.textLight }]}>
                Low hit rate may mean we were being cautious (also fine — precision over speed is a valid strategy).
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%' }]}
            onPress={startGame}
          >
            <Text style={styles.primaryBtnText}>Play again →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, width: '100%' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textLight }]}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  sub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },

  demoCard:   { borderRadius: 14, borderWidth: 1, padding: 20, marginBottom: 28, width: '100%', alignItems: 'center' },
  demoCircle: { width: 60, height: 60, borderRadius: 30, marginBottom: 12 },
  demoLabel:  { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  demoSub:    { fontSize: 12 },

  targetBar:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 32 },
  targetBarLabel: { fontSize: 13, fontWeight: '700' },
  targetDot:      { width: 20, height: 20, borderRadius: 10 },

  stimCircle: { width: 120, height: 120, borderRadius: 60, marginBottom: 24 },
  tapHint:    { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  timeLeft:   { fontSize: 14 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20, width: '100%' },
  statBox:  { flex: 1, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center' },
  statVal:  { fontSize: 24, fontWeight: '900' },
  statLabel:{ fontSize: 11, marginTop: 2, textAlign: 'center' },

  insightCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20, width: '100%' },
  insightText: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  insightSub:  { fontSize: 12, marginTop: 8 },

  primaryBtn:      { borderRadius: 14, padding: 18, alignItems: 'center' },
  primaryBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn:    { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', marginTop: 10 },
  secondaryBtnText:{ fontSize: 15, fontWeight: '600' },
  backLink:        { alignItems: 'center', marginTop: 16, padding: 8 },
  backLinkText:    { fontSize: 13 },
});
