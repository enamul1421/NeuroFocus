import React, { useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { colors, useColors } from '../theme';

export default function CelebrationModal({
  celebration, onDismiss }) {
  const colors = useColors();
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!celebration) return;
    scaleAnim.setValue(0.5);
    opacityAnim.setValue(0);
    xpAnim.setValue(0);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 6, tension: 100 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(xpAnim, { toValue: celebration.xpGained, duration: 800, useNativeDriver: false }),
    ]).start();

    timerRef.current = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timerRef.current);
  }, [celebration]);

  if (!celebration) return null;

  const { xpGained, newBadges, leveledUp, newLevel } = celebration;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onDismiss}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => { clearTimeout(timerRef.current); onDismiss(); }}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}>

          {leveledUp && (
            <View style={styles.levelUpBanner}>
              <Text style={styles.levelUpText}>LEVEL UP! 🎉</Text>
              <Text style={styles.levelUpName}>Level {newLevel} — {celebration.levelName}</Text>
            </View>
          )}

          <View style={styles.xpRow}>
            <Text style={styles.xpPlus}>+</Text>
            <Animated.Text style={styles.xpValue}>
              {xpAnim.interpolate({ inputRange: [0, xpGained], outputRange: ['0', String(xpGained)] })}
            </Animated.Text>
            <Text style={styles.xpLabel}> XP</Text>
          </View>

          {newBadges.length > 0 && (
            <View style={styles.badgeSection}>
              <Text style={styles.badgeTitle}>Badge{newBadges.length > 1 ? 's' : ''} unlocked!</Text>
              {newBadges.map(b => (
                <View key={b.id} style={styles.badgeRow}>
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <View>
                    <Text style={styles.badgeName}>{b.name}</Text>
                    <Text style={styles.badgeDesc}>{b.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.tapHint}>Tap anywhere to continue</Text>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    minWidth: 280,
  },
  levelUpBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    width: '100%',
  },
  levelUpText: { fontSize: 20, fontWeight: '900', color: '#B8860B' },
  levelUpName: { fontSize: 13, fontWeight: '700', color: '#B8860B', marginTop: 2 },

  xpRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  xpPlus:  { fontSize: 28, fontWeight: '900', color: colors.primary },
  xpValue: { fontSize: 52, fontWeight: '900', color: colors.primary },
  xpLabel: { fontSize: 22, fontWeight: '800', color: colors.primary },

  badgeSection: { width: '100%', marginBottom: 8 },
  badgeTitle: { fontSize: 13, fontWeight: '800', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8F8FF', borderRadius: 12, padding: 10, marginBottom: 6 },
  badgeIcon: { fontSize: 32 },
  badgeName: { fontSize: 15, fontWeight: '800', color: '#333' },
  badgeDesc: { fontSize: 12, color: '#888', marginTop: 1 },

  tapHint: { fontSize: 12, color: '#CCC', marginTop: 12 },
});
