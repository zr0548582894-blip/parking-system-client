import { useEffect, useMemo, useRef, useState } from 'react';
import { Accessibility, Umbrella, Zap } from 'lucide-react';
import { featureKind, floorLabel, layoutFloor, spotState, STATE } from './layout.js';

export const STATE_LABEL = {
  [STATE.AVAILABLE]: 'פנוי',
  [STATE.OCCUPIED]: 'תפוס',
  [STATE.UNAVAILABLE]: 'לא פעיל',
  [STATE.MINE]: 'ההזמנה שלי',
  [STATE.UNKNOWN]: 'לא ידוע',
};

const FEATURE_ICON = { ev: Zap, accessible: Accessibility, covered: Umbrella };
// צבעי מכוניות טבעיים: לבן, כסף, פחם, כחול כהה, אדום עמום, בז'. נבחר לפי מזהה המקום, ואינו נתון אמיתי
const CAR_COLORS = ['#e9eaee', '#aeb4bf', '#3b4250', '#27406b', '#8f3a36', '#cdbf9f', '#5b6b61'];
const carColor = (id) => CAR_COLORS[Math.abs(id) % CAR_COLORS.length];

// נורת הכוונה מעל כל מקום, כמו בחניונים אמיתיים
const LED = {
  [STATE.AVAILABLE]: '#2fe08f',
  [STATE.OCCUPIED]: '#f2564a',
  [STATE.MINE]: '#4aa8ff',
  [STATE.UNAVAILABLE]: '#7b8190',
  [STATE.UNKNOWN]: '#7b8190',
};

function perSideFor(width) {
  if (width < 480) return 3;
  if (width < 700) return 4;
  if (width < 960) return 6;
  return 8;
}

