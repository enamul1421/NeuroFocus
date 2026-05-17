import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { useColors } from '../../theme';

// OwnershipReflect — weekly self-monitoring for goal follow-through.
// Targets ADHD intrinsic motivation deficit: building the habit of noticing
// and reacting to goal drift, scaffolded until it partially internalizes.
// Evidence: Hershfield (2011) future-self continuity, Gollwitzer (1999) implementation intentions.

const ACCENT       = '#5B5EA6';
const ACCENT_LIGHT = '#EEEEFF';

const SHOWUP_OPTIONS = [
  { id: 'yes',       label: 'Yes — we followed through',      emoji: '💪' },
  { id: 'mostly',    label: 'Mostly — some things slipped',   emoji: '🙂' },
  { id: 'mixed',     label: 'Mixed — half and half',          emoji: '😐' },
  { id: 'not_really',label: 'Not really — fell behind',       emoji: '😔' },
  { id: 'no',        label: 'No — this week got away from us',emoji: '😶' },
];

export default function OwnershipReflect({ navigation }) {
  const colors = useColors();
  const { addOwnershipReflection } = useStore(s => ({
    addOwnershipReflection: s.addOwnershipReflection,
  }));

  const [showUp,    setShowUp]    = useState(null);
  const [gotInWay,  setGotInWay]  = useState('');
  const [nextMove,  setNextMove]  = useState('');
  const [done,      setDone]      = useState(false);

  function finish() {
    addOwnershipReflection({
      date:      new Date().toISOString(),
      showUp,
      gotInWay:  gotInWay.trim(),
      nextMove:  nextMove.trim(),
    });
    setDone(true);
  }

  const canFinish = !!showUp;

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (done) {
    const opt = SHOWUP_OPTIONS.find(o => o.id === showUp);
    const positive = showUp === 'yes' || showUp === 'mostly';
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>{opt?.emoji}</Text>
          <Text style={[styles.title, { color: colors.text }]}>Reflected. +20 XP</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            {positive
              ? 'We showed up for ourselves. That is the whole game — one week at a time.'
              : 'Noticing the drift is not failure. It is the beginning of the correction.'}
          </Text>
          {nextMove.trim() ? (
            <View style={[styles.nextMoveCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={[styles.nextMoveLabel, { color: ACCENT }]}>OUR NEXT MOVE</Text>
              <Text style={[styles.nextMoveText, { color: colors.text }]}>"{nextMove.trim()}"</Text>
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

  // ── REFLECT ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backBtnText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>🔍</Text>
        <Text style={[styles.title, { color: colors.text }]}>Weekly check-in with ourselves</Text>
        <Text style={[styles.sub, { color: colors.textLight }]}>
          Three honest questions. No right answers.
        </Text>

        {/* Q1 */}
        <Text style={[styles.q, { color: colors.text }]}>
          1 — Did we show up for ourselves this week?
        </Text>
        <View style={styles.optionList}>
          {SHOWUP_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[
                styles.optionRow,
                { borderColor:     showUp === opt.id ? ACCENT : colors.border,
                  backgroundColor: showUp === opt.id ? ACCENT : colors.surface },
              ]}
              onPress={() => setShowUp(opt.id)}
            >
              <Text style={styles.optionEmoji}>{opt.emoji}</Text>
              <Text style={[styles.optionLabel, { color: showUp === opt.id ? '#fff' : colors.text }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Q2 */}
        <Text style={[styles.q, { color: colors.text }]}>
          2 — One thing that got in the way: <Text style={{ fontWeight: '400', color: colors.textLight }}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="Not an excuse — just honest. What happened?"
          placeholderTextColor={colors.textLight}
          value={gotInWay}
          onChangeText={setGotInWay}
          multiline
        />

        {/* Q3 */}
        <Text style={[styles.q, { color: colors.text }]}>
          3 — One thing we will do differently: <Text style={{ fontWeight: '400', color: colors.textLight }}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.textBox, { backgroundColor: colors.surface, borderColor: nextMove.trim() ? ACCENT : colors.border, color: colors.text }]}
          placeholder="Just one small thing — not a whole plan..."
          placeholderTextColor={colors.textLight}
          value={nextMove}
          onChangeText={setNextMove}
          multiline
        />

        <View style={[styles.noteCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
          <Text style={[styles.noteText, { color: ACCENT }]}>
            💡 The ADHD brain does not automatically notice goal drift and self-correct.
            This reflection is building that signal — one week at a time.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: canFinish ? ACCENT : '#CCC' }]}
          onPress={canFinish ? finish : null}
        >
          <Text style={styles.primaryBtnText}>Done  +20 XP →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 48 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  backBtn:     { marginBottom: 16 },
  backBtnText: { fontSize: 14, fontWeight: '600' },

  title: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },

  q: { fontSize: 15, fontWeight: '800', marginBottom: 12, lineHeight: 22 },

  optionList: { gap: 8, marginBottom: 24 },
  optionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14 },
  optionEmoji:{ fontSize: 20 },
  optionLabel:{ fontSize: 14, fontWeight: '600', flex: 1 },

  textBox: { borderRadius: 12, borderWidth: 1.5, padding: 14, fontSize: 14, minHeight: 72, textAlignVertical: 'top', marginBottom: 20 },

  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  noteText:  { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  nextMoveCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 28, width: '100%' },
  nextMoveLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  nextMoveText:  { fontSize: 15, lineHeight: 24, fontStyle: 'italic' },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
