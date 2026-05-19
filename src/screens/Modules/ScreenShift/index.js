import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SpeakButton from '../../../components/SpeakButton';
import ModuleTopBar from '../../../components/ModuleTopBar';

const ACCENT       = '#2E7D32';
const ACCENT_LIGHT = '#E8F5E9';

const HOUR_OPTIONS = [
  { label: 'Under 30 min', hours: 0.25 },
  { label: '30 min – 1 hr', hours: 0.75 },
  { label: '1 – 2 hrs',    hours: 1.5  },
  { label: '2 – 4 hrs',    hours: 3    },
  { label: '4 – 6 hrs',    hours: 5    },
  { label: '6+ hrs',       hours: 7    },
];

const REPLACE_POOL = [
  { icon: '🍽️', text: 'Eat dinner with family — phones away' },
  { icon: '📞', text: 'Call a friend to meet up or catch up' },
  { icon: '🚶', text: 'Go for a 10-minute walk outside' },
  { icon: '🎲', text: 'Play a board game with someone at home' },
  { icon: '📖', text: 'Read a physical book for 15 minutes' },
  { icon: '🍳', text: 'Help cook or prepare a meal' },
  { icon: '🏀', text: 'Shoot hoops or go for a bike ride' },
  { icon: '💬', text: 'Have a real conversation — no phones' },
  { icon: '✏️', text: 'Write in a journal for 5 minutes' },
  { icon: '🧩', text: 'Do a puzzle or creative activity offline' },
];

const PHASE    = { INTRO: 'intro', LOG: 'log', SHIFT: 'shift', DONE: 'done' };
const SHIFT_S  = 10 * 60;
const R        = 70;
const CIRC     = 2 * Math.PI * R;

