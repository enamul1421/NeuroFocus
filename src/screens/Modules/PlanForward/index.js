import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useStore } from '../../../store';
import { logSession } from '../../../services/logger';
import { colors } from '../../../theme';

// ── Task type templates (evidence-based step sequences) ──────────────────────
const TASK_TEMPLATES = {
  test: {
    icon: '📝', label: 'Test / Exam', defaultDays: 7,
    steps: [
      { name: "Find out exactly what's covered", pct: 5, hint: 'Check syllabus or ask teacher' },
      { name: 'Gather all notes and materials', pct: 10, hint: 'Print, organize — don\'t skip this step' },
      { name: 'First full review pass', pct: 25, hint: 'Read everything once, don\'t memorize yet' },
      { name: 'Active recall practice', pct: 35, hint: 'Flashcards, practice problems, quiz yourself' },
      { name: 'Go back to weak areas', pct: 20, hint: 'The stuff you got wrong — review again' },
      { name: 'Final review + good sleep', pct: 5, hint: 'Light review only. Sleep matters more than cramming' },
    ],
  },
  quiz: {
    icon: '✏️', label: 'Quiz', defaultDays: 3,
    steps: [
      { name: 'Check exactly what the quiz covers', pct: 10, hint: 'Narrow it down — don\'t over-prepare' },
      { name: 'Quick review of relevant notes', pct: 40, hint: 'Focus only on what\'s being tested' },
      { name: 'Practice the key concepts', pct: 35, hint: 'Try doing it without looking at notes' },
      { name: 'Final check the night before', pct: 15, hint: 'Brief, then sleep' },
    ],
  },
  essay: {
    icon: '📄', label: 'Essay / Research Paper', defaultDays: 14,
    steps: [
      { name: 'Read the prompt carefully — understand what\'s asked', pct: 5, hint: 'Most students skip this and write the wrong thing' },
      { name: 'Research and gather sources', pct: 25, hint: 'Aim for more than you need; you\'ll cut later' },
      { name: 'Create an outline', pct: 10, hint: 'This saves time on the draft — don\'t skip it' },
      { name: 'Write the first draft', pct: 30, hint: 'Write fast — don\'t edit while drafting' },
      { name: 'Revise and improve', pct: 20, hint: 'Read it out loud — catches problems reading silently misses' },
      { name: 'Proofread and format', pct: 10, hint: 'Check requirements: length, citations, font' },
    ],
  },
  lab: {
    icon: '🔬', label: 'Lab Report', defaultDays: 10,
    steps: [
      { name: 'Review what happened in the experiment', pct: 15, hint: 'Re-read your lab notes before writing anything' },
      { name: 'Analyze data and results', pct: 25, hint: 'Calculate, graph, identify patterns' },
      { name: 'Write introduction and methods', pct: 20, hint: 'What were you testing and how — past tense' },
      { name: 'Write results section', pct: 20, hint: 'What did you find — data, graphs, tables' },
      { name: 'Write discussion and conclusion', pct: 20, hint: 'What does it mean? What would you change?' },
    ],
  },
  presentation: {
    icon: '🎤', label: 'Presentation', defaultDays: 10,
    steps: [
      { name: 'Research the topic', pct: 25, hint: 'Know more than you\'ll say — confidence comes from depth' },
      { name: 'Create an outline and structure', pct: 15, hint: 'Opening hook → main points → memorable close' },
      { name: 'Build slides or visual aids', pct: 25, hint: 'Less text, more visuals — you\'re the speaker' },
      { name: 'Write what you\'ll say (speaker notes)', pct: 15, hint: 'Don\'t memorize word-for-word — know your points' },
      { name: 'Practice out loud at least twice', pct: 15, hint: 'Once alone, once in front of someone' },
      { name: 'Time yourself and adjust', pct: 5, hint: 'Run it with a timer — too long is as bad as too short' },
    ],
  },
  group: {
    icon: '👥', label: 'Group Project', defaultDays: 14,
    steps: [
      { name: 'Meet with group — divide roles and set internal deadlines', pct: 10, hint: 'Set YOUR deadline 2 days before the real one' },
      { name: 'Complete your assigned research', pct: 30, hint: 'Your part only — don\'t do others\' work' },
      { name: 'Build your section of the content', pct: 30, hint: 'Slides, writing, or whatever your role is' },
      { name: 'Meet to combine everyone\'s work', pct: 15, hint: 'Leave time to fix inconsistencies' },
      { name: 'Polish together and rehearse if presenting', pct: 15, hint: 'Practice transitions between speakers' },
    ],
  },
  sciencefair: {
    icon: '🧪', label: 'Science Fair', defaultDays: 28,
    steps: [
      { name: 'Choose topic and write hypothesis', pct: 10, hint: 'Testable, specific, interesting to you' },
      { name: 'Background research', pct: 20, hint: 'What do scientists already know about this?' },
      { name: 'Design experiment and gather materials', pct: 10, hint: 'Plan for things to go wrong — buffer time' },
      { name: 'Conduct experiment (plan at least 2 trials)', pct: 25, hint: 'One trial is not enough — results must be repeatable' },
      { name: 'Analyze data and write report', pct: 20, hint: 'What did you find? What does it mean?' },
      { name: 'Build display board', pct: 10, hint: 'Clear layout: question → hypothesis → method → results → conclusion' },
      { name: 'Practice your presentation', pct: 5, hint: 'Judges ask questions — know your data' },
    ],
  },
  reading: {
    icon: '📚', label: 'Reading Assignment', defaultDays: 5,
    steps: [
      { name: 'Read assigned pages without skipping', pct: 60, hint: 'Active reading: mark unfamiliar terms as you go' },
      { name: 'Take notes on key points and themes', pct: 20, hint: 'In your own words — not copying sentences' },
      { name: 'Review notes and prepare for discussion', pct: 20, hint: 'What questions might a teacher ask?' },
    ],
  },
  other: {
    icon: '📋', label: 'Something else', defaultDays: 7,
    steps: [
      { name: 'Step 1', pct: 33, hint: '' },
      { name: 'Step 2', pct: 33, hint: '' },
      { name: 'Step 3', pct: 34, hint: '' },
    ],
  },
};

