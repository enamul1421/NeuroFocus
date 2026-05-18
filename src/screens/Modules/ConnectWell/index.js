import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { useColors } from '../../../theme';
import SessionProgress from '../../../components/SessionProgress';
import SpeakButton from '../../../components/SpeakButton';

const PHASE = {
  SCENARIO: 'scenario',
  RESPOND:  'respond',
  OUTCOME:  'outcome',
  REFLECT:  'reflect',
  DONE:     'done',
};

const ACCENT       = '#1B5E20';
const ACCENT_LIGHT = '#C8E6C9';

const SCENARIOS = [
  {
    id: 'text',
    situation: "We texted our friend two hours ago. No reply — and we can see they were online.",
    person: 'our friend',
    perspectives: [
      { type: 'hostile', label: "They are ignoring us on purpose" },
      { type: 'neutral',  label: "They got distracted and forgot" },
      { type: 'benign',   label: "Something came up for them" },
      { type: 'unsure',   label: "No idea — could be anything" },
    ],
    responses: [
      { type: 'reactive',  label: "Send a sharp follow-up message", desc: "Gets the frustration out" },
      { type: 'assertive', label: "Wait, then check in calmly", desc: "Gentle and curious — no assumptions" },
      { type: 'withdraw',  label: "Go quiet and pull back", desc: "Avoids conflict but leaves it open" },
    ],
    outcomes: {
      reactive:  "We send something sharp. They feel attacked and get defensive. Now there are two problems instead of one.",
      assertive: "We wait. Later: 'Hey, everything okay?' They explain they were dealing with something. Situation resolved.",
      withdraw:  "We pull back without saying why. The friendship cools. They never know anything was wrong.",
    },
    repair: "We could message: 'Sorry for the sharp text — I was in my head about it. All good?'",
  },
  {
    id: 'teacher',
    situation: "The teacher calls on us in class when our hand was not up. We do not know the answer. A few kids snicker.",
    person: 'our teacher',
    perspectives: [
      { type: 'hostile', label: "They wanted to put us on the spot" },
      { type: 'neutral',  label: "They called randomly — no target" },
      { type: 'benign',   label: "They thought we might know it" },
      { type: 'unsure',   label: "Hard to know their intention" },
    ],
    responses: [
      { type: 'reactive',  label: "Say something sarcastic out loud", desc: "Gets the anger out" },
      { type: 'assertive', label: "Say 'I am not sure' and move on", desc: "Brief, calm, no drama" },
      { type: 'withdraw',  label: "Go silent and shut down for the class", desc: "Protects in the moment" },
    ],
    outcomes: {
      reactive:  "The sarcasm lands badly. Teacher steps in. We miss class and now have a bigger problem than a wrong answer.",
      assertive: "'I am not sure.' Two words. The moment ends in seconds. No one remembers it by next period.",
      withdraw:  "We shut down for the rest of class. The lesson is lost, mood is wrecked — over something that lasted 10 seconds.",
    },
    repair: null,
  },
  {
    id: 'laughed',
    situation: "We trip in the hallway. A group nearby bursts out laughing.",
    person: 'the group',
    perspectives: [
      { type: 'hostile', label: "They were laughing at us specifically" },
      { type: 'neutral',  label: "It was a reflex — people laugh at unexpected things" },
      { type: 'benign',   label: "They laugh at everything — it was not personal" },
      { type: 'unsure',   label: "Cannot know without more context" },
    ],
    responses: [
      { type: 'reactive',  label: "Yell or say something aggressive", desc: "Stands up to it — fast" },
      { type: 'assertive', label: "Laugh it off and keep walking", desc: "Defuses it immediately" },
      { type: 'withdraw',  label: "Rush away and avoid that area all day", desc: "Gets us out of there" },
    ],
    outcomes: {
      reactive:  "The situation escalates. What was a 5-second moment becomes a story people tell all day.",
      assertive: "We laugh with it. The moment deflates instantly. A few of them actually look impressed.",
      withdraw:  "We avoid that hallway all day. Our brain replays it on loop. They probably forgot within a minute.",
    },
    repair: null,
  },
  {
    id: 'project',
    situation: "The group project was submitted. Our section is completely missing. Nobody said anything.",
    person: 'our project partner',
    perspectives: [
      { type: 'hostile', label: "They cut our section out on purpose" },
      { type: 'neutral',  label: "It was a mistake — they probably did not notice" },
      { type: 'benign',   label: "There was a technical mix-up with the file" },
      { type: 'unsure',   label: "Not enough information to know" },
    ],
    responses: [
      { type: 'reactive',  label: "Confront them angrily in front of the class", desc: "Makes the wrong public right away" },
      { type: 'assertive', label: "Pull them aside and ask what happened", desc: "Gets answers without escalating" },
      { type: 'withdraw',  label: "Say nothing and take the lower grade", desc: "Keeps the peace" },
    ],
    outcomes: {
      reactive:  "Public confrontation backfires. The teacher sees us as the problem. Grade still suffers.",
      assertive: "We pull them aside. Turns out it was a file version error. Teacher is informed, section gets added. Grade saved.",
      withdraw:  "We take the hit silently. We feel resentful for weeks. They never even knew there was a problem.",
    },
    repair: "Even if we reacted: 'Sorry for how I handled that. Can we sort out the project now?'",
  },
  {
    id: 'groupchat',
    situation: "We notice our friend group made a new chat — and we are not in it.",
    person: 'our friend group',
    perspectives: [
      { type: 'hostile', label: "They left us out deliberately" },
      { type: 'neutral',  label: "It might be for a specific reason — a class, a surprise" },
      { type: 'benign',   label: "Probably an oversight — nobody thought about it" },
      { type: 'unsure',   label: "Hard to know without asking someone" },
    ],
    responses: [
      { type: 'reactive',  label: "Post something passive-aggressive about being excluded", desc: "Makes the point publicly" },
      { type: 'assertive', label: "Ask one friend directly and calmly", desc: "Gets the real answer fast" },
      { type: 'withdraw',  label: "Say nothing and start distancing ourselves", desc: "Avoids confrontation" },
    ],
    outcomes: {
      reactive:  "The passive-aggressive post creates drama. Now it is awkward with the whole group.",
      assertive: "We ask one friend. Turns out it is for planning our own surprise. Crisis completely avoided.",
      withdraw:  "We pull away silently. The friendship cools without anyone knowing why. We lose something real.",
    },
    repair: "If we posted something sharp: 'Sorry — I assumed the worst and made it awkward. That is on me.'",
  },
  {
    id: 'corrected',
    situation: "We share an answer in class. Someone immediately says 'that is wrong' — loud enough for the room to hear.",
    person: 'the classmate',
    perspectives: [
      { type: 'hostile', label: "They wanted to make us look bad" },
      { type: 'neutral',  label: "They were focused on the answer, not us" },
      { type: 'benign',   label: "They correct everyone — it is not personal" },
      { type: 'unsure',   label: "Could read it either way" },
    ],
    responses: [
      { type: 'reactive',  label: "Snap back at them", desc: "Defends our dignity" },
      { type: 'assertive', label: "Say 'fair enough' and move on", desc: "Closes the moment, keeps confidence" },
      { type: 'withdraw',  label: "Go quiet — stop contributing for the rest of class", desc: "Avoids any more exposure" },
    ],
    outcomes: {
      reactive:  "Classroom tension rises. Teacher steps in. We are now embarrassed in a different, worse way.",
      assertive: "'Fair enough.' Two words. The moment ends. Our confidence stays completely intact.",
      withdraw:  "We stop participating. The class loses our voice. One comment shuts us down for the whole day.",
    },
    repair: null,
  },
  {
    id: 'cancelled',
    situation: "Plans we were really looking forward to get cancelled last minute. The reason given is vague.",
    person: 'the person who cancelled',
    perspectives: [
      { type: 'hostile', label: "They did not want to come and made up an excuse" },
      { type: 'neutral',  label: "Something genuinely came up for them" },
      { type: 'benign',   label: "They feel bad about it too" },
      { type: 'unsure',   label: "The vague reason makes it hard to tell" },
    ],
    responses: [
      { type: 'reactive',  label: "Send an angry message about it", desc: "Makes the disappointment known" },
      { type: 'assertive', label: "Say 'no problem — want to reschedule?' even if disappointed", desc: "Keeps the relationship open" },
      { type: 'withdraw',  label: "Say nothing and decide not to make plans with them again", desc: "Protects from future letdowns" },
    ],
    outcomes: {
      reactive:  "They get defensive. We get angrier. The friendship takes real damage over something that may have been unavoidable.",
      assertive: "We feel the disappointment privately, respond calmly. They reschedule. Friendship stays strong.",
      withdraw:  "We silently write them off. They never know why. We lose the friendship and they never understand what happened.",
    },
    repair: "If we sent something sharp: 'Sorry — I was disappointed and it came out wrong. Want to reschedule?'",
  },
  {
    id: 'waved',
    situation: "We spot a friend across the cafeteria and wave. They glance our way — then sit somewhere else.",
    person: 'our friend',
    perspectives: [
      { type: 'hostile', label: "They saw us and deliberately avoided us" },
      { type: 'neutral',  label: "They probably did not register it was us" },
      { type: 'benign',   label: "They already had a plan with someone else" },
      { type: 'unsure',   label: "Genuinely hard to know from a wave" },
    ],
    responses: [
      { type: 'reactive',  label: "Go over and demand to know why they ignored us", desc: "Confronts it immediately" },
      { type: 'assertive', label: "Let it go — bring it up casually if it keeps happening", desc: "Low-stakes, keeps perspective" },
      { type: 'withdraw',  label: "Eat alone and feel rejected for the rest of the day", desc: "Avoids any awkwardness" },
    ],
    outcomes: {
      reactive:  "We confront them mid-lunch. They are confused — they genuinely did not see the wave. Now it is awkward.",
      assertive: "We let it pass. Later they say 'sorry I did not see you earlier.' A complete non-issue.",
      withdraw:  "We spiral. Lunch is ruined. The rest of the day is colored by one moment that probably meant nothing.",
    },
    repair: null,
  },
];

