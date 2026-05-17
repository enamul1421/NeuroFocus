import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

// FlexSwitch: Stroop + task-switch hybrid.
// A word is shown in a color. Current RULE tells whether to tap the WORD or the INK COLOR.
// After 5 correct, rule switches silently. Measures switch cost (accuracy drop after switch).

const PHASE = { INTRO: 'intro', PLAY: 'play', RESULT: 'result' };
const ACCENT       = '#00695C';
const ACCENT_LIGHT = '#E0F2F1';
const TOTAL_TRIALS = 20;
const TRIALS_PER_RULE = 5;

const COLORS = [
  { id: 'red',   label: 'RED',   hex: '#E53935' },
  { id: 'blue',  label: 'BLUE',  hex: '#1E88E5' },
  { id: 'green', label: 'GREEN', hex: '#43A047' },
  { id: 'purple',label: 'PURPLE',hex: '#8E24AA' },
];

function randomColor(exclude) {
  const pool = COLORS.filter(c => c.id !== exclude?.id);
  return pool[Math.floor(Math.random() * pool.length)];
}

function makeTrial(rule) {
  const word = randomColor(null);
  const ink  = randomColor(word);            // always different — creates conflict
  const correct = rule === 'word' ? word.id : ink.id;
  return { word, ink, correct };
}

