import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';
import {
  MODULE_SCHEDULES, scheduleModuleNotification,
  scheduleMedicationReminder, scheduleHyperfocusBreaker,
} from '../../services/notifications';

function fmt(hour, minute) {
  const h = hour % 12 || 12;
  const m = minute.toString().padStart(2, '0');
  return `${h}:${m} ${hour < 12 ? 'AM' : 'PM'}`;
}

export default function NotificationSettings({
  navigation }) {
  const colors = useColors();
  const {
    moduleNotifications, setModuleNotification,
    themeMode, setThemeMode,
    medicationEnabled, medicationTime, setMedicationReminder,
    hyperfocusEnabled, hyperfocusIntervalMinutes, setHyperfocusBreaker,
  } = useStore(s => ({
    moduleNotifications:       s.moduleNotifications,
    setModuleNotification:     s.setModuleNotification,
    themeMode:                 s.themeMode || 'system',
    setThemeMode:              s.setThemeMode,
    medicationEnabled:         s.medicationEnabled,
    medicationTime:            s.medicationTime || { hour: 8, minute: 0 },
    setMedicationReminder:     s.setMedicationReminder,
    hyperfocusEnabled:         s.hyperfocusEnabled,
    hyperfocusIntervalMinutes: s.hyperfocusIntervalMinutes || 90,
    setHyperfocusBreaker:      s.setHyperfocusBreaker,
  }));

  const [pickerKey,    setPickerKey]   = useState(null);
  const [showMedPicker,setShowMedPick] = useState(false);

  const HF_INTERVALS = [30, 60, 90, 120];

  async function toggleMedication(value) {
    setMedicationReminder(value, medicationTime.hour, medicationTime.minute);
    await scheduleMedicationReminder(value, medicationTime.hour, medicationTime.minute);
  }

  async function onMedTimeChange(event, date) {
    setShowMedPick(false);
    if (event.type === 'dismissed' || !date) return;
    const hour = date.getHours(); const minute = date.getMinutes();
    setMedicationReminder(medicationEnabled, hour, minute);
    await scheduleMedicationReminder(medicationEnabled, hour, minute);
  }

  async function toggleHyperfocus(value) {
    setHyperfocusBreaker(value, hyperfocusIntervalMinutes);
    await scheduleHyperfocusBreaker(value, hyperfocusIntervalMinutes);
  }

  async function setHFInterval(mins) {
    setHyperfocusBreaker(hyperfocusEnabled, mins);
    if (hyperfocusEnabled) await scheduleHyperfocusBreaker(true, mins);
  }

  const keys = Object.keys(MODULE_SCHEDULES);

  async function onTimeChange(key, event, date) {
    if (event.type === 'dismissed') { setPickerKey(null); return; }
    const hour   = date.getHours();
    const minute = date.getMinutes();
    setPickerKey(null);
    const updated = { ...moduleNotifications[key], hour, minute };
    setModuleNotification(key, updated);
    await scheduleModuleNotification(key, updated);
  }

  async function toggleEnabled(key, value) {
    const updated = { ...moduleNotifications[key], enabled: value };
    setModuleNotification(key, updated);
    await scheduleModuleNotification(key, updated);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headline, { color: colors.text }]}>Settings</Text>

        {/* Dark mode */}
        <Text style={[styles.sectionHead, { color: colors.primary }]}>APPEARANCE</Text>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.rowIcon}>🌙</Text>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Dark Mode</Text>
            <Text style={styles.rowDays}>
              {themeMode === 'dark' ? 'On' : themeMode === 'light' ? 'Off' : 'Follows system'}
            </Text>
          </View>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={v => setThemeMode(v ? 'dark' : 'system')}
            trackColor={{ false: '#E0E0E0', true: colors.primary + '80' }}
            thumbColor={themeMode === 'dark' ? colors.primary : '#fff'}
          />
        </View>

        <Text style={[styles.sectionHead, { color: colors.primary }]}>REMINDERS</Text>
        <Text style={[styles.sub, { color: colors.text }]}>Tap a time to edit. Toggle off to mute.</Text>

        {keys.map(key => {
          const sched  = MODULE_SCHEDULES[key];
          const config = moduleNotifications[key] || { hour: 7, minute: 0, enabled: true };
          return (
            <View key={key} style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.rowIcon}>{sched.icon}</Text>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{sched.label}</Text>
                <Text style={styles.rowDays}>{sched.daysLabel}</Text>
              </View>
              <TouchableOpacity
                style={[styles.timePill, !config.enabled && styles.timePillOff]}
                onPress={() => config.enabled && setPickerKey(key)}
              >
                <Text style={[styles.timePillText, !config.enabled && styles.timePillTextOff]}>
                  {fmt(config.hour, config.minute)}
                </Text>
              </TouchableOpacity>
              <Switch
                value={config.enabled}
                onValueChange={v => toggleEnabled(key, v)}
                trackColor={{ false: '#E0E0E0', true: colors.primary + '80' }}
                thumbColor={config.enabled ? colors.primary : '#fff'}
              />
              {pickerKey === key && (
                <DateTimePicker
                  mode="time"
                  value={(() => { const d = new Date(); d.setHours(config.hour, config.minute, 0); return d; })()}
                  is24Hour={false}
                  onChange={(e, d) => onTimeChange(key, e, d)}
                />
              )}
            </View>
          );
        })}

        {/* Medication reminder */}
        <Text style={[styles.sectionHead, { color: colors.primary }]}>MEDICATION</Text>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.rowIcon}>💊</Text>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Daily medication reminder</Text>
            <TouchableOpacity onPress={() => medicationEnabled && setShowMedPick(true)}>
              <Text style={styles.rowDays}>{fmt(medicationTime.hour, medicationTime.minute)} · tap to change</Text>
            </TouchableOpacity>
          </View>
          <Switch
            value={medicationEnabled}
            onValueChange={toggleMedication}
            trackColor={{ false: '#E0E0E0', true: colors.primary + '80' }}
            thumbColor={medicationEnabled ? colors.primary : '#fff'}
          />
          {showMedPicker && (
            <DateTimePicker
              mode="time"
              value={(() => { const d = new Date(); d.setHours(medicationTime.hour, medicationTime.minute, 0); return d; })()}
              is24Hour={false}
              onChange={onMedTimeChange}
            />
          )}
        </View>

        {/* Hyperfocus breaker */}
        <Text style={[styles.sectionHead, { color: colors.primary }]}>WELLBEING ALERTS</Text>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={styles.rowIcon}>👀</Text>
          <View style={styles.rowInfo}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Hyperfocus breaker</Text>
            <Text style={styles.rowDays}>Reminds us to look up every:</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {HF_INTERVALS.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.intervalChip,
                    hyperfocusIntervalMinutes === m && hyperfocusEnabled
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: colors.background, borderColor: colors.border }]}
                  onPress={() => setHFInterval(m)}
                >
                  <Text style={[styles.intervalChipText,
                    { color: hyperfocusIntervalMinutes === m && hyperfocusEnabled ? '#fff' : colors.textLight }]}>
                    {m} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Switch
            value={hyperfocusEnabled}
            onValueChange={toggleHyperfocus}
            trackColor={{ false: '#E0E0E0', true: colors.primary + '80' }}
            thumbColor={hyperfocusEnabled ? colors.primary : '#fff'}
          />
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            💡 Times designed for after-school use (4–6 PM). Tap any time to adjust for your schedule.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  content:   { padding: 24, paddingBottom: 40 },
  back:      { marginBottom: 16 },
  backText:  { fontSize: 15, color: colors.primary, fontWeight: '600' },
  headline:   { fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionHead:{ fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  sub:        { fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 20 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1,
  },
  rowIcon: { fontSize: 24, width: 32, textAlign: 'center' },
  rowInfo: { flex: 1 },
  rowLabel:{ fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  rowDays: { fontSize: 11, color: '#888', marginTop: 1 },

  timePill:       { backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  timePillOff:    { backgroundColor: '#F0F0F0' },
  timePillText:   { fontSize: 13, fontWeight: '800', color: colors.primary },
  timePillTextOff:{ color: '#BBB' },

  intervalChip:     { borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  intervalChipText: { fontSize: 12, fontWeight: '700' },

  note:     { backgroundColor: '#FFF8E7', borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: '#FFE082' },
  noteText: { fontSize: 13, color: '#7B6200', lineHeight: 20 },
});
