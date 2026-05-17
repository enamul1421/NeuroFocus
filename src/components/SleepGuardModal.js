import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { useStore } from '../store';

const BREATH_PHASES = [
  { label: 'Breathe in',  duration: 4000, scale: 1.6, color: '#7B7ED0' },
  { label: 'Hold',        duration: 4000, scale: 1.6, color: '#9B9EE0' },
  { label: 'Breathe out', duration: 4000, scale: 1.0, color: '#009E73' },
  { label: 'Hold',        duration: 4000, scale: 1.0, color: '#555' },
];
const BREATH_CYCLES = 3;

const SCAN_REGIONS = [
  { label: 'Face & jaw',   prompt: 'Let our jaw drop. Release any clenching. Our face goes completely soft.' },
  { label: 'Shoulders',    prompt: 'Let our shoulders fall away from our ears. Heavy and relaxed.' },
  { label: 'Hands & arms', prompt: 'Open our palms. Arms heavy and warm. Nothing to hold onto right now.' },
  { label: 'Legs & feet',  prompt: 'Let our legs sink. Feet heavy. No need to go anywhere. We are done for today.' },
];
const SCAN_MS = 15000;

const AFFIRMATIONS = [
  'We showed up today. Our brain is stronger for it.',
  'Sleep is how our brain locks in everything we trained today.',
  'Tomorrow\'s focus starts with tonight\'s rest.',
  'We are not stopping — we are recharging for the next level.',
  'Rest is not weakness. Rest is how champions are built.',
];

const PHASE = { PROMPT: 'prompt', BREATHE: 'breathe', SCAN: 'scan', DONE: 'done' };
const MAX_DELAYS = 2;