export default function FlexSwitch({ navigation }) {
  const colors = useColors();
  const { addFlexSwitchSession } = useStore(s => ({
    addFlexSwitchSession: s.addFlexSwitchSession,
  }));

  const [phase,       setPhase]      = useState(PHASE.INTRO);
  const [rule,        setRule]       = useState('word');   // 'word' | 'color'
  const [trial,       setTrial]      = useState(null);
  const [trialIdx,    setTrialIdx]   = useState(0);
  const [results,     setResults]    = useState([]);       // { correct, switchTrial }
  const [feedback,    setFeedback]   = useState(null);     // 'correct' | 'wrong'
  const [justSwitched,setJustSwitched]=useState(false);

  const feedbackTimer = useRef(null);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);

  function startGame() {
    const firstRule = 'word';
    setRule(firstRule);
    setTrial(makeTrial(firstRule));
    setTrialIdx(0);
    setResults([]);
    setFeedback(null);
    setJustSwitched(false);
    setPhase(PHASE.PLAY);
  }

  function handleTap(colorId) {
    if (feedback) return; // debounce during feedback flash
    const isCorrect   = colorId === trial.correct;
    const isSwitchTrial = justSwitched;

    const newResults = [...results, { correct: isCorrect, switchTrial: isSwitchTrial }];
    setResults(newResults);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setJustSwitched(false);

    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      const nextIdx = trialIdx + 1;

      if (nextIdx >= TOTAL_TRIALS) {
        finishGame(newResults);
        return;
      }

      // Switch rule every TRIALS_PER_RULE trials
      let nextRule = rule;
      let switched = false;
      if ((nextIdx % TRIALS_PER_RULE) === 0) {
        nextRule = rule === 'word' ? 'color' : 'word';
        switched = true;
      }

      setRule(nextRule);
      setTrial(makeTrial(nextRule));
      setTrialIdx(nextIdx);
      setJustSwitched(switched);
    }, 500);
  }

  function finishGame(finalResults) {
    const total        = finalResults.length;
    const correct      = finalResults.filter(r => r.correct).length;
    const switchTrials = finalResults.filter(r => r.switchTrial);
    const nonSwitch    = finalResults.filter(r => !r.switchTrial);
    const switchAcc    = switchTrials.length
      ? Math.round((switchTrials.filter(r => r.correct).length / switchTrials.length) * 100)
      : 100;
    const nonSwitchAcc = nonSwitch.length
      ? Math.round((nonSwitch.filter(r => r.correct).length / nonSwitch.length) * 100)
      : 100;
    const switchCost   = nonSwitchAcc - switchAcc; // positive = worse on switch trials

    addFlexSwitchSession({
      date:          new Date().toISOString(),
      totalTrials:   total,
      accuracy:      Math.round((correct / total) * 100),
      switchAccuracy: switchAcc,
      switchCost,
    });

    setPhase(PHASE.RESULT);
  }

  const overallAcc    = results.length ? Math.round(results.filter(r => r.correct).length / results.length * 100) : 0;
  const switchTrials  = results.filter(r => r.switchTrial);
  const nonSwitch     = results.filter(r => !r.switchTrial);
  const switchAcc     = switchTrials.length ? Math.round(switchTrials.filter(r => r.correct).length / switchTrials.length * 100) : null;
  const switchCost    = switchAcc !== null ? (Math.round(nonSwitch.filter(r => r.correct).length / Math.max(nonSwitch.length, 1) * 100)) - switchAcc : null;

  // ── INTRO ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🔀</Text>
          <Text style={[styles.title, { color: colors.text }]}>FlexSwitch</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            A word appears in a color. We follow a rule — but the rule switches without warning.
          </Text>

          <View style={[styles.ruleDemo, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.ruleDemoTitle, { color: ACCENT }]}>Rule: TAP THE WORD</Text>
            <Text style={styles.ruleDemoWord}>
              <Text style={{ color: '#E53935', fontWeight: '900', fontSize: 32 }}>BLUE</Text>
            </Text>
            <Text style={[styles.ruleDemoAns, { color: colors.textLight }]}>→ Tap BLUE (the word), not the red color</Text>

            <Text style={[styles.ruleDemoTitle, { color: ACCENT, marginTop: 16 }]}>Rule: TAP THE COLOR</Text>
            <Text style={styles.ruleDemoWord}>
              <Text style={{ color: '#E53935', fontWeight: '900', fontSize: 32 }}>BLUE</Text>
            </Text>
            <Text style={[styles.ruleDemoAns, { color: colors.textLight }]}>→ Tap RED (the ink color), not the word</Text>
          </View>

          <Text style={[styles.note, { color: colors.textLight }]}>
            Rule switches every 5 trials — no warning. {TOTAL_TRIALS} trials total.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
            onPress={startGame}
          >
            <Text style={styles.primaryBtnText}>Start →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── PLAY ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.PLAY && trial) {
    const bgColor = feedback === 'correct' ? '#1B5E20'
      : feedback === 'wrong'   ? '#B71C1C'
      : colors.background;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
        <SessionProgress current={trialIdx} total={TOTAL_TRIALS} color={ACCENT} />
        <View style={styles.center}>

          <View style={[styles.ruleTag, { backgroundColor: ACCENT }]}>
            <Text style={styles.ruleTagText}>
              TAP THE {rule === 'word' ? 'WORD' : 'COLOR'}
            </Text>
          </View>

          {justSwitched && (
            <View style={styles.switchAlert}>
              <Text style={styles.switchAlertText}>⚡ RULE SWITCHED</Text>
            </View>
          )}

          <Text style={[styles.stimWord, { color: trial.ink.hex }]}>
            {trial.word.label}
          </Text>

          <View style={styles.responseGrid}>
            {COLORS.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.responseBtn, { backgroundColor: c.hex }]}
                onPress={() => handleTap(c.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.responseBtnText}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.trialCount, { color: feedback ? '#fff' : colors.textLight }]}>
            {trialIdx + 1} / {TOTAL_TRIALS}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.RESULT) {
    const switchCostFinal = switchCost ?? 0;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🔀</Text>
          <Text style={[styles.title, { color: colors.text }]}>Done</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={[styles.statValue, { color: ACCENT }]}>{overallAcc}%</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>Overall accuracy</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={[styles.statValue, { color: ACCENT }]}>{switchAcc ?? '—'}%</Text>
              <Text style={[styles.statLabel, { color: colors.textLight }]}>After switch</Text>
            </View>
          </View>

          <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.insightText, { color: colors.text }]}>
              {switchCostFinal <= 5
                ? '🎯 Switch cost very low — our brain adapts fast. Strong cognitive flexibility.'
                : switchCostFinal <= 15
                ? '📊 Small switch cost — normal. Flexibility builds with practice.'
                : '🔀 High switch cost — rules changes are hard right now. That is exactly what this trains.'}
            </Text>
            {switchCostFinal > 0 && (
              <Text style={[styles.insightSub, { color: colors.textLight }]}>
                Switch cost: {switchCostFinal} pts accuracy drop after rule change
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
            onPress={startGame}
          >
            <Text style={styles.primaryBtnText}>Play again →</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textLight }]}>Done  +50 XP</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  heroEmoji: { fontSize: 52, marginBottom: 12 },
  title:     { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub:       { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  note:      { fontSize: 12, textAlign: 'center', marginBottom: 24 },

  ruleDemo:      { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20, width: '100%', alignItems: 'center' },
  ruleDemoTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  ruleDemoWord:  { marginVertical: 4 },
  ruleDemoAns:   { fontSize: 13, marginTop: 4 },

  ruleTag:     { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, marginBottom: 16 },
  ruleTagText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 1 },

  switchAlert:     { backgroundColor: '#FF6F00', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12 },
  switchAlertText: { color: '#fff', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },

  stimWord:     { fontSize: 64, fontWeight: '900', marginVertical: 32, letterSpacing: 2 },

  responseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 },
  responseBtn:  { width: 120, paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  responseBtnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  trialCount: { fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20, width: '100%' },
  statBox:  { flex: 1, borderRadius: 14, borderWidth: 1, padding: 16, alignItems: 'center' },
  statValue:{ fontSize: 28, fontWeight: '900' },
  statLabel:{ fontSize: 12, marginTop: 2, textAlign: 'center' },

  insightCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24, width: '100%' },
  insightText: { fontSize: 14, lineHeight: 22, fontWeight: '600' },
  insightSub:  { fontSize: 12, marginTop: 6 },

  primaryBtn:      { borderRadius: 14, padding: 18, alignItems: 'center', width: '100%', marginTop: 4 },
  primaryBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn:    { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', marginTop: 10, width: '100%' },
  secondaryBtnText:{ fontSize: 15, fontWeight: '600' },
  backLink:        { alignItems: 'center', marginTop: 14, padding: 8 },
  backLinkText:    { fontSize: 13 },
});
