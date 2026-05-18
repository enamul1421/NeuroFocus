import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SpeakButton from '../../../components/SpeakButton';

// QuietMode — shutdown response for autism.
// Physiologically opposite to meltdown: dorsal vagal freeze state.
// Response: reduce all input, zero demands, wait, gentle return.
// Language is ultra-low-demand throughout — no "let's", no timers that feel like pressure.

const PHASE  = { RECOGNIZE: 'recognize', QUIET: 'quiet', WAIT: 'wait', RETURN: 'return', DONE: 'done' };
const ACCENT = '#455A64';
const ACCENT_LIGHT = '#ECEFF1';

const SIGNS = [
  { id: 'silent',  label: 'Going silent — words feel impossible' },
  { id: 'numb',    label: 'Feeling numb or disconnected' },
  { id: 'freeze',  label: 'Cannot move or respond' },
  { id: 'hide',    label: 'Need to disappear or be alone' },
  { id: 'blank',   label: 'Mind has gone blank' },
  { id: 'too_much',label: 'Everything is just too much' },
];

const QUIET_STEPS = [
  { emoji: '📵', text: 'Phone face down or away. Screens off if possible.' },
  { emoji: '💡', text: 'Dim the lights or close the blinds if you can.' },
  { emoji: '🎧', text: 'Headphones in — silence, white noise, or familiar music.' },
  { emoji: '🚪', text: 'Find a quieter space if you can move there safely.' },
  { emoji: '🧥', text: 'Something soft or weighted nearby if that helps.' },
];

