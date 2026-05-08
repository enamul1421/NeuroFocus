import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { logSession } from '../../../services/logger';
import { useStore } from '../../../store';
import { colors } from '../../../theme';

const MOODS = [
  { emoji: '😤', label: 'Frustrated', value: 1 },
  { emoji: '😟', label: 'Anxious', value: 2 },
  { emoji: '😐', label: 'Neutral', value: 3 },
  { emoji: '🙂', label: 'Okay', value: 4 },
  { emoji: '😊', label: 'Good', value: 5 },
];

const BODY_FEELINGS = ['Tight chest', 'Racing thoughts', 'Restless', 'Tired', 'Tense shoulders', 'Calm', 'Heavy', 'Energized'];

const GROUNDING_STEPS = [
  { num: 5, sense: 'see', prompt: 'Name 5 things you can SEE right now.' },
  { num: 4, sense: 'touch', prompt: 'Name 4 things you can TOUCH or feel.' },
  { num: 3, sense: 'hear', prompt: 'Name 3 things you can HEAR.' },
  { num: 2, sense: 'smell', prompt: 'Name 2 things you can SMELL (or like to smell).' },
  { num: 1, sense: 'taste', prompt: 'Name 1 thing you can TASTE right now.' },
];

const REFRAMES = [
  { thought: "I can't do this.", reframe: "I haven't figured it out yet. That's different from can't." },
  { thought: "I'm so behind.", reframe: "I'm starting now. Starting late beats not starting." },
  { thought: "I'm just lazy.", reframe: "My brain initiates tasks differently. That's neurological, not a character flaw." },
  { thought: "Everyone else has it together.", reframe: "Everyone is managing their own hidden chaos. You're not alone." },
  { thought: "I always mess things up.", reframe: "I've handled hard things before. This one is hard too, and I can handle it." },
];

const PHASE = { CHECKIN: 'checkin', GROUNDING: 'grounding', REFRAME: 'reframe', TOOLKIT: 'toolkit', DONE: 'done' };

