import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import { useColors } from '../theme';

const STATES = [
  { id: 'hungry', emoji: '😋', label: 'Hungry',  color: '#FF8F00',
    tip: 'Eat before the next task — even small. Low blood sugar crashes focus.',
    sub: ['Famished', 'A bit hungry', 'Thirsty', 'Empty feeling'] },
  { id: 'tired',  emoji: '😴', label: 'Tired',   color: '#5C6BC0',
    tip: 'Rest eyes 5 min or move. Pushing through tired almost never works.',
    sub: ['Sleepy', 'Drained', 'Foggy', 'Groggy'] },
  { id: 'tense',  emoji: '😤', label: 'Tense',   color: '#E53935',
    tip: 'Roll shoulders back and down. Three slow breaths out.',
    sub: ['Anxious', 'Irritated', 'Overwhelmed', 'Dreading something'] },
  { id: 'wired',  emoji: '⚡', label: 'Wired',   color: '#F57F17',
    tip: '20 jumping jacks before sitting. Body needs to discharge first.',
    sub: ['Restless', 'Hyper', 'Buzzing', 'Cannot settle'] },
  { id: 'flat',   emoji: '😶', label: 'Flat',    color: '#546E7A',
    tip: 'Cold water, bright light, or upbeat music raises the signal.',
    sub: ['Numb', 'Bored', 'Disconnected', 'Low energy'] },
  { id: 'good',   emoji: '😊', label: 'Good',    color: '#2E7D32',
    tip: 'Body is regulated. This is our window — use it.',
    sub: ['Content', 'Energized', 'Calm', 'Excited'] },
];

const PRIORITY_ORDER = ['hungry', 'wired', 'tense', 'tired', 'flat', 'good'];

export default function BodyCheckIn() {
  const colors = useColors();
  const { addBodyCheckIn, bodyCheckIns } = useStore(s => ({
    addBodyCheckIn: s.addBodyCheckIn,
    bodyCheckIns:   s.bodyCheckIns || [],
  }));

  const [open,      setOpen]      = useState(false);
  const [selected,  setSelected]  = useState([]);
  const [subLabels, setSubLabels] = useState({});
  const [done,      setDone]      = useState(false);

  const recent = bodyCheckIns.find(
    c => (Date.now() - new Date(c.timestamp).getTime()) < 3 * 60 * 60 * 1000
  );
  if (recent && !done) return null;

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
    if (selected.includes(id)) {
      setSubLabels(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
  }

  function setSubLabel(stateId, label) {
    setSubLabels(prev => ({ ...prev, [stateId]: label }));
  }

  function confirm() {
    addBodyCheckIn({ timestamp: new Date().toISOString(), states: selected, subLabels });
    setDone(true);
    setOpen(false);
  }

  const pendingSubState = selected.find(id => !subLabels[id]);
  const pendingState    = pendingSubState ? STATES.find(s => s.id === pendingSubState) : null;

  // ── Done state ────────────────────────────────────────────────────────────────
  if (done && selected.length > 0) {
    const topId = PRIORITY_ORDER.find(id => selected.includes(id)) || selected[0];
    const top   = STATES.find(s => s.id === topId);
    const sub   = subLabels[topId];
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: top.color + '60' }]}>
        <Text style={[styles.doneText, { color: colors.text }]}>
          {selected.map(id => STATES.find(s => s.id === id)?.emoji).join('  ')}
          {'  '}
          {sub && <Text style={{ color: top.color, fontWeight: '900' }}>{sub}{'  '}</Text>}
          <Text style={{ color: top.color, fontWeight: '600' }}>—{'  '}{top.tip}</Text>
        </Text>
      </View>
    );
  }

  // ── Collapsed single-line ────────────────────────────────────────────────────
  if (!open) {
    return (
      <TouchableOpacity
        style={[styles.collapsedRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.collapsedEmojis}>
          {STATES.map(s => s.emoji).join(' ')}
        </Text>
        <Text style={[styles.collapsedLabel, { color: colors.textLight }]}>
          How is our body?
        </Text>
        <Text style={[styles.collapsedChevron, { color: colors.textLight }]}>›</Text>
      </TouchableOpacity>
    );
  }

  // ── Expanded ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.expandedHeader}>
        <Text style={[styles.label, { color: colors.textLight }]}>How is our body?</Text>
        <TouchableOpacity onPress={() => { setOpen(false); setSelected([]); setSubLabels({}); }}>
          <Text style={[styles.collapseBtn, { color: colors.textLight }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        {STATES.map(s => (
          <TouchableOpacity
            key={s.id}
            style={[
              styles.stateBtn,
              { borderColor:     selected.includes(s.id) ? s.color      : s.color + '50',
                backgroundColor: selected.includes(s.id) ? s.color + '25' : s.color + '10' },
            ]}
            onPress={() => toggle(s.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.stateEmoji}>{s.emoji}</Text>
            <Text style={[styles.stateLabel, { color: s.color }]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {pendingState && (
        <View style={styles.subRow}>
          <Text style={[styles.subPrompt, { color: colors.textLight }]}>
            {pendingState.emoji} more specifically:
          </Text>
          <View style={styles.subChips}>
            {pendingState.sub.map(sl => (
              <TouchableOpacity
                key={sl}
                style={[styles.subChip, { borderColor: pendingState.color }]}
                onPress={() => setSubLabel(pendingState.id, sl)}
              >
                <Text style={[styles.subChipText, { color: pendingState.color }]}>{sl}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selected.length > 0 && (
        <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
          <Text style={styles.confirmBtnText}>Got it →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Collapsed single-line
  collapsedRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 10, marginBottom: 10 },
  collapsedEmojis:  { fontSize: 14, letterSpacing: 1 },
  collapsedLabel:   { flex: 1, fontSize: 12, fontWeight: '600' },
  collapsedChevron: { fontSize: 18, fontWeight: '700' },

  // Expanded
  container:    { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  expandedHeader:{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  label:        { flex: 1, fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  collapseBtn:  { fontSize: 16, fontWeight: '700', paddingHorizontal: 4 },

  grid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  stateBtn:     { borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 6, width: '30%' },
  stateEmoji:   { fontSize: 18, marginBottom: 2 },
  stateLabel:   { fontSize: 10, fontWeight: '700' },

  subRow:       { borderTopWidth: 1, borderColor: '#F0F0F0', paddingTop: 8, marginTop: 4, marginBottom: 4 },
  subPrompt:    { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  subChips:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  subChip:      { borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  subChipText:  { fontSize: 12, fontWeight: '700' },

  confirmBtn:     { borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 6, backgroundColor: '#2E7D32' },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  doneText:       { fontSize: 13, lineHeight: 22 },
});
