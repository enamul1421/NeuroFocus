import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../../theme';

const ACCENT       = '#1565C0';
const ACCENT_LIGHT = '#E3F2FD';

const SCRIPTS = [
  {
    id: 'time',
    title: 'Asking for extra time on a test',
    emoji: '⏱',
    audience: 'Teacher or exam coordinator',
    when: 'Before the test — not the morning of. Day before is ideal.',
    what: [
      '"I have an IEP / 504 plan that includes extended time."',
      '"Can you confirm the accommodation is in place for [test name] on [date]?"',
      '"If you need any paperwork, I can get it from the counselor\'s office."',
    ],
    ifNo: 'Ask them to check with the counselor or special education coordinator. Our rights do not require the teacher to approve — just to follow the plan.',
    note: 'We do not need to explain our diagnosis. The plan is the permission.',
  },
  {
    id: 'overwhelmed',
    title: 'Telling a teacher we are overwhelmed',
    emoji: '🌊',
    audience: 'Teacher',
    when: 'Before class, after class, or via email. Never mid-meltdown.',
    what: [
      '"I wanted to let you know I am having a hard time keeping up right now."',
      '"It is not about effort — my brain is struggling to organize the work."',
      '"Would it be okay to check in with you this week about where to focus?"',
    ],
    ifNo: 'If they are dismissive: "I understand. I just wanted you to know — I will keep trying." Then talk to a counselor.',
    note: 'Most teachers respond well when we come to them before the problem becomes a grade.',
  },
  {
    id: 'diagnosis',
    title: 'Explaining our diagnosis to a teacher',
    emoji: '🧠',
    audience: 'Teacher we trust',
    when: 'Start of the year or when things are getting hard.',
    what: [
      '"I have ADHD / autism — which affects how I process and organize information."',
      '"I work best when instructions are written down as well as said out loud."',
      '"I may need a quiet moment to reset sometimes — is that okay?"',
    ],
    ifNo: 'We are not required to disclose our diagnosis. If sharing does not help, stop sharing with that person.',
    note: 'Share only what is useful, only with people who are safe.',
  },
  {
    id: 'friend',
    title: 'Explaining our brain to a friend',
    emoji: '🤝',
    audience: 'A close friend',
    when: 'When they seem confused or frustrated by our behavior.',
    what: [
      '"My brain works differently — it is not that I do not care."',
      '"When I seem distracted or forget things, it is not about you."',
      '"The best thing you can do is just tell me directly if something bothers you."',
    ],
    ifNo: 'If they do not understand: "I get it. I just wanted you to know." A good friend will try even if they do not fully get it yet.',
    note: 'We do not owe anyone our diagnosis. Share when it makes the friendship better.',
  },
  {
    id: 'unfair',
    title: 'Standing up when something feels unfair',
    emoji: '⚖️',
    audience: 'Teacher, adult, or peer',
    when: 'As soon as possible after the unfair moment — when calm.',
    what: [
      '"I want to talk about something that happened. I felt it was unfair because [specific reason]."',
      '"I am not trying to cause trouble — I just want to understand what happened."',
      '"What would be the right way to handle this?"',
    ],
    ifNo: 'If they dismiss it: "I understand. Can I talk to [counselor / parent] about this?" Always escalate calmly.',
    note: 'Specific + calm is always more effective than general + emotional.',
  },
];

export default function SpeakUp({ navigation }) {
  const colors = useColors();
  const [selected, setSelected] = useState(null);

  const script = SCRIPTS.find(s => s.id === selected);

  // ── MENU ─────────────────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroEmoji}>🎤</Text>
          <Text style={[styles.title, { color: colors.text }]}>SpeakUp</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Exact words for situations that feel hard to navigate. Pick one.
          </Text>
          <SpeakButton text="Exact words for situations that feel hard to navigate. Pick one. These scripts are not about being perfect — they are about having something real to say when our brain goes blank." style={{ marginBottom: 12 }} />

          {SCRIPTS.map(s => (
            <TouchableOpacity
              key={s.id}
              style={[styles.menuCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSelected(s.id)}
            >
              <Text style={styles.menuEmoji}>{s.emoji}</Text>
              <Text style={[styles.menuTitle, { color: colors.text }]}>{s.title}</Text>
              <Text style={[styles.menuArrow, { color: ACCENT }]}>→</Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── SCRIPT DETAIL ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroEmoji}>{script.emoji}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{script.title}</Text>

        <View style={[styles.metaCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
          <Text style={[styles.metaLabel, { color: ACCENT }]}>WHO</Text>
          <Text style={[styles.metaValue, { color: '#0D47A1' }]}>{script.audience}</Text>
          <Text style={[styles.metaLabel, { color: ACCENT, marginTop: 8 }]}>WHEN</Text>
          <Text style={[styles.metaValue, { color: '#0D47A1' }]}>{script.when}</Text>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.text }]}>What to say:</Text>
        {script.what.map((line, i) => (
          <View key={i} style={[styles.scriptLine, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.scriptText, { color: colors.text }]}>{line}</Text>
          </View>
        ))}

        <Text style={[styles.sectionLabel, { color: colors.text }]}>If they say no or dismiss us:</Text>
        <View style={[styles.ifNoCard, { backgroundColor: '#FFF8E1', borderColor: '#FFD54F' }]}>
          <Text style={styles.ifNoText}>{script.ifNo}</Text>
        </View>

        <View style={[styles.noteCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
          <Text style={[styles.noteText, { color: '#0D47A1' }]}>💡 {script.note}</Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: ACCENT }]}
          onPress={() => setSelected(null)}
        >
          <Text style={styles.primaryBtnText}>← Other scripts</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back to app</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 48 },

  heroEmoji:    { fontSize: 52, textAlign: 'center', marginBottom: 10, marginTop: 4 },
  title:        { fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  sub:          { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 20 },
  sectionLabel: { fontSize: 15, fontWeight: '800', marginBottom: 10, marginTop: 8 },

  menuCard:  { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1.5, padding: 16, marginBottom: 10 },
  menuEmoji: { fontSize: 24 },
  menuTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
  menuArrow: { fontSize: 18, fontWeight: '700' },

  metaCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  metaLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  metaValue: { fontSize: 14, lineHeight: 22, marginTop: 2 },

  scriptLine: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: ACCENT, padding: 14, marginBottom: 8 },
  scriptText: { fontSize: 15, lineHeight: 24, fontStyle: 'italic', fontWeight: '600' },

  ifNoCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  ifNoText: { fontSize: 13, lineHeight: 22, color: '#795548' },

  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 20 },
  noteText:  { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  primaryBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  backLink:       { alignItems: 'center', marginTop: 14, padding: 8 },
  backLinkText:   { fontSize: 13 },
});
