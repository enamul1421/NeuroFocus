import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import { useColors } from '../theme';

const RATINGS = [
  { value: 1, emoji: '😴', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Poor'     },
  { value: 3, emoji: '😐', label: 'Okay'     },
  { value: 4, emoji: '🙂', label: 'Good'     },
  { value: 5, emoji: '😊', label: 'Great'    },
];

const TIPS = {
  1: 'Low sleep affects everything today. Gentle on ourselves — shorter sessions are fine.',
  2: 'Not our best night. Worth noting if this is a pattern.',
  3: 'Decent rest. Should be able to focus for normal sessions.',
  4: 'Good sleep. Brain will be ready for training today.',
  5: 'Great sleep. This is when we make the most gains — use it.',
};

export default function SleepQualityCheckIn() {
  const colors = useColors();
  const { addSleepQualityLog, sleepQualityLogs } = useStore(s => ({
    addSleepQualityLog: s.addSleepQualityLog,
    sleepQualityLogs:   s.sleepQualityLogs || [],
  }));

  const [selected, setSelected] = useState(null);
  const [done,     setDone]     = useState(false);

  const h     = new Date().getHours();
  const today = new Date().toISOString().split('T')[0];

  // Show only between 6am and noon
  if (h < 6 || h >= 12) return null;

  // Already logged today
  const loggedToday = sleepQualityLogs.some(l => l.date === today);
  if (loggedToday && !done) return null;

  function confirm() {
    addSleepQualityLog({ date: today, rating: selected });
    setDone(true);
  }

  if (done && selected) {
    const r = RATINGS.find(r => r.value === selected);
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: '#9FA8DA60' }]}>
        <Text style={[styles.doneText, { color: colors.text }]}>
          {r.emoji}  <Text style={{ fontWeight: '700', color: '#1A237E' }}>{r.label} sleep</Text>
          {'  '}—{'  '}
          <Text style={{ color: colors.textLight }}>{TIPS[selected]}</Text>
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textLight }]}>How did we sleep?</Text>
      <View style={styles.row}>
        {RATINGS.map(r => (
          <TouchableOpacity
            key={r.value}
            style={[
              styles.btn,
              { borderColor: selected === r.value ? '#1A237E' : '#9FA8DA40',
                backgroundColor: selected === r.value ? '#1A237E' : '#E8EAF620' },
            ]}
            onPress={() => setSelected(r.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.btnEmoji}>{r.emoji}</Text>
            <Text style={[styles.btnLabel, { color: selected === r.value ? '#fff' : '#5C6BC0' }]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {selected && (
        <TouchableOpacity
          style={[styles.confirmBtn, { backgroundColor: '#1A237E' }]}
          onPress={confirm}
        >
          <Text style={styles.confirmBtnText}>Logged →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 12 },
  label:       { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.3 },
  row:         { flexDirection: 'row', gap: 5 },
  btn:         { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 8 },
  btnEmoji:    { fontSize: 18, marginBottom: 2 },
  btnLabel:    { fontSize: 9, fontWeight: '700' },
  confirmBtn:  { borderRadius: 10, padding: 9, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  doneText:    { fontSize: 13, lineHeight: 20 },
});
