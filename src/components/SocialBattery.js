import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import { useColors } from '../theme';

// Social battery — tracking social energy depletion.
// Particularly relevant for autism (social interaction is cognitively costly).
// Shows from 3pm onward, hides once logged for 4 hours.

const LEVELS = [
  { value: 5, emoji: '⚡', label: 'Full',    color: '#2E7D32', tip: null },
  { value: 4, emoji: '🔋', label: 'Good',    color: '#558B2F', tip: null },
  { value: 3, emoji: '🪫', label: 'Half',    color: '#F57F17', recovery: 15,
    tip: '15 min alone before the next social thing.' },
  { value: 2, emoji: '😔', label: 'Drained', color: '#E65100', recovery: 30,
    tip: '30 min quiet — no screens, no demands, no talking.' },
  { value: 1, emoji: '💀', label: 'Empty',   color: '#B71C1C', recovery: 60,
    tip: 'Full recharge needed. Quiet, low stimulation, no obligations.' },
];

export default function SocialBattery() {
  const colors = useColors();
  const { addSocialBatteryLog, socialBatteryLogs } = useStore(s => ({
    addSocialBatteryLog: s.addSocialBatteryLog,
    socialBatteryLogs:  s.socialBatteryLogs || [],
  }));

  const [selected, setSelected] = useState(null);
  const [done,     setDone]     = useState(false);

  const h = new Date().getHours();
  // Only show 3pm–midnight
  if (h < 15) return null;

  // Already logged within 4 hours
  const recent = socialBatteryLogs.find(
    l => (Date.now() - new Date(l.timestamp).getTime()) < 4 * 60 * 60 * 1000
  );
  if (recent && !done) return null;

  function confirm() {
    addSocialBatteryLog({ timestamp: new Date().toISOString(), level: selected });
    setDone(true);
  }

  if (done && selected) {
    const lvl = LEVELS.find(l => l.value === selected);
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: lvl.color + '50' }]}>
        <Text style={[styles.doneText, { color: colors.text }]}>
          {lvl.emoji}{'  '}
          <Text style={{ fontWeight: '700', color: lvl.color }}>Social battery: {lvl.label}</Text>
          {lvl.tip ? <Text style={{ color: colors.textLight }}>{'  —  '}{lvl.tip}</Text> : <Text style={{ color: lvl.color }}>{'  — good to go.'}</Text>}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textLight }]}>Social battery — how charged are we?</Text>
      <View style={styles.row}>
        {LEVELS.map(l => (
          <TouchableOpacity
            key={l.value}
            style={[
              styles.btn,
              { borderColor:     selected === l.value ? l.color      : l.color + '40',
                backgroundColor: selected === l.value ? l.color + '22' : l.color + '0A' },
            ]}
            onPress={() => setSelected(l.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.btnEmoji}>{l.emoji}</Text>
            <Text style={[styles.btnLabel, { color: l.color }]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected !== null && (
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: LEVELS.find(l => l.value === selected)?.color }]}
          onPress={confirm}
        >
          <Text style={styles.confirmBtnText}>Logged →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:     { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  label:         { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  row:           { flexDirection: 'row', gap: 5 },
  btn:           { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 8 },
  btnEmoji:      { fontSize: 18, marginBottom: 2 },
  btnLabel:      { fontSize: 9, fontWeight: '700' },
  confirmBtn:    { borderRadius: 10, padding: 9, alignItems: 'center', marginTop: 8 },
  confirmBtnText:{ color: '#fff', fontSize: 13, fontWeight: '800' },
  doneText:      { fontSize: 13, lineHeight: 22 },
});
