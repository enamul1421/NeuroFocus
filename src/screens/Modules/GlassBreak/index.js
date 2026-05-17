import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';
import TimerRing from '../../../components/TimerRing';

const PHASE = {
  FREEZE:   'freeze',
  SHRINK:   'shrink',
  BODY:     'body',
  LAUNCH:   'launch',
  CONTINUE: 'continue',
  DONE:     'done',
};

const ACCENT       = '#4527A0';
const ACCENT_LIGHT = '#EDE7F6';
const LAUNCH_SECS  = 600; // 10 min
const BODY_SECS    = 60;

const FROZEN_REASONS = [
  { id: 'exam',    label: 'A big exam or test',           emoji: '📚' },
  { id: 'project', label: 'A project I have not started', emoji: '📝' },
  { id: 'promise', label: 'Something I keep avoiding',    emoji: '😬' },
  { id: 'unknown', label: 'Not sure — just frozen',       emoji: '🧊' },
];

const BODY_TECHNIQUES = [
  { id: 'jacks', label: 'Jumping jacks',         emoji: '⚡', desc: '20 fast ones. Burns the freeze chemical.' },
  { id: 'water', label: 'Cold water on face',    emoji: '💧', desc: 'Cold tap, 30 seconds. Fastest brain reset.' },
  { id: 'walk',  label: 'Walk to another room',  emoji: '🚶', desc: 'And back. Changes the state instantly.' },
];

