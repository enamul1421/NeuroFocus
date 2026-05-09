import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, Animated,
} from 'react-native';
import BodyDiagram from '../../../components/BodyDiagram';
import { useStore } from '../../../store';
import { colors } from '../../../theme';
import { logSession } from '../../../services/logger';

// ── Data ──────────────────────────────────────────────────────────────────────

const EMOJIS = [
  { score: 1, icon: '😞', label: 'Really rough' },
  { score: 2, icon: '😕', label: 'Not great' },
  { score: 3, icon: '😐', label: 'So-so' },
  { score: 4, icon: '🙂', label: 'Pretty good' },
  { score: 5, icon: '😄', label: 'Great' },
];

const WORD_CLUSTERS = {
  1: ['overwhelmed', 'hopeless', 'heartbroken', 'drained', 'defeated', 'stuck'],
  2: ['frustrated', 'anxious', 'sad', 'irritated', 'disappointed', 'lonely'],
  3: ['tired', 'bored', 'flat', 'unmotivated', 'meh', 'zoned out'],
  4: ['calm', 'hopeful', 'content', 'relieved', 'proud', 'focused'],
  5: ['excited', 'happy', 'energized', 'grateful', 'confident', 'pumped'],
};

const VALIDATIONS = {
  1: 'These are some of the hardest feelings. You noticed them — that takes courage.',
  2: 'Tough feelings are more common with ADHD. You\'re not alone in this.',
  3: 'Sometimes so-so is where we are. That\'s okay — let\'s see if we can shift it.',
  4: 'Nice. This is a good place to build from.',
  5: 'Great to hear. A quick exercise can help lock this in.',
};

const WORD_TO_EXERCISE = {
  // 😞 Really rough
  overwhelmed: 'grounding',   // flooding → anchor to present
  hopeless:    'reappraisal', // negative spiral → shift perspective
  heartbroken: 'labeling',    // grief → name it first, don't rush to reframe
  drained:     'bodyscan',    // physical depletion → somatic reset
  defeated:    'reappraisal', // self-critical loop → challenge the framing
  stuck:       'bodyscan',    // physical tension of stuck-ness → release, then move
  // 😕 Not great
  frustrated:   'breathing',   // high arousal → calm nervous system
  anxious:      'breathing',   // physiological anxiety → regulate breath
  sad:          'labeling',    // process the emotion
  irritated:    'breathing',   // arousal → calm
  disappointed: 'reappraisal', // expectation gap → reframe
  lonely:       'labeling',    // complex emotion → name and locate it
  // 😐 So-so
  tired:        'bodyscan',    // physical fatigue → somatic reset
  bored:        'labeling',    // ADHD boredom often masks frustration/anxiety — surface it
  flat:         'bodyscan',    // numbness/dissociation → body awareness to reconnect
  unmotivated:  'reappraisal', // challenge the "I can't" thinking
  meh:          'grounding',   // disconnected → sensory grounding re-engages
  'zoned out':  'grounding',   // dissociation → present-moment anchor
  // 🙂 Pretty good
  calm:     'breathing', hopeful:  'labeling', content:  'bodyscan',
  relieved: 'breathing', proud:    'labeling', focused:  'bodyscan',
  // 😄 Great
  excited:    'bodyscan',  happy:     'labeling', energized: 'breathing',
  grateful:   'labeling',  confident: 'labeling', pumped:    'breathing',
};

const EXERCISES = {
  breathing:   { icon: '🌬️', label: 'Box Breathing',        desc: 'Slow your nervous system with a 4-4-4-4 breath cycle' },
  grounding:   { icon: '🌍', label: '5-4-3-2-1 Grounding',  desc: 'Anchor yourself to the present moment through your senses' },
  labeling:    { icon: '🏷️', label: 'Emotion Labeling',     desc: 'Name what you feel — naming it tames it' },
  reappraisal: { icon: '🔄', label: 'Positive Reappraisal', desc: 'Shift how you look at what\'s stressing you' },
  bodyscan:    { icon: '🧘', label: 'Body Scan',             desc: 'Scan your body for tension and breathe it out' },
};

