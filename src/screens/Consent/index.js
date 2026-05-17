import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store';
import { useColors } from '../../theme';
import SpeakButton from '../../components/SpeakButton';

const STUDY_INFO = {
  title: 'NeuroFocus: Executive Function Training Study',
  researcher: 'Student Researcher, Westview High School, Portland OR',
  mentor: 'Faculty Supervisor / OHSU Mentor (contact your researcher)',
  duration: '12 weeks',
  sessions: '3–5 sessions per week, 15–20 min each',
};

export default function Consent() {
  const colors = useColors();
  const { setConsent } = useStore(s => ({ setConsent: s.setConsent }));
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  function handleAgree() {
    Alert.alert(
      'Confirm Consent',
      'By tapping Confirm, you agree to participate in this study and to have your session data automatically sent to the researcher.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm', onPress: () => {
            setConsent(true);
          }
        },
      ]
    );
  }

  function handleDecline() {
    Alert.alert(
      'Are you sure?',
      'Without consent, you cannot participate in the study. You will not be able to use the app.',
      [
        { text: 'Go back', style: 'cancel' },
        {
          text: 'Decline', style: 'destructive', onPress: () => {
            setConsent(false);
          }
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 40) {
            setScrolledToBottom(true);
          }
        }}
        scrollEventThrottle={100}
      >
        <Text style={[styles.tag, { color: colors.primary }]}>RESEARCH PARTICIPANT ASSENT</Text>
        <Text style={[styles.title, { color: colors.text }]}>Before You Begin</Text>
        <Text style={[styles.sub, { color: colors.textLight }]}>
          Please read this carefully. Scroll to the bottom to continue.
        </Text>
        <SpeakButton
          text="This is your research participation consent form. Study title: NeuroFocus Executive Function Training Study. Researcher: Student researcher at Westview High School Portland Oregon. This study tests whether the NeuroFocus app can improve executive function skills including focus, memory, time awareness, and emotional regulation in neurodivergent teens over 12 weeks. You will be asked to use the app 3 to 5 times per week for 12 weeks, complete short training exercises of 15 to 20 minutes each session, answer brief check-in questions weekly, and complete an assessment at Week 0, Week 6, and Week 12. Your session data including performance scores, mood check-ins, and routine logs will be automatically and securely sent to the researcher after each session. Your real name is never stored — only your participant code. Your participation is completely voluntary. You can stop at any time without penalty. To agree, scroll to the bottom and tap I Agree to Participate."
          style={{ marginBottom: 16 }}
        />

        <Block title="Study Title" color={colors}>
          {STUDY_INFO.title}
        </Block>

        <Block title="Who Is Running This Study?" color={colors}>
          {STUDY_INFO.researcher}{'\n'}{STUDY_INFO.mentor}
        </Block>

        <Block title="What Is This Study About?" color={colors}>
          This study tests whether a mobile app called NeuroFocus can improve executive function skills — focus, memory, time awareness, and emotional regulation — in neurodivergent teens over 12 weeks.
        </Block>

        <Block title="What Will I Be Asked to Do?" color={colors}>
          • Use the NeuroFocus app 3–5 times per week for 12 weeks{'\n'}
          • Complete short training exercises (15–20 min per session){'\n'}
          • Answer brief check-in questions weekly{'\n'}
          • Complete an assessment at Week 0, Week 6, and Week 12
        </Block>

        <Block title="What Data Is Collected?" color={colors}>
          • Session performance (accuracy, response times, scores){'\n'}
          • Mood check-in ratings (pre and post session){'\n'}
          • Self-reported executive function ratings{'\n'}
          • Daily routine completion logs{'\n'}
          • Weekly check-in responses{'\n\n'}
          Your real name is NEVER stored. Only your participant code is linked to your data.
        </Block>

        <Block title="How Is My Data Shared?" color={colors} highlight>
          Your session data is automatically and securely sent to the researcher's protected account after each session. You do not need to do anything — this happens in the background. Data is identified only by your participant code, never your name.
        </Block>

        <Block title="Risks and Benefits" color={colors}>
          <Text style={{ color: colors.text }}>
            <Text style={{ fontWeight: '800' }}>Risks:</Text> Minimal. The app involves no medical procedures. Some exercises may feel mentally tiring.{'\n\n'}
            <Text style={{ fontWeight: '800' }}>Benefits:</Text> You may develop stronger focus, memory, and time management skills. You will receive the full app for free throughout the study.
          </Text>
        </Block>

        <Block title="Is My Participation Voluntary?" color={colors}>
          Yes. You can stop at any time for any reason, without penalty. Just tell the researcher you want to withdraw. Your data collected up to that point may still be used in the study unless you request deletion.
        </Block>

        <Block title="Who to Contact" color={colors}>
          Questions about the study: contact your researcher at maymunariktakabir@gmail.com{'\n\n'}
          Note: A separate parental consent form must be signed by your parent or guardian before you participate. If your parent has not signed, please ask the researcher for the form.
        </Block>

        <View style={[styles.ackBox, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          <Text style={[styles.ackText, { color: colors.text }]}>
            By tapping <Text style={{ fontWeight: '800' }}>"I Agree"</Text> below, I confirm that:{'\n\n'}
            • I am at least 13 years old{'\n'}
            • I have read and understood this information{'\n'}
            • My parent/guardian has signed the parental consent form{'\n'}
            • I agree to participate and to have my session data sent to the researcher
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {!scrolledToBottom && (
          <Text style={[styles.scrollHint, { color: colors.textLight }]}>↓ Scroll to read all before agreeing</Text>
        )}
        <TouchableOpacity
          style={[styles.agreeBtn, { backgroundColor: scrolledToBottom ? colors.primary : '#CCC' }]}
          onPress={scrolledToBottom ? handleAgree : null}
          activeOpacity={scrolledToBottom ? 0.8 : 1}
        >
          <Text style={styles.agreeBtnText}>I Agree to Participate</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline}>
          <Text style={[styles.declineBtnText, { color: colors.textLight }]}>I Do Not Agree</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function Block({ title, children, color, highlight }) {
  const isNode = React.isValidElement(children);
  return (
    <View style={[
      styles.block,
      { backgroundColor: highlight ? color.primaryLight : color.surface, borderColor: highlight ? color.primary : color.border }
    ]}>
      <Text style={[styles.blockTitle, { color: color.primary }]}>{title}</Text>
      {isNode
        ? children
        : <Text style={[styles.blockText, { color: color.text }]}>{children}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 16 },

  tag:   { fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 4 },
  sub:   { fontSize: 14, marginBottom: 20, lineHeight: 20 },

  block:      { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 12 },
  blockTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' },
  blockText:  { fontSize: 14, lineHeight: 22 },

  ackBox:  { borderRadius: 14, borderWidth: 2, padding: 16, marginBottom: 8 },
  ackText: { fontSize: 14, lineHeight: 24 },

  footer:       { padding: 16, paddingBottom: 8, borderTopWidth: 1 },
  scrollHint:   { fontSize: 12, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },
  agreeBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 10 },
  agreeBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  declineBtn:   { alignItems: 'center', padding: 10 },
  declineBtnText:{ fontSize: 14 },
});
