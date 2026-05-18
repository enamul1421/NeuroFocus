import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { colors, useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';
import SpeakButton from '../../../components/SpeakButton';
import TimerRing from '../../../components/TimerRing';
import ModuleTopBar from '../../../components/ModuleTopBar';

const PHASE = {
  SOS:         'sos',
  FRUSTRATION: 'frustration', // rating ≤ 4 — lighter STOP-skill pathway
  TECHNIQUE:   'technique',
  TIMER:       'timer',
  WAIT:        'wait',
  REFLECT:     'reflect',
  DONE:        'done',
};

const STOP_TOOLS = [
  { id: 'stop',    emoji: '✋', label: 'Freeze for 3 seconds',     desc: 'Literally stop moving. Break the momentum.' },
  { id: 'breathe', emoji: '💨', label: '5 slow breaths',           desc: 'In through nose, out through mouth. Count each one.' },
  { id: 'name',    emoji: '🏷',  label: 'Name it out loud',         desc: '"I am frustrated because..." Say it. Naming reduces it.' },
  { id: 'move',    emoji: '🚶', label: 'Step away for 2 minutes',  desc: 'Leave the space. Come back when the edge is off.' },
  { id: 'shake',   emoji: '🤚', label: 'Shake out hands and arms', desc: 'Discharges the tension sitting in the body.' },
];

const TRIGGERS = [
  'Someone said something hurtful',
  'Homework / schoolwork',
  'Phone or device taken away',
  'Losing a game',
  'Tired or hungry',
  'Plans changed unexpectedly',
  'Felt ignored or left out',
  'Something else',
];

const WAIT_MS = 10 * 60 * 1000; // 10 minutes

export default function CoolDown({ navigation }) {
  const colors = useColors();
  const { addCoolDownLog, participantCode, focusControlSessions, trustedAdultName } = useStore(s => ({
    addCoolDownLog:       s.addCoolDownLog,
    participantCode:      s.participantCode,
    focusControlSessions: s.focusControlSessions || [],
    trustedAdultName:     s.trustedAdultName || '',
  }));

  const [phase,       setPhase]     = useState(PHASE.SOS);
  const [technique,   setTechnique] = useState(null); // 'cold' | 'exercise'
  const [timerSec,    setTimerSec]  = useState(0);
  const [timerTotal,  setTimerTotal]= useState(0);
  const [waitSec,     setWaitSec]   = useState(600);
  const [angerBefore, setAngerBefore] = useState(null);
  const [angerAfter,  setAngerAfter]  = useState(null);
  const [trigger,         setTrigger]        = useState(null);
  const [triggerControl,  setTriggerControl] = useState(null); // 'no'|'partly'|'yes'
  const [reactionControl, setReactionControl]= useState(null); // 'no'|'partly'|'yes'
  const [reflection,      setReflection]     = useState('');
  const [exerciseCount,  setExCount]       = useState(0);
  const [frustratedTools,setFrustTools]    = useState([]); // ids of STOP tools tapped

  const timerRef = useRef(null);
  const waitRef  = useRef(null);
  const countAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => () => {
    clearInterval(timerRef.current);
    clearInterval(waitRef.current);
  }, []);

  // ── Cold water timer (30s) ─────────────────────────────────────────────────
  function startColdWater() {
    setTechnique('cold');
    setTimerSec(30);
    setTimerTotal(30);
    setPhase(PHASE.TIMER);
    timerRef.current = setInterval(() => {
      setTimerSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          startWait();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Exercise timer (60s) ───────────────────────────────────────────────────
  function startExercise() {
    setTechnique('exercise');
    setTimerSec(60);
    setTimerTotal(60);
    setExCount(0);
    setPhase(PHASE.TIMER);
    timerRef.current = setInterval(() => {
      setTimerSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          startWait();
          return 0;
        }
        if ((60 - prev + 1) % 2 === 0) setExCount(c => c + 1);
        return prev - 1;
      });
    }, 1000);
  }

  // ── 10-min wait ────────────────────────────────────────────────────────────
  function startWait() {
    setWaitSec(600);
    setPhase(PHASE.WAIT);
    waitRef.current = setInterval(() => {
      setWaitSec(prev => {
        if (prev <= 1) { clearInterval(waitRef.current); setPhase(PHASE.REFLECT); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function skipWait() {
    clearInterval(waitRef.current);
    setPhase(PHASE.REFLECT);
  }

  // ── Save + finish ──────────────────────────────────────────────────────────
  function finish() {
    addCoolDownLog({
      date: new Date().toISOString(),
      technique,
      angerBefore,
      angerAfter,
      trigger,
      triggerControl,
      reactionControl,
      reflection: reflection.trim(),
    });
    setPhase(PHASE.DONE);
  }

  // ── Performance correlation ────────────────────────────────────────────────
  const avgBrake = focusControlSessions.length > 0
    ? Math.round(focusControlSessions.reduce((a, s) => a + (s.brakeScore || 0), 0) / focusControlSessions.length)
    : null;

  const phaseStep = { sos:0, technique:1, timer:2, wait:3, reflect:4, done:5 }[phase] ?? 0;
  const progressColor = phase === PHASE.SOS || phase === PHASE.TECHNIQUE ? '#E53935'
    : phase === PHASE.TIMER ? '#FF9800'
    : phase === PHASE.WAIT  ? '#FFC107'
    : '#009E73';

  // ── SOS ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.SOS) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ModuleTopBar emoji="🆘" onBack={() => navigation.goBack()} />
        <SessionProgress current={0} total={5} color="#E53935" />
        <View style={styles.center}>
          <Text style={[styles.sosTitle, { color: colors.text }]}>We need to cool down.</Text>
          <Text style={[styles.sosSub, { color: colors.textLight }]}>Our brain is flooded right now. That is okay. Let us do one thing to reset it.</Text>
          <SpeakButton text="When emotion spikes past a threshold, the thinking brain goes offline — that is limbic flooding, and it is neurological. CoolDown uses proven STOP-skill techniques to bring the brain back online step by step. About 8 minutes total. We are not broken — our brain is just catching up." style={{ marginBottom: 12 }} />

          <Text style={[styles.angerLabel, { color: colors.text }]}>How angry are we right now?</Text>
          <View style={styles.angerRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.angerBtn, angerBefore === n && styles.angerBtnActive,
                  { backgroundColor: angerBefore === n ? angerColor(n) : colors.surface, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => setAngerBefore(n)}
              >
                <Text style={styles.angerNum}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.angerHint}>1 = a little  ·  10 = explosive</Text>

          {angerBefore && angerBefore <= 4 && (
            <Text style={styles.angerFrustHint}>
              Looks like frustration — not a full flood. We can handle this lighter.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.sosBtn,
              !angerBefore && styles.sosBtnOff,
              angerBefore && angerBefore <= 4 && { backgroundColor: '#FF9800' },
            ]}
            onPress={angerBefore
              ? () => setPhase(angerBefore <= 4 ? PHASE.FRUSTRATION : PHASE.TECHNIQUE)
              : null}
          >
            <Text style={styles.sosBtnText}>
              {angerBefore && angerBefore <= 4 ? 'Handle the frustration →' : 'I need to reset →'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sosBackBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.sosBackText}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── FRUSTRATION (rating ≤ 4) — STOP skill pathway ───────────────────────────
  if (phase === PHASE.FRUSTRATION) {
    const anyTapped = frustratedTools.length > 0;
    function toggleTool(id) {
      setFrustTools(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
    }
    function finishFrustration() {
      addCoolDownLog({
        date: new Date().toISOString(),
        technique: 'stop_skill',
        angerBefore,
        angerAfter: null,
        trigger: null,
        triggerControl: null,
        reactionControl: null,
        reflection: '',
        frustratedTools,
      });
      setPhase(PHASE.DONE);
    }
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={3} color="#FF9800" />
        <ScrollView contentContainerStyle={styles.frustContent}>
          <Text style={styles.frustEmoji}>✋</Text>
          <Text style={[styles.frustTitle, { color: colors.text }]}>Frustration — not a flood.</Text>
          <Text style={[styles.frustSub, { color: colors.textLight }]}>
            We caught it early. That is the skill. Pick anything below — even one tool changes the momentum.
          </Text>

          <View style={[styles.stopCard, { backgroundColor: '#FFF3E0', borderColor: '#FFB74D' }]}>
            <Text style={styles.stopCardTitle}>The STOP skill</Text>
            <Text style={styles.stopCardText}>
              <Text style={{ fontWeight: '900' }}>S</Text>top what we are doing
              {'  ·  '}
              <Text style={{ fontWeight: '900' }}>T</Text>ake a breath
              {'  ·  '}
              <Text style={{ fontWeight: '900' }}>O</Text>bserve what is happening
              {'  ·  '}
              <Text style={{ fontWeight: '900' }}>P</Text>roceed with one small choice
            </Text>
          </View>

          {STOP_TOOLS.map(t => {
            const active = frustratedTools.includes(t.id);
            return (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.frustToolRow,
                  { borderColor: active ? '#FF9800' : colors.border,
                    backgroundColor: active ? '#FFF3E0' : colors.surface },
                ]}
                onPress={() => toggleTool(t.id)}
              >
                <Text style={styles.frustToolEmoji}>{t.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.frustToolLabel, { color: colors.text }]}>{t.label}</Text>
                  <Text style={[styles.frustToolDesc, { color: colors.textLight }]}>{t.desc}</Text>
                </View>
                {active && <Text style={{ fontSize: 18, color: '#FF9800' }}>✓</Text>}
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[styles.sosBtn, { backgroundColor: anyTapped ? '#FF9800' : '#CCC', marginTop: 24 }]}
            onPress={anyTapped ? finishFrustration : null}
          >
            <Text style={styles.sosBtnText}>Handled it  +35 XP →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignItems: 'center', marginTop: 14, padding: 8 }}
            onPress={() => setPhase(PHASE.TECHNIQUE)}
          >
            <Text style={[styles.skipBtnText, { color: colors.textLight, fontSize: 13 }]}>
              This is bigger — I need the full reset →
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TECHNIQUE CHOICE ────────────────────────────────────────────────────────
  if (phase === PHASE.TECHNIQUE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#1A0800' }]}>
        <SessionProgress current={1} total={5} color="#FF6D00" />
        <View style={styles.center}>
          <Text style={styles.techniqueTitle}>Pick one. Do it now.</Text>

          <TouchableOpacity style={styles.techniqueCard} onPress={startColdWater}>
            <Text style={styles.techniqueEmoji}>🧊</Text>
            <Text style={styles.techniqueName}>Cold Water</Text>
            <Text style={styles.techniqueDesc}>Run cold water over wrists and face for 30 seconds. Fastest way to drop heart rate.</Text>
            <Text style={styles.techniqueTime}>30 seconds</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.techniqueCard, { marginTop: 16 }]} onPress={startExercise}>
            <Text style={styles.techniqueEmoji}>💪</Text>
            <Text style={styles.techniqueName}>Physical Burst</Text>
            <Text style={styles.techniqueDesc}>20 jumping jacks or sprint in place. Burns the adrenaline chemically.</Text>
            <Text style={styles.techniqueTime}>60 seconds</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── TIMER ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.TIMER) {
    const progress = timerTotal > 0 ? timerSec / timerTotal : 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0D0800' }]}>
        <View style={styles.center}>
          {technique === 'cold' ? (
            <>
              <Text style={styles.bigEmoji}>🚿</Text>
              <Text style={styles.timerTitle}>Cold water on face & wrists</Text>
              <Text style={styles.timerSub}>Keep it running. Stay with it.</Text>
            </>
          ) : (
            <>
              <Text style={styles.bigEmoji}>⚡</Text>
              <Text style={styles.timerTitle}>Jumping jacks — go!</Text>
              <Text style={styles.timerSub}>{exerciseCount} done</Text>
            </>
          )}
          <TimerRing
            progress={progress}
            color="#FF9800"
            label={`${timerSec}`}
            sublabel="seconds"
            size={180}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── WAIT ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.WAIT) {
    const mins = Math.floor(waitSec / 60);
    const secs = waitSec % 60;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000D0A' }]}>
        <SessionProgress current={3} total={5} color="#00897B" />
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🧠</Text>
          <Text style={styles.waitTitle}>Our brain is resetting</Text>
          <Text style={styles.waitSub}>
            It takes about 10 minutes for the stress hormones to clear. We did the hard part. Now we wait.
          </Text>
          <Text style={styles.countdown}>{mins}:{String(secs).padStart(2,'0')}</Text>
          <Text style={styles.countdownLabel}>minutes remaining</Text>
          <TouchableOpacity style={styles.skipBtn} onPress={skipWait}>
            <Text style={styles.skipBtnText}>I am calm — skip ahead</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── REFLECT ────────────────────────────────────────────────────────────────
  if (phase === PHASE.REFLECT) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={4} total={5} color="#009E73" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.reflectTitle, { color: colors.text }]}>We handled it. 💪</Text>
          <Text style={[styles.reflectSub, { color: colors.textLight }]}>
            We used a reset skill instead of letting it escalate. That is real growth.
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>How angry do we feel now?</Text>
          <View style={styles.angerRow}>
            {[1,2,3,4,5,6,7,8,9,10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.angerBtn, angerAfter === n && styles.angerBtnActive,
                  { backgroundColor: angerAfter === n ? angerColor(n) : colors.surface }]}
                onPress={() => setAngerAfter(n)}
              >
                <Text style={[styles.angerNum, { color: angerAfter === n ? '#fff' : colors.textLight }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {angerBefore && angerAfter && (
            <View style={[styles.deltaCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.deltaText, { color: colors.primary }]}>
                Anger: {angerBefore} → {angerAfter}
                {angerAfter < angerBefore ? `  ↓ down ${angerBefore - angerAfter} points ✓` : '  Still processing — that is okay.'}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.text }]}>What set us off?</Text>
          <View style={styles.triggerGrid}>
            {TRIGGERS.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.triggerChip, trigger === t && styles.triggerChipSelected,
                  { backgroundColor: trigger === t ? colors.primary : colors.surface, borderColor: trigger === t ? colors.primary : colors.border }]}
                onPress={() => setTrigger(t)}
              >
                <Text style={[styles.triggerText, { color: trigger === t ? '#fff' : colors.text }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Could we have controlled what triggered us?</Text>
          <View style={styles.controlRow}>
            {[['no','Not really'],['partly','A little'],['yes','Yes']].map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={[styles.controlBtn, triggerControl === val && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setTriggerControl(val)}
              >
                <Text style={[styles.controlBtnText, { color: triggerControl === val ? '#fff' : colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Could we have shaped how we responded?</Text>
          <View style={styles.controlRow}>
            {[['no','Not much'],['partly','A little'],['yes','I could have']].map(([val, label]) => (
              <TouchableOpacity
                key={val}
                style={[styles.controlBtn, reactionControl === val && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setReactionControl(val)}
              >
                <Text style={[styles.controlBtnText, { color: reactionControl === val ? '#fff' : colors.text }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {triggerControl && reactionControl && (
            <View style={[styles.ownershipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.ownershipText, { color: colors.text }]}>
                {triggerControl === 'no' && reactionControl === 'no'
                  ? 'Some moments just flood us before we can catch them. The fact we used a reset skill — that is the whole growth.'
                  : triggerControl === 'no' && reactionControl === 'partly'
                  ? "The trigger wasn't ours. Our response — partly in our hands. That part we can build on."
                  : triggerControl === 'no' && reactionControl === 'yes'
                  ? "The trigger wasn't ours to control. How we responded — that part we can grow. Knowing the difference is the whole skill."
                  : triggerControl === 'partly' && reactionControl === 'no'
                  ? 'Some of it was in our hands, and our response got away from us. That happens. Next time we catch it one step earlier.'
                  : triggerControl === 'yes' && reactionControl === 'no'
                  ? 'We can work on the situation and our response. That gives us real leverage here.'
                  : 'We have room on both sides. That means we have real power to change this pattern.'}
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            One thing we could try next time? (optional)
          </Text>
          <TextInput
            style={[styles.reflectInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Just one small thing..."
            placeholderTextColor={colors.textLight}
            value={reflection}
            onChangeText={setReflection}
            multiline
          />

          {avgBrake && (
            <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.insightTitle, { color: colors.primary }]}>📊 Our data</Text>
              <Text style={[styles.insightText, { color: colors.text }]}>
                Our average FocusControl brake score is {avgBrake}/100. Staying regulated keeps those scores high — our brain genuinely performs better when we are calm.
              </Text>
            </View>
          )}

          {angerBefore >= 8 && trustedAdultName ? (
            <View style={[styles.insightCard, { backgroundColor: '#E8EAF6', borderColor: '#9FA8DA' }]}>
              <Text style={[styles.insightText, { color: '#1A237E' }]}>
                That was a big one. If it is still sitting with us —{' '}
                <Text style={{ fontWeight: '900' }}>{trustedAdultName}</Text>{' '}
                is someone we can talk to when ready.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.doneBtn} onPress={finish}>
            <Text style={styles.doneBtnText}>Save reflection  +70 XP →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.bigEmoji}>🏆</Text>
          <Text style={[styles.reflectTitle, { color: colors.text }]}>We handled it.</Text>
          <Text style={[styles.reflectSub, { color: colors.textLight }]}>
            Using a reset skill instead of reacting is one of the hardest things our brain can do. We just proved we can do it.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneBtnText}>Back to app →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

function angerColor(n) {
  if (n <= 3) return '#4CAF50';
  if (n <= 5) return '#FF9800';
  if (n <= 7) return '#FF5722';
  return '#B71C1C';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  content:   { padding: 24, paddingBottom: 40 },

  bigEmoji:    { fontSize: 72, marginBottom: 16 },
  sosTitle:    { fontSize: 30, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10 },
  sosSub:      { fontSize: 15, color: '#FFAAAA', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  angerFrustHint: { fontSize: 12, color: '#FFCC80', textAlign: 'center', marginBottom: 10, fontStyle: 'italic' },
  frustContent:   { padding: 24, paddingBottom: 40 },
  frustEmoji:     { fontSize: 52, textAlign: 'center', marginBottom: 10, marginTop: 4 },
  frustTitle:     { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  frustSub:       { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  stopCard:       { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  stopCardTitle:  { fontSize: 12, fontWeight: '900', letterSpacing: 1, color: '#E65100', marginBottom: 6 },
  stopCardText:   { fontSize: 13, lineHeight: 22, color: '#BF360C' },
  frustToolRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  frustToolEmoji: { fontSize: 22 },
  frustToolLabel: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  frustToolDesc:  { fontSize: 12, lineHeight: 18 },

  angerLabel:  { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 12 },
  angerRow:    { flexDirection: 'row', gap: 6, marginBottom: 6 },
  angerBtn:    { width: 30, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  angerBtnActive: { transform: [{ scale: 1.2 }] },
  angerNum:    { fontSize: 13, fontWeight: '800', color: '#fff' },
  angerHint:   { fontSize: 11, color: '#888', marginBottom: 32 },
  sosBackBtn:  { marginTop: 16, padding: 10, alignItems: 'center' },
  sosBackText: { color: '#888', fontSize: 13 },
  sosBtn:      { backgroundColor: '#E53935', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 18, width: '100%', alignItems: 'center' },
  sosBtnOff:   { backgroundColor: '#444' },
  sosBtnText:  { color: '#fff', fontSize: 18, fontWeight: '900' },

  techniqueTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 24 },
  techniqueCard:  { backgroundColor: '#1A1200', borderRadius: 20, padding: 24, width: '100%', borderWidth: 2, borderColor: '#FF9800' },
  techniqueEmoji: { fontSize: 40, marginBottom: 8 },
  techniqueName:  { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 6 },
  techniqueDesc:  { fontSize: 14, color: '#FFCC80', lineHeight: 20, marginBottom: 8 },
  techniqueTime:  { fontSize: 12, color: '#FF9800', fontWeight: '700' },

  timerTitle:     { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
  timerSub:       { fontSize: 16, color: '#FFCC80', marginBottom: 40 },
  countdown:      { fontSize: 96, fontWeight: '900', color: '#fff', lineHeight: 100 },
  countdownLabel: { fontSize: 16, color: '#888', marginTop: 8 },

  waitTitle:   { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  waitSub:     { fontSize: 14, color: '#80CBC4', textAlign: 'center', lineHeight: 22, marginBottom: 40 },
  skipBtn:     { marginTop: 24, padding: 12 },
  skipBtnText: { color: '#555', fontSize: 13 },

  reflectTitle: { fontSize: 26, fontWeight: '900', marginBottom: 8 },
  reflectSub:   { fontSize: 14, lineHeight: 22, marginBottom: 24 },
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 8 },

  deltaCard:  { borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 16 },
  deltaText:  { fontSize: 15, fontWeight: '700' },

  triggerGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  triggerChip:        { borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 7 },
  triggerChipSelected:{ },
  triggerText:        { fontSize: 13, fontWeight: '600' },

  controlRow:      { flexDirection: 'row', gap: 8, marginBottom: 18 },
  controlBtn:      { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: '#DDD', paddingVertical: 10, alignItems: 'center' },
  controlBtnText:  { fontSize: 13, fontWeight: '700' },
  ownershipCard:   { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  ownershipText:   { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  reflectInput: { borderRadius: 12, borderWidth: 1.5, padding: 14, fontSize: 15, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },

  insightCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  insightTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  insightText:  { fontSize: 14, lineHeight: 22 },

  doneBtn:     { backgroundColor: '#009E73', borderRadius: 14, padding: 18, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
