import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

let bestVoice = undefined;
let voiceResolved = false;

async function resolveBestVoice() {
  if (voiceResolved) return;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const en = voices.filter(v => v.language?.startsWith('en'));
    const premium  = en.find(v => v.quality === 'Premium');
    const enhanced = en.find(v => v.quality === 'Enhanced');
    bestVoice = (premium || enhanced)?.identifier ?? undefined;
  } catch {}
  voiceResolved = true;
}

async function setAudio() {
  try { await setAudioModeAsync({ playsInSilentModeIOS: true }); } catch {}
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

function speakChunks(chunks, onDone, onStop, timerRef, total) {
  if (!chunks.length) { onDone(); return; }
  const [first, ...rest] = chunks;
  const isLast = rest.length === 0;
  const isNearEnd = total && chunks.length <= 2;
  Speech.speak(first, {
    voice: bestVoice,
    rate:  isLast ? 0.68 : isNearEnd ? 0.72 : 0.75,
    pitch: 1.0,
    onDone: () => {
      if (rest.length) {
        timerRef.current = setTimeout(
          () => speakChunks(rest, onDone, onStop, timerRef, total),
          isNearEnd ? 1100 : 900
        );
      } else {
        onDone();
      }
    },
    onStopped: onStop,
    onError:   onStop,
  });
}

export default function SpeakButton({ text, style }) {
  const [speaking, setSpeakingState] = useState(false);
  const speakingRef = useRef(false);
  const timerRef = useRef(null);

  function setSpeaking(val) {
    speakingRef.current = val;
    setSpeakingState(val);
  }

  useEffect(() => {
    resolveBestVoice();
    return () => {
      Speech.stop();
      clearTimeout(timerRef.current);
    };
  }, []);

  async function toggle() {
    if (speakingRef.current) {
      clearTimeout(timerRef.current);
      Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!text) return;
    await setAudio();
    await resolveBestVoice();
    setSpeaking(true);
    const chunks = splitSentences(text);
    speakChunks(chunks, () => setSpeaking(false), () => setSpeaking(false), timerRef, chunks.length);
  }

  return (
    <TouchableOpacity
      style={[styles.btn, speaking && styles.btnActive, style]}
      onPress={toggle}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, speaking && styles.labelActive]}>
        {speaking ? '🔇 Stop' : '🔊 Listen'}
      </Text>
    </TouchableOpacity>
  );
}

export async function speak(text) {
  if (!text) return;
  await setAudio();
  await resolveBestVoice();
  Speech.speak(text, { voice: bestVoice, rate: 0.75, pitch: 1.0 });
}

export function stopSpeech() {
  Speech.stop();
}

const styles = StyleSheet.create({
  btn:        { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F0F0F0', alignSelf: 'flex-start' },
  btnActive:  { backgroundColor: '#E8F0FE' },
  label:      { fontSize: 13, fontWeight: '700', color: '#555' },
  labelActive:{ color: '#5B5EA6' },
});
