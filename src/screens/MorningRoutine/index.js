import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

const DEFAULT_TASKS = [
  { id: '1', label: 'Wake up & get out of bed', mins: 5 },
  { id: '2', label: 'Shower or wash face', mins: 10 },
  { id: '3', label: 'Get dressed', mins: 5 },
  { id: '4', label: 'Eat breakfast', mins: 10 },
  { id: '5', label: 'Pack bag', mins: 5 },
];

const VIEW = { MENU: 'menu', SETUP: 'setup', RUN: 'run', DONE: 'done' };

export default function MorningRoutine({ navigation }) {
  const { morningTasks, setMorningTasks, addMorningLog } = useStore(s => ({
    morningTasks: s.morningTasks || DEFAULT_TASKS,
    setMorningTasks: s.setMorningTasks || (() => {}),
    addMorningLog: s.addMorningLog || (() => {}),
  }));

  const [view, setView] = useState(VIEW.MENU);
  const [tasks, setTasks] = useState(morningTasks);
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const timerRef = useRef(null);

  const totalMins = tasks.reduce((sum, t) => sum + t.mins, 0);

  // ── SETUP ──
  function updateTask(id, field, value) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  }
  function addTask() {
    const id = Date.now().toString();
    setTasks(prev => [...prev, { id, label: '', mins: 5 }]);
  }
  function removeTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }
  function saveSetup() {
    const valid = tasks.filter(t => t.label.trim());
    setMorningTasks(valid);
    setTasks(valid);
    setView(VIEW.MENU);
  }

  // ── RUN ──
  useEffect(() => {
    if (view === VIEW.RUN) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [view]);

  function completeStep() {
    setCompletedSteps(prev => [...prev, currentStep]);
    if (currentStep + 1 < tasks.length) {
      setCurrentStep(s => s + 1);
    } else {
      addMorningLog({
        date: new Date().toISOString().split('T')[0],
        totalElapsedSec: elapsed,
        stepsCompleted: completedSteps.length + 1,
        totalSteps: tasks.length,
      });
      setView(VIEW.DONE);
    }
  }

  function skipStep() {
    if (currentStep + 1 < tasks.length) setCurrentStep(s => s + 1);
    else setView(VIEW.DONE);
  }

  const fmt = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  const progressPct = tasks.length > 0 ? (completedSteps.length / tasks.length) * 100 : 0;

  // ── MENU ──
  if (view === VIEW.MENU) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>☀️ Morning Routine</Text>
        <Text style={styles.headline}>Your morning plan</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTime}>~{totalMins} min total</Text>
          {tasks.map((t, i) => (
            <View key={t.id} style={styles.taskPreviewRow}>
              <Text style={styles.taskPreviewNum}>{i + 1}</Text>
              <Text style={styles.taskPreviewLabel}>{t.label}</Text>
              <Text style={styles.taskPreviewMins}>{t.mins}m</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={() => {
          setCurrentStep(0); setElapsed(0); setCompletedSteps([]); setView(VIEW.RUN);
        }}>
          <Text style={styles.buttonText}>Start routine →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonOutline} onPress={() => {
          setTasks(morningTasks); setView(VIEW.SETUP);
        }}>
          <Text style={styles.buttonOutlineText}>Edit routine</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );

  // ── SETUP ──
  if (view === VIEW.SETUP) return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>☀️ Setup</Text>
          <Text style={styles.headline}>Build your routine</Text>
          <Text style={styles.body}>Add your morning tasks in order. Set how many minutes each takes.</Text>

          {tasks.map((t, i) => (
            <View key={t.id} style={styles.setupRow}>
              <Text style={styles.setupNum}>{i + 1}</Text>
              <TextInput
                style={styles.setupInput}
                placeholder="Task name…"
                placeholderTextColor={colors.textLight}
                value={t.label}
                onChangeText={v => updateTask(t.id, 'label', v)}
              />
              <TextInput
                style={styles.setupMins}
                keyboardType="number-pad"
                value={String(t.mins)}
                onChangeText={v => updateTask(t.id, 'mins', parseInt(v) || 5)}
                maxLength={2}
              />
              <Text style={styles.setupMinsLabel}>min</Text>
              <TouchableOpacity onPress={() => removeTask(t.id)}>
                <Text style={styles.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={styles.addBtn} onPress={addTask}>
            <Text style={styles.addBtnText}>+ Add task</Text>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.button} onPress={saveSetup}>
          <Text style={styles.buttonText}>Save routine ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );

  // ── RUN ──
  if (view === VIEW.RUN) {
    const task = tasks[currentStep];
    const targetSec = task.mins * 60;
    const stepElapsed = elapsed; // simplified: total elapsed shown
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FAFAFA' }]}>
        <View style={styles.runContent}>
          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.stepCounter}>{currentStep + 1} of {tasks.length}</Text>

          {/* Timer */}
          <Text style={styles.timerText}>{fmt(elapsed)}</Text>
          <Text style={styles.timerLabel}>elapsed</Text>

          {/* Current task */}
          <View style={styles.taskCard}>
            <Text style={styles.taskCardLabel}>Now:</Text>
            <Text style={styles.taskCardName}>{task.label}</Text>
            <Text style={styles.taskCardTarget}>Target: {task.mins} min</Text>
          </View>

          {/* Next task */}
          {currentStep + 1 < tasks.length && (
            <Text style={styles.nextLabel}>Next: {tasks[currentStep + 1].label}</Text>
          )}
        </View>

        <View style={styles.runButtons}>
          <TouchableOpacity style={styles.skipBtn} onPress={skipStep}>
            <Text style={styles.skipBtnText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.doneBtn} onPress={completeStep}>
            <Text style={styles.doneBtnText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── DONE ──
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.moduleTag}>☀️ Morning Routine — Complete</Text>
        <Text style={styles.headline}>Morning done!</Text>
        <Text style={styles.body}>Total time: {fmt(elapsed)}</Text>
        <Text style={styles.body}>
          Steps completed: {completedSteps.length} / {tasks.length}
        </Text>
        <View style={styles.affirmBox}>
          <Text style={styles.affirmText}>
            Starting the morning with a plan is one of the highest-impact EF skills. You did it.
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Done ✓</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 16, flex: 1 },
  runContent: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 12 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#EBEBEB' },
  summaryTime: { fontSize: 14, color: colors.primary, fontWeight: '700', marginBottom: 12 },
  taskPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  taskPreviewNum: { width: 22, fontSize: 13, color: colors.textLight, fontWeight: '700' },
  taskPreviewLabel: { flex: 1, fontSize: 14, color: colors.text },
  taskPreviewMins: { fontSize: 13, color: colors.textLight },
  setupRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 },
  setupNum: { width: 20, fontSize: 14, color: colors.textLight, fontWeight: '700' },
  setupInput: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 14, color: colors.text, backgroundColor: '#fff' },
  setupMins: { width: 40, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 14, color: colors.text, backgroundColor: '#fff', textAlign: 'center' },
  setupMinsLabel: { fontSize: 12, color: colors.textLight },
  removeBtn: { fontSize: 16, color: '#CCC', padding: 4 },
  addBtn: { paddingVertical: 10, alignItems: 'center' },
  addBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  progressBar: { width: '100%', height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, marginBottom: 16 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },
  stepCounter: { fontSize: 13, color: colors.textLight, marginBottom: 24 },
  timerText: { fontSize: 64, fontWeight: '900', color: colors.text, marginBottom: 4 },
  timerLabel: { fontSize: 13, color: colors.textLight, marginBottom: 32 },
  taskCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primary, width: '100%', marginBottom: 16 },
  taskCardLabel: { fontSize: 12, color: colors.textLight, marginBottom: 6 },
  taskCardName: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  taskCardTarget: { fontSize: 13, color: colors.primary },
  nextLabel: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
  runButtons: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingBottom: 32 },
  skipBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center' },
  skipBtnText: { fontSize: 16, color: colors.textLight, fontWeight: '600' },
  doneBtn: { flex: 2, padding: 16, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  doneBtnText: { fontSize: 16, color: '#fff', fontWeight: '800' },
  affirmBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, marginTop: 16 },
  affirmText: { fontSize: 15, color: colors.primary, lineHeight: 22, textAlign: 'center' },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonOutline: { marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: colors.primary, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  buttonOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