const GROUNDING_STEPS = [
  { n: 5, sense: 'see',   prompt: 'Look around. Name 5 things you can see right now.' },
  { n: 4, sense: 'feel',  prompt: 'Name 4 things you can physically feel — your clothes, the floor, the air.' },
  { n: 3, sense: 'hear',  prompt: 'Name 3 things you can hear right now.' },
  { n: 2, sense: 'smell', prompt: 'Name 2 things you can smell — or notice the absence of smell.' },
  { n: 1, sense: 'taste', prompt: 'Name 1 thing you can taste right now.' },
];

const BODY_REGIONS = [
  { id: 'head',      label: 'Head & mind',    prompt: 'Notice your head and jaw. Any clenching or buzzing? Take a breath and let it soften.' },
  { id: 'shoulders', label: 'Shoulders',      prompt: 'Notice your shoulders. Are they raised or tight? Let them drop on the exhale.' },
  { id: 'chest',     label: 'Chest & heart',  prompt: 'Notice your chest. Is your breathing shallow or full? Take a slow, deep breath.' },
  { id: 'stomach',   label: 'Stomach',        prompt: 'Notice your stomach. Any knots or tightness? Breathe into this area.' },
  { id: 'arms',      label: 'Hands & arms',   prompt: 'Notice your hands. Are they clenched? Open your palms and let them relax.' },
  { id: 'legs',      label: 'Feet & legs',    prompt: 'Notice your feet. Press them gently into the floor. Feel grounded.' },
];

const REAPPRAISAL_PROMPTS = [
  'What\'s stressing you right now? (Just a few words is fine)',
  'What\'s one thing that could go okay about this situation?',
  'Would this still matter a year from now?',
  'What would you tell a close friend who was going through this?',
];

const BREATHING_PHASES = [
  { label: 'Breathe in',  duration: 4000, scale: 1.7, color: '#5B5EA6' },
  { label: 'Hold',        duration: 4000, scale: 1.7, color: '#7B61FF' },
  { label: 'Breathe out', duration: 4000, scale: 1.0, color: '#4CAF50' },
  { label: 'Hold',        duration: 4000, scale: 1.0, color: '#9E9E9E' },
];
const BREATHING_CYCLES = 6;
const BODY_SCAN_REGION_MS = 22000;

// ── Phase constants ───────────────────────────────────────────────────────────

