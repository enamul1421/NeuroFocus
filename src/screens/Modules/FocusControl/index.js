import React, { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated,
} from 'react-native';
import { useStore } from '../../../store';
import { colors, useColors } from '../../../theme';
import { logSession } from '../../../services/logger';
import SpeakButton from '../../../components/SpeakButton';
import ModuleTopBar from '../../../components/ModuleTopBar';
import AnimatedGuide from '../../../components/AnimatedGuide';
import SessionProgress from '../../../components/SessionProgress';

// ── Scenarios ─────────────────────────────────────────────────────────────────

const GO = [
  { id: 'study_timer', icon: '📚', label: 'Focus timer started',  sub: 'Time to work on your task' },
  { id: 'teacher',     icon: '👩‍🏫', label: 'Teacher question',     sub: 'She called your name' },
  { id: 'assignment',  icon: '📝', label: 'Assignment reminder',   sub: 'English essay due in 2 days' },
  { id: 'break_over',  icon: '✅', label: 'Break is over',         sub: 'Back to your task' },
  { id: 'study_group', icon: '👥', label: 'Study group ready',     sub: 'Your group is waiting for you' },
];

const NOGO = [
  { id: 'instagram',  icon: '📸', label: 'Instagram',        sub: 'Alex liked your photo' },
  { id: 'game',       icon: '🎮', label: 'Game invite',       sub: 'Your friend is online now' },
  { id: 'youtube',    icon: '▶️', label: 'YouTube',           sub: 'New video from your fav channel' },
  { id: 'text',       icon: '💬', label: 'New messages',      sub: '3 messages in the group chat' },
  { id: 'music',      icon: '🎵', label: 'New track dropped', sub: 'By your favorite artist' },
  { id: 'tiktok',     icon: '📱', label: 'TikTok',            sub: '12 new videos for you' },
  { id: 'snack',      icon: '🍕', label: 'Snack break?',      sub: "The kitchen is calling..." },
  { id: 'snapchat',   icon: '👻', label: 'Snapchat',          sub: 'Someone sent you a snap' },
];

const TRIAL_MS    = 1500;
const FEEDBACK_MS = 750;
const WAIT_MS     = 600;
const TRIAL_COUNT = 25;

const PHASE = { INTRO: 'intro', TRAINING: 'training', RESULTS: 'results' };

// Signal detection theory d-prime (sensitivity index)
function zScore(p) {
  const q = p < 0.5 ? p : 1 - p;
  const t = Math.sqrt(-2 * Math.log(q));
  const z = t - (2.515517 + 0.802853*t + 0.010328*t*t) /
                (1 + 1.432788*t + 0.189269*t*t + 0.001308*t*t*t);
  return p < 0.5 ? -z : z;
}
function calcDPrime(hitRate, faRate) {
  const hr = Math.max(0.01, Math.min(0.99, hitRate));
  const fa = Math.max(0.01, Math.min(0.99, faRate));
  return Math.round((zScore(hr) - zScore(fa)) * 100) / 100;
}
const TS    = { WAIT: 'wait', STIMULUS: 'stimulus', FEEDBACK: 'feedback' };

