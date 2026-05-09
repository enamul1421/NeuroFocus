import React from 'react';
import { View } from 'react-native';
import Svg, { Ellipse, Rect, G } from 'react-native-svg';

// Region IDs must match BODY_REGIONS in MoodBridge
export const BODY_REGION_IDS = [
  'head', 'shoulders', 'chest', 'stomach', 'arms', 'legs',
];

const BASE  = '#D8D8E8'; // unselected / not yet
const DONE  = '#9B9EC8'; // body scan: already scanned
const LIGHT = '#E8E8F8'; // body scan: not yet reached

// Each region → array of shape descriptors for rendering + a transparent hit rect
const REGION_SHAPES = {
  head: {
    shapes: [{ type: 'ellipse', cx: 50, cy: 24, rx: 21, ry: 23 }],
    hit: { x: 29, y: 1, w: 42, h: 46 },
  },
  shoulders: {
    shapes: [
      { type: 'rect', x: 10, y: 54, w: 17, h: 18, rx: 7 }, // left shoulder
      { type: 'rect', x: 73, y: 54, w: 17, h: 18, rx: 7 }, // right shoulder
      { type: 'rect', x: 44, y: 46, w: 12, h: 10, rx: 4 }, // neck
    ],
    hit: { x: 5, y: 46, w: 90, h: 30 },
  },
  chest: {
    shapes: [{ type: 'rect', x: 27, y: 54, w: 46, h: 38, rx: 5 }],
    hit: { x: 27, y: 54, w: 46, h: 38 },
  },
  stomach: {
    shapes: [
      { type: 'rect', x: 27, y: 92, w: 46, h: 38, rx: 5 }, // abdomen
      { type: 'rect', x: 27, y: 130, w: 46, h: 18, rx: 5 }, // hips
    ],
    hit: { x: 27, y: 92, w: 46, h: 56 },
  },
  arms: {
    shapes: [
      { type: 'rect', x: 8,  y: 56, w: 16, h: 52, rx: 6 }, // left upper arm
      { type: 'rect', x: 76, y: 56, w: 16, h: 52, rx: 6 }, // right upper arm
      { type: 'rect', x: 6,  y: 108, w: 16, h: 46, rx: 6 }, // left forearm
      { type: 'rect', x: 78, y: 108, w: 16, h: 46, rx: 6 }, // right forearm
      { type: 'ellipse', cx: 14, cy: 163, rx: 13, ry: 9 },  // left hand
      { type: 'ellipse', cx: 86, cy: 163, rx: 13, ry: 9 },  // right hand
    ],
    hit: { x: 4, y: 56, w: 20, h: 118 }, // left arm hit (right arm has separate below)
  },
  legs: {
    shapes: [
      { type: 'rect', x: 27, y: 148, w: 20, h: 64, rx: 6 }, // left leg
      { type: 'rect', x: 53, y: 148, w: 20, h: 64, rx: 6 }, // right leg
      { type: 'ellipse', cx: 37, cy: 218, rx: 18, ry: 9 },  // left foot
      { type: 'ellipse', cx: 63, cy: 218, rx: 18, ry: 9 },  // right foot
    ],
    hit: { x: 27, y: 148, w: 46, h: 80 },
  },
};

function renderShape(shape, fill, key) {
  if (shape.type === 'ellipse') {
    return <Ellipse key={key} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} fill={fill} />;
  }
  return <Rect key={key} x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.rx ?? 0} fill={fill} />;
}

export default function BodyDiagram({ mode = 'labeling', selected = null, activeId = null, onSelect, width = 120, height = 268 }) {
  // Determine fill color for each region
  function fillFor(id) {
    if (mode === 'labeling') {
      return selected === id ? '#5B5EA6' : BASE;
    }
    // scan mode
    const activeIdx = BODY_REGION_IDS.indexOf(activeId);
    const thisIdx   = BODY_REGION_IDS.indexOf(id);
    if (id === activeId) return '#5B5EA6';
    if (thisIdx < activeIdx) return DONE;
    return LIGHT;
  }

  return (
    <View>
      <Svg width={width} height={height} viewBox="0 0 100 240">
        {BODY_REGION_IDS.map(id => {
          const region = REGION_SHAPES[id];
          const fill   = fillFor(id);
          const isArms = id === 'arms';
          return (
            <G key={id}>
              {/* Visible shapes */}
              {region.shapes.map((s, i) => renderShape(s, fill, `${id}-${i}`))}

              {/* For arms: two hit zones (left + right) */}
              {isArms ? (
                <>
                  <Rect
                    x={4} y={56} width={20} height={118} rx={0}
                    fill="transparent"
                    onPress={() => mode === 'labeling' && onSelect?.(id)}
                  />
                  <Rect
                    x={76} y={56} width={20} height={118} rx={0}
                    fill="transparent"
                    onPress={() => mode === 'labeling' && onSelect?.(id)}
                  />
                </>
              ) : (
                <Rect
                  x={region.hit.x} y={region.hit.y}
                  width={region.hit.w} height={region.hit.h}
                  fill="transparent"
                  onPress={() => mode === 'labeling' && onSelect?.(id)}
                />
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
