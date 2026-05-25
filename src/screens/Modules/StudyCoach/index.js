import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SpeakButton from '../../../components/SpeakButton';
import ModuleTopBar from '../../../components/ModuleTopBar';
import TimerRing from '../../../components/TimerRing';

const ACCENT       = '#6A1B9A';
const ACCENT_MID   = '#9C4DCC';
const ACCENT_LIGHT = '#F3E5F5';
const ACCENT_DARK  = '#4A0072';

const SUBJECTS = [
  { label: 'Math',    icon: '➗' },
  { label: 'Science', icon: '🔬' },
  { label: 'History', icon: '📜' },
  { label: 'English', icon: '📝' },
  { label: 'CS',      icon: '💻' },
  { label: 'Art',     icon: '🎨' },
  { label: 'Other',   icon: '📚' },
];

const DURATIONS = [
  { label: '25 min', mins: 25 },
  { label: '45 min', mins: 45 },
  { label: '60 min', mins: 60 },
  { label: '90 min', mins: 90 },
];

const INCUP = [
  { key: 'challenge', icon: '🔥', label: 'Challenge', desc: 'This is hard — and I can beat it' },
  { key: 'novelty',   icon: '✨', label: 'Novelty',   desc: 'Trying something new today' },
  { key: 'interest',  icon: '🎯', label: 'Interest',  desc: 'I actually care about this' },
  { key: 'urgency',   icon: '⚡', label: 'Urgency',   desc: 'Real deadline coming — time to move' },
  { key: 'passion',   icon: '💜', label: 'Passion',   desc: 'This connects to what matters to me' },
];

const PHASE = { INTRO: 'intro', SETUP: 'setup', ACTIVE: 'active', REPORT: 'report', DONE: 'done' };


function fmt(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function scheduleStudyNotifications(totalMins) {
  const halfSecs  = Math.floor((totalMins * 60) / 2);
  const finalSecs = Math.max(totalMins * 60 - 300, 60);
  const ids = [];
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return ids;
    const id1 = await Notifications.scheduleNotificationAsync({
      content: { title: 'Halfway there 🔥', body: 'Our brain is warmed up. Keep the momentum.' },
      trigger: { type: 'timeInterval', seconds: halfSecs, repeats: false },
    });
    const id2 = await Notifications.scheduleNotificationAsync({
      content: { title: '5 minutes left ⚡', body: 'Final push — wrap up or mark what we finished.' },
      trigger: { type: 'timeInterval', seconds: finalSecs, repeats: false },
    });
    ids.push(id1, id2);
  } catch (_) {}
  return ids;
}

async function cancelNotifications(ids) {
  for (const id of ids) {
    try { await Notifications.cancelScheduledNotificationAsync(id); } catch (_) {}
  }
}