const SELF_RESPECT = [
  { value: 1, emoji: '😔', label: 'Ashamed' },
  { value: 2, emoji: '😕', label: 'Unsure' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Proud' },
  { value: 5, emoji: '💪', label: 'Strong' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ConnectWell({ navigation }) {
  const colors = useColors();
  const { addConnectWellSession } = useStore(s => ({
    addConnectWellSession: s.addConnectWellSession,
  }));

  const scenario             = useMemo(() => SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)], []);
  const shuffledPerspectives = useMemo(() => shuffle(scenario.perspectives), [scenario]);
  const shuffledResponses    = useMemo(() => shuffle(scenario.responses), [scenario]);

  const [phase,            setPhase]           = useState(PHASE.SCENARIO);
  const [perspectiveType,  setPerspectiveType]  = useState(null);
  const [responseType,     setResponseType]     = useState(null);
  const [selfRespect,      setSelfRespect]      = useState(null);
  const [repairConsidered, setRepairConsidered] = useState(false);

  function finish() {
    addConnectWellSession({
      date: new Date().toISOString(),
      scenarioId: scenario.id,
      perspectiveType,
      responseType,
      selfRespect,
      repairConsidered,
    });
    setPhase(PHASE.DONE);
  }

  const outcome   = responseType ? scenario.outcomes[responseType] : null;
  const isReactive   = responseType === 'reactive';
  const isAssertive  = responseType === 'assertive';

  // ── SCENARIO + PERSPECTIVE ───────────────────────────────────────────────────
  if (phase === PHASE.SCENARIO) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={0} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>SCENARIO</Text>
          <SpeakButton text="Read the situation below. Think about how the other person might have been feeling, then choose how to respond. Each scenario trains real social awareness." style={{ marginBottom: 8 }} />

          <View style={[styles.scenarioCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '50' }]}>
            <Text style={styles.scenarioText}>{scenario.situation}</Text>
          </View>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            What do we think {scenario.person} was feeling?
          </Text>

          <View style={styles.optionList}>
            {shuffledPerspectives.map(p => (
              <TouchableOpacity
                key={p.type}
                style={[
                  styles.optionBtn,
                  { borderColor: perspectiveType === p.type ? ACCENT : colors.border,
                    backgroundColor: perspectiveType === p.type ? ACCENT : colors.surface },
                ]}
                onPress={() => setPerspectiveType(p.type)}
              >
                <Text style={[styles.optionText, { color: perspectiveType === p.type ? '#fff' : colors.text }]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {perspectiveType === 'hostile' && (
            <View style={styles.nudgeCard}>
              <Text style={styles.nudgeText}>
                That might be true — or there might be another explanation. We will find out as we go.
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: perspectiveType ? ACCENT : '#CCC' }]}
            onPress={perspectiveType ? () => setPhase(PHASE.RESPOND) : null}
          >
            <Text style={styles.nextBtnText}>How do we respond? →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── RESPOND ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.RESPOND) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={1} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>RESPOND</Text>
          <Text style={[styles.recapText, { color: colors.textLight }]}>{scenario.situation}</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>How do we want to handle this?</Text>

          <View style={styles.optionList}>
            {shuffledResponses.map(r => (
              <TouchableOpacity
                key={r.type}
                style={[
                  styles.optionBtn,
                  { borderColor: responseType === r.type ? ACCENT : colors.border,
                    backgroundColor: responseType === r.type ? ACCENT : colors.surface },
                ]}
                onPress={() => setResponseType(r.type)}
              >
                <Text style={[styles.optionText, { color: responseType === r.type ? '#fff' : colors.text }]}>
                  {r.label}
                </Text>
                <Text style={[styles.optionDesc, { color: responseType === r.type ? ACCENT_LIGHT : colors.textLight }]}>
                  {r.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: responseType ? ACCENT : '#CCC' }]}
            onPress={responseType ? () => setPhase(PHASE.OUTCOME) : null}
          >
            <Text style={styles.nextBtnText}>See what happens →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── OUTCOME ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.OUTCOME) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={2} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>OUTCOME</Text>

          <View style={[
            styles.outcomeCard,
            { backgroundColor: isReactive ? '#FFEBEE' : isAssertive ? '#E8F5E9' : '#F5F5F5',
              borderColor:     isReactive ? '#EF9A9A' : isAssertive ? '#A5D6A7' : '#DDD' },
          ]}>
            <Text style={styles.outcomeEmoji}>
              {isReactive ? '⚡' : isAssertive ? '✅' : '⏸'}
            </Text>
            <Text style={[
              styles.outcomeText,
              { color: isReactive ? '#B71C1C' : isAssertive ? '#1B5E20' : '#555' },
            ]}>
              {outcome}
            </Text>
          </View>

          {isReactive && scenario.repair && (
            <View style={[styles.repairCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.repairTitle, { color: colors.text }]}>🔧 Repair option</Text>
              <Text style={[styles.repairText, { color: colors.textLight }]}>{scenario.repair}</Text>
              <TouchableOpacity
                style={[styles.repairBtn, { backgroundColor: repairConsidered ? ACCENT : colors.border }]}
                onPress={() => setRepairConsidered(true)}
              >
                <Text style={[styles.repairBtnText, { color: repairConsidered ? '#fff' : colors.text }]}>
                  {repairConsidered ? '✓ We will consider this' : 'We will consider this'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: ACCENT }]}
            onPress={() => setPhase(PHASE.REFLECT)}
          >
            <Text style={styles.nextBtnText}>Reflect →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── REFLECT ──────────────────────────────────────────────────────────────────
  if (phase === PHASE.REFLECT) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SessionProgress current={3} total={4} color={ACCENT} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.phaseTag, { color: ACCENT }]}>REFLECT</Text>

          <Text style={[styles.sectionLabel, { color: colors.text }]}>
            How do we feel about ourselves for choosing that response?
          </Text>
          <View style={styles.srRow}>
            {SELF_RESPECT.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.srBtn,
                  { borderColor: selfRespect === s.value ? ACCENT : colors.border,
                    backgroundColor: selfRespect === s.value ? ACCENT : colors.surface },
                ]}
                onPress={() => setSelfRespect(s.value)}
              >
                <Text style={styles.srEmoji}>{s.emoji}</Text>
                <Text style={[styles.srLabel, { color: selfRespect === s.value ? '#fff' : colors.textLight }]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.fastCard, { backgroundColor: ACCENT_LIGHT, borderColor: ACCENT + '40' }]}>
            <Text style={[styles.fastTitle, { color: ACCENT }]}>FAST — self-respect in action</Text>
            <Text style={[styles.fastText, { color: '#1B5E20' }]}>
              <Text style={{ fontWeight: '800' }}>F</Text>air to ourselves and others{'   '}
              <Text style={{ fontWeight: '800' }}>A</Text>pologise when it matters{'   '}
              <Text style={{ fontWeight: '800' }}>S</Text>tick to our values{'   '}
              <Text style={{ fontWeight: '800' }}>T</Text>ruthful
            </Text>
            <Text style={[styles.fastSub, { color: '#2E7D32' }]}>
              {isAssertive
                ? 'We just used all four. That is what self-respect looks like in action.'
                : responseType === 'withdraw'
                ? 'Withdrawing protects us short-term. FAST asks: was it fair to us? To them?'
                : 'The reactive path is understandable. The repair option is FAST in practice.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: selfRespect ? ACCENT : '#CCC' }]}
            onPress={selfRespect ? finish : null}
          >
            <Text style={styles.nextBtnText}>Save  +60 XP →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (phase === PHASE.DONE) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={styles.doneEmoji}>🤝</Text>
          <Text style={[styles.doneTitle, { color: colors.text }]}>We practiced it.</Text>
          <Text style={[styles.doneSub, { color: colors.textLight }]}>
            {isAssertive
              ? 'The assertive path is a muscle. Every time we choose it — even in practice — it gets easier when it is real.'
              : 'Seeing the outcome still matters. Our brain files that. Next time, we have more to work with.'}
          </Text>

          <View style={[styles.doneStat, { backgroundColor: ACCENT_LIGHT }]}>
            <Text style={[styles.doneStatText, { color: ACCENT }]}>
              {perspectiveType === 'hostile'
                ? '💡 We read it as hostile. Worth asking: could there be another explanation next time?'
                : perspectiveType === 'benign' || perspectiveType === 'neutral'
                ? '💡 We gave them the benefit of the doubt. That is the foundation of strong relationships.'
                : '💡 We stayed open to uncertainty. That is the most accurate read most of the time.'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: ACCENT, width: '100%' }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.nextBtnText}>Back to app →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: 24, paddingBottom: 40 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  phaseTag:     { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 14 },
  scenarioCard: { borderRadius: 16, borderWidth: 1.5, padding: 18, marginBottom: 24 },
  scenarioText: { fontSize: 16, lineHeight: 26, fontWeight: '600', color: '#1B5E20' },
  recapText:    { fontSize: 13, lineHeight: 20, marginBottom: 20 },

  sectionLabel: { fontSize: 16, fontWeight: '800', marginBottom: 14 },

  optionList: { gap: 10, marginBottom: 20 },
  optionBtn:  { borderRadius: 12, borderWidth: 1.5, padding: 14 },
  optionText: { fontSize: 15, fontWeight: '700' },
  optionDesc: { fontSize: 12, marginTop: 3 },

  nudgeCard: { borderRadius: 10, borderWidth: 1, borderColor: '#FFD54F', backgroundColor: '#FFF8E1', padding: 12, marginBottom: 16 },
  nudgeText: { fontSize: 13, color: '#795548', fontStyle: 'italic' },

  nextBtn:     { borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 4 },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  outcomeCard:  { borderRadius: 16, borderWidth: 1.5, padding: 18, marginBottom: 20, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  outcomeEmoji: { fontSize: 28, marginTop: 2 },
  outcomeText:  { flex: 1, fontSize: 15, lineHeight: 24, fontWeight: '600' },

  repairCard:    { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 20 },
  repairTitle:   { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  repairText:    { fontSize: 14, lineHeight: 22, marginBottom: 14, fontStyle: 'italic' },
  repairBtn:     { borderRadius: 10, padding: 12, alignItems: 'center' },
  repairBtnText: { fontSize: 14, fontWeight: '700' },

  srRow:   { flexDirection: 'row', gap: 6, marginBottom: 24 },
  srBtn:   { flex: 1, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', paddingVertical: 10 },
  srEmoji: { fontSize: 22, marginBottom: 4 },
  srLabel: { fontSize: 10, fontWeight: '700' },

  fastCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 24 },
  fastTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  fastText:  { fontSize: 13, lineHeight: 24, marginBottom: 8 },
  fastSub:   { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  doneEmoji:    { fontSize: 72, marginBottom: 16 },
  doneTitle:    { fontSize: 28, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  doneSub:      { fontSize: 15, lineHeight: 24, textAlign: 'center', marginBottom: 24 },
  doneStat:     { borderRadius: 14, padding: 16, marginBottom: 32, width: '100%' },
  doneStatText: { fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
});
