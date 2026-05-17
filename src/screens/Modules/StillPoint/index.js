import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

const PHASE  = { SELECT: 'select', BREATHE: 'breathe', LABEL: 'label', DONE: 'done' };
const ACCENT = '#2E7D32';
const ACCENT_LIGHT = '#E8F5E9';

const BREATH_CYCLE = 12; // seconds per cycle (4 in, 4 hold, 4 out)
const THOUGHT_TYPES = ['Worrying', 'Planning', 'Remembering', 'Judging', 'Sensing', 'Other'];

export default function StillPoint({ navigation }) {
  const colors = useColors();
  const { addStillPointSession } = useStore(s => ({ addStillPointSession: s.addStillPointSession }));

  const [phase,        setPhase]       = useState(PHASE.SELECT);
  const [mode,         setMode]        = useState(null);   // 'quick' | 'full'
  const [breathPhase,  setBreathPhase] = useState('in');   // 'in' | 'hold' | 'out'
  const [elapsed,      setElapsed]     = useState(0);
  const [thoughts,     setThoughts]    = useState([]);     // logged thought types
  const [labelSec,     setLabelSec]    = useState(60);

  const scaleAnim  = useRef(new Animated.Value(0.45)).current;
  const timerRef   = useRef(null);
  const elapsedRef = useRef(0);
  const animRef    = useRef(null);

  const totalSecs  = mode === 'quick' ? 120 : 300; // 2 min or 5 min

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (animRef.current) animRef.current.stop();
  }, []);

  function startBreathe(selectedMode) {
    setMode(selectedMode);
    setElapsed(0);
    elapsedRef.current = 0;
    setBreathPhase('in');
    setPhase(PHASE.BREATHE);

    runBreathCycle();

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      const secs = selectedMode === 'quick' ? 120 : 300;
      if (elapsedRef.current >= secs) {
        clearInterval(timerRef.current);
        if (animRef.current) animRef.current.stop();
        if (selectedMode === 'full') {
          setPhase(PHASE.LABEL);
          startLabelTimer();
        } else {
          finishSession(selectedMode, []);
        }
      }
    }, 1000);
  }

  function runBreathCycle() {
    const seq = Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 4000, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1.0, duration: 4000, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.45, duration: 4000, useNativeDriver: true }),
    ]);
    animRef.current = Animated.loop(seq);
    animRef.current.start();

    // Update breath phase text in sync
    let cycleStart = Date.now();
    const phaseTimer = setInterval(() => {
      const t = (Date.now() - cycleStart) % (BREATH_CYCLE * 1000);
      if (t < 4000)       setBreathPhase('in');
      else if (t < 8000)  setBreathPhase('hold');
      else                setBreathPhase('out');
    }, 200);
    // Store cleanup reference
    timerRef._phaseCleanup = phaseTimer;
  }

  function startLabelTimer() {
    setLabelSec(60);
    let s = 60;
    timerRef.current = setInterval(() => {
      s -= 1;
      setLabelSec(s);
      if (s <= 0) {
        clearInterval(timerRef.current);
        finishSession('full', thoughts);
      }
    }, 1000);
  }

  function logThought(type) {
    setThoughts(prev => [...prev, type]);
  }

  function finishSession(selectedMode, loggedThoughts) {
    addStillPointSession({
      date:           new Date().toISOString(),
      mode:           selectedMode,
      durationSecs:   selectedMode === 'quick' ? 120 : 300,
      thoughtsLogged: loggedThoughts.length,
      thoughtTypes:   loggedThoughts,
    });
    setPhase(PHASE.DONE);
  }

  const breathPrompt = breathPhase === 'in'   ? 'Breathe in...'
    : breathPhase === 'hold' ? 'Hold...'
    : 'Breathe out...';

  const progress = totalSecs ? Math.round((elapsed / totalSecs) * 100) : 0;

  // ── SELECT ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.SELECT) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🍃</Text>
          <Text style={[styles.title, { color: colors.text }]}>StillPoint</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            A short mindfulness practice. No experience needed.
            We just follow the breath.
          </Text>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '60' }]}
            onPress={() => startBreathe('quick')}
          >
            <Text style={styles.modeEmoji}>⏱</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: ACCENT }]}>Quick — 2 minutes</Text>
              <Text style={[styles.modeSub, { color: colors.textLight }]}>
                Breath anchor only. Good for a reset between tasks.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '60' }]}
            onPress={() => startBreathe('full')}
          >
            <Text style={styles.modeEmoji}>🌿</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: ACCENT }]}>Full — 5 minutes</Text>
              <Text style={[styles.modeSub, { color: colors.textLight }]}>
                Breath anchor + thought labeling. The complete practice.
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── BREATHE ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.BREATHE) {
    return (
      <SafeAreaView style={[styles.darkContainer]}>
        <SessionProgress current={progress} total={100} color={ACCENT} />
        <View style={styles.center}>
          <Animated.View
            style={[
              styles.breathCircle,
              { transform: [{ scale: scaleAnim }] },
            ]}
          />
          <Text style={styles.breathPrompt}>{breathPrompt}</Text>
          <Text style={styles.breathHint}>4 counts each · follow the circle</Text>
          <Text style={styles.breathTime}>
            {Math.floor((totalSecs - elapsed) / 60)}:{String((totalSecs - elapsed) % 60).padStart(2, '0')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── LABEL ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.LABEL) {
    return (
      <SafeAreaView style={[styles.darkContainer]}>
        <View style={styles.center}>
          <Text style={styles.labelTimer}>{labelSec}</Text>
          <Text style={styles.labelTitle}>Thoughts will come.</Text>
          <Text style={styles.labelSub}>
            Tap the type when one appears — then let it go.{'\n'}
            No need to engage. Just name and release.
          </Text>
          <View style={styles.thoughtGrid}>
            {THOUGHT_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={styles.thoughtChip}
                onPress={() => logThought(t)}
              >
                <Text style={styles.thoughtChipText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {thoughts.length > 0 && (
            <Text style={styles.thoughtCount}>
              {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''} noted
            </Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 52, marginBottom: 12 }}>🍃</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {mode === 'quick' ? '2 minutes.' : '5 minutes.'}  +{mode === 'quick' ? 30 : 50} XP
          </Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            {mode === 'quick'
              ? 'The brain was given a pause. That changes what comes next.'
              : thoughts.length > 0
              ? `We noticed ${thoughts.length} thought${thoughts.length !== 1 ? 's' : ''} and returned each time. That is the whole practice.`
              : 'We stayed with the breath. That is enough.'}
          </Text>

          <View style={[styles.infoCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.infoText, { color: ACCENT }]}>
              Mindfulness does not empty the mind. It trains us to notice what is there
              without immediately reacting to it. Every session builds that pause.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%' }]}
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
  darkContainer: { flex: 1, backgroundColor: '#001A14' },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  sub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 28 },

  modeCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1.5, padding: 18, marginBottom: 14, width: '100%' },
  modeEmoji: { fontSize: 28 },
  modeTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  modeSub:   { fontSize: 13, lineHeight: 20 },

  breathCircle: {
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: '#2E7D3230',
    borderWidth: 3, borderColor: '#2E7D32',
    position: 'absolute',
  },
  breathPrompt: { fontSize: 28, fontWeight: '800', color: '#fff', marginTop: 200, textAlign: 'center' },
  breathHint:   { fontSize: 13, color: '#80CBC4', marginTop: 10 },
  breathTime:   { fontSize: 18, color: '#555', marginTop: 32 },

  labelTimer: { fontSize: 64, fontWeight: '900', color: '#fff', marginBottom: 12 },
  labelTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  labelSub:   { fontSize: 14, color: '#80CBC4', lineHeight: 22, textAlign: 'center', marginBottom: 28 },

  thoughtGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 16 },
  thoughtChip:     { borderRadius: 20, borderWidth: 1.5, borderColor: '#2E7D32', backgroundColor: '#2E7D3220', paddingHorizontal: 14, paddingVertical: 10 },
  thoughtChipText: { color: '#80CBC4', fontSize: 14, fontWeight: '700' },
  thoughtCount:    { color: '#A5D6A7', fontSize: 14, fontWeight: '700' },

  infoCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 28, width: '100%' },
  infoText: { fontSize: 13, lineHeight: 22, fontStyle: 'italic' },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginTop: 20, padding: 8 },
  backLinkText:   { fontSize: 13 },
});
