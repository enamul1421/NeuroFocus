import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useColors } from '../../theme';
import TimerRing from '../../components/TimerRing';
import SpeakButton from '../../components/SpeakButton';

// Generate a sine-wave WAV as a data URI — no external file needed
function makeBeepURI(freq = 440, ms = 80, vol = 0.5) {
  const sr = 22050;
  const n  = Math.floor(sr * ms / 1000);
  const buf = new ArrayBuffer(44 + n * 2);
  const v   = new DataView(buf);
  const wr  = (o, s) => s.split('').forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  wr(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); wr(8, 'WAVE');
  wr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  wr(36, 'data'); v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) {
    // Sharp attack (5 samples), exponential decay — sounds like a clock tick, not a heartbeat
    const attack = Math.min(i / 5, 1);
    const decay  = Math.exp(-i / (n * 0.25));
    const env    = attack * decay;
    // Mix two harmonics for a "ding" quality rather than a pure sine pulse
    const wave = 0.7 * Math.sin(2 * Math.PI * freq * i / sr)
               + 0.3 * Math.sin(2 * Math.PI * freq * 2 * i / sr);
    v.setInt16(44 + i * 2, Math.round(wave * env * vol * 32767), true);
  }
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:audio/wav;base64,${btoa(bin)}`;
}

const TICK_URI  = makeBeepURI(1100, 25, 0.30);  // short high-pitch tick every 5s
const BEEP_URI  = makeBeepURI(880,  40, 0.55);  // crisp warning ding every 1s
const ALERT_URI = makeBeepURI(1400, 30, 0.80);  // sharp alert every 1s

const { width: SW, height: SH } = Dimensions.get('window');

const ACCENT  = '#00695C';
const PRESETS = [5, 10, 15, 20, 30, 45, 60];

const RING_SIZE   = 260;
const RING_STROKE = 14;
const RING_R      = (RING_SIZE - RING_STROKE) / 2;
const FUSE_LEN    = 70;
const BOMB_SCREEN_X = SW / 2 - 16;
const BOMB_SCREEN_Y = SH / 2 - RING_R + FUSE_LEN;

const SHARD_COUNT  = 55;
const SHARD_COLORS = ['#B71C1C', '#E53935', '#EF9A9A', '#fff', '#FF1744', '#1a0000', '#FFCDD2'];

// Pre-generate shard config once at module level (deterministic random)
const SHARDS = Array.from({ length: SHARD_COUNT }, (_, i) => {
  const seed  = (i * 137.508) % 360;
  const angle = (seed * Math.PI) / 180;
  const dist  = 100 + ((i * 53) % 250);
  return {
    tx:    Math.cos(angle) * dist,
    ty:    Math.sin(angle) * dist,
    rot:   ((i * 73) % 720) - 360,
    w:     6  + (i * 7)  % 22,
    h:     3  + (i * 11) % 14,
    color: SHARD_COLORS[i % SHARD_COLORS.length],
    delay: (i * 13) % 120,
  };
});

export default function TransitionTimer({ navigation }) {
  const colors = useColors();

  const [duration,  setDuration] = useState(null);
  const [remaining, setRemaining]= useState(0);
  const [running,   setRunning]  = useState(false);
  const [done,      setDone]     = useState(false);
  const [exploding,     setExploding]    = useState(false);
  const [explodingDone, setExplodingDone]= useState(false);
  const [soundOn,       setSoundOn]      = useState(true);
  const [customMins,    setCustomMins]   = useState('');

  const timerRef  = useRef(null);
  const notifRef  = useRef(null);
  const tickRef   = useRef(null);
  const beepRef   = useRef(null);
  const alertRef  = useRef(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true }).catch(() => {});
    async function loadSounds() {
      const [t, b, a] = await Promise.all([
        Audio.Sound.createAsync({ uri: TICK_URI }),
        Audio.Sound.createAsync({ uri: BEEP_URI }),
        Audio.Sound.createAsync({ uri: ALERT_URI }),
      ]).catch(() => [null, null, null]);
      if (t) tickRef.current  = t.sound;
      if (b) beepRef.current  = b.sound;
      if (a) alertRef.current = a.sound;
    }
    loadSounds();
    return () => {
      tickRef.current?.unloadAsync();
      beepRef.current?.unloadAsync();
      alertRef.current?.unloadAsync();
    };
  }, []);

  const shardAnims = useRef(
    SHARDS.map(() => ({
      progress: new Animated.Value(0),
      opacity:  new Animated.Value(0),
    }))
  ).current;

  useEffect(() => () => {
    clearInterval(timerRef.current);
    if (notifRef.current) Notifications.cancelScheduledNotificationAsync(notifRef.current);
  }, []);

  function triggerExplosion() {
    setExploding(true);
    shardAnims.forEach(a => { a.progress.setValue(0); a.opacity.setValue(1); });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    Animated.parallel(
      shardAnims.map((a, i) => Animated.parallel([
        Animated.timing(a.progress, {
          toValue: 1, duration: 1800 + SHARDS[i].delay, useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(900),
          Animated.timing(a.opacity, { toValue: 0, duration: 1000, useNativeDriver: true }),
        ]),
      ]))
    ).start(() => setExplodingDone(true));
  }

  async function start(mins) {
    setDuration(mins);
    setDone(false);
    setRunning(true);

    const warnSecs = mins * 60 - 120;
    if (warnSecs > 5) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏱ 2 minutes left',
          body:  'Start wrapping up — transition coming.',
          sound: true,
        },
        trigger: { seconds: warnSecs },
      }).catch(() => null);
      notifRef.current = id;
    }

    let secs = mins * 60;
    setRemaining(secs);
    timerRef.current = setInterval(() => {
      secs -= 1;
      setRemaining(secs);

      if (secs <= 10) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
        if (soundOn) alertRef.current?.replayAsync();
      } else if (secs <= 120) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (soundOn) beepRef.current?.replayAsync();
      } else if (secs % 5 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (soundOn) tickRef.current?.replayAsync();
      }

      if (secs <= 0) {
        clearInterval(timerRef.current);
        setRunning(false);
        triggerExplosion();
      }
    }, 1000);
  }

  function cancel() {
    clearInterval(timerRef.current);
    if (notifRef.current) Notifications.cancelScheduledNotificationAsync(notifRef.current).catch(() => {});
    setRunning(false);
    setExploding(false);
    setExplodingDone(false);
    setDone(false);
    setDuration(null);
  }

  const mins       = Math.floor(remaining / 60);
  const secs       = remaining % 60;
  const isWarning  = remaining > 0 && remaining <= 120;
  const isCritical = remaining > 0 && remaining <= 10;

  // ── EXPLOSION ─────────────────────────────────────────────────────────────────
  if (exploding) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {shardAnims.map((a, i) => {
          const s = SHARDS[i];
          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                left:   BOMB_SCREEN_X - s.w / 2,
                top:    BOMB_SCREEN_Y - s.h / 2,
                width:  s.w,
                height: s.h,
                backgroundColor: s.color,
                opacity: a.opacity,
                transform: [
                  { translateX: a.progress.interpolate({ inputRange: [0,1], outputRange: [0, s.tx] }) },
                  { translateY: a.progress.interpolate({ inputRange: [0,1], outputRange: [0, s.ty] }) },
                  { rotate:     a.progress.interpolate({ inputRange: [0,1], outputRange: ['0deg', `${s.rot}deg`] }) },
                ],
              }}
            />
          );
        })}
        {explodingDone && (
          <View style={{ position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center' }}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: ACCENT, width: 200 }]}
              onPress={() => { setExploding(false); setExplodingDone(false); setDone(true); }}
            >
              <Text style={styles.primaryBtnText}>Done →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.center}>
          <Text style={{ fontSize: 56, marginBottom: 16 }}>🔔</Text>
          <Text style={[styles.title, { color: colors.text }]}>Time to switch.</Text>
          <Text style={[styles.sub, { color: colors.textLight }]}>
            Take one breath. Then move to the next thing.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: ACCENT, width: '100%', marginTop: 32 }]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryBtnText}>Done →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, width: '100%' }]}
            onPress={() => { setDone(false); setDuration(null); }}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.textLight }]}>Set another timer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── RUNNING — Bomb Ring ───────────────────────────────────────────────────────
  if (running) {
    const total    = duration * 60;
    const progress = Math.max(0, Math.min(1, remaining / total));
    const timeStr  = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    const ringColor = isCritical ? '#FF3D00' : isWarning ? '#FFD600' : '#00E676';
    const sublabel  = isCritical ? 'almost there...' : isWarning ? '⚡ wrapping up' : 'remaining';

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
        <View style={styles.center}>
          <TimerRing
            progress={progress}
            color={ringColor}
            trackColor="rgba(255,255,255,0.1)"
            tailIcon="💣"
            fuseLength={FUSE_LEN}
            fuseColor={isCritical ? '#FF3D00' : '#FFD54F'}
            label={timeStr}
            sublabel={sublabel}
            labelColor="#fff"
            size={RING_SIZE}
            showSpark
          />

          {isWarning && !isCritical && (
            <View style={[styles.warnBadge, { backgroundColor: '#FF6D00' }]}>
              <Text style={styles.warnBadgeText}>⚡ START WRAPPING UP</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 24, marginTop: 40 }}>
            <TouchableOpacity onPress={() => setSoundOn(v => !v)} style={styles.cancelBtn}>
              <Text style={styles.cancelBtnText}>{soundOn ? '🔔 Sound on' : '🔕 Sound off'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── SETUP ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>⏱</Text>
        <Text style={[styles.title, { color: colors.text }]}>Transition Timer</Text>
        <Text style={[styles.sub, { color: colors.textLight }]}>
          How long until we switch? We will warn at 2 minutes.
        </Text>
        <SpeakButton text="The Transition Timer helps us know when it is time to switch tasks. We get a warning at 2 minutes so our brain can start wrapping up instead of being cut off suddenly. Pick how long we have." style={{ marginBottom: 16 }} />

        <View style={styles.presetGrid}>
          {PRESETS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.presetBtn, { backgroundColor: ACCENT }]}
              onPress={() => start(m)}
            >
              <Text style={styles.presetNum}>{m}</Text>
              <Text style={styles.presetLabel}>min</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.customRow}>
          <TextInput
            style={[styles.customInput, { color: colors.text, borderColor: ACCENT }]}
            placeholder="min"
            placeholderTextColor={colors.textLight}
            keyboardType="numeric"
            returnKeyType="go"
            maxLength={3}
            value={customMins}
            onChangeText={setCustomMins}
            onSubmitEditing={() => {
              const m = parseInt(customMins);
              if (m > 0) { start(m); setCustomMins(''); }
            }}
          />
          <Text style={[styles.customLabel, { color: colors.textLight }]}>minutes</Text>
          <TouchableOpacity
            style={[styles.customBtn, { backgroundColor: ACCENT, opacity: customMins && parseInt(customMins) > 0 ? 1 : 0.35 }]}
            disabled={!customMins || parseInt(customMins) <= 0}
            onPress={() => { start(parseInt(customMins)); setCustomMins(''); }}
          >
            <Text style={styles.customBtnText}>Start</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={[styles.backLinkText, { color: colors.textLight }]}>← Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  sub:   { fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 32 },

  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 16 },
  presetBtn:  { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  presetNum:  { fontSize: 26, fontWeight: '900', color: '#fff' },
  presetLabel:{ fontSize: 12, color: '#B2DFDB', fontWeight: '700' },

  warnBadge:     { marginTop: 32, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  warnBadgeText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },

  cancelBtn:     { marginTop: 40, padding: 14 },
  cancelBtnText: { color: '#555', fontSize: 14 },

  primaryBtn:      { borderRadius: 14, padding: 18, alignItems: 'center' },
  primaryBtnText:  { color: '#fff', fontSize: 17, fontWeight: '800' },
  secondaryBtn:    { borderRadius: 14, borderWidth: 1.5, padding: 16, alignItems: 'center', marginTop: 10 },
  secondaryBtnText:{ fontSize: 15, fontWeight: '600' },
  customRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  customInput:     { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 18, fontWeight: '700', width: 72, textAlign: 'center' },
  customLabel:     { fontSize: 14, fontWeight: '600' },
  customBtn:       { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  customBtnText:   { color: '#fff', fontSize: 15, fontWeight: '800' },

  backLink:        { alignItems: 'center', marginTop: 20, padding: 8 },
  backLinkText:    { fontSize: 13 },
});
