import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';

const SCREEN = {
  DISCOVER:      'discover',
  HOME:          'home',
  CHECK:         'check',
  RESULT:        'result',
  REPAIR:        'repair',
  REPAIR_DETAIL: 'repair_detail',
};

const ACCENT       = '#E65100';
const ACCENT_LIGHT = '#FFF3E0';

const VALUES = [
  { id: 'honesty',      label: 'Honesty',       emoji: '🎯', desc: 'We say what is true, even when it is hard' },
  { id: 'loyalty',      label: 'Loyalty',        emoji: '🛡️', desc: 'We stand by the people who matter to us' },
  { id: 'kindness',     label: 'Kindness',       emoji: '💚', desc: 'We treat others with care' },
  { id: 'courage',      label: 'Courage',        emoji: '🦁', desc: 'We do hard things even when scared' },
  { id: 'fairness',     label: 'Fairness',       emoji: '⚖️', desc: 'We want things to be right for everyone' },
  { id: 'reliability',  label: 'Reliability',    emoji: '⚓', desc: 'People can count on us to follow through' },
  { id: 'humor',        label: 'Humor',          emoji: '😄', desc: 'We bring lightness to hard moments' },
  { id: 'creativity',   label: 'Creativity',     emoji: '🎨', desc: 'We see things differently' },
  { id: 'friendship',   label: 'Friendship',     emoji: '🤝', desc: 'We invest in the people we care about' },
  { id: 'respect',      label: 'Respect',        emoji: '🙏', desc: 'We honor others and ourselves' },
  { id: 'independence', label: 'Independence',   emoji: '🌟', desc: 'We think for ourselves and own our choices' },
  { id: 'family',       label: 'Family',         emoji: '🏠', desc: 'We show up for the people closest to us' },
];

const REPAIRS = [
  {
    id: 'lied',
    label: "We said something that was not true",
    emoji: '🗣️',
    steps: [
      "Find a private moment — not in front of others.",
      "Say: 'I told you [X] and that was not true. I am sorry.'",
      "No long explanation. The truth and the apology — that is it.",
      "If they ask why: 'I think I wanted to avoid the conversation.'",
      "Let them react without interrupting. They may be hurt.",
      "End with: 'I want you to be able to trust us. That matters to us.'",
    ],
    note: "Short is better. Long explanations sound like more excuses.",
  },
  {
    id: 'borrowed',
    label: "We borrowed something and did not return it",
    emoji: '📦',
    steps: [
      "Find the item right now — or write it down so we do not forget again.",
      "Return it with: 'Sorry it took so long.'",
      "No big story needed. Handing it back is the action that counts.",
      "If we cannot find it: 'I think I lost your [item]. Can I replace it?'",
      "Follow through on replacing it — even if it takes time.",
    ],
    note: "The longer we wait, the harder it gets. Do it today.",
  },
  {
    id: 'letdown',
    label: "We let someone down",
    emoji: '💔',
    steps: [
      "Reach out first — do not wait for them to bring it up.",
      "Say: 'I know I let you down when [specific thing]. That was not okay.'",
      "Do not add 'but'. Let the acknowledgment sit.",
      "Ask: 'Is there anything I can do to make it right?'",
      "If they say nothing: 'I understand. I just wanted you to know I see it.'",
    ],
    note: "They may not forgive right away. The repair is still worth doing.",
  },
  {
    id: 'forgot',
    label: "We said we would do something and forgot",
    emoji: '📅',
    steps: [
      "Tell them as soon as we realize — do not wait until they ask.",
      "Say: 'I forgot to [do the thing]. I am sorry for leaving you hanging.'",
      "Offer to do it now, or give a concrete new time: 'Can I do it by [day]?'",
      "Set a phone reminder the moment we commit this time.",
      "Following through on the second attempt matters more than the first miss.",
    ],
    note: "Saying sorry is not enough without a new plan. Give them a date.",
  },
];

