import AsyncStorage from '@react-native-async-storage/async-storage';

const LOG_KEY = 'neurofocus_research_logs';

// Append a session log entry
export async function logSession(participantCode, moduleData) {
  const entry = {
    participantCode: participantCode || 'ANON',
    sessionId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString().split('T')[0],
    timestamp: Date.now(),
    ...moduleData,
  };

  const existing = await getLogs();
  existing.push(entry);
  await AsyncStorage.setItem(LOG_KEY, JSON.stringify(existing));
  return entry;
}

export async function getLogs() {
  const raw = await AsyncStorage.getItem(LOG_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Export as CSV string — researcher copies from admin screen
export async function exportCSV() {
  const logs = await getLogs();
  if (logs.length === 0) return 'No data yet.';

  const headers = [
    'participantCode', 'sessionId', 'date',
    'module', 'trialsCompleted',
    'accuracyCoefficients', 'avgAccuracyCoefficient',
    'intervalsUsed', 'weeklyHomework', 'weeklyPrepared', 'weeklyMorning',
  ];

  const rows = logs.map(log => [
    log.participantCode,
    log.sessionId,
    log.date,
    log.module || '',
    log.trialsCompleted || '',
    log.accuracyCoefficients ? JSON.stringify(log.accuracyCoefficients) : '',
    log.avgAccuracyCoefficient || '',
    log.intervalsUsed ? JSON.stringify(log.intervalsUsed) : '',
    log.weeklyHomework || '',
    log.weeklyPrepared || '',
    log.weeklyMorning || '',
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export async function clearLogs() {
  await AsyncStorage.removeItem(LOG_KEY);
}
