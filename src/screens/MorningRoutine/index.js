import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';
import SpeakButton from '../../components/SpeakButton';
import AnimatedGuide from '../../components/AnimatedGuide';

// ── Phase constants ───────────────────────────────────────────────────────────

const P = { HOME: 'home', NIGHT_PREP: 'night_prep', ROUTINE: 'routine', DONE: 'done', SETTINGS: 'settings' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function MorningRoutine({
  navigation }) {
  const colors = useColors();
  const {
    morningTasks, nightBeforeTasks, morningLogs,
    morningNotificationTime, setMorningTasks,
    setMorningNotificationTime, addMorningLog,
  } = useStore(s => ({
    morningTasks:            s.morningTasks || [],
    nightBeforeTasks:        s.nightBeforeTasks || [],
    morningLogs:             s.morningLogs || [],
    morningNotificationTime: s.morningNotificationTime || { hour: 7, minute: 0 },
    setMorningTasks:         s.setMorningTasks,
    setMorningNotificationTime: s.setMorningNotificationTime,
    addMorningLog:           s.addMorningLog,
  }));

  const [phase,          setPhase]          = useState(() => {
    const h = new Date().getHours();
    return h >= 18 ? P.NIGHT_PREP : P.HOME; // after 6 PM → night prep by default
  });
  const [nightChecked,   setNightChecked]   = useState([]);      // ids checked tonight
  const [activeTaskId,   setActiveTaskId]   = useState(null);    // currently timed task
  const [completedTasks, setCompletedTasks] = useState({});      // {id: actualSeconds}
  const [taskStartTs,    setTaskStartTs]    = useState(null);
  const [elapsedSec,     setElapsedSec]     = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notifTime,      setNotifTime]      = useState(() => {
    const d = new Date();
    d.setHours(morningNotificationTime.hour, morningNotificationTime.minute, 0, 0);
    return d;
  });

  const timerRef   = useRef(null);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const animRef    = useRef(null);

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (animRef.current) animRef.current.stop();
  }, []);

  // ── Timer logic ───────────────────────────────────────────────────────────

  function startTask(task) {
    const { speak } = require('../../components/SpeakButton');
    speak(`Starting ${task.label}. You have ${task.mins} minutes.`);
    clearInterval(timerRef.current);
    if (animRef.current) animRef.current.stop();
    setActiveTaskId(task.id);
    setTaskStartTs(Date.now());
    setElapsedSec(0);
    progressAnim.setValue(1);

    // Animate progress bar from full to empty over task.mins * 60 seconds
    animRef.current = Animated.timing(progressAnim, {
      toValue: 0,
      duration: task.mins * 60 * 1000,
      useNativeDriver: false,
    });
    animRef.current.start();

    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - Date.now()) / 1000)); // placeholder — updated below
    }, 1000);
    // Use a closure-safe version
    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }

  function completeTask(task) {
    clearInterval(timerRef.current);
    if (animRef.current) animRef.current.stop();
    const actualSec = taskStartTs ? Math.floor((Date.now() - taskStartTs) / 1000) : task.mins * 60;
    setCompletedTasks(prev => ({ ...prev, [task.id]: actualSec }));
    setActiveTaskId(null);
    setElapsedSec(0);
    setTaskStartTs(null);
  }

  function skipTask(task) {
    clearInterval(timerRef.current);
    if (animRef.current) animRef.current.stop();
    setCompletedTasks(prev => ({ ...prev, [task.id]: -1 })); // -1 = skipped
    setActiveTaskId(null);
    setElapsedSec(0);
    setTaskStartTs(null);
  }

  // ── Finish routine ────────────────────────────────────────────────────────

  function finishRoutine() {
    const taskTimes = {};
    let totalActual = 0;
    morningTasks.forEach(t => {
      const secs = completedTasks[t.id];
      if (secs !== undefined && secs >= 0) {
        taskTimes[t.id] = Math.ceil(secs / 60);
        totalActual += taskTimes[t.id];
      }
    });
    const completedIds = Object.keys(completedTasks).filter(id => completedTasks[id] !== -1);
    const allDone = completedIds.length === morningTasks.length;

    addMorningLog({
      date: new Date().toISOString(),
      completedTaskIds: completedIds,
      taskTimes,
      totalMinutes: totalActual,
      nightBeforeCompleted: nightChecked.length === nightBeforeTasks.length,
      allCompleted: allDone,
    });
    setPhase(P.DONE);
  }

  // ── Notification scheduling ───────────────────────────────────────────────

  async function scheduleNotification(h, m) {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const all = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of all) {
      if (n.content.data?.type === 'morning_routine') {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '☀️ Morning Routine',
        body: 'Time to start your morning — you\'ve got this.',
        sound: true,
        data: { type: 'morning_routine' },
      },
      trigger: { type: 'daily', hour: h, minute: m },
    });
  }

  // ── Stats helpers ─────────────────────────────────────────────────────────

  const today = new Date().toDateString();
  const todayLog = morningLogs.find(l => new Date(l.date).toDateString() === today);

  function getStreak() {
    const full = morningLogs.filter(l => l.allCompleted === true);
    if (full.length === 0) return 0;
    const sorted = [...full].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let check = new Date(); check.setHours(0,0,0,0);
    for (const l of sorted) {
      const d = new Date(l.date); d.setHours(0,0,0,0);
      const diff = Math.round((check - d) / 86400000);
      if (diff <= 1) { streak++; check = d; } else break;
    }
    return streak;
  }

  function avgTime() {
    const logs = morningLogs.filter(l => (l.totalMinutes ?? 0) > 0);
    if (!logs.length) return null;
    return Math.round(logs.reduce((s, l) => s + l.totalMinutes, 0) / logs.length);
  }

  function fmtSecs(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  const streak = getStreak();
  const totalMins = morningTasks.reduce((s, t) => s + t.mins, 0);
  const completedCount = Object.keys(completedTasks).filter(id => completedTasks[id] !== -1).length;
  const allDone = completedCount === morningTasks.length;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  // ── HOME ──────────────────────────────────────────────────────────────────
  if (phase === P.HOME) {
    const avg = avgTime();
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginBottom: 4 }}>
                <Text style={styles.backBtnText}>← Back</Text>
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.text }]}>Daily Routine</Text>
              <SpeakButton text="Our brains thrive on predictable structure, but building habits takes real effort when focus does not come easy. Every time we follow our daily routine, we reduce the mental energy spent on decisions and free up our brain for the things that truly matter. Routines are not boring — they are our superpower. Let's build ours together, one day at a time." style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
              <Text style={[styles.subtitle, { color: colors.text }]}>~{totalMins} min · {morningTasks.length} tasks</Text>
              <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
                <Text style={styles.goalText}>🎯 Goal: Complete the full routine every day</Text>
              </View>
              <AnimatedGuide placeholder="routine" label="Morning · Night prep" width={160} height={120} style={{ marginTop: 20, marginBottom: 8 }} />
            </View>
            <TouchableOpacity onPress={() => setPhase(P.SETTINGS)} style={styles.settingsBtn}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{streak > 0 ? `🔥 ${streak}` : '—'}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{morningLogs.filter(l => l.allCompleted).length}</Text>
              <Text style={styles.statLabel}>Full completions</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{avg ? `${avg}m` : '—'}</Text>
              <Text style={styles.statLabel}>Avg time</Text>
            </View>
          </View>

          {/* Today status */}
          {todayLog && (
            <View style={[styles.statusCard, todayLog.allCompleted ? styles.statusCardDone : styles.statusCardPartial]}>
              <Text style={styles.statusIcon}>{todayLog.allCompleted ? '✅' : '⏳'}</Text>
              <View>
                <Text style={styles.statusText}>
                  {todayLog.allCompleted ? 'Completed today!' : `${todayLog.completedTaskIds?.length ?? 0}/${morningTasks.length} tasks done`}
                </Text>
                <Text style={styles.statusTime}>{todayLog.totalMinutes} min total</Text>
              </View>
            </View>
          )}

          {/* Night before reminder */}
          <View style={styles.nightCard}>
            <Text style={styles.nightCardTitle}>🌙 Night before prep</Text>
            <Text style={styles.nightCardBody}>
              Preparing tonight reduces morning stress by 40%. Pack bag, pick clothes, check schedule.
            </Text>
            <TouchableOpacity style={styles.nightCardBtn} onPress={() => { setNightChecked([]); setPhase(P.NIGHT_PREP); }}>
              <Text style={styles.nightCardBtnText}>Start night prep →</Text>
            </TouchableOpacity>
          </View>

          {/* Task preview */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>TODAY'S ROUTINE</Text>
          {morningTasks.map(t => (
            <View key={t.id} style={styles.taskPreviewRow}>
              <Text style={styles.taskPreviewIcon}>{t.icon}</Text>
              <Text style={styles.taskPreviewLabel}>{t.label}</Text>
              <Text style={styles.taskPreviewTime}>{t.mins}m</Text>
            </View>
          ))}

          <View style={{ height: 16 }} />
        </ScrollView>

        <TouchableOpacity style={styles.startBtn} onPress={() => { setCompletedTasks({}); setActiveTaskId(null); setPhase(P.ROUTINE); }}>
          <Text style={styles.startBtnText}>☀️ Start Morning Routine</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── NIGHT PREP ────────────────────────────────────────────────────────────
  if (phase === P.NIGHT_PREP) {
    const allNightDone = nightChecked.length === nightBeforeTasks.length;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => setPhase(P.HOME)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>🌙 Night Before</Text>
          <Text style={[styles.subtitle, { color: colors.text }]}>~{nightBeforeTasks.reduce((s, t) => s + (t.mins || 0), 0)} min · {nightBeforeTasks.length} tasks</Text>

          <View style={{ marginTop: 16 }}>
            {nightBeforeTasks.map(t => {
              const done = nightChecked.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.nightTaskRow, done && styles.nightTaskRowDone]}
                  onPress={() => setNightChecked(prev =>
                    prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                  )}
                >
                  <View style={[styles.nightCheck, done && styles.nightCheckDone]}>
                    {done && <Text style={styles.nightCheckMark}>✓</Text>}
                  </View>
                  <Text style={styles.nightTaskIcon}>{t.icon}</Text>
                  <Text style={[styles.nightTaskLabel, done && styles.nightTaskLabelDone]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.nightProgress}>
            <View style={[styles.nightProgressFill, { width: `${(nightChecked.length / nightBeforeTasks.length) * 100}%` }]} />
          </View>
          <Text style={styles.nightProgressLabel}>{nightChecked.length} / {nightBeforeTasks.length} done</Text>

          <TouchableOpacity
            style={[styles.startBtn, !allNightDone && styles.startBtnPartial]}
            onPress={() => setPhase(P.HOME)}
          >
            <Text style={styles.startBtnText}>
              {allNightDone ? '🎉 All set for tomorrow!' : `Done for now (${nightChecked.length}/${nightBeforeTasks.length})`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── ROUTINE ───────────────────────────────────────────────────────────────
  if (phase === P.ROUTINE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.routineHeader}>
          <TouchableOpacity onPress={() => setPhase(P.HOME)}>
            <Text style={styles.backBtnText}>← Exit</Text>
          </TouchableOpacity>
          <Text style={styles.routineProgress}>{completedCount} / {morningTasks.length} done</Text>
          <Text style={styles.routineTotal}>~{totalMins}m total</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.routineProgressBg}>
          <View style={[styles.routineProgressFill, { width: `${(completedCount / morningTasks.length) * 100}%` }]} />
        </View>

        <ScrollView contentContainerStyle={styles.routineContent}>
          {morningTasks.map((task, i) => {
            const isDone    = completedTasks[task.id] !== undefined;
            const isSkipped = completedTasks[task.id] === -1;
            const isActive  = activeTaskId === task.id;
            const actualSec = completedTasks[task.id] > 0 ? completedTasks[task.id] : null;
            const overBy    = actualSec ? Math.max(0, actualSec - task.mins * 60) : 0;

            return (
              <View key={task.id} style={[styles.taskCard, isDone && styles.taskCardDone, isActive && styles.taskCardActive]}>
                {/* Task row */}
                <View style={styles.taskRow}>
                  <View style={[styles.taskNum, isDone && styles.taskNumDone, isActive && styles.taskNumActive]}>
                    <Text style={styles.taskNumText}>{isDone ? (isSkipped ? '−' : '✓') : (i + 1)}</Text>
                  </View>
                  <Text style={styles.taskIcon}>{task.icon}</Text>
                  <View style={styles.taskInfo}>
                    <Text style={[styles.taskLabel, isDone && styles.taskLabelDone]}>{task.label}</Text>
                    <Text style={styles.taskEst}>{task.mins} min estimated</Text>
                    {actualSec && !isSkipped && (
                      <Text style={[styles.taskActual, overBy > 0 && styles.taskActualOver]}>
                        Actual: {Math.ceil(actualSec / 60)}m {overBy > 0 ? `(+${Math.ceil(overBy / 60)}m over)` : '✓'}
                      </Text>
                    )}
                  </View>
                  {!isDone && !isActive && (
                    <TouchableOpacity style={styles.startTaskBtn} onPress={() => startTask(task)}>
                      <Text style={styles.startTaskBtnText}>Start</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Active timer */}
                {isActive && (
                  <View style={styles.timerBlock}>
                    <View style={styles.timerBarBg}>
                      <Animated.View style={[styles.timerBarFill, {
                        width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                      }]} />
                    </View>
                    <View style={styles.timerRow}>
                      <Text style={styles.timerElapsed}>{fmtSecs(elapsedSec)}</Text>
                      <Text style={styles.timerLimit}>/ {task.mins}:00</Text>
                    </View>
                    <View style={styles.timerBtns}>
                      <TouchableOpacity style={styles.doneTaskBtn} onPress={() => completeTask(task)}>
                        <Text style={styles.doneTaskBtnText}>Done ✓</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.skipTaskBtn} onPress={() => skipTask(task)}>
                        <Text style={styles.skipTaskBtnText}>Skip</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
          <View style={{ height: 24 }} />
        </ScrollView>

        {completedCount > 0 && (
          <TouchableOpacity
            style={[styles.startBtn, !allDone && styles.startBtnPartial]}
            onPress={finishRoutine}
          >
            <Text style={styles.startBtnText}>
              {allDone ? 'Finish routine ✓' : `Finish (${completedCount}/${morningTasks.length} done)`}
            </Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ── DONE ──────────────────────────────────────────────────────────────────
  if (phase === P.DONE) {
    const log = morningLogs[morningLogs.length - 1];
    const newStreak = getStreak();
    const estTotal = morningTasks.reduce((s, t) => s + t.mins, 0);
    const actualTotal = log?.totalMinutes || 0;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.doneEmoji}>{log?.allCompleted ? '🌅' : '⏳'}</Text>
          <Text style={styles.doneTitle}>{log?.allCompleted ? 'Routine complete!' : 'Partial completion'}</Text>

          {newStreak > 1 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🔥 {newStreak}-day streak</Text>
            </View>
          )}

          {/* Time summary */}
          <View style={styles.timeSummaryCard}>
            <Text style={styles.timeSummaryTitle}>Time breakdown</Text>
            {morningTasks.map(t => {
              const actual = log?.taskTimes?.[t.id];
              if (!actual) return null;
              const over = actual - t.mins;
              return (
                <View key={t.id} style={styles.timeSummaryRow}>
                  <Text style={styles.timeSummaryIcon}>{t.icon}</Text>
                  <Text style={styles.timeSummaryLabel}>{t.label}</Text>
                  <Text style={[styles.timeSummaryActual, over > 0 && { color: '#FF9800' }]}>
                    {actual}m {over > 0 ? `(+${over}m)` : over < 0 ? `(${over}m)` : '✓'}
                  </Text>
                </View>
              );
            })}
            <View style={styles.timeSummaryTotalRow}>
              <Text style={styles.timeSummaryTotalLabel}>Total</Text>
              <Text style={styles.timeSummaryTotalVal}>{actualTotal}m vs {estTotal}m estimated</Text>
            </View>
          </View>

          <View style={styles.connectionCard}>
            <Text style={styles.connectionText}>
              💡 Each completed routine makes the next one easier. Your brain is building the habit pathway.
            </Text>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>

        <TouchableOpacity style={styles.startBtn} onPress={() => { setPhase(P.HOME); setCompletedTasks({}); }}>
          <Text style={styles.startBtnText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── SETTINGS ─────────────────────────────────────────────────────────────
  if (phase === P.SETTINGS) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setPhase(P.HOME)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>MORNING ALERT</Text>
          <TouchableOpacity style={styles.notifRow} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.notifLabel}>☀️ Wake-up reminder</Text>
            <Text style={styles.notifTime}>
              {notifTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={notifTime}
              mode="time"
              display="spinner"
              onChange={async (_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) {
                  setNotifTime(date);
                  setMorningNotificationTime(date.getHours(), date.getMinutes());
                  await scheduleNotification(date.getHours(), date.getMinutes());
                }
              }}
            />
          )}

          <Text style={[styles.sectionLabel, { color: colors.text }]}>TASK DURATIONS</Text>
          {morningTasks.map(task => (
            <View key={task.id} style={styles.durationRow}>
              <Text style={styles.durationIcon}>{task.icon}</Text>
              <Text style={styles.durationLabel}>{task.label}</Text>
              <View style={styles.durationControls}>
                <TouchableOpacity
                  style={styles.durationBtn}
                  onPress={() => setMorningTasks(morningTasks.map(t => t.id === task.id ? { ...t, mins: Math.max(1, t.mins - 1) } : t))}
                >
                  <Text style={styles.durationBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.durationVal}>{task.mins}m</Text>
                <TouchableOpacity
                  style={styles.durationBtn}
                  onPress={() => setMorningTasks(morningTasks.map(t => t.id === task.id ? { ...t, mins: t.mins + 1 } : t))}
                >
                  <Text style={styles.durationBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: 24, paddingBottom: 16 },
  backBtn:   { marginBottom: 12 },
  backBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:     { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle:  { fontSize: 13, color: colors.textLight, marginTop: 2 },
  settingsBtn: { padding: 8 },
  settingsIcon:{ fontSize: 20 },
  headlineRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  goalCard: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginTop: 6, marginBottom: 2, borderWidth: 1, borderColor: colors.primary + '40' },
  goalText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  sectionLabel:{ fontSize: 11, fontWeight: '800', color: colors.textLight, letterSpacing: 1, marginBottom: 8, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox:  { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue:{ fontSize: 18, fontWeight: '900', color: colors.text },
  statLabel:{ fontSize: 11, color: colors.textLight, marginTop: 2, textAlign: 'center' },

  statusCard:        { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1 },
  statusCardDone:    { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' },
  statusCardPartial: { backgroundColor: '#FFF3E0', borderColor: '#FFCC80' },
  statusIcon: { fontSize: 24 },
  statusText: { fontSize: 15, fontWeight: '700', color: colors.text },
  statusTime: { fontSize: 12, color: colors.textLight, marginTop: 2 },

  nightCard:       { backgroundColor: '#EDE7F6', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#B39DDB' },
  nightCardTitle:  { fontSize: 15, fontWeight: '800', color: '#4527A0', marginBottom: 4 },
  nightCardBody:   { fontSize: 13, color: '#5E35B1', lineHeight: 18, marginBottom: 12 },
  nightCardBtn:    { backgroundColor: '#7E57C2', borderRadius: 10, padding: 10, alignItems: 'center' },
  nightCardBtnText:{ fontSize: 14, color: '#fff', fontWeight: '700' },

  taskPreviewRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  taskPreviewIcon: { fontSize: 18, width: 32 },
  taskPreviewLabel:{ flex: 1, fontSize: 14, color: colors.text },
  taskPreviewTime: { fontSize: 13, color: colors.primary, fontWeight: '700' },

  startBtn:        { backgroundColor: colors.primary, margin: 20, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  startBtnPartial: { backgroundColor: '#FF9800' },
  startBtnText:    { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Night prep
  nightTaskRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 8, gap: 12 },
  nightTaskRowDone: { backgroundColor: '#F1F8E9', borderColor: '#A5D6A7' },
  nightCheck:       { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  nightCheckDone:   { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  nightCheckMark:   { color: '#fff', fontSize: 14, fontWeight: '800' },
  nightTaskIcon:    { fontSize: 20 },
  nightTaskLabel:   { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  nightTaskLabelDone: { textDecorationLine: 'line-through', color: colors.textLight },
  nightProgress:    { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginVertical: 12, overflow: 'hidden' },
  nightProgressFill:{ height: 4, backgroundColor: '#4CAF50', borderRadius: 2 },
  nightProgressLabel:{ fontSize: 12, color: colors.textLight, textAlign: 'center', marginBottom: 16 },

  // Routine
  routineHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  routineProgress:    { fontSize: 14, fontWeight: '700', color: colors.text },
  routineTotal:       { fontSize: 13, color: colors.textLight },
  routineProgressBg:  { height: 3, backgroundColor: '#F0F0F0' },
  routineProgressFill:{ height: 3, backgroundColor: colors.primary },
  routineContent:     { padding: 16 },

  taskCard:       { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EBEBEB', padding: 14, marginBottom: 10 },
  taskCardDone:   { opacity: 0.6 },
  taskCardActive: { borderColor: colors.primary, borderWidth: 2 },
  taskRow:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  taskNum:        { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  taskNumDone:    { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  taskNumActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  taskNumText:    { fontSize: 12, fontWeight: '800', color: '#fff' },
  taskIcon:       { fontSize: 20 },
  taskInfo:       { flex: 1 },
  taskLabel:      { fontSize: 14, fontWeight: '700', color: colors.text },
  taskLabelDone:  { textDecorationLine: 'line-through', color: colors.textLight },
  taskEst:        { fontSize: 11, color: colors.textLight },
  taskActual:     { fontSize: 11, color: '#4CAF50', fontWeight: '600', marginTop: 1 },
  taskActualOver: { color: '#FF9800' },
  startTaskBtn:   { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  startTaskBtnText:{ fontSize: 13, color: '#fff', fontWeight: '700' },

  timerBlock:   { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  timerBarBg:   { height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  timerBarFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  timerRow:     { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  timerElapsed: { fontSize: 28, fontWeight: '900', color: colors.text },
  timerLimit:   { fontSize: 16, color: colors.textLight },
  timerBtns:    { flexDirection: 'row', gap: 10 },
  doneTaskBtn:  { flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 12, alignItems: 'center' },
  doneTaskBtnText: { fontSize: 15, color: '#fff', fontWeight: '700' },
  skipTaskBtn:  { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, paddingHorizontal: 18, alignItems: 'center' },
  skipTaskBtnText: { fontSize: 14, color: colors.textLight },

  // Done
  doneEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 12 },
  streakBadge: { backgroundColor: '#FFF3E0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'center', marginBottom: 16, borderWidth: 1, borderColor: '#FFB74D' },
  streakBadgeText: { fontSize: 15, fontWeight: '800', color: '#E65100' },
  timeSummaryCard:  { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 14 },
  timeSummaryTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 12 },
  timeSummaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  timeSummaryIcon:  { fontSize: 16 },
  timeSummaryLabel: { flex: 1, fontSize: 13, color: colors.text },
  timeSummaryActual:{ fontSize: 13, fontWeight: '700', color: '#4CAF50' },
  timeSummaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  timeSummaryTotalLabel: { fontSize: 14, fontWeight: '800', color: colors.text },
  timeSummaryTotalVal:   { fontSize: 14, color: colors.primary, fontWeight: '700' },
  connectionCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.primary + '40' },
  connectionText: { fontSize: 14, color: colors.text, lineHeight: 22 },

  // Settings
  notifRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 16 },
  notifLabel:   { fontSize: 14, fontWeight: '600', color: colors.text },
  notifTime:    { fontSize: 14, fontWeight: '700', color: colors.primary },
  durationRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 8, gap: 10 },
  durationIcon: { fontSize: 20 },
  durationLabel:{ flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
  durationControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  durationBtn:  { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  durationBtnText: { fontSize: 18, color: colors.primary, fontWeight: '800' },
  durationVal:  { fontSize: 15, fontWeight: '700', color: colors.text, minWidth: 30, textAlign: 'center' },
});