export default function QuietMode({ navigation }) {
  const colors = useColors();
  const { addQuietModeLog } = useStore(s => ({ addQuietModeLog: s.addQuietModeLog }));

  const [phase,    setPhase]   = useState(PHASE.RECOGNIZE);
  const [signs,    setSigns]   = useState([]);
  const [waitSec,  setWaitSec] = useState(null); // null = not started
  const [waitDone, setWaitDone]= useState(false);

  const timerRef = useRef(null);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function toggleSign(id) {
    setSigns(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function startWait(minutes) {
    const secs = minutes * 60;
    setWaitSec(secs);
    timerRef.current = setInterval(() => {
      setWaitSec(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setWaitDone(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function finish() {
    addQuietModeLog({
      date:  new Date().toISOString(),
      signs,
    });
    setPhase(PHASE.DONE);
  }

  // ── RECOGNIZE ────────────────────────────────────────────────────────────────
  if (phase === PHASE.RECOGNIZE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0F14' }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🌑</Text>
          <Text style={styles.darkTitle}>Something shut us down.</Text>
          <Text style={styles.darkSub}>
            That is okay. The brain does this to protect itself.
            We are not broken. We just need quiet.
          </Text>
          <SpeakButton text="That is okay. The brain does this to protect itself. We are not broken. We are not lazy. We just need quiet right now. Let us take it one breath at a time." style={{ marginBottom: 12 }} />

          <Text style={styles.darkLabel}>What is happening right now?</Text>
          <Text style={styles.darkHint}>Tap anything that fits. Or just tap one.</Text>

          <View style={styles.signList}>
            {SIGNS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.signBtn,
                  signs.includes(s.id) && { backgroundColor: '#263238', borderColor: '#546E7A' },
                ]}
                onPress={() => toggleSign(s.id)}
              >
                <Text style={[styles.signText, signs.includes(s.id) && { color: '#B0BEC5' }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.quietBtn, { opacity: signs.length > 0 ? 1 : 0.4 }]}
            onPress={signs.length > 0 ? () => setPhase(PHASE.QUIET) : null}
          >
            <Text style={styles.quietBtnText}>Take me somewhere quiet →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={styles.backLinkTextDark}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── QUIET ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.QUIET) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0F14' }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🌫️</Text>
          <Text style={styles.darkTitle}>Reduce the input.</Text>
          <Text style={styles.darkSub}>
            No rush. Do whichever of these is possible right now.
          </Text>

          {QUIET_STEPS.map((step, i) => (
            <View key={i} style={styles.quietStep}>
              <Text style={styles.quietStepEmoji}>{step.emoji}</Text>
              <Text style={styles.quietStepText}>{step.text}</Text>
            </View>
          ))}

          <View style={styles.noDemandsCard}>
            <Text style={styles.noDemandsText}>
              No one needs a response right now.{'\n'}
              No explanation is required.{'\n'}
              There is nothing to fix in this moment.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.quietBtn}
            onPress={() => setPhase(PHASE.WAIT)}
          >
            <Text style={styles.quietBtnText}>We are somewhere quiet →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── WAIT ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.WAIT) {
    const mins = waitSec !== null ? Math.floor(waitSec / 60) : null;
    const secs = waitSec !== null ? waitSec % 60 : null;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0F14' }]}>
        <View style={styles.center}>
          {waitSec === null ? (
            <>
              <Text style={styles.darkTitle}>We are here with you.</Text>
              <Text style={styles.darkSub}>
                The brain needs time to come back from this.
                There is no deadline. When ready — tap a timer or just rest.
              </Text>
              <TouchableOpacity style={styles.timerChoice} onPress={() => startWait(10)}>
                <Text style={styles.timerChoiceText}>10 minutes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.timerChoice} onPress={() => startWait(20)}>
                <Text style={styles.timerChoiceText}>20 minutes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.timerChoice, { opacity: 0.5 }]} onPress={() => setPhase(PHASE.RETURN)}>
                <Text style={styles.timerChoiceText}>Skip — already feeling better</Text>
              </TouchableOpacity>
            </>
          ) : waitDone ? (
            <>
              <Text style={styles.darkTitle}>Time has passed.</Text>
              <Text style={styles.darkSub}>
                When ready — no rush — we can take one small step.
              </Text>
              <TouchableOpacity style={styles.quietBtn} onPress={() => setPhase(PHASE.RETURN)}>
                <Text style={styles.quietBtnText}>When ready →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.waitCountdown}>
                {mins}:{String(secs).padStart(2, '0')}
              </Text>
              <Text style={styles.darkSub}>We are here. Nothing is required of us.</Text>
              <TouchableOpacity
                style={[styles.timerChoice, { opacity: 0.4, marginTop: 32 }]}
                onPress={() => { clearInterval(timerRef.current); setPhase(PHASE.RETURN); }}
              >
                <Text style={styles.timerChoiceText}>Ready now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── RETURN ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.RETURN) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0D1A14' }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🌱</Text>
          <Text style={styles.darkTitle}>One small step.</Text>
          <Text style={styles.darkSub}>
            No need to explain where we went or what happened.
            Just one tiny thing to come back gently.
          </Text>

          {[
            { emoji: '👣', text: 'Notice one thing we can feel — the floor, our clothes, the air.' },
            { emoji: '👁',  text: 'Find one object and look at it for 5 seconds.' },
            { emoji: '💧', text: 'Drink a small amount of water.' },
            { emoji: '🌬', text: 'One slow breath out.' },
          ].map((s, i) => (
            <View key={i} style={styles.returnStep}>
              <Text style={styles.returnEmoji}>{s.emoji}</Text>
              <Text style={styles.returnText}>{s.text}</Text>
            </View>
          ))}

          <TouchableOpacity style={styles.quietBtn} onPress={finish}>
            <Text style={styles.quietBtnText}>Done →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#0A0F14' }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🌑</Text>
          <Text style={styles.darkTitle}>We came back.</Text>
          <Text style={styles.darkSub}>
            The brain needed to protect itself and we let it.
            That is not failure. That is self-awareness.
          </Text>
          <TouchableOpacity
            style={[styles.quietBtn, { width: '100%', marginTop: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.quietBtnText}>Back to app →</Text>
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

  heroEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 14, marginTop: 4 },
  darkTitle: { fontSize: 24, fontWeight: '900', color: '#ECEFF1', textAlign: 'center', marginBottom: 8 },
  darkSub:   { fontSize: 14, color: '#78909C', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  darkLabel: { fontSize: 15, fontWeight: '700', color: '#B0BEC5', marginBottom: 6 },
  darkHint:  { fontSize: 12, color: '#546E7A', marginBottom: 16 },

  signList: { gap: 8, marginBottom: 24 },
  signBtn:  { borderRadius: 12, borderWidth: 1, borderColor: '#263238', padding: 14 },
  signText: { fontSize: 14, color: '#546E7A', fontWeight: '500' },

  quietBtn:     { borderRadius: 12, borderWidth: 1, borderColor: '#546E7A', padding: 16, alignItems: 'center', marginTop: 8 },
  quietBtnText: { color: '#B0BEC5', fontSize: 15, fontWeight: '700' },

  quietStep:      { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  quietStepEmoji: { fontSize: 22, marginTop: 1 },
  quietStepText:  { flex: 1, fontSize: 14, color: '#78909C', lineHeight: 22 },

  noDemandsCard: { borderRadius: 12, borderWidth: 1, borderColor: '#263238', backgroundColor: '#0D1520', padding: 16, marginBottom: 24 },
  noDemandsText: { fontSize: 14, color: '#546E7A', lineHeight: 26, textAlign: 'center' },

  timerChoice:     { borderRadius: 12, borderWidth: 1, borderColor: '#37474F', padding: 16, alignItems: 'center', marginBottom: 10, width: '100%' },
  timerChoiceText: { color: '#78909C', fontSize: 15 },
  waitCountdown:   { fontSize: 80, fontWeight: '900', color: '#ECEFF1', lineHeight: 88 },

  returnStep:  { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 16 },
  returnEmoji: { fontSize: 20, marginTop: 2 },
  returnText:  { flex: 1, fontSize: 14, color: '#80CBC4', lineHeight: 22 },

  backLink:        { alignItems: 'center', marginTop: 16, padding: 8 },
  backLinkTextDark:{ fontSize: 13, color: '#546E7A' },
});
