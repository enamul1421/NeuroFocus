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
import SpeakButton from '../../components/SpeakButton';

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
    medicationEnabled, medicationTimes, setMedicationReminder,
    hyperfocusEnabled, hyperfocusIntervalMinutes, setHyperfocusBreaker,
  } = useStore(s => ({
    moduleNotifications:       s.moduleNotifications,
    setModuleNotification:     s.setModuleNotification,
    themeMode:                 s.themeMode || 'system',
    setThemeMode:              s.setThemeMode,
    medicationEnabled:         s.medicationEnabled,
    medicationTimes:           s.medicationTimes || [{ hour: 8, minute: 0 }],
    setMedicationReminder:     s.setMedicationReminder,
    hyperfocusEnabled:         s.hyperfocusEnabled,
    hyperfocusIntervalMinutes: s.hyperfocusIntervalMinutes || 90,
    setHyperfocusBreaker:      s.setHyperfocusBreaker,
  }));

  const [pickerKey,    setPickerKey]   = useState(null);
  const [medPickerIdx, setMedPickerIdx]= useState(null);

  const HF_INTERVALS = [30, 60, 90, 120];

  async function toggleMedication(value) {
    setMedicationReminder(value, medicationTimes);
    await scheduleMedicationReminder(value, medicationTimes);
  }

  async function onMedTimeChange(event, date) {
    const idx = medPickerIdx;
    setMedPickerIdx(null);
    if (event.type === 'dismissed' || !date || idx === null) return;
    const updated = medicationTimes.map((t, i) =>
      i === idx ? { hour: date.getHours(), minute: date.getMinutes() } : t
    );
    setMedicationReminder(medicationEnabled, updated);
    await scheduleMedicationReminder(medicationEnabled, updated);
  }

  async function addMedTime() {
    if (medicationTimes.length >= 5) return;
    const updated = [...medicationTimes, { hour: 12, minute: 0 }];
    setMedicationReminder(medicationEnabled, updated);
    await scheduleMedicationReminder(medicationEnabled, updated);
  }

  async function removeMedTime(idx) {
    if (medicationTimes.length <= 1) return;
    const updated = medicationTimes.filter((_, i) => i !== idx);
    setMedicationReminder(medicationEnabled, updated);
    await scheduleMedicationReminder(medicationEnabled, updated);
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
        <Text style={[styles.headline, { color: colors.text }]}>Settings</Text>
        <SpeakButton text="Settings lets us control how NeuroFocus works for us — dark mode, notifications for each module, medication reminders, and more. We can set it up once and it runs in the background to support us." style={{ marginBottom: 12 }} />

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
        <View style={[styles.block, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.blockHeader}>
            <Text style={styles.rowIcon}>💊</Text>
            <Text style={[styles.rowLabel, { color: colors.text, flex: 1 }]}>Medication reminders</Text>
            <Switch
              value={medicationEnabled}
              onValueChange={toggleMedication}
              trackColor={{ false: '#E0E0E0', true: colors.primary + '80' }}
              thumbColor={medicationEnabled ? colors.primary : '#fff'}
            />
          </View>
          {medicationTimes.map((t, i) => (
            <View key={i} style={styles.medTimeRow}>
              <TouchableOpacity
                style={styles.medTimeBtn}
                onPress={() => medicationEnabled && setMedPickerIdx(i)}
              >
                <Text style={[styles.rowDays, { color: colors.text }]}>
                  {fmt(t.hour, t.minute)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textLight }}>tap to change</Text>
              </TouchableOpacity>
              {medicationTimes.length > 1 && (
                <TouchableOpacity onPress={() => removeMedTime(i)} style={styles.medRemove}>
                  <Text style={{ color: '#E53935', fontSize: 18 }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          {medicationTimes.length < 5 && (
            <TouchableOpacity onPress={addMedTime} style={styles.medAddBtn}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>+ Add reminder</Text>
            </TouchableOpacity>
          )}
          {medPickerIdx !== null && (
            <DateTimePicker
              mode="time"
              value={(() => { const d = new Date(); const t = medicationTimes[medPickerIdx]; d.setHours(t.hour, t.minute, 0); return d; })()}
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  content:   { padding: 24, paddingBottom: 40 },
  back:      { marginTop: 16, marginBottom: 8, alignItems: 'center' },
  backText:  { fontSize: 15, color: colors.primary, fontWeight: '600' },
  headline:   { fontSize: 26, fontWeight: '800', marginBottom: 16 },
  sectionHead:{ fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  sub:        { fontSize: 13, color: '#888', marginBottom: 16, lineHeight: 20 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1,
  },
  block:       { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  medTimeRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0' },
  medTimeBtn:  { flex: 1 },
  medRemove:   { padding: 8 },
  medAddBtn:   { paddingVertical: 10, alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E0E0E0', marginTop: 4 },
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
