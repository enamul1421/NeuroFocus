import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useStore } from '../../store';
import { logSession } from '../../services/logger';
import { colors, useColors } from '../../theme';

const QUESTIONS = [
  { id: 'homework', label: 'I completed my homework on time this week.' },
  { id: 'prepared', label: 'I felt prepared for class this week.' },
  { id: 'morning', label: 'I managed my morning routine successfully this week.' },
];

const SCALE = [
  { value: 1, label: 'Never' },
  { value: 2, label: 'Rarely' },
  { value: 3, label: 'Sometimes' },
  { value: 4, label: 'Usually' },
  { value: 5, label: 'Always' },
];

// Current study week number (week 1 = first week of intervention)
function getStudyWeek(startDate) {
  if (!startDate) return 1;
  const ms = Date.now() - new Date(startDate).getTime();
  return Math.max(1, Math.ceil(ms / (7 * 24 * 60 * 60 * 1000)));
}

export default function WeeklyCheckIn({
  navigation }) {
  const colors = useColors();
  const { addWeeklyCheckIn, participantCode, lastSessionDate } = useStore(s => ({
    addWeeklyCheckIn: s.addWeeklyCheckIn,
    participantCode: s.participantCode,
    lastSessionDate: s.lastSessionDate,
  }));

  const [answers, setAnswers] = useState({});
  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined);

  function setAnswer(questionId, value) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  async function submit() {
    const week = getStudyWeek(lastSessionDate);
    const checkIn = {
      week,
      date: new Date().toISOString().split('T')[0],
      homework: answers.homework,
      prepared: answers.prepared,
      morning: answers.morning,
    };

    addWeeklyCheckIn(checkIn);

    await logSession(participantCode, {
      module: 'WeeklyCheckIn',
      weekNumber: week,
      weeklyHomework: answers.homework,
      weeklyPrepared: answers.prepared,
      weeklyMorning: answers.morning,
    });

    navigation.goBack();
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.moduleTag, { color: colors.text }]}>Weekly Check-In</Text>
        <Text style={[styles.headline, { color: colors.text }]}>How was your week?</Text>
        <Text style={styles.note}>3 quick questions. Honest answers only — no judgment.</Text>

        {QUESTIONS.map(q => (
          <View key={q.id} style={styles.questionBlock}>
            <Text style={styles.questionText}>{q.label}</Text>
            <View style={styles.scaleRow}>
              {SCALE.map(s => (
                <TouchableOpacity
                  key={s.value}
                  style={[
                    styles.scaleButton,
                    answers[q.id] === s.value && styles.scaleButtonSelected,
                  ]}
                  onPress={() => setAnswer(q.id, s.value)}
                  accessibilityLabel={s.label}
                >
                  <Text style={[
                    styles.scaleValue,
                    answers[q.id] === s.value && styles.scaleValueSelected,
                  ]}>
                    {s.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.scaleLabels}>
              <Text style={styles.scaleLabelText}>Never</Text>
              <Text style={styles.scaleLabelText}>Always</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.button, !allAnswered && styles.buttonDisabled]}
        onPress={submit}
        disabled={!allAnswered}
      >
        <Text style={styles.buttonText}>Submit ✓</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 28, paddingBottom: 16 },
  moduleTag: { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
  headline: { fontSize: 30, fontWeight: '800', color: colors.text, marginBottom: 8 },
  note: { fontSize: 15, color: colors.textLight, lineHeight: 22, marginBottom: 28 },
  questionBlock: { marginBottom: 28 },
  questionText: { fontSize: 16, fontWeight: '600', color: colors.text, lineHeight: 24, marginBottom: 14 },
  scaleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  scaleButtonSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleValue: { fontSize: 18, fontWeight: '700', color: colors.textLight },
  scaleValueSelected: { color: '#fff' },
  scaleLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleLabelText: { fontSize: 11, color: colors.textLight },
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
