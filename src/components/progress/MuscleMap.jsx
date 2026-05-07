// src/components/progress/MuscleMap.jsx
// Interactive front/back body map. Two SVGs share the same silhouette,
// stacked as the front and back of a 3D card. The Flip button rotates the
// card 180° around Y so the user sees front or back. Each muscle region
// is a tappable shape that calls onSelectGroup(name) — the parent uses
// that to jump to the Exercises tab and drill into that muscle group.
//
// Pure SVG + CSS 3D transform — no Three.js, no canvas. Works on iOS
// Safari and Android Chrome. Falls back to instant swap if the browser
// doesn't honor backface-visibility (rare).

import React, { useState } from 'react'
import { RotateCw } from 'lucide-react'

// ─── Region definitions ────────────────────────────────────────
// Coordinates align with viewBox="0 0 200 380". Tweak by eye if you
// want larger/looser tap targets.

const FRONT_REGIONS = [
  { group: 'Chest',          shape: 'ellipse', cx: 82,  cy: 92,  rx: 18, ry: 13 },
  { group: 'Chest',          shape: 'ellipse', cx: 118, cy: 92,  rx: 18, ry: 13 },
  { group: 'Shoulders',      shape: 'ellipse', cx: 53,  cy: 78,  rx: 13, ry: 11 },
  { group: 'Shoulders',      shape: 'ellipse', cx: 147, cy: 78,  rx: 13, ry: 11 },
  { group: 'Biceps',         shape: 'rect',    x: 32,   y: 100,  width: 18, height: 38, rx: 8 },
  { group: 'Biceps',         shape: 'rect',    x: 150,  y: 100,  width: 18, height: 38, rx: 8 },
  { group: 'Forearms',       shape: 'rect',    x: 32,   y: 145,  width: 18, height: 42, rx: 8 },
  { group: 'Forearms',       shape: 'rect',    x: 150,  y: 145,  width: 18, height: 42, rx: 8 },
  { group: 'Core',           shape: 'rect',    x: 86,   y: 112,  width: 28, height: 50, rx: 6 },
  { group: 'Legs',           shape: 'rect',    x: 64,   y: 205,  width: 30, height: 75, rx: 12 },
  { group: 'Legs',           shape: 'rect',    x: 106,  y: 205,  width: 30, height: 75, rx: 12 },
  { group: 'Calves/Shins',   shape: 'rect',    x: 70,   y: 290,  width: 22, height: 60, rx: 9 },
  { group: 'Calves/Shins',   shape: 'rect',    x: 108,  y: 290,  width: 22, height: 60, rx: 9 },
]

const BACK_REGIONS = [
  { group: 'Shoulders',      shape: 'ellipse', cx: 53,  cy: 78,  rx: 13, ry: 11 },
  { group: 'Shoulders',      shape: 'ellipse', cx: 147, cy: 78,  rx: 13, ry: 11 },
  { group: 'Back',           shape: 'rect',    x: 64,   y: 78,   width: 72, height: 90, rx: 10 },
  { group: 'Triceps',        shape: 'rect',    x: 32,   y: 100,  width: 18, height: 38, rx: 8 },
  { group: 'Triceps',        shape: 'rect',    x: 150,  y: 100,  width: 18, height: 38, rx: 8 },
  { group: 'Forearms',       shape: 'rect',    x: 32,   y: 145,  width: 18, height: 42, rx: 8 },
  { group: 'Forearms',       shape: 'rect',    x: 150,  y: 145,  width: 18, height: 42, rx: 8 },
  // Glutes (counted as Legs — keeps muscle map taxonomy aligned with progress)
  { group: 'Legs',           shape: 'ellipse', cx: 80,  cy: 187, rx: 18, ry: 14 },
  { group: 'Legs',           shape: 'ellipse', cx: 120, cy: 187, rx: 18, ry: 14 },
  // Hamstrings
  { group: 'Legs',           shape: 'rect',    x: 64,   y: 215,  width: 30, height: 65, rx: 12 },
  { group: 'Legs',           shape: 'rect',    x: 106,  y: 215,  width: 30, height: 65, rx: 12 },
  { group: 'Calves/Shins',   shape: 'rect',    x: 70,   y: 290,  width: 22, height: 60, rx: 9 },
  { group: 'Calves/Shins',   shape: 'rect',    x: 108,  y: 290,  width: 22, height: 60, rx: 9 },
]

// Color tokens — uses the app's brand palette so the map feels native.
const COLORS = {
  Chest:          { fill: 'rgba(79,134,247,0.32)',  bright: 'rgba(79,134,247,0.65)',  stroke: '#4F86F7' },
  Back:           { fill: 'rgba(52,199,89,0.32)',   bright: 'rgba(52,199,89,0.65)',   stroke: '#34C759' },
  Shoulders:      { fill: 'rgba(255,159,10,0.32)',  bright: 'rgba(255,159,10,0.65)',  stroke: '#FF9F0A' },
  Biceps:         { fill: 'rgba(79,134,247,0.32)',  bright: 'rgba(79,134,247,0.65)',  stroke: '#4F86F7' },
  Triceps:        { fill: 'rgba(52,199,89,0.32)',   bright: 'rgba(52,199,89,0.65)',   stroke: '#34C759' },
  Forearms:       { fill: 'rgba(255,159,10,0.32)',  bright: 'rgba(255,159,10,0.65)',  stroke: '#FF9F0A' },
  Legs:           { fill: 'rgba(52,199,89,0.32)',   bright: 'rgba(52,199,89,0.65)',   stroke: '#34C759' },
  'Calves/Shins': { fill: 'rgba(52,199,89,0.32)',   bright: 'rgba(52,199,89,0.65)',   stroke: '#34C759' },
  Core:           { fill: 'rgba(79,134,247,0.32)',  bright: 'rgba(79,134,247,0.65)',  stroke: '#4F86F7' },
}