export default function SleepGuardModal() {
  const { sleepTargetTime, sleepLogs, addSleepLog } = useStore(s => ({
    sleepTargetTime: s.sleepTargetTime || { hour: 22, minute: 30 },
    sleepLogs:       s.sleepLogs || [],
    addSleepLog:     s.addSleepLog,
  }));

  const [phase,       setPhase]      = useState(PHASE.PROMPT);
  const [visible,     setVisible]    = useState(false);
  const [delayCount,  setDelayCount] = useState(0);
  const [breathCycle, setBreathC]    = useState(0);
  const [breathPIdx,  setBreathPIdx] = useState(0);
  const [scanIdx,     setScanIdx]    = useState(0);
  const [affirmation]                = useState(() => AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);

  const breathAnim = useRef(new Animated.Value(1.0)).current;
  const scanAnim   = useRef(new Animated.Value(1)).current;
  const timerRef   = useRef(null);
  const checkRef   = useRef(null);

  useEffect(() => {
    function check() {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (sleepLogs.some(l => l.date === today)) return;
      const bedtime = new Date();
      bedtime.setHours(sleepTargetTime.hour, sleepTargetTime.minute, 0, 0);
      const diff = now - bedtime;
      if (diff >= 0 && diff < 60 * 60 * 1000) {
        setVisible(true);
        setPhase(PHASE.PROMPT);
      }
    }
    check();
    checkRef.current = setInterval(check, 60000);
    return () => { clearInterval(checkRef.current); clearTimeout(timerRef.current); };
  }, [sleepTargetTime, sleepLogs]);

  function delay() {
    setVisible(false);
    const next = delayCount + 1;
    setDelayCount(next);
    timerRef.current = setTimeout(() => {
      setVisible(true);
      setPhase(PHASE.PROMPT);
    }, 15 * 60 * 1000);
  }

  function dismiss() {
    logAndClose(false);
  }

  function startWindDown() {
    setPhase(PHASE.BREATHE);
    breathAnim.setValue(1.0);
    runBreathing(0, 0);
  }

  function runBreathing(cycle, pIdx) {
    if (cycle >= BREATH_CYCLES) { startScan(); return; }
    const bp = BREATH_PHASES[pIdx];
    setBreathC(cycle); setBreathPIdx(pIdx);
    Animated.timing(breathAnim, { toValue: bp.scale, duration: bp.duration, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      const nextP = (pIdx + 1) % BREATH_PHASES.length;
      runBreathing(nextP === 0 ? cycle + 1 : cycle, nextP);
    }, bp.duration);
  }

  function startScan() {
    setScanIdx(0); scanAnim.setValue(1);
    setPhase(PHASE.SCAN);
    runScan(0);
  }

  function runScan(idx) {
    if (idx >= SCAN_REGIONS.length) { setPhase(PHASE.DONE); return; }
    setScanIdx(idx); scanAnim.setValue(1);
    Animated.timing(scanAnim, { toValue: 0, duration: SCAN_MS, useNativeDriver: false }).start();
    timerRef.current = setTimeout(() => runScan(idx + 1), SCAN_MS);
  }

  function logAndClose(onTime) {
    clearTimeout(timerRef.current);
    addSleepLog({
      date: new Date().toISOString().split('T')[0],
      targetHour: sleepTargetTime.hour,
      targetMinute: sleepTargetTime.minute,
      onTime,
    });
    setVisible(false);
    setDelayCount(0);
    setPhase(PHASE.PROMPT);
  }

  const bp = BREATH_PHASES[breathPIdx];
  const delaysLeft = MAX_DELAYS - delayCount;

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent>
      <View style={styles.overlay}>

        {/* ── PROMPT ── */}
        {phase === PHASE.PROMPT && (
          <View style={styles.center}>
            <Text style={styles.moonBig}>🌙</Text>
            <Text style={styles.badge}>RECHARGE MODE</Text>
            <Text style={styles.promptTitle}>Our brain is ready to upgrade</Text>
            <Text style={styles.promptSub}>
              Sleep is when our brain locks in everything we trained today — focus, memory, emotional control. 5 minutes of wind-down now means faster sleep and stronger performance tomorrow.
            </Text>
            <View style={styles.xpTag}>
              <Text style={styles.xpTagText}>⚡ 150 XP for completing</Text>
            </View>
            <TouchableOpacity style={styles.startBtn} onPress={startWindDown}>
              <Text style={styles.startBtnText}>Start Recharge →</Text>
            </TouchableOpacity>
            {delaysLeft > 0 ? (
              <TouchableOpacity style={styles.delayBtn} onPress={delay}>
                <Text style={styles.delayBtnText}>
                  {delaysLeft === MAX_DELAYS ? `15 more minutes  (${delaysLeft} left)` : `One more delay  (${delaysLeft} left)`}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.delayBtn} onPress={dismiss}>
                <Text style={styles.delayBtnText}>Skip tonight — no XP</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── BREATHING ── */}
        {phase === PHASE.BREATHE && (
          <View style={styles.center}>
            <Text style={styles.exTitle}>Box Breathing</Text>
            <Text style={styles.exSub}>Cycle {breathCycle + 1} of {BREATH_CYCLES} · Downshifting our nervous system</Text>
            <Animated.View style={[styles.breathCircle, {
              transform: [{ scale: breathAnim }],
              backgroundColor: bp?.color + '22',
              borderColor: bp?.color,
            }]}>
              <Text style={[styles.breathLabel, { color: bp?.color }]}>{bp?.label}</Text>
            </Animated.View>
            <Text style={styles.hint}>Follow the circle. Let it slow us down.</Text>
          </View>
        )}

        {/* ── BODY SCAN ── */}
        {phase === PHASE.SCAN && (
          <View style={styles.center}>
            <Text style={styles.exTitle}>Release & Reset</Text>
            <Text style={styles.exSub}>{scanIdx + 1} of {SCAN_REGIONS.length} · Letting go of the day</Text>
            <View style={styles.scanTimerBg}>
              <Animated.View style={[styles.scanTimerFill, {
                width: scanAnim.interpolate({ inputRange: [0,1], outputRange: ['0%','100%'] }),
              }]} />
            </View>
            <View style={styles.scanCard}>
              <Text style={styles.scanRegion}>{SCAN_REGIONS[scanIdx]?.label}</Text>
              <Text style={styles.scanPrompt}>{SCAN_REGIONS[scanIdx]?.prompt}</Text>
            </View>
            <Text style={styles.hint}>Next area comes automatically.</Text>
          </View>
        )}

        {/* ── DONE ── */}
        {phase === PHASE.DONE && (
          <View style={styles.center}>
            <Text style={styles.moonBig}>✨</Text>
            <Text style={styles.badge}>+150 XP EARNED</Text>
            <Text style={styles.affirmation}>{affirmation}</Text>
            <Text style={styles.hint}>Put the phone face-down. Close our eyes.</Text>
            <View style={styles.logRow}>
              <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#009E73' }]} onPress={() => logAndClose(true)}>
                <Text style={styles.logBtnText}>✓ Recharging now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.logBtn, { backgroundColor: '#222' }]} onPress={() => logAndClose(false)}>
                <Text style={[styles.logBtnText, { color: '#888' }]}>Not yet</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#0A0A18', justifyContent: 'center', alignItems: 'center' },
  center:  { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', padding: 28 },

  moonBig:     { fontSize: 64, marginBottom: 12 },
  badge:       { backgroundColor: '#5B5EA6', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16 },
  badgeText:   { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  promptTitle: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 12 },
  promptSub:   { fontSize: 14, color: '#8888AA', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  xpTag:       { backgroundColor: '#1A1A2E', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24, borderWidth: 1, borderColor: '#5B5EA6' },
  xpTagText:   { color: '#8888FF', fontSize: 13, fontWeight: '700' },

  startBtn:     { backgroundColor: '#5B5EA6', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 18, width: '100%', alignItems: 'center', marginBottom: 12 },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  delayBtn:     { paddingVertical: 14 },
  delayBtnText: { color: '#555', fontSize: 13 },

  exTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  exSub:   { fontSize: 12, color: '#666', marginBottom: 40, textAlign: 'center', paddingHorizontal: 20 },
  breathCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  breathLabel:  { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, color: '#555', textAlign: 'center', paddingHorizontal: 32, marginTop: 16 },

  scanTimerBg:   { height: 3, width: '80%', backgroundColor: '#222', borderRadius: 2, marginBottom: 28 },
  scanTimerFill: { height: 3, backgroundColor: '#5B5EA6', borderRadius: 2 },
  scanCard:      { backgroundColor: '#111128', borderRadius: 20, padding: 28, marginHorizontal: 4, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#222' },
  scanRegion:    { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 12 },
  scanPrompt:    { fontSize: 15, color: '#8888AA', textAlign: 'center', lineHeight: 24 },

  affirmation: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', lineHeight: 30, marginBottom: 8 },
  logRow:      { width: '100%', gap: 10, marginTop: 28 },
  logBtn:      { borderRadius: 14, padding: 16, alignItems: 'center' },
  logBtnText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});
