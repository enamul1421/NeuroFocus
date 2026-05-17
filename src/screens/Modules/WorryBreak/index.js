import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';

const PHASE = { DUMP: 'dump', CHECK: 'check', CHOOSE: 'choose', DONE: 'done' };
const ACCENT       = '#0277BD';
const ACCENT_LIGHT = '#E1F5FE';

const WORRY_TYPES = [
  { id: 'fail',   label: 'Failing or doing badly',                        emoji: '📉' },
  { id: 'judge',  label: 'People judging or talking about me',            emoji: '👀' },
  { id: 'loved',  label: 'Something bad happening to someone I care about', emoji: '💔' },
  { id: 'forget', label: 'Forgetting something important and messing up', emoji: '😰' },
  { id: 'health', label: 'Something being wrong with me',                 emoji: '🤒' },
  { id: 'future', label: 'The future feeling out of control',             emoji: '🌀' },
  { id: 'other',  label: 'Something else',                                emoji: '💭' },
];

const CHECK_Q = [
  {
    id: 'basis',
    q: 'Is this worry based on facts we know, or on what might happen?',
    opts: [
      { id: 'facts', label: 'Facts I know for sure' },
      { id: 'might', label: 'What might happen'     },
      { id: 'mix',   label: 'Mix of both'           },
    ],
  },
  {
    id: 'severity',
    q: 'If the worst happened — how bad would it actually be?',
    opts: [
      { id: 'manage',  label: 'Hard but manageable'      },
      { id: 'survive', label: 'Very hard — but survivable' },
      { id: 'crush',   label: 'It would crush me'        },
    ],
  },
  {
    id: 'control',
    q: 'Is there anything we can actually do about this right now?',
    opts: [
      { id: 'yes',  label: 'Yes — something specific' },
      { id: 'sort', label: 'Sort of — not sure what'  },
      { id: 'no',   label: 'Not right now'            },
    ],
  },
];

function getInsight(basis, severity, control) {
  if (control === 'yes')
    return "There is something real here we can act on. One small move is enough.";
  if (severity === 'crush')
    return "This feels very heavy. We do not have to carry it alone — one person we trust could help hold this.";
  if (basis === 'might' && severity === 'manage')
    return "Our brain is predicting danger that may never arrive. That is what anxiety does. We can set this aside.";
  if (basis === 'facts' && control === 'no')
    return "This is real, and it is not in our hands right now. The only move is to set it down until we can act.";
  return "The worry is real. Let us decide: act on what we can, or schedule time to think about this properly.";
}

