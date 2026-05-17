import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';

export default function Screen4Research({
  navigation }) {
  const colors = useColors();
  const { setOnboardingData, completeOnboarding } = useStore(s => ({
    setOnboardingData: s.setOnboardingData,
    completeOnboarding: s.completeOnboarding,
  }));

  const [inStudy, setInStudy] = useState(null); // null | true | false
  const [code, setCode] = useState('');

  function finish() {
    setOnboardingData({
      isResearchParticipant: inStudy === true,
      participantCode: inStudy === true ? code.trim().toUpperCase() : '',
    });
    completeOnboarding();
  }

  const canFinish = inStudy === false || (inStudy === true && code.trim().length >= 3);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={[styles.headline, { color: colors.text }]}>Research study</Text>
        <Text style={styles.note}>
          NeuroFocus is also a research study at Westview High School.
          If you're participating, your session data is logged anonymously
          to help us understand if the app works.
        </Text>

        <Text style={styles.label}>Are you participating in the NeuroFocus study?</Text>

        <TouchableOpacity
          style={[styles.option, inStudy === true && styles.optionSelected]}
          onPress={() => setInStudy(true)}
        >
          <View style={[styles.radio, inStudy === true && styles.radioSelected]} />
          <Text style={styles.optionText}>Yes — I have a participant code</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.option, inStudy === false && styles.optionSelected]}
          onPress={() => setInStudy(false)}
        >
          <View style={[styles.radio, inStudy === false && styles.radioSelected]} />
          <Text style={styles.optionText}>No — I'm using the app on my own</Text>
        </TouchableOpacity>

        {inStudy === true && (
          <View style={styles.codeSection}>
            <Text style={styles.label}>Enter your participant code</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. P001"
              placeholderTextColor={colors.textLight}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            <Text style={styles.privacyNote}>
              Your code links your session data without using your name.
              Make sure your parent has signed the consent form.
            </Text>
          </View>
        )}

        {inStudy === false && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              No problem. NeuroFocus works the same for you — just no research data logging.
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, !canFinish && styles.buttonDisabled]}
        onPress={finish}
        disabled={!canFinish}
      >
        <Text style={styles.buttonText}>Start using NeuroFocus →</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 28, paddingBottom: 16 },
  step: { fontSize: 13, color: colors.textLight, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 8 },
  note: { fontSize: 15, color: colors.textLight, lineHeight: 22, marginBottom: 24 },
  label: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 12 },
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
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 12,
  },
  radioSelected: { borderColor: colors.primary, backgroundColor: colors.primary },
  optionText: { fontSize: 16, color: colors.text, flex: 1 },
  codeSection: { marginTop: 8 },
  input: {
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 10,
    padding: 14,
    fontSize: 20,
    letterSpacing: 4,
    color: colors.text,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  privacyNote: { fontSize: 13, color: colors.textLight, lineHeight: 20 },
  infoBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
  },
  infoText: { fontSize: 15, color: colors.primary, lineHeight: 22 },
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
