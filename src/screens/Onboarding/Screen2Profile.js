import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';

const DIAGNOSES = [
  { id: 'adhd', label: 'ADHD / attention differences' },
  { id: 'asd', label: 'Autism / ASD' },
  { id: 'dyslexia', label: 'Dyslexia / reading differences' },
  { id: 'anxiety', label: 'Anxiety' },
  { id: 'other', label: 'Other / prefer not to say' },
];

export default function Screen2Profile({
  navigation }) {
  const colors = useColors();
  const setOnboardingData = useStore(s => s.setOnboardingData);
  const [nickname,     setNickname]     = useState('');
  const [trustedAdult, setTrustedAdult] = useState('');
  const [selected,     setSelected]     = useState([]);

  function toggle(id) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  }

  function next() {
    setOnboardingData({ userNickname: nickname, diagnoses: selected, trustedAdultName: trustedAdult.trim() });
    navigation.navigate('Screen3Challenges');
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>Step 1 of 3</Text>
        <Text style={[styles.headline, { color: colors.text }]}>Your brain profile</Text>
        <Text style={styles.note}>This personalizes your modules. No judgment, no sharing.</Text>

        <Text style={styles.label}>What should we call you?</Text>
        <TextInput
          style={styles.input}
          placeholder="Nickname (optional)"
          placeholderTextColor={colors.textLight}
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
        />

        <Text style={styles.label}>
          Is there anyone who tends to listen?{' '}
          <Text style={styles.labelSub}>(optional)</Text>
        </Text>
        <Text style={styles.labelHint}>
          A person, a counselor, anyone — or leave blank. No pressure.
        </Text>
        <TextInput
          style={styles.input}
          placeholder="Their name, if someone comes to mind..."
          placeholderTextColor={colors.textLight}
          value={trustedAdult}
          onChangeText={setTrustedAdult}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Which of these fit you? <Text style={styles.labelSub}>(Select all that apply)</Text></Text>
        {DIAGNOSES.map(d => (
          <TouchableOpacity
            key={d.id}
            style={[styles.option, selected.includes(d.id) && styles.optionSelected]}
            onPress={() => toggle(d.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected.includes(d.id) }}
          >
            <View style={[styles.checkbox, selected.includes(d.id) && styles.checkboxSelected]}>
              {selected.includes(d.id) && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.optionText}>{d.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, selected.length === 0 && styles.buttonDisabled]}
        onPress={next}
        disabled={selected.length === 0}
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
  label: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 10, marginTop: 8 },
  labelSub:  { fontWeight: '400', color: colors.textLight },
  labelHint: { fontSize: 13, color: colors.textLight, marginBottom: 10, marginTop: -6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: colors.text,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  optionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
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
  optionText: { fontSize: 16, color: colors.text, flex: 1 },
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
