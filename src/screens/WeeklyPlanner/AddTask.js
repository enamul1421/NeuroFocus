import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { scheduleStepNotification, suggestStepDate } from './utils';
import * as Notifications from 'expo-notifications';

const TASK_TEMPLATES = {
  test:         { icon: '📝', label: 'Test / Exam',           defaultDays: 7,  totalHours: 7,  steps: [{ name: "Find out what's covered", pct: 5 }, { name: 'Gather notes and materials', pct: 10 }, { name: 'First full review pass', pct: 25 }, { name: 'Active recall practice', pct: 35 }, { name: 'Go back to weak areas', pct: 20 }, { name: 'Final review + good sleep', pct: 5 }] },
  quiz:         { icon: '✏️', label: 'Quiz',                  defaultDays: 3,  totalHours: 2,  steps: [{ name: 'Check what the quiz covers', pct: 10 }, { name: 'Quick review of notes', pct: 40 }, { name: 'Practice key concepts', pct: 35 }, { name: 'Final check the night before', pct: 15 }] },
  essay:        { icon: '📄', label: 'Essay / Research Paper', defaultDays: 14, totalHours: 10, steps: [{ name: 'Read the prompt carefully', pct: 5 }, { name: 'Research and gather sources', pct: 25 }, { name: 'Create an outline', pct: 10 }, { name: 'Write the first draft', pct: 30 }, { name: 'Revise and improve', pct: 20 }, { name: 'Proofread and format', pct: 10 }] },
  lab:          { icon: '🔬', label: 'Lab Report',            defaultDays: 10, totalHours: 6,  steps: [{ name: 'Review the experiment', pct: 15 }, { name: 'Analyze data and results', pct: 25 }, { name: 'Write introduction and methods', pct: 20 }, { name: 'Write results section', pct: 20 }, { name: 'Write discussion and conclusion', pct: 20 }] },
  presentation: { icon: '🎤', label: 'Presentation',          defaultDays: 10, totalHours: 8,  steps: [{ name: 'Research the topic', pct: 25 }, { name: 'Create outline and structure', pct: 15 }, { name: 'Build slides or visual aids', pct: 25 }, { name: "Write what you'll say", pct: 15 }, { name: 'Practice out loud twice', pct: 15 }, { name: 'Time yourself and adjust', pct: 5 }] },
  group:        { icon: '👥', label: 'Group Project',          defaultDays: 14, totalHours: 12, steps: [{ name: 'Meet and divide roles', pct: 10 }, { name: 'Complete your research', pct: 30 }, { name: 'Build your section', pct: 30 }, { name: 'Combine with group', pct: 15 }, { name: 'Polish and rehearse', pct: 15 }] },
  sciencefair:  { icon: '🧪', label: 'Science Fair',           defaultDays: 28, totalHours: 20, steps: [{ name: 'Choose topic and hypothesis', pct: 10 }, { name: 'Background research', pct: 20 }, { name: 'Design and gather materials', pct: 10 }, { name: 'Conduct experiment (2+ trials)', pct: 25 }, { name: 'Analyze data and write report', pct: 20 }, { name: 'Build display board', pct: 10 }, { name: 'Practice presentation', pct: 5 }] },
  reading:      { icon: '📚', label: 'Reading Assignment',     defaultDays: 5,  totalHours: 3,  steps: [{ name: 'Read assigned pages', pct: 60 }, { name: 'Take notes on key points', pct: 20 }, { name: 'Review for discussion', pct: 20 }] },
  other:        { icon: '📋', label: 'Something else',         defaultDays: 7,  totalHours: 5,  steps: [{ name: 'Step 1', pct: 33 }, { name: 'Step 2', pct: 33 }, { name: 'Step 3', pct: 34 }] },
};

const STEP = { TYPE: 'type', TITLE: 'title', SCHEDULE: 'schedule' };

function calcDuration(pct, totalHours) {
  return Math.max(Math.round((pct / 100) * totalHours * 60), 5);
}

