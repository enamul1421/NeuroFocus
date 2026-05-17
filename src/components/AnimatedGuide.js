/**
 * AnimatedGuide — purpose-built mini animations that demonstrate each exercise.
 * Each animation directly models what the user is about to do (video modeling principle).
 * If a Lottie source is provided it takes priority; otherwise the built-in animation runs.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

// ── Breathing ─────────────────────────────────────────────────────────────────
// Circle expands (inhale 4s) → holds → contracts (exhale 4s) → holds

function BreathingGuide({ size }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  const label = useRef(new Animated.Value(0)).current; // 0=inhale 1=hold 2=exhale
  const [phase, setPhase] = React.useState('Breathe in');

  useEffect(() => {
    let mounted = true;
    function run() {
      if (!mounted) return;
      setPhase('Breathe in');
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1.7, duration: 4000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(opacity, { toValue: 1.0, duration: 4000, useNativeDriver: true }),
      ]).start(() => {
        if (!mounted) return;
        setPhase('Hold');
        setTimeout(() => {
          if (!mounted) return;
          setPhase('Breathe out');
          Animated.parallel([
            Animated.timing(scale,   { toValue: 1.0, duration: 4000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            Animated.timing(opacity, { toValue: 0.4, duration: 4000, useNativeDriver: true }),
          ]).start(() => {
            if (!mounted) return;
            setPhase('Hold');
            setTimeout(() => { if (mounted) run(); }, 4000);
          });
        }, 4000);
      });
    }
    run();
    return () => { mounted = false; };
  }, []);

  const r = size / 2;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Animated.View style={[styles.breathCircle, {
        width: r, height: r, borderRadius: r / 2,
        transform: [{ scale }], opacity,
      }]} />
      <Text style={styles.breathLabel}>{phase}</Text>
    </View>
  );
}

// ── Grounding ─────────────────────────────────────────────────────────────────
// Sense icons appear one by one: 5→4→3→2→1

const SENSES = ['👁️', '✋', '👂', '👃', '👅'];
function GroundingGuide({ size }) {
  const opacities = SENSES.map(() => useRef(new Animated.Value(0)).current);
  useEffect(() => {
    let mounted = true;
    function run() {
      opacities.forEach(o => o.setValue(0));
      const sequence = opacities.map((o, i) =>
        Animated.sequence([
          Animated.delay(i * 900),
          Animated.timing(o, { toValue: 1, duration: 400, useNativeDriver: true }),
        ])
      );
      Animated.parallel(sequence).start(() => {
        if (!mounted) return;
        setTimeout(() => { if (mounted) run(); }, 1500);
      });
    }
    run();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={styles.sensesRow}>
        {SENSES.map((s, i) => (
          <Animated.Text key={i} style={[styles.senseIcon, { opacity: opacities[i] }]}>{s}</Animated.Text>
        ))}
      </View>
      <Text style={styles.guideSub}>Notice your surroundings</Text>
    </View>
  );
}

// ── Body Scan ─────────────────────────────────────────────────────────────────
// Simple body outline with glowing region cycling top to bottom

const BODY_PARTS = ['Head', 'Shoulders', 'Chest', 'Stomach', 'Hands', 'Feet'];
function BodyScanGuide({ size }) {
  const [activeIdx, setActiveIdx] = React.useState(0);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    let idx = 0;
    function next() {
      if (!mounted) return;
      setActiveIdx(idx);
      glowAnim.setValue(0);
      Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }).start(() => {
        if (!mounted) return;
        idx = (idx + 1) % BODY_PARTS.length;
        setTimeout(() => { if (mounted) next(); }, 300);
      });
    }
    next();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {BODY_PARTS.map((part, i) => (
        <Animated.View
          key={part}
          style={[styles.bodyPartRow, i === activeIdx && {
            backgroundColor: glowAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['#E8E8F8', '#5B5EA6', '#E8E8F8'] }),
          }]}
        >
          <Text style={[styles.bodyPartText, i === activeIdx && styles.bodyPartTextActive]}>{part}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// ── Memory ────────────────────────────────────────────────────────────────────
// Numbers flash on screen one at a time like the digit span task

function MemoryGuide({ size }) {
  const [digit, setDigit] = React.useState(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const seq = [3, 7, 1, 9, 4];
    let i = 0;
    function show() {
      if (!mounted) return;
      setDigit(seq[i % seq.length]);
      opacity.setValue(0);
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(700),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        i++;
        if (mounted) setTimeout(show, 300);
      });
    }
    show();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <View style={styles.memCard}>
        <Animated.Text style={[styles.memDigit, { opacity }]}>{digit}</Animated.Text>
      </View>
      <Text style={styles.guideSub}>Remember the sequence</Text>
    </View>
  );
}

// ── Confidence ────────────────────────────────────────────────────────────────
// Star bounces in, ⚡ win counter increments

function ConfidenceGuide({ size }) {
  const scale = useRef(new Animated.Value(0)).current;
  const [count, setCount] = React.useState(0);

  useEffect(() => {
    let mounted = true;
    function bounce() {
      if (!mounted) return;
      scale.setValue(0);
      setCount(c => c + 1);
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => {
        if (!mounted) return;
        setTimeout(() => { if (mounted) bounce(); }, 2000);
      });
    }
    bounce();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Animated.Text style={[styles.winStar, { transform: [{ scale }] }]}>⚡</Animated.Text>
      <Text style={styles.winCount}>Win #{count}</Text>
      <Text style={styles.guideSub}>Every win counts</Text>
    </View>
  );
}

// ── TimeWise ──────────────────────────────────────────────────────────────────
// Clock hand sweeps, then shows "Predicted: 5m / Actual: 8m" comparison

function TimeWiseGuide({ size }) {
  const rotation = useRef(new Animated.Value(0)).current;
  const [phase, setPhase] = React.useState('predict');

  useEffect(() => {
    let mounted = true;
    function run() {
      if (!mounted) return;
      setPhase('predict');
      rotation.setValue(0);
      Animated.timing(rotation, {
        toValue: 1, duration: 3000, easing: Easing.linear, useNativeDriver: true,
      }).start(() => {
        if (!mounted) return;
        setPhase('result');
        setTimeout(() => { if (mounted) run(); }, 2500);
      });
    }
    run();
    return () => { mounted = false; };
  }, []);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.center, { width: size, height: size }]}>
      {phase === 'predict' ? (
        <>
          <Animated.Text style={[styles.clockHand, { transform: [{ rotate }] }]}>🕐</Animated.Text>
          <Text style={styles.guideSub}>How long?</Text>
        </>
      ) : (
        <View style={styles.timeResult}>
          <Text style={styles.timeRow}>🎯 Guess: 5m</Text>
          <Text style={styles.timeRow}>⏱ Actual: 8m</Text>
          <Text style={styles.timeClose}>+3m over</Text>
        </View>
      )}
    </View>
  );
}

// ── Routine ───────────────────────────────────────────────────────────────────
// Checklist items animate in and get checked off one by one

const TASKS = ['⏰ Wake up', '🚿 Shower', '👕 Dress', '🍳 Eat'];
function RoutineGuide({ size }) {
  const [doneCount, setDoneCount] = React.useState(0);
  const slideAnims = TASKS.map(() => useRef(new Animated.Value(-30)).current);

  useEffect(() => {
    let mounted = true;
    function run() {
      if (!mounted) return;
      setDoneCount(0);
      slideAnims.forEach(a => a.setValue(-30));
      // Slide in each task, then check them off
      TASKS.forEach((_, i) => {
        setTimeout(() => {
          if (!mounted) return;
          Animated.timing(slideAnims[i], { toValue: 0, duration: 300, useNativeDriver: true }).start();
        }, i * 600);
      });
      // Check off
      TASKS.forEach((_, i) => {
        setTimeout(() => {
          if (!mounted) return;
          setDoneCount(i + 1);
        }, TASKS.length * 600 + (i + 1) * 500);
      });
      // Loop
      setTimeout(() => { if (mounted) run(); }, TASKS.length * 600 + TASKS.length * 500 + 1500);
    }
    run();
    return () => { mounted = false; };
  }, []);

  return (
    <View style={[styles.routineContainer, { width: size, height: size }]}>
      {TASKS.map((t, i) => (
        <Animated.View key={t} style={[styles.routineRow, { transform: [{ translateX: slideAnims[i] }] }]}>
          <Text style={styles.routineCheck}>{i < doneCount ? '✅' : '⬜'}</Text>
          <Text style={[styles.routineTask, i < doneCount && styles.routineTaskDone]}>{t}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

// ── Focus ─────────────────────────────────────────────────────────────────────
// Notification card slides in, gets dismissed (tapped away)

function FocusGuide({ size }) {
  const slideY = useRef(new Animated.Value(-40)).current;
  const NOTIFS = [
    { type: 'nogo', icon: '📱', text: 'TikTok — 12 new videos', color: '#FFEBEE' },
    { type: 'go',   icon: '📚', text: 'Focus timer started',   color: '#E8F5E9' },
    { type: 'nogo', icon: '🎮', text: 'Your friend is online',  color: '#FFEBEE' },
    { type: 'go',   icon: '✅', text: 'Break is over',          color: '#E8F5E9' },
  ];
  const [idx, setIdx] = React.useState(0);

  useEffect(() => {
    let mounted = true;
    let i = 0;
    function show() {
      if (!mounted) return;
      const n = NOTIFS[i % NOTIFS.length];
      setIdx(i % NOTIFS.length);
      slideY.setValue(-40);
      Animated.sequence([
        Animated.timing(slideY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.delay(1200),
        Animated.timing(slideY, { toValue: n.type === 'nogo' ? -40 : 40, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        i++;
        if (mounted) setTimeout(show, 400);
      });
    }
    show();
    return () => { mounted = false; };
  }, []);

  const n = NOTIFS[idx];
  return (
    <View style={[styles.center, { width: size, height: size + 40, overflow: 'visible' }]}>
      <Animated.View style={[styles.notifCard, { backgroundColor: n?.color, width: size - 12, transform: [{ translateY: slideY }] }]}>
        <Text style={styles.notifIcon}>{n?.icon}</Text>
        <Text style={[styles.notifText, { flex: 1 }]} numberOfLines={1}>{n?.text}</Text>
        <Text style={[styles.notifTag, { color: n?.type === 'go' ? '#4CAF50' : '#F44336' }]}>
          {n?.type === 'go' ? '✓' : '✗'}
        </Text>
      </Animated.View>
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const GUIDES = {
  breathing:   BreathingGuide,
  grounding:   GroundingGuide,
  bodyscan:    BodyScanGuide,
  memory:      MemoryGuide,
  confidence:  ConfidenceGuide,
  timewise:    TimeWiseGuide,
  routine:     RoutineGuide,
  focus:       FocusGuide,
};

export default function AnimatedGuide({ source, placeholder, label, width = 160, height = 160, style }) {
  // If a Lottie source is provided, use it (future-proof for custom animations)
  if (source) {
    try {
      const LottieView = require('lottie-react-native').default;
      return (
        <View style={styles.wrapper}>
          <LottieView source={source} autoPlay loop style={{ width, height }} />
          {label && <Text style={styles.label}>{label}</Text>}
        </View>
      );
    } catch { /* fall through to built-in */ }
  }

  const GuideComponent = GUIDES[placeholder];
  if (!GuideComponent) return null;

  return (
    <View style={[styles.wrapper, style]}>
      <View style={{ width, height, overflow: 'visible', alignItems: 'center', justifyContent: 'center' }}>
        <GuideComponent size={Math.min(width, height)} />
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper:      { alignItems: 'center', marginVertical: 8 },
  label:        { fontSize: 12, color: '#666', marginTop: 4, fontWeight: '600' },
  center:       { alignItems: 'center', justifyContent: 'center' },
  guideSub:     { fontSize: 11, color: '#888', marginTop: 6, fontWeight: '600', textAlign: 'center' },

  // Breathing
  breathCircle: { backgroundColor: '#5B5EA620', borderWidth: 2, borderColor: '#5B5EA6' },
  breathLabel:  { position: 'absolute', fontSize: 13, fontWeight: '700', color: '#5B5EA6' },

  // Grounding
  sensesRow:  { flexDirection: 'row', gap: 6, marginBottom: 8 },
  senseIcon:  { fontSize: 24 },

  // Body Scan
  bodyPartRow:       { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 3, marginVertical: 1, minWidth: 100 },
  bodyPartText:      { fontSize: 12, color: '#999', textAlign: 'center' },
  bodyPartTextActive:{ fontWeight: '800', color: '#fff' },

  // Memory
  memCard:  { width: 70, height: 70, borderRadius: 12, borderWidth: 2, borderColor: '#5B5EA6', backgroundColor: '#F0F0FF', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  memDigit: { fontSize: 36, fontWeight: '900', color: '#5B5EA6' },

  // Confidence
  winStar:  { fontSize: 52 },
  winCount: { fontSize: 15, fontWeight: '800', color: '#5B5EA6', marginTop: 4 },

  // TimeWise
  clockHand:  { fontSize: 48 },
  timeResult: { alignItems: 'center', gap: 4 },
  timeRow:    { fontSize: 13, color: '#555', fontWeight: '600' },
  timeClose:  { fontSize: 12, color: '#FF9800', fontWeight: '700', marginTop: 4 },

  // Routine
  routineContainer: { justifyContent: 'center', paddingHorizontal: 4 },
  routineRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  routineCheck:{ fontSize: 14 },
  routineTask: { fontSize: 12, color: '#555', fontWeight: '600' },
  routineTaskDone: { textDecorationLine: 'line-through', color: '#aaa' },

  // Focus
  notifCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 10, gap: 8, borderWidth: 1, borderColor: '#E0E0E0', width: 200 },
  notifIcon: { fontSize: 18 },
  notifText: { flex: 1, fontSize: 11, fontWeight: '600', color: '#333' },
  notifTag:  { fontSize: 10, fontWeight: '800', color: '#888' },
});