export default function StudyCoach({ navigation }) {
  const colors = useColors();
  const { studyCoachSessions, addStudyCoachSession } = useStore(s => ({
    studyCoachSessions: s.studyCoachSessions || [],
    addStudyCoachSession: s.addStudyCoachSession,
  }));

  const [phase,        setPhase]        = useState(PHASE.INTRO);
  const [subject,      setSubject]      = useState(null);
  const [taskName,     setTaskName]     = useState('');
  const [durationMins, setDurationMins] = useState(45);
  const [motivator,    setMotivator]    = useState(null);
  const [bodyDoubling, setBodyDoubling] = useState(false);
  const [secsLeft,     setSecsLeft]     = useState(0);
  const [startedAt,    setStartedAt]    = useState(null);

  const timerRef   = useRef(null);
  const notifIds   = useRef([]);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    cancelNotifications(notifIds.current);
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];
  const last7    = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    const daySessions = studyCoachSessions.filter(s => s.date === ds);
    return {
      day: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()],
      count: daySessions.length,
      done:  daySessions.filter(s => s.outcome === 'done').length,
    };
  });

  const todaySessions = studyCoachSessions.filter(s => s.date === todayStr);

  function startSession() {
    if (!subject || !motivator) return;
    const totalSecs = durationMins * 60;
    setSecsLeft(totalSecs);
    setStartedAt(Date.now());
    scheduleStudyNotifications(durationMins).then(ids => { notifIds.current = ids; });
    setPhase(PHASE.ACTIVE);
    timerRef.current = setInterval(() => {
      setSecsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          cancelNotifications(notifIds.current);
          setPhase(PHASE.REPORT);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function endEarly() {
    clearInterval(timerRef.current);
    cancelNotifications(notifIds.current);
    setPhase(PHASE.REPORT);
  }

  function submitReport(outcome) {
    const actualMins = startedAt
      ? Math.round((Date.now() - startedAt) / 60000)
      : durationMins;
    addStudyCoachSession({
      date: todayStr,
      timestamp: new Date().toISOString(),
      subject,
      taskName: taskName.trim() || subject,
      durationMins,
      actualMins,
      motivator,
      bodyDoubling,
      outcome,
    });
    setPhase(PHASE.DONE);
  }

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    const maxCount = Math.max(...last7.map(d => d.count), 1);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ModuleTopBar emoji="📚" onBack={() => navigation.goBack()} tintColor={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: ACCENT }]}>📚 STUDYCOACH</Text>
          <Text style={[styles.headline, { color: colors.text }]}>Study with momentum</Text>
          <SpeakButton
            text="When our brain gets bored, time feels endless. The fix is not to try harder — it is to create real urgency. Research shows that adding a challenge, a countdown, or something new activates the same reward system that makes games feel easy. This module gives our brain what it needs to lock in: a clear task, a real deadline, and a reason that means something."
            style={{ marginBottom: 14 }}
          />

          {todaySessions.length > 0 && (
            <View style={[styles.todayCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT }]}>
              <Text style={[styles.todayStatus, { color: ACCENT }]}>
                ✓ {todaySessions.length} session{todaySessions.length > 1 ? 's' : ''} today
              </Text>
              <Text style={[styles.todayDetail, { color: colors.textLight }]}>
                {todaySessions.filter(s => s.outcome === 'done').length} completed ·{' '}
                {todaySessions.reduce((a, s) => a + s.actualMins, 0)} min total
              </Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Last 7 days</Text>
          <View style={styles.chartRow}>
            {last7.map(({ day, count, done }, i) => {
              const h   = count > 0 ? Math.max(10, Math.round((count / maxCount) * 56)) : 4;
              const col = count === 0 ? '#E0E0E0' : done === count ? ACCENT : ACCENT_MID;
              return (
                <View key={i} style={styles.chartCol}>
                  <View style={[styles.chartBar, { height: h, backgroundColor: col }]} />
                  <Text style={[styles.chartDay, { color: colors.textLight }]}>{day}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.incupRow}>
            {INCUP.map(m => (
              <View key={m.key} style={[styles.incupChip, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT }]}>
                <Text style={styles.incupChipText}>{m.icon} {m.label}</Text>
              </View>
            ))}
          </View>
          <Text style={[styles.incupCaption, { color: colors.textLight }]}>
            Pick a motivator each session — research shows naming WHY we're studying activates sustained focus
          </Text>
        </ScrollView>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
          onPress={() => setPhase(PHASE.SETUP)}
        >
          <Text style={styles.primaryBtnText}>Start a session →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── SETUP ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.SETUP) {
    const canStart = !!subject && !!motivator;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ModuleTopBar emoji="📚" onBack={() => setPhase(PHASE.INTRO)} tintColor={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.headline, { color: colors.text }]}>Set up our session</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Subject</Text>
          <View style={styles.subjectGrid}>
            {SUBJECTS.map(s => {
              const sel = subject === s.label;
              return (
                <TouchableOpacity
                  key={s.label}
                  style={[styles.subjectChip, {
                    backgroundColor: sel ? ACCENT : colors.surface,
                    borderColor:     sel ? ACCENT : colors.border,
                  }]}
                  onPress={() => setSubject(s.label)}
                >
                  <Text style={styles.subjectIcon}>{s.icon}</Text>
                  <Text style={[styles.subjectLabel, { color: sel ? '#fff' : colors.text }]}>{s.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>
            What are we working on? <Text style={{ fontWeight: '400', color: colors.textLight }}>(optional)</Text>
          </Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="e.g. Chapter 5 problems, essay outline..."
            placeholderTextColor={colors.textLight}
            value={taskName}
            onChangeText={setTaskName}
            maxLength={60}
          />

          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>Commitment window</Text>
          <View style={styles.durationRow}>
            {DURATIONS.map(d => {
              const sel = durationMins === d.mins;
              return (
                <TouchableOpacity
                  key={d.mins}
                  style={[styles.durationChip, {
                    backgroundColor: sel ? ACCENT : colors.surface,
                    borderColor:     sel ? ACCENT : colors.border,
                  }]}
                  onPress={() => setDurationMins(d.mins)}
                >
                  <Text style={[styles.durationText, { color: sel ? '#fff' : colors.text }]}>{d.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={[styles.hint, { color: colors.textLight }]}>
            No extensions once we start. The hard stop is what makes it work.
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>Why does this matter right now?</Text>
          {INCUP.map(m => {
            const sel = motivator === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                style={[styles.motivatorCard, {
                  backgroundColor: sel ? ACCENT_LIGHT : colors.surface,
                  borderColor:     sel ? ACCENT : colors.border,
                }]}
                onPress={() => setMotivator(m.key)}
              >
                <View style={[styles.radio, { borderColor: sel ? ACCENT : '#CCC' }, sel && { backgroundColor: ACCENT }]} />
                <Text style={styles.motivatorIcon}>{m.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.motivatorLabel, { color: colors.text }]}>{m.label}</Text>
                  <Text style={[styles.motivatorDesc, { color: colors.textLight }]}>{m.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={[styles.doublingCard, {
            backgroundColor: bodyDoubling ? ACCENT_LIGHT : colors.surface,
            borderColor:     bodyDoubling ? ACCENT : colors.border,
          }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.doublingTitle, { color: colors.text }]}>👥 Body doubling</Text>
              <Text style={[styles.doublingDesc, { color: colors.textLight }]}>
                Study near someone else — even on video call. Research shows presence alone boosts completion 37%.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.toggle, { backgroundColor: bodyDoubling ? ACCENT : '#CCC' }]}
              onPress={() => setBodyDoubling(v => !v)}
            >
              <View style={[styles.toggleKnob, { left: bodyDoubling ? 22 : 2 }]} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: canStart ? ACCENT : '#CCC' }]}
          onPress={startSession}
          disabled={!canStart}
        >
          <Text style={styles.primaryBtnText}>Lock in · {durationMins} min ⏱</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setPhase(PHASE.INTRO)}>
          <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── ACTIVE ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.ACTIVE) {
    const totalSecs = durationMins * 60;
    const progress  = secsLeft / totalSecs;
    const urgency   = secsLeft <= 300;
    const arcColor  = urgency ? '#E91E63' : ACCENT;
    const m         = INCUP.find(i => i.key === motivator);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={[styles.activeSub, { color: colors.textLight }]}>
          {subject}{taskName ? ` · ${taskName}` : ''}
        </Text>

        <TimerRing
          progress={progress}
          color={arcColor}
          trackColor={colors.border}
          label={fmt(secsLeft)}
          sublabel="remaining"
          labelColor={colors.text}
          size={240}
          showSpark={!urgency}
          tailIcon={true}
          fuseLength={urgency ? 12 : 40}
          fuseColor={urgency ? '#FF5722' : '#FFD54F'}
        />

        {m && (
          <View style={[styles.motivatorBadge, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT }]}>
            <Text style={[styles.motivatorBadgeText, { color: ACCENT_DARK }]}>{m.icon} {m.desc}</Text>
          </View>
        )}

        {bodyDoubling && (
          <View style={[styles.doublingBadge, { backgroundColor: '#E3F2FD', borderColor: '#1565C0' }]}>
            <Text style={[styles.doublingBadgeText, { color: '#1565C0' }]}>👥 Body doubling active</Text>
          </View>
        )}

        {urgency && (
          <Text style={[styles.urgencyText, { color: '#C62828' }]}>💥 Final push — wrap up what we can</Text>
        )}

        <TouchableOpacity style={styles.endBtn} onPress={endEarly}>
          <Text style={styles.endBtnText}>End session early</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── REPORT ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.REPORT) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={[styles.reportTitle, { color: colors.text }]}>Time's up.</Text>
        <Text style={[styles.reportSub, { color: colors.textLight }]}>No extensions. How did we do?</Text>

        <TouchableOpacity
          style={[styles.reportBtn, { backgroundColor: '#2E7D32', borderColor: '#4CAF50' }]}
          onPress={() => submitReport('done')}
        >
          <Text style={styles.reportBtnIcon}>✅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportBtnLabel}>Done</Text>
            <Text style={styles.reportBtnDesc}>We finished what we planned</Text>
          </View>
          <Text style={styles.reportXP}>+60 XP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportBtn, { backgroundColor: '#4527A0', borderColor: '#7E57C2' }]}
          onPress={() => submitReport('partial')}
        >
          <Text style={styles.reportBtnIcon}>🔶</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportBtnLabel}>Partial</Text>
            <Text style={styles.reportBtnDesc}>We made real progress</Text>
          </View>
          <Text style={styles.reportXP}>+30 XP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportBtn, { backgroundColor: '#37474F', borderColor: '#546E7A' }]}
          onPress={() => submitReport('missed')}
        >
          <Text style={styles.reportBtnIcon}>📋</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportBtnLabel}>Got distracted</Text>
            <Text style={styles.reportBtnDesc}>Honest log — still counts</Text>
          </View>
          <Text style={styles.reportXP}>+10 XP</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    const last = studyCoachSessions[studyCoachSessions.length - 1];
    const xpMap = { done: 60, partial: 30, missed: 10 };
    const xpGot = xpMap[last?.outcome] || 10;
    const msgs  = {
      done:    'Commitment kept. Our brain just learned it can trust itself.',
      partial: 'Partial progress is still progress. The brain rewires with repetition.',
      missed:  'Logging it honestly is the first step. Tomorrow we try again.',
    };
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 68, marginBottom: 14 }}>
          {last?.outcome === 'done' ? '🎯' : last?.outcome === 'partial' ? '🔶' : '📋'}
        </Text>
        <Text style={[styles.doneTitle, { color: colors.text }]}>{msgs[last?.outcome] || ''}</Text>
        <View style={[styles.xpBadge, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT }]}>
          <Text style={[styles.xpText, { color: ACCENT }]}>⚡ +{xpGot} XP</Text>
        </View>
        {last?.outcome === 'done' && (
          <Text style={[styles.doneSub, { color: colors.textLight }]}>
            {durationMins} min · {subject} · {INCUP.find(m => m.key === last.motivator)?.icon} {last.motivator}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: ACCENT, marginTop: 28, width: '100%' }]}
          onPress={() => {
            setPhase(PHASE.INTRO);
            setSubject(null);
            setTaskName('');
            setMotivator(null);
            setBodyDoubling(false);
          }}
        >
          <Text style={styles.primaryBtnText}>Another session →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: '#9C4DCC' }]}>← Back to home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  darkScreen: { flex: 1, backgroundColor: '#1A0030', alignItems: 'center', justifyContent: 'center', padding: 24 },
  content:    { padding: 20, paddingBottom: 16 },

  moduleTag:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  headline:   { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  sectionLabel: { fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  hint:       { fontSize: 12, marginTop: 6, marginBottom: 4, fontStyle: 'italic' },

  todayCard:   { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 16 },
  todayStatus: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  todayDetail: { fontSize: 13 },

  chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 12, height: 68 },
  chartCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBar: { width: '100%', borderRadius: 4, minHeight: 4 },
  chartDay: { fontSize: 10, fontWeight: '600' },

  incupRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, marginBottom: 6 },
  incupChip:    { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  incupChipText:{ fontSize: 12, fontWeight: '700', color: ACCENT },
  incupCaption: { fontSize: 12, lineHeight: 18, marginBottom: 8 },

  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  subjectChip: { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', width: '30%' },
  subjectIcon: { fontSize: 20, marginBottom: 2 },
  subjectLabel:{ fontSize: 12, fontWeight: '700' },

  textInput: { borderRadius: 12, borderWidth: 1.5, padding: 14, fontSize: 15, marginBottom: 4 },

  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  durationChip:{ flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  durationText:{ fontSize: 13, fontWeight: '700' },

  motivatorCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 8, gap: 10 },
  radio:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  motivatorIcon: { fontSize: 20 },
  motivatorLabel:{ fontSize: 14, fontWeight: '700', marginBottom: 2 },
  motivatorDesc: { fontSize: 12, lineHeight: 18 },

  doublingCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 12, marginTop: 4, marginBottom: 4 },
  doublingTitle: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  doublingDesc:  { fontSize: 12, lineHeight: 18 },
  toggle:        { width: 48, height: 26, borderRadius: 13, justifyContent: 'center' },
  toggleKnob:    { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff' },

  primaryBtn:     { marginHorizontal: 20, marginBottom: 12, borderRadius: 14, padding: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginBottom: 16, padding: 8 },
  backLinkText:   { fontSize: 13 },

  arcWrapper:  { width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  bombEmoji:   { fontSize: 32, marginBottom: 2 },
  activeTimer: { fontSize: 42, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  activeLabel: { fontSize: 12, color: '#CE93D8', marginTop: 2 },
  activeSub:   { fontSize: 15, color: '#E1BEE7', marginBottom: 16, textAlign: 'center', fontWeight: '600' },

  motivatorBadge:    { backgroundColor: '#2D0050', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 10, borderWidth: 1, borderColor: ACCENT },
  motivatorBadgeText:{ color: '#CE93D8', fontSize: 13, fontWeight: '600' },
  doublingBadge:     { backgroundColor: '#1A2050', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 10, borderWidth: 1, borderColor: '#3949AB' },
  doublingBadgeText: { color: '#90CAF9', fontSize: 13, fontWeight: '600' },
  urgencyText:       { color: '#F48FB1', fontSize: 14, fontWeight: '700', marginBottom: 16 },
  endBtn:     { marginTop: 32, padding: 14 },
  endBtnText: { color: ACCENT_MID, fontSize: 13 },

  reportTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 6, textAlign: 'center' },
  reportSub:   { fontSize: 14, color: '#CE93D8', marginBottom: 28, textAlign: 'center' },
  reportBtn:   { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12, width: '100%', gap: 12 },
  reportBtnIcon:  { fontSize: 26 },
  reportBtnLabel: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 2 },
  reportBtnDesc:  { fontSize: 12, color: '#E0E0E0' },
  reportXP:       { fontSize: 13, fontWeight: '800', color: '#81C784' },

  doneTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16, lineHeight: 28 },
  doneSub:   { fontSize: 13, color: '#CE93D8', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  xpBadge:   { backgroundColor: '#2D0050', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: ACCENT },
  xpText:    { color: '#CE93D8', fontSize: 15, fontWeight: '800' },
});
