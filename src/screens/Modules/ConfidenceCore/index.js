import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, TextInput, Animated,
} from 'react-native';
import { useStore } from '../../../store';
import { colors } from '../../../theme';
import { logSession } from '../../../services/logger';
import SpeakButton from '../../../components/SpeakButton';
import AnimatedGuide from '../../../components/AnimatedGuide';

// ── Data ──────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'academic',   icon: '📚', label: 'Academic' },
  { id: 'social',     icon: '👥', label: 'Social' },
  { id: 'challenge',  icon: '💪', label: 'Personal challenge' },
  { id: 'adhd',       icon: '🧠', label: 'ADHD moment' },
  { id: 'creative',   icon: '🎨', label: 'Creative' },
  { id: 'helped',     icon: '❤️', label: 'Helped someone' },
];

const ATTRIBUTION_CHIPS = [
  'Started early', 'Asked for help', 'Broke it down',
  'Kept trying', 'Stayed focused', 'Used my strength',
  'Tried something new', 'Showed up anyway',
];

const STRENGTHS = [
  { id: 'energy',     icon: '⚡', label: 'High energy' },
  { id: 'creative',   icon: '🎨', label: 'Creative thinking' },
  { id: 'hyperfocus', icon: '🔍', label: 'Hyperfocus' },
  { id: 'resilience', icon: '💪', label: 'Resilience' },
  { id: 'empathy',    icon: '🤝', label: 'Empathy' },
  { id: 'outside',    icon: '💡', label: 'Outside-the-box' },
  { id: 'bold',       icon: '🚀', label: 'Boldness' },
  { id: 'focus',      icon: '🎯', label: 'Laser focus' },
];

const SELF_COMPASSION_PROMPTS = [
  { q: 'What happened?', placeholder: 'Describe briefly (or skip)', optional: true },
  { q: 'Would you say this to a friend going through the same thing?', placeholder: 'Probably not...', optional: true },
  { q: 'What would you tell yourself right now?', placeholder: 'Write something kind', optional: false },
];

const MILESTONES = { 10: 'Ten wins. That\'s a real start.', 25: '25 wins documented.', 50: '50 wins. Undeniable.', 100: '100 wins. You have the evidence.' };

const P = { INTRO: 'intro', CAT: 'cat', WHAT: 'what', HOW: 'how', STRENGTH: 'strength', CELEBRATE: 'celebrate', ARCHIVE: 'archive', HARD_1: 'hard1', HARD_2: 'hard2', HARD_3: 'hard3', HARD_ARCHIVE: 'hard_archive' };

// ── Component ─────────────────────────────────────────────────────────────────

