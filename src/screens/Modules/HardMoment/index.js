import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

// HardMoment: emotional pain from criticism, rejection, or perceived failure.
// Evidence base: Barkley DESR, Neff self-compassion, reappraisal literature.
// Framed as separating event from interpretation, then grounding in evidence of worth.

const PHASE = { NAME: 'name', SEPARATE: 'separate', GROUND: 'ground', DONE: 'done' };
const ACCENT       = '#1A237E';
const ACCENT_LIGHT = '#E8EAF6';

const STING_TYPES = [
  { id: 'criticism', label: 'Someone criticised or corrected us',       emoji: '🗣️' },
  { id: 'rejection', label: 'We were left out or turned down',          emoji: '🚪' },
  { id: 'failure',   label: 'We failed or did badly at something',      emoji: '📉' },
  { id: 'comparison',label: 'We felt less than someone else',           emoji: '⚖️' },
  { id: 'ignored',   label: 'We felt invisible or unimportant',         emoji: '😶' },
  { id: 'mistake',   label: 'We made a mistake in front of others',     emoji: '😬' },
];

const GROUND_OPTIONS = [
  { id: 'person',   prompt: 'One person who genuinely cares about us:' },
  { id: 'strength', prompt: 'One thing we are actually good at:' },
  { id: 'moment',   prompt: 'One time we handled something hard:' },
];

