import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import { useColors } from '../theme';

const LEVELS = [
  { emoji: '😊', label: 'Calm',      value: 2, color: '#4CAF50' },
  { emoji: '🙂', label: 'Okay',      value: 4, color: '#8BC34A' },
  { emoji: '😤', label: 'Tense',     value: 6, color: '#FF9800' },
  { emoji: '😠', label: 'Angry',     value: 8, color: '#F44336' },
  { emoji: '🤯', label: 'Explosive', value: 10, color: '#B71C1C' },
];

export default function AngerCheckIn({ onHighAnger }) {
  const colors = useColors();
  const { addAngerCheckIn, angerCheckIns } = useStore(s => ({
    addAngerCheckIn: s.addAngerCheckIn,
    angerCheckIns:   s.angerCheckIns || [],
  }));

  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);

  // Already checked in within last 3 hours?
  const recent = angerCheckIns.find(c => {
    return (Date.now() - new Date(c.timestamp).getTime()) < 3 * 60 * 60 * 1000;
  });
  if (recent && !done) return null;

  function handleTap(level) {
    setSelected(level.value);
    setDone(true);
    addAngerCheckIn({
      timestamp: new Date().toISOString(),
      rating: level.value,
      label: level.label,
    });
    if (level.value >= 6) {
      setTimeout(() => onHighAnger?.(level.value), 400);
    }
  }

  if (done && selected) {
    const level = LEVELS.find(l => l.value === selected);
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: level.color + '60' }]}>
        <Text style={[styles.doneText, { color: colors.text }]}>
          {level.emoji}  Logged as <Text style={{ color: level.color, fontWeight: '800' }}>{level.label}</Text>
          {selected <= 4 ? '  — we are doing well.' : selected <= 6 ? '  — noted. Keep an eye on it.' : '  — CoolDown is ready for us.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textLight }]}>How are we right now?</Text>
      <View style={styles.row}>
        {LEVELS.map(level => (
          <TouchableOpacity
            key={level.value}
            style={[styles.btn, { borderColor: level.color + '40', backgroundColor: level.color + '18' }]}
            onPress={() => handleTap(level)}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{level.emoji}</Text>
            <Text style={[styles.btnLabel, { color: level.color }]}>{level.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  label:     { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  row:       { flexDirection: 'row', gap: 6 },
  btn:       { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 8 },
  emoji:     { fontSize: 20, marginBottom: 2 },
  btnLabel:  { fontSize: 9, fontWeight: '700' },
  doneText:  { fontSize: 13, lineHeight: 20 },
});