export default function WorryBreak({ navigation }) {
  const colors = useColors();
  const { addWorryBreakSession } = useStore(s => ({
    addWorryBreakSession: s.addWorryBreakSession,
  }));

  const [phase,      setPhase]     = useState(PHASE.DUMP);
  const [worryType,  setWorryType] = useState(null);
  const [intensity,  setIntensity] = useState(null);
  const [worryText,  setWorryText] = useState('');
  const [answers,    setAnswers]   = useState({});
  const [actionText, setActionText]= useState('');
  const [choice,     setChoice]    = useState(null);

  function setAnswer(qId, optId) {
    setAnswers(prev => ({ ...prev, [qId]: optId }));
  }

  function allChecked() {
    return CHECK_Q.every(q => answers[q.id]);
  }

  const insight = allChecked()
    ? getInsight(answers.basis, answers.severity, answers.control)
    : null;

  async function finish(choiceId) {
    setChoice(choiceId);
    addWorryBreakSession({
      date:       new Date().toISOString(),
      worryType,
      intensity,
      basis:      answers.basis,
      severity:   answers.severity,
      control:    answers.control,
      choice:     choiceId,
      actionText: actionText.trim(),
    });

    // If scheduling worry time — fire a notification at 8pm or in 30 min if already evening
    if (choiceId === 'schedule') {
      const now    = new Date();
      const target = new Date();
      if (now.getHours() < 19) {
        target.setHours(20, 0, 0, 0); // 8pm tonight
      } else {
        target.setTime(now.getTime() + 30 * 60 * 1000); // 30 min from now
      }
      const secsUntil = Math.round((target.getTime() - now.getTime()) / 1000);
      if (secsUntil > 0) {
        Notifications.scheduleNotificationAsync({
          content: {
            title: '🌀 Worry time',
            body:  'We set this earlier. 5 minutes to think it through — then we let it go.',
            sound: true,
          },
          trigger: { seconds: secsUntil },
        }).catch(() => {});
      }
    }

    setPhase(PHASE.DONE);
  }

  // ── DUMP ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DUMP) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🌀</Text>
          <Text style={[styles.title, { color: colors.text }]}>What is worrying us?</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Name it. Getting the worry out of our head is step one.
          </Text>

          <View style={styles.typeGrid}>
            {WORRY_TYPES.map(w => (
              <TouchableOpacity
                key={w.id}
                style={[
                  styles.typeChip,
                  { borderColor: worryType === w.id ? ACCENT : colors.border,
                    backgroundColor: worryType === w.id ? ACCENT : colors.surface },
                ]}
                onPress={() => setWorryType(w.id)}
              >
                <Text style={styles.typeEmoji}>{w.emoji}</Text>
                <Text style={[styles.typeLabel, { color: worryType === w.id ? '#fff' : colors.text }]}>
                  {w.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {worryType && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>
                How intense is it right now? (1 = mild  ·  5 = overwhelming)
              </Text>
              <View style={styles.intensityRow}>
                {[1,2,3,4,5].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.intensityBtn,
                      { backgroundColor: intensity === n ? ACCENT : colors.surface,
                        borderColor: intensity === n ? ACCENT : colors.border }]}
                    onPress={() => setIntensity(n)}
                  >
                    <Text style={[styles.intensityNum, { color: intensity === n ? '#fff' : colors.text }]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.text }]}>Write it out (optional):</Text>
              <TextInput
                style={[styles.textBox, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Put the whole worry here — no one else sees this..."
                placeholderTextColor={colors.textLight}
                value={worryText}
                onChangeText={setWorryText}
                multiline
              />
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: worryType && intensity ? ACCENT : '#CCC' }]}
            onPress={worryType && intensity ? () => setPhase(PHASE.CHECK) : null}
          >
            <Text style={styles.primaryBtnText}>Check the worry →</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CHECK ────────────────────────────────────────────────────────────────────
  if (phase === PHASE.CHECK) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>CHECK THE WORRY</Text>
          <Text style={[styles.title, { color: colors.text }]}>Three quick questions.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            No right answers. Just looking at it clearly.
          </Text>

          {CHECK_Q.map((q, qi) => (
            <View key={q.id} style={[styles.checkCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.checkNum, { color: ACCENT }]}>{qi + 1}</Text>
              <Text style={[styles.checkQ, { color: colors.text }]}>{q.q}</Text>
              <View style={styles.checkOpts}>
                {q.opts.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.checkOptBtn,
                      { borderColor: answers[q.id] === opt.id ? ACCENT : colors.border,
                        backgroundColor: answers[q.id] === opt.id ? ACCENT : colors.background },
                    ]}
                    onPress={() => setAnswer(q.id, opt.id)}
                  >
                    <Text style={[styles.checkOptText, { color: answers[q.id] === opt.id ? '#fff' : colors.text }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {insight && (
            <View style={[styles.insightCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
              <Text style={[styles.insightText, { color: '#01579B' }]}>💡 {insight}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: allChecked() ? ACCENT : '#CCC' }]}
            onPress={allChecked() ? () => setPhase(PHASE.CHOOSE) : null}
          >
            <Text style={styles.primaryBtnText}>Decide what to do →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── CHOOSE ───────────────────────────────────────────────────────────────────
  if (phase === PHASE.CHOOSE) {
    const canAct    = answers.control === 'yes' || answers.control === 'sort';
    const needsHelp = answers.severity === 'crush';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={2} total={3} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>CHOOSE</Text>
          <Text style={[styles.title, { color: colors.text }]}>What do we do with this?</Text>

          {canAct && (
            <View style={[styles.choiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.choiceTitle, { color: colors.text }]}>⚡ Do one small thing</Text>
              <Text style={[styles.choiceSub, { color: colors.textLight }]}>
                One action — not the whole solution. Just a first move.
              </Text>
              <TextInput
                style={[styles.actionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="What is one thing we can do?"
                placeholderTextColor={colors.textLight}
                value={actionText}
                onChangeText={setActionText}
              />
              <TouchableOpacity
                style={[styles.choiceBtn, { backgroundColor: actionText.trim() ? ACCENT : '#CCC' }]}
                onPress={actionText.trim() ? () => finish('act') : null}
              >
                <Text style={styles.choiceBtnText}>I will do this  +45 XP →</Text>
              </TouchableOpacity>
            </View>
          )}

          {needsHelp && (
            <View style={[styles.choiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.choiceTitle, { color: colors.text }]}>🤝 Talk to someone</Text>
              <Text style={[styles.choiceSub, { color: colors.textLight }]}>
                This is too heavy to carry alone. Name one person.
              </Text>
              <TextInput
                style={[styles.actionInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                placeholder="Who could we tell?"
                placeholderTextColor={colors.textLight}
                value={actionText}
                onChangeText={setActionText}
              />
              <TouchableOpacity
                style={[styles.choiceBtn, { backgroundColor: actionText.trim() ? ACCENT : '#CCC' }]}
                onPress={actionText.trim() ? () => finish('talk') : null}
              >
                <Text style={styles.choiceBtnText}>I will reach out  +45 XP →</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.choiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.choiceTitle, { color: colors.text }]}>🗓 Schedule worry time</Text>
            <Text style={[styles.choiceSub, { color: colors.textLight }]}>
              Give the worry a dedicated 5 minutes later — not now. Our brain accepts this deal.
            </Text>
            <TouchableOpacity
              style={[styles.choiceBtn, { backgroundColor: ACCENT }]}
              onPress={() => finish('schedule')}
            >
              <Text style={styles.choiceBtnText}>
                {new Date().getHours() < 19 ? 'Remind us at 8pm' : 'Remind us in 30 min'}
                {'  +45 XP →'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.choiceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.choiceTitle, { color: colors.text }]}>🍃 Let it go for now</Text>
            <Text style={[styles.choiceSub, { color: colors.textLight }]}>
              We have looked at it. We have checked the facts. We can set it down.
            </Text>
            <TouchableOpacity
              style={[styles.choiceBtn, { backgroundColor: '#78909C' }]}
              onPress={() => finish('letgo')}
            >
              <Text style={styles.choiceBtnText}>Set it down  +45 XP →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    const messages = {
      act:      'One small action is all the brain needs to shift from worry mode to work mode.',
      talk:     'Sharing a heavy worry cuts its weight in half. Reaching out is strength.',
      schedule: `Postponing worry with a plan is a clinically proven technique. We will get a reminder ${new Date().getHours() < 19 ? 'at 8pm' : 'in 30 minutes'} — then we think it through properly.`,
      letgo:    'We looked at it clearly and set it down. That is the skill.',
    };
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.heroEmoji}>🧘</Text>
          <Text style={[styles.title, { color: colors.text }]}>Worry checked.  +45 XP</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>{messages[choice]}</Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%', marginTop: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Back to app →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 48 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  heroEmoji:    { fontSize: 52, textAlign: 'center', marginBottom: 12, marginTop: 4 },
  phaseTag:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 10 },
  title:        { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub:          { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 4 },

  typeGrid:  { gap: 8, marginBottom: 20 },
  typeChip:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14 },
  typeEmoji: { fontSize: 20 },
  typeLabel: { fontSize: 14, fontWeight: '600', flex: 1 },

  intensityRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  intensityBtn: { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 12 },
  intensityNum: { fontSize: 18, fontWeight: '900' },

  textBox: { borderRadius: 12, borderWidth: 1.5, padding: 14, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },

  checkCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 12 },
  checkNum:  { fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  checkQ:    { fontSize: 15, fontWeight: '700', marginBottom: 12, lineHeight: 22 },
  checkOpts: { gap: 8 },
  checkOptBtn:  { borderRadius: 10, borderWidth: 1.5, padding: 12 },
  checkOptText: { fontSize: 13, fontWeight: '600' },

  insightCard: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  insightText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  choiceCard:  { borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 14 },
  choiceTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  choiceSub:   { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  choiceBtn:   { borderRadius: 10, padding: 14, alignItems: 'center' },
  choiceBtnText:{ color: '#fff', fontSize: 14, fontWeight: '800' },
  actionInput: { borderRadius: 10, borderWidth: 1.5, padding: 12, fontSize: 14, marginBottom: 12 },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginTop: 16, padding: 8 },
  backLinkText:   { fontSize: 13 },
});
