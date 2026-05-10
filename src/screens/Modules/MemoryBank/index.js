import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useStore } from '../../../store';
import { colors } from '../../../theme';
import { logSession } from '../../../services/logger';
import SpeakButton from '../../../components/SpeakButton';
import AnimatedGuide from '../../../components/AnimatedGuide';

// ── Constants ─────────────────────────────────────────────────────────────────

const SHOW_MS     = 750;   // each item visible
const BLANK_MS    = 150;   // gap between items
const WAIT_MS     = 600;   // pause before study begins
const FEEDBACK_MS = 1000;  // result flash duration
const ROUNDS      = 15;    // rounds per session
const MIN_LEVEL   = 2;
const MAX_LEVEL   = 9;

const MODES = {
  digitsFwd: { label: 'Forward Digits', icon: '🔢', desc: 'Tap the numbers in order' },
  digitsBwd: { label: 'Backward Digits', icon: '🔄', desc: 'Tap in REVERSE order' },
  spatial:   { label: 'Grid Memory',    icon: '🔲', desc: 'Tap the squares in order' },
};

const LEVEL_LABELS = {
  2: 'Just starting', 3: 'Below average for ADHD', 4: 'ADHD typical',
  5: 'ADHD typical', 6: 'Age-appropriate target ✓', 7: 'Average adult',
  8: 'Above average', 9: 'Exceptional',
};

const PHASE = { INTRO: 'intro', PLAYING: 'playing', RESULTS: 'results' };
const PS    = { STUDY: 'study', RECALL: 'recall', FEEDBACK: 'feedback' };

// ── Helpers ───────────────────────────────────────────────────────────────────

function genDigits(n) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 9) + 1);
}

