import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useStore } from '../../store';
import { colors } from '../../theme';

const TASK_COLORS = {
  test: '#F44336', quiz: '#FF9800', essay: '#9C27B0',
  lab: '#2196F3', presentation: '#00BCD4', group: '#4CAF50',
  sciencefair: '#FF5722', reading: '#795548', other: '#607D8B',
};
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMondayOf(date) {
  const d = new Date(date);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? -6 : 1 - dow));
  d.setHours(0, 0, 0, 0);
  return d;
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtMins(mins) {
  const n = Number(mins) || 0;
  if (n < 60) return `${n}m`;
  const h = Math.floor(n / 60), m = n % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function WeeklyCalendar({ navigation }) {
  const plannerTasks = useStore(s => s.plannerTasks || []);
  const [weekStart, setWeekStart] = useState(() => getMondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => new Date().toDateString());

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d;
    }), [weekStart]);

  const sessionsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach(d => { map[d.toDateString()] = []; });
    for (const task of plannerTasks) {
      for (const step of (task.steps || [])) {
        for (const sess of (step.sessions || [])) {
          if (!sess.scheduledDate) continue;
          const key = new Date(sess.scheduledDate).toDateString();
          if (map[key]) {
            map[key].push({
              taskTitle: task.title,
              stepName: step.name,
              type: task.type,
              scheduledDate: sess.scheduledDate,
              durationMin: sess.durationMin || 30,
            });
          }
        }
      }
    }
    Object.keys(map).forEach(k =>
      map[k].sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))
    );
    return map;
  }, [plannerTasks, weekDays]);

  const totalSessions = Object.values(sessionsByDay).reduce((s, arr) => s + arr.length, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekLabel =
    `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ` +
    `${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  function shiftWeek(delta) {
    setSelectedDay(null);
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta * 7);
      return d;
    });
  }

  const visibleDays = selectedDay ? weekDays.filter(d => d.toDateString() === selectedDay) : weekDays;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Calendar</Text>
          {totalSessions > 0 && (
            <Text style={styles.subtitle}>{totalSessions} session{totalSessions !== 1 ? 's' : ''} this week</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => { setWeekStart(getMondayOf(new Date())); setSelectedDay(null); }}>
          <Text style={styles.todayBtn}>Today</Text>
        </TouchableOpacity>
      </View>

      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity style={styles.weekNavBtn} onPress={() => shiftWeek(-1)}>
          <Text style={styles.weekNavText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity style={styles.weekNavBtn} onPress={() => shiftWeek(1)}>
          <Text style={styles.weekNavText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day strip */}
      <View style={styles.dayStrip}>
        {weekDays.map(day => {
          const key = day.toDateString();
          const isToday = day.getTime() === today.getTime();
          const isSelected = selectedDay === key;
          const count = (sessionsByDay[key] || []).length;
          return (
            <TouchableOpacity
              key={key}
              style={styles.dayStripCell}
              onPress={() => setSelectedDay(isSelected ? null : key)}
            >
              <Text style={[styles.dayStripName, isToday && styles.dayStripNameToday, isSelected && styles.dayStripNameSelected]}>
                {DAY_SHORT[day.getDay()]}
              </Text>
              <View style={[styles.dayStripNum, isToday && styles.dayStripNumToday, isSelected && styles.dayStripNumSelected]}>
                <Text style={[styles.dayStripNumText, (isToday || isSelected) && styles.dayStripNumTextToday]}>
                  {day.getDate()}
                </Text>
              </View>
              {count > 0 && <View style={[styles.dayDot, isToday && styles.dayDotToday, isSelected && styles.dayDotSelected]} />}
            </TouchableOpacity>
          );
        })}
      </View>
      {selectedDay && (
        <TouchableOpacity style={styles.allWeekBanner} onPress={() => setSelectedDay(null)}>
          <Text style={styles.allWeekBannerText}>Showing 1 day · Tap to see all week</Text>
        </TouchableOpacity>
      )}

      {/* Day list */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {visibleDays.map(day => {
          const key = day.toDateString();
          const sessions = sessionsByDay[key] || [];
          const isToday = day.getTime() === today.getTime();
          const isPast = day < today;

          return (
            <View key={key} style={styles.dayBlock}>
              <View style={[styles.dayHeader, isToday && styles.dayHeaderToday]}>
                <Text style={[styles.dayHeaderText, isToday && styles.dayHeaderTextToday]}>
                  {day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
                {isToday && <View style={styles.todayPill}><Text style={styles.todayPillText}>Today</Text></View>}
              </View>

              {sessions.length === 0 ? (
                <Text style={[styles.emptyText, isPast && { color: '#E0E0E0' }]}>
                  {isPast ? '—' : 'Nothing scheduled'}
                </Text>
              ) : (
                sessions.map((sess, si) => {
                  const startD = new Date(sess.scheduledDate);
                  const endD = new Date(startD.getTime() + sess.durationMin * 60000);
                  const accent = TASK_COLORS[sess.type] || colors.primary;
                  return (
                    <View key={si} style={[styles.sessCard, { borderLeftColor: accent }]}>
                      <View style={styles.sessTimeRow}>
                        <Text style={[styles.sessTime, { color: accent }]}>
                          {fmtTime(sess.scheduledDate)} – {fmtTime(endD.toISOString())}
                        </Text>
                        <Text style={styles.sessDur}>{fmtMins(sess.durationMin)}</Text>
                      </View>
                      <Text style={styles.sessTask}>{sess.taskTitle}</Text>
                      <Text style={styles.sessStep}>{sess.stepName}</Text>
                    </View>
                  );
                })
              )}
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  backBtn: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 12, color: colors.textLight, marginTop: 1 },
  todayBtn: { fontSize: 14, color: colors.primary, fontWeight: '700' },

  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  weekNavBtn: { paddingHorizontal: 16, paddingVertical: 6 },
  weekNavText: { fontSize: 22, color: colors.primary, fontWeight: '700' },
  weekLabel: { fontSize: 13, fontWeight: '700', color: colors.text },

  dayStrip: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  dayStripCell: { flex: 1, alignItems: 'center', gap: 3 },
  dayStripName: { fontSize: 10, fontWeight: '700', color: colors.textLight, letterSpacing: 0.5 },
  dayStripNameToday: { color: colors.primary },
  dayStripNameSelected: { color: colors.primary },
  dayStripNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayStripNumToday: { backgroundColor: colors.primary },
  dayStripNumSelected: { backgroundColor: colors.primary },
  dayStripNumText: { fontSize: 13, fontWeight: '700', color: colors.text },
  dayStripNumTextToday: { color: '#fff' },
  dayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textLight },
  dayDotToday: { backgroundColor: colors.primary },
  dayDotSelected: { backgroundColor: colors.primary },
  allWeekBanner: { backgroundColor: colors.primaryLight, paddingVertical: 7, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.primary + '30' },
  allWeekBannerText: { fontSize: 12, color: colors.primary, fontWeight: '600', textAlign: 'center' },

  content: { padding: 16 },
  dayBlock: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingBottom: 6, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dayHeaderToday: { borderBottomColor: colors.primary + '60' },
  dayHeaderText: { fontSize: 14, fontWeight: '700', color: colors.textLight },
  dayHeaderTextToday: { color: colors.text },
  todayPill: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  todayPillText: { fontSize: 11, color: '#fff', fontWeight: '700' },

  emptyText: { fontSize: 13, color: '#BDBDBD', paddingVertical: 4, paddingLeft: 2 },

  sessCard: { backgroundColor: '#fff', borderRadius: 10, borderLeftWidth: 4, padding: 10, marginBottom: 7, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  sessTimeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  sessTime: { fontSize: 12, fontWeight: '700' },
  sessDur: { fontSize: 11, color: colors.textLight, fontWeight: '600' },
  sessTask: { fontSize: 14, fontWeight: '700', color: colors.text },
  sessStep: { fontSize: 12, color: colors.textLight, marginTop: 2 },
});
