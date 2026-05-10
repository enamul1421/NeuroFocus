import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../store';
import { colors } from '../../theme';
import {
  getHorizon, HORIZON_LABELS, formatDate, formatTime, daysUntil,
  cancelStepNotification,
} from './utils';

const TASK_TYPE_ICONS = {
  test: '📝', quiz: '✏️', essay: '📄', lab: '🔬',
  presentation: '🎤', group: '👥', sciencefair: '🧪',
  reading: '📚', other: '📋',
};

const HORIZONS = ['this_week', 'next_2_3_weeks', 'next_4_6_weeks', 'overdue'];

export default function WeeklyPlanner({ navigation }) {
  const { plannerTasks, updatePlannerTask, deletePlannerTask, markStepComplete } = useStore(s => ({
    plannerTasks: s.plannerTasks || [],
    updatePlannerTask: s.updatePlannerTask,
    deletePlannerTask: s.deletePlannerTask,
    markStepComplete: s.markStepComplete,
  }));

  const [expanded, setExpanded] = useState({ this_week: true, next_2_3_weeks: true, next_4_6_weeks: false, overdue: false });
  const [, forceUpdate] = useState(0);

  // Refresh horizons when screen focuses (deadlines may have shifted)
  useFocusEffect(useCallback(() => { forceUpdate(n => n + 1); }, []));

  function toggleSection(horizon) {
    setExpanded(e => ({ ...e, [horizon]: !e[horizon] }));
  }

  function confirmDelete(task) {
    Alert.alert(
      'Delete task?',
      `"${task.title}" and all its scheduled steps will be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            for (const step of task.steps) {
              if (step.sessions) {
                for (const sess of step.sessions) await cancelStepNotification(sess.notificationId);
              } else {
                await cancelStepNotification(step.notificationId);
              }
            }
            deletePlannerTask(task.id);
          },
        },
      ]
    );
  }

  // Group tasks by current horizon (recalculated live)
  const grouped = {};
  for (const h of HORIZONS) grouped[h] = [];
  for (const task of plannerTasks) {
    const h = getHorizon(task.deadline);
    grouped[h].push(task);
  }
  // Sort each group by deadline ascending
  for (const h of HORIZONS) {
    grouped[h].sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  }

  const totalActive = plannerTasks.length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Weekly Planner</Text>
        <Text style={styles.subtitle}>{totalActive} active task{totalActive !== 1 ? 's' : ''}</Text>
        <View style={styles.goalCard}>
          <Text style={styles.goalText}>🎯 Goal: Add tasks, schedule steps, review weekly</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.calBtn} onPress={() => navigation.navigate('WeeklyCalendar')}>
            <Text style={styles.calBtnText}>📅 Schedule View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.reviewBtn} onPress={() => navigation.navigate('WeeklyReview')}>
            <Text style={styles.reviewBtnText}>Score</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddTask')}>
            <Text style={styles.addBtnText}>+ New Task</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {totalActive === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No tasks yet</Text>
            <Text style={styles.emptyBody}>Add upcoming assignments, tests, and projects to plan them before they sneak up on you.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddTask')}>
              <Text style={styles.emptyBtnText}>Add your first task →</Text>
            </TouchableOpacity>
          </View>
        )}

        {HORIZONS.map(horizon => {
          const tasks = grouped[horizon];
          if (tasks.length === 0) return null;
          const info = HORIZON_LABELS[horizon];
          const isOpen = expanded[horizon];

          return (
            <View key={horizon} style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(horizon)}>
                <View style={styles.sectionHeaderLeft}>
                  <Text style={styles.sectionEmoji}>{info.emoji}</Text>
                  <Text style={[styles.sectionLabel, { color: info.color }]}>{info.label}</Text>
                  <View style={[styles.sectionCount, { backgroundColor: info.color + '22' }]}>
                    <Text style={[styles.sectionCountText, { color: info.color }]}>{tasks.length}</Text>
                  </View>
                </View>
                <Text style={styles.sectionChevron}>{isOpen ? '▼' : '▶'}</Text>
              </TouchableOpacity>

              {isOpen && tasks.map(task => {
                const completedSteps = task.steps.filter(s => s.completed).length;
                const totalSteps = task.steps.length;
                const progress = totalSteps > 0 ? completedSteps / totalSteps : 0;
                const days = daysUntil(task.deadline);

                return (
                  <View key={task.id} style={styles.taskCard}>
                    {/* Task header */}
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskIcon}>{TASK_TYPE_ICONS[task.type] || '📋'}</Text>
                      <View style={styles.taskHeaderInfo}>
                        <Text style={styles.taskTitle}>{task.title}</Text>
                        <Text style={styles.taskDeadline}>
                          Due {formatDate(task.deadline)}
                          {days >= 0 ? ` · ${days} day${days !== 1 ? 's' : ''} left` : ' · PAST DUE'}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => confirmDelete(task)} style={styles.deleteBtn}>
                        <Text style={styles.deleteBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: info.color }]} />
                    </View>
                    <Text style={styles.progressLabel}>{completedSteps}/{totalSteps} steps done</Text>

                    {/* Steps */}
                    {task.steps.map(step => (
                      <TouchableOpacity
                        key={step.id}
                        style={[styles.stepRow, step.completed && styles.stepRowDone]}
                        onPress={() => markStepComplete(task.id, step.id, !step.completed)}
                      >
                        <View style={[styles.stepCheck, step.completed && styles.stepCheckDone]}>
                          {step.completed && <Text style={styles.stepCheckMark}>✓</Text>}
                        </View>
                        <View style={styles.stepInfo}>
                          <Text style={[styles.stepName, step.completed && styles.stepNameDone]}>{step.name}</Text>
                          {step.sessions ? step.sessions.map((sess, si) => {
                            const d = new Date(sess.scheduledDate);
                            const end = new Date(d.getTime() + (sess.durationMin || 0) * 60000);
                            const ht = d.getHours() !== 0 || d.getMinutes() !== 0;
                            return (
                              <Text key={sess.id} style={styles.stepSchedule}>
                                {step.sessions.length > 1 ? `Session ${si + 1}: ` : ''}
                                {formatDate(sess.scheduledDate)}
                                {ht ? ` · ${formatTime(sess.scheduledDate)} – ${formatTime(end.toISOString())}` : ''}
                              </Text>
                            );
                          }) : step.scheduledDate ? (
                            <Text style={styles.stepSchedule}>
                              {formatDate(step.scheduledDate)}{step.scheduledTime ? ` at ${formatTime(step.scheduledDate)}` : ''}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textLight, marginTop: 2, marginBottom: 10 },
  goalCard: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: colors.primary + '40' },
  goalText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  calBtn: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  calBtnText: { fontSize: 13, color: colors.text, fontWeight: '700' },
  reviewBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  reviewBtnText: { fontSize: 14, color: colors.primary, fontWeight: '700' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, flex: 1, alignItems: 'center' },
  addBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
  content: { padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 15, color: colors.textLight, textAlign: 'center', lineHeight: 22, marginBottom: 24, paddingHorizontal: 16 },
  emptyBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 4 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionEmoji: { fontSize: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '800', letterSpacing: 0.5 },
  sectionCount: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  sectionCountText: { fontSize: 12, fontWeight: '800' },
  sectionChevron: { fontSize: 12, color: colors.textLight },
  taskCard: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#EBEBEB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  taskIcon: { fontSize: 24, marginRight: 10 },
  taskHeaderInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  taskDeadline: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  deleteBtn: { padding: 4 },
  deleteBtnText: { fontSize: 16, color: '#BDBDBD' },
  progressBarBg: { height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, marginBottom: 4 },
  progressBarFill: { height: 4, borderRadius: 2 },
  progressLabel: { fontSize: 12, color: colors.textLight, marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5', gap: 10 },
  stepRowDone: { opacity: 0.5 },
  stepCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#BDBDBD', alignItems: 'center', justifyContent: 'center' },
  stepCheckDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  stepCheckMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepInfo: { flex: 1 },
  stepName: { fontSize: 14, color: colors.text, fontWeight: '500' },
  stepNameDone: { textDecorationLine: 'line-through', color: colors.textLight },
  stepSchedule: { fontSize: 12, color: colors.primary, marginTop: 2 },
});
