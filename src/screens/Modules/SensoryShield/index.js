import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

const PHASE = {
  MODE:    'mode',    // avoid vs seek
  TRIGGER: 'trigger', TOOLKIT: 'toolkit', BREATHE: 'breathe',
  SEEK:    'seek',    // seeking needs picker
  SEEK_TOOLS: 'seek_tools',
};

const SEEKING_NEEDS = [
  { id: 'movement', label: 'Need to move — body feels restless',    emoji: '🏃' },
  { id: 'pressure', label: 'Need something heavy or firm',          emoji: '💪' },
  { id: 'oral',     label: 'Need to chew or fidget with my mouth',  emoji: '👄' },
  { id: 'sound',    label: 'Need more sound or rhythm',             emoji: '🎵' },
  { id: 'tactile',  label: 'Need something to touch or squeeze',    emoji: '✋' },
];

const SEEKING_TOOLKIT = {
  movement: [
    { emoji: '🏃', label: 'Walk, jump, or shake',     desc: 'Any movement for 60 seconds. Even shaking hands discharges restlessness.' },
    { emoji: '🔄', label: 'Rock or sway',              desc: 'Chair rocking or swaying activates the vestibular system — calming and alerting.' },
  ],
  pressure: [
    { emoji: '🤗', label: 'Deep pressure — squeeze yourself', desc: 'Firm hug around your own arms. Weighted blanket if available.' },
    { emoji: '👊', label: 'Push against a wall',       desc: '10 seconds of firm pushing. Proprioceptive input regulates fast.' },
  ],
  oral: [
    { emoji: '🍬', label: 'Chew something',            desc: 'Gum, chewy food, or a chew tool. Jaw movement is regulating.' },
    { emoji: '🥤', label: 'Drink through a straw',     desc: 'The sucking motion activates the oral-motor system.' },
  ],
  sound: [
    { emoji: '🎵', label: 'Rhythm or bass — volume up',desc: 'Music with a strong beat. Fill the space with sound.' },
    { emoji: '🎤', label: 'Hum or sing',               desc: 'Making sound vibrates the vagus nerve. Regulating in 30 seconds.' },
  ],
  tactile: [
    { emoji: '🧴', label: 'Handle something textured', desc: 'Rough, bumpy, or satisfying texture. Stress ball, fabric, anything.' },
    { emoji: '💧', label: 'Warm water on hands',       desc: 'Warm (not cold) when we need more input, not less.' },
  ],
};
const ACCENT       = '#6A1B9A';
const ACCENT_LIGHT = '#F3E5F5';

const TRIGGERS = [
  { id: 'sound',   label: 'Sound / noise',           emoji: '🔊' },
  { id: 'light',   label: 'Light / brightness',       emoji: '💡' },
  { id: 'touch',   label: 'Touch / texture / clothing', emoji: '🤚' },
  { id: 'crowd',   label: 'Crowds / too many people', emoji: '👥' },
  { id: 'smell',   label: 'Smell / strong scent',    emoji: '👃' },
  { id: 'chaos',   label: 'Too much happening at once', emoji: '🌪' },
];

const TOOLKIT = {
  sound: [
    { emoji: '🎧', label: 'Put on headphones',         desc: 'Music, white noise, or just silence. Block the input.' },
    { emoji: '🚶', label: 'Move to a quieter space',   desc: 'Hallway, bathroom, outside — anywhere quieter.' },
    { emoji: '🎵', label: 'Hum quietly to yourself',   desc: 'Vibration from humming calms the nervous system.' },
  ],
  light: [
    { emoji: '😎', label: 'Sunglasses or shade',       desc: 'Step outside or find a dimmer spot.' },
    { emoji: '📱', label: 'Dim screen brightness',     desc: 'All the way down — reduce all light input.' },
    { emoji: '👁', label: 'Close eyes for 30 seconds', desc: 'Dark + stillness. Let the visual overwhelm pass.' },
  ],
  touch: [
    { emoji: '🤗', label: 'Deep pressure — hug yourself', desc: 'Firm hug around your own arms. Activates calm response.' },
    { emoji: '🧥', label: 'Remove the irritant',       desc: 'Tag, seam, sleeve — take it off or adjust it.' },
    { emoji: '💧', label: 'Cold water on hands',       desc: 'Grounding through a different, neutral sensation.' },
  ],
  crowd: [
    { emoji: '🚪', label: 'Find an exit',              desc: 'Step outside for 2 minutes. Permission granted.' },
    { emoji: '🧱', label: 'Stand near a wall',         desc: 'Reduces people on all sides — less overwhelm.' },
    { emoji: '🎧', label: 'Headphones in',             desc: 'Signals "not available" — cuts social demand.' },
  ],
  smell: [
    { emoji: '💨', label: 'Get to fresh air',          desc: 'Outside or by an open window.' },
    { emoji: '👃', label: 'Breathe through mouth',     desc: 'Bypasses the smell while you move away.' },
    { emoji: '🍃', label: 'Mint or familiar scent',    desc: 'A known neutral scent can reset the system.' },
  ],
  chaos: [
    { emoji: '🎯', label: 'Pick one thing to look at', desc: 'Find an object and focus only on it for 10 seconds.' },
    { emoji: '✋', label: '5–4–3–2–1 grounding',       desc: '5 things seen, 4 heard, 3 felt, 2 smelled, 1 tasted.' },
    { emoji: '🚶', label: 'Leave and return',          desc: '2 minutes out. Come back when input is manageable.' },
  ],
};