export default function ConfidenceCore({ navigation }) {
  const { weeklyWins, addWin, participantCode } = useStore(s => ({
    weeklyWins:   s.weeklyWins || [],
    addWin:       s.addWin,
    participantCode: s.participantCode,
  }));

  const [phase,        setPhase]        = useState(P.INTRO);
  const [category,     setCategory]     = useState(null);
  const [winText,      setWinText]      = useState('');
  const [attributions, setAttributions] = useState([]);
  const [strength,     setStrength]     = useState(null);
  const [hardInputs,   setHardInputs]   = useState(['', '', '']);
  const [hardStep,     setHardStep]     = useState(0);
  const [archiveFilter,setArchiveFilter]= useState('all');

  const celebAnim = useRef(new Animated.Value(0)).current;

  // ── Helpers ──────────────────────────────────────────────────────────────────

  function toggleAttribution(chip) {
    setAttributions(prev =>
      prev.includes(chip) ? prev.filter(c => c !== chip) : [...prev, chip]
    );
  }

  function saveWin() {
    const win = {
      id:           `win_${Date.now()}`,
      date:         new Date().toISOString(),
      text:         winText.trim(),
      category,
      attributions,
      strength,
    };
    addWin(win);
    logSession(participantCode, { module: 'ConfidenceCore', type: 'win', ...win });

    // Celebrate animation
    Animated.spring(celebAnim, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    setPhase(P.CELEBRATE);
  }

  function resetLog() {
    setCategory(null);
    setWinText('');
    setAttributions([]);
    setStrength(null);
    celebAnim.setValue(0);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────

  const totalWins = weeklyWins.length;
  const today = new Date().toDateString();
  const loggedToday = weeklyWins.some(w => new Date(w.date).toDateString() === today);

  function getStreak() {
    if (weeklyWins.length === 0) return 0;
    const sorted = [...weeklyWins].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let check = new Date(); check.setHours(0,0,0,0);
    for (const w of sorted) {
      const d = new Date(w.date); d.setHours(0,0,0,0);
      const diff = Math.round((check - d) / 86400000);
      if (diff <= 1) { streak++; check = d; }
      else break;
    }
    return streak;
  }

  function topStrength() {
    const counts = {};
    weeklyWins.forEach(w => { if (w.strength) counts[w.strength] = (counts[w.strength] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? STRENGTHS.find(s => s.id === top[0]) : null;
  }

  const streak = getStreak();
  const bestStrength = topStrength();
  const lastWin = weeklyWins.length > 0 ? weeklyWins[weeklyWins.length - 1] : null;
  const milestone = MILESTONES[totalWins];

  // ── Filtered archive ─────────────────────────────────────────────────────────

  const filteredWins = archiveFilter === 'all'
    ? [...weeklyWins].reverse()
    : [...weeklyWins].filter(w => w.category === archiveFilter).reverse();

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERS
  // ─────────────────────────────────────────────────────────────────────────────

  // ── INTRO ──────────────────────────────────────────────────────────────────
  if (phase === P.INTRO) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.moduleTag}>⚡ ConfidenceCore</Text>
          <Text style={styles.headline}>Build your evidence</Text>
          <SpeakButton text="Log any win. Build permanent evidence against self-doubt. Your brain forgets successes — this archive doesn't." size="sm" style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
          <View style={styles.goalCard}>
            <Text style={styles.goalText}>🎯 Goal: Win archive grows every session</Text>
          </View>
          <AnimatedGuide placeholder="confidence" label="Log a win" width={110} height={110} style={{ marginTop: 20, marginBottom: 20 }} />
          <Text style={styles.body}>Log any win. Your archive proves what you can do.</Text>

          {/* Stats row */}
          {totalWins > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalWins}</Text>
                <Text style={styles.statLabel}>Total wins</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Day streak</Text>
              </View>
              {bestStrength && (
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{bestStrength.icon}</Text>
                  <Text style={styles.statLabel}>{bestStrength.label}</Text>
                </View>
              )}
            </View>
          )}

          {milestone && (
            <View style={styles.milestoneCard}>
              <Text style={styles.milestoneText}>🏆 {milestone}</Text>
            </View>
          )}

          {lastWin && (
            <View style={styles.lastWinCard}>
              <Text style={styles.lastWinLabel}>Last win</Text>
              <Text style={styles.lastWinText}>
                {CATEGORIES.find(c => c.id === lastWin.category)?.icon} {lastWin.text}
              </Text>
              {lastWin.strength && (
                <Text style={styles.lastWinStrength}>
                  {STRENGTHS.find(s => s.id === lastWin.strength)?.icon} {STRENGTHS.find(s => s.id === lastWin.strength)?.label}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.introBtns}>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => setPhase(P.CAT)}>
            <Text style={styles.primaryBtnText}>Log a win today →</Text>
          </TouchableOpacity>
          {totalWins > 0 && (
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setArchiveFilter('all'); setPhase(P.ARCHIVE); }}>
              <Text style={styles.secondaryBtnText}>View archive ({totalWins})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.hardDayBtn} onPress={() => { setHardStep(0); setHardInputs(['','','']); setPhase(P.HARD_1); }}>
            <Text style={styles.hardDayBtnText}>Having a hard day</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 1: Category ──────────────────────────────────────────────────────
  if (phase === P.CAT) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => setPhase(P.INTRO)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepTag}>Step 1 of 3</Text>
          <Text style={styles.headline}>What kind of win?</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.catCard, category === c.id && styles.catCardSelected]}
                onPress={() => setCategory(c.id)}
              >
                <Text style={styles.catIcon}>{c.icon}</Text>
                <Text style={[styles.catLabel, category === c.id && styles.catLabelSelected]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, !category && styles.primaryBtnDisabled]}
            onPress={() => setPhase(P.WHAT)}
            disabled={!category}
          >
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 2: What was the win ──────────────────────────────────────────────
  if (phase === P.WHAT) {
    const cat = CATEGORIES.find(c => c.id === category);
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => setPhase(P.CAT)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepTag}>{cat?.icon} {cat?.label} · Step 1 of 3</Text>
          <Text style={styles.headline}>Describe the win</Text>
          <Text style={styles.body}>A few words is enough.</Text>
          <TextInput
            style={styles.winInput}
            placeholder='e.g. "Finished my bio lab report"'
            placeholderTextColor={colors.textLight}
            value={winText}
            onChangeText={setWinText}
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={[styles.primaryBtn, !winText.trim() && styles.primaryBtnDisabled]}
            onPress={() => setPhase(P.HOW)}
            disabled={!winText.trim()}
          >
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── STEP 3: Attribution ───────────────────────────────────────────────────
  if (phase === P.HOW) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => setPhase(P.WHAT)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepTag}>Step 2 of 3</Text>
          <Text style={styles.headline}>What did YOU do?</Text>
          <Text style={styles.body}>Tap everything that applies.</Text>
          <View style={styles.chipGrid}>
            {ATTRIBUTION_CHIPS.map(chip => (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, attributions.includes(chip) && styles.chipSelected]}
                onPress={() => toggleAttribution(chip)}
              >
                <Text style={[styles.chipText, attributions.includes(chip) && styles.chipTextSelected]}>{chip}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, attributions.length === 0 && styles.primaryBtnDisabled]}
            onPress={() => setPhase(P.STRENGTH)}
            disabled={attributions.length === 0}
          >
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── STEP 4: Strength ──────────────────────────────────────────────────────
  if (phase === P.STRENGTH) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={() => setPhase(P.HOW)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepTag}>Step 3 of 3</Text>
          <Text style={styles.headline}>Which strength showed up?</Text>
          <View style={styles.strengthGrid}>
            {STRENGTHS.map(s => (
              <TouchableOpacity
                key={s.id}
                style={[styles.strengthCard, strength === s.id && styles.strengthCardSelected]}
                onPress={() => setStrength(s.id)}
              >
                <Text style={styles.strengthIcon}>{s.icon}</Text>
                <Text style={[styles.strengthLabel, strength === s.id && styles.strengthLabelSelected]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, !strength && styles.primaryBtnDisabled]}
            onPress={saveWin}
            disabled={!strength}
          >
            <Text style={styles.primaryBtnText}>Save win ✓</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CELEBRATE ─────────────────────────────────────────────────────────────
  if (phase === P.CELEBRATE) {
    const cat = CATEGORIES.find(c => c.id === category);
    const str = STRENGTHS.find(s => s.id === strength);
    const winNum = weeklyWins.length;
    const newMilestone = MILESTONES[winNum];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Animated.Text style={[styles.celebEmoji, {
            transform: [{ scale: celebAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }],
          }]}>
            {cat?.icon}
          </Animated.Text>
          <Text style={styles.celebTitle}>Win #{winNum} logged</Text>
          {newMilestone && (
            <View style={styles.milestoneCard}>
              <Text style={styles.milestoneText}>🏆 {newMilestone}</Text>
            </View>
          )}

          <View style={styles.winCard}>
            <Text style={styles.winCardText}>"{winText}"</Text>
            <View style={styles.winCardMeta}>
              <Text style={styles.winCardChips}>{attributions.join(' · ')}</Text>
              {str && <Text style={styles.winCardStrength}>{str.icon} {str.label}</Text>}
            </View>
          </View>

          <Text style={styles.celebMsg}>
            This goes into your permanent archive. When you doubt yourself, this is evidence.
          </Text>

          <View style={styles.celebBtns}>
            <TouchableOpacity
              style={[styles.primaryBtn, { flex: 1 }]}
              onPress={() => { resetLog(); setArchiveFilter('all'); setPhase(P.ARCHIVE); }}
            >
              <Text style={styles.primaryBtnText}>View archive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryBtn, { flex: 1 }]}
              onPress={() => { resetLog(); navigation.goBack(); }}
            >
              <Text style={styles.secondaryBtnText}>Done ✓</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── ARCHIVE ───────────────────────────────────────────────────────────────
  if (phase === P.ARCHIVE) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.archiveHeader}>
          <TouchableOpacity onPress={() => setPhase(P.INTRO)}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.archiveTitle}>Your Archive</Text>
          <Text style={styles.archiveCount}>{totalWins} wins</Text>
        </View>

        {/* Filter strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterStrip} contentContainerStyle={styles.filterStripContent}>
          <TouchableOpacity
            style={[styles.filterChip, archiveFilter === 'all' && styles.filterChipActive]}
            onPress={() => setArchiveFilter('all')}
          >
            <Text style={[styles.filterChipText, archiveFilter === 'all' && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[styles.filterChip, archiveFilter === c.id && styles.filterChipActive]}
              onPress={() => setArchiveFilter(c.id)}
            >
              <Text style={[styles.filterChipText, archiveFilter === c.id && styles.filterChipTextActive]}>{c.icon} {c.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.archiveList}>
          {filteredWins.length === 0 ? (
            <Text style={styles.archiveEmpty}>No wins in this category yet.</Text>
          ) : (
            filteredWins.map(w => {
              const cat = CATEGORIES.find(c => c.id === w.category);
              const str = STRENGTHS.find(s => s.id === w.strength);
              const date = new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <View key={w.id} style={styles.archiveCard}>
                  <View style={styles.archiveCardHeader}>
                    <Text style={styles.archiveCatIcon}>{cat?.icon}</Text>
                    <Text style={styles.archiveDate}>{date}</Text>
                    {str && <View style={styles.archiveStrengthBadge}><Text style={styles.archiveStrengthText}>{str.icon} {str.label}</Text></View>}
                  </View>
                  <Text style={styles.archiveWinText}>"{w.text}"</Text>
                  {w.attributions?.length > 0 && (
                    <Text style={styles.archiveAttrib}>{w.attributions.join(' · ')}</Text>
                  )}
                </View>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── HARD DAY flow ─────────────────────────────────────────────────────────
  if (phase === P.HARD_1 || phase === P.HARD_2 || phase === P.HARD_3) {
    const stepIdx = phase === P.HARD_1 ? 0 : phase === P.HARD_2 ? 1 : 2;
    const prompt = SELF_COMPASSION_PROMPTS[stepIdx];
    const nextPhase = stepIdx === 0 ? P.HARD_2 : stepIdx === 1 ? P.HARD_3 : P.HARD_ARCHIVE;
    const prevPhase = stepIdx === 0 ? P.INTRO : stepIdx === 1 ? P.HARD_1 : P.HARD_2;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => setPhase(prevPhase)} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.stepTag}>Step {stepIdx + 1} of 3</Text>
          <Text style={styles.headline}>{prompt.q}</Text>
          <TextInput
            style={styles.winInput}
            placeholder={prompt.placeholder}
            placeholderTextColor={colors.textLight}
            value={hardInputs[stepIdx]}
            onChangeText={v => setHardInputs(prev => { const n = [...prev]; n[stepIdx] = v; return n; })}
            multiline
            autoFocus
          />
          <TouchableOpacity
            style={[styles.primaryBtn, (!prompt.optional && !hardInputs[stepIdx].trim()) && styles.primaryBtnDisabled]}
            onPress={() => setPhase(nextPhase)}
            disabled={!prompt.optional && !hardInputs[stepIdx].trim()}
          >
            <Text style={styles.primaryBtnText}>{stepIdx === 2 ? 'See your wins →' : 'Next →'}</Text>
          </TouchableOpacity>
          {prompt.optional && (
            <TouchableOpacity style={styles.skipBtn} onPress={() => setPhase(nextPhase)}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (phase === P.HARD_ARCHIVE) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.hardArchiveHeader}>
          <Text style={styles.hardArchiveTitle}>Look what you've already done.</Text>
          <Text style={styles.hardArchiveSub}>{totalWins} wins documented. Every one of them real.</Text>
        </View>
        {weeklyWins.length === 0 ? (
          <View style={styles.content}>
            <Text style={styles.archiveEmpty}>No wins logged yet. Hard days are when you start.</Text>
            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={() => { setPhase(P.CAT); }}>
              <Text style={styles.primaryBtnText}>Log your first win →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.archiveList}>
            {[...weeklyWins].reverse().map(w => {
              const cat = CATEGORIES.find(c => c.id === w.category);
              const str = STRENGTHS.find(s => s.id === w.strength);
              const date = new Date(w.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              return (
                <View key={w.id} style={styles.archiveCard}>
                  <View style={styles.archiveCardHeader}>
                    <Text style={styles.archiveCatIcon}>{cat?.icon}</Text>
                    <Text style={styles.archiveDate}>{date}</Text>
                    {str && <View style={styles.archiveStrengthBadge}><Text style={styles.archiveStrengthText}>{str.icon} {str.label}</Text></View>}
                  </View>
                  <Text style={styles.archiveWinText}>"{w.text}"</Text>
                  {w.attributions?.length > 0 && (
                    <Text style={styles.archiveAttrib}>{w.attributions.join(' · ')}</Text>
                  )}
                </View>
              );
            })}
            <View style={{ height: 32 }} />
          </ScrollView>
        )}
        <TouchableOpacity style={[styles.primaryBtn, { margin: 24, marginBottom: 32 }]} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>Done ✓</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return null;
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content:   { padding: 24, paddingBottom: 16 },
  backBtn:   { marginBottom: 12 },
  backBtnText: { fontSize: 15, color: colors.primary, fontWeight: '600' },
  moduleTag:   { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' },
  headline:    { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 8 },
  body:        { fontSize: 14, color: colors.textLight, marginBottom: 16, lineHeight: 20 },
  stepTag:     { fontSize: 13, color: colors.primary, fontWeight: '700', marginBottom: 8 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statBox:  { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EBEBEB' },
  statValue:{ fontSize: 22, fontWeight: '900', color: colors.text },
  statLabel:{ fontSize: 11, color: colors.textLight, marginTop: 2, textAlign: 'center' },

  milestoneCard: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FFD54F', marginBottom: 12 },
  milestoneText: { fontSize: 15, fontWeight: '700', color: '#F57F17' },

  lastWinCard:     { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EBEBEB', marginBottom: 12 },
  lastWinLabel:    { fontSize: 11, fontWeight: '800', color: colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  lastWinText:     { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  lastWinStrength: { fontSize: 12, color: colors.primary, fontWeight: '600' },

  introBtns:   { padding: 24, paddingBottom: 32, gap: 10 },
  hardDayBtn:  { alignItems: 'center', paddingVertical: 10 },
  hardDayBtnText: { fontSize: 14, color: colors.textLight, textDecorationLine: 'underline' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  catCard: { width: '30%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 12, alignItems: 'center', gap: 5 },
  catCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  catIcon:  { fontSize: 26 },
  catLabel: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
  catLabelSelected: { color: colors.primary },

  winInput: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 16, color: colors.text, backgroundColor: '#fff', minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  chip:     { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.primary },

  strengthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  strengthCard: { width: '22%', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1.5, borderColor: '#E0E0E0', padding: 10, alignItems: 'center', gap: 4 },
  strengthCardSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  strengthIcon:  { fontSize: 22 },
  strengthLabel: { fontSize: 10, fontWeight: '700', color: colors.text, textAlign: 'center' },
  strengthLabelSelected: { color: colors.primary },

  celebEmoji: { fontSize: 80, textAlign: 'center', marginTop: 8, marginBottom: 8 },
  celebTitle: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center', marginBottom: 12 },
  celebMsg:   { fontSize: 14, color: colors.textLight, textAlign: 'center', lineHeight: 20, marginVertical: 16 },
  celebBtns:  { flexDirection: 'row', gap: 10 },
  winCard:    { backgroundColor: colors.primaryLight, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: colors.primary + '40' },
  winCardText:   { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  winCardMeta:   { gap: 4 },
  winCardChips:  { fontSize: 12, color: colors.primary },
  winCardStrength: { fontSize: 13, fontWeight: '700', color: colors.primary },

  archiveHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' },
  archiveTitle:   { fontSize: 18, fontWeight: '800', color: colors.text },
  archiveCount:   { fontSize: 14, color: colors.primary, fontWeight: '700' },
  filterStrip:    { maxHeight: 48, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterStripContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:     { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: '#fff' },
  filterChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  filterChipText: { fontSize: 12, fontWeight: '600', color: colors.textLight },
  filterChipTextActive: { color: colors.primary },
  archiveList:    { padding: 16 },
  archiveEmpty:   { fontSize: 14, color: colors.textLight, textAlign: 'center', paddingVertical: 32 },
  archiveCard:    { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#EBEBEB' },
  archiveCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  archiveCatIcon:    { fontSize: 18 },
  archiveDate:       { fontSize: 12, color: colors.textLight, flex: 1 },
  archiveStrengthBadge: { backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  archiveStrengthText:  { fontSize: 11, color: colors.primary, fontWeight: '700' },
  archiveWinText:    { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 4 },
  archiveAttrib:     { fontSize: 12, color: colors.textLight },

  hardArchiveHeader: { padding: 24, paddingBottom: 12, backgroundColor: colors.primaryLight, borderBottomWidth: 1, borderBottomColor: colors.primary + '30' },
  hardArchiveTitle:  { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 4 },
  hardArchiveSub:    { fontSize: 14, color: colors.primary, fontWeight: '600' },
  skipBtn:     { alignItems: 'center', paddingVertical: 10 },
  skipBtnText: { fontSize: 13, color: colors.textLight },

  headlineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  goalCard: { backgroundColor: colors.primaryLight, borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: colors.primary + '40' },
  goalText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  primaryBtn:        { backgroundColor: colors.primary, padding: 18, borderRadius: 14, alignItems: 'center' },
  primaryBtnDisabled:{ backgroundColor: '#CCC' },
  primaryBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn:      { borderWidth: 1.5, borderColor: colors.primary, padding: 16, borderRadius: 14, alignItems: 'center' },
  secondaryBtnText:  { color: colors.primary, fontSize: 16, fontWeight: '700' },
});