const P = {
  PRE_EMOJI: 'pre_emoji', PRE_WORD: 'pre_word', SAFETY: 'safety',
  FRAMING: 'framing', EX_SELECT: 'ex_select', EXERCISE: 'exercise',
  POST_EMOJI: 'post_emoji', POST_WORD: 'post_word', RESULTS: 'results',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function MoodBridge({ navigation }) {
  const { addMoodBridgeSession, moodBridgeSessions, participantCode } =
    useStore(s => ({
      addMoodBridgeSession: s.addMoodBridgeSession,
      moodBridgeSessions:   s.moodBridgeSessions || [],
      participantCode:      s.participantCode,
    }));

  const [phase,         setPhase]         = useState(P.PRE_EMOJI);
  const [preScore,      setPreScore]       = useState(null);
  const [preWord,       setPreWord]        = useState(null);
  const [postScore,     setPostScore]      = useState(null);
  const [postWord,      setPostWord]       = useState(null);
  const [exercise,      setExercise]       = useState(null);
  const [exStep,        setExStep]         = useState(0);     // step within exercise
  const [exInputs,      setExInputs]       = useState([]);    // text inputs (reappraisal)
  const [breathCycle,    setBreathCycle]    = useState(0);
  const [breathPhaseIdx, setBreathPhaseIdx] = useState(0);
  const [bodyRegionIdx, setBodyRegionIdx]  = useState(0);
  const [labelWords,    setLabelWords]     = useState([]);
  const [labelBody,     setLabelBody]      = useState(null);
  const [hasSupportCkd, setHasSupportCkd] = useState(false);

  const breathAnim  = useRef(new Animated.Value(1.0)).current;
  const scanAnim    = useRef(new Animated.Value(1)).current;  // timer bar
  const timerRef    = useRef(null);
  const countRef    = useRef(null);

  // cleanup
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearInterval(countRef.current);
  }, []);

  // ── Breathing animation ────────────────────────────────────────────────────

  function runBreathing(cycle = 0, phaseIdx = 0) {
    if (cycle >= BREATHING_CYCLES) {
      setPhase(P.POST_EMOJI);
      return;
    }
    const bp = BREATHING_PHASES[phaseIdx];
    setBreathCycle(cycle);
    setBreathPhaseIdx(phaseIdx);

    Animated.timing(breathAnim, {
      toValue: bp.scale, duration: bp.duration, useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      const nextPhase = (phaseIdx + 1) % BREATHING_PHASES.length;
      const nextCycle = nextPhase === 0 ? cycle + 1 : cycle;
      runBreathing(nextCycle, nextPhase);
    }, bp.duration);
  }

  function startBreathing() {
    breathAnim.setValue(1.0);
    runBreathing(0, 0);
  }

  // ── Body scan timer ────────────────────────────────────────────────────────

  function startBodyScan() {
    setBodyRegionIdx(0);
    scanAnim.setValue(1);
    runBodyRegion(0);
  }

  function runBodyRegion(idx) {
    if (idx >= BODY_REGIONS.length) {
      setPhase(P.POST_EMOJI);
      return;
    }
    setBodyRegionIdx(idx);
    scanAnim.setValue(1);
    Animated.timing(scanAnim, {
      toValue: 0, duration: BODY_SCAN_REGION_MS, useNativeDriver: false,
    }).start();
    timerRef.current = setTimeout(() => runBodyRegion(idx + 1), BODY_SCAN_REGION_MS);
  }

  // ── Start exercise ─────────────────────────────────────────────────────────

  function startExercise(ex) {
    setExercise(ex);
    setExStep(0);
    setExInputs([]);
    setLabelWords([]);
    setLabelBody(null);
    setPhase(P.EXERCISE);
    if (ex === 'breathing') startBreathing();
    if (ex === 'bodyscan')  startBodyScan();
  }

  // ── Finish session ─────────────────────────────────────────────────────────

  function finishSession(ps, pw) {
    const session = {
      date: new Date().toISOString(),
      preScore, preWord, postScore: ps, postWord: pw,
      delta: ps - preScore,
      exercise, hasSupportChecked: hasSupportCkd,
    };
    addMoodBridgeSession(session);
    logSession(participantCode, { module: 'MoodBridge', ...session });
    setPostScore(ps);
    setPostWord(pw);
    setPhase(P.RESULTS);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDERS
  // ─────────────────────────────────────────────────────────────────────────

  // ── Pre/Post emoji check ───────────────────────────────────────────────────
  const isPost = phase === P.POST_EMOJI;
  if (phase === P.PRE_EMOJI || phase === P.POST_EMOJI) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => phase === P.PRE_EMOJI ? navigation.goBack() : null}
            style={styles.backBtn}>
            {phase === P.PRE_EMOJI && <Text style={styles.backBtnText}>← Back</Text>}
          </TouchableOpacity>
          <Text style={styles.moduleTag}>🌊 MoodBridge</Text>
          <Text style={styles.headline}>
            {isPost ? 'How do you feel now?' : 'How are you feeling?'}
          </Text>
          <Text style={styles.body}>Tap the closest match.</Text>
          <View style={styles.emojiRow}>
            {EMOJIS.map(e => (
              <TouchableOpacity
                key={e.score}
                style={styles.emojiBtn}
                onPress={() => {
                  if (isPost) {
                    setPostScore(e.score);
                    setPhase(P.POST_WORD);
                  } else {
                    setPreScore(e.score);
                    setPhase(P.PRE_WORD);
                  }
                }}
              >
                <Text style={styles.emojiIcon}>{e.icon}</Text>
                <Text style={styles.emojiLabel}>{e.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Word select ────────────────────────────────────────────────────────────
  const isPostWord = phase === P.POST_WORD;
  if (phase === P.PRE_WORD || phase === P.POST_WORD) {
    const score = isPostWord ? postScore : preScore;
    const words = WORD_CLUSTERS[score] || [];
    const emoji = EMOJIS.find(e => e.score === score);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>🌊 MoodBridge</Text>
          <Text style={styles.headline}>{emoji?.icon} Which word fits best?</Text>
          <View style={styles.wordGrid}>
            {words.map(w => (
              <TouchableOpacity
                key={w}
                style={styles.wordChip}
                onPress={() => {
                  if (isPostWord) {
                    finishSession(postScore, w);
                  } else {
                    setPreWord(w);
                    setPhase(preScore === 1 ? P.SAFETY : P.FRAMING);
                  }
                }}
              >
                <Text style={styles.wordChipText}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.validationCard}>
            <Text style={styles.validationText}>{VALIDATIONS[score]}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Safety note (score === 1 only) ─────────────────────────────────────────
  if (phase === P.SAFETY) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>🌊 MoodBridge</Text>
          <View style={styles.safetyCard}>
            <Text style={styles.safetyTitle}>One thing first</Text>
            <Text style={styles.safetyText}>
              These feelings are real and valid. If things feel too heavy to handle alone, please talk to someone you trust — a parent, teacher, or school counselor.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { marginBottom: 12 }]}
            onPress={() => { setHasSupportCkd(true); setPhase(P.FRAMING); }}
          >
            <Text style={styles.primaryBtnText}>I have someone I can talk to ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => setPhase(P.FRAMING)}
          >
            <Text style={styles.secondaryBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Framing card ───────────────────────────────────────────────────────────
  if (phase === P.FRAMING) {
    const prescribed = WORD_TO_EXERCISE[preWord] || 'breathing';
    const ex = EXERCISES[prescribed];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>🌊 MoodBridge</Text>
          <Text style={styles.headline}>Why this works</Text>
          <View style={styles.framingCard}>
            <Text style={styles.framingText}>
              ADHD brains feel emotions more intensely than average — and take longer to recover. That's biology, not weakness.
              {'\n\n'}These exercises train your brain's emotional brake. It gets faster with practice.
            </Text>
          </View>
          <View style={styles.selectedWordCard}>
            <Text style={styles.selectedWordLabel}>You're feeling</Text>
            <Text style={styles.selectedWord}>{EMOJIS.find(e => e.score === preScore)?.icon} {preWord}</Text>
          </View>
          <View style={styles.prescribedCard}>
            <Text style={styles.prescribedLabel}>Your exercise</Text>
            <Text style={styles.prescribedName}>{ex?.icon} {ex?.label}</Text>
            <Text style={styles.prescribedDesc}>{ex?.desc}</Text>
          </View>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => startExercise(prescribed)}>
            <Text style={styles.primaryBtnText}>Start →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.changeExBtn} onPress={() => setPhase(P.EX_SELECT)}>
            <Text style={styles.changeExBtnText}>Try a different exercise</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Exercise select ────────────────────────────────────────────────────────
  if (phase === P.EX_SELECT) {
    const suggested = WORD_TO_EXERCISE[preWord] || 'breathing';
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.moduleTag}>🌊 MoodBridge</Text>
          <Text style={styles.headline}>Choose your exercise</Text>
          {Object.entries(EXERCISES).map(([key, ex]) => {
            const isSuggested = key === suggested;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.exRow, isSuggested && styles.exRowSuggested]}
                onPress={() => startExercise(key)}
              >
                <Text style={styles.exRowIcon}>{ex.icon}</Text>
                <View style={styles.exRowText}>
                  <Text style={[styles.exRowLabel, isSuggested && styles.exRowLabelBold]}>{ex.label}</Text>
                  {isSuggested && <Text style={styles.exRowDesc}>{ex.desc}</Text>}
                </View>
                {isSuggested && (
                  <View style={styles.suggestedTag}>
                    <Text style={styles.suggestedTagText}>For you</Text>
                  </View>
                )}
                <Text style={styles.exRowArrow}>›</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    );
  }

  // ── Exercises ──────────────────────────────────────────────────────────────
  if (phase === P.EXERCISE) {

    // ── Box Breathing ────────────────────────────────────────────────────────
    if (exercise === 'breathing') {
      const bp = BREATHING_PHASES[breathPhaseIdx];
      return (
        <SafeAreaView style={[styles.container, styles.exerciseContainer]}>
          <Text style={styles.exTitle}>Box Breathing</Text>
          <Text style={styles.exSubtitle}>Cycle {breathCycle + 1} of {BREATHING_CYCLES}</Text>
          <View style={styles.breathArea}>
            <Animated.View style={[styles.breathCircle, {
              transform: [{ scale: breathAnim }],
              backgroundColor: bp?.color + '30',
              borderColor: bp?.color,
            }]}>
              <Text style={[styles.breathPhaseLabel, { color: bp?.color }]}>{bp?.label}</Text>
            </Animated.View>
          </View>
          <Text style={styles.breathHint}>Follow the circle — breathe with it</Text>
        </SafeAreaView>
      );
    }

    // ── 5-4-3-2-1 Grounding ──────────────────────────────────────────────────
    if (exercise === 'grounding') {
      const step = GROUNDING_STEPS[exStep];
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.exProgressBg}>
            <View style={[styles.exProgressFill, { width: `${((exStep) / GROUNDING_STEPS.length) * 100}%` }]} />
          </View>
          <View style={styles.content}>
            <Text style={styles.exTitle}>5-4-3-2-1 Grounding</Text>
            <View style={styles.groundingCard}>
              <Text style={styles.groundingNum}>{step.n}</Text>
              <Text style={styles.groundingPrompt}>{step.prompt}</Text>
            </View>
            <Text style={styles.groundingHint}>Take your time. No need to write them down.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (exStep + 1 >= GROUNDING_STEPS.length) setPhase(P.POST_EMOJI);
                else setExStep(exStep + 1);
              }}
            >
              <Text style={styles.primaryBtnText}>
                {exStep + 1 >= GROUNDING_STEPS.length ? 'Done ✓' : 'Got it →'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // ── Emotion Labeling ─────────────────────────────────────────────────────
    if (exercise === 'labeling') {
      // Step 0: expand word list; Step 1: body location (BodyDiagram); Step 2: affirmation
      if (exStep === 0) {
        const allWords = Object.values(WORD_CLUSTERS).flat();
        const cluster = WORD_CLUSTERS[preScore] || [];
        const others = allWords.filter(w => !cluster.includes(w));
        const display = [...cluster, ...others.slice(0, 6)];
        return (
          <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.exTitle}>Emotion Labeling</Text>
              <Text style={styles.exSubtitle}>Tap everything you're feeling right now</Text>
              <View style={styles.wordGrid}>
                {display.map(w => (
                  <TouchableOpacity
                    key={w}
                    style={[styles.wordChip, labelWords.includes(w) && styles.wordChipSelected]}
                    onPress={() => setLabelWords(prev =>
                      prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]
                    )}
                  >
                    <Text style={[styles.wordChipText, labelWords.includes(w) && styles.wordChipTextSelected]}>{w}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.primaryBtn, labelWords.length === 0 && styles.primaryBtnDisabled]}
                onPress={() => setExStep(1)}
                disabled={labelWords.length === 0}
              >
                <Text style={styles.primaryBtnText}>Next →</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        );
      }
      if (exStep === 1) {
        const bodyLabel = BODY_REGIONS.find(r => r.id === labelBody)?.label;
        return (
          <SafeAreaView style={styles.container}>
            <View style={[styles.content, { alignItems: 'center' }]}>
              <Text style={styles.exTitle}>Where do you feel it?</Text>
              <Text style={styles.exSubtitle}>Tap where you feel {labelWords[0]}</Text>
              <BodyDiagram
                mode="labeling"
                selected={labelBody}
                onSelect={id => setLabelBody(id)}
                width={130} height={293}
              />
              {bodyLabel && (
                <Text style={styles.bodySelectedLabel}>{bodyLabel}</Text>
              )}
              <TouchableOpacity
                style={[styles.primaryBtn, { alignSelf: 'stretch' }, !labelBody && styles.primaryBtnDisabled]}
                onPress={() => setExStep(2)}
                disabled={!labelBody}
              >
                <Text style={styles.primaryBtnText}>Next →</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        );
      }
      if (exStep === 2) {
        const bodyLabel = BODY_REGIONS.find(r => r.id === labelBody)?.label;
        return (
          <SafeAreaView style={styles.container}>
            <View style={styles.content}>
              <Text style={styles.exTitle}>Name it to tame it</Text>
              <View style={styles.labelAffirmCard}>
                <Text style={styles.labelAffirmWords}>
                  {labelWords.join(' · ')}
                </Text>
                <Text style={styles.labelAffirmBody}>felt in: {bodyLabel}</Text>
                <Text style={styles.labelAffirmText}>
                  You just activated your prefrontal cortex by naming what you feel. That's your brain's brake engaging. It takes milliseconds — and it's real.
                </Text>
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase(P.POST_EMOJI)}>
                <Text style={styles.primaryBtnText}>Continue →</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        );
      }
    }

    // ── Positive Reappraisal ─────────────────────────────────────────────────
    if (exercise === 'reappraisal') {
      const prompt = REAPPRAISAL_PROMPTS[exStep];
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.exProgressBg}>
            <View style={[styles.exProgressFill, { width: `${(exStep / REAPPRAISAL_PROMPTS.length) * 100}%` }]} />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.exTitle}>Positive Reappraisal</Text>
            <Text style={styles.exSubtitle}>Step {exStep + 1} of {REAPPRAISAL_PROMPTS.length}</Text>
            <View style={styles.reappraisalCard}>
              <Text style={styles.reappraisalPrompt}>{prompt}</Text>
              <TextInput
                style={styles.reappraisalInput}
                multiline
                placeholder="Type here (or just think it)..."
                placeholderTextColor={colors.textLight}
                value={exInputs[exStep] || ''}
                onChangeText={v => {
                  const next = [...exInputs];
                  next[exStep] = v;
                  setExInputs(next);
                }}
              />
            </View>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                if (exStep + 1 >= REAPPRAISAL_PROMPTS.length) setPhase(P.POST_EMOJI);
                else setExStep(exStep + 1);
              }}
            >
              <Text style={styles.primaryBtnText}>
                {exStep + 1 >= REAPPRAISAL_PROMPTS.length ? 'Done ✓' : 'Next →'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // ── Body Scan ────────────────────────────────────────────────────────────
    if (exercise === 'bodyscan') {
      const region = BODY_REGIONS[bodyRegionIdx];
      return (
        <SafeAreaView style={[styles.container, styles.exerciseContainer]}>
          <Text style={styles.exTitle}>Body Scan</Text>
          <BodyDiagram
            mode="scan"
            activeId={region?.id}
            width={100} height={240}
          />
          <View style={styles.bodyScanCard}>
            <Text style={styles.bodyScanRegion}>{region?.label}</Text>
            <Text style={styles.bodyScanPrompt}>{region?.prompt}</Text>
          </View>
          <Text style={styles.bodyScanHint}>Breathe slowly. The next area will come.</Text>
        </SafeAreaView>
      );
    }
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (phase === P.RESULTS) {
    const preEmoji  = EMOJIS.find(e => e.score === preScore);
    const postEmoji = EMOJIS.find(e => e.score === postScore);
    const delta     = (postScore || 0) - (preScore || 0);
    const ex        = EXERCISES[exercise];
    const totalWords = [...new Set(
      moodBridgeSessions.flatMap(s => [s.preWord, s.postWord].filter(Boolean))
    )].length;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.moduleTag}>🌊 MoodBridge</Text>

          {/* Before / after */}
          <View style={styles.moodDeltaRow}>
            <View style={styles.moodDeltaBox}>
              <Text style={styles.moodDeltaEmoji}>{preEmoji?.icon}</Text>
              <Text style={styles.moodDeltaWord}>{preWord}</Text>
              <Text style={styles.moodDeltaLabel}>Before</Text>
            </View>
            <Text style={styles.moodArrow}>→</Text>
            <View style={styles.moodDeltaBox}>
              <Text style={styles.moodDeltaEmoji}>{postEmoji?.icon}</Text>
              <Text style={styles.moodDeltaWord}>{postWord}</Text>
              <Text style={styles.moodDeltaLabel}>After</Text>
            </View>
          </View>

          {delta !== 0 && (
            <Text style={[styles.deltaMsg, { color: delta > 0 ? '#4CAF50' : colors.textLight }]}>
              {delta > 0
                ? `Mood shifted up ${delta} step${delta !== 1 ? 's' : ''} ✓`
                : 'No change today — that happens. The practice still matters.'}
            </Text>
          )}

          <View style={styles.exUsedCard}>
            <Text style={styles.exUsedLabel}>Exercise used</Text>
            <Text style={styles.exUsedName}>{ex?.icon} {ex?.label}</Text>
          </View>

          {totalWords > 0 && (
            <View style={styles.vocabCard}>
              <Text style={styles.vocabTitle}>🏷️ Emotion vocabulary</Text>
              <Text style={styles.vocabCount}>{totalWords} different words used across all sessions</Text>
              <Text style={styles.vocabSub}>More words = more precision = better regulation</Text>
            </View>
          )}

          <View style={styles.connectionCard}>
            <Text style={styles.connectionText}>
              💡 {delta > 0
                ? 'Naming your emotion + doing the exercise activated your prefrontal cortex — your brain\'s natural regulator.'
                : 'Some days are harder. Showing up and practicing is what builds the skill over time.'}
            </Text>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  exerciseContainer: { alignItems: 'center' },
  content: { padding: 24, paddingBottom: 16 },
  backBtn: { marginBottom: 12, minHeight: 20 },
  backBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  moduleTag: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  headline:  { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 8 },
  body:      { fontSize: 14, color: colors.textLight, marginBottom: 16 },

  emojiRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20 },
  emojiBtn: { alignItems: 'center', padding: 8 },
  emojiIcon: { fontSize: 36 },
  emojiLabel: { fontSize: 11, color: colors.textLight, marginTop: 4, textAlign: 'center', fontWeight: '600' },

  wordGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 16 },
  wordChip: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  wordChipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  wordChipText: { fontSize: 14, color: colors.text, fontWeight: '600' },
  wordChipTextSelected: { color: colors.primary },

  validationCard: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14 },
  validationText: { fontSize: 14, color: colors.textLight, lineHeight: 20, fontStyle: 'italic' },

  safetyCard: { backgroundColor: '#FFF3E0', borderRadius: 14, padding: 18, borderWidth: 1.5, borderColor: '#FF9800', marginBottom: 24 },
  safetyTitle: { fontSize: 17, fontWeight: '800', color: '#E65100', marginBottom: 10 },
  safetyText:  { fontSize: 15, color: '#E65100', lineHeight: 22 },

  framingCard: { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 16 },
  framingText: { fontSize: 15, color: colors.text, lineHeight: 22 },
  selectedWordCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  selectedWordLabel: { fontSize: 13, color: colors.textLight },
  selectedWord: { fontSize: 18, fontWeight: '800', color: colors.text },
  prescribedCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 20 },
  prescribedLabel: { fontSize: 11, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  prescribedName:  { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 3 },
  prescribedDesc:  { fontSize: 13, color: colors.textLight },
  changeExBtn:     { alignItems: 'center', paddingVertical: 12 },
  changeExBtnText: { fontSize: 13, color: colors.textLight, textDecorationLine: 'underline' },

  exRow:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, gap: 10 },
  exRowSuggested: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  exRowIcon:      { fontSize: 22 },
  exRowText:      { flex: 1 },
  exRowLabel:     { fontSize: 14, fontWeight: '600', color: colors.text },
  exRowLabelBold: { fontWeight: '800', color: colors.primary },
  exRowDesc:      { fontSize: 11, color: colors.primary, marginTop: 2 },
  exRowArrow:     { fontSize: 20, color: colors.textLight },
  suggestedTag: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 },
  suggestedTagText: { fontSize: 10, color: '#fff', fontWeight: '700' },

  exTitle:    { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 16, marginBottom: 4 },
  exSubtitle: { fontSize: 13, color: colors.textLight, textAlign: 'center', marginBottom: 16 },
  exProgressBg:   { height: 3, backgroundColor: '#F0F0F0' },
  exProgressFill: { height: 3, backgroundColor: colors.primary },

  // Breathing
  breathArea:  { flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' },
  breathCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  breathPhaseLabel: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  breathCount: { fontSize: 40, fontWeight: '900' },
  breathHint:  { fontSize: 13, color: colors.textLight, marginBottom: 32, textAlign: 'center' },

  // Grounding
  groundingCard:   { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1.5, borderColor: '#E0E0E0', marginBottom: 16, alignItems: 'center' },
  groundingNum:    { fontSize: 64, fontWeight: '900', color: colors.primary, lineHeight: 70 },
  groundingPrompt: { fontSize: 16, color: colors.text, textAlign: 'center', lineHeight: 24, marginTop: 8 },
  groundingHint:   { fontSize: 13, color: colors.textLight, textAlign: 'center', marginBottom: 24, fontStyle: 'italic' },

  // Labeling
  bodyGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 16 },
  bodyPartBtn:     { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  bodyPartBtnSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  bodyPartText:        { fontSize: 14, color: colors.text, fontWeight: '600' },
  bodyPartTextSelected: { color: colors.primary },
  labelAffirmCard: { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 24 },
  labelAffirmWords:{ fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  labelAffirmBody: { fontSize: 13, color: colors.primary, marginBottom: 14, fontWeight: '600' },
  labelAffirmText: { fontSize: 14, color: colors.text, lineHeight: 22 },

  // Reappraisal
  reappraisalCard:   { backgroundColor: '#fff', borderRadius: 14, padding: 18, borderWidth: 1.5, borderColor: '#E0E0E0', marginBottom: 20 },
  reappraisalPrompt: { fontSize: 16, fontWeight: '700', color: colors.text, lineHeight: 24, marginBottom: 14 },
  reappraisalInput:  { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: colors.text, minHeight: 80, textAlignVertical: 'top' },

  // Body scan
  bodySelectedLabel: { fontSize: 15, fontWeight: '700', color: colors.primary, marginTop: 8, marginBottom: 12 },
  bodyScanCard:   { margin: 24, backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center', flex: 1, justifyContent: 'center' },
  bodyScanRegion: { fontSize: 22, fontWeight: '800', color: colors.primary, marginBottom: 16 },
  bodyScanPrompt: { fontSize: 16, color: colors.text, lineHeight: 24, textAlign: 'center' },
  bodyScanHint:   { fontSize: 13, color: colors.textLight, marginBottom: 24 },

  // Results
  moodDeltaRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginVertical: 20 },
  moodDeltaBox:  { alignItems: 'center', gap: 4 },
  moodDeltaEmoji:{ fontSize: 44 },
  moodDeltaWord: { fontSize: 14, fontWeight: '700', color: colors.text },
  moodDeltaLabel:{ fontSize: 11, color: colors.textLight },
  moodArrow:     { fontSize: 24, color: colors.primary, fontWeight: '700' },
  deltaMsg:      { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  exUsedCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exUsedLabel:   { fontSize: 13, color: colors.textLight },
  exUsedName:    { fontSize: 14, fontWeight: '700', color: colors.text },
  vocabCard:     { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14, marginBottom: 12 },
  vocabTitle:    { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 4 },
  vocabCount:    { fontSize: 22, fontWeight: '900', color: colors.primary },
  vocabSub:      { fontSize: 12, color: colors.textLight, marginTop: 2 },
  connectionCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.primary + '40' },
  connectionText: { fontSize: 14, color: colors.text, lineHeight: 22 },

  primaryBtn:        { backgroundColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center', marginHorizontal: 24, marginBottom: 12 },
  primaryBtnDisabled:{ backgroundColor: '#CCC' },
  primaryBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn:      { borderWidth: 1.5, borderColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginHorizontal: 24, marginBottom: 12 },
  secondaryBtnText:  { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
