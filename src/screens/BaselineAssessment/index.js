import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
} from 'react-native';
import { SafeAreaView as SafeAreaViewCtx } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';
import SessionProgress from '../../components/SessionProgress';

// ── CFQ — 5 adapted items, 0–4 scale ─────────────────────────────────────────
const CFQ_ITEMS = [
  'Forget where I put things I use regularly',
  'Start doing something, then get sidetracked into doing something else instead',
  'Forget why I walked into a room or what I was about to do',
  'Have trouble concentrating on one thing for more than a few minutes',
  'Forget appointments or plans I already made',
];
const CFQ_LABELS = ['Never', 'Rarely', 'Sometimes', 'Often', 'Very Often'];

// ── EF self-rating — 6 module items, 1–5 scale ───────────────────────────────
const EF_ITEMS = [
  { icon: '⏱', q: 'How well can I estimate how long tasks will take?',         module: 'timewise' },
  { icon: '🎯', q: 'How well can I ignore distractions when I need to focus?',  module: 'focus' },
  { icon: '🧠', q: 'How well can I hold information in mind while working?',    module: 'memory' },
  { icon: '🌊', q: 'How well can I manage my emotions when stressed?',          module: 'mood' },
  { icon: '⚡', q: 'How confident am I in my own abilities?',                   module: 'confidence' },
  { icon: '📋', q: 'How well can I plan ahead and meet deadlines?',             module: 'planning' },
];
const EF_LABELS = ['Very poorly', 'Poorly', 'Okay', 'Well', 'Very well'];

const SECTION = { CFQ: 'cfq', EF: 'ef', DONE: 'done' };

export default function BaselineAssessment({
  navigation, route }) {
  const colors = useColors();
  const { addBaselineAssessment } = useStore(s => ({ addBaselineAssessment: s.addBaselineAssessment }));
  const week = route?.params?.week ?? 0;

  const [section, setSection]   = useState(SECTION.CFQ);
  const [cfqIdx,  setCfqIdx]    = useState(0);
  const [cfqAnswers, setCfqAns] = useState([]);
  const [efIdx,   setEfIdx]     = useState(0);
  const [efAnswers,  setEfAns]  = useState([]);

  const totalSteps = CFQ_ITEMS.length + EF_ITEMS.length;
  const doneSteps  = cfqAnswers.length + efAnswers.length;

  function answerCFQ(val) {
    const next = [...cfqAnswers, val];
    setCfqAns(next);
    if (next.length >= CFQ_ITEMS.length) {
      setSection(SECTION.EF);
    } else {
      setCfqIdx(cfqIdx + 1);
    }
  }

  function answerEF(val) {
    const next = [...efAnswers, val];
    setEfAns(next);
    if (next.length >= EF_ITEMS.length) {
      saveAndFinish(next);
    } else {
      setEfIdx(efIdx + 1);
    }
  }

  function saveAndFinish(efFinal) {
    const cfqTotal = cfqAnswers.reduce((a, b) => a + b, 0);
    const efScores = {};
    EF_ITEMS.forEach((item, i) => { efScores[item.module] = efFinal[i] + 1; });
    addBaselineAssessment({
      date: new Date().toISOString(),
      week,
      cfqRaw: cfqAnswers,
      cfqTotal,
      efScores,
    });
    setSection(SECTION.DONE);
  }

  if (section === SECTION.DONE) {
    return (
      <SafeAreaViewCtx style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🎉</Text>
          <Text style={styles.doneTitle}>Week {week} Assessment Complete</Text>
          <Text style={styles.doneSub}>
            Your responses are saved. We'll compare these at{'\n'}Week 6 and Week 12 to measure your growth.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => navigation.goBack()}>
            <Text style={styles.btnText}>Back to app →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaViewCtx>
    );
  }

  const isCFQ = section === SECTION.CFQ;
  const item  = isCFQ ? CFQ_ITEMS[cfqIdx] : EF_ITEMS[efIdx];
  const labels = isCFQ ? CFQ_LABELS : EF_LABELS;
  const qNum  = isCFQ ? cfqIdx + 1 : CFQ_ITEMS.length + efIdx + 1;

  return (
    <SafeAreaViewCtx style={styles.container}>
      <SessionProgress current={doneSteps} total={totalSteps} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.tag}>
          Week {week} Assessment · {qNum}/{totalSteps}
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          {isCFQ ? '🔍 How often do you...' : '📊 Rate your ability to...'}
        </Text>

        {!isCFQ && <Text style={styles.efIcon}>{EF_ITEMS[efIdx].icon}</Text>}

        <Text style={styles.question}>
          {isCFQ ? item : item.q}
        </Text>

        <View style={styles.optionsCol}>
          {labels.map((label, i) => (
            <TouchableOpacity
              key={i}
              style={styles.option}
              onPress={() => isCFQ ? answerCFQ(i) : answerEF(i)}
              activeOpacity={0.75}
            >
              <View style={[styles.optionDot, { backgroundColor: colors.primary + Math.round((i / (labels.length - 1)) * 200 + 55).toString(16).padStart(2,'0') }]} />
              <Text style={styles.optionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.hint}>Tap your answer to continue</Text>
      </ScrollView>
    </SafeAreaViewCtx>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: 24, paddingBottom: 40 },

  tag:          { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 20, marginTop: 12 },
  sectionLabel: { fontSize: 14, color: colors.textLight, marginBottom: 12 },
  efIcon:       { fontSize: 48, marginBottom: 8 },
  question:     { fontSize: 22, fontWeight: '800', color: colors.text, lineHeight: 30, marginBottom: 32 },

  optionsCol: { gap: 12 },
  option:     { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: '#E8E8E8', padding: 16 },
  optionDot:  { width: 12, height: 12, borderRadius: 6 },
  optionText: { fontSize: 16, fontWeight: '600', color: colors.text },

  hint: { fontSize: 12, color: colors.textLight, textAlign: 'center', marginTop: 24, fontStyle: 'italic' },

  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  doneEmoji: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 12, textAlign: 'center' },
  doneSub:   { fontSize: 15, color: colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  btn:       { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 16 },
  btnText:   { color: '#fff', fontSize: 16, fontWeight: '800' },
});
