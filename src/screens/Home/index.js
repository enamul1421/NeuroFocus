import React, { useRef } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { useStore } from '../../store';
import { colors, useColors } from '../../theme';
import { BADGES, levelInfo } from '../../utils/achievements';
import SpeakButton from '../../components/SpeakButton';
import AngerCheckIn from '../../components/AngerCheckIn';
import BodyCheckIn from '../../components/BodyCheckIn';
import SleepQualityCheckIn from '../../components/SleepQualityCheckIn';
import SocialBattery from '../../components/SocialBattery';

const W = Dimensions.get('window').width;
const CARD_W2 = (W - 32 - 10) / 2;  // 2 cols, 1 gap of 10
const CARD_W3 = (W - 32 - 20) / 3;  // 3 cols, 2 gaps of 10
const CARD_W4 = (W - 32 - 30) / 4;  // 4 cols, 3 gaps of 10

const GROUPS = [
  {
    key: 'daily', label: 'Daily Habits', color: '#BF360C',
    hint: 'Morning to bedtime — the habits that build the foundation',
    forceCols: 4,
    modules: [
      { key: 'routine',  label: 'Routine',    icon: '☀️', route: 'MorningRoutine',        color: '#BF360C', bg: '#FF8A65', desc: 'Morning + night prep' },
      { key: 'timewise', label: 'TimeWise',   icon: '⏱',  route: 'TimeWise',              color: '#0D47A1', bg: '#64B5F6', desc: 'Train your clock' },
      { key: 'mood',     label: 'Moods',      icon: '🌊', route: 'MoodBridgePlaceholder', color: '#006064', bg: '#4DD0E1', desc: 'Check in & regulate' },
      { key: 'sleep',       label: 'SleepGuard',  icon: '😴', route: 'SleepGuard',   color: '#283593', bg: '#1A1A3A', desc: 'Wind down',          darkText: true },
      { key: 'screenshift', label: 'ScreenShift', icon: '📵', route: 'ScreenShift', color: '#2E7D32', bg: '#E8F5E9', desc: 'Screen to life' },
    ],
  },
  {
    key: 'weekly', label: 'Brain Gym', color: '#283593',
    hint: '3–5 sessions per week builds the real training effect',
    forceCols: 4,
    modules: [
      { key: 'focus',      label: 'FocusCtrl',  icon: '🎯', route: 'FocusControlPlaceholder', color: '#283593', bg: '#7986CB', desc: 'Build mental brake' },
      { key: 'memory',     label: 'Memory',     icon: '🧠', route: 'MemoryBankPlaceholder',   color: '#004D40', bg: '#4DB6AC', desc: 'Sharpen working memory' },
      { key: 'flexswitch', label: 'FlexSwitch', icon: '🔀', route: 'FlexSwitch',              color: '#00695C', bg: '#B2DFDB', desc: 'Train rule-switching' },
      { key: 'focuswatch', label: 'Vigilance',  icon: '👁',  route: 'FocusWatch',              color: '#F57F17', bg: '#FFF8E1', desc: 'Train sustained attention' },
    ],
  },
  {
    key: 'grow', label: 'Life Skills', color: '#2E7D32',
    hint: 'Values, social skills, and self-knowledge — 2–3 sessions a week builds real strength',
    forceCols: 4,
    modules: [
      { key: 'truenorth',    label: 'TrueNorth',   icon: '🧭', route: 'TrueNorth',    color: '#E65100', bg: '#FFF3E0', desc: 'Live our values · daily check' },
      { key: 'connectwell',  label: 'Connect',     icon: '🤝', route: 'ConnectWell',  color: '#1B5E20', bg: '#C8E6C9', desc: 'Navigate social moments' },
      { key: 'thoughtcheck', label: 'Thoughts',    icon: '🧩', route: 'ThoughtCheck', color: '#37474F', bg: '#ECEFF1', desc: 'Challenge the inner critic' },
      { key: 'stillpoint',   label: 'StillPoint',  icon: '🍃', route: 'StillPoint',   color: '#2E7D32', bg: '#E8F5E9', desc: 'Mindfulness · 2 or 5 min' },
      { key: 'confidence',   label: 'Confidence',  icon: '⚡', route: 'ConfidenceCorePlaceholder', color: '#6A0032', bg: '#F8BBD0', desc: 'Log wins · build belief' },
      { key: 'speakup',      label: 'SpeakUp',     icon: '🎤', route: 'SpeakUp',      color: '#1565C0', bg: '#E3F2FD', desc: 'Scripts for hard conversations' },
    ],
  },
  {
    key: 'support', label: 'Anytime Support', color: '#B71C1C',
    hint: 'Regulation and reset tools — open whenever things feel too big',
    forceCols: 4,
    modules: [
      { key: 'cooldown',    label: 'CoolDown',  icon: '🆘', route: 'CoolDown',     color: '#B71C1C', bg: '#FFCDD2', desc: 'Reset when overwhelmed' },
      { key: 'worrybreak',  label: 'Worry',     icon: '🌀', route: 'WorryBreak',   color: '#0277BD', bg: '#E1F5FE', desc: 'Check the worry · act or let go' },
      { key: 'hardmoment',  label: 'HardTime',  icon: '💙', route: 'HardMoment',   color: '#1A237E', bg: '#E8EAF6', desc: 'When criticism stings' },
      { key: 'sensoryshield',label: 'Sensory',  icon: '🛡️', route: 'SensoryShield',color: '#6A1B9A', bg: '#F3E5F5', desc: 'Sensory toolkit' },
      { key: 'glassbreak',  label: 'GlassBreak',icon: '🧊', route: 'GlassBreak',   color: '#4527A0', bg: '#EDE7F6', desc: 'Break the freeze · start now' },
      { key: 'quietmode',   label: 'QuietMode', icon: '🌑', route: 'QuietMode',    color: '#455A64', bg: '#ECEFF1', desc: 'Shutdown · low-demand reset' },
    ],
  },
];

