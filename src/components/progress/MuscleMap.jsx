// src/components/progress/MuscleMap.jsx
// Anatomical muscle map using react-body-highlighter (MIT licensed,
// ~70KB gzipped). The package ships with realistic anterior/posterior
// SVG illustrations and named clickable muscle regions.
//
// We keep the 3D card-flip animation: anterior face on the front,
// posterior on the back, parent rotates 180° to switch.
//
// On click, the package's named muscles map back to the app's broader
// muscle-group taxonomy (Chest, Back, Shoulders, ...) and the parent's
// onSelectGroup callback fires — same drill-through behavior as before.

import React, { useState } from 'react'
import { RotateCw } from 'lucide-react'
import Model from 'react-body-highlighter'

// Map our app's muscle groups → the muscle names react-body-highlighter
// understands. Trapezius is grouped with Back since most "back" lifts
// (rows, deadlifts, pull-ups) hit traps.
const GROUP_MUSCLES = {
  Chest:          ['chest'],
  Back:           ['upper-back', 'lower-back', 'trapezius'],
  Shoulders:      ['front-deltoids', 'back-deltoids'],
  Biceps:         ['biceps'],
  Triceps:        ['triceps'],
  Forearms:       ['forearm'],
  Core:           ['abs', 'obliques'],
  Legs:           ['quadriceps', 'hamstring', 'gluteal', 'adductor', 'abductors'],
  'Calves/Shins': ['calves', 'left-soleus', 'right-soleus'],
}

// Reverse lookup: muscle name → group name
const MUSCLE_TO_GROUP = (() => {
  const m = {}
  for (const [group, muscles] of Object.entries(GROUP_MUSCLES)) {
    for (const muscle of muscles) m[muscle] = group
  }
  return m
})()

// All muscles flattened, fed as one data entry per group so they all
// render in the highlighted color.
const DATA = Object.entries(GROUP_MUSCLES).map(([group, muscles]) => ({
  name: group,
  muscles,
}))

const HIGHLIGHTED_COLORS = ['#4F86F7']  // brand accent
const BODY_COLOR = '#272727'            // matches bg-3 — body has subtle silhouette

export default function MuscleMap({ onSelectGroup }) {
  const [showBack, setShowBack] = useState(false)
  const [hovered, setHovered] = useState(null)

  const handleMuscleClick = ({ muscle }) => {
    const group = MUSCLE_TO_GROUP[muscle]
    if (group && onSelectGroup) onSelectGroup(group)
  }

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

      <div className="flex justify-center" style={{ perspective: '1200px' }}>
        <div
          className="relative w-full max-w-[260px] mx-auto"
          style={{
            aspectRatio: '1 / 2',
            transformStyle: 'preserve-3d',
            transform: showBack ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transition: 'transform 600ms cubic-bezier(0.4, 0.2, 0.2, 1)',
          }}
        >
          {/* Front face — anatomical anterior view */}
          <div
            className="absolute inset-0 flex justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              pointerEvents: showBack ? 'none' : 'auto',
            }}
          >
            <Model
              data={DATA}
              type="anterior"
              highlightedColors={HIGHLIGHTED_COLORS}
              bodyColor={BODY_COLOR}
              onClick={handleMuscleClick}
              style={{ width: '100%', height: '100%' }}
              svgStyle={{ height: '100%', width: '100%' }}
            />
          </div>
          {/* Back face — anatomical posterior view, pre-rotated 180° */}
          <div
            className="absolute inset-0 flex justify-center"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              pointerEvents: showBack ? 'auto' : 'none',
            }}
          >
            <Model
              data={DATA}
              type="posterior"
              highlightedColors={HIGHLIGHTED_COLORS}
              bodyColor={BODY_COLOR}
              onClick={handleMuscleClick}
              style={{ width: '100%', height: '100%' }}
              svgStyle={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
      </div>

      <div className="text-center mt-2 h-5">
        <span className="text-[11px] text-txt-muted">
          Tap a muscle to see its progress
        </span>
      </div>
    </div>
  )
}