function fmtMins(mins) {
  const n = Number(mins) || 0;
  if (n < 60) return `${n} min`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function AddTask({ navigation }) {
  const { addPlannerTask } = useStore(s => ({ addPlannerTask: s.addPlannerTask }));

  const [screen, setScreen] = useState(STEP.TYPE);
  const [selectedType, setSelectedType] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [deadline, setDeadline] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 7); return d;
  });
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);
  const [steps, setSteps] = useState([]);
  const [totalHours, setTotalHours] = useState(7);

  // Wizard state
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [saving, setSaving] = useState(false);

  function loadTemplate(typeKey) {
    const template = TASK_TEMPLATES[typeKey];
    setSelectedType(typeKey);
    setTotalHours(template.totalHours);
    let pctSoFar = 0;
    const built = template.steps.map((s, i) => {
      const suggestedISO = suggestStepDate(deadline.toISOString(), s.pct, pctSoFar);
      pctSoFar += s.pct;
      return {
        id: `step_${Date.now()}_${i}`,
        name: s.name,
        pct: s.pct,
        durationMin: calcDuration(s.pct, template.totalHours),
        scheduledDate: suggestedISO,
        completed: false,
        notificationId: null,
      };
    });
    setSteps(built);
    setScreen(STEP.TITLE);
  }

  function goToSchedule() {
    // Sync durationMin with current totalHours before entering wizard
    setSteps(prev => prev.map(s => ({ ...s, durationMin: calcDuration(s.pct, totalHours) })));
    setCurrentStepIdx(0);
    setScreen(STEP.SCHEDULE);
  }

  // ── Step mutation helpers ────────────────────────────────────────────────

  function updateStepName(idx, name) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, name } : s));
  }

  function updateStepDuration(idx, value) {
    const n = parseInt(value, 10);
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, durationMin: isNaN(n) ? s.durationMin : Math.max(n, 1) } : s));
  }

  function updateStepDate(idx, date) {
    setSteps(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const existing = new Date(s.scheduledDate);
      date.setHours(existing.getHours(), existing.getMinutes(), 0, 0);
      return { ...s, scheduledDate: date.toISOString() };
    }));
  }

  function updateStepTime(idx, date) {
    setSteps(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const existing = new Date(s.scheduledDate);
      existing.setHours(date.getHours(), date.getMinutes(), 0, 0);
      return { ...s, scheduledDate: existing.toISOString() };
    }));
  }

  function addStepAfterCurrent() {
    const insertAt = currentStepIdx + 1;
    const newStep = {
      id: `step_${Date.now()}_new`,
      name: 'New step',
      pct: 10,
      durationMin: 30,
      scheduledDate: new Date().toISOString(),
      completed: false,
      notificationId: null,
    };
    setSteps(prev => {
      const next = [...prev];
      next.splice(insertAt, 0, newStep);
      return next;
    });
    setCurrentStepIdx(insertAt);
  }

  function deleteCurrentStep() {
    if (steps.length === 1) return;
    setSteps(prev => prev.filter((_, i) => i !== currentStepIdx));
    setCurrentStepIdx(prev => Math.min(prev, steps.length - 2));
  }

  async function saveTask() {
    setSaving(true);
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const canNotify = status === 'granted';
      const stepsWithNotifs = await Promise.all(steps.map(async s => {
        let notifId = null;
        if (canNotify && s.scheduledDate) notifId = await scheduleStepNotification(s, taskTitle);
        return { ...s, notificationId: notifId };
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
  if (screen === STEP.TYPE) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headline}>What type of task?</Text>
          <Text style={styles.body}>Pick the closest match to get the right step sequence.</Text>
          <View style={styles.typeGrid}>
            {Object.entries(TASK_TEMPLATES).map(([key, t]) => (
              <TouchableOpacity key={key} style={styles.typeCard} onPress={() => loadTemplate(key)}>
                <Text style={styles.typeIcon}>{t.icon}</Text>
                <Text style={styles.typeLabel}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TITLE + DEADLINE + HOURS ─────────────────────────────────────────────
  if (screen === STEP.TITLE) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <TouchableOpacity onPress={() => setScreen(STEP.TYPE)} style={styles.backBtn}>
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
                    let pctSoFar = 0;
                    setSteps(prev => prev.map(s => {
                      const newDate = suggestStepDate(date.toISOString(), s.pct, pctSoFar);
                      pctSoFar += s.pct;
                      return { ...s, scheduledDate: newDate };
                    }));
                  }
                }}
              />
            )}

            <Text style={styles.label}>Total estimated hours</Text>
            <View style={styles.hoursRow}>
              <TextInput
                style={styles.hoursInput}
                value={String(totalHours)}
                onChangeText={v => { const n = parseFloat(v); if (!isNaN(n) && n > 0) setTotalHours(n); }}
                keyboardType="decimal-pad"
              />
              <Text style={styles.hoursUnit}>hrs total</Text>
            </View>

            {/* Live duration preview — updates as totalHours changes */}
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

  // ── SCHEDULE STEPS (wizard) ──────────────────────────────────────────────
  if (screen === STEP.SCHEDULE) {
    const current = steps[currentStepIdx];
    const currentDate = current?.scheduledDate ? new Date(current.scheduledDate) : new Date();
    const isLast = currentStepIdx === steps.length - 1;
    const scheduledBefore = steps.slice(0, currentStepIdx);
    const scheduledAfter = steps.slice(currentStepIdx + 1);

    const endTime = current?.scheduledDate
      ? new Date(new Date(current.scheduledDate).getTime() + (Number(current.durationMin) || 0) * 60000)
      : null;
    const hasTime = currentDate.getHours() !== 0 || currentDate.getMinutes() !== 0;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <Text style={styles.stepTag}>Step {currentStepIdx + 1} of {steps.length}</Text>

          {/* Due date banner */}
          <View style={styles.dueDateBanner}>
            <Text style={styles.dueDateLabel}>⚠️ Task due:</Text>
            <Text style={styles.dueDateValue}>
              {deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
          </View>

          {/* Previously scheduled steps */}
          {scheduledBefore.length > 0 && (
            <View style={styles.prevStepsCard}>
              <Text style={styles.prevStepsTitle}>✓ Already scheduled</Text>
              {scheduledBefore.map(s => {
                const d = new Date(s.scheduledDate);
                const end = new Date(d.getTime() + (Number(s.durationMin) || 0) * 60000);
                const ht = d.getHours() !== 0 || d.getMinutes() !== 0;
                return (
                  <View key={s.id} style={styles.prevStepRow}>
                    <View style={styles.prevStepDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prevStepName}>{s.name}</Text>
                      <Text style={styles.prevStepDate}>
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {ht ? ` · ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} – ${end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}
                        {` · ${fmtMins(s.durationMin)}`}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Current step card — editable name + duration */}
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
              <Text style={styles.durationLabel}>⏱ Duration:</Text>
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
            {hasTime && endTime && (
              <Text style={styles.stepTimeBlock}>
                📅 {currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                {' – '}
                {endTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </Text>
            )}
          </View>

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => { setTempDate(currentDate); setShowDatePicker(true); }}>
            <Text style={styles.dateButtonText}>
              {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text style={styles.dateButtonEdit}>Change</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              maximumDate={deadline}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) { updateStepDate(currentStepIdx, date); setTempDate(date); }
              }}
            />
          )}

          {/* Time */}
          <Text style={styles.label}>Time</Text>
          <TouchableOpacity style={styles.dateButton} onPress={() => { setTempDate(currentDate); setShowTimePicker(true); }}>
            <Text style={styles.dateButtonText}>
              {currentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
            <Text style={styles.dateButtonEdit}>Change</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="spinner"
              onChange={(_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) { updateStepTime(currentStepIdx, date); setTempDate(date); }
              }}
            />
          )}

          <View style={styles.notifNote}>
            <Text style={styles.notifNoteText}>📱 App will remind you at this date and time.</Text>
          </View>

          {/* Add / delete */}
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
                  <Text style={styles.remainingDuration}>~{fmtMins(s.durationMin)}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.backNavBtn}
            onPress={() => currentStepIdx === 0 ? setScreen(STEP.TITLE) : setCurrentStepIdx(currentStepIdx - 1)}
          >
            <Text style={styles.backNavBtnText}>{currentStepIdx === 0 ? '← Back' : '← Prev'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonFlex, saving && styles.buttonDisabled]}
            onPress={() => isLast ? saveTask() : setCurrentStepIdx(currentStepIdx + 1)}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? 'Saving…' : isLast ? 'Save task ✓' : 'Next step →'}
            </Text>
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
  stepTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 20 },
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 8, marginTop: 12 },
  textInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 16, color: colors.text, backgroundColor: '#fff', marginBottom: 8 },
  dateButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, backgroundColor: '#fff', marginBottom: 8 },
  dateButtonText: { fontSize: 15, color: colors.text, fontWeight: '600' },
  dateButtonEdit: { fontSize: 13, color: colors.primary },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  typeCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 16, alignItems: 'center', gap: 8 },
  typeIcon: { fontSize: 32 },
  typeLabel: { fontSize: 13, fontWeight: '700', color: colors.text, textAlign: 'center' },

  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  hoursInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 18, fontWeight: '700', color: colors.text, backgroundColor: '#fff', width: 80, textAlign: 'center' },
  hoursUnit: { fontSize: 15, color: colors.textLight, fontWeight: '600' },
  stepDurationPreview: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginTop: 4 },
  stepDurationPreviewTitle: { fontSize: 12, fontWeight: '700', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  stepDurationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  stepDurationName: { fontSize: 13, color: colors.text, flex: 1 },
  stepDurationBadge: { fontSize: 12, color: colors.primary, fontWeight: '700' },

  dueDateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#FF9800' },
  dueDateLabel: { fontSize: 13, color: '#E65100', fontWeight: '700' },
  dueDateValue: { fontSize: 13, color: '#E65100', fontWeight: '600', flex: 1 },

  prevStepsCard: { backgroundColor: '#F1F8E9', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#AED581' },
  prevStepsTitle: { fontSize: 13, fontWeight: '700', color: '#558B2F', marginBottom: 10 },
  prevStepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  prevStepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginTop: 4 },
  prevStepName: { fontSize: 13, color: '#33691E', fontWeight: '600' },
  prevStepDate: { fontSize: 12, color: '#558B2F', marginTop: 1 },

  stepPreviewCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: colors.primary, marginBottom: 8 },
  stepNameInput: { fontSize: 17, fontWeight: '700', color: colors.text, borderBottomWidth: 1.5, borderBottomColor: colors.primary + '60', paddingBottom: 8, marginBottom: 12 },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  durationLabel: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  durationInput: { borderWidth: 1.5, borderColor: colors.primary + '80', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 15, fontWeight: '700', color: colors.text, backgroundColor: '#fff', width: 56, textAlign: 'center' },
  durationUnit: { fontSize: 13, color: colors.textLight },
  durationFormatted: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  stepTimeBlock: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 8 },

  notifNote: { backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 8 },
  notifNoteText: { fontSize: 13, color: '#2E7D32' },

  stepActions: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
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