export default function GlassBreak({ navigation, route }) {
  const colors = useColors();
  const { addGlassBreakSession } = useStore(s => ({
    addGlassBreakSession: s.addGlassBreakSession,
  }));

  // Pre-fill task from home banner if passed
  const prefilledTask = route?.params?.taskTitle || '';

  const [phase,        setPhase]       = useState(PHASE.FREEZE);
  const [frozenReason, setFrozenReason]= useState(route?.params?.frozenReason || null);
  const [taskCommit,   setTaskCommit]  = useState(prefilledTask);
  const [technique,    setTechnique]   = useState(null);
  const [bodySec,      setBodySec]     = useState(BODY_SECS);
  const [launchSec,    setLaunchSec]   = useState(LAUNCH_SECS);
  const [rounds,       setRounds]      = useState(0);

  const bodyRef  = useRef(null);
  const launchRef = useRef(null);

  useEffect(() => () => {
    clearInterval(bodyRef.current);
    clearInterval(launchRef.current);
  }, []);

  // Body countdown — fires when phase=BODY and technique selected
  useEffect(() => {
    if (phase !== PHASE.BODY || !technique) return;
    setBodySec(BODY_SECS);
    let remaining = BODY_SECS;
    bodyRef.current = setInterval(() => {
      remaining -= 1;
      setBodySec(remaining);
      if (remaining <= 0) {
        clearInterval(bodyRef.current);
        setPhase(PHASE.LAUNCH);
      }
    }, 1000);
    return () => clearInterval(bodyRef.current);
  }, [phase, technique]);

  // Launch countdown — fires each time phase=LAUNCH
  useEffect(() => {
    if (phase !== PHASE.LAUNCH) return;
    setLaunchSec(LAUNCH_SECS);
    launchRef.current = setInterval(() => {
      setLaunchSec(prev => {
        if (prev <= 1) {
          clearInterval(launchRef.current);
          setRounds(r => r + 1);
          setPhase(PHASE.CONTINUE);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(launchRef.current);
  }, [phase]);

  function finishEarly() {
    clearInterval(launchRef.current);
    setRounds(r => r + 1);
    setPhase(PHASE.CONTINUE);
  }

  function finish() {
    addGlassBreakSession({
      date: new Date().toISOString(),
      frozenReason,
      taskCommit,
      technique,
      roundsCompleted: rounds,
    });
    setPhase(PHASE.DONE);
  }

  // ── FREEZE ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.FREEZE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🧊</Text>
          <Text style={[styles.title, { color: colors.text }]}>We are frozen.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            That is real. The brain locked up. We are going to break through it — one small step at a time.
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>What has us stuck?</Text>
          <View style={styles.optionList}>
            {FROZEN_REASONS.map(r => (
              <TouchableOpacity
                key={r.id}
                style={[
                  styles.optionRow,
                  { borderColor: frozenReason === r.id ? ACCENT : colors.border,
                    backgroundColor: frozenReason === r.id ? ACCENT : colors.surface },
                ]}
                onPress={() => setFrozenReason(r.id)}
              >
                <Text style={styles.optionEmoji}>{r.emoji}</Text>
                <Text style={[styles.optionText, { color: frozenReason === r.id ? '#fff' : colors.text }]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: frozenReason ? ACCENT : '#CCC' }]}
            onPress={frozenReason ? () => setPhase(PHASE.SHRINK) : null}
          >
            <Text style={styles.primaryBtnText}>Let us break through →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SHRINK ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.SHRINK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>✂️</Text>
          <Text style={[styles.title, { color: colors.text }]}>Shrink it down.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Not the whole thing.{' '}
            <Text style={{ fontWeight: '900', color: ACCENT }}>One thing</Text>
            {' '}that fits in 10 minutes.
          </Text>

          <View style={[styles.exampleCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.exampleTitle, { color: ACCENT }]}>EXAMPLES</Text>
            <Text style={[styles.exampleText, { color: '#311B92' }]}>
              {"Not 'study for the exam'  →  "}
              <Text style={{ fontWeight: '800' }}>Read the first page of chapter 4{'\n'}</Text>
              {"Not 'write the essay'  →  "}
              <Text style={{ fontWeight: '800' }}>Write one sentence — the opening line{'\n'}</Text>
              {"Not 'finish the project'  →  "}
              <Text style={{ fontWeight: '800' }}>Open the file and read what we have</Text>
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Our one thing:</Text>
          <TextInput
            style={[styles.commitInput, {
              backgroundColor: colors.surface,
              borderColor: taskCommit.trim() ? ACCENT : colors.border,
              color: colors.text,
            }]}
            placeholder="Just one small thing..."
            placeholderTextColor={colors.textLight}
            value={taskCommit}
            onChangeText={setTaskCommit}
            returnKeyType="done"
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: taskCommit.trim() ? ACCENT : '#CCC' }]}
            onPress={taskCommit.trim() ? () => setPhase(PHASE.BODY) : null}
          >
            <Text style={styles.primaryBtnText}>That is our commit →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── BODY — pick technique ────────────────────────────────────────────────────
  if (phase === PHASE.BODY && !technique) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={2} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>⚡</Text>
          <Text style={[styles.title, { color: colors.text }]}>Body first.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            60 seconds before we sit down. Not warm-up — the chemical that starts the engine.
          </Text>

          {BODY_TECHNIQUES.map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.techniqueCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setTechnique(t.id)}
            >
              <Text style={styles.techniqueEmoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.techniqueLabel, { color: colors.text }]}>{t.label}</Text>
                <Text style={[styles.techniqueDesc, { color: colors.textLight }]}>{t.desc}</Text>
              </View>
              <Text style={[styles.goText, { color: ACCENT }]}>Go →</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.backLink} onPress={() => setPhase(PHASE.LAUNCH)}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>Skip — go straight to timer</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── BODY — timer ─────────────────────────────────────────────────────────────
  if (phase === PHASE.BODY && technique) {
    const tech     = BODY_TECHNIQUES.find(t => t.id === technique);
    const progress = bodySec / BODY_SECS;
    return (
      <SafeAreaView style={styles.darkContainer}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>{tech.emoji}</Text>
          <Text style={styles.darkTitle}>{tech.label}</Text>
          <TimerRing
            progress={progress}
            color={ACCENT}
            label={`${bodySec}`}
            sublabel="seconds"
            size={180}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── LAUNCH ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.LAUNCH) {
    const mins     = Math.floor(launchSec / 60);
    const secs     = launchSec % 60;
    const progress = launchSec / LAUNCH_SECS;
    return (
      <SafeAreaView style={styles.darkContainer}>
        <View style={styles.center}>
          <Text style={styles.taskLabel}>"{taskCommit}"</Text>
          <TimerRing
            progress={progress}
            color={ACCENT}
            label={`${mins}:${String(secs).padStart(2, '0')}`}
            sublabel="we are working"
            size={220}
          />
          {rounds > 0 && (
            <View style={styles.roundBadge}>
              <Text style={styles.roundBadgeText}>Round {rounds + 1}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.earlyBtn} onPress={finishEarly}>
            <Text style={styles.earlyBtnText}>I finished early →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── CONTINUE ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.CONTINUE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>{rounds >= 3 ? '🔥🔥' : '🔥'}</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {rounds === 1 ? 'We started.' : `${rounds} rounds done.`}
          </Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            {rounds === 1
              ? 'Starting was the hardest part. We just proved we can do it.'
              : 'Every round is momentum. Our brain is fully in it now.'}
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%', marginTop: 32 }]}
            onPress={() => setPhase(PHASE.LAUNCH)}
          >
            <Text style={styles.primaryBtnText}>Another 10 minutes →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, width: '100%' }]}
            onPress={finish}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textLight }]}>
              That is enough for now  ·  +{rounds * 50} XP
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🚀</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {rounds} round{rounds !== 1 ? 's' : ''}  ·  +{rounds * 50} XP
          </Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            The freeze had us. We broke through it anyway. That is the skill.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%', marginTop: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Back to app →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container:     { flex: 1 },
  darkContainer: { flex: 1, backgroundColor: '#0A0010' },
  content:       { padding: 24, paddingBottom: 48 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  heroEmoji:    { fontSize: 56, textAlign: 'center', marginBottom: 12, marginTop: 8 },
  title:        { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  sub:          { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  sectionLabel: { fontSize: 16, fontWeight: '800', marginBottom: 12 },

  optionList:  { gap: 10, marginBottom: 24 },
  optionRow:   { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1.5, padding: 16 },
  optionEmoji: { fontSize: 24 },
  optionText:  { fontSize: 15, fontWeight: '700', flex: 1 },

  exampleCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  exampleTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  exampleText:  { fontSize: 13, lineHeight: 24 },

  commitInput: { borderRadius: 12, borderWidth: 2, padding: 16, fontSize: 16, fontWeight: '600', marginBottom: 24 },

  techniqueCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  techniqueEmoji: { fontSize: 28 },
  techniqueLabel: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  techniqueDesc:  { fontSize: 12 },
  goText:         { fontSize: 14, fontWeight: '800' },

  darkTitle:      { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 32 },
  taskLabel:      { fontSize: 15, color: '#BB86FC', fontStyle: 'italic', marginBottom: 24, textAlign: 'center', paddingHorizontal: 16 },
  countdown:      { fontSize: 96, fontWeight: '900', color: '#fff', lineHeight: 100 },
  countdownLabel: { fontSize: 16, color: '#888', marginTop: 8 },

  roundBadge:     { marginTop: 20, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: ACCENT },
  roundBadgeText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  earlyBtn:       { marginTop: 36, padding: 14 },
  earlyBtnText:   { fontSize: 14, color: '#666', fontWeight: '600' },

  primaryBtn:      { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  primaryBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn:    { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', marginTop: 12 },
  secondaryBtnText:{ fontSize: 15, fontWeight: '600' },
  backLink:        { alignItems: 'center', marginTop: 20, padding: 8 },
  backLinkText:    { fontSize: 13 },
});
