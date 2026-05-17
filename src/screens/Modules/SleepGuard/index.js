import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Animated, ScrollView,
} from 'react-native';
import { SafeAreaView as SafeAreaViewCtx } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../../store';
import { colors, useColors } from '../../../theme';
import SpeakButton from '../../../components/SpeakButton';
import SessionProgress from '../../../components/SessionProgress';

const PHASE = { INTRO: 'intro', BREATHE: 'breathe', SCAN: 'scan', DONE: 'done' };

const BREATH_PHASES = [
  { label: 'Breathe in',  duration: 4000, scale: 1.6, color: '#5B5EA6' },
  { label: 'Hold',        duration: 4000, scale: 1.6, color: '#7B61FF' },
  { label: 'Breathe out', duration: 4000, scale: 1.0, color: '#009E73' },
  { label: 'Hold',        duration: 4000, scale: 1.0, color: '#888' },
];
const BREATH_CYCLES = 3;

const SCAN_REGIONS = [
  { label: 'Face & jaw',    prompt: 'Let your jaw drop slightly. Release any clenching. Let your face go completely soft.' },
  { label: 'Shoulders',     prompt: 'Let your shoulders fall away from your ears. Feel them heavy and relaxed.' },
  { label: 'Hands & arms',  prompt: 'Open your palms. Let your arms feel heavy and warm. Nothing to hold onto right now.' },
  { label: 'Legs & feet',   prompt: 'Let your legs sink. Feel your feet heavy. No need to go anywhere. You are done for the day.' },
];
const SCAN_MS = 18000;

const AFFIRMATIONS = [
  'We showed up today. That matters.',
  'Our brain worked hard today. It deserves rest.',
  'Tomorrow starts with good sleep tonight.',
  'We are not behind — we are recharging.',
  'Rest is not wasted time. Rest is how we grow.',
];

