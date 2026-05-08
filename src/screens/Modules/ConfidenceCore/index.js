import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput } from 'react-native';
import { logSession } from '../../../services/logger';
import { useStore } from '../../../store';
import { colors } from '../../../theme';

const PHASE = { INTRO: 'intro', WIN: 'win', MODEL: 'model', REWRITE: 'rewrite', FUEL: 'fuel', DONE: 'done' };

const MODELS = [
  {
    name: 'Jordan',
    condition: 'ADHD',
    story: "Jordan couldn't finish a single assignment on time freshman year. Teachers kept saying 'you\'re smart, just try harder.' That wasn\'t the problem. Junior year, Jordan learned to break assignments into 15-minute chunks and set phone alarms. Grades went from Ds to Bs in one semester.",
    lesson: "The strategy changed, not the brain.",
  },
  {
    name: 'Maya',
    condition: 'Autism + ADHD',
    story: "Maya felt invisible in group projects — she\'d go quiet while everyone else took over. She started writing her ideas down first and sharing them in a chat before meetings. Now her ideas get heard every time.",
    lesson: "The method changed, not the person.",
  },
  {
    name: 'Alex',
    condition: 'Dyslexia',
    story: "Alex read slower than everyone and felt ashamed. But Alex discovered text-to-speech and audiobooks. Finished 12 books last year — more than anyone in the class. Same brain, different tool.",
    lesson: "Working with your brain beats fighting it.",
  },
];

const LABELS = [
  { neg: "I'm lazy.", pos: "My brain initiates tasks differently. That's neurological, not a character flaw." },
  { neg: "I'm not smart.", pos: "Intelligence looks different in neurodivergent brains. Standardized systems weren't built for us." },
  { neg: "I can't focus.", pos: "My attention works differently — often intensely on things I care about." },
  { neg: "I'm a mess.", pos: "I'm managing a brain that works hard in a world not designed for it." },
  { neg: "Everyone's better than me.", pos: "I'm comparing my behind-the-scenes to everyone else's highlights." },
];