// תמרור כחול קטן בתוך הציור: חץ כניסה (מטה) או יציאה (מעלה)
function MapSign({ x, y, direction }) {
  const d = direction === 'down' ? 'M13 6v14M7 14l6 6 6-6' : 'M13 20V6M7 12l6-6 6 6';
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <rect width="26" height="26" rx="5" fill="#1c5bb8" stroke="#fff" strokeWidth="2" />
      <path d={d} fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

// מכונית במבט מלמעלה עם צל, חלונות, מראות ופנסים. החזית אל הקיר; במקומות התחתונים מסובבים 180 מעלות
function Car({ x, y, w, h, color, flip }) {
  const cw = w - 22;
  const ch = h - 32;
  return (
    <g transform={`translate(${x + 11} ${y + (flip ? 24 : 12)})`} aria-hidden="true">
      <g transform={flip ? `rotate(180 ${cw / 2} ${ch / 2})` : undefined}>
      <g className="car">
        <rect x="3" y="5" width={cw} height={ch} rx="13" fill="#000" opacity="0.38" filter="url(#carShadow)" />
        <rect width={cw} height={ch} rx="13" fill={color} />
        <rect width={cw} height={ch} rx="13" fill="url(#carSheen)" />
        {/* מראות */}
        <rect x="-3" y={ch * 0.3} width="5" height="9" rx="2" fill={color} />
        <rect x={cw - 2} y={ch * 0.3} width="5" height="9" rx="2" fill={color} />
        {/* שמשה קדמית, גג, שמשה אחורית */}
        <path d={`M6 ${ch * 0.2} Q${cw / 2} ${ch * 0.13} ${cw - 6} ${ch * 0.2} L${cw - 8} ${ch * 0.36} H8 Z`} fill="#18202d" opacity="0.92" />
        <rect x="7" y={ch * 0.36} width={cw - 14} height={ch * 0.25} rx="5" fill={color} />
        <rect x="7" y={ch * 0.36} width={cw - 14} height={ch * 0.25} rx="5" fill="rgba(255,255,255,0.2)" />
        <path d={`M8 ${ch * 0.61} H${cw - 8} L${cw - 6} ${ch * 0.74} Q${cw / 2} ${ch * 0.8} 6 ${ch * 0.74} Z`} fill="#18202d" opacity="0.92" />
        {/* פנסים קדמיים ואחוריים */}
        <rect x="4" y="2" width="10" height="4.5" rx="2" fill="#fff6cc" />
        <rect x={cw - 14} y="2" width="10" height="4.5" rx="2" fill="#fff6cc" />
        <rect x="4" y={ch - 6} width="10" height="4" rx="2" fill="#d7332b" />
        <rect x={cw - 14} y={ch - 6} width="10" height="4" rx="2" fill="#d7332b" />
      </g>
      </g>
    </g>
  );
}

function Cone({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true">
      <rect x="-6" y="5" width="12" height="3.5" rx="1" fill="#2b2f3a" />
      <path d="M-4.5 5 L0 -7 L4.5 5 Z" fill="#ff7a1a" />
      <path d="M-2.4 -0.5 H2.4 L3 1.8 H-3 Z" fill="#fff" />
    </g>
  );
}

function Slot({ slot, index, state, selected, dimmed, onSelect, onArrow }) {
  const { spot, x, y, w, h, row } = slot;
  const bottom = row === 'bottom';
  const kinds = spot.features.map((feature) => featureKind(feature.name)).filter((kind) => kind !== 'other');
  const label = [
    `מקום ${spot.code}`,
    `קומה ${spot.floor}`,
    STATE_LABEL[state],
    spot.features.map((feature) => feature.name).join(', '),
  ]
    .filter(Boolean)
    .join(', ');

  const wallY = bottom ? y + h : y; // הקיר שאליו החזית צמודה
  const ledY = bottom ? y + h - 15 : y + 7;
  const hasCar = state === STATE.OCCUPIED || state === STATE.MINE;

  function onKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(spot.id);
    } else if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      onArrow(slot, event.key);
    }
  }

  return (
    <g
      className={`slot slot-${state} ${selected ? 'is-selected' : ''} ${dimmed ? 'is-dimmed' : ''}`}
      role="button"
      tabIndex={0}
      data-spot-id={spot.id}
      style={{ '--i': index }}
      aria-label={label}
      aria-pressed={selected}
      onClick={() => onSelect(spot.id)}
      onKeyDown={onKeyDown}
    >
      <rect className="slot-hit" x={x} y={y} width={w} height={h} fill="transparent" />
      <rect className="slot-bay" x={x + 2} y={y + 2} width={w - 4} height={h - 4} />
      {/* קווי צבע של המקום ובלם גלגל ליד הקיר */}
      <path className="paint" d={`M${x + 1} ${y} V${y + h} M${x + w - 1} ${y} V${y + h}`} />
      <path className="paint paint-back" d={`M${x + 1} ${wallY} H${x + w - 1}`} />
      <rect className="wheel-stop" x={x + w / 2 - 15} y={bottom ? wallY - 14 : wallY + 6} width="30" height="6" rx="2" />
      {state === STATE.UNAVAILABLE && (
        <>
          <rect className="slot-hazard" x={x + 2} y={y + 2} width={w - 4} height={h - 4} fill="url(#hazard)" />
          <Cone x={x + 12} y={bottom ? y + 18 : y + h - 22} />
          <Cone x={x + w - 12} y={bottom ? y + 18 : y + h - 22} />
        </>
      )}
      {hasCar && <Car x={x} y={y} w={w} h={h} color={carColor(spot.id)} flip={bottom} />}
      {/* נורת הכוונה */}
      <rect className="led" x={x + w / 2 - 13} y={ledY} width="26" height="8" rx="4" fill={LED[state]} />
      <text className="slot-code" x={x + w / 2} y={bottom ? y + 29 : y + h - 11} textAnchor="middle">
        {spot.code}
      </text>
      {!hasCar && kinds.slice(0, 2).map((kind, i) => {
        const Icon = FEATURE_ICON[kind];
        const size = 16;
        const startX = x + w / 2 - (kinds.slice(0, 2).length * (size + 4)) / 2 + i * (size + 4) + 2;
        const iconY = bottom ? y + h - 36 : y + 18;
        return (
          <g key={kind} aria-hidden="true">
            <rect className={`feature-chip feature-${kind}`} x={startX - 2} y={iconY - 2} width={size + 4} height={size + 4} rx="4" />
            <Icon className="slot-feature" x={startX} y={iconY} size={size} strokeWidth={2.4} color="#fff" />
          </g>
        );
      })}
      <rect className="slot-select" x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} rx="6" />
      {selected && <rect className="slot-pulse" x={x + 3} y={y + 3} width={w - 6} height={h - 6} rx="7" />}
      <rect className="slot-focus" x={x + 1} y={y + 1} width={w - 2} height={h - 2} rx="6" />
    </g>
  );
}

