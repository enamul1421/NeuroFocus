import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

const CHALLENGES = [
  { id: 'time', label: 'Losing track of time', module: 'TimeWise' },
  { id: 'initiation', label: 'Forgetting to start things', module: 'PlanForward' },
  { id: 'planning', label: 'Getting overwhelmed by big projects', module: 'PlanForward' },
  { id: 'focus', label: 'Staying focused', module: 'FocusControl' },
  { id: 'emotion', label: 'Managing emotions when stressed', module: 'MoodBridge' },
  { id: 'confidence', label: 'Believing I can do it', module: 'ConfidenceCore' },
];

export default function Screen3Challenges({ navigation }) {
  const setOnboardingData = useStore(s => s.setOnboardingData);
  const [selected, setSelected] = useState([]);

  function toggle(id) {
    if (selected.includes(id)) {
      setSelected(prev => prev.filter(c => c !== id));
    } else if (selected.length < 2) {
      setSelected(prev => [...prev, id]);
    }
  }

  function next() {
    setOnboardingData({ topChallenges: selected });
    navigation.navigate('Screen4Research');
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>Step 2 of 3</Text>
        <Text style={styles.headline}>Your biggest challenges</Text>
        <Text style={styles.note}>Pick your top 2. This shapes your daily sessions.</Text>

        {CHALLENGES.map(c => {
          const isSelected = selected.includes(c.id);
          const isDisabled = !isSelected && selected.length >= 2;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.option, isSelected && styles.optionSelected, isDisabled && styles.optionDisabled]}
              onPress={() => toggle(c.id)}
              disabled={isDisabled}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
            >
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionText, isDisabled && styles.disabledText]}>{c.label}</Text>
                <Text style={styles.moduleTag}>{c.module} module</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {selected.length === 2 && (
          <Text style={styles.hint}>These two will appear most often in your daily session.</Text>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, selected.length < 2 && styles.buttonDisabled]}
        onPress={next}
        disabled={selected.length < 2}
      >
        <Text style={styles.buttonText}>Next →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 28, paddingBottom: 16 },
  step: { fontSize: 13, color: colors.textLight, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 8 },
  note: { fontSize: 15, color: colors.textLight, marginBottom: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  optionDisabled: { opacity: 0.4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontWeight: '800', fontSize: 13 },
  optionText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  disabledText: { color: '#AAA' },
  moduleTag: { fontSize: 12, color: colors.primary, marginTop: 2, fontWeight: '500' },
  hint: { fontSize: 14, color: colors.primary, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  button: {
    backgroundColor: colors.primary,
    marginHorizontal: 28,
    marginBottom: 32,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