// ─── Body silhouette (shared by front/back) ────────────────────

function BodySilhouette() {
  return (
    <g pointerEvents="none">
      {/* Head */}
      <circle cx="100" cy="35" r="22" fill="#1E1E1E" stroke="#303030" strokeWidth="1.2" />
      {/* Neck */}
      <rect x="92" y="55" width="16" height="13" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      {/* Torso */}
      <path
        d="M 50 70 Q 45 78 50 95 L 65 105 L 65 170 L 135 170 L 135 105 L 150 95 Q 155 78 150 70 L 132 65 L 68 65 Z"
        fill="#1E1E1E"
        stroke="#303030"
        strokeWidth="1.5"
      />
      {/* Arms */}
      <rect x="30" y="68" width="22" height="120" rx="11" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      <rect x="148" y="68" width="22" height="120" rx="11" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      {/* Hands (round caps) */}
      <circle cx="41" cy="195" r="9" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      <circle cx="159" cy="195" r="9" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      {/* Hips */}
      <rect x="60" y="170" width="80" height="35" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      {/* Legs */}
      <rect x="62" y="200" width="35" height="155" rx="14" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      <rect x="103" y="200" width="35" height="155" rx="14" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      {/* Feet (round caps) */}
      <ellipse cx="79" cy="362" rx="14" ry="6" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
      <ellipse cx="121" cy="362" rx="14" ry="6" fill="#1E1E1E" stroke="#303030" strokeWidth="1" />
    </g>
  )
}

function Region({ region, hovered, onClick, onHover }) {
  const color = COLORS[region.group] || COLORS.Chest
  const props = {
    fill: hovered ? color.bright : color.fill,
    stroke: color.stroke,
    strokeWidth: hovered ? 1.6 : 0.9,
    cursor: 'pointer',
    onClick: (e) => { e.stopPropagation(); onClick(region.group) },
    onMouseEnter: () => onHover(region.group),
    onMouseLeave: () => onHover(null),
    onTouchStart: () => onHover(region.group),
    style: { transition: 'fill 150ms, stroke-width 150ms' },
  }
  if (region.shape === 'ellipse') {
    return <ellipse cx={region.cx} cy={region.cy} rx={region.rx} ry={region.ry} {...props} />
  }
  return (
    <rect
      x={region.x} y={region.y}
      width={region.width} height={region.height}
      rx={region.rx || 0}
      {...props}
    />
  )
}

// ─── Faces ──────────────────────────────────────────────────────

function BodyFace({ regions, hovered, onSelect, onHover }) {
  return (
    <svg viewBox="0 0 200 380" className="w-full h-full">
      <BodySilhouette />
      {regions.map((r, i) => (
        <Region
          key={i}
          region={r}
          hovered={hovered === r.group}
          onClick={onSelect}
          onHover={onHover}
        />
      ))}
    </svg>
  )
}

// ─── MuscleMap (the public component) ──────────────────────────

export default function MuscleMap({ onSelectGroup }) {
  const [showBack, setShowBack] = useState(false)
  const [hovered, setHovered] = useState(null)

  return (
    <div className="bg-bg-1 border border-bg-3 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] uppercase tracking-widest text-txt-muted font-bold">
          Body Map · {showBack ? 'Back' : 'Front'}
        </p>
        <button
          onClick={() => { setShowBack(b => !b); setHovered(null) }}
          className="flex items-center gap-1.5 text-[11px] bg-bg-2 hover:bg-bg-3 border border-bg-3 text-white rounded-full px-2.5 py-1 font-semibold"
          aria-label="Flip body view"
        >
          <RotateCw size={11} />
          Flip
        </button>
      </div>

      <div
        className="flex justify-center items-center"
        style={{ perspective: '1200px' }}
      >
        <div
          className="relative w-full max-w-[260px]"
          style={{
            aspectRatio: '200 / 380',
            transformStyle: 'preserve-3d',
            transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 600ms cubic-bezier(0.4, 0.2, 0.2, 1)',
          }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            <BodyFace
              regions={FRONT_REGIONS}
              hovered={!showBack ? hovered : null}
              onSelect={onSelectGroup}
              onHover={setHovered}
            />
          </div>
          {/* Back face — pre-rotated 180° so when the card is flipped it reads correctly */}
          <div
            className="absolute inset-0"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <BodyFace
              regions={BACK_REGIONS}
              hovered={showBack ? hovered : null}
              onSelect={onSelectGroup}
              onHover={setHovered}
            />
          </div>
        </div>
      </div>

      <div className="text-center mt-2 h-5">
        {hovered ? (
          <span className="text-[12px] text-accent-light font-bold uppercase tracking-wider">
            {hovered}
          </span>
        ) : (
          <span className="text-[11px] text-txt-muted">
            Tap a muscle to see its progress
          </span>
        )}
      </div>
    </div>
  )
}
