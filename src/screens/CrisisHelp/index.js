import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '../../theme';

async function openLink(url) {
  const supported = await Linking.canOpenURL(url);
  if (supported) {
    await Linking.openURL(url);
  } else {
    Alert.alert('Cannot open', 'Please dial or text manually.');
  }
}

export default function CrisisHelp({ navigation }) {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={[styles.backText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heroEmoji}>💙</Text>
        <Text style={[styles.title, { color: colors.text }]}>Get Help Now</Text>
        <Text style={[styles.sub, { color: colors.textLight }]}>
          This is for moments when the pain feels too big to carry alone.
          Reaching out is the right move.
        </Text>

        {/* 988 */}
        <TouchableOpacity
          style={styles.crisisBtn}
          onPress={() => openLink('tel:988')}
        >
          <Text style={styles.crisisBtnEmoji}>📞</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.crisisBtnTitle}>Call or Text 988</Text>
            <Text style={styles.crisisBtnSub}>Suicide & Crisis Lifeline · free · 24/7</Text>
          </View>
          <Text style={styles.crisisBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* Crisis Text Line */}
        <TouchableOpacity
          style={styles.crisisBtn}
          onPress={() => openLink('sms:741741?body=HOME')}
        >
          <Text style={styles.crisisBtnEmoji}>💬</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.crisisBtnTitle}>Text HOME to 741741</Text>
            <Text style={styles.crisisBtnSub}>Crisis Text Line · text if calling feels too hard</Text>
          </View>
          <Text style={styles.crisisBtnArrow}>→</Text>
        </TouchableOpacity>

        {/* 911 */}
        <TouchableOpacity
          style={[styles.crisisBtn, { borderColor: '#B71C1C' }]}
          onPress={() => openLink('tel:911')}
        >
          <Text style={styles.crisisBtnEmoji}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.crisisBtnTitle, { color: '#B71C1C' }]}>Call 911</Text>
            <Text style={styles.crisisBtnSub}>If we or someone else is in immediate danger</Text>
          </View>
          <Text style={[styles.crisisBtnArrow, { color: '#B71C1C' }]}>→</Text>
        </TouchableOpacity>

        <View style={[styles.divider, { borderColor: colors.border }]} />

        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          Or tell someone we trust
        </Text>
        <Text style={[styles.trustSub, { color: colors.textLight }]}>
          A parent, a teacher, a counselor, a friend — whoever feels safest.
          We do not have to explain everything. Just: "I am not okay right now."
        </Text>

        <View style={[styles.scriptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.scriptTitle, { color: colors.text }]}>What to say:</Text>
          <Text style={[styles.scriptText, { color: colors.textLight }]}>
            "I am not okay right now and I need help."{'\n\n'}
            That is enough. We do not need more words than that.
          </Text>
        </View>

        <View style={[styles.noteCard, { backgroundColor: '#E8EAF6', borderColor: '#9FA8DA' }]}>
          <Text style={styles.noteText}>
            💙 Asking for help when the pain is this big is not weakness.
            It is the single most effective thing we can do right now.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 48 },

  back:     { marginBottom: 16 },
  backText: { fontSize: 15, fontWeight: '600' },

  heroEmoji: { fontSize: 48, textAlign: 'center', marginBottom: 10 },
  title:     { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  sub:       { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },

  crisisBtn:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 2, borderColor: '#1A237E', backgroundColor: '#E8EAF6', padding: 16, marginBottom: 12 },
  crisisBtnEmoji: { fontSize: 28 },
  crisisBtnTitle: { fontSize: 16, fontWeight: '900', color: '#1A237E', marginBottom: 2 },
  crisisBtnSub:   { fontSize: 12, color: '#5C6BC0' },
  crisisBtnArrow: { fontSize: 20, color: '#1A237E', fontWeight: '700' },

  divider:      { borderTopWidth: 1, marginVertical: 24 },
  sectionLabel: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  trustSub:     { fontSize: 14, lineHeight: 22, marginBottom: 16 },

  scriptCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 16 },
  scriptTitle: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
  scriptText:  { fontSize: 15, lineHeight: 26, fontStyle: 'italic' },

  noteCard: { borderRadius: 12, borderWidth: 1, padding: 14 },
  noteText:  { fontSize: 13, lineHeight: 22, color: '#3949AB' },
});