export default function Home({
  navigation }) {
  const colors = useColors();
  const {
    userNickname, currentStreak,
    timeWiseSessions, focusControlSessions, memoryBankSessions,
    moodBridgeSessions, morningLogs, weeklyWins, plannerTasks,
    xp, unlockedBadges, skippedModules,
    sleepTargetTime, sleepLogs, glassBreakSessions,
    medicationEnabled, medicationLogs, addMedicationLog,
    angerCheckIns, bodyCheckIns, sleepQualityLogs, socialBatteryLogs,
    trueNorthLogs, stillPointSessions, connectWellSessions, thoughtCheckSessions,
    topChallenges, screenShiftLogs,
  } = useStore(s => ({
    userNickname:         s.userNickname,
    currentStreak:        s.currentStreak,
    timeWiseSessions:     s.timeWiseSessions     || [],
    focusControlSessions: s.focusControlSessions || [],
    memoryBankSessions:   s.memoryBankSessions   || [],
    moodBridgeSessions:   s.moodBridgeSessions   || [],
    morningLogs:          s.morningLogs          || [],
    weeklyWins:           s.weeklyWins           || [],
    plannerTasks:         s.plannerTasks         || [],
    xp:                   s.xp                  || 0,
    unlockedBadges:       s.unlockedBadges       || [],
    skippedModules:       s.skippedModules       || {},
    sleepTargetTime:      s.sleepTargetTime      || { hour: 22, minute: 30 },
    sleepLogs:            s.sleepLogs            || [],
    glassBreakSessions:   s.glassBreakSessions   || [],
    medicationEnabled:    s.medicationEnabled,
    medicationLogs:       s.medicationLogs       || [],
    addMedicationLog:     s.addMedicationLog,
    angerCheckIns:        s.angerCheckIns        || [],
    bodyCheckIns:         s.bodyCheckIns         || [],
    sleepQualityLogs:     s.sleepQualityLogs     || [],
    socialBatteryLogs:     s.socialBatteryLogs     || [],
    trueNorthLogs:         s.trueNorthLogs         || [],
    stillPointSessions:    s.stillPointSessions    || [],
    connectWellSessions:   s.connectWellSessions   || [],
    thoughtCheckSessions:  s.thoughtCheckSessions  || [],
    topChallenges:         s.topChallenges         || [],
    screenShiftLogs:       s.screenShiftLogs       || [],
  }));

  // Groups collapsed by default except TODAY
  const [expandedGroups, setExpandedGroups] = React.useState({ daily: true, support: false, weekly: false, grow: false });
  const scrollRef = useRef(null);
  const groupYRef = useRef({});

  function toggleGroup(key) {
    const wasExpanded = expandedGroups[key];
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    if (!wasExpanded && groupYRef.current[key] !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: groupYRef.current[key] - 12, animated: true });
      }, 80);
    }
  }

  function isSkipped(key) { return skippedModules[key] === new Date().toISOString().split('T')[0]; }

  // Secret triple-tap on "NeuroFocus" to open Admin
  const tapCount = useRef(0);
  const tapTimer = useRef(null);
  function handleSubtitleTap() {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      navigation.navigate('Admin');
    } else {
      tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 1500);
    }
  }

  const h = new Date().getHours();

  // Bedtime countdown
  const now = new Date();
  const todaySleepLog = sleepLogs.find(l => l.date === now.toISOString().split('T')[0]);
  const bedtimeToday = new Date(); bedtimeToday.setHours(sleepTargetTime.hour, sleepTargetTime.minute, 0, 0);
  const minsUntilBed = Math.round((bedtimeToday - now) / 60000);
  const showBedtimeCard = h >= 18 && minsUntilBed > -60 && !todaySleepLog;

  // GlassBreak proactive banner — task due ≤2 days + no session today
  const todayStr = now.toISOString().split('T')[0];
  const glassBreakToday = glassBreakSessions.some(s => s.date && s.date.startsWith(todayStr));
  const urgentTask = plannerTasks.find(t => {
    if (!t.deadline || t.status === 'done') return false;
    const daysUntil = (new Date(t.deadline) - now) / (1000 * 60 * 60 * 24);
    return daysUntil >= 0 && daysUntil <= 2;
  });
  const showGlassBanner = !!urgentTask && !glassBreakToday;

  // YOUR PLAN — dynamic planner summary
  const activeTasks   = plannerTasks.filter(t => t.status === 'active');
  const nextDue       = activeTasks
    .filter(t => t.deadline)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];
  const daysToNext    = nextDue
    ? Math.ceil((new Date(nextDue.deadline) - now) / (1000 * 60 * 60 * 24))
    : null;
  const dueStr = daysToNext === null ? '' :
    daysToNext < 0  ? ` · ${Math.abs(daysToNext)} day${Math.abs(daysToNext) !== 1 ? 's' : ''} overdue` :
    daysToNext === 0 ? ' · due today' :
    ` · next due in ${daysToNext} day${daysToNext !== 1 ? 's' : ''}`;
  const plannerDesc = activeTasks.length === 0
    ? 'No active tasks — tap to plan the week'
    : `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} active${dueStr}`;

  // Medication banner — show if enabled and not confirmed today
  const medTakenToday = medicationLogs.some(l => l.date === todayStr);
  const showMedBanner = medicationEnabled && !medTakenToday;


  // ── Fix 1: Smart widget — show at most one check-in at a time ────────────────
  const todayStart          = new Date(); todayStart.setHours(0, 0, 0, 0);
  const sleepAnsweredToday  = sleepQualityLogs.some(l => l.date === todayStr);
  const bodyAnsweredToday   = bodyCheckIns.some(c => new Date(c.timestamp) >= todayStart);
  const angerAnsweredRecent = angerCheckIns.some(c =>
    (Date.now() - new Date(c.timestamp).getTime()) < 3 * 60 * 60 * 1000
  );
  const socialAnsweredRecent = socialBatteryLogs.some(l =>
    (Date.now() - new Date(l.timestamp).getTime()) < 4 * 60 * 60 * 1000
  );
  const showSleepWidget  = h >= 6 && h < 12 && !sleepAnsweredToday;
  const showBodyWidget   = !showSleepWidget && !bodyAnsweredToday;
  const showAngerWidget  = !showSleepWidget && !showBodyWidget && !angerAnsweredRecent;
  const showSocialWidget = !showSleepWidget && !showBodyWidget && !showAngerWidget
    && h >= 15 && !socialAnsweredRecent;

  // ── Fix 2: Banner cap — show at most 2 banners ───────────────────────────────
  const secondBanner = showBedtimeCard ? 'bedtime'
    : showMedBanner      ? 'medication'
    : null;

  const lvl = levelInfo(xp);
  const recentBadges = unlockedBadges.slice(-5).reverse().map(id => BADGES[id]).filter(Boolean);
  const greeting = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
  const name = userNickname ? `, ${userNickname}` : '';
  const streakLine = currentStreak >= 3 ? `We are on a ${currentStreak}-day streak — that is real momentum. ` : '';

  const speechText = h < 12
    ? `Good morning${name}. Our brain works best when we give it a strong start. ${streakLine}Let us kick off with the Daily Routine — it takes just a few minutes and sets up our whole day. We are building something powerful here, one morning at a time.`
    : h < 17
    ? `Good afternoon${name}. This is our training window — the sweet spot after school when our brain is ready to grow. ${streakLine}TimeWise, Moods, FocusCtrl, Memory, and Confidence are all here for us. Even one session today moves us forward. Our future self will thank us. Let us go.`
    : `Good evening${name}. We made it through the day — and that counts. ${streakLine}Before we wind down, let us log a win in Confidence and do our Night Prep routine. Small actions tonight make tomorrow so much easier. We are doing great. Let us finish strong.`;


  const today = new Date().toDateString();
  const routineDone = morningLogs.some(l => new Date(l.date).toDateString() === today && l.allCompleted);

  function moduleDue(key) {
    // Daily Habits
    if (key === 'routine')      return !routineDone;
    if (key === 'timewise')     return new Date(timeWiseSessions[timeWiseSessions.length - 1]?.date).toDateString() !== today;
    if (key === 'mood')         return new Date(moodBridgeSessions[moodBridgeSessions.length - 1]?.date).toDateString() !== today;
    // Brain Gym
    if (key === 'focus')        return thisWeek(focusControlSessions) === 0;
    if (key === 'memory')       return thisWeek(memoryBankSessions) === 0;
    // Life Skills — due if no session today
    if (key === 'truenorth')    return !trueNorthLogs.some(l => l.date === todayStr);
    if (key === 'confidence')   return !weeklyWins.some(w => w.date && w.date.startsWith(todayStr));
    if (key === 'stillpoint')   return !stillPointSessions.some(s => s.date && s.date.startsWith(todayStr));
    if (key === 'connectwell')  return !connectWellSessions.some(s => s.date && s.date.startsWith(todayStr));
    if (key === 'thoughtcheck') return !thoughtCheckSessions.some(s => s.date && s.date.startsWith(todayStr));
    if (key === 'screenshift')  return !screenShiftLogs.some(l => l.date === todayStr);
    return false;
  }

  const CHALLENGE_MODULE = {
    time:       { label: 'TimeWise',   icon: '⏱',  route: 'TimeWise',                color: '#0D47A1', bg: '#64B5F6', desc: 'Train your time sense' },
    planning:   { label: 'Planner',    icon: '📅', route: 'WeeklyPlanner',           color: '#4A148C', bg: '#F3E5F5', desc: 'Break big projects down' },
    starting:   { label: 'GlassBreak', icon: '🧊', route: 'GlassBreak',             color: '#4527A0', bg: '#EDE7F6', desc: 'Break the freeze · start now' },
    focus:      { label: 'FocusCtrl',  icon: '🎯', route: 'FocusControlPlaceholder', color: '#283593', bg: '#7986CB', desc: 'Build your mental brake' },
    memory:     { label: 'Memory',     icon: '🧠', route: 'MemoryBankPlaceholder',   color: '#004D40', bg: '#4DB6AC', desc: 'Sharpen working memory' },
    anger:      { label: 'CoolDown',   icon: '🆘', route: 'CoolDown',               color: '#B71C1C', bg: '#FFCDD2', desc: 'Reset when overwhelmed' },
    worry:      { label: 'WorryBreak', icon: '🌀', route: 'WorryBreak',             color: '#0277BD', bg: '#E1F5FE', desc: 'Check the worry · act or let go' },
    sleep:      { label: 'SleepGuard', icon: '😴', route: 'SleepGuard',             color: '#283593', bg: '#1A1A3A', desc: 'Wind-down routine', darkText: true },
    sensory:    { label: 'Sensory',    icon: '🛡️', route: 'SensoryShield',          color: '#6A1B9A', bg: '#F3E5F5', desc: 'Sensory toolkit' },
    social:     { label: 'Connect',    icon: '🤝', route: 'ConnectWell',            color: '#1B5E20', bg: '#C8E6C9', desc: 'Navigate social moments' },
    speakup:    { label: 'SpeakUp',    icon: '🎤', route: 'SpeakUp',               color: '#1565C0', bg: '#E3F2FD', desc: 'Scripts for hard conversations' },
    confidence:   { label: 'Confidence',  icon: '⚡', route: 'ConfidenceCorePlaceholder', color: '#6A0032', bg: '#F8BBD0', desc: 'Log wins · build belief' },
    screenshift:  { label: 'ScreenShift', icon: '📵', route: 'ScreenShift',              color: '#2E7D32', bg: '#E8F5E9', desc: 'Screen to life' },
  };

  const priorityModules = topChallenges.map(id => CHALLENGE_MODULE[id]).filter(Boolean);

  function monday() {
    const d = new Date(); d.setDate(d.getDate() - (d.getDay() === 0 ? 6 : d.getDay() - 1)); d.setHours(0,0,0,0); return d;
  }
  function thisWeek(arr) { return arr.filter(s => new Date(s.date) >= monday()).length; }

  function moduleStatus(key) {
    if (key === 'routine')    return routineDone ? '✓ Done' : null;
    if (key === 'timewise')   return new Date(timeWiseSessions[timeWiseSessions.length-1]?.date).toDateString() === today ? '✓ Done' : null;
    if (key === 'mood')       return new Date(moodBridgeSessions[moodBridgeSessions.length-1]?.date).toDateString() === today ? '✓ Done' : null;
    if (key === 'focus')      return `${thisWeek(focusControlSessions)} this week`;
    if (key === 'memory')     return `${thisWeek(memoryBankSessions)} this week`;
    if (key === 'planner')    return `${plannerTasks.filter(t => t.status === 'active').length} active`;
    if (key === 'confidence')   return weeklyWins.length > 0 ? `${weeklyWins.length} wins` : null;
    if (key === 'screenshift') {
      const log = screenShiftLogs.find(l => l.date === todayStr);
      return log ? (log.metGoal ? '✓ Goal met' : `~${log.hours}h logged`) : null;
    }
    return null;
  }




  return (
    <SafeAreaView edges={['top','left','right']} style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting}{name}</Text>
          <View style={styles.subtitleRow}>
            <TouchableOpacity onPress={handleSubtitleTap} activeOpacity={1}>
              <Text style={[styles.subGreeting, { color: colors.text }]}>NeuroFocus</Text>
            </TouchableOpacity>
            <View style={styles.pills}>
              <SpeakButton text={speechText} />
              <View style={styles.levelPill}>
                <View style={styles.levelCircle}><Text style={styles.levelNum}>{lvl.level}</Text></View>
                <Text style={styles.levelName}>{lvl.name}</Text>
              </View>
              {currentStreak > 0 && <View style={styles.streakPill}><Text style={styles.streakText}>🔥 {currentStreak}</Text></View>}
            </View>
          </View>
        </View>

        {/* Recent badges */}
        {recentBadges.length > 0 && (
          <TouchableOpacity style={styles.badgeStrip} onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.badgeSub}>{unlockedBadges.length}/{Object.keys(BADGES).length} badges earned</Text>
            <Text style={styles.badgeArrow}>›</Text>
          </TouchableOpacity>
        )}

        {/* Smart check-in — one widget at a time */}
        {showSleepWidget  && <SleepQualityCheckIn />}
        {showBodyWidget   && <BodyCheckIn />}
        {showAngerWidget  && <AngerCheckIn onHighAnger={() => navigation.navigate('CoolDown')} />}
        {showSocialWidget && <SocialBattery />}

        {/* GlassBreak — urgent task banner */}
        {showGlassBanner && (
          <TouchableOpacity
            style={styles.glassBanner}
            onPress={() => navigation.navigate('GlassBreak', {
              frozenReason: 'exam',
              taskTitle: urgentTask.title,
            })}
          >
            <Text style={styles.glassIcon}>🚨</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.glassTitle} numberOfLines={1}>{urgentTask.title} — due soon</Text>
              <Text style={styles.glassSub}>Break the glass. Start now.</Text>
            </View>
            <Text style={styles.glassArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Second banner — most urgent of bedtime / medication / check-in / ownership */}
        {secondBanner === 'bedtime' && (
          <TouchableOpacity style={styles.bedtimeBanner} onPress={() => navigation.navigate('SleepGuard')}>
            <Text style={styles.bedtimeIcon}>😴</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bedtimeTitle}>
                {minsUntilBed > 0 ? `Bedtime in ${minsUntilBed} min` : 'Bedtime now'}
              </Text>
              <Text style={styles.bedtimeSub}>Tap to start your wind-down</Text>
            </View>
            <Text style={styles.bedtimeArrow}>→</Text>
          </TouchableOpacity>
        )}
        {secondBanner === 'medication' && (
          <TouchableOpacity
            style={styles.medBanner}
            onPress={() => addMedicationLog({ date: todayStr, takenAt: new Date().toISOString() })}
          >
            <Text style={styles.medIcon}>💊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.medTitle}>Tap when we take our medication</Text>
              <Text style={styles.medSub}>Builds the habit · tracks the streak</Text>
            </View>
            <Text style={styles.medArrow}>✓</Text>
          </TouchableOpacity>
        )}

        {/* YOUR PLAN — always visible, always expanded */}
        <View style={styles.groupBlock}>
          <View style={styles.groupHeader}>
            <View style={[styles.groupDot, { backgroundColor: '#4A148C' }]} />
            <Text style={[styles.groupLabel, { color: '#4A148C' }]}>My Plan</Text>
          </View>
          <Text style={styles.groupHint}>The organizational backbone — start here each week</Text>
          <TouchableOpacity
            style={[styles.plannerCard, { backgroundColor: '#F3E5F5', borderColor: '#4A148C40' }]}
            onPress={() => navigation.navigate('WeeklyPlanner')}
            activeOpacity={0.85}
          >
            <Text style={styles.plannerCardIcon}>📋</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.plannerCardTitle, { color: '#4A148C' }]}>Weekly Planner</Text>
              <Text style={[styles.plannerCardDesc, { color: '#7B1FA2' }]}>{plannerDesc}</Text>
            </View>
            <Text style={[styles.plannerCardArrow, { color: '#4A148C' }]}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Priority modules — from onboarding challenge picks */}
        {priorityModules.length > 0 && (
          <View style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupDot, { backgroundColor: '#5B5EA6' }]} />
              <Text style={[styles.groupLabel, { color: '#5B5EA6' }]}>My Priority</Text>
            </View>
            <Text style={styles.groupHint}>My top challenges — highlighted here, always available everywhere</Text>
            <View style={styles.grid}>
              {priorityModules.map((mod, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.card, styles.cardCompact, { width: CARD_W4, backgroundColor: mod.bg, borderColor: mod.color + '40' }]}
                  onPress={() => navigation.navigate(mod.route)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.cardIcon, { fontSize: 22 }]}>{mod.icon}</Text>
                  <Text style={[styles.cardLabel, { color: mod.darkText ? '#fff' : mod.color, fontSize: 10 }]} numberOfLines={1}>{mod.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Module groups */}
        {GROUPS.map(group => {
          const isExpanded = expandedGroups[group.key];
          const cols = group.forceCols || (group.modules.length === 3 ? 3 : group.modules.length === 1 ? 1 : 2);
          const gridW = cols === 4 ? CARD_W4 : cols === 3 ? CARD_W3 : cols === 1 ? '100%' : CARD_W2;
          return (
            <View
              key={group.key}
              style={styles.groupBlock}
              onLayout={e => { groupYRef.current[group.key] = e.nativeEvent.layout.y; }}
            >
              <TouchableOpacity
                style={styles.groupHeader}
                onPress={() => toggleGroup(group.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                <Text style={[styles.groupLabel, { color: group.color }]}>{group.label}</Text>
                {!isExpanded && (
                  <Text style={[styles.groupCount, { color: group.color }]}>
                    {group.modules.length} modules
                  </Text>
                )}
                <Text style={[styles.groupChevron, { color: group.color }]}>
                  {isExpanded ? '▾' : '▸'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.groupHint}>{group.hint}</Text>
              {isExpanded && (
                <>
                  <View style={styles.grid}>
                    {group.modules.map(mod => {
                      const status  = moduleStatus(mod.key);
                      const done    = status === '✓ Done';
                      const skipped = isSkipped(mod.key);
                      const isDue   = !done && !skipped && moduleDue(mod.key);
                      const is1col  = mod.wide || (cols === 1);
                      const cardW   = mod.wide ? '100%' : gridW;
                      return (
                        <View key={mod.key} style={{ width: cardW }}>
                          <TouchableOpacity
                            style={[
                              styles.card,
                              {
                                backgroundColor: skipped ? '#F0F0F0' : mod.bg,
                                borderColor: skipped ? '#DDD' : isDue ? mod.color : mod.color + '40',
                                borderWidth: isDue ? 2 : 1.5,
                                width: '100%',
                              },
                              is1col && styles.cardWide,
                              cols === 4 && styles.cardCompact,
                            ]}
                            onPress={() => !skipped && navigation.navigate(mod.route)}
                            activeOpacity={skipped ? 1 : 0.85}
                          >
                            {done    && <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>✓</Text></View>}
                            {skipped && <View style={styles.doneBadge}><Text style={[styles.doneBadgeText, { color: '#999' }]}>–</Text></View>}
                            {!done && !skipped && moduleDue(mod.key) && <View style={styles.dueDot} />}
                            <Text style={[styles.cardIcon, (cols === 3 || cols === 4) && { fontSize: cols === 4 ? 22 : 26 }, skipped && { opacity: 0.3 }]}>{mod.icon}</Text>
                            <View style={is1col ? { flex: 1 } : {}}>
                              <Text numberOfLines={1} style={[styles.cardLabel, { color: skipped ? '#AAA' : (mod.darkText ? '#fff' : mod.color) }, (cols === 3 || cols === 4) && { fontSize: cols === 4 ? 10 : 11 }]}>{mod.label}</Text>
                              {cols !== 3 && cols !== 4 && <Text numberOfLines={1} style={[styles.cardDesc, skipped && { color: '#BBB' }, mod.darkText && { color: '#AAAACC' }]}>{skipped ? 'Not today' : mod.desc}</Text>}
                            </View>
                            {cols !== 4 && status && !done && !skipped && (
                              <View style={[styles.countBadge, { backgroundColor: mod.color + '18' }]}>
                                <Text style={[styles.countText, { color: mod.color }]}>{status}</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          );
        })}

      </ScrollView>

      {/* Footer — pinned to screen bottom */}
      <View style={[styles.footerRow, { backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('Progress')}>
          <Text style={styles.footerIcon}>📈</Text>
          <Text style={[styles.footerLabel, { color: colors.text }]}>Progress</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('TransitionTimer')}>
          <Text style={styles.footerIcon}>⏱</Text>
          <Text style={[styles.footerLabel, { color: colors.text }]}>Timer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.footerBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate('NotificationSettings')}>
          <Text style={styles.footerIcon}>🔔</Text>
          <Text style={[styles.footerLabel, { color: colors.text }]}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  scroll:    { padding: 16, paddingBottom: 60 },

  header:      { marginBottom: 10 },
  subtitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  greeting:   { fontSize: 28, fontWeight: '900', color: '#1A1A2E' },
  subGreeting:{ fontSize: 17, fontWeight: '700', color: '#999', marginTop: 1 },
  pills:      { flexDirection: 'row', gap: 14, alignItems: 'center' },
  levelPill:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primaryLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  levelCircle:{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  levelNum:   { fontSize: 11, fontWeight: '900', color: '#fff' },
  levelName:  { fontSize: 11, fontWeight: '700', color: colors.primary },
  streakPill: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  streakText: { fontSize: 13, color: colors.primary, fontWeight: '800' },

  badgeStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8E8FF', paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  badgeIcon:  { fontSize: 20 },
  badgeSub:   { flex: 1, fontSize: 11, color: '#999' },
  badgeArrow: { fontSize: 16, color: colors.primary, fontWeight: '700' },

  ownershipBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEEEFF', borderRadius: 12, borderWidth: 1.5, borderColor: '#5B5EA6', padding: 12, marginBottom: 12 },
  ownershipIcon:   { fontSize: 22 },
  ownershipTitle:  { fontSize: 14, fontWeight: '800', color: '#5B5EA6' },
  ownershipSub:    { fontSize: 12, color: '#7986CB', marginTop: 1 },
  ownershipArrow:  { fontSize: 18, color: '#5B5EA6', fontWeight: '700' },

  medBanner:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F5E9', borderRadius: 12, borderWidth: 1.5, borderColor: '#A5D6A7', padding: 12, marginBottom: 12 },
  medIcon:    { fontSize: 22 },
  medTitle:   { fontSize: 14, fontWeight: '800', color: '#1B5E20' },
  medSub:     { fontSize: 12, color: '#388E3C', marginTop: 1 },
  medArrow:   { fontSize: 18, color: '#1B5E20', fontWeight: '700' },

  glassBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#4527A0', borderRadius: 12, borderWidth: 1.5, borderColor: '#7C4DFF', padding: 12, marginBottom: 12 },
  glassIcon:   { fontSize: 22 },
  glassTitle:  { fontSize: 14, fontWeight: '800', color: '#fff' },
  glassSub:    { fontSize: 12, color: '#BB86FC', marginTop: 1 },
  glassArrow:  { fontSize: 18, color: '#BB86FC', fontWeight: '700' },

  bedtimeBanner:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A3A', borderRadius: 12, borderWidth: 1.5, borderColor: '#5B5EA6', padding: 12, marginBottom: 12 },
  bedtimeIcon:    { fontSize: 22 },
  bedtimeTitle:   { fontSize: 14, fontWeight: '800', color: '#fff' },
  bedtimeSub:     { fontSize: 12, color: '#8888CC', marginTop: 1 },
  bedtimeArrow:   { fontSize: 18, color: '#8888CC', fontWeight: '700' },

  checkInBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.primaryLight, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, padding: 12, marginBottom: 16 },
  checkInIcon:   { fontSize: 22 },
  checkInTitle:  { fontSize: 14, fontWeight: '800', color: colors.primary },
  checkInSub:    { fontSize: 12, color: colors.primary, opacity: 0.8, marginTop: 1 },
  checkInArrow:  { fontSize: 18, color: colors.primary, fontWeight: '700' },

  plannerCard:      { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 4 },
  plannerCardIcon:  { fontSize: 32 },
  plannerCardTitle: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  plannerCardDesc:  { fontSize: 13, lineHeight: 18 },
  plannerCardArrow: { fontSize: 22, fontWeight: '700' },

  groupBlock:   { marginBottom: 8, marginTop: 6 },
  groupHeader:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, paddingVertical: 4 },
  groupDot:     { width: 9, height: 9, borderRadius: 5 },
  groupLabel:   { fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  groupCount:   { flex: 1, fontSize: 12, textAlign: 'right' },
  groupChevron: { fontSize: 14, fontWeight: '700', marginLeft: 2 },
  groupHint:    { fontSize: 12, color: '#999', marginBottom: 8 },

  // Wide card
  wideCard:  { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 10, gap: 12 },
  wideIcon:  { fontSize: 34 },
  wideLabel: { fontSize: 16, fontWeight: '800', marginBottom: 1 },
  wideDesc:  { fontSize: 12, color: '#888' },
  cardArrow: { fontSize: 20, fontWeight: '700' },

  // Grid
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  card:        { borderRadius: 16, borderWidth: 1.5, padding: 10, minHeight: 72, justifyContent: 'space-between' },
  cardCompact: { borderRadius: 12, padding: 8, minHeight: 58 },
  cardWide:  { flexDirection: 'row', alignItems: 'center', minHeight: 0, gap: 12 },
  cardIcon:  { fontSize: 30, marginBottom: 6 },
  cardLabel: { fontSize: 13, fontWeight: '800', marginBottom: 1 },
  cardDesc:  { fontSize: 11, color: '#888', lineHeight: 15, marginBottom: 4 },

  dueDot:        { position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53935' },
  doneBadge:     { position: 'absolute', top: 10, right: 10, backgroundColor: '#BBDEFB', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  doneBadgeText: { fontSize: 10, color: '#1565C0', fontWeight: '800' },
  skipBtn:       { alignItems: 'center', paddingVertical: 2 },
  skipBtnText:   { fontSize: 9, color: '#BBB', fontWeight: '600' },
  countBadge:    { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  countText:     { fontSize: 10, fontWeight: '700' },

  footerRow:  { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  crisisFooterBtn: { borderColor: '#9FA8DA', backgroundColor: '#E8EAF6' },
  footerBtn:  { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
  footerIcon: { fontSize: 16, marginBottom: 2 },
  footerLabel:{ fontSize: 10, fontWeight: '700', color: '#1A1A2E' },
});
