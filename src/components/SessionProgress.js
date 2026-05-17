import React from 'react';
import { View } from 'react-native';
import { colors, useColors } from '../theme';

export default function SessionProgress({
  current, total, color = colors.primary }) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, current / total) : 0;
  return (
    <View style={{ height: 4, backgroundColor: '#EBEBEB', width: '100%' }}>
      <View style={{ height: 4, width: `${Math.round(pct * 100)}%`, backgroundColor: color, borderRadius: 2 }} />
    </View>
  );
}