export default function ScreenShift({ navigation }) {
  const colors = useColors();
  const {
    screenShiftGoalHours, screenShiftLogs,
    setScreenShiftGoal, addScreenShiftLog,
  } = useStore(s => ({
    screenShiftGoalHours: s.screenShiftGoalHours ?? 3,
    screenShiftLogs:      s.screenShiftLogs      || [],
    setScreenShiftGoal:   s.setScreenShiftGoal,
    addScreenShiftLog:    s.addScreenShiftLog,
  }));

  const [phase,            setPhase]            = useState(PHASE.INTRO);
  const [selectedHours,    setSelectedHours]    = useState(null);
  const [connectedOffline, setConnectedOffline] = useState(null);
  const [secsLeft,         setSecsLeft]         = useState(SHIFT_S);
  const [activities]                            = useState(() =>
    [...REPLACE_POOL].sort(() => Math.random() - 0.5).slice(0, 3)
  );
  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLog = screenShiftLogs.find(l => l.date === todayStr);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().split('T')[0];
    return {
      day: ['Su','Mo','Tu','We','Th','Fr','Sa'][d.getDay()],
      log: screenShiftLogs.find(l => l.date === ds),
    };
  });

  function startShift() {
    setPhase(PHASE.SHIFT);
    setSecsLeft(SHIFT_S);
    timerRef.current = setInterval(() => {
      setSecsLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); setPhase(PHASE.DONE); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  function submitLog() {
    if (selectedHours === null || connectedOffline === null) return;
    const metGoal = selectedHours <= screenShiftGoalHours;
    addScreenShiftLog({ date: todayStr, hours: selectedHours, metGoal, connectedOffline });
    if (!metGoal) startShift();
    else setPhase(PHASE.DONE);
  }

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ModuleTopBar emoji="📵" onBack={() => navigation.goBack()} tintColor={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.moduleTag, { color: ACCENT }]}>📵 SCREENSHIFT</Text>
          <Text style={[styles.headline, { color: colors.text }]}>Screen to Life</Text>
          <SpeakButton
            text="Screens are not bad — but some brains get locked in. Research shows that swapping even 30 minutes of screen time for a real-world connection improves mood, focus, and sleep within days. This module helps us notice our patterns and gently shift toward the people and moments that matter. No guilt, no blocking. Just awareness and a better choice."
            style={{ marginBottom: 12 }}
          />

          <View style={[styles.goalCard, { backgroundColor: '#1B5E20', borderColor: ACCENT }]}>
            <Text style={styles.goalLabel}>DAILY SCREEN GOAL</Text>
            <View style={styles.goalRow}>
              <TouchableOpacity
                style={styles.goalBtn}
                onPress={() => setScreenShiftGoal(Math.max(0.5, screenShiftGoalHours - 0.5))}
              >
                <Text style={styles.goalBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.goalValue}>{screenShiftGoalHours}h</Text>
              <TouchableOpacity
                style={styles.goalBtn}
                onPress={() => setScreenShiftGoal(Math.min(10, screenShiftGoalHours + 0.5))}
              >
                <Text style={styles.goalBtnText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.goalSub}>recreational — not school work</Text>
          </View>

          {todayLog ? (
            <View style={[styles.todayCard, { backgroundColor: todayLog.metGoal ? '#E8F5E9' : '#FFF3E0', borderColor: todayLog.metGoal ? '#4CAF50' : '#FF9800' }]}>
              <Text style={[styles.todayStatus, { color: todayLog.metGoal ? ACCENT : '#E65100' }]}>
                {todayLog.metGoal ? '✓ Goal met today' : '⚠ Over goal today'}
              </Text>
              <Text style={[styles.todayDetail, { color: colors.textLight }]}>
                ~{todayLog.hours}h · {todayLog.connectedOffline ? '✓ Connected offline' : 'No offline connection'}
              </Text>
            </View>
          ) : (
            <View style={[styles.todayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.todayStatus, { color: colors.textLight }]}>Not logged yet today</Text>
            </View>
          )}

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Last 7 days</Text>
          <View style={styles.chartRow}>
            {last7.map(({ day, log }, i) => {
              const h   = log ? Math.min(56, Math.max(6, (log.hours / 8) * 56)) : 4;
              const col = !log ? '#E0E0E0' : log.metGoal ? '#4CAF50' : '#FF7043';
              return (
                <View key={i} style={styles.chartCol}>
                  <View style={[styles.chartBar, { height: h, backgroundColor: col }]} />
                  <Text style={[styles.chartDay, { color: colors.textLight }]}>{day}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[styles.legendText, { color: colors.textLight }]}>Met goal</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FF7043' }]} />
              <Text style={[styles.legendText, { color: colors.textLight }]}>Over goal</Text>
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: ACCENT }]} onPress={() => setPhase(PHASE.LOG)}>
          <Text style={styles.primaryBtnText}>{todayLog ? 'Update today →' : 'Log today →'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── LOG ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.LOG) {
    const canSubmit = selectedHours !== null && connectedOffline !== null;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ModuleTopBar emoji="📵" onBack={() => setPhase(PHASE.INTRO)} tintColor={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.headline, { color: colors.text }]}>Today's check-in</Text>
          <Text style={[styles.subText, { color: colors.textLight }]}>Be honest — this is just for us.</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>Recreational screen time today:</Text>
          {HOUR_OPTIONS.map(opt => {
            const sel  = selectedHours === opt.hours;
            const over = sel && opt.hours > screenShiftGoalHours;
            return (
              <TouchableOpacity
                key={opt.hours}
                style={[styles.optionCard, { backgroundColor: sel ? ACCENT_LIGHT : colors.surface, borderColor: sel ? ACCENT : colors.border }]}
                onPress={() => setSelectedHours(opt.hours)}
              >
                <View style={[styles.radio, { borderColor: sel ? ACCENT : '#CCC' }, sel && { backgroundColor: ACCENT }]} />
                <Text style={[styles.optionText, { color: colors.text }]}>{opt.label}</Text>
                {over && <Text style={styles.overTag}>over goal</Text>}
              </TouchableOpacity>
            );
          })}

          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 16 }]}>
            Did we connect with someone offline today?
          </Text>
          <View style={styles.yesNoRow}>
            <TouchableOpacity
              style={[styles.yesNoBtn, { backgroundColor: connectedOffline === true ? ACCENT_LIGHT : colors.surface, borderColor: connectedOffline === true ? ACCENT : colors.border }]}
              onPress={() => setConnectedOffline(true)}
            >
              <Text style={[styles.yesNoText, { color: connectedOffline === true ? ACCENT : colors.textLight }]}>✓ Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.yesNoBtn, { backgroundColor: connectedOffline === false ? '#FFF3E0' : colors.surface, borderColor: connectedOffline === false ? '#FF9800' : colors.border }]}
              onPress={() => setConnectedOffline(false)}
            >
              <Text style={[styles.yesNoText, { color: connectedOffline === false ? '#E65100' : colors.textLight }]}>✗ Not today</Text>
            </TouchableOpacity>
          </View>

          {connectedOffline === false && (
            <View style={[styles.nudgeCard, { backgroundColor: ACCENT_LIGHT, borderColor: '#A5D6A7' }]}>
              <Text style={[styles.nudgeText, { color: '#1B5E20' }]}>
                💚 Even a 5-minute conversation counts. One small connection today can shift our mood for hours.
              </Text>
            </View>
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: canSubmit ? ACCENT : '#CCC' }]}
          onPress={submitLog}
          disabled={!canSubmit}
        >
          <Text style={styles.primaryBtnText}>Submit →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => setPhase(PHASE.INTRO)}>
          <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── SHIFT (wind-down timer) ───────────────────────────────────────────────
  if (phase === PHASE.SHIFT) {
    const progress = secsLeft / SHIFT_S;
    return (
      <SafeAreaView style={[styles.container, styles.darkScreen]}>
        <Text style={styles.shiftTitle}>Time to shift</Text>
        <Text style={styles.shiftSub}>Put the phone down in</Text>

        <View style={styles.arcWrapper}>
          <Svg width={160} height={160} style={StyleSheet.absoluteFill}>
            <Circle cx={80} cy={80} r={R} stroke="#1B5E2060" strokeWidth={10} fill="none" />
            <Circle
              cx={80} cy={80} r={R}
              stroke={ACCENT}
              strokeWidth={10}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - progress)}
              transform="rotate(-90, 80, 80)"
            />
          </Svg>
          <Text style={styles.timerText}>{fmt(secsLeft)}</Text>
        </View>

        <Text style={styles.shiftHint}>While you wait — try one of these:</Text>
        {activities.map((a, i) => (
          <View key={i} style={styles.actRow}>
            <Text style={styles.actIcon}>{a.icon}</Text>
            <Text style={styles.actText}>{a.text}</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.skipBtn} onPress={() => { clearInterval(timerRef.current); setPhase(PHASE.DONE); }}>
          <Text style={styles.skipText}>Skip timer</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    const log = screenShiftLogs.find(l => l.date === todayStr);
    return (
      <SafeAreaView style={[styles.container, styles.darkScreen, { alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 72, marginBottom: 16 }}>🌿</Text>
        <Text style={styles.doneTitle}>
          {log?.metGoal ? 'Goal met. Well done.' : 'Logged. Awareness is step one.'}
        </Text>
        <Text style={styles.doneSub}>
          {log?.connectedOffline
            ? 'We connected offline today. That matters more than any screen.'
            : 'Tomorrow — try one offline connection. Even 5 minutes counts.'}
        </Text>
        <View style={styles.xpBadge}>
          <Text style={styles.xpText}>{log?.metGoal ? '⚡ +50 XP' : '⚡ +20 XP for logging'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: ACCENT, marginTop: 32, width: '100%' }]}
          onPress={() => { setPhase(PHASE.INTRO); navigation.goBack(); }}
        >
          <Text style={styles.primaryBtnText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  darkScreen: { flex: 1, backgroundColor: '#0A1F0A', alignItems: 'center', justifyContent: 'center', padding: 28 },
  content:    { padding: 20, paddingBottom: 16 },

  moduleTag:  { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 4 },
  headline:   { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  subText:    { fontSize: 14, marginBottom: 20 },
  sectionLabel: { fontSize: 14, fontWeight: '800', marginBottom: 10, marginTop: 4 },

  goalCard:   { borderRadius: 16, borderWidth: 2, padding: 20, alignItems: 'center', marginBottom: 14 },
  goalLabel:  { fontSize: 11, fontWeight: '800', color: '#81C784', letterSpacing: 1, marginBottom: 8 },
  goalRow:    { flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 4 },
  goalBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2E7D3240', alignItems: 'center', justifyContent: 'center' },
  goalBtnText:{ fontSize: 24, color: '#81C784', fontWeight: '700' },
  goalValue:  { fontSize: 48, fontWeight: '900', color: '#fff' },
  goalSub:    { fontSize: 12, color: '#81C784' },

  todayCard:   { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  todayStatus: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  todayDetail: { fontSize: 13 },

  chartRow:  { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8, height: 68 },
  chartCol:  { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  chartBar:  { width: '100%', borderRadius: 4, minHeight: 4 },
  chartDay:  { fontSize: 10, fontWeight: '600' },
  legend:    { flexDirection: 'row', gap: 16, marginBottom: 8 },
  legendItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText:{ fontSize: 11 },

  optionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 8, gap: 12 },
  radio:      { width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  overTag:    { fontSize: 10, fontWeight: '800', color: '#E65100', backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },

  yesNoRow:  { flexDirection: 'row', gap: 12, marginBottom: 12 },
  yesNoBtn:  { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 16, alignItems: 'center' },
  yesNoText: { fontSize: 16, fontWeight: '700' },

  nudgeCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 4 },
  nudgeText: { fontSize: 14, lineHeight: 22 },

  primaryBtn:     { marginHorizontal: 20, marginBottom: 12, backgroundColor: ACCENT, borderRadius: 14, padding: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginBottom: 16, padding: 8 },
  backLinkText:   { fontSize: 13 },

  shiftTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 4 },
  shiftSub:   { fontSize: 14, color: '#81C784', marginBottom: 32 },
  arcWrapper: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  timerText:  { fontSize: 36, fontWeight: '900', color: '#fff' },
  shiftHint:  { fontSize: 13, color: '#81C784', marginBottom: 16 },
  actRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, width: '100%' },
  actIcon:    { fontSize: 22 },
  actText:    { fontSize: 14, color: '#C8E6C9', flex: 1, lineHeight: 20 },
  skipBtn:    { marginTop: 24, padding: 12 },
  skipText:   { fontSize: 13, color: '#555' },

  doneTitle: { fontSize: 24, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 10, lineHeight: 32 },
  doneSub:   { fontSize: 15, color: '#81C784', textAlign: 'center', lineHeight: 24, marginBottom: 16 },
  xpBadge:   { backgroundColor: '#1B5E20', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: ACCENT },
  xpText:    { color: '#81C784', fontSize: 15, fontWeight: '800' },
});