export default function SensoryShield({ navigation }) {
  const colors = useColors();
  const { addSensoryLog } = useStore(s => ({ addSensoryLog: s.addSensoryLog }));

  const [phase,        setPhase]       = useState(PHASE.MODE);
  const [selected,     setSelected]    = useState([]);
  const [intensity,    setIntensity]   = useState(null);
  const [seekNeeds,    setSeekNeeds]   = useState([]);

  function toggleTrigger(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  function goToolkit() {
    addSensoryLog({
      date:      new Date().toISOString(),
      triggers:  selected,
      intensity,
    });
    setPhase(PHASE.TOOLKIT);
  }

  // Gather tools for all selected triggers, dedupe by label
  const tools = selected.flatMap(id => TOOLKIT[id] || []);
  const uniqueTools = tools.filter((t, i) => tools.findIndex(u => u.label === t.label) === i);

  function toggleSeekNeed(id) {
    setSeekNeeds(prev => prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]);
  }

  const seekTools = seekNeeds.flatMap(id => SEEKING_TOOLKIT[id] || []);
  const uniqueSeekTools = seekTools.filter((t, i) => seekTools.findIndex(u => u.label === t.label) === i);

  // ── MODE SELECT ───────────────────────────────────────────────────────────────
  if (phase === PHASE.MODE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🛡️</Text>
          <Text style={[styles.title, { color: colors.text }]}>SensoryShield</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            What is our sensory experience right now?
          </Text>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: '#F3E5F5', borderColor: ACCENT + '60' }]}
            onPress={() => setPhase(PHASE.TRIGGER)}
          >
            <Text style={styles.modeEmoji}>🔇</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: ACCENT }]}>Too much</Text>
              <Text style={[styles.modeSub, { color: colors.textLight }]}>
                Overwhelmed — need to reduce input
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, { backgroundColor: '#FFF8E1', borderColor: '#F57F17' + '60' }]}
            onPress={() => setPhase(PHASE.SEEK)}
          >
            <Text style={styles.modeEmoji}>📢</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modeTitle, { color: '#E65100' }]}>Not enough</Text>
              <Text style={[styles.modeSub, { color: colors.textLight }]}>
                Under-stimulated — need more input
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── SEEK NEEDS ────────────────────────────────────────────────────────────────
  if (phase === PHASE.SEEK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>📢</Text>
          <Text style={[styles.title, { color: colors.text }]}>What does the body need?</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Tap everything that fits.
          </Text>

          <View style={styles.triggerGrid}>
            {SEEKING_NEEDS.map(n => (
              <TouchableOpacity
                key={n.id}
                style={[
                  styles.triggerCard,
                  { borderColor:     seekNeeds.includes(n.id) ? '#E65100' : colors.border,
                    backgroundColor: seekNeeds.includes(n.id) ? '#E65100' : colors.surface },
                ]}
                onPress={() => toggleSeekNeed(n.id)}
              >
                <Text style={styles.triggerEmoji}>{n.emoji}</Text>
                <Text style={[styles.triggerLabel, { color: seekNeeds.includes(n.id) ? '#fff' : colors.text }]}>
                  {n.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: seekNeeds.length > 0 ? '#E65100' : '#CCC' }]}
            onPress={seekNeeds.length > 0 ? () => setPhase(PHASE.SEEK_TOOLS) : null}
          >
            <Text style={styles.primaryBtnText}>Show me what helps →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => setPhase(PHASE.MODE)}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SEEK TOOLKIT ──────────────────────────────────────────────────────────────
  if (phase === PHASE.SEEK_TOOLS) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: '#E65100' }]}>INPUT TOOLKIT</Text>
          <Text style={[styles.title, { color: colors.text }]}>Add the input.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Pick the one most accessible right now.
          </Text>

          {uniqueSeekTools.map((tool, i) => (
            <View key={i} style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toolLabel, { color: colors.text }]}>{tool.label}</Text>
                <Text style={[styles.toolDesc, { color: colors.textLight }]}>{tool.desc}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.noteCard, { backgroundColor: '#FFF8E1', borderColor: '#FFD54F' }]}>
            <Text style={[styles.noteText, { color: '#E65100' }]}>
              💡 Under-stimulation is real. The brain is asking for input to regulate — giving it what it needs is not distraction, it is self-regulation.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: '#E65100' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Done →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TRIGGER ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.TRIGGER) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🛡️</Text>
          <Text style={[styles.title, { color: colors.text }]}>What is overwhelming us?</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Tap everything that is hitting us right now.
          </Text>

          <View style={styles.triggerGrid}>
            {TRIGGERS.map(t => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.triggerCard,
                  { borderColor: selected.includes(t.id) ? ACCENT : colors.border,
                    backgroundColor: selected.includes(t.id) ? ACCENT : colors.surface },
                ]}
                onPress={() => toggleTrigger(t.id)}
              >
                <Text style={styles.triggerEmoji}>{t.emoji}</Text>
                <Text style={[styles.triggerLabel, { color: selected.includes(t.id) ? '#fff' : colors.text }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            How overwhelming is it? (1 = mild  ·  5 = shutting down)
          </Text>
          <View style={styles.intensityRow}>
            {[1,2,3,4,5].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.intensityBtn,
                  { backgroundColor: intensity === n ? ACCENT : colors.surface,
                    borderColor: intensity === n ? ACCENT : colors.border }]}
                onPress={() => setIntensity(n)}
              >
                <Text style={[styles.intensityNum, { color: intensity === n ? '#fff' : colors.text }]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: selected.length > 0 && intensity ? ACCENT : '#CCC' }]}
            onPress={selected.length > 0 && intensity ? goToolkit : null}
          >
            <Text style={styles.primaryBtnText}>Show me what helps →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── TOOLKIT ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.TOOLKIT) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>TOOLKIT</Text>
          <Text style={[styles.title, { color: colors.text }]}>Try one of these.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Pick the one most accessible right now.
          </Text>

          {uniqueTools.map((tool, i) => (
            <View
              key={i}
              style={[styles.toolCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.toolLabel, { color: colors.text }]}>{tool.label}</Text>
                <Text style={[styles.toolDesc, { color: colors.textLight }]}>{tool.desc}</Text>
              </View>
            </View>
          ))}

          <View style={[styles.noteCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.noteText, { color: '#4A148C' }]}>
              💡 You do not need to power through. Reducing input IS the skill. Leaving is not weakness.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
            onPress={() => setPhase(PHASE.BREATHE)}
          >
            <Text style={styles.primaryBtnText}>One quick breath →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textLight }]}>I am okay now — done</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── BREATHE ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.BREATHE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0D0015' }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 64, marginBottom: 24 }}>🫁</Text>
          <Text style={styles.breatheTitle}>Box breath</Text>
          <Text style={styles.breatheStep}>In — 4 counts</Text>
          <Text style={styles.breatheStep}>Hold — 4 counts</Text>
          <Text style={styles.breatheStep}>Out — 4 counts</Text>
          <Text style={styles.breatheStep}>Hold — 4 counts</Text>
          <Text style={styles.breatheNote}>Do this twice. Then we are done.</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%', marginTop: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Done  →</Text>
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
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  modeCard:  { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1.5, padding: 18, marginBottom: 14, width: '100%' },
  modeEmoji: { fontSize: 30 },
  modeTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  modeSub:   { fontSize: 13, lineHeight: 20 },

  phaseTag:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title:        { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub:          { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },

  triggerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  triggerCard: { width: '47%', borderRadius: 14, borderWidth: 1.5, padding: 14, alignItems: 'center' },
  triggerEmoji:{ fontSize: 28, marginBottom: 6 },
  triggerLabel:{ fontSize: 13, fontWeight: '700', textAlign: 'center' },

  intensityRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  intensityBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 12 },
  intensityNum: { fontSize: 18, fontWeight: '900' },

  toolCard:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 10 },
  toolEmoji: { fontSize: 26, marginTop: 2 },
  toolLabel: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  toolDesc:  { fontSize: 13, lineHeight: 20 },

  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  noteText:  { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  breatheTitle: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 24, textAlign: 'center' },
  breatheStep:  { fontSize: 18, color: '#CE93D8', fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  breatheNote:  { fontSize: 13, color: '#888', marginTop: 16, textAlign: 'center' },

  primaryBtn:      { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  primaryBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn:    { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', marginTop: 10 },
  secondaryBtnText:{ fontSize: 15, fontWeight: '600' },
  backLink:        { alignItems: 'center', marginTop: 16, padding: 8 },
  backLinkText:    { fontSize: 13 },
});
