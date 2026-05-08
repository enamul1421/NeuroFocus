import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { scheduleStepNotification, suggestStepDates } from './utils';
import * as Notifications from 'expo-notifications';

const TEMPLATE_GROUPS = [
  {
    label: '📚 Academics',
    keys: ['test', 'quiz', 'essay', 'lab', 'presentation', 'group', 'sciencefair', 'reading', 'other'],
  },
  {
    label: '🌟 Life & Activities',
    keys: ['appointment', 'chore', 'social', 'project', 'sports', 'volunteer', 'other'],
  },
];

const TASK_TEMPLATES = {
  // ── School ──────────────────────────────────────────────────────────────
  test:         { icon: '📝', label: 'Test / Exam',           defaultDays: 7,  totalHours: 7,  steps: [{ name: "Find out what's covered", pct: 5 }, { name: 'Gather notes and materials', pct: 10 }, { name: 'First full review pass', pct: 25 }, { name: 'Active recall practice', pct: 35 }, { name: 'Go back to weak areas', pct: 20 }, { name: 'Final review + good sleep', pct: 5 }] },
  quiz:         { icon: '✏️', label: 'Quiz',                  defaultDays: 3,  totalHours: 2,  steps: [{ name: 'Check what the quiz covers', pct: 10 }, { name: 'Quick review of notes', pct: 40 }, { name: 'Practice key concepts', pct: 35 }, { name: 'Final check the night before', pct: 15 }] },
  essay:        { icon: '📄', label: 'Essay / Research Paper', defaultDays: 14, totalHours: 10, steps: [{ name: 'Read the prompt carefully', pct: 5 }, { name: 'Research and gather sources', pct: 25 }, { name: 'Create an outline', pct: 10 }, { name: 'Write the first draft', pct: 30 }, { name: 'Revise and improve', pct: 20 }, { name: 'Proofread and format', pct: 10 }] },
  lab:          { icon: '🔬', label: 'Lab Report',            defaultDays: 10, totalHours: 6,  steps: [{ name: 'Review the experiment', pct: 15 }, { name: 'Analyze data and results', pct: 25 }, { name: 'Write introduction and methods', pct: 20 }, { name: 'Write results section', pct: 20 }, { name: 'Write discussion and conclusion', pct: 20 }] },
  presentation: { icon: '🎤', label: 'Presentation',          defaultDays: 10, totalHours: 8,  steps: [{ name: 'Research the topic', pct: 25 }, { name: 'Create outline and structure', pct: 15 }, { name: 'Build slides or visual aids', pct: 25 }, { name: "Write what you'll say", pct: 15 }, { name: 'Practice out loud twice', pct: 15 }, { name: 'Time yourself and adjust', pct: 5 }] },
  group:        { icon: '👥', label: 'Group Project',          defaultDays: 14, totalHours: 12, steps: [{ name: 'Meet and divide roles', pct: 10 }, { name: 'Complete your research', pct: 30 }, { name: 'Build your section', pct: 30 }, { name: 'Combine with group', pct: 15 }, { name: 'Polish and rehearse', pct: 15 }] },
  sciencefair:  { icon: '🧪', label: 'Science Fair',           defaultDays: 28, totalHours: 20, steps: [{ name: 'Choose topic and hypothesis', pct: 10 }, { name: 'Background research', pct: 20 }, { name: 'Design and gather materials', pct: 10 }, { name: 'Conduct experiment (2+ trials)', pct: 25 }, { name: 'Analyze data and write report', pct: 20 }, { name: 'Build display board', pct: 10 }, { name: 'Practice presentation', pct: 5 }] },
  reading:      { icon: '📚', label: 'Reading Assignment',     defaultDays: 5,  totalHours: 3,  steps: [{ name: 'Read assigned pages', pct: 60 }, { name: 'Take notes on key points', pct: 20 }, { name: 'Review for discussion', pct: 20 }] },
  // ── Life & Activities ────────────────────────────────────────────────────
  appointment:  { icon: '🏥', label: 'Doctor / Appointment',  defaultDays: 7,  totalHours: 1,  steps: [{ name: 'Confirm date, time, and location', pct: 10 }, { name: 'Write down questions to ask', pct: 20 }, { name: 'Arrange ride or transport', pct: 20 }, { name: 'Attend the appointment', pct: 30 }, { name: 'Follow up on any next steps', pct: 20 }] },
  chore:        { icon: '🧹', label: 'Chore / Home Task',      defaultDays: 3,  totalHours: 2,  steps: [{ name: 'Gather supplies needed', pct: 10 }, { name: 'Do the first part', pct: 35 }, { name: 'Do the second part', pct: 35 }, { name: 'Final check and put things away', pct: 20 }] },
  social:       { icon: '🎉', label: 'Event / Social Plan',    defaultDays: 5,  totalHours: 2,  steps: [{ name: 'RSVP and confirm details', pct: 15 }, { name: 'Buy or prepare gift / what to bring', pct: 30 }, { name: 'Arrange transport', pct: 15 }, { name: 'Attend the event', pct: 30 }, { name: 'Send thank-you or follow up', pct: 10 }] },
  project:      { icon: '🎨', label: 'Personal Project',       defaultDays: 14, totalHours: 6,  steps: [{ name: 'Define what "done" looks like', pct: 10 }, { name: 'Gather materials or tools', pct: 15 }, { name: 'Work session 1', pct: 25 }, { name: 'Work session 2', pct: 25 }, { name: 'Work session 3', pct: 20 }, { name: 'Finish and share', pct: 5 }] },
  sports:       { icon: '⚽', label: 'Sports / Extracurricular', defaultDays: 2, totalHours: 1,  steps: [{ name: 'Check schedule and confirm time', pct: 15 }, { name: 'Pack gear and uniform', pct: 25 }, { name: 'Arrange ride', pct: 20 }, { name: 'Attend practice or game', pct: 30 }, { name: 'Rest and recovery', pct: 10 }] },
  volunteer:    { icon: '🤝', label: 'Volunteer / Service',    defaultDays: 7,  totalHours: 3,  steps: [{ name: 'Confirm shift time and location', pct: 10 }, { name: 'Prepare what to bring', pct: 15 }, { name: 'Arrange transport', pct: 15 }, { name: 'Complete the volunteer session', pct: 40 }, { name: 'Log hours and write reflection', pct: 20 }] },
  other:        { icon: '📋', label: 'Something else',         defaultDays: 7,  totalHours: 5,  steps: [{ name: 'Step 1', pct: 33 }, { name: 'Step 2', pct: 33 }, { name: 'Step 3', pct: 34 }] },
};