export default function SleepGuard({ navigation }) {
  const colors = useColors();
  const { sleepTargetTime, setSleepTargetTime, addSleepLog, sleepLogs } = useStore(s => ({
    sleepTargetTime:    s.sleepTargetTime || { hour: 22, minute: 30 },
    setSleepTargetTime: s.setSleepTargetTime,
    addSleepLog:        s.addSleepLog,
    sleepLogs:          s.sleepLogs || [],
  }));

  const [phase,        setPhase]        = useState(PHASE.INTRO);
  const [showPicker,   setShowPicker]   = useState(false);
  const [breathCycle,  setBreathCycle]  = useState(0);
  const [breathPIdx,   setBreathPIdx]   = useState(0);
  const [scanIdx,      setScanIdx]      = useState(0);
  const [affirmation]                   = useState(() => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);

  const breathAnim = useRef(new Animated.Value(1.0)).current;
  const scanAnim   = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef(null);

  useEffect(() => () => { clearTimeout(timerRef.current); }, []);

  // ── Breathing ──────────────────────────────────────────────────────────────
  function runBreathing(cycle = 0, pIdx = 0) {
    if (cycle >= BREATH_CYCLES) { startScan(); return; }
    const bp = BREATH_PHASES[pIdx];
    setBreathCycle(cycle); setBreathPIdx(pIdx);
    Animated.timing(breathAnim, { toValue: bp.scale, duration: bp.duration, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      const nextP = (pIdx + 1) % BREATH_PHASES.length;
      const nextC = nextP === 0 ? cycle + 1 : cycle;
      runBreathing(nextC, nextP);
    }, bp.duration);
  }

  function startBreathe() {
    breathAnim.setValue(1.0);
    setPhase(PHASE.BREATHE);
    runBreathing(0, 0);
  }

  // ── Body scan ──────────────────────────────────────────────────────────────
  function startScan() {
    setScanIdx(0);
    scanAnim.setValue(1);
    setPhase(PHASE.SCAN);
    runScan(0);
  }

  function runScan(idx) {
    if (idx >= SCAN_REGIONS.length) { setPhase(PHASE.DONE); return; }
    setScanIdx(idx);
    scanAnim.setValue(1);
    Animated.timing(scanAnim, { toValue: 0, duration: SCAN_MS, useNativeDriver: false }).start();
    timerRef.current = setTimeout(() => runScan(idx + 1), SCAN_MS);
  }

  // ── Sleep log ──────────────────────────────────────────────────────────────
  function logSleep(onTime) {
    addSleepLog({
      date: new Date().toISOString().split('T')[0],
      targetHour: sleepTargetTime.hour,
      targetMinute: sleepTargetTime.minute,
      onTime,
    });
    navigation.goBack();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  function fmtTime(h, m) {
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
  }

  const todayLog = sleepLogs.find(l => l.date === new Date().toISOString().split('T')[0]);
  const streak   = (() => {
    let s = 0;
    const sorted = [...sleepLogs].filter(l => l.onTime).sort((a, b) => b.date.localeCompare(a.date));
    for (const l of sorted) { s++; }
    return s;
  })();

  const phaseStep = { intro: 0, breathe: 1, scan: 2, done: 3 }[phase] ?? 0;

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaViewCtx style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={3} color="#5B5EA6" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: '#5B5EA6' }]}>😴 SleepGuard</Text>
          <Text style={[styles.headline, { color: colors.text }]}>Wind Down for Sleep</Text>
          <SpeakButton
            text="Our brains never got the signal that it is time to stop. This module helps us wind down — with breathing and a body scan that tells our nervous system it is safe to rest. We are not stopping because we have to. We are stopping because we choose to take care of ourselves. Let us get our brain ready for sleep."
            style={{ marginBottom: 12 }}
          />

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>What we'll do</Text>
            <Text style={[styles.infoItem, { color: colors.textLight }]}>🌬️  3 cycles of box breathing  (~2 min)</Text>
            <Text style={[styles.infoItem, { color: colors.textLight }]}>🧘  Body scan to release tension  (~2 min)</Text>
            <Text style={[styles.infoItem, { color: colors.textLight }]}>✨  Goodnight affirmation  (30 sec)</Text>
          </View>

          <View style={[styles.bedtimeCard, { backgroundColor: '#1E1E3A', borderColor: '#5B5EA6' }]}>
            <Text style={styles.bedtimeLabel}>TARGET BEDTIME</Text>
            <TouchableOpacity onPress={() => setShowPicker(true)}>
              <Text style={styles.bedtimeValue}>{fmtTime(sleepTargetTime.hour, sleepTargetTime.minute)}</Text>
              <Text style={styles.bedtimeTap}>Tap to change</Text>
            </TouchableOpacity>
          </View>

          {showPicker && (
            <DateTimePicker
              mode="time"
              value={(() => { const d = new Date(); d.setHours(sleepTargetTime.hour, sleepTargetTime.minute); return d; })()}
              is24Hour={false}
              onChange={(e, d) => {
                setShowPicker(false);
                if (d) setSleepTargetTime(d.getHours(), d.getMinutes());
              }}
            />
          )}

          {streak > 0 && (
            <View style={[styles.streakCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.streakText, { color: colors.primary }]}>
                🔥 {streak} night{streak !== 1 ? 's' : ''} slept on time
              </Text>
            </View>
          )}

          {todayLog && (
            <Text style={[styles.loggedText, { color: colors.success }]}>
              ✓ Sleep logged for tonight
            </Text>
          )}
        </ScrollView>

        <TouchableOpacity style={styles.startBtn} onPress={startBreathe}>
          <Text style={styles.startBtnText}>Begin wind-down →</Text>
        </TouchableOpacity>
      </SafeAreaViewCtx>
    );
  }

  // ── BREATHING ──────────────────────────────────────────────────────────────
  if (phase === PHASE.BREATHE) {
    const bp = BREATH_PHASES[breathPIdx];
    return (
      <SafeAreaViewCtx style={[styles.container, styles.centerContainer, { backgroundColor: '#0D0D1A' }]}>
        <SessionProgress current={1} total={3} color="#5B5EA6" />
        <Text style={styles.exTitle}>Box Breathing</Text>
        <Text style={styles.exSub}>Cycle {breathCycle + 1} of {BREATH_CYCLES}</Text>
        <View style={styles.breathArea}>
          <Animated.View style={[styles.breathCircle, {
            transform: [{ scale: breathAnim }],
            backgroundColor: bp?.color + '22',
            borderColor: bp?.color,
          }]}>
            <Text style={[styles.breathLabel, { color: bp?.color }]}>{bp?.label}</Text>
          </Animated.View>
        </View>
        <Text style={[styles.breathHint, { color: colors.text }]}>Follow the circle. Let it slow you down.</Text>
      </SafeAreaViewCtx>
    );
  }

  // ── BODY SCAN ──────────────────────────────────────────────────────────────
  if (phase === PHASE.SCAN) {
    const region = SCAN_REGIONS[scanIdx];
    return (
      <SafeAreaViewCtx style={[styles.container, styles.centerContainer, { backgroundColor: '#0D0D1A' }]}>
        <SessionProgress current={2} total={3} color="#5B5EA6" />
        <Text style={styles.exTitle}>Body Scan</Text>
        <Text style={styles.exSub}>{scanIdx + 1} of {SCAN_REGIONS.length}</Text>
        <View style={styles.scanTimerBg}>
          <Animated.View style={[styles.scanTimerFill, {
            width: scanAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
          }]} />
        </View>
        <View style={[styles.scanCard, { backgroundColor: '#1A1A2E' }]}>
          <Text style={styles.scanRegion}>{region.label}</Text>
          <Text style={styles.scanPrompt}>{region.prompt}</Text>
        </View>
        <Text style={[styles.breathHint, { color: colors.text }]}>Next area comes automatically.</Text>
      </SafeAreaViewCtx>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaViewCtx style={[styles.container, styles.centerContainer, { backgroundColor: '#0D0D1A' }]}>
        <SessionProgress current={3} total={3} color="#5B5EA6" />
        <Text style={styles.moonEmoji}>🌙</Text>
        <Text style={styles.affirmation}>{affirmation}</Text>
        <Text style={styles.goodnightSub}>Put the phone face-down. Close your eyes.</Text>

        <View style={styles.logRow}>
          <Text style={styles.logQuestion}>Did you sleep on time tonight?</Text>
          <View style={styles.logBtns}>
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#009E73' }]} onPress={() => logSleep(true)}>
              <Text style={styles.logBtnText}>✓ Yes  +50 XP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#333' }]} onPress={() => logSleep(false)}>
              <Text style={styles.logBtnText}>Not yet</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaViewCtx>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container:       { flex: 1 },
  centerContainer: { alignItems: 'center' },
  content:         { padding: 20, paddingTop: 8, paddingBottom: 16 },

  moduleTag:  { fontSize: 12, fontWeight: '800', letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  headline:   { fontSize: 26, fontWeight: '800', marginBottom: 10 },

  infoCard:  { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  infoItem:  { fontSize: 14, lineHeight: 26 },

  bedtimeCard:  { borderRadius: 16, borderWidth: 2, padding: 20, alignItems: 'center', marginBottom: 14 },
  bedtimeLabel: { fontSize: 11, fontWeight: '800', color: '#8888CC', letterSpacing: 1, marginBottom: 4 },
  bedtimeValue: { fontSize: 42, fontWeight: '900', color: '#fff', textAlign: 'center' },
  bedtimeTap:   { fontSize: 12, color: '#8888CC', textAlign: 'center', marginTop: 4 },

  streakCard: { borderRadius: 12, borderWidth: 1, padding: 12, alignItems: 'center', marginBottom: 10 },
  streakText: { fontSize: 15, fontWeight: '800' },
  loggedText: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },

  startBtn:     { backgroundColor: '#5B5EA6', margin: 20, padding: 18, borderRadius: 14, alignItems: 'center' },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  exTitle:   { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 20, marginBottom: 4 },
  exSub:     { fontSize: 14, color: '#888', marginBottom: 20 },
  breathArea: { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  breathCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  breathLabel:  { fontSize: 18, fontWeight: '700' },
  breathHint:   { fontSize: 13, color: '#888', marginBottom: 32, textAlign: 'center', paddingHorizontal: 32 },

  scanTimerBg:   { height: 4, width: '80%', backgroundColor: '#333', borderRadius: 2, marginBottom: 32 },
  scanTimerFill: { height: 4, backgroundColor: '#5B5EA6', borderRadius: 2 },
  scanCard:      { borderRadius: 20, padding: 32, marginHorizontal: 24, alignItems: 'center', flex: 0.4, justifyContent: 'center' },
  scanRegion:    { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 16 },
  scanPrompt:    { fontSize: 16, color: '#AAAAAA', textAlign: 'center', lineHeight: 26 },

  moonEmoji:     { fontSize: 80, marginTop: 20, marginBottom: 20 },
  affirmation:   { fontSize: 22, fontWeight: '800', color: '#fff', textAlign: 'center', paddingHorizontal: 32, lineHeight: 32, marginBottom: 12 },
  goodnightSub:  { fontSize: 14, color: '#888', marginBottom: 40 },

  logRow:     { width: '100%', paddingHorizontal: 24 },
  logQuestion:{ fontSize: 14, color: '#AAA', textAlign: 'center', marginBottom: 12 },
  logBtns:    { gap: 10 },
  logBtn:     { borderRadius: 14, padding: 16, alignItems: 'center' },
  logBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
