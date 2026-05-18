import React, { useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';
import SpeakButton from '../../components/SpeakButton';
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

export default function WeeklyPlanner({
  navigation }) {
  const colors = useColors();
  const { plannerTasks, updatePlannerTask, deletePlannerTask, markStepComplete, weeklyCheckIns, ownershipReflections } = useStore(s => ({
    plannerTasks:          s.plannerTasks          || [],
    updatePlannerTask:     s.updatePlannerTask,
    deletePlannerTask:     s.deletePlannerTask,
    markStepComplete:      s.markStepComplete,
    weeklyCheckIns:        s.weeklyCheckIns        || [],
    ownershipReflections:  s.ownershipReflections  || [],
  }));

  const isCheckInDue = (() => {
    if (weeklyCheckIns.length === 0) return true;
    const last = new Date(weeklyCheckIns[weeklyCheckIns.length - 1].date);
    return (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24) >= 6;
  })();

  const showOwnershipBanner = (() => {
    const last = ownershipReflections[ownershipReflections.length - 1];
    const days = last ? (Date.now() - new Date(last.date).getTime()) / (1000 * 60 * 60 * 24) : 999;
    return (new Date().getDay() === 0 || days >= 6) && days > 0.5;
  })();

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Weekly Planner</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>{totalActive} active task{totalActive !== 1 ? 's' : ''}</Text>
        <SpeakButton
          text="Some brains have weaker prospective memory — the system that tracks future tasks and deadlines. Research shows external planning tools compensate directly and reduce missed deadlines by over 40%. Weekly Planner externalizes that system for us. We see the full week, break big tasks into steps, and nothing sneaks up. About 10 minutes to set up. Worth every second."
          style={{ marginBottom: 8 }}
        />
        <View style={[styles.goalCard, { backgroundColor: colors.surface }]}>
          <Text style={styles.goalText}>🎯 Add tasks · schedule steps · check in · reflect</Text>
        </View>
        <View style={styles.headerButtons}>
          {[
            { emoji: '➕', label: 'New Task',  route: 'AddTask',          due: false },
            { emoji: '📅', label: 'Calendar', route: 'WeeklyCalendar',   due: false },
            { emoji: '⭐', label: 'Review',   route: 'WeeklyReview',     due: false },
            { emoji: '📊', label: 'Check-In', route: 'WeeklyCheckIn',    due: isCheckInDue },
            { emoji: '🔍', label: 'Reflect',  route: 'OwnershipReflect', due: showOwnershipBanner },
          ].map(btn => (
            <TouchableOpacity
              key={btn.route}
              style={[
                styles.iconBtn,
                { borderColor: btn.due ? colors.primary : colors.border,
                  backgroundColor: btn.due ? colors.primaryLight : colors.surface },
              ]}
              onPress={() => navigation.navigate(btn.route)}
              activeOpacity={0.8}
            >
              {btn.due && <View style={styles.dueDot} />}
              <Text style={styles.iconBtnEmoji}>{btn.emoji}</Text>
              <Text style={[styles.iconBtnLabel, { color: btn.due ? colors.primary : colors.textLight }]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
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
                  <View key={task.id} style={[styles.taskCard, { backgroundColor: colors.surface }]}>
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

                    {/* Emotional anchor — shown when all steps complete */}
                    {task.emotionalAnchor && completedSteps === totalSteps && totalSteps > 0 && (
                      <View style={[styles.anchorCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary + '40' }]}>
                        <Text style={[styles.anchorLabel, { color: colors.primary }]}>✨ Why this mattered to us:</Text>
                        <Text style={[styles.anchorText, { color: colors.primary }]}>{task.emotionalAnchor}</Text>
                      </View>
                    )}

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

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backFooterBtn}>
          <Text style={[styles.backFooterText, { color: colors.textLight }]}>← Back to Home</Text>
        </TouchableOpacity>
        <View style={{ height: 16 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backFooterBtn:  { alignItems: 'center', paddingVertical: 14 },
  backFooterText: { fontSize: 14, fontWeight: '600' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textLight, marginTop: 2, marginBottom: 10 },
  anchorCard:  { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 10 },
  anchorLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  anchorText:  { fontSize: 14, lineHeight: 20, fontStyle: 'italic' },

  goalCard: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginTop: 6, borderWidth: 1, borderColor: colors.primary + '40' },
  goalText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  iconBtn:       { flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, paddingVertical: 10, paddingHorizontal: 4, position: 'relative' },
  dueDot:        { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  iconBtnEmoji:  { fontSize: 24, marginBottom: 4 },
  iconBtnLabel:  { fontSize: 10, fontWeight: '700', textAlign: 'center' },
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