const SCREEN = { TYPE: 'type', TITLE: 'title', SCHEDULE: 'schedule' };

function calcDuration(pct, totalHours) {
  return Math.max(Math.round((pct / 100) * totalHours * 60), 5);
}

export function fmtMins(mins) {
  const n = Number(mins) || 0;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function makeSession(scheduledDate, durationMin) {
  return { id: `sess_${Date.now()}_${Math.random()}`, scheduledDate, durationMin, notificationId: null };
}

export default function AddTask({ navigation }) {
  const { addPlannerTask, plannerTasks } = useStore(s => ({
    addPlannerTask: s.addPlannerTask,
    plannerTasks: s.plannerTasks || [],
  }));

  const [screen, setScreen] = useState(SCREEN.TYPE);
  const [selectedType, setSelectedType] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d;
  });
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [steps, setSteps] = useState([]);
  const [totalHours, setTotalHours] = useState(7);
  const [totalHoursText, setTotalHoursText] = useState('7');

  // Wizard state
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [openPicker, setOpenPicker] = useState(null); // { sessIdx, mode: 'date'|'time' }
  const [tempDate, setTempDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  // ── Template loading ─────────────────────────────────────────────────────

  function loadTemplate(typeKey) {
    const template = TASK_TEMPLATES[typeKey];
    setSelectedType(typeKey);
    setTotalHours(template.totalHours);
    setTotalHoursText(String(template.totalHours));
    const durations = template.steps.map(s => calcDuration(s.pct, template.totalHours));
    const suggestedDates = suggestStepDates(deadline.toISOString(), durations, plannerTasks);
    const built = template.steps.map((s, i) => {
      const dur = calcDuration(s.pct, template.totalHours);
      return {
        id: `step_${Date.now()}_${i}`,
        name: s.name,
        pct: s.pct,
        durationMin: dur,
        sessions: [makeSession(suggestedDates[i], dur)],
        completed: false,
      };
    });
    setSteps(built);
    setScreen(SCREEN.TITLE);
  }

  function goToSchedule() {
    setSteps(prev => {
      const durations = prev.map(s => calcDuration(s.pct, totalHours));
      // Recalculate conflict-free dates with final durations
      const newDates = suggestStepDates(deadline.toISOString(), durations, plannerTasks);
      return prev.map((s, i) => ({
        ...s,
        durationMin: durations[i],
        sessions: s.sessions.map((sess, si) =>
          si === 0 ? { ...sess, durationMin: durations[i], scheduledDate: newDates[i] } : sess
        ),
      }));
    });
    setCurrentStepIdx(0);
    setOpenPicker(null);
    setScreen(SCREEN.SCHEDULE);
  }

  // ── Step-level helpers ───────────────────────────────────────────────────

  function updateStepName(idx, name) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, name } : s));
  }

  function updateStepDuration(idx, value) {
    const n = parseInt(value, 10);
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, durationMin: isNaN(n) ? s.durationMin : Math.max(n, 1) } : s));
  }

  function addStepAfterCurrent() {
    const insertAt = currentStepIdx + 1;
    const newStep = {
      id: `step_${Date.now()}_new`,
      name: 'New step',
      pct: 10,
      durationMin: 30,
      sessions: [makeSession(new Date().toISOString(), 30)],
      completed: false,
    };
    setSteps(prev => { const next = [...prev]; next.splice(insertAt, 0, newStep); return next; });
    setCurrentStepIdx(insertAt);
    setOpenPicker(null);
  }

  function deleteCurrentStep() {
    if (steps.length === 1) return;
    setSteps(prev => prev.filter((_, i) => i !== currentStepIdx));
    setCurrentStepIdx(prev => Math.min(prev, steps.length - 2));
    setOpenPicker(null);
  }

  // ── Session-level helpers ────────────────────────────────────────────────

  function addSession(stepIdx) {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIdx) return s;
      return { ...s, sessions: [...s.sessions, makeSession(new Date().toISOString(), 30)] };
    }));
  }

  function deleteSession(stepIdx, sessIdx) {
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIdx) return s;
      return { ...s, sessions: s.sessions.filter((_, si) => si !== sessIdx) };
    }));
    setOpenPicker(null);
  }

  function getConflicts(stepIdx, sessIdx, proposedISO, durationMin) {
    const start = new Date(proposedISO);
    const end = new Date(start.getTime() + (durationMin || 30) * 60000);
    const list = [];
    for (const task of plannerTasks) {
      for (const step of task.steps) {
        for (const sess of (step.sessions || [])) {
          if (!sess.scheduledDate) continue;
          const s2 = new Date(sess.scheduledDate);
          const e2 = new Date(s2.getTime() + (sess.durationMin || 30) * 60000);
          if (start < e2 && s2 < end) list.push(`"${task.title}": ${step.name}`);
        }
      }
    }
    steps.forEach((step, si) => {
      step.sessions.forEach((sess, ssi) => {
        if (si === stepIdx && ssi === sessIdx) return;
        const s2 = new Date(sess.scheduledDate);
        const e2 = new Date(s2.getTime() + (sess.durationMin || 30) * 60000);
        if (start < e2 && s2 < end) list.push(`This task — ${step.name} (Session ${ssi + 1})`);
      });
    });
    return list;
  }

  function trySetSessionDate(stepIdx, sessIdx, date) {
    const existing = new Date(steps[stepIdx].sessions[sessIdx].scheduledDate);
    const newDate = new Date(date);
    newDate.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
    const newISO = newDate.toISOString();
    const c = getConflicts(stepIdx, sessIdx, newISO, steps[stepIdx].sessions[sessIdx].durationMin);
    if (c.length > 0) {
      Alert.alert('⚠️ Time overlap', `This slot is already taken by:\n\n${c.join('\n')}\n\nPick a different date.`);
      return;
    }
    setTempDate(newDate);
    setSteps(prev => prev.map((s, i) => i !== stepIdx ? s : {
      ...s, sessions: s.sessions.map((sess, si) => si !== sessIdx ? sess : { ...sess, scheduledDate: newISO }),
    }));
  }

  function trySetSessionTime(stepIdx, sessIdx, date) {
    const existing = new Date(steps[stepIdx].sessions[sessIdx].scheduledDate);
    existing.setHours(date.getHours(), date.getMinutes(), 0, 0);
    const newISO = existing.toISOString();
    const c = getConflicts(stepIdx, sessIdx, newISO, steps[stepIdx].sessions[sessIdx].durationMin);
    if (c.length > 0) {
      Alert.alert('⚠️ Time overlap', `This slot is already taken by:\n\n${c.join('\n')}\n\nPick a different time.`);
      return;
    }
    setTempDate(new Date(newISO));
    setSteps(prev => prev.map((s, i) => i !== stepIdx ? s : {
      ...s, sessions: s.sessions.map((sess, si) => si !== sessIdx ? sess : { ...sess, scheduledDate: newISO }),
    }));
  }

  function updateSessionDuration(stepIdx, sessIdx, value) {
    const n = parseInt(value, 10);
    setSteps(prev => prev.map((s, i) => {
      if (i !== stepIdx) return s;
      const sessions = s.sessions.map((sess, si) =>
        si !== sessIdx ? sess : { ...sess, durationMin: isNaN(n) ? sess.durationMin : Math.max(n, 1) }
      );
      return { ...s, sessions };
    }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function saveTask() {
    // Block save if any session conflicts with existing tasks
    for (let si = 0; si < steps.length; si++) {
      for (let ssi = 0; ssi < steps[si].sessions.length; ssi++) {
        const sess = steps[si].sessions[ssi];
        const c = getConflicts(si, ssi, sess.scheduledDate, sess.durationMin);
        if (c.length > 0) {
          Alert.alert('⚠️ Conflicts found', `"${steps[si].name}" Session ${ssi + 1} overlaps with:\n\n${c.join('\n')}\n\nFix all conflicts before saving.`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const canNotify = status === 'granted';
      const stepsWithNotifs = await Promise.all(steps.map(async step => {
        const sessions = await Promise.all(step.sessions.map(async sess => {
          let notifId = null;
          if (canNotify && sess.scheduledDate) {
            notifId = await scheduleStepNotification({ scheduledDate: sess.scheduledDate, name: step.name }, taskTitle);
          }
          return { ...sess, notificationId: notifId };
        }));
        return { ...step, sessions };
      }));
      addPlannerTask({
        id: `task_${Date.now()}`,
        title: taskTitle.trim(),
        type: selectedType,
        deadline: deadline.toISOString(),
        addedDate: new Date().toISOString(),
        steps: stepsWithNotifs,
        weeklyGrade: null,
        status: 'active',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error saving task', e.message);
    } finally {
      setSaving(false);
    }
  }

  const template = selectedType ? TASK_TEMPLATES[selectedType] : null;

  // ── TYPE PICKER ──────────────────────────────────────────────────────────
  if (screen === SCREEN.TYPE) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headline}>What type of task?</Text>
          <Text style={styles.body}>Pick the closest match to get the right step sequence.</Text>
          {TEMPLATE_GROUPS.map(group => (
            <View key={group.label} style={styles.groupBlock}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <View style={styles.typeGrid}>
                {group.keys.map(key => {
                  const t = TASK_TEMPLATES[key];
                  return (
                    <TouchableOpacity key={key} style={styles.typeCard} onPress={() => loadTemplate(key)}>
                      <Text style={styles.typeIcon}>{t.icon}</Text>
                      <Text style={styles.typeLabel}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TITLE ────────────────────────────────────────────────────────────────
  if (screen === SCREEN.TITLE) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => setScreen(SCREEN.TYPE)} style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.stepTag}>{template.icon} {template.label}</Text>
            <Text style={styles.headline}>Name this task</Text>

            <Text style={styles.label}>Task name</Text>
            <TextInput
              style={styles.textInput}
              placeholder='e.g. "Bio exam — Ch. 5 to 8"'
              placeholderTextColor={colors.textLight}
              value={taskTitle}
              onChangeText={setTaskTitle}
              autoFocus
            />

            <Text style={styles.label}>Due date</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDeadlinePicker(true)}>
              <Text style={styles.dateButtonText}>
                {deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
              <Text style={styles.dateButtonEdit}>Change</Text>
            </TouchableOpacity>
            {showDeadlinePicker && (
              <DateTimePicker
                value={deadline}
                mode="date"
                display="spinner"
                minimumDate={new Date()}
                onChange={(_, date) => {
                  setShowDeadlinePicker(Platform.OS === 'ios');
                  if (date) {
                    setDeadline(date);
                    setSteps(prev => {
                      const newDates = suggestStepDates(date.toISOString(), prev.map(s => s.durationMin), plannerTasks);
                      return prev.map((s, i) => ({
                        ...s,
                        sessions: s.sessions.map((sess, si) => si === 0 ? { ...sess, scheduledDate: newDates[i] } : sess),
                      }));
                    });
                  }
                }}
              />
            )}

            <Text style={styles.label}>Estimated duration needed</Text>
            <View style={styles.hoursRow}>
              <TextInput
                style={styles.hoursInput}
                value={totalHoursText}
                onChangeText={v => {
                  setTotalHoursText(v);
                  const n = parseFloat(v);
                  if (!isNaN(n) && n > 0) setTotalHours(n);
                }}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.hoursUnit}>hours</Text>
            </View>

            <View style={styles.stepDurationPreview}>
              <Text style={styles.stepDurationPreviewTitle}>Suggested time per step</Text>
              {steps.map(s => (
                <View key={s.id} style={styles.stepDurationRow}>
                  <Text style={styles.stepDurationName}>{s.name}</Text>
                  <Text style={styles.stepDurationBadge}>~{fmtMins(calcDuration(s.pct, totalHours))}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, !taskTitle.trim() && styles.buttonDisabled]}
            onPress={goToSchedule}
            disabled={!taskTitle.trim()}
          >
            <Text style={styles.buttonText}>Next: Schedule steps →</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── SCHEDULE WIZARD ──────────────────────────────────────────────────────
  if (screen === SCREEN.SCHEDULE) {
    const current = steps[currentStepIdx];
    const isLast = currentStepIdx === steps.length - 1;
    const scheduledBefore = steps.slice(0, currentStepIdx);
    const scheduledAfter = steps.slice(currentStepIdx + 1);
    const prevStep = currentStepIdx > 0 ? steps[currentStepIdx - 1] : null;
    const minDate = prevStep ? new Date(prevStep.sessions[0].scheduledDate) : new Date();

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.taskHeaderRow}>
            <Text style={styles.taskTitleHeader} numberOfLines={1}>{taskTitle}</Text>
            <Text style={styles.taskDueInline}>
              Due {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
          <Text style={styles.stepTag}>Step {currentStepIdx + 1} of {steps.length}</Text>

          {/* Already scheduled steps */}
          {scheduledBefore.length > 0 && (
            <View style={styles.prevStepsCard}>
              <Text style={styles.prevStepsTitle}>✓ Already scheduled</Text>
              {scheduledBefore.map(s => (
                <View key={s.id} style={styles.prevStepRow}>
                  <View style={styles.prevStepDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.prevStepName}>{s.name}</Text>
                    {s.sessions.map((sess, si) => {
                      const d = new Date(sess.scheduledDate);
                      const end = new Date(d.getTime() + sess.durationMin * 60000);
                      const ht = d.getHours() !== 0 || d.getMinutes() !== 0;
                      return (
                        <Text key={sess.id} style={styles.prevStepDate}>
                          {s.sessions.length > 1 ? `Session ${si + 1}: ` : ''}
                          {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          {ht ? ` · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                          {` · ${fmtMins(sess.durationMin)}`}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Current step — editable name + total duration */}
          <Text style={styles.headline}>When will you do this?</Text>
          <View style={styles.stepPreviewCard}>
            <TextInput
              style={styles.stepNameInput}
              value={current?.name}
              onChangeText={t => updateStepName(currentStepIdx, t)}
              placeholder="Step name"
              placeholderTextColor={colors.textLight}
            />
            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>⏱ Total:</Text>
              <TextInput
                style={styles.durationInput}
                value={String(current?.durationMin ?? '')}
                onChangeText={v => updateStepDuration(currentStepIdx, v)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <Text style={styles.durationUnit}>min</Text>
              {current?.durationMin > 0 && (
                <Text style={styles.durationFormatted}>({fmtMins(current.durationMin)})</Text>
              )}
            </View>
          </View>

          {/* Sessions */}
          {current?.sessions.map((sess, sessIdx) => {
            const sessDate = new Date(sess.scheduledDate);
            const sessEnd = new Date(sessDate.getTime() + (Number(sess.durationMin) || 0) * 60000);
            const hasTime = sessDate.getHours() !== 0 || sessDate.getMinutes() !== 0;
            const isOpenDate = openPicker?.sessIdx === sessIdx && openPicker?.mode === 'date';
            const isOpenTime = openPicker?.sessIdx === sessIdx && openPicker?.mode === 'time';

            return (
              <View key={sess.id} style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionLabel}>
                    {current.sessions.length > 1 ? `Session ${sessIdx + 1}` : 'Schedule'}
                  </Text>
                  {current.sessions.length > 1 && (
                    <TouchableOpacity onPress={() => deleteSession(currentStepIdx, sessIdx)}>
                      <Text style={styles.sessionDeleteText}>✕ Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Per-session duration */}
                <View style={styles.sessDurationRow}>
                  <Text style={styles.sessDurationLabel}>⏱</Text>
                  <TextInput
                    style={styles.sessDurationInput}
                    value={String(sess.durationMin)}
                    onChangeText={v => updateSessionDuration(currentStepIdx, sessIdx, v)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <Text style={styles.sessDurationUnit}>min</Text>
                  {hasTime && (
                    <Text style={styles.sessTimeBlock}>
                      {sessDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                      {' – '}
                      {sessEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  )}
                </View>

                {/* Date */}
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => { setTempDate(sessDate); setOpenPicker(isOpenDate ? null : { sessIdx, mode: 'date' }); }}
                >
                  <Text style={styles.pickerRowLabel}>📅</Text>
                  <Text style={styles.pickerRowValue}>
                    {sessDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </Text>
                  <Text style={styles.pickerRowAction}>{isOpenDate ? 'Done' : 'Change'}</Text>
                </TouchableOpacity>
                {isOpenDate && (
                  <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="spinner"
                    minimumDate={minDate}
                    maximumDate={deadline}
                    onChange={(_, date) => {
                      if (Platform.OS !== 'ios') setOpenPicker(null);
                      if (date) trySetSessionDate(currentStepIdx, sessIdx, date);
                    }}
                  />
                )}

                {/* Time */}
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => { setTempDate(sessDate); setOpenPicker(isOpenTime ? null : { sessIdx, mode: 'time' }); }}
                >
                  <Text style={styles.pickerRowLabel}>🕓</Text>
                  <Text style={styles.pickerRowValue}>
                    {sessDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                  </Text>
                  <Text style={styles.pickerRowAction}>{isOpenTime ? 'Done' : 'Change'}</Text>
                </TouchableOpacity>
                {isOpenTime && (
                  <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display="spinner"
                    onChange={(_, date) => {
                      if (Platform.OS !== 'ios') setOpenPicker(null);
                      if (date) trySetSessionTime(currentStepIdx, sessIdx, date);
                    }}
                  />
                )}
              </View>
            );
          })}

          {/* Add timeslot */}
          <TouchableOpacity style={styles.addSessionBtn} onPress={() => addSession(currentStepIdx)}>
            <Text style={styles.addSessionBtnText}>+ Add another timeslot</Text>
          </TouchableOpacity>

          <View style={styles.notifNote}>
            <Text style={styles.notifNoteText}>📱 App will remind you at each scheduled time.</Text>
          </View>

          {/* Add / delete step */}
          <View style={styles.stepActions}>
            <TouchableOpacity style={styles.stepActionBtn} onPress={addStepAfterCurrent}>
              <Text style={styles.stepActionAdd}>+ Add step after this</Text>
            </TouchableOpacity>
            {steps.length > 1 && (
              <TouchableOpacity style={styles.stepActionBtn} onPress={deleteCurrentStep}>
                <Text style={styles.stepActionDelete}>✕ Delete this step</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Remaining steps */}
          {scheduledAfter.length > 0 && (
            <View style={styles.remainingCard}>
              <Text style={styles.remainingTitle}>Still to schedule:</Text>
              {scheduledAfter.map(s => (
                <View key={s.id} style={styles.remainingRow}>
                  <Text style={styles.remainingItem}>· {s.name}</Text>
                  <Text style={styles.remainingDuration}>
                    {s.sessions.length > 1 ? `${s.sessions.length} sessions` : `~${fmtMins(s.durationMin)}`}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backNavBtn}
            onPress={() => {
              setOpenPicker(null);
              if (currentStepIdx === 0) setScreen(SCREEN.TITLE);
              else setCurrentStepIdx(currentStepIdx - 1);
            }}
          >
            <Text style={styles.backNavBtnText}>{currentStepIdx === 0 ? '← Back' : '← Prev'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonFlex, saving && styles.buttonDisabled]}
            onPress={() => { setOpenPicker(null); isLast ? saveTask() : setCurrentStepIdx(currentStepIdx + 1); }}
            disabled={saving}
          >
            <Text style={styles.buttonText}>{saving ? 'Saving…' : isLast ? 'Save task ✓' : 'Next step →'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 16 },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 15, color: colors.primary },
  taskHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  taskTitleHeader: { fontSize: 18, fontWeight: '800', color: colors.text, flex: 1, marginRight: 12 },
  taskDueInline: { fontSize: 13, fontWeight: '700', color: '#E65100', backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
  stepTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 12 },
  textInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 16, color: colors.text, backgroundColor: '#fff', marginBottom: 8 },
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, backgroundColor: '#fff', marginBottom: 8 },
  dateButtonText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  dateButtonEdit: { fontSize: 13, color: colors.primary },

  groupBlock: { marginTop: 16 },
  groupLabel: { fontSize: 13, fontWeight: '800', color: colors.textLight, letterSpacing: 0.5, marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeCard: { width: '31%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingVertical: 12, paddingHorizontal: 6, alignItems: 'center', gap: 5 },
  typeIcon: { fontSize: 24 },
  typeLabel: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' },

  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  hoursInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700', color: colors.text, backgroundColor: '#fff', width: 80, textAlign: 'center' },
  hoursUnit: { fontSize: 15, color: colors.textLight, fontWeight: '600' },
  stepDurationPreview: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginTop: 4 },
  stepDurationPreviewTitle: { fontSize: 12, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  stepDurationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  stepDurationName: { fontSize: 13, color: colors.text, flex: 1 },
  stepDurationBadge: { fontSize: 12, color: colors.primary, fontWeight: '700' },


  prevStepsCard: { backgroundColor: '#F1F8E9', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#AED581' },
  prevStepsTitle: { fontSize: 13, fontWeight: '700', color: '#558B2F', marginBottom: 10 },
  prevStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  prevStepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginTop: 4 },
  prevStepName: { fontSize: 13, color: '#33691E', fontWeight: '600' },
  prevStepDate: { fontSize: 12, color: '#558B2F', marginTop: 2 },

  stepPreviewCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: colors.primary, marginBottom: 12 },
  stepNameInput: { fontSize: 17, fontWeight: '700', color: colors.text, borderBottomWidth: 1.5, borderBottomColor: colors.primary + '60', paddingBottom: 8, marginBottom: 12 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  durationLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  durationInput: { borderWidth: 1.5, borderColor: colors.primary + '80', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 15, fontWeight: '700', color: colors.text, backgroundColor: '#fff', width: 56, textAlign: 'center' },
  durationUnit: { fontSize: 13, color: colors.textLight },
  durationFormatted: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  sessionCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EBEBEB', padding: 14, marginBottom: 10 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sessionLabel: { fontSize: 13, fontWeight: '800', color: colors.text, textTransform: 'uppercase', letterSpacing: 0.5 },
  sessionDeleteText: { fontSize: 13, color: '#F44336', fontWeight: '600' },
  sessDurationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sessDurationLabel: { fontSize: 16 },
  sessDurationInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 15, fontWeight: '700', color: colors.text, backgroundColor: '#F9F9F9', width: 56, textAlign: 'center' },
  sessDurationUnit: { fontSize: 13, color: colors.textLight },
  sessTimeBlock: { fontSize: 12, color: colors.primary, fontWeight: '600', flex: 1, textAlign: 'right' },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  pickerRowLabel: { fontSize: 15, width: 22, textAlign: 'center' },
  pickerRowValue: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  pickerRowAction: { fontSize: 13, color: colors.primary, fontWeight: '600' },

  addSessionBtn: { borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  addSessionBtnText: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  notifNote: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginBottom: 8 },
  notifNoteText: { fontSize: 13, color: '#2E7D32' },

  stepActions: { flexDirection: 'row', gap: 16, marginBottom: 8 },
  stepActionBtn: { paddingVertical: 6 },
  stepActionAdd: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  stepActionDelete: { fontSize: 13, color: '#F44336', fontWeight: '700' },

  remainingCard: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginTop: 4 },
  remainingTitle: { fontSize: 12, fontWeight: '700', color: colors.textLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  remainingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  remainingItem: { fontSize: 13, color: colors.textLight, flex: 1 },
  remainingDuration: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  navRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 32 },
  backNavBtn: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' },
  backNavBtnText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonFlex: { flex: 1, marginHorizontal: 0, marginBottom: 0 },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
