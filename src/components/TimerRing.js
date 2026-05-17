import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';

const STROKE = 14;
const BOMB_R = 13;   // bomb body radius
const KNOB_R = 4;    // knob radius on top of bomb

export default function TimerRing({
  progress,
  color      = '#5B5EA6',
  trackColor,
  icon,
  label,
  sublabel,
  labelColor = '#fff',
  size       = 180,
  showSpark  = false,
  tailIcon   = null,
  fuseLength = 40,
  fuseColor  = '#FFD54F',
}) {
  const r             = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const safeProgress  = Math.max(0, Math.min(1, progress));
  const offset        = circumference * (1 - safeProgress);
  const track         = trackColor || color + '28';

  const tipAngle = (-90 + safeProgress * 360) * (Math.PI / 180);
  const tipX     = size / 2 + r * Math.cos(tipAngle);
  const tipY     = size / 2 + r * Math.sin(tipAngle);

  const tailX = size / 2;
  const tailY = size / 2 - r;

  // Bomb center (shifted left so knob aligns with fuse)
  const bombX   = tailX - 4;
  const bombY   = tailY + fuseLength;

  // Fuse wire endpoint = top of knob
  const knobCX  = bombX;
  const knobCY  = bombY - BOMB_R - KNOB_R;
  const fuseEndX = knobCX;
  const fuseEndY = knobCY - KNOB_R;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', overflow: 'visible' }}>
      <Svg width={size + 40} height={size + 40} style={[StyleSheet.absoluteFill, { left: -20, top: -20 }]}>
        <G transform="translate(20, 20)">
          {/* Background track */}
          <Circle cx={size/2} cy={size/2} r={r} stroke={track} strokeWidth={STROKE} fill="none" />
          {/* Depleting arc */}
          <Circle
            cx={size/2} cy={size/2} r={r}
            stroke={color} strokeWidth={STROKE} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />

          {tailIcon && (
            <>
              <Path
                d={(() => {
                  const segs = 5;
                  const h    = (fuseEndY - tailY) / segs;
                  const amp  = 5;
                  let p = `M ${tailX} ${tailY}`;
                  for (let i = 0; i < segs - 1; i++) {
                    const cx = tailX + (i % 2 === 0 ? amp : -amp);
                    const cy = tailY + h * (i + 0.5);
                    const nx = tailX + (fuseEndX - tailX) * ((i + 1) / segs);
                    const ny = tailY + h * (i + 1);
                    p += ` Q ${cx} ${cy} ${nx} ${ny}`;
                  }
                  p += ` Q ${tailX + amp} ${tailY + (fuseEndY - tailY) * 0.85} ${fuseEndX} ${fuseEndY}`;
                  return p;
                })()}
                stroke={fuseColor}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <Circle cx={knobCX} cy={knobCY} r={KNOB_R} fill="#888" stroke="#aaa" strokeWidth={1} />
              <Circle cx={bombX} cy={bombY} r={BOMB_R} fill="#4A4A4A" stroke="#888" strokeWidth={1.5} />
              <Circle cx={bombX - 4} cy={bombY - 5} r={4} fill="rgba(255,255,255,0.30)" />
            </>
          )}

          {showSpark && (1 - safeProgress) * 360 > 20 && safeProgress > 0.01 && (
            <>
              <Circle cx={tipX} cy={tipY} r={16} fill="#FF6D00" opacity={0.20} />
              <Circle cx={tipX} cy={tipY} r={10} fill="#FFD600" opacity={0.80} />
              <Circle cx={tipX} cy={tipY} r={5}  fill="#fff" />
            </>
          )}
        </G>
      </Svg>

      {icon     && <Text style={styles.icon}>{icon}</Text>}
      {label    && <Text style={[styles.label,    { color: labelColor }]}>{label}</Text>}
      {sublabel && <Text style={[styles.sublabel, { color: labelColor, opacity: 0.65 }]}>{sublabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  icon:     { fontSize: 40, marginBottom: 4, textAlign: 'center' },
  label:    { fontSize: 36, fontWeight: '900', textAlign: 'center' },
  sublabel: { fontSize: 12, marginTop: 2, textAlign: 'center' },
});