const FB = {
  hit:             { color: '#4CAF50', bg: '#E8F5E9', icon: '✓', text: 'Act on it!' },
  miss:            { color: '#FF9800', bg: '#FFF3E0', icon: '✗', text: 'Needed action' },
  correct_inhibit: { color: '#9E9E9E', bg: '#F5F5F5', icon: '✓', text: 'Ignored!' },
  false_alarm:     { color: '#F44336', bg: '#FFEBEE', icon: '✗', text: 'Distraction got you' },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateTrials(count, nogoRatio) {
  const nogoCount = Math.round(count * nogoRatio);
  const goCount = count - nogoCount;
  const arr = [
    ...Array.from({ length: goCount },   () => ({ ...pick(GO),   type: 'go' })),
    ...Array.from({ length: nogoCount }, () => ({ ...pick(NOGO), type: 'nogo' })),
  ];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FocusControl({
  navigation }) {
  const colors = useColors();
  const {
    addFocusControlSession, focusControlSessions,
    focusNogoRatio, setFocusNogoRatio, participantCode,
  } = useStore(s => ({
    addFocusControlSession: s.addFocusControlSession,
    focusControlSessions:   s.focusControlSessions || [],
    focusNogoRatio:         s.focusNogoRatio ?? 0.4,
    setFocusNogoRatio:      s.setFocusNogoRatio,
    participantCode:        s.participantCode,
  }));

  const [phase,       setPhase]       = useState(PHASE.INTRO);
  const [trials,      setTrials]      = useState([]);
  const [trialIdx,    setTrialIdx]    = useState(0);
  const [trialState,  setTrialState]  = useState(TS.WAIT);
  const [feedbackKey, setFeedbackKey] = useState(null);
  const [results,     setResults]     = useState([]);

  const tappedRef  = useRef(false);
  const trialRef   = useRef(null);
  const timerAnim  = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef(null);
  const waitRef    = useRef(null);

  useEffect(() => () => {
    clearTimeout(waitRef.current);
    if (timerRef.current) timerRef.current.stop();
  }, []);

  useEffect(() => {
    if (trialState !== TS.STIMULUS) return;
    tappedRef.current = false;
    timerAnim.setValue(1);
    timerRef.current = Animated.timing(timerAnim, {
      toValue: 0, duration: TRIAL_MS, useNativeDriver: false,
    });
    timerRef.current.start(({ finished }) => {
      if (finished) evaluateTrial(false);
    });
    return () => { if (timerRef.current) timerRef.current.stop(); };
  }, [trialState, trialIdx]); // eslint-disable-line

  function startSession() {
    const t = generateTrials(TRIAL_COUNT, focusNogoRatio);
    trialRef.current = t[0];
    setTrials(t);
    setTrialIdx(0);
    setResults([]);
    setFeedbackKey(null);
    setPhase(PHASE.TRAINING);
    setTrialState(TS.WAIT);
    waitRef.current = setTimeout(() => setTrialState(TS.STIMULUS), WAIT_MS);
  }

  function handleTap() {
    if (trialState !== TS.STIMULUS) return;
    if (tappedRef.current) return;
    tappedRef.current = true;
    if (timerRef.current) timerRef.current.stop();
    evaluateTrial(true);
  }

  function evaluateTrial(userTapped) {
    const trial = trialRef.current;
    if (!trial) return;
    let fb;
    if      (trial.type === 'go'   &&  userTapped) fb = 'hit';
    else if (trial.type === 'go'   && !userTapped) fb = 'miss';
    else if (trial.type === 'nogo' &&  userTapped) fb = 'false_alarm';
    else                                            fb = 'correct_inhibit';

    setFeedbackKey(fb);
    setTrialState(TS.FEEDBACK);

    setResults(prev => {
      const updated = [...prev, { ...trial, tapped: userTapped, fb }];
      waitRef.current = setTimeout(() => {
        const nextIdx = updated.length;
        if (nextIdx >= TRIAL_COUNT) {
          finishSession(updated);
        } else {
          trialRef.current = trials[nextIdx] || null;
          setTrialIdx(nextIdx);
          setFeedbackKey(null);
          setTrialState(TS.WAIT);
          waitRef.current = setTimeout(() => setTrialState(TS.STIMULUS), WAIT_MS);
        }
      }, FEEDBACK_MS);
      return updated;
    });
  }

  function finishSession(finalResults) {
    const goT  = finalResults.filter(r => r.type === 'go');
    const nogoT = finalResults.filter(r => r.type === 'nogo');
    const hits = goT.filter(r => r.fb === 'hit').length;
    const fa   = nogoT.filter(r => r.fb === 'false_alarm').length;
    const hitRate = goT.length   > 0 ? hits / goT.length   : 0;
    const faRate  = nogoT.length > 0 ? fa   / nogoT.length : 0;
    const brakeScore = Math.max(0, Math.round((hitRate - faRate) * 100));
    const dPrime     = calcDPrime(hitRate, faRate);
    const resisted   = nogoT.filter(r => r.fb === 'correct_inhibit').map(r => r.label);

    let newRatio = focusNogoRatio;
    if (faRate < 0.10) newRatio = Math.min(0.60, focusNogoRatio + 0.05);
    else if (faRate > 0.30) newRatio = Math.max(0.30, focusNogoRatio - 0.05);
    setFocusNogoRatio(newRatio);

    const session = {
      date: new Date().toISOString(),
      hitRate:    Math.round(hitRate * 100),
      faRate:     Math.round(faRate  * 100),
      brakeScore,
      dPrime,
      nogoRatio:  focusNogoRatio,
      trialsCount: finalResults.length,
      resisted,
    };
    addFocusControlSession(session);
    logSession(participantCode, { module: 'FocusControl', ...session });
    setPhase(PHASE.RESULTS);
  }

  const lastSession = focusControlSessions.length > 0
    ? focusControlSessions[focusControlSessions.length - 1] : null;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ModuleTopBar emoji="🎯" onBack={() => navigation.goBack()} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: colors.text }]}>🎯 FocusControl</Text>
          <Text style={[styles.headline, { color: colors.text }]}>Train your mental brake</Text>
          <SpeakButton text="Inhibitory control — the brain's stop signal — can be weaker but is absolutely trainable. Clinical studies show even 10 sessions improve response accuracy. Today: 25 cards in 1.5 seconds each — tap study items, ignore distractions. About 3 minutes. Every good stop is a real brain rep." size="sm" style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
          <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.goalText, { color: colors.text }]}>🎯 Goal: Brake score → 80+ · False alarms under 10%</Text>
          </View>
          <AnimatedGuide placeholder="focus" label="Resist distractions" width={120} height={120} style={{ marginTop: 32, marginBottom: 32 }} />
          <Text style={[styles.body, { color: colors.text }]}>Tap study items. Ignore distractions.</Text>

          <View style={[styles.ruleCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.ruleItem}>⏱ 1.5s per card · 🎯 25 trials · 📈 Adjusts each session</Text>
          </View>

          {lastSession && (
            <View style={[styles.lastCard, { backgroundColor: colors.surface }]}>
              <Text style={styles.lastTitle}>Last session</Text>
              <Text style={styles.lastStat}>Brake score: <Text style={{ fontWeight: '800' }}>{lastSession.brakeScore}</Text></Text>
              <Text style={styles.lastStat}>False alarms: {lastSession.faRate}%</Text>
            </View>
          )}
          <View style={{ height: 16 }} />
        </ScrollView>
        <TouchableOpacity style={styles.primaryBtn} onPress={startSession}>
          <Text style={styles.primaryBtnText}>Start training →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── TRAINING ───────────────────────────────────────────────────────────────
  if (phase === PHASE.TRAINING) {
    const trial = trials[trialIdx];
    const fb = feedbackKey ? FB[feedbackKey] : null;
    const isStimulus = trialState === TS.STIMULUS;
    const isFeedback = trialState === TS.FEEDBACK;
    const progress = (trialIdx + (isFeedback ? 1 : 0)) / TRIAL_COUNT;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <Text style={[styles.trialCounter, { color: colors.text }]}>
          Trial {trialIdx + (isFeedback ? 1 : 0)} / {TRIAL_COUNT}
        </Text>

        <View style={styles.sceneRow}>
          <Text style={styles.sceneIcon}>📖</Text>
          <Text style={styles.sceneText}>You're doing homework</Text>
        </View>

        <View style={styles.stimulusArea}>
          {trialState === TS.WAIT ? (
            <View style={styles.waitDot} />
          ) : trial ? (
            <View style={[
              styles.notifCard, styles.trialCard,
              isFeedback && fb && { borderColor: fb.color, backgroundColor: fb.bg },
            ]}>
              <Text style={styles.notifIcon}>{trial.icon}</Text>
              <View style={styles.notifText}>
                <Text style={[styles.notifLabel, { color: colors.text }]}>{trial.label}</Text>
                <Text style={[styles.notifSub, { color: colors.text }]}>{trial.sub}</Text>
              </View>
              {isFeedback && fb && (
                <View style={[styles.fbBadge, { backgroundColor: fb.color }]}>
                  <Text style={styles.fbBadgeText}>{fb.icon}</Text>
                </View>
              )}
            </View>
          ) : null}

          {isFeedback && fb && (
            <Text style={[styles.fbLabel, { color: fb.color }]}>{fb.text}</Text>
          )}

          {isStimulus && (
            <View style={styles.timerBg}>
              <Animated.View style={[styles.timerFill, {
                width: timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.tapBtn, !isStimulus && styles.tapBtnOff]}
          onPress={handleTap}
          activeOpacity={0.6}
        >
          <Text style={[styles.tapBtnText, !isStimulus && styles.tapBtnTextOff]}>
            {isStimulus ? 'TAP' : '·'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── RESULTS ────────────────────────────────────────────────────────────────
  if (phase === PHASE.RESULTS) {
    const session = focusControlSessions[focusControlSessions.length - 1];
    if (!session) return null;
    const { brakeScore, hitRate, faRate, resisted, dPrime } = session;
    const emoji = brakeScore >= 80 ? '🧠' : brakeScore >= 60 ? '💪' : '🔄';
    const prev = focusControlSessions.length >= 2
      ? focusControlSessions[focusControlSessions.length - 2] : null;
    const delta = prev ? brakeScore - prev.brakeScore : null;
    const uniqueResisted = [...new Set(resisted)];

    const msg = faRate <= 10
      ? `You resisted ${resisted.length} distractions. Your brake is strong.`
      : faRate <= 25
      ? `You resisted ${resisted.length} distractions. A few slipped through — keep training.`
      : `${resisted.length} resisted. The brake gets faster with practice.`;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.bigEmoji, { color: colors.text }]}>{emoji}</Text>
          <Text style={[styles.scoreLabel, { color: colors.text }]}>BRAKE SCORE</Text>
          <Text style={[styles.scoreValue, { color: colors.text }]}>{brakeScore}</Text>
          {delta !== null && (
            <Text style={[styles.delta, { color: delta >= 0 ? '#4CAF50' : '#F44336' }]}>
              {delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`} from last session
            </Text>
          )}

          <View style={[styles.metricsCard, { backgroundColor: colors.surface }]}>
            {[
              { label: 'Hit rate',     value: hitRate, color: '#4CAF50' },
              { label: 'False alarms', value: faRate,  color: '#F44336' },
            ].map(m => (
              <View key={m.label} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{m.label}</Text>
                <View style={styles.metricBarBg}>
                  <View style={[styles.metricBarFill, { width: `${m.value}%`, backgroundColor: m.color }]} />
                </View>
                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}%</Text>
              </View>
            ))}
            {dPrime != null && (
              <View style={[styles.metricRow, { marginTop: 8, borderTopWidth: 1, borderColor: '#F0F0F0', paddingTop: 8 }]}>
                <Text style={styles.metricLabel}>d-prime (sensitivity)</Text>
                <View style={styles.metricBarBg}>
                  <View style={[styles.metricBarFill, { width: `${Math.min(100, dPrime / 4 * 100)}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.metricValue, { color: colors.primary }]}>{dPrime?.toFixed(2)}</Text>
              </View>
            )}
          </View>

          {uniqueResisted.length > 0 && (
            <View style={styles.resistedCard}>
              <Text style={styles.resistedTitle}>Distractions you resisted ({resisted.length})</Text>
              <Text style={styles.resistedList}>{uniqueResisted.join('  ·  ')}</Text>
            </View>
          )}

          <View style={[styles.connectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={styles.connectionMsg}>💡 {msg}</Text>
            <Text style={styles.connectionSub}>
              This is the same mental brake you use when your phone lights up during homework.
            </Text>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingTop: 8, paddingBottom: 16 },
  headlineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  goalCard: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: colors.primary + '40' },
  goalText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  moduleTag: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 10 },
  body: { fontSize: 15, color: colors.textLight, lineHeight: 22, marginBottom: 20 },
  exampleLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },

  notifCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 14, marginBottom: 8, gap: 12, backgroundColor: '#fff' },
  goCard:    { borderColor: '#4CAF50', backgroundColor: '#F1F8E9' },
  nogoCard:  { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  trialCard: { borderColor: '#E0E0E0', backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, width: '100%' },
  notifIcon: { fontSize: 28 },
  notifText: { flex: 1 },
  notifLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  notifSub:   { fontSize: 12, color: colors.textLight, marginTop: 2 },
  goTag:   { backgroundColor: '#4CAF50', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  goTagText:   { fontSize: 11, color: '#fff', fontWeight: '800' },
  nogoTag: { backgroundColor: '#F44336', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  nogoTagText: { fontSize: 11, color: '#fff', fontWeight: '800' },
  fbBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  fbBadgeText: { fontSize: 16, color: '#fff', fontWeight: '800' },

  ruleCard: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginTop: 8, gap: 6 },
  ruleItem: { fontSize: 13, color: colors.textLight },
  lastCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: colors.primary + '40' },
  lastTitle: { fontSize: 11, fontWeight: '800', color: colors.primary, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 },
  lastStat:  { fontSize: 14, color: colors.text },
  primaryBtn:   { backgroundColor: colors.primary, margin: 24, marginBottom: 8, padding: 18, borderRadius: 14, alignItems: 'center' },
  backLink:     { alignItems: 'center', paddingVertical: 10, marginBottom: 16 },
  backLinkText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  progressBg:   { height: 3, backgroundColor: '#F0F0F0' },
  progressFill: { height: 3, backgroundColor: colors.primary },
  trialCounter: { fontSize: 12, color: colors.textLight, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  sceneRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10 },
  sceneIcon: { fontSize: 18 },
  sceneText: { fontSize: 14, fontWeight: '600', color: colors.textLight },
  stimulusArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  waitDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#E0E0E0' },
  fbLabel: { fontSize: 16, fontWeight: '700', marginTop: 10 },
  timerBg:   { height: 4, width: '100%', backgroundColor: '#F0F0F0', borderRadius: 2, marginTop: 14, overflow: 'hidden' },
  timerFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  tapBtn:    { margin: 24, marginBottom: 32, height: 100, borderRadius: 24, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  tapBtnOff: { backgroundColor: '#F0F0F0', shadowOpacity: 0 },
  tapBtnText:    { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: 4 },
  tapBtnTextOff: { color: '#BDBDBD' },

  bigEmoji:   { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  scoreLabel: { fontSize: 13, fontWeight: '800', color: colors.textLight, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' },
  scoreValue: { fontSize: 80, fontWeight: '900', color: colors.text, textAlign: 'center', lineHeight: 90 },
  delta:      { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  metricsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 14, gap: 14 },
  metricRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { fontSize: 13, color: colors.textLight, width: 90 },
  metricBarBg: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  metricBarFill: { height: 8, borderRadius: 4 },
  metricValue: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  resistedCard:  { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginBottom: 14 },
  resistedTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6 },
  resistedList:  { fontSize: 13, color: colors.textLight, lineHeight: 20 },
  connectionCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.primary + '40' },
  connectionMsg:  { fontSize: 15, color: colors.text, fontWeight: '600', lineHeight: 22, marginBottom: 8 },
  connectionSub:  { fontSize: 13, color: colors.primary, lineHeight: 20 },
});