export default function TrueNorth({ navigation }) {
  const colors = useColors();
  const {
    trueNorthValues, setTrueNorthValues,
    addTrueNorthLog, trueNorthLogs, awardXP,
  } = useStore(s => ({
    trueNorthValues:    s.trueNorthValues    || [],
    setTrueNorthValues: s.setTrueNorthValues,
    addTrueNorthLog:    s.addTrueNorthLog,
    trueNorthLogs:      s.trueNorthLogs      || [],
    awardXP:            s.awardXP,
  }));

  const today    = new Date().toISOString().split('T')[0];
  const todayLog = trueNorthLogs.find(l => l.date === today);
  const hasValues = trueNorthValues.length > 0;

  const [screen,         setScreen]         = useState(hasValues ? SCREEN.HOME : SCREEN.DISCOVER);
  const [selectedValues, setSelectedValues] = useState([...trueNorthValues]);
  const [alignments,     setAlignments]     = useState(todayLog?.alignments || {});
  const [checkedSteps,   setCheckedSteps]   = useState({});
  const [activeRepair,   setActiveRepair]   = useState(null);
  const [checkResult,    setCheckResult]    = useState(todayLog || null);

  const myValues = VALUES.filter(v => trueNorthValues.includes(v.id));

  function toggleValueSelect(id) {
    setSelectedValues(prev =>
      prev.includes(id) ? prev.filter(v => v !== id)
        : prev.length < 5 ? [...prev, id] : prev
    );
  }

  function saveDiscovery() {
    setTrueNorthValues(selectedValues);
    awardXP(50);
    setScreen(SCREEN.HOME);
  }

  function setAlignment(valueId, status) {
    setAlignments(prev => ({ ...prev, [valueId]: status }));
  }

  function allRated() {
    return myValues.every(v => alignments[v.id]);
  }

  function submitCheck() {
    const driftedValues = myValues.filter(v => alignments[v.id] === 'drifted').map(v => v.id);
    const allAligned = driftedValues.length === 0 && myValues.some(v => alignments[v.id] === 'aligned');
    const log = { date: today, alignments, driftedValues, allAligned };
    addTrueNorthLog(log);
    setCheckResult(log);
    setScreen(SCREEN.RESULT);
  }

  function toggleStep(repairId, idx) {
    const key = `${repairId}_${idx}`;
    setCheckedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function isStepChecked(repairId, idx) {
    return !!checkedSteps[`${repairId}_${idx}`];
  }

  // ── DISCOVER ──────────────────────────────────────────────────────────────────
  if (screen === SCREEN.DISCOVER) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.compassEmoji}>🧭</Text>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Finding Our TrueNorth</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Pick 5 values that describe us at our best — not who we always are, but who we want to be.
          </Text>
          <SpeakButton text="Pick 5 values that describe us at our best — not who we always are, but who we want to be. Knowing our values helps us make decisions faster, feel less lost, and stay grounded when things get hard." style={{ marginBottom: 8 }} />
          <Text style={[styles.selCount, { color: selectedValues.length === 5 ? ACCENT : colors.textLight }]}>
            {selectedValues.length} / 5 selected
          </Text>

          <View style={styles.valuesGrid}>
            {VALUES.map(v => {
              const sel      = selectedValues.includes(v.id);
              const disabled = !sel && selectedValues.length >= 5;
              return (
                <TouchableOpacity
                  key={v.id}
                  style={[
                    styles.valueCard,
                    { borderColor: sel ? ACCENT : colors.border,
                      backgroundColor: sel ? ACCENT : colors.surface,
                      opacity: disabled ? 0.35 : 1 },
                  ]}
                  onPress={() => !disabled && toggleValueSelect(v.id)}
                  activeOpacity={disabled ? 1 : 0.8}
                >
                  <Text style={styles.valueEmoji}>{v.emoji}</Text>
                  <Text style={[styles.valueLabel, { color: sel ? '#fff' : colors.text }]}>{v.label}</Text>
                  <Text style={[styles.valueDesc, { color: sel ? '#FFD0A8' : colors.textLight }]} numberOfLines={2}>
                    {v.desc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: selectedValues.length === 5 ? ACCENT : '#CCC' }]}
            onPress={selectedValues.length === 5 ? saveDiscovery : null}
          >
            <Text style={styles.primaryBtnText}>This is our TrueNorth  →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── HOME ──────────────────────────────────────────────────────────────────────
  if (screen === SCREEN.HOME) {
    const lastLog      = trueNorthLogs[trueNorthLogs.length - 1];
    const checkedToday = !!todayLog;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.compassEmoji}>🧭</Text>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Our TrueNorth</Text>

          <View style={[styles.profileCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <View style={styles.profileBadges}>
              {myValues.map(v => (
                <View key={v.id} style={[styles.profileBadge, { backgroundColor: ACCENT }]}>
                  <Text style={styles.profileBadgeEmoji}>{v.emoji}</Text>
                  <Text style={styles.profileBadgeLabel}>{v.label}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => { setSelectedValues([...trueNorthValues]); setScreen(SCREEN.DISCOVER); }}>
              <Text style={[styles.editLink, { color: ACCENT }]}>Edit values</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.actionCard,
              checkedToday
                ? { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }
                : { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => checkedToday ? setScreen(SCREEN.RESULT) : setScreen(SCREEN.CHECK)}
          >
            <Text style={styles.actionEmoji}>{checkedToday ? '✅' : '📍'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: checkedToday ? '#1B5E20' : colors.text }]}>
                {checkedToday ? 'Daily check done' : 'Daily alignment check'}
              </Text>
              <Text style={[styles.actionSub, { color: colors.textLight }]}>
                {checkedToday ? 'Tap to review today' : 'How did we show up today?  · ~2 min'}
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: ACCENT }]}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setScreen(SCREEN.REPAIR)}
          >
            <Text style={styles.actionEmoji}>🔧</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Repair toolkit</Text>
              <Text style={[styles.actionSub, { color: colors.textLight }]}>
                When we drifted — here is how to fix it
              </Text>
            </View>
            <Text style={[styles.actionArrow, { color: ACCENT }]}>→</Text>
          </TouchableOpacity>

          {lastLog && (
            <Text style={[styles.lastCheck, { color: colors.textLight }]}>
              Last check: {new Date(lastLog.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {lastLog.allAligned ? '  · fully aligned ✓' : `  · ${lastLog.driftedValues.length} drifted`}
            </Text>
          )}

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={[styles.backBtnText, { color: colors.textLight }]}>← Back to app</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CHECK ─────────────────────────────────────────────────────────────────────
  if (screen === SCREEN.CHECK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>DAILY CHECK</Text>
          <Text style={[styles.bigTitle, { color: colors.text }]}>How did we show up today?</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>Honest — there is no wrong answer. Just noticing.</Text>

          {myValues.map(v => (
            <View key={v.id} style={[styles.checkRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.checkEmoji}>{v.emoji}</Text>
              <Text style={[styles.checkLabel, { color: colors.text }]}>{v.label}</Text>
              <View style={styles.checkBtns}>
                {[
                  { status: 'aligned', symbol: '✓', activeBg: '#1B5E20', inactiveBg: '#E8F5E9' },
                  { status: 'drifted', symbol: '⚡', activeBg: '#B71C1C', inactiveBg: '#FFEBEE' },
                  { status: 'skip',    symbol: '—',  activeBg: '#757575', inactiveBg: '#F5F5F5' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.status}
                    style={[
                      styles.checkBtn,
                      { backgroundColor: alignments[v.id] === opt.status ? opt.activeBg : opt.inactiveBg },
                    ]}
                    onPress={() => setAlignment(v.id, opt.status)}
                  >
                    <Text style={[styles.checkBtnText, { color: alignments[v.id] === opt.status ? '#fff' : '#666' }]}>
                      {opt.symbol}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: allRated() ? ACCENT : '#CCC', marginTop: 16 }]}
            onPress={allRated() ? submitCheck : null}
          >
            <Text style={styles.primaryBtnText}>See result →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────────────
  if (screen === SCREEN.RESULT) {
    const result = checkResult;
    if (!result) return null;
    const drifted = myValues.filter(v => result.alignments[v.id] === 'drifted');
    const aligned  = myValues.filter(v => result.alignments[v.id] === 'aligned');

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>RESULT</Text>

          {result.allAligned ? (
            <View style={[styles.resultBanner, { backgroundColor: '#E8F5E9', borderColor: '#A5D6A7' }]}>
              <Text style={styles.resultBannerEmoji}>🧭✨</Text>
              <Text style={[styles.resultBannerTitle, { color: '#1B5E20' }]}>Fully aligned today.</Text>
              <Text style={[styles.resultBannerSub, { color: '#2E7D32' }]}>
                Every value we claimed — we lived it. That is not small.
              </Text>
            </View>
          ) : (
            <View style={[styles.resultBanner, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={styles.resultBannerEmoji}>🧭</Text>
              <Text style={[styles.resultBannerTitle, { color: ACCENT }]}>We noticed. That is step one.</Text>
              <Text style={[styles.resultBannerSub, { color: '#BF360C' }]}>
                Noticing the drift is what makes tomorrow different.
              </Text>
            </View>
          )}

          {aligned.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Aligned ✓</Text>
              <View style={styles.alignedRow}>
                {aligned.map(v => (
                  <View key={v.id} style={styles.alignedBadge}>
                    <Text style={styles.alignedBadgeEmoji}>{v.emoji}</Text>
                    <Text style={styles.alignedBadgeLabel}>{v.label}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {drifted.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>Drifted ⚡</Text>
              {drifted.map(v => (
                <View key={v.id} style={[styles.driftRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={styles.checkEmoji}>{v.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.checkLabel, { color: colors.text }]}>{v.label}</Text>
                    <Text style={[styles.actionSub, { color: colors.textLight }]}>One small step back?</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.repairPill, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}
                    onPress={() => setScreen(SCREEN.REPAIR)}
                  >
                    <Text style={[styles.repairPillText, { color: ACCENT }]}>Repair →</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, marginTop: 16 }]}
            onPress={() => setScreen(SCREEN.HOME)}
          >
            <Text style={styles.primaryBtnText}>Done  +{result.allAligned ? 60 : 40} XP →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── REPAIR MENU ───────────────────────────────────────────────────────────────
  if (screen === SCREEN.REPAIR) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>REPAIR TOOLKIT</Text>
          <Text style={[styles.bigTitle, { color: colors.text }]}>Making it right</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Pick what happened. We will walk through it together.
          </Text>

          {REPAIRS.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.repairMenuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { setActiveRepair(r); setCheckedSteps({}); setScreen(SCREEN.REPAIR_DETAIL); }}
            >
              <Text style={styles.repairMenuEmoji}>{r.emoji}</Text>
              <Text style={[styles.repairMenuLabel, { color: colors.text }]}>{r.label}</Text>
              <Text style={[styles.actionArrow, { color: ACCENT }]}>→</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen(SCREEN.HOME)}>
            <Text style={[styles.backBtnText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── REPAIR DETAIL ─────────────────────────────────────────────────────────────
  if (screen === SCREEN.REPAIR_DETAIL && activeRepair) {
    const anyChecked = activeRepair.steps.some((_, i) => isStepChecked(activeRepair.id, i));

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>REPAIR</Text>
          <Text style={styles.repairDetailEmoji}>{activeRepair.emoji}</Text>
          <Text style={[styles.bigTitle, { color: colors.text }]}>{activeRepair.label}</Text>

          <View style={styles.stepList}>
            {activeRepair.steps.map((step, i) => {
              const checked = isStepChecked(activeRepair.id, i);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.stepRow,
                    { backgroundColor: checked ? '#E8F5E9' : colors.surface,
                      borderColor:     checked ? '#A5D6A7' : colors.border },
                  ]}
                  onPress={() => toggleStep(activeRepair.id, i)}
                >
                  <View style={[styles.stepCheckBox, { backgroundColor: checked ? '#1B5E20' : colors.border }]}>
                    {checked && <Text style={styles.stepCheckMark}>✓</Text>}
                  </View>
                  <Text style={[styles.stepText, { color: checked ? '#1B5E20' : colors.text }]}>{step}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.noteCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.noteText, { color: ACCENT }]}>💡 {activeRepair.note}</Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: anyChecked ? ACCENT : '#CCC' }]}
            onPress={anyChecked ? () => { awardXP(30); setScreen(SCREEN.HOME); } : null}
          >
            <Text style={styles.primaryBtnText}>I am working on this  +30 XP →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backBtn} onPress={() => setScreen(SCREEN.REPAIR)}>
            <Text style={[styles.backBtnText, { color: colors.textLight }]}>← Other repairs</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 48 },

  compassEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 8, marginTop: 4 },
  phaseTag:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  bigTitle:     { fontSize: 24, fontWeight: '900', marginBottom: 6, textAlign: 'center' },
  sub:          { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  selCount:     { fontSize: 14, fontWeight: '800', textAlign: 'center', marginBottom: 16 },

  valuesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  valueCard:   { width: '47%', borderRadius: 14, borderWidth: 1.5, padding: 12, alignItems: 'center' },
  valueEmoji:  { fontSize: 26, marginBottom: 6 },
  valueLabel:  { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  valueDesc:   { fontSize: 11, textAlign: 'center', lineHeight: 16 },

  profileCard:       { borderRadius: 16, borderWidth: 1.5, padding: 16, marginBottom: 16 },
  profileBadges:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  profileBadge:      { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  profileBadgeEmoji: { fontSize: 14 },
  profileBadgeLabel: { fontSize: 12, fontWeight: '700', color: '#fff' },
  editLink:          { fontSize: 12, fontWeight: '600', textAlign: 'right' },

  actionCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  actionEmoji: { fontSize: 26 },
  actionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  actionSub:   { fontSize: 12 },
  actionArrow: { fontSize: 18, fontWeight: '700' },
  lastCheck:   { fontSize: 12, textAlign: 'center', marginTop: 8 },

  checkRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  checkEmoji:  { fontSize: 20 },
  checkLabel:  { flex: 1, fontSize: 14, fontWeight: '700' },
  checkBtns:   { flexDirection: 'row', gap: 6 },
  checkBtn:    { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  checkBtnText:{ fontSize: 14, fontWeight: '800' },

  resultBanner:      { borderRadius: 16, borderWidth: 1.5, padding: 20, marginBottom: 20, alignItems: 'center' },
  resultBannerEmoji: { fontSize: 40, marginBottom: 8 },
  resultBannerTitle: { fontSize: 20, fontWeight: '900', marginBottom: 4, textAlign: 'center' },
  resultBannerSub:   { fontSize: 13, lineHeight: 20, textAlign: 'center' },

  sectionLabel:      { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  alignedRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  alignedBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, borderWidth: 1, borderColor: '#A5D6A7', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5 },
  alignedBadgeEmoji: { fontSize: 14 },
  alignedBadgeLabel: { fontSize: 12, fontWeight: '700', color: '#1B5E20' },

  driftRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  repairPill:  { borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  repairPillText: { fontSize: 12, fontWeight: '700' },

  repairMenuCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  repairMenuEmoji: { fontSize: 26 },
  repairMenuLabel: { flex: 1, fontSize: 15, fontWeight: '700' },

  repairDetailEmoji: { fontSize: 40, textAlign: 'center', marginBottom: 8 },

  stepList:      { gap: 10, marginBottom: 16 },
  stepRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  stepCheckBox:  { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  stepCheckMark: { fontSize: 12, color: '#fff', fontWeight: '900' },
  stepText:      { flex: 1, fontSize: 14, lineHeight: 22 },

  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  noteText:  { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backBtn:        { alignItems: 'center', marginTop: 16, padding: 8 },
  backBtnText:    { fontSize: 14 },
});
