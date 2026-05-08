import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, Alert, Share
} from 'react-native';
import { getLogs, exportCSV, clearLogs } from '../../services/logger';
import { useStore } from '../../store';
import { colors } from '../../theme';

const ADMIN_PIN = 'ADMIN'; // researcher enters their participant code as ADMIN

export default function Admin({ navigation }) {
  const participantCode = useStore(s => s.participantCode);
  const [pin, setPin] = useState('');
  const [unlocked, setUnlocked] = useState(participantCode === ADMIN_PIN);
  const [logs, setLogs] = useState([]);
  const [csvText, setCsvText] = useState('');
  const [tab, setTab] = useState('summary'); // 'summary' | 'csv'

  useEffect(() => {
    if (unlocked) loadData();
  }, [unlocked]);

  async function loadData() {
    const data = await getLogs();
    setLogs(data);
    const csv = await exportCSV();
    setCsvText(csv);
  }

  function tryUnlock() {
    if (pin.trim().toUpperCase() === ADMIN_PIN) {
      setUnlocked(true);
    } else {
      Alert.alert('Wrong PIN', 'Enter ADMIN to access research data.');
    }
  }

  async function shareCSV() {
    try {
      await Share.share({ message: csvText, title: 'NeuroFocus Research Data' });
    } catch {
      Alert.alert('Error', 'Could not share. Copy the text manually.');
    }
  }

  async function handleClear() {
    Alert.alert('Clear all logs?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        await clearLogs();
        await loadData();
      }},
    ]);
  }

  // Module breakdown from logs
  const moduleCounts = {};
  const participantSet = new Set();
  logs.forEach(l => {
    const m = l.module || 'Unknown';
    moduleCounts[m] = (moduleCounts[m] || 0) + 1;
    if (l.participantCode && l.participantCode !== 'ANON') participantSet.add(l.participantCode);
  });

  // ── PIN GATE ──
  if (!unlocked) return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headline}>Research Admin</Text>
        <Text style={styles.body}>Researcher access only. Enter PIN to view data.</Text>
        <TextInput
          style={styles.pinInput}
          placeholder="Enter PIN"
          placeholderTextColor={colors.textLight}
          value={pin}
          onChangeText={setPin}
          autoCapitalize="characters"
          autoCorrect={false}
          secureTextEntry
        />
        <TouchableOpacity style={styles.button} onPress={tryUnlock}>
          <Text style={styles.buttonText}>Unlock →</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>PIN: ADMIN</Text>
      </View>
    </SafeAreaView>
  );

  // ── ADMIN PANEL ──
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.headline}>Research Data</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'summary' && styles.tabActive]}
            onPress={() => setTab('summary')}
          >
            <Text style={[styles.tabText, tab === 'summary' && styles.tabTextActive]}>Summary</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'csv' && styles.tabActive]}
            onPress={() => setTab('csv')}
          >
            <Text style={[styles.tabText, tab === 'csv' && styles.tabTextActive]}>CSV Export</Text>
          </TouchableOpacity>
        </View>

        {tab === 'summary' && (
          <>
            {/* Overview */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{logs.length}</Text>
                <Text style={styles.statLabel}>Total logs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{participantSet.size}</Text>
                <Text style={styles.statLabel}>Participants</Text>
              </View>
            </View>

            {/* Participants list */}
            <Text style={styles.sectionTitle}>Participant codes</Text>
            <View style={styles.card}>
              {participantSet.size === 0
                ? <Text style={styles.empty}>No participant codes logged yet.</Text>
                : [...participantSet].map(code => {
                    const count = logs.filter(l => l.participantCode === code).length;
                    return (
                      <View key={code} style={styles.partRow}>
                        <Text style={styles.partCode}>{code}</Text>
                        <Text style={styles.partCount}>{count} sessions</Text>
                      </View>
                    );
                  })
              }
            </View>

            {/* Module breakdown */}
            <Text style={styles.sectionTitle}>Sessions by module</Text>
            <View style={styles.card}>
              {Object.entries(moduleCounts).map(([mod, count]) => (
                <View key={mod} style={styles.partRow}>
                  <Text style={styles.partCode}>{mod}</Text>
                  <Text style={styles.partCount}>{count}</Text>
                </View>
              ))}
              {Object.keys(moduleCounts).length === 0 && (
                <Text style={styles.empty}>No module logs yet.</Text>
              )}
            </View>

            {/* Recent logs */}
            <Text style={styles.sectionTitle}>Recent logs (last 10)</Text>
            <View style={styles.card}>
              {logs.slice(-10).reverse().map((l, i) => (
                <View key={i} style={[styles.logRow, i > 0 && styles.logBorder]}>
                  <Text style={styles.logCode}>{l.participantCode}</Text>
                  <Text style={styles.logModule}>{l.module}</Text>
                  <Text style={styles.logDate}>{l.date}</Text>
                </View>
              ))}
              {logs.length === 0 && <Text style={styles.empty}>No logs yet.</Text>}
            </View>

            <TouchableOpacity style={styles.dangerButton} onPress={handleClear}>
              <Text style={styles.dangerButtonText}>Clear all logs</Text>
            </TouchableOpacity>
          </>
        )}

        {tab === 'csv' && (
          <>
            <TouchableOpacity style={styles.button} onPress={shareCSV}>
              <Text style={styles.buttonText}>Share / Export CSV</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>CSV Preview</Text>
            <View style={styles.csvBox}>
              <Text style={styles.csvText} selectable>
                {csvText || 'No data yet.'}
              </Text>
            </View>

            <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
              <Text style={styles.refreshText}>Refresh data</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 24, justifyContent: 'center' },
  scroll: { padding: 18, paddingBottom: 40 },
  headline: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 16, color: colors.textLight, lineHeight: 24, marginBottom: 20 },
  hint: { textAlign: 'center', fontSize: 12, color: colors.textLight, marginTop: 12 },
  pinInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 10, padding: 16, fontSize: 20, letterSpacing: 6, color: colors.text, backgroundColor: '#fff', marginBottom: 16, textAlign: 'center' },
  tabs: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 10, padding: 3, marginBottom: 18 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabActive: { backgroundColor: '#fff' },
  tabText: { fontSize: 14, color: colors.textLight, fontWeight: '600' },
  tabTextActive: { color: colors.text, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue: { fontSize: 28, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#EBEBEB' },
  partRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderColor: '#F5F5F5' },
  partCode: { fontSize: 14, fontWeight: '700', color: colors.text },
  partCount: { fontSize: 13, color: colors.textLight },
  logRow: { paddingVertical: 6 },
  logBorder: { borderTopWidth: 1, borderColor: '#F0F0F0' },
  logCode: { fontSize: 12, fontWeight: '700', color: colors.primary },
  logModule: { fontSize: 13, color: colors.text },
  logDate: { fontSize: 11, color: colors.textLight },
  csvBox: { backgroundColor: '#1E1E1E', borderRadius: 10, padding: 14, marginBottom: 12 },
  csvText: { fontSize: 10, color: '#A0A0A0', fontFamily: 'Courier', lineHeight: 16 },
  empty: { fontSize: 13, color: colors.textLight, fontStyle: 'italic' },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  dangerButton: { padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#F44336', alignItems: 'center', marginBottom: 24 },
  dangerButtonText: { color: '#F44336', fontSize: 14, fontWeight: '700' },
  refreshBtn: { alignItems: 'center', padding: 12 },
  refreshText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
