import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

const PHASE = { CATCH: 'catch', CHECK: 'check', REFRAME: 'reframe', DONE: 'done' };
const ACCENT       = '#37474F';
const ACCENT_LIGHT = '#ECEFF1';

const THOUGHT_TYPES = [
  { id: 'stupid',   label: 'I am stupid / cannot do this',       emoji: '😔' },
  { id: 'judged',   label: 'Everyone thinks badly of me',         emoji: '👀' },
  { id: 'broken',   label: 'I am broken / different / wrong',     emoji: '💔' },
  { id: 'fail',     label: 'I will fail / mess this up',          emoji: '📉' },
  { id: 'belong',   label: 'I do not belong / no one likes me',   emoji: '🚪' },
  { id: 'hopeless', label: 'Things will never get better',        emoji: '🌧' },
  { id: 'other',    label: 'Something else',                      emoji: '💭' },
];

const BELIEF_LABELS = ['', 'Not really', 'A little', 'Somewhat', 'Strongly', 'Completely'];

export default function ThoughtCheck({ navigation }) {
  const colors = useColors();
  const { addThoughtCheckSession } = useStore(s => ({
    addThoughtCheckSession: s.addThoughtCheckSession,
  }));

  const [phase,         setPhase]        = useState(PHASE.CATCH);
  const [thoughtType,   setThoughtType]  = useState(null);
  const [thoughtText,   setThoughtText]  = useState('');
  const [beliefBefore,  setBeliefBefore] = useState(null);
  const [factAnswer,    setFactAnswer]   = useState('');
  const [friendAnswer,  setFriendAnswer] = useState('');
  const [againstAnswer, setAgainstAnswer]= useState('');
  const [reframe,       setReframe]      = useState('');
  const [beliefAfter,   setBeliefAfter]  = useState(null);

  function finish() {
    addThoughtCheckSession({
      date: new Date().toISOString(),
      thoughtType,
      thoughtText:    thoughtText.trim(),
      beliefBefore,
      factAnswer:     factAnswer.trim(),
      friendAnswer:   friendAnswer.trim(),
      againstAnswer:  againstAnswer.trim(),
      reframe:        reframe.trim(),
      beliefAfter,
      beliefShift:    beliefBefore && beliefAfter ? beliefBefore - beliefAfter : null,
    });
    setPhase(PHASE.DONE);
  }

  const checkComplete = factAnswer.trim() || friendAnswer.trim() || againstAnswer.trim();

  // ── CATCH ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.CATCH) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🧠</Text>
          <Text style={[styles.title, { color: colors.text }]}>Catch the thought.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            We cannot challenge a thought we have not named. Pick the one closest to what is in our head.
          </Text>

          <View style={styles.typeList}>
            {THOUGHT_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeRow,
                  { borderColor:     thoughtType === t.id ? ACCENT : colors.border,
                    backgroundColor: thoughtType === t.id ? ACCENT : colors.surface },
                ]}
                onPress={() => setThoughtType(t.id)}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, { color: thoughtType === t.id ? '#fff' : colors.text }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {thoughtType && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                Write it out exactly as it sounds in our head:
              </Text>
              <TextInput
                style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder='"I am going to fail the exam and everyone will know..."'
                placeholderTextColor={colors.textLight}
                value={thoughtText}
                onChangeText={setThoughtText}
                multiline
              />

              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                How much do we believe this right now?
              </Text>
              <View style={styles.beliefRow}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.beliefBtn,
                      { borderColor:     beliefBefore === n ? ACCENT : colors.border,
                        backgroundColor: beliefBefore === n ? ACCENT : colors.surface }]}
                    onPress={() => setBeliefBefore(n)}
                  >
                    <Text style={[styles.beliefNum, { color: beliefBefore === n ? '#fff' : colors.text }]}>{n}</Text>
                    <Text style={[styles.beliefText, { color: beliefBefore === n ? '#CFD8DC' : colors.textLight }]}>
                      {BELIEF_LABELS[n]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: thoughtType && beliefBefore ? ACCENT : '#CCC' }]}
            onPress={thoughtType && beliefBefore ? () => setPhase(PHASE.CHECK) : null}
          >
            <Text style={styles.primaryBtnText}>Check the thought →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CHECK ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.CHECK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>CHECK THE STORY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Three questions.</Text>

          <View style={[styles.thoughtDisplay, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.thoughtDisplayText, { color: ACCENT }]}>
              "{thoughtText || THOUGHT_TYPES.find(t => t.id === thoughtType)?.label}"
            </Text>
          </View>

          <Text style={[styles.qLabel, { color: ACCENT }]}>1 / 3</Text>
          <Text style={[styles.q, { color: colors.text }]}>
            What actually happened — just the facts, no story?
          </Text>
          <TextInput
            style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Strip away the interpretation. What literally happened?"
            placeholderTextColor={colors.textLight}
            value={factAnswer}
            onChangeText={setFactAnswer}
            multiline
          />

          <Text style={[styles.qLabel, { color: ACCENT }]}>2 / 3</Text>
          <Text style={[styles.q, { color: colors.text }]}>
            What would we say to a friend who had this exact thought?
          </Text>
          <TextInput
            style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="We are usually kinder to friends than to ourselves..."
            placeholderTextColor={colors.textLight}
            value={friendAnswer}
            onChangeText={setFriendAnswer}
            multiline
          />

          <Text style={[styles.qLabel, { color: ACCENT }]}>3 / 3</Text>
          <Text style={[styles.q, { color: colors.text }]}>
            Is there anything that does NOT fit this thought?
          </Text>
          <TextInput
            style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Even one small piece of evidence against it..."
            placeholderTextColor={colors.textLight}
            value={againstAnswer}
            onChangeText={setAgainstAnswer}
            multiline
          />

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: checkComplete ? ACCENT : '#CCC' }]}
            onPress={checkComplete ? () => setPhase(PHASE.REFRAME) : null}
          >
            <Text style={styles.primaryBtnText}>Write the reframe →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── REFRAME ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.REFRAME) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={2} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>REFRAME</Text>
          <Text style={[styles.title, { color: colors.text }]}>Build a balanced thought.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Not a fake positive. A more accurate version that includes the full picture.
          </Text>

          {/* Show their check answers as a prompt */}
          <View style={[styles.evidenceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {factAnswer.trim() ? (
              <Text style={[styles.evidenceLine, { color: colors.textLight }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Facts: </Text>
                {factAnswer.trim()}
              </Text>
            ) : null}
            {friendAnswer.trim() ? (
              <Text style={[styles.evidenceLine, { color: colors.textLight }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Friend view: </Text>
                {friendAnswer.trim()}
              </Text>
            ) : null}
            {againstAnswer.trim() ? (
              <Text style={[styles.evidenceLine, { color: colors.textLight }]}>
                <Text style={{ fontWeight: '700', color: colors.text }}>Against it: </Text>
                {againstAnswer.trim()}
              </Text>
            ) : null}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            Now write a more balanced thought:
          </Text>
          <TextInput
            style={[styles.textBox, { backgroundColor: colors.surface, borderColor: reframe.trim() ? ACCENT : colors.border, color: colors.text }]}
            placeholder='"Even if I struggle with this, it does not mean I am broken..."'
            placeholderTextColor={colors.textLight}
            value={reframe}
            onChangeText={setReframe}
            multiline
          />

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            How much do we believe the original thought now?
          </Text>
          <View style={styles.beliefRow}>
            {[1,2,3,4,5].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.beliefBtn,
                  { borderColor:     beliefAfter === n ? ACCENT : colors.border,
                    backgroundColor: beliefAfter === n ? ACCENT : colors.surface }]}
                onPress={() => setBeliefAfter(n)}
              >
                <Text style={[styles.beliefNum, { color: beliefAfter === n ? '#fff' : colors.text }]}>{n}</Text>
                <Text style={[styles.beliefText, { color: beliefAfter === n ? '#CFD8DC' : colors.textLight }]}>
                  {BELIEF_LABELS[n]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {beliefBefore && beliefAfter && beliefAfter < beliefBefore && (
            <View style={[styles.shiftCard, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
              <Text style={styles.shiftText}>
                Belief dropped from {beliefBefore} → {beliefAfter}.
                That shift is the whole point. The thought is not gone — it has less power.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: reframe.trim() && beliefAfter ? ACCENT : '#CCC' }]}
            onPress={reframe.trim() && beliefAfter ? finish : null}
          >
            <Text style={styles.primaryBtnText}>Save  +50 XP →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    const shift = beliefBefore && beliefAfter ? beliefBefore - beliefAfter : 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🧩</Text>
          <Text style={[styles.title, { color: colors.text }]}>Thought checked.  +50 XP</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            {shift > 0
              ? `Belief dropped ${shift} point${shift > 1 ? 's' : ''}. That is the skill — not eliminating the thought, reducing its grip.`
              : 'Named, examined, reframed. The thought has less room now.'}
          </Text>
          <View style={[styles.reframeDisplay, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.reframeDisplayLabel, { color: ACCENT }]}>OUR REFRAME</Text>
            <Text style={[styles.reframeDisplayText, { color: '#263238' }]}>"{reframe}"</Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Back to app →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 48 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  heroEmoji:    { fontSize: 52, textAlign: 'center', marginBottom: 12, marginTop: 4 },
  phaseTag:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title:        { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub:          { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 6 },

  typeList: { gap: 8, marginBottom: 20 },
  typeRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14 },
  typeEmoji:{ fontSize: 20 },
  typeLabel:{ fontSize: 14, fontWeight: '600', flex: 1 },

  textBox: { borderRadius: 12, borderWidth: 1.5, padding: 14, fontSize: 14, minHeight: 72, textAlignVertical: 'top', marginBottom: 16 },

  beliefRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  beliefBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 10 },
  beliefNum: { fontSize: 16, fontWeight: '900' },
  beliefText:{ fontSize: 9, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  thoughtDisplay:     { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  thoughtDisplayText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic', fontWeight: '600' },

  qLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  q:      { fontSize: 15, fontWeight: '700', marginBottom: 10, lineHeight: 22 },

  evidenceCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16, gap: 6 },
  evidenceLine: { fontSize: 13, lineHeight: 20 },

  shiftCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  shiftText: { fontSize: 13, lineHeight: 20, color: '#1B5E20', fontStyle: 'italic' },

  reframeDisplay:      { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 28, width: '100%' },
  reframeDisplayLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  reframeDisplayText:  { fontSize: 15, lineHeight: 24, fontStyle: 'italic', fontWeight: '600' },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginTop: 16, padding: 8 },
  backLinkText:   { fontSize: 13 },
});
