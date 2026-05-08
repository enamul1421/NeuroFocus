import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store';
import { colors } from '../../theme';
import { scheduleWeeklyReview, formatDate } from './utils';
import { logSession } from '../../services/logger';

const GRADE_OPTIONS = [
  { value: 1, label: "Didn't do it",    emoji: '😟', color: '#F44336' },
  { value: 2, label: 'Barely started',  emoji: '😕', color: '#FF9800' },
  { value: 3, label: 'Partial',         emoji: '😐', color: '#FFC107' },
  { value: 4, label: 'Mostly done',     emoji: '🙂', color: '#8BC34A' },
  { value: 5, label: 'Nailed it',       emoji: '😄', color: '#4CAF50' },
];

export default function WeeklyReview({ navigation }) {
  const {
    plannerTasks, updatePlannerTask, addWeeklyReview,
    reviewNotificationTime, setReviewNotificationTime, participantCode,
  } = useStore(s => ({
    plannerTasks: s.plannerTasks || [],
    updatePlannerTask: s.updatePlannerTask,
    addWeeklyReview: s.addWeeklyReview,
    reviewNotificationTime: s.reviewNotificationTime || { hour: 10, minute: 0 },
    setReviewNotificationTime: s.setReviewNotificationTime,
    participantCode: s.participantCode,
  }));

  const activeTasks = plannerTasks.filter(t => t.status === 'active');
  const [grades, setGrades] = useState({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [reviewTime, setReviewTime] = useState(() => {
    const d = new Date();
    d.setHours(reviewNotificationTime.hour, reviewNotificationTime.minute, 0, 0);
    return d;
  });
  const [submitted, setSubmitted] = useState(false);

  function setGrade(taskId, value) {
    setGrades(g => ({ ...g, [taskId]: value }));
  }

  async function submitReview() {
    const review = {
      date: new Date().toISOString(),
      weekOf: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      grades,
      totalTasks: activeTasks.length,
      avgGrade: activeTasks.length > 0
        ? (Object.values(grades).reduce((a, b) => a + b, 0) / Object.values(grades).length).toFixed(1)
        : null,
    };

    // Save grades back to tasks
    for (const task of activeTasks) {
      if (grades[task.id]) {
        updatePlannerTask(task.id, { weeklyGrade: grades[task.id] });
      }
    }

    addWeeklyReview(review);
    await logSession(participantCode, { module: 'WeeklyReview', ...review });
    setSubmitted(true);
  }

  async function saveReviewTime(date) {
    const h = date.getHours();
    const m = date.getMinutes();
    setReviewTime(date);
    setReviewNotificationTime(h, m);
    await scheduleWeeklyReview(h, m);
  }

  if (submitted) {
    const gradedCount = Object.keys(grades).length;
    const avg = gradedCount > 0
      ? (Object.values(grades).reduce((a, b) => a + b, 0) / gradedCount).toFixed(1)
      : 0;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.doneEmoji}>
            {avg >= 4 ? '🌟' : avg >= 3 ? '💪' : '🔄'}
          </Text>
          <Text style={styles.doneTitle}>Review complete</Text>
          <Text style={styles.doneBody}>
            {gradedCount} task{gradedCount !== 1 ? 's' : ''} reviewed · avg score {avg}/5
          </Text>
          {avg < 3 && (
            <Text style={styles.doneNote}>
              Tough week. The goal isn't perfection — it's catching issues early enough to adjust.
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>Done ✓</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.headline}>Weekly Review</Text>
        <Text style={styles.body}>
          How did last week go? Grade each active task. This takes 2 minutes.
        </Text>

        {activeTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No active tasks to review yet.</Text>
            <Text style={styles.emptySubtext}>Add tasks first, then come back Saturday to review them.</Text>
          </View>
        ) : (
          activeTasks.map(task => (
            <View key={task.id} style={styles.taskReviewCard}>
              <Text style={styles.taskReviewTitle}>{task.title}</Text>
              <Text style={styles.taskReviewDeadline}>Due {formatDate(task.deadline)}</Text>

              <Text style={styles.gradeLabel}>How did you do this week?</Text>
              <View style={styles.gradeRow}>
                {GRADE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.gradeBtn, grades[task.id] === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '15' }]}
                    onPress={() => setGrade(task.id, opt.value)}
                  >
                    <Text style={styles.gradeEmoji}>{opt.emoji}</Text>
                    <Text style={[styles.gradeText, grades[task.id] === opt.value && { color: opt.color, fontWeight: '700' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}

        {/* Review reminder time setting */}
        <View style={styles.reminderCard}>
          <Text style={styles.reminderTitle}>📅 Saturday review reminder</Text>
          <Text style={styles.reminderBody}>The app will remind you every Saturday at:</Text>
          <TouchableOpacity style={styles.timeButton} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.timeButtonText}>
              {reviewTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
            </Text>
            <Text style={styles.timeButtonEdit}>Change</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={reviewTime}
              mode="time"
              display="spinner"
              onChange={(_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) saveReviewTime(date);
              }}
            />
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {activeTasks.length > 0 && (
        <TouchableOpacity
          style={[styles.button, Object.keys(grades).length === 0 && styles.buttonDisabled]}
          onPress={submitReview}
          disabled={Object.keys(grades).length === 0}
        >
          <Text style={styles.buttonText}>
            Submit review ({Object.keys(grades).length}/{activeTasks.length} graded)
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 16 },
  backBtn: { marginBottom: 16 },
  backBtnText: { fontSize: 15, color: colors.primary },
  headline: { fontSize: 28, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 20 },
  taskReviewCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EBEBEB' },
  taskReviewTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  taskReviewDeadline: { fontSize: 13, color: colors.textLight, marginTop: 2, marginBottom: 14 },
  gradeLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 10 },
  gradeRow: { gap: 8 },
  gradeBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 12 },
  gradeEmoji: { fontSize: 20 },
  gradeText: { fontSize: 14, color: colors.text },
  reminderCard: { backgroundColor: '#E8F5E9', borderRadius: 14, padding: 16, marginTop: 8, borderWidth: 1, borderColor: '#A5D6A7' },
  reminderTitle: { fontSize: 15, fontWeight: '700', color: '#2E7D32', marginBottom: 4 },
  reminderBody: { fontSize: 13, color: '#388E3C', marginBottom: 10 },
  timeButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#A5D6A7', padding: 12 },
  timeButtonText: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  timeButtonEdit: { fontSize: 13, color: '#388E3C' },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.text },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginTop: 6, textAlign: 'center' },
  doneEmoji: { fontSize: 64, textAlign: 'center', marginBottom: 16 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  doneBody: { fontSize: 16, color: colors.textLight, textAlign: 'center', marginBottom: 12 },
  doneNote: { fontSize: 15, color: colors.primary, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  button: { backgroundColor: colors.primary, marginHorizontal: 24, marginBottom: 32, padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonDisabled: { backgroundColor: '#CCC' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