export default function HardMoment({ navigation }) {
  const colors = useColors();
  const { addHardMomentSession, trustedAdultName } = useStore(s => ({
    addHardMomentSession: s.addHardMomentSession,
    trustedAdultName:     s.trustedAdultName || '',
  }));

  const [phase,       setPhase]      = useState(PHASE.NAME);
  const [stingType,   setStingType]  = useState(null);
  const [stingText,   setStingText]  = useState('');
  const [painLevel,   setPainLevel]  = useState(null);
  const [whatHappened,setWhatHap]    = useState('');
  const [whatStory,   setWhatStory]  = useState('');
  const [grounds,     setGrounds]    = useState({ person: '', strength: '', moment: '' });
  const [compassion,  setCompassion] = useState('');

  function setGround(key, val) {
    setGrounds(prev => ({ ...prev, [key]: val }));
  }

  const separateComplete = whatHappened.trim() || whatStory.trim();
  const groundComplete   = Object.values(grounds).some(v => v.trim()) || compassion.trim();

  function finish() {
    addHardMomentSession({
      date:         new Date().toISOString(),
      stingType,
      stingText:    stingText.trim(),
      painLevel,
      whatHappened: whatHappened.trim(),
      whatStory:    whatStory.trim(),
      grounds,
      compassion:   compassion.trim(),
    });
    setPhase(PHASE.DONE);
  }

  // ── NAME ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.NAME) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>💙</Text>
          <Text style={[styles.title, { color: colors.text }]}>Something stung.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            That pain is real. We are not overreacting — our brain is wired to feel this intensely.
            Let us look at it together.
          </Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>What happened?</Text>
          <View style={styles.typeList}>
            {STING_TYPES.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.typeRow,
                  { borderColor:     stingType === t.id ? ACCENT : colors.border,
                    backgroundColor: stingType === t.id ? ACCENT : colors.surface },
                ]}
                onPress={() => setStingType(t.id)}
              >
                <Text style={styles.typeEmoji}>{t.emoji}</Text>
                <Text style={[styles.typeLabel, { color: stingType === t.id ? '#fff' : colors.text }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {stingType && (
            <>
              <TextInput
                style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Tell us what happened, as much or as little as we want..."
                placeholderTextColor={colors.textLight}
                value={stingText}
                onChangeText={setStingText}
                multiline
              />

              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                How much does it hurt right now? (1 = a little  ·  5 = overwhelming)
              </Text>
              <View style={styles.painRow}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.painBtn,
                      { borderColor:     painLevel === n ? ACCENT : colors.border,
                        backgroundColor: painLevel === n ? ACCENT : colors.surface }]}
                    onPress={() => setPainLevel(n)}
                  >
                    <Text style={[styles.painNum, { color: painLevel === n ? '#fff' : colors.text }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: stingType && painLevel ? ACCENT : '#CCC' }]}
            onPress={stingType && painLevel ? () => setPhase(PHASE.SEPARATE) : null}
          >
            <Text style={styles.primaryBtnText}>Look at it clearly →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SEPARATE ─────────────────────────────────────────────────────────────────
  if (phase === PHASE.SEPARATE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>SEPARATE EVENT FROM STORY</Text>
          <Text style={[styles.title, { color: colors.text }]}>What happened vs. what it means.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Our brain writes a story instantly — usually the harshest possible version. Let us pull the two apart.
          </Text>

          <View style={[styles.infoCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.infoText, { color: '#1A237E' }]}>
              <Text style={{ fontWeight: '900' }}>Event:</Text> what literally happened — facts only{'\n'}
              <Text style={{ fontWeight: '900' }}>Story:</Text> the meaning our brain added — the "therefore I am..."
            </Text>
          </View>

          <Text style={[styles.q, { color: colors.text }]}>
            What literally happened — stripped of interpretation?
          </Text>
          <TextInput
            style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder='"They did not reply to my message." Not: they hate me.'
            placeholderTextColor={colors.textLight}
            value={whatHappened}
            onChangeText={setWhatHap}
            multiline
          />

          <Text style={[styles.q, { color: colors.text }]}>
            What story did our brain add — the "therefore I am..."?
          </Text>
          <TextInput
            style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder='"Therefore I am unlikeable / a failure / not good enough..."'
            placeholderTextColor={colors.textLight}
            value={whatStory}
            onChangeText={setWhatStory}
            multiline
          />

          {whatStory.trim() && (
            <View style={[styles.challengeCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.challengeTitle, { color: colors.text }]}>
                Is that story the only explanation?
              </Text>
              <Text style={[styles.challengeText, { color: colors.textLight }]}>
                One event almost never means what the first story says. Other explanations usually exist —
                even if the pain makes them hard to see right now.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: separateComplete ? ACCENT : '#CCC' }]}
            onPress={separateComplete ? () => setPhase(PHASE.GROUND) : null}
          >
            <Text style={styles.primaryBtnText}>Ground ourselves →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── GROUND ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.GROUND) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={2} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>GROUND IN EVIDENCE</Text>
          <Text style={[styles.title, { color: colors.text }]}>Anchor ourselves.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            One painful moment does not define us. Let us remind ourselves of the evidence that contradicts the story.
          </Text>

          {GROUND_OPTIONS.map(opt => (
            <View key={opt.id} style={[styles.groundCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.groundPrompt, { color: colors.text }]}>{opt.prompt}</Text>
              <TextInput
                style={[styles.groundInput, { borderColor: grounds[opt.id].trim() ? ACCENT : colors.border, color: colors.text, backgroundColor: colors.background }]}
                placeholder="Write anything — even something small counts..."
                placeholderTextColor={colors.textLight}
                value={grounds[opt.id]}
                onChangeText={val => setGround(opt.id, val)}
              />
            </View>
          ))}

          <View style={[styles.groundCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.groundPrompt, { color: colors.text }]}>
              What would we say to ourselves with the same kindness we would give a friend?
            </Text>
            <TextInput
              style={[styles.textBox, { borderColor: compassion.trim() ? ACCENT : colors.border, color: colors.text, backgroundColor: colors.background }]}
              placeholder='"You are going through something hard. That does not make you..."'
              placeholderTextColor={colors.textLight}
              value={compassion}
              onChangeText={setCompassion}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: groundComplete ? ACCENT : '#CCC' }]}
            onPress={groundComplete ? finish : null}
          >
            <Text style={styles.primaryBtnText}>Done  +55 XP →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>💙</Text>
          <Text style={[styles.title, { color: colors.text }]}>We stayed with it.  +55 XP</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            The pain was real. We did not let it write the whole story. That is self-compassion in practice.
          </Text>
          <View style={[styles.infoCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40', width: '100%' }]}>
            <Text style={[styles.infoText, { color: '#1A237E' }]}>
              Our brain is wired to feel rejection and criticism intensely — this is not a flaw.
              The skill is separating the event from the story, and choosing which story to act on.
            </Text>
          </View>
          {painLevel >= 4 && trustedAdultName ? (
            <View style={[styles.trustCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={[styles.trustText, { color: '#1A237E' }]}>
                This was a heavy one. If it is still sitting with us —
                {' '}<Text style={{ fontWeight: '900' }}>{trustedAdultName}</Text>{' '}
                is someone we can talk to.
              </Text>
            </View>
          ) : null}

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
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },

  typeList:  { gap: 8, marginBottom: 16 },
  typeRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14 },
  typeEmoji: { fontSize: 20 },
  typeLabel: { fontSize: 14, fontWeight: '600', flex: 1 },

  textBox: { borderRadius: 12, borderWidth: 1.5, padding: 14, fontSize: 14, minHeight: 72, textAlignVertical: 'top', marginBottom: 16 },

  painRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  painBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 14 },
  painNum: { fontSize: 18, fontWeight: '900' },

  infoCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  infoText:  { fontSize: 13, lineHeight: 22 },

  q: { fontSize: 15, fontWeight: '700', marginBottom: 10, lineHeight: 22 },

  challengeCard:  { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  challengeTitle: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  challengeText:  { fontSize: 13, lineHeight: 20 },

  groundCard:   { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 12 },
  groundPrompt: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  groundInput:  { borderRadius: 10, borderWidth: 1.5, padding: 12, fontSize: 14 },

  trustCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20, width: '100%' },
  trustText: { fontSize: 14, lineHeight: 22 },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginTop: 16, padding: 8 },
  backLinkText:   { fontSize: 13 },
});
