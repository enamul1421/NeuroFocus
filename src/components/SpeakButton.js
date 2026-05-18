import { useState, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { XI_API_KEY, VOICE_ID } from '../config/elevenlabs';

const TEMP_FILE = FileSystem.cacheDirectory + 'xi_speech.mp3';

async function elevenLabsFetch(text) {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': XI_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.55,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: false,
        },
      }),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${body.slice(0, 200)}`);
  }

  // ArrayBuffer → base64 → temp file
  const buf   = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  await FileSystem.writeAsStringAsync(TEMP_FILE, b64, { encoding: 'base64' });
  return TEMP_FILE;
}

export default function SpeakButton({ text, style }) {
  const [state, setState] = useState('idle'); // idle | loading | playing
  const soundRef = useRef(null);

  async function stop() {
    try { await soundRef.current?.stopAsync(); } catch {}
    try { await soundRef.current?.unloadAsync(); } catch {}
    soundRef.current = null;
    setState('idle');
  }

  async function play() {
    if (state !== 'idle') { stop(); return; }
    if (!text) return;
    setState('loading');
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const uri = await elevenLabsFetch(text);
      const { sound } = await Audio.Sound.createAsync({ uri });
      soundRef.current = sound;
      setState('playing');
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish || status.isLoaded === false) stop();
      });
      await sound.playAsync();
    } catch (e) {
      console.warn('ElevenLabs TTS error:', e.message);
      setState('idle');
    }
  }

  const label = state === 'loading' ? '⏳ Loading…'
              : state === 'playing' ? '🔇 Stop'
              : '🔊 Listen';

  return (
    <TouchableOpacity
      style={[styles.btn, state !== 'idle' && styles.btnActive, style]}
      onPress={play}
      activeOpacity={0.7}
      disabled={state === 'loading'}
    >
      <Text style={[styles.label, state !== 'idle' && styles.labelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// Standalone speak helper (used by other screens)
export async function speak(text) {
  if (!text) return;
  try {
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const uri = await elevenLabsFetch(text);
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
  } catch (e) {
    console.warn('ElevenLabs speak error:', e.message);
  }
}

export function stopSpeech() {}

const styles = StyleSheet.create({
  btn:        { borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#F0F0F0', alignSelf: 'flex-start' },
  btnActive:  { backgroundColor: '#E8F0FE' },
  label:      { fontSize: 13, fontWeight: '700', color: '#555' },
  labelActive:{ color: '#5B5EA6' },
});
