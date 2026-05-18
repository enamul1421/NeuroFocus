import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors } from '../theme';

export default function ModuleTopBar({ emoji, onBack, tintColor }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <Text style={[styles.backText, { color: tintColor || colors.primary }]}>← Home</Text>
      </TouchableOpacity>
      {/* Absolutely centered emoji — independent of back button width */}
      {emoji ? (
        <View style={styles.emojiWrap} pointerEvents="none">
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  backBtn:  {},
  backText: { fontSize: 15, fontWeight: '600' },
  emojiWrap:{ position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  emoji:    { fontSize: 38 },
});
