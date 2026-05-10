import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

export default function SpeakButton({ text, size = 'md', style }) {
  const [speaking, setSpeaking] = useState(false);

  // Stop speech when component unmounts (screen changes)
  useEffect(() => () => { Speech.stop(); }, []);

  async function toggle() {
    if (speaking) {
      await Speech.stop();
      setSpeaking(false);
    } else {
      setSpeaking(true);
      Speech.speak(text, {
        rate:    0.85,   // slightly slower for clarity
        pitch:   1.0,
        onDone:    () => setSpeaking(false),
        onStopped: () => setSpeaking(false),
        onError:   () => setSpeaking(false),
      });
    }
  }

  const btnSize = size === 'lg' ? styles.btnLg : size === 'sm' ? styles.btnSm : styles.btnMd;
  const iconSize = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;

  return (
    <TouchableOpacity
      style={[styles.btn, btnSize, speaking && styles.btnActive, style]}
      onPress={toggle}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize: iconSize }}>{speaking ? '🔇' : '🔊'}</Text>
    </TouchableOpacity>
  );
}

// Convenience: speak a string immediately (no button UI)
export function speak(text) {
  Speech.speak(text, { rate: 0.85, pitch: 1.0 });
}

export function stopSpeech() {
  Speech.stop();
}

const styles = StyleSheet.create({
  btn:       { borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F0F0' },
  btnSm:     { width: 28, height: 28 },
  btnMd:     { width: 36, height: 36 },
  btnLg:     { width: 44, height: 44 },
  btnActive: { backgroundColor: '#E8F0FE' },
});