const TASK_TYPE_KEYS = ['test', 'quiz', 'essay', 'lab', 'presentation', 'group', 'sciencefair', 'reading', 'other'];

const PHASE = {
  CHECK_IN:  'checkin',
  INTRO:     'intro',
  TYPE_PICK: 'typepick',   // new — pick task type
  BREAKDOWN: 'breakdown',  // editable steps from template
  OBSTACLES: 'obstacles',
  MY_PLAN:   'myplan',
  SUMMARY:   'summary',
};

const COMPLETION_OPTIONS = [
  { label: '✅ Yes, I did it',    value: 'completed',     color: '#4CAF50' },
  { label: '🔄 Partially done',  value: 'partial',       color: '#FF9800' },
  { label: "❌ I didn't do it",  value: 'not_completed', color: '#9E9E9E' },
];

export default function PlanForward({ navigation }) {
  const { participantCode, planForwardSessions, addPlanForwardSession } = useStore(s => ({
    participantCode: s.participantCode,
    planForwardSessions: s.planForwardSessions || [],
    addPlanForwardSession: s.addPlanForwardSession || (() => {}),
  }));

  const lastSession = [...planForwardSessions]
    .reverse()
    .find(s => s.myPlanTask && s.myPlanTask.trim());

  const [phase, setPhase] = useState(lastSession ? PHASE.CHECK_IN : PHASE.INTRO);
  const [checkInResult, setCheckInResult] = useState(null);
  const [blockerText, setBlockerText] = useState('');

  // Task type + steps
  const [selectedType, setSelectedType] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [totalDays, setTotalDays] = useState('7');
  const [steps, setSteps] = useState([]);   // array of { name, pct, hint }

  // Obstacle + real plan
  const [obstacles, setObstacles] = useState(['']);
  const [myPlanTask, setMyPlanTask] = useState('');
  const [myPlanSteps, setMyPlanSteps] = useState(['', '', '']);
  const [myPlanTime, setMyPlanTime] = useState('');

  // ── Helpers ──────────────────────────────────────────────────────────────
  function loadTemplate(typeKey) {
    const template = TASK_TEMPLATES[typeKey];
    setSelectedType(typeKey);
    setTotalDays(String(template.defaultDays));
    setSteps(template.steps.map(s => ({ ...s })));
    setPhase(PHASE.BREAKDOWN);
  }

  function suggestedDays(pct, total) {
    const d = Math.round((pct / 100) * Number(total));
    return Math.max(d, 1);
  }

  function updateStepName(i, value) {
    const updated = [...steps];
    updated[i] = { ...updated[i], name: value };
    setSteps(updated);
  }

  function removeStep(i) {
    setSteps(steps.filter((_, idx) => idx !== i));
  }

  function addStep() {
    setSteps([...steps, { name: '', pct: 0, hint: '' }]);
  }

  function updateObstacle(i, value) {
    const updated = [...obstacles];
    updated[i] = value;
    setObstacles(updated);
  }

  function updateMyPlanStep(i, value) {
    const updated = [...myPlanSteps];
    updated[i] = value;
    setMyPlanSteps(updated);
  }

  async function finish() {
    const sessionData = {
      date: new Date().toISOString().split('T')[0],
      taskType: selectedType,
      taskTitle: taskTitle.trim(),
      totalDaysAvailable: Number(totalDays) || 0,
      stepsCount: steps.filter(s => s.name.trim()).length,
      obstaclesCount: obstacles.filter(o => o.trim()).length,
      myPlanTask: myPlanTask.trim(),
      myPlanTime: myPlanTime.trim(),
      myPlanCreated: myPlanTask.trim().length > 0,
      previousPlanCompleted: checkInResult || 'no_previous_plan',
      previousPlanBlocker: blockerText.trim() || null,
    };
    addPlanForwardSession(sessionData);
    await logSession(participantCode, { module: 'PlanForward', ...sessionData });
    setPhase(PHASE.SUMMARY);
  }

  // ── CHECK-IN ─────────────────────────────────────────────────────────────
  if (phase === PHASE.CHECK_IN && lastSession) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>📋 PlanForward</Text>
          <Text style={styles.headline}>Quick check-in</Text>
          <Text style={styles.body}>Last session you planned to:</Text>
          <View style={styles.lastPlanBox}>
            <Text style={styles.lastPlanTask}>{lastSession.myPlanTask}</Text>
            {lastSession.myPlanTime ? <Text style={styles.lastPlanTime}>Starting: {lastSession.myPlanTime}</Text> : null}
          </View>
          <Text style={styles.label}>Did you do it?</Text>
          {COMPLETION_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.value}
              style={[styles.checkInOption, checkInResult === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
              onPress={() => setCheckInResult(opt.value)}>
              <Text style={[styles.checkInOptionText, checkInResult === opt.value && { color: opt.color, fontWeight: '700' }]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
          {checkInResult === 'not_completed' && (
            <View style={styles.blockerBox}>
              <Text style={styles.label}>What got in the way?</Text>
              <TextInput style={styles.blockerInput}
                placeholder="e.g. I forgot, ran out of time, didn't know where to start…"
                placeholderTextColor={colors.textLight}
                value={blockerText} onChangeText={setBlockerText} multiline />
              <Text style={styles.blockerNote}>We'll use this in your obstacle planning today.</Text>
            </View>
          )}
          {checkInResult === 'completed' && (
            <View style={styles.affirmBox}><Text style={styles.affirmText}>You made a plan and followed through. That's exactly what this practice is for.</Text></View>
          )}
          {checkInResult === 'partial' && (
            <View style={styles.affirmBox}><Text style={styles.affirmText}>Partial counts. Let's build on it today.</Text></View>
          )}
        </ScrollView>
        <TouchableOpacity style={[styles.button, !checkInResult && styles.buttonDisabled]}
          onPress={() => setPhase(PHASE.INTRO)} disabled={!checkInResult}>
          <Text style={styles.buttonText}>Continue →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>📋 PlanForward</Text>
          <Text style={styles.headline}>Planning practice</Text>
          <Text style={styles.body}>Planning is a skill — not a talent. Today you'll pick a real task, follow a proven step sequence, spot obstacles, and commit to one thing today.</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoItem}>📋 Step-by-step breakdown</Text>
            <Text style={styles.infoItem}>🚧 Obstacle finder</Text>
            <Text style={styles.infoItem}>✅ Your real plan today</Text>
          </View>
          <View style={styles.goalBox}>
            <Text style={styles.goalLabel}>WHAT YOU'LL BUILD</Text>
            <Text style={styles.goalText}>A real plan for a real task — using the same steps that actually work for your type of assignment</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={() => setPhase(PHASE.TYPE_PICK)}>
          <Text style={styles.buttonText}>Start →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ── TYPE PICKER ───────────────────────────────────────────────────────────
  if (phase === PHASE.TYPE_PICK) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>Exercise 1 of 3</Text>
          <Text style={styles.headline}>What type of task?</Text>
          <Text style={styles.body}>Pick the closest match. We'll load the right steps for it.</Text>

          <View style={styles.typeGrid}>
            {TASK_TYPE_KEYS.map(key => {
              const t = TASK_TEMPLATES[key];
              return (
                <TouchableOpacity key={key} style={styles.typeCard} onPress={() => loadTemplate(key)}>
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── BREAKDOWN: editable steps from template ───────────────────────────────
  if (phase === PHASE.BREAKDOWN) {
    const template = TASK_TEMPLATES[selectedType];
    const canProceed = steps.filter(s => s.name.trim()).length >= 2;

    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.moduleTag}>Exercise 1 of 3  ·  {template.icon} {template.label}</Text>
            <Text style={styles.headline}>Your step-by-step plan</Text>
            <Text style={styles.body}>
              These are the steps that work for this type of task — based on how students learn best.
              Edit, remove, or add steps to fit your situation.
            </Text>

            {/* Optional task title */}
            <TextInput
              style={styles.taskTitleInput}
              placeholder={`Name your task (e.g. "Bio exam Ch. 5–8") — optional`}
              placeholderTextColor={colors.textLight}
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            {/* Total days input */}
            <View style={styles.daysRow}>
              <Text style={styles.daysLabel}>Days until deadline:</Text>
              <TextInput
                style={styles.daysInput}
                value={totalDays}
                onChangeText={v => setTotalDays(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.daysUnit}>days</Text>
            </View>
            <Text style={styles.daysHint}>
              Default is {TASK_TEMPLATES[selectedType]?.defaultDays} days for this task type — adjust if your deadline is different.
            </Text>

            {/* Editable steps */}
            {steps.map((step, i) => (
              <View key={i} style={styles.stepCard}>
                <View style={styles.stepCardHeader}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{i + 1}</Text>
                  </View>
                  <View style={styles.stepMeta}>
                    <Text style={styles.stepPct}>~{step.pct}% of time</Text>
                    <Text style={styles.stepDays}>
                      ≈ {suggestedDays(step.pct, totalDays)} {suggestedDays(step.pct, totalDays) === 1 ? 'day' : 'days'}
                    </Text>
                  </View>
                  {steps.length > 2 && (
                    <TouchableOpacity onPress={() => removeStep(i)} style={styles.removeBtn}>
                      <Text style={styles.removeBtnText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={styles.stepNameInput}
                  value={step.name}
                  onChangeText={v => updateStepName(i, v)}
                  placeholder="Step name…"
                  placeholderTextColor={colors.textLight}
                />
                {step.hint ? (
                  <Text style={styles.stepHint}>💡 {step.hint}</Text>
                ) : null}
              </View>
            ))}

            <TouchableOpacity style={styles.addStepBtn} onPress={addStep}>
              <Text style={styles.addStepBtnText}>+ Add a step</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.changeTypeLink} onPress={() => setPhase(PHASE.TYPE_PICK)}>
              <Text style={styles.changeTypeLinkText}>← Change task type</Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[styles.button, !canProceed && styles.buttonDisabled]}
            onPress={() => setPhase(PHASE.OBSTACLES)}
            disabled={!canProceed}>
            <Text style={styles.buttonText}>Next: Obstacles →</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── OBSTACLES ─────────────────────────────────────────────────────────────
  if (phase === PHASE.OBSTACLES) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.moduleTag}>Exercise 2 of 3</Text>
            <Text style={styles.headline}>What could go wrong?</Text>
            <Text style={styles.body}>Name obstacles before they surprise you. Then make a backup plan.</Text>

            {checkInResult === 'not_completed' && blockerText.trim() && (
              <View style={styles.blockerCarryBox}>
                <Text style={styles.blockerCarryLabel}>Last time, you said:</Text>
                <Text style={styles.blockerCarryText}>"{blockerText}"</Text>
                <Text style={styles.blockerCarryNote}>Let's make sure this doesn't happen today.</Text>
              </View>
            )}

            {obstacles.map((obs, i) => (
              <TextInput key={i} style={styles.obstacleInput}
                placeholder="e.g. I'll forget, get distracted, underestimate time…"
                placeholderTextColor={colors.textLight}
                value={obs} onChangeText={v => updateObstacle(i, v)} multiline />
            ))}
            {obstacles.length < 3 && (
              <TouchableOpacity style={styles.addButton} onPress={() => setObstacles([...obstacles, ''])}>
                <Text style={styles.addButtonText}>+ Add another obstacle</Text>
              </TouchableOpacity>
            )}
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>Common ones for neurodivergent teens:</Text>
              {['Forgetting to start', 'Underestimating how long it takes', 'Getting distracted mid-task', 'Losing motivation halfway', 'Not knowing where to begin'].map(t => (
                <Text key={t} style={styles.tipItem}>• {t}</Text>
              ))}
            </View>
          </ScrollView>
          <TouchableOpacity style={[styles.button, !obstacles[0]?.trim() && styles.buttonDisabled]}
            onPress={() => setPhase(PHASE.MY_PLAN)} disabled={!obstacles[0]?.trim()}>
            <Text style={styles.buttonText}>Next: My real plan →</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── MY PLAN TODAY ─────────────────────────────────────────────────────────
  if (phase === PHASE.MY_PLAN) {
    const canFinish = myPlanTask.trim() && myPlanSteps.filter(s => s.trim()).length >= 1;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.moduleTag}>Exercise 3 of 3</Text>
            <Text style={styles.headline}>Your real plan</Text>
            <Text style={[styles.body, { fontStyle: 'italic' }]}>This is not practice — this is real.</Text>
            <Text style={styles.body}>Pick one actual thing you need to do today. Break it into steps. Set a start time.</Text>

            <Text style={styles.label}>What's my task today?</Text>
            <TextInput style={styles.planInput}
              placeholder="e.g. Review Chapter 3 notes for 30 min"
              placeholderTextColor={colors.textLight}
              value={myPlanTask} onChangeText={setMyPlanTask} />

            <Text style={styles.label}>Steps:</Text>
            {myPlanSteps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{i + 1}</Text></View>
                <TextInput style={styles.stepInput}
                  placeholder={`Step ${i + 1}…`} placeholderTextColor={colors.textLight}
                  value={step} onChangeText={v => updateMyPlanStep(i, v)} />
              </View>
            ))}

            <Text style={styles.label}>When will you start?</Text>
            <TextInput style={styles.planInput}
              placeholder="e.g. 4:30pm, right after dinner"
              placeholderTextColor={colors.textLight}
              value={myPlanTime} onChangeText={setMyPlanTime} />
          </ScrollView>
          <TouchableOpacity style={[styles.button, !canFinish && styles.buttonDisabled]}
            onPress={finish} disabled={!canFinish}>
            <Text style={styles.buttonText}>Finish session →</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    );
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (phase === PHASE.SUMMARY) {
    const template = TASK_TEMPLATES[selectedType];
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>📋 PlanForward — Complete</Text>
          <Text style={styles.headline}>Session done</Text>

          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Task type</Text>
            <Text style={styles.summaryValue}>{template?.icon} {template?.label}{taskTitle ? ` — ${taskTitle}` : ''}</Text>
          </View>

          <View style={styles.summaryBlock}>
            <Text style={styles.summaryLabel}>Steps you built</Text>
            {steps.filter(s => s.name.trim()).map((s, i) => (
              <Text key={i} style={styles.summaryItem}>✓ {s.name}</Text>
            ))}
          </View>

          {myPlanTask.trim() && (
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryLabel}>Your real plan today</Text>
              <Text style={styles.summaryValue}>{myPlanTask}</Text>
              {myPlanTime ? <Text style={styles.summaryNote}>Starting: {myPlanTime}</Text> : null}
            </View>
          )}

          <View style={styles.affirmBox}>
            <Text style={styles.affirmText}>
              You now have a proven step sequence for this type of task. The more you practice it, the more automatic it becomes.
            </Text>
          </View>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 16 },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 8 },
  infoRow: { marginTop: 16, gap: 8 },
  infoItem: { fontSize: 15, color: colors.text, paddingVertical: 6 },
  goalBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1.5, borderColor: colors.primary },
  goalLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },

  // Type picker grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  typeCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E0E0E0',
    padding: 16, alignItems: 'center', gap: 8,
  },
  typeIcon: { fontSize: 32 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: colors.text, textAlign: 'center' },

  // Breakdown / step cards
  taskTitleInput: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 12, fontSize: 15, color: colors.text,
    backgroundColor: '#fff', marginBottom: 20,
  },
  stepCard: {
    backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E8E8',
    padding: 14, marginBottom: 10,
  },
  stepCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  stepBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepMeta: { flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' },
  stepPct: { fontSize: 12, color: colors.textLight },
  stepDays: { fontSize: 12, fontWeight: '700', color: colors.primary },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: 14, color: '#BDBDBD' },
  stepNameInput: {
    borderWidth: 1, borderColor: '#EBEBEB', borderRadius: 8,
    padding: 10, fontSize: 15, color: colors.text, backgroundColor: '#FAFAFA',
  },
  stepHint: { fontSize: 12, color: colors.textLight, marginTop: 6, fontStyle: 'italic' },
  daysRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4, marginTop: 4 },
  daysLabel: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  daysInput: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 8,
    padding: 8, fontSize: 18, fontWeight: '800', color: colors.primary,
    textAlign: 'center', width: 52, backgroundColor: '#fff',
  },
  daysUnit: { fontSize: 14, color: colors.textLight },
  daysHint: { fontSize: 12, color: colors.textLight, fontStyle: 'italic', marginBottom: 16 },
  addStepBtn: { paddingVertical: 12, alignItems: 'center' },
  addStepBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  changeTypeLink: { paddingVertical: 8, alignItems: 'center', marginTop: 4 },
  changeTypeLinkText: { fontSize: 13, color: colors.textLight },

  // Check-in
  lastPlanBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1.5, borderColor: colors.primary },
  lastPlanTask: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 22 },
  lastPlanTime: { fontSize: 13, color: colors.primary, marginTop: 6 },
  checkInOption: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 16, marginBottom: 10, backgroundColor: '#fff' },
  checkInOptionText: { fontSize: 16, color: colors.text },
  blockerBox: { marginTop: 12 },
  blockerInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, color: colors.text, backgroundColor: '#fff', minHeight: 60, marginBottom: 8 },
  blockerNote: { fontSize: 13, color: colors.primary, fontStyle: 'italic' },
  blockerCarryBox: { backgroundColor: '#FFF3E0', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FF9800' },
  blockerCarryLabel: { fontSize: 12, color: '#E65100', fontWeight: '700', marginBottom: 4 },
  blockerCarryText: { fontSize: 14, color: colors.text, fontStyle: 'italic', marginBottom: 4 },
  blockerCarryNote: { fontSize: 13, color: '#E65100' },

  // Obstacles
  obstacleInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, color: colors.text, backgroundColor: '#fff', marginBottom: 10, minHeight: 50 },
  addButton: { paddingVertical: 10, alignItems: 'center' },
  addButtonText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  tipsBox: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14, marginTop: 8 },
  tipsTitle: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  tipItem: { fontSize: 13, color: colors.textLight, paddingVertical: 2 },

  // My plan
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepNumberText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  stepInput: { flex: 1, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 10, fontSize: 15, color: colors.text, backgroundColor: '#fff' },
  planInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 15, color: colors.text, backgroundColor: '#fff', marginBottom: 16 },

  // Summary
  summaryBlock: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EBEBEB' },
  summaryLabel: { fontSize: 12, color: colors.textLight, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { fontSize: 15, color: colors.text, lineHeight: 22 },
  summaryItem: { fontSize: 14, color: colors.text, paddingVertical: 2 },
  summaryNote: { fontSize: 13, color: colors.primary, marginTop: 4 },
  affirmBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, marginTop: 8 },
  affirmText: { fontSize: 15, color: colors.primary, lineHeight: 22, textAlign: 'center' },

  // Shared
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