export default function ConfidenceCore({ navigation }) {
  const { participantCode, weeklyWins, addWin } = useStore(s => ({
    participantCode: s.participantCode,
    weeklyWins: s.weeklyWins || [],
    addWin: s.addWin || (() => {}),
  }));

  const [phase, setPhase] = useState(PHASE.INTRO);
  const [win, setWin] = useState('');
  const [modelIndex] = useState(Math.floor(Math.random() * MODELS.length));
  const [selectedLabel, setSelectedLabel] = useState(null);

  async function finish() {
    if (win.trim()) addWin({ text: win, date: new Date().toISOString().split('T')[0] });
    await logSession(participantCode, {
      module: 'ConfidenceCore',
      winLogged: win.trim().length > 0,
      labelReframed: selectedLabel?.neg || null,
    });
    setPhase(PHASE.DONE);
  }

  if (phase === PHASE.INTRO) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.moduleTag}>⚡ ConfidenceCore</Text>
        <Text style={styles.headline}>Self-efficacy</Text>
        <Text style={styles.body}>
          Self-efficacy isn't about being perfect. It's about believing I'm capable of getting better.
        </Text>
        <Text style={styles.body}>
          Neurodivergent teens consistently underestimate their own abilities. This module works against that.
        </Text>
        <View style={styles.outline}>
          <Text style={styles.outlineItem}>⚡ Name a win from today</Text>
          <Text style={styles.outlineItem}>👀 See how someone like you grew</Text>
          <Text style={styles.outlineItem}>🔄 Rewrite a negative label</Text>
          <Text style={styles.outlineItem}>🔥 Reframe stress as fuel</Text>
        </View>
        <View style={styles.goalBox}>
          <Text style={styles.goalLabel}>WHAT YOU'LL GAIN</Text>
          <Text style={styles.goalText}>With practice, I'll stop giving up when things get hard — I'll have proof that I can figure it out</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.button} onPress={() => setPhase(PHASE.WIN)}>
        <Text style={styles.buttonText}>Start →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.WIN) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.moduleTag}>⚡ Exercise 1 / 4</Text>
        <Text style={styles.headline}>Name a win</Text>
        <Text style={styles.body}>
          What's one thing I did today that was hard — even if imperfect?
        </Text>
        <Text style={styles.hint}>
          It counts if you showed up. It counts if you tried. It counts if you survived.
        </Text>
        <TextInput
          style={styles.winInput}
          placeholder="e.g. I started my homework even though I didn't want to…"
          placeholderTextColor={colors.textLight}
          value={win}
          onChangeText={setWin}
          multiline
          autoFocus
        />
        {weeklyWins.length > 0 && (
          <View style={styles.winArchive}>
            <Text style={styles.winArchiveTitle}>Your recent wins:</Text>
            {weeklyWins.slice(-3).map((w, i) => (
              <Text key={i} style={styles.winArchiveItem}>• {w.text}</Text>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={[styles.button, !win.trim() && styles.buttonDisabled]}
        onPress={() => setPhase(PHASE.MODEL)}
        disabled={!win.trim()}
      >
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.MODEL) {
    const model = MODELS[modelIndex];
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>⚡ Exercise 2 / 4</Text>
          <Text style={styles.headline}>Someone like you</Text>
          <Text style={styles.body}>This is a story about a teen with {model.condition}.</Text>
          <View style={styles.storyCard}>
            <Text style={styles.storyName}>{model.name}</Text>
            <Text style={styles.storyText}>{model.story}</Text>
            <View style={styles.lessonBox}>
              <Text style={styles.lessonText}>"{model.lesson}"</Text>
            </View>
          </View>
          <Text style={styles.body}>
            These aren't exceptional success stories. This is what consistent, realistic effort looks like.
          </Text>
        </ScrollView>
        <TouchableOpacity style={styles.button} onPress={() => setPhase(PHASE.REWRITE)}>
          <Text style={styles.buttonText}>Next →</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (phase === PHASE.REWRITE) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>⚡ Exercise 3 / 4</Text>
        <Text style={styles.headline}>Rewrite the label</Text>
        <Text style={styles.body}>Tap any that I've thought about myself. See the reframe.</Text>
        {LABELS.map((l, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.labelCard, selectedLabel?.neg === l.neg && styles.labelCardSelected]}
            onPress={() => setSelectedLabel(selectedLabel?.neg === l.neg ? null : l)}
          >
            <Text style={styles.labelNeg}>"{l.neg}"</Text>
            {selectedLabel?.neg === l.neg && (
              <View style={styles.labelPos}>
                <Text style={styles.labelPosText}>→ {l.pos}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={() => setPhase(PHASE.FUEL)}>
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.FUEL) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>⚡ Exercise 4 / 4</Text>
        <Text style={styles.headline}>Anxiety as fuel</Text>
        <Text style={styles.body}>
          Here's something true: the nervous feeling before a test and the excited feeling before something fun use the exact same body chemicals.
        </Text>
        <View style={styles.scienceBox}>
          <Text style={styles.scienceTitle}>The science:</Text>
          <Text style={styles.scienceText}>
            Researchers at Harvard found that people who told themselves "I'm excited" before a stressful task performed significantly better than people who tried to calm down.
          </Text>
          <Text style={styles.scienceText}>
            The energy is there. The label is the variable.
          </Text>
        </View>
        <Text style={styles.body}>Next time you feel that nervous buzz — try saying:</Text>
        <View style={styles.affirmBox}>
          <Text style={styles.affirmText}>"This energy means I care. I can use it."</Text>
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.button} onPress={finish}>
        <Text style={styles.buttonText}>Finish session →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  if (phase === PHASE.DONE) return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.moduleTag}>⚡ ConfidenceCore — Complete</Text>
        <Text style={styles.headline}>Session saved</Text>
        {win.trim() && (
          <View style={styles.winSaved}>
            <Text style={styles.winSavedLabel}>Today's win:</Text>
            <Text style={styles.winSavedText}>"{win}"</Text>
            <Text style={styles.winSavedNote}>Added to your win archive.</Text>
          </View>
        )}
        <Text style={styles.body}>
          Self-efficacy is built through exactly this: showing up, naming effort, and not letting your brain erase your progress.
        </Text>
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
  hint: { fontSize: 14, color: colors.primary, fontStyle: 'italic', marginBottom: 16 },
  goalBox: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1.5, borderColor: colors.primary },
  goalLabel: { fontSize: 10, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 4 },
  goalText: { fontSize: 15, fontWeight: '700', color: colors.text },
  outline: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 8, borderWidth: 1, borderColor: '#EBEBEB' },
  outlineItem: { fontSize: 15, color: colors.text, paddingVertical: 2 },
  winInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: colors.text, backgroundColor: '#fff', minHeight: 90, marginBottom: 16 },
  winArchive: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 14 },
  winArchiveTitle: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  winArchiveItem: { fontSize: 13, color: colors.primary, paddingVertical: 2 },
  storyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 16 },
  storyName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  storyText: { fontSize: 15, color: colors.textLight, lineHeight: 24, marginBottom: 14 },
  lessonBox: { backgroundColor: colors.primaryLight, borderRadius: 8, padding: 12 },
  lessonText: { fontSize: 14, color: colors.primary, fontStyle: 'italic', textAlign: 'center' },
  labelCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 14, marginBottom: 8 },
  labelCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  labelNeg: { fontSize: 15, color: colors.text, fontStyle: 'italic' },
  labelPos: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#E0E0E0' },
  labelPosText: { fontSize: 14, color: colors.primary, lineHeight: 22 },
  scienceBox: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 16 },
  scienceTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  scienceText: { fontSize: 14, color: colors.textLight, lineHeight: 22, marginBottom: 6 },
  affirmBox: { backgroundColor: colors.primary, borderRadius: 14, padding: 20, alignItems: 'center' },
  affirmText: { fontSize: 18, color: '#fff', fontWeight: '700', textAlign: 'center', lineHeight: 28 },
  winSaved: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  winSavedLabel: { fontSize: 12, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  winSavedText: { fontSize: 16, color: colors.text, fontStyle: 'italic', marginBottom: 6 },
  winSavedNote: { fontSize: 12, color: colors.primary },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