function genSpatial(n) {
  const pool = Array.from({ length: 9 }, (_, i) => i);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

function genSequence(mode, level) {
  return mode === 'spatial' ? genSpatial(level) : genDigits(level);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryBank({ navigation }) {
  const {
    addMemoryBankSession, memoryBankSessions,
    memoryBankLevels, setMemoryBankLevel, participantCode,
  } = useStore(s => ({
    addMemoryBankSession: s.addMemoryBankSession,
    memoryBankSessions:  s.memoryBankSessions || [],
    memoryBankLevels:    s.memoryBankLevels  || { digitsFwd: 3, digitsBwd: 3, spatial: 3 },
    setMemoryBankLevel:  s.setMemoryBankLevel,
    participantCode:     s.participantCode,
  }));

  const [phase,     setPhase]     = useState(PHASE.INTRO);
  const [mode,      setMode]      = useState(null);
  const [level,     setLevel]     = useState(3);
  const [sequence,  setSequence]  = useState([]);
  const [highlight, setHighlight] = useState(null); // digit or grid idx currently shown
  const [playState, setPlayState] = useState(PS.STUDY);
  const [userInput, setUserInput] = useState([]);
  const [isCorrect, setIsCorrect] = useState(null);
  const [roundsDone, setRoundsDone] = useState(0);
  const [sessionLog, setSessionLog] = useState([]); // {level, correct}

  const consecutiveWrong = useRef(0);
  const studyTimer = useRef(null);
  const fbTimer    = useRef(null);

  // ── Study animation ──────────────────────────────────────────────────────

  function runStudy(seq, idx = 0) {
    if (idx >= seq.length) {
      setHighlight(null);
      studyTimer.current = setTimeout(() => setPlayState(PS.RECALL), WAIT_MS);
      return;
    }
    setHighlight(seq[idx]);
    studyTimer.current = setTimeout(() => {
      setHighlight(null);
      studyTimer.current = setTimeout(() => runStudy(seq, idx + 1), BLANK_MS);
    }, SHOW_MS);
  }

  function startRound(lvl) {
    const seq = genSequence(mode, lvl);
    setSequence(seq);
    setUserInput([]);
    setIsCorrect(null);
    setHighlight(null);
    setPlayState(PS.STUDY);
    studyTimer.current = setTimeout(() => runStudy(seq, 0), WAIT_MS);
  }

  // ── Session start ────────────────────────────────────────────────────────

  function startSession(selectedMode) {
    const startLevel = memoryBankLevels[selectedMode] ?? 3;
    setMode(selectedMode);
    setLevel(startLevel);
    setRoundsDone(0);
    setSessionLog([]);
    consecutiveWrong.current = 0;
    setPhase(PHASE.PLAYING);
    const seq = genSequence(selectedMode, startLevel);
    setSequence(seq);
    setUserInput([]);
    setIsCorrect(null);
    setHighlight(null);
    setPlayState(PS.STUDY);
    studyTimer.current = setTimeout(() => runStudy(seq, 0), WAIT_MS);
  }

  // ── Input handling ───────────────────────────────────────────────────────

  function handleInput(val) {
    if (playState !== PS.RECALL) return;
    const next = [...userInput, val];
    setUserInput(next);
    if (next.length === sequence.length) evaluate(next);
  }

  function handleBackspace() {
    if (playState !== PS.RECALL) return;
    setUserInput(prev => prev.slice(0, -1));
  }

  // ── Evaluation ───────────────────────────────────────────────────────────

  function evaluate(input) {
    const expected = mode === 'digitsBwd' ? [...sequence].reverse() : sequence;
    const correct = input.length === expected.length &&
      input.every((v, i) => v === expected[i]);
    setIsCorrect(correct);
    setPlayState(PS.FEEDBACK);

    const newLog = [...sessionLog, { level, correct }];
    setSessionLog(newLog);

    let newLevel = level;
    if (correct) {
      newLevel = Math.min(MAX_LEVEL, level + 1);
      consecutiveWrong.current = 0;
    } else {
      consecutiveWrong.current += 1;
      if (consecutiveWrong.current >= 2) {
        newLevel = Math.max(MIN_LEVEL, level - 1);
        consecutiveWrong.current = 0;
      }
    }

    fbTimer.current = setTimeout(() => {
      const done = roundsDone + 1;
      if (done >= ROUNDS) {
        finishSession(newLog, newLevel);
      } else {
        setLevel(newLevel);
        setRoundsDone(done);
        setIsCorrect(null);
        startRound(newLevel);
      }
    }, FEEDBACK_MS);
  }

  // ── Session finish ───────────────────────────────────────────────────────

  function finishSession(log, finalLevel) {
    clearTimeout(studyTimer.current);
    clearTimeout(fbTimer.current);

    const correct = log.filter(r => r.correct).length;
    const accuracy = Math.round((correct / log.length) * 100);
    const maxLevel = Math.max(...log.map(r => r.level));
    const prevBest = memoryBankSessions
      .filter(s => s.mode === mode)
      .reduce((best, s) => Math.max(best, s.maxLevel ?? 0), 0);
    const isNewBest = maxLevel > prevBest;

    setMemoryBankLevel(mode, finalLevel);

    const session = {
      date: new Date().toISOString(),
      mode, accuracy, maxLevel, finalLevel,
      rounds: log.length, isNewBest,
    };
    addMemoryBankSession(session);
    logSession(participantCode, { module: 'MemoryBank', ...session });
    setPhase(PHASE.RESULTS);
  }

  // ── INTRO ─────────────────────────────────────────────────────────────────

  if (phase === PHASE.INTRO) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.moduleTag}>🧠 MemoryBank</Text>
          <Text style={styles.headline}>Train your working memory</Text>
          <SpeakButton text="See a sequence, remember it, recall it. Choose a mode below to start. Level adjusts to keep you challenged." size="sm" style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
          <AnimatedGuide placeholder="memory" label="See · Remember · Recall" width={110} height={110} />
          <Text style={styles.body}>See a sequence · remember · recall.</Text>

          {Object.entries(MODES).map(([key, m]) => {
            const lvl = memoryBankLevels[key] ?? 3;
            const lastSession = [...memoryBankSessions].reverse().find(s => s.mode === key);
            return (
              <TouchableOpacity key={key} style={styles.modeCard} onPress={() => startSession(key)}>
                <Text style={styles.modeIcon}>{m.icon}</Text>
                <View style={styles.modeCardMid}>
                  <Text style={styles.modeLabel}>{m.label}</Text>
                  <Text style={styles.modeDesc}>{m.desc}</Text>
                  {lastSession && (
                    <Text style={styles.modeHistory}>Last: Level {lastSession.maxLevel}</Text>
                  )}
                </View>
                <View style={styles.modeLevelBadge}>
                  <Text style={styles.modeLevelNum}>{lvl}</Text>
                  <Text style={styles.modeLevelLabel}>lvl</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <View style={styles.infoCard}>
            <Text style={styles.infoItem}>⏱ ~6 min · 15 rounds · 🎯 Target: level 6</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── PLAYING ───────────────────────────────────────────────────────────────

  if (phase === PHASE.PLAYING) {
    const isDigit   = mode !== 'spatial';
    const isBackward = mode === 'digitsBwd';
    const isFeedback = playState === PS.FEEDBACK;
    const isRecall   = playState === PS.RECALL;

    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.playHeader}>
          <Text style={styles.playRound}>{roundsDone + 1} / {ROUNDS}</Text>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillText}>Level {level}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${((roundsDone) / ROUNDS) * 100}%` }]} />
        </View>

        {/* Mode label */}
        <Text style={styles.modeTagPlay}>{MODES[mode]?.icon} {MODES[mode]?.label}</Text>
        {isBackward && isRecall && (
          <Text style={styles.backwardHint}>↩ Tap in REVERSE order</Text>
        )}

        {/* Stimulus area */}
        <View style={styles.stimulusArea}>

          {/* ── Digit mode ── */}
          {isDigit && (
            <View style={[
              styles.digitCard,
              isFeedback && (isCorrect ? styles.digitCardCorrect : styles.digitCardWrong),
            ]}>
              {playState === PS.STUDY && highlight !== null ? (
                <Text style={styles.digitValue}>{highlight}</Text>
              ) : isFeedback ? (
                <Text style={styles.digitValue}>{isCorrect ? '✓' : '✗'}</Text>
              ) : (
                <Text style={styles.digitPlaceholder}>?</Text>
              )}
            </View>
          )}

          {/* Sequence dots */}
          {isDigit && (
            <View style={styles.seqDots}>
              {sequence.map((_, i) => (
                <View key={i} style={[
                  styles.seqDot,
                  playState === PS.STUDY && highlight !== null &&
                    sequence.indexOf(highlight) === i && styles.seqDotActive,
                ]} />
              ))}
            </View>
          )}

          {/* ── Spatial mode ── */}
          {!isDigit && (
            <View style={[
              styles.grid,
              isFeedback && (isCorrect ? styles.gridCorrect : styles.gridWrong),
            ]}>
              {Array.from({ length: 9 }, (_, i) => {
                const isHighlighted = playState === PS.STUDY && highlight === i;
                const isTapped = userInput.includes(i);
                const tapOrder = userInput.indexOf(i);
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.gridCell,
                      isHighlighted && styles.gridCellHighlight,
                      isTapped      && styles.gridCellTapped,
                    ]}
                    onPress={() => isRecall && handleInput(i)}
                    activeOpacity={isRecall ? 0.6 : 1}
                    disabled={!isRecall || isTapped}
                  >
                    {isTapped && (
                      <Text style={styles.gridCellOrder}>{tapOrder + 1}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Feedback message */}
          {isFeedback && (
            <Text style={[styles.feedbackMsg, { color: isCorrect ? '#4CAF50' : '#F44336' }]}>
              {isCorrect ? 'Correct!' : `The sequence was: ${sequence.join(' ')}`}
            </Text>
          )}
        </View>

        {/* ── Number pad (digit modes) ── */}
        {isDigit && (
          <View style={styles.numpad}>
            {/* User input display */}
            <View style={styles.inputDisplay}>
              {Array.from({ length: sequence.length }, (_, i) => (
                <View key={i} style={[styles.inputSlot, i < userInput.length && styles.inputSlotFilled]}>
                  <Text style={styles.inputSlotText}>
                    {i < userInput.length ? userInput[i] : ''}
                  </Text>
                </View>
              ))}
            </View>

            {/* Buttons */}
            <View style={styles.numpadGrid}>
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[styles.numBtn, !isRecall && styles.numBtnOff]}
                  onPress={() => handleInput(n)}
                  disabled={!isRecall}
                >
                  <Text style={[styles.numBtnText, !isRecall && styles.numBtnTextOff]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.numpadBottom}>
              <TouchableOpacity
                style={[styles.numBtn, styles.numBtnWide, !isRecall && styles.numBtnOff]}
                onPress={() => handleInput(0)}
                disabled={!isRecall}
              >
                <Text style={[styles.numBtnText, !isRecall && styles.numBtnTextOff]}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.numBtn, styles.numBtnWide, !isRecall && styles.numBtnOff]}
                onPress={handleBackspace}
                disabled={!isRecall}
              >
                <Text style={[styles.numBtnText, !isRecall && styles.numBtnTextOff]}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────

  if (phase === PHASE.RESULTS) {
    const session = memoryBankSessions[memoryBankSessions.length - 1];
    if (!session) return null;
    const { accuracy, maxLevel, isNewBest } = session;
    const emoji = maxLevel >= 6 ? '🧠' : maxLevel >= 5 ? '💪' : '🔄';
    const modeLabel = MODES[session.mode]?.label ?? session.mode;
    const prevSessions = memoryBankSessions.filter(s => s.mode === session.mode);
    const prev = prevSessions.length >= 2 ? prevSessions[prevSessions.length - 2] : null;
    const delta = prev ? maxLevel - prev.maxLevel : null;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.bigEmoji}>{emoji}</Text>
          {isNewBest && (
            <View style={styles.newBestBanner}>
              <Text style={styles.newBestText}>🏆 New personal best!</Text>
            </View>
          )}
          <Text style={styles.scoreLabel}>HIGHEST LEVEL</Text>
          <Text style={styles.scoreValue}>{maxLevel}</Text>
          <Text style={styles.levelMeaning}>{LEVEL_LABELS[maxLevel] ?? ''}</Text>

          {delta !== null && (
            <Text style={[styles.delta, { color: delta >= 0 ? '#4CAF50' : '#F44336' }]}>
              {delta >= 0 ? `▲ +${delta}` : `▼ ${delta}`} from last {modeLabel} session
            </Text>
          )}

          <View style={styles.metricsCard}>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Accuracy</Text>
              <View style={styles.metricBarBg}>
                <View style={[styles.metricBarFill, { width: `${accuracy}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{accuracy}%</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.metricLabel}>Mode</Text>
              <Text style={[styles.metricValue, { color: colors.text, width: 'auto', flex: 1, textAlign: 'right' }]}>
                {MODES[session.mode]?.icon} {modeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.connectionCard}>
            <Text style={styles.connectionMsg}>
              💡 {maxLevel >= 6
                ? "You held 6+ items in working memory today — enough to follow multi-step instructions without losing track."
                : maxLevel >= 5
                ? "You're building working memory capacity. Each session adds a little more."
                : "Starting from here is exactly right. Consistent practice is what moves the needle."}
            </Text>
            <Text style={styles.connectionSub}>
              Same skill you use to remember teacher instructions, follow reading passages, and track steps in a problem.
            </Text>
          </View>
          <View style={{ height: 24 }} />
        </ScrollView>

        <View style={styles.resultsBtns}>
          <TouchableOpacity
            style={[styles.primaryBtn, { flex: 1 }]}
            onPress={() => {
              setPhase(PHASE.INTRO);
              setMode(null);
              setUserInput([]);
              setIsCorrect(null);
            }}
          >
            <Text style={styles.primaryBtnText}>Play again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { flex: 1 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryBtnText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: 24, paddingBottom: 16 },
  backBtn:   { marginBottom: 16 },
  backBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  moduleTag: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  headlineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  headline:  { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 },
  body:      { fontSize: 13, color: colors.textLight, lineHeight: 20, marginBottom: 12 },

  modeCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 12, marginBottom: 8 },
  modeCardMid: { flex: 1, marginHorizontal: 10 },
  modeIcon:  { fontSize: 24 },
  modeLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  modeDesc:  { fontSize: 11, color: colors.textLight, marginTop: 1 },
  modeHistory: { fontSize: 11, color: colors.primary, marginTop: 1, fontWeight: '600' },
  modeLevelBadge: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', minWidth: 46 },
  modeLevelNum:   { fontSize: 20, fontWeight: '900', color: '#fff' },
  modeLevelLabel: { fontSize: 9, color: '#fff', opacity: 0.8, fontWeight: '600' },

  infoCard: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 12, marginTop: 4 },
  infoItem: { fontSize: 13, color: colors.textLight },

  // Playing
  playHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  playRound:  { fontSize: 13, color: colors.textLight, fontWeight: '600' },
  levelPill:  { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  levelPillText: { fontSize: 13, color: '#fff', fontWeight: '700' },
  progressBg:   { height: 3, backgroundColor: '#F0F0F0' },
  progressFill: { height: 3, backgroundColor: colors.primary },
  modeTagPlay:  { fontSize: 13, color: colors.textLight, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  backwardHint: { fontSize: 13, color: '#F44336', fontWeight: '700', textAlign: 'center', marginTop: 2 },

  stimulusArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },

  // Digit card
  digitCard:        { width: 140, height: 140, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  digitCardCorrect: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  digitCardWrong:   { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  digitValue:       { fontSize: 64, fontWeight: '900', color: colors.text },
  digitPlaceholder: { fontSize: 48, color: '#E0E0E0' },
  seqDots:    { flexDirection: 'row', gap: 8, marginTop: 16 },
  seqDot:     { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E0E0E0' },
  seqDotActive: { backgroundColor: colors.primary },
  feedbackMsg: { fontSize: 15, fontWeight: '700', marginTop: 14, textAlign: 'center' },

  // Grid
  grid:        { width: 270, aspectRatio: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridCorrect: { opacity: 0.8 },
  gridWrong:   { opacity: 0.8 },
  gridCell:    { width: 80, height: 80, borderRadius: 14, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  gridCellHighlight: { backgroundColor: '#5B5EA6', borderColor: '#5B5EA6' },
  gridCellTapped:    { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
  gridCellOrder:     { fontSize: 22, fontWeight: '800', color: '#4CAF50' },

  // Numpad
  numpad:  { paddingHorizontal: 20, paddingBottom: 24 },
  inputDisplay: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  inputSlot:      { width: 36, height: 44, borderRadius: 8, borderWidth: 2, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  inputSlotFilled: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  inputSlotText:  { fontSize: 18, fontWeight: '800', color: colors.text },
  numpadGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 10 },
  numpadBottom: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  numBtn:     { width: 74, height: 56, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  numBtnWide: { width: 118 },
  numBtnOff:  { backgroundColor: '#F5F5F5', borderColor: '#F0F0F0' },
  numBtnText:    { fontSize: 22, fontWeight: '700', color: colors.text },
  numBtnTextOff: { color: '#BDBDBD' },

  // Results
  bigEmoji:    { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  newBestBanner: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, marginBottom: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FFD54F' },
  newBestText:   { fontSize: 15, fontWeight: '800', color: '#F57F17' },
  scoreLabel:  { fontSize: 13, fontWeight: '800', color: colors.textLight, textAlign: 'center', letterSpacing: 1, textTransform: 'uppercase' },
  scoreValue:  { fontSize: 80, fontWeight: '900', color: colors.text, textAlign: 'center', lineHeight: 90 },
  levelMeaning:{ fontSize: 14, color: colors.primary, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  delta:       { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  metricsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 14, gap: 14 },
  metricRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metricLabel: { fontSize: 13, color: colors.textLight, width: 80 },
  metricBarBg: { flex: 1, height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  metricBarFill: { height: 8, borderRadius: 4 },
  metricValue: { fontSize: 13, fontWeight: '700', width: 36, textAlign: 'right' },
  connectionCard: { backgroundColor: colors.primaryLight, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: colors.primary + '40', marginBottom: 8 },
  connectionMsg:  { fontSize: 15, color: colors.text, fontWeight: '600', lineHeight: 22, marginBottom: 8 },
  connectionSub:  { fontSize: 13, color: colors.primary, lineHeight: 20 },
  resultsBtns:    { flexDirection: 'row', gap: 10, paddingHorizontal: 24, paddingBottom: 32 },
  primaryBtn:     { backgroundColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  secondaryBtn:   { borderWidth: 1.5, borderColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center' },
  secondaryBtnText: { color: colors.primary, fontSize: 17, fontWeight: '700' },
});