// ציור סכמטי של קומה בחניון: אספלט, קווי צבע, בלמי גלגל, עמודים, נורות הכוונה ומכוניות.
// הציור משרת את המידע האמיתי מהשרת (מצב כל מקום בתאריך שנבחר), אך המיקום על הציור הוא נגזר ולא פיזי
export default function GarageMap({ floor, spots, date, mineByDate, selectedId, onSelect, matches }) {
  const wrapper = useRef(null);
  const [perSide, setPerSide] = useState(6);

  useEffect(() => {
    const node = wrapper.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setPerSide(perSideFor(entry.contentRect.width)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const layout = useMemo(() => layoutFloor(spots, { perSide, rtl: true }), [spots, perSide]);
  const options = { date, mineByDate };
  const svgRef = useRef(null);

  // חצים במקלדת: עוברים למקום הקרוב ביותר בכיוון שנלחץ (לפי הגיאומטריה של הציור)
  function moveFocus(from, key) {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[key];
    if (!direction) return;
    const center = (slot) => [slot.x + slot.w / 2, slot.y + slot.h / 2];
    const [fx, fy] = center(from);
    let best = null;
    for (const candidate of layout.slots) {
      if (candidate === from) continue;
      const [cx, cy] = center(candidate);
      const along = (cx - fx) * direction[0] + (cy - fy) * direction[1];
      if (along <= 0) continue;
      const across = Math.abs((cx - fx) * direction[1]) + Math.abs((cy - fy) * direction[0]);
      const score = along + across * 2;
      if (!best || score < best.score) best = { candidate, score };
    }
    if (best) svgRef.current?.querySelector(`[data-spot-id="${best.candidate.spot.id}"]`)?.focus();
  }

  const slotW = layout.slots[0]?.w ?? 66;
  const boardW = 168;

  return (
    <div className="map-wrap" ref={wrapper}>
      <svg
        ref={svgRef}
        key={floor}
        className="map"
        style={{ maxWidth: layout.width * 2 }}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        role="group"
        aria-label={`תוכנית ${floorLabel(floor)}, ${spots.length} מקומות`}
      >
        <defs>
          <pattern id="hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="9" height="9" fill="rgba(20,33,58,0.03)" />
            <line x1="0" y1="0" x2="0" y2="9" stroke="rgba(20,33,58,0.3)" strokeWidth="2" />
          </pattern>
          <pattern id="hazard" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="16" height="16" fill="#ffc61a" opacity="0.78" />
            <rect width="8" height="16" fill="#1a1d26" opacity="0.8" />
          </pattern>
          <linearGradient id="floorGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#b3b6bd" />
            <stop offset="1" stopColor="#9fa3ab" />
          </linearGradient>
          <linearGradient id="carSheen" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="lightPool">
            <stop offset="0" stopColor="#fff6dc" stopOpacity="0.38" />
            <stop offset="1" stopColor="#fff6dc" stopOpacity="0" />
          </radialGradient>
          <filter id="grain" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 -0.34" />
          </filter>
          <filter id="carShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>

        {/* קיר חיצוני ורצפת בטון */}
        <rect className="map-wall" x="1" y="1" width={layout.width - 2} height={layout.height - 2} rx="16" />
        <rect className="map-floor" x="8" y="8" width={layout.width - 16} height={layout.height - 16} rx="9" fill="url(#floorGrad)" />
        <rect x="8" y="8" width={layout.width - 16} height={layout.height - 16} rx="9" filter="url(#grain)" opacity="0.45" pointerEvents="none" />

        {/* שלט תלוי עם שם הקומה */}
        <g aria-hidden="true">
          <line className="hanger" x1={layout.width - 36 - boardW + 22} x2={layout.width - 36 - boardW + 22} y1="8" y2="16" />
          <line className="hanger" x1={layout.width - 36 - 22} x2={layout.width - 36 - 22} y1="8" y2="16" />
          <rect className="level-board" x={layout.width - 36 - boardW} y="16" width={boardW} height="42" rx="6" />
          <text className="map-title" x={layout.width - 36 - boardW / 2} y="45" textAnchor="middle">
            {floorLabel(floor)}
          </text>
        </g>
        <g transform="translate(36 16)" aria-hidden="true">
          <rect width="38" height="38" rx="7" fill="#1c5bb8" stroke="#fff" strokeWidth="2.5" />
          <path d="M14.5 30V8.5h9a6.4 6.4 0 0 1 0 12.8h-9" fill="none" stroke="#fff" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {layout.lanes.map((lane, index) => {
          const first = index === 0;
          const last = index === layout.lanes.length - 1;
          const midY = lane.y + lane.height / 2;
          const arrows = Math.max(2, layout.columns - 1);
          const step = (lane.width - 200) / Math.max(1, arrows - 1);
          return (
            <g key={lane.y} aria-hidden="true">
              <rect className="lane" x={lane.x} y={lane.y} width={lane.width} height={lane.height} />
              <rect x={lane.x} y={lane.y} width={lane.width} height={lane.height} filter="url(#grain)" opacity="0.7" />
              <ellipse cx={lane.x + lane.width / 2} cy={midY} rx={lane.width * 0.46} ry={lane.height * 0.9} fill="url(#lightPool)" />
              {/* קו אמצע כפול צהוב: שני כיווני נסיעה */}
              <line className="lane-center" x1={lane.x + 6} x2={lane.x + lane.width - 6} y1={midY - 2} y2={midY - 2} />
              <line className="lane-center" x1={lane.x + 6} x2={lane.x + lane.width - 6} y1={midY + 2} y2={midY + 2} />
              {Array.from({ length: arrows }, (_, arrow) => {
                const ax = lane.x + 78 + arrow * step;
                return (
                  <g key={arrow}>
                    <g transform={`translate(${ax} ${lane.y + 21})`}>
                      <path className="lane-arrow arrow-in" style={{ "--step": `${step}px` }} d="M0 0 L15 -9 V-3.5 H38 V3.5 H15 V9 Z" />
                    </g>
                    <g transform={`translate(${ax} ${lane.y + lane.height - 21})`}>
                      <path className="lane-arrow arrow-out" style={{ "--step": `${step}px` }} d="M38 0 L23 -9 V-3.5 H0 V3.5 H23 V9 Z" />
                    </g>
                  </g>
                );
              })}
              {first && (
                <g>
                  <MapSign x={lane.x + lane.width - 30} y={lane.y + 8} direction="down" />
                  <text className="lane-tag" x={lane.x + lane.width - 38} y={lane.y + 26} textAnchor="start">
                    כניסה
                  </text>
                </g>
              )}
              {last && (
                <g>
                  <MapSign x={lane.x + 6} y={lane.y + lane.height - 34} direction="up" />
                  <text className="lane-tag" x={lane.x + 40} y={lane.y + lane.height - 15} textAnchor="end">
                    יציאה
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {layout.slots.map((slot, index) => (
          <Slot
            key={slot.spot.id}
            slot={slot}
            index={index}
            onArrow={moveFocus}
            state={spotState(slot.spot, options)}
            selected={slot.spot.id === selectedId}
            dimmed={matches ? !matches(slot.spot) : false}
            onSelect={onSelect}
          />
        ))}

        {/* עמודי בטון בין קבוצות מקומות, מעל הקווים */}
        {layout.lanes.map((lane) =>
          Array.from({ length: Math.max(0, Math.floor((layout.columns - 1) / 3)) }, (_, k) => {
            const px = lane.x + 14 + (k + 1) * 3 * slotW;
            return [lane.y, lane.y + lane.height].map((py) => (
              <g key={`${lane.y}-${k}-${py}`} aria-hidden="true">
                <rect className="pillar" x={px - 8} y={py - 8} width="16" height="16" rx="2" />
                <path className="pillar-line" d={`M${px - 8} ${py - 8} L${px + 8} ${py + 8} M${px + 8} ${py - 8} L${px - 8} ${py + 8}`} />
              </g>
            ));
          }),
        )}
      </svg>
    </div>
  );
}