export default function MoodBridge({ navigation }) {
  const participantCode = useStore(s => s.participantCode);
  const [phase, setPhase] = useState(PHASE.CHECKIN);
  const [selectedMood, setSelectedMood] = useState(null);
  const [bodyFeelings, setBodyFeelings] = useState([]);
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingAnswers, setGroundingAnswers] = useState({});
  const [groundingInput, setGroundingInput] = useState('');
  const [selectedReframe, setSelectedReframe] = useState(null);
  const [toolkitItems] = useState(['Go for a 5-minute walk', 'Listen to one song', 'Text a friend', 'Do 10 jumping jacks', 'Drink cold water', 'Draw or doodle for 2 minutes']);

  function toggleBodyFeeling(f) {
    setBodyFeelings(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]);
  }

  function nextGrounding() {
    setGroundingAnswers(prev => ({ ...prev, [GROUNDING_STEPS[groundingStep].sense]: groundingInput }));
    setGroundingInput('');
    if (groundingStep + 1 < GROUNDING_STEPS.length) {
      setGroundingStep(g => g + 1);
    } else {
      setPhase(PHASE.REFRAME);
    }
  }

  async function finish() {
    await logSession(participantCode, {
      module: 'MoodBridge',
      preMood: selectedMood?.value,
      bodyFeelings,
      groundingCompleted: Object.keys(groundingAnswers).length,
      reframeSelected: selectedReframe?.thought || null,
    });
    setPhase(PHASE.DONE);
  }

  if (phase === PHASE.CHECKIN) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>🌊 MoodBridge</Text>
        <Text style={styles.headline}>Emotional regulation</Text>
        <View style={styles.goalBox}>
          <Text style={styles.goalLabel}>WHAT YOU'LL GAIN</Text>
          <Text style={styles.goalText}>With practice, I'll stop letting a bad mood wreck my whole day — I'll have real tools to reset</Text>
        </View>
        <Text style={styles.label}>How are you feeling right now?</Text>
        <View style={styles.moodRow}>
          {MOODS.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[styles.moodButton, selectedMood?.value === m.value && styles.moodSelected]}
              onPress={() => setSelectedMood(m)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
              <Text style={styles.moodLabel}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedMood && (
          <>
            <Text style={styles.label}>In your body, you notice: <Text style={styles.labelSub}>(tap all that apply)</Text></Text>
            <View style={styles.feelingGrid}>
              {BODY_FEELINGS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.feelingChip, bodyFeelings.includes(f) && styles.feelingChipSelected]}
                  onPress={() => toggleBodyFeeling(f)}
                >
                  <Text style={[styles.feelingChipText, bodyFeelings.includes(f) && styles.feelingChipTextSelected]}>
                    {f}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
      <TouchableOpacity
        style={[styles.button, !selectedMood && styles.buttonDisabled]}
        onPress={() => {
          if (selectedMood?.value <= 2) {
            setPhase(PHASE.GROUNDING);
          } else {
            setPhase(PHASE.REFRAME);
          }
        }}
        disabled={!selectedMood}
      >
        <Text style={styles.buttonText}>
          {selectedMood?.value <= 2 ? 'Try grounding first →' : 'Next →'}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.GROUNDING) {
    const step = GROUNDING_STEPS[groundingStep];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>🌊 Grounding · {groundingStep + 1} / {GROUNDING_STEPS.length}</Text>
          <Text style={styles.headline}>5-4-3-2-1 Grounding</Text>
          <View style={styles.stepBubble}>
            <Text style={styles.stepNum}>{step.num}</Text>
          </View>
          <Text style={styles.body}>{step.prompt}</Text>
          <TextInput
            style={styles.groundingInput}
            placeholder={`Type what you ${step.sense}…`}
            placeholderTextColor={colors.textLight}
            value={groundingInput}
            onChangeText={setGroundingInput}
            multiline
            autoFocus
          />
        </View>
        <TouchableOpacity
          style={[styles.button, !groundingInput.trim() && styles.buttonDisabled]}
          onPress={nextGrounding}
          disabled={!groundingInput.trim()}
        >
          <Text style={styles.buttonText}>
            {groundingStep + 1 < GROUNDING_STEPS.length ? 'Next →' : 'Done grounding →'}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === PHASE.REFRAME) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>🌊 Reframe</Text>
        <Text style={styles.headline}>Flip the script</Text>
        <Text style={styles.body}>Any of these sound familiar?</Text>
        {REFRAMES.map((r, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.reframeCard, selectedReframe?.thought === r.thought && styles.reframeCardSelected]}
            onPress={() => setSelectedReframe(r)}
          >
            <Text style={styles.reframeThought}>"{r.thought}"</Text>
            {selectedReframe?.thought === r.thought && (
              <View style={styles.reframeAnswer}>
                <Text style={styles.reframeAnswerText}>→ {r.reframe}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={finish}>
        <Text style={styles.buttonText}>Finish session →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.DONE) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>🌊 MoodBridge — Complete</Text>
        <Text style={styles.headline}>Nice work</Text>
        <Text style={styles.body}>
          Noticing your emotions and body sensations is the first step in regulating them.
          That's real skill — and I just practiced it.
        </Text>
        <View style={styles.toolkitBox}>
          <Text style={styles.toolkitTitle}>Your regulation toolkit:</Text>
          {toolkitItems.map(item => (
            <Text key={item} style={styles.toolkitItem}>• {item}</Text>
          ))}
          <Text style={styles.toolkitNote}>Tap the 🌊 button anytime from any screen to access these.</Text>
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
        <Text style={styles.buttonText}>Done ✓</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 16 },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 12 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  labelSub: { fontWeight: '400', color: colors.textLight, fontSize: 14 },
  goalBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1.5, borderColor: colors.primary },
  goalLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  moodButton: { alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', flex: 1, marginHorizontal: 3, backgroundColor: '#fff' },
  moodSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  moodEmoji: { fontSize: 26, marginBottom: 4 },
  moodLabel: { fontSize: 10, color: colors.textLight, textAlign: 'center' },
  feelingGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  feelingChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#E0E0E0', backgroundColor: '#fff' },
  feelingChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  feelingChipText: { fontSize: 13, color: colors.textLight },
  feelingChipTextSelected: { color: '#fff', fontWeight: '600' },
  stepBubble: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  stepNum: { fontSize: 36, fontWeight: '900', color: '#fff' },
  groundingInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, backgroundColor: '#fff', minHeight: 80, marginTop: 12 },
  reframeCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 16, marginBottom: 10 },
  reframeCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  reframeThought: { fontSize: 15, color: colors.text, fontStyle: 'italic' },
  reframeAnswer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderColor: '#E0E0E0' },
  reframeAnswerText: { fontSize: 14, color: colors.primary, lineHeight: 22 },
  toolkitBox: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#EBEBEB', marginTop: 8 },
  toolkitTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 10 },
  toolkitItem: { fontSize: 14, color: colors.textLight, paddingVertical: 3 },
  toolkitNote: { fontSize: 12, color: colors.primary, marginTop: 10, fontStyle: 'italic' },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
