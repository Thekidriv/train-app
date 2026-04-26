// src/lib/program.js
// Workout catalog. Two phases coexist:
//   - "original": the baseline 4-day split.
//   - "until-recovery": a temporary upper-body-only program for the duration
//     of a tibial stress reaction. Lives alongside the original — switching
//     phases never deletes data.
//
// Exercise NAMES are the implicit join key for progression history. If a
// recovery exercise reuses an exact name from the original program (e.g.
// "Bench Press"), the Progress charts and last-session prefill auto-share
// data. New names start a fresh history.
//
// Each exercise carries a `category` that drives the suggestion engine:
//   'main'        — barbell/DB compound; +2.5kg when clean at RPE ≤8
//   'weighted-bw' — weighted bodyweight (pull-ups, chin-ups); +2.5kg
//   'accessory'   — higher-rep iso/secondary; +1kg when top of range hit
//   'rehab'       — form-priority; +1kg max, only if previous was clean
//   'amrap'       — bodyweight max-rep (AMRAP, push-ups); beat last + 1
//   'time'        — time-hold (planks, hangs, balance); beat last + 5s
//
// `trial: true` flags a movement as "verify no pain on first log" — see
// trialStatus in settings.js for state. `unit` is for time-based moves.

export const WORKOUT_TYPES_ORIGINAL = ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Rest']
export const WORKOUT_TYPES_RECOVERY = [
  'Upper A - Until Recovery',
  'Recovery + Core A - Until Recovery',
  'Upper B - Until Recovery',
  'Recovery + Core B - Until Recovery',
  'Rest',
]
// Backwards compatibility — legacy code imports WORKOUT_TYPES.
export const WORKOUT_TYPES = [
  ...WORKOUT_TYPES_ORIGINAL.filter(t => t !== 'Rest'),
  ...WORKOUT_TYPES_RECOVERY.filter(t => t !== 'Rest'),
  'Rest',
]

export const PROGRAM = {
  // ─── ORIGINAL PHASE ────────────────────────────────────────────

  'Upper A': {
    title: 'Upper A — Chest + Back',
    duration: '~55 min',
    phase: 'original',
    exercises: [
      { name: 'Bench Press', sets: 4, reps: 5, weight: 72.5, group: 'Main', category: 'main', note: '2s pause on set 1. Add 2.5kg when all sets clean.' },
      { name: 'Weighted Pull-Ups', sets: 4, reps: 5, weight: 5, group: 'Main', category: 'weighted-bw', note: '+5kg belt or DB between feet.' },
      { name: 'Incline DB Press', sets: 3, reps: 10, weight: 20, group: 'Superset A', category: 'accessory', note: '3s eccentric, full stretch at bottom.' },
      { name: 'Chest-Supported DB Row', sets: 3, reps: 10, weight: 25, group: 'Superset A', category: 'accessory', note: '1s squeeze, wrist neutral.' },
      { name: 'DB Lateral Raise', sets: 3, reps: 14, weight: 7, group: 'Superset B', category: 'accessory', note: 'Pinky up, no momentum.' },
      { name: 'Cable Face Pull', sets: 3, reps: 14, weight: 30, group: 'Superset B', category: 'accessory', note: 'Elbows high, pull to forehead.' },
      { name: 'Reverse Curls', sets: 3, reps: 12, weight: 15, group: 'Superset C — Wrist Rehab', category: 'rehab', note: 'EZ bar, slow eccentric.' },
      { name: 'Wrist Curls', sets: 3, reps: 15, weight: 7.5, group: 'Superset C — Wrist Rehab', category: 'rehab', note: 'Forearm on bench, palms up.' },
    ],
  },

  'Lower A': {
    title: 'Lower A — Quads Focus',
    duration: '~50 min',
    phase: 'original',
    exercises: [
      { name: 'Back Squat', sets: 4, reps: 7, weight: 70, group: 'Main', category: 'main', note: 'Add 2.5kg when top set hits 8 clean.' },
      { name: 'Walking Lunges', sets: 3, reps: 10, weight: 10, group: 'Superset A', category: 'accessory', note: '10/leg. Replaces Bulgarian split squats.' },
      { name: 'Cable Crunch', sets: 3, reps: 13, weight: 50, group: 'Superset A', category: 'accessory', note: 'Kneel, elbows to knees.' },
      { name: 'Spanish Squat', sets: 3, reps: 13, weight: 10, group: 'Superset B', category: 'accessory', note: 'Band or cable, knees track toes.' },
      { name: 'Hanging Knee Raise', sets: 3, reps: 11, weight: 0, group: 'Superset B', category: 'accessory', note: 'Bodyweight. Controlled.' },
      { name: 'Calf Raise', sets: 3, reps: 15, weight: 20, group: 'Superset C — Shin Rehab', category: 'accessory', note: 'Full ROM, 1s pause at top.' },
      { name: 'Tibialis Raises', sets: 3, reps: 20, weight: 0, group: 'Superset C — Shin Rehab', category: 'rehab', note: 'Bodyweight. Overpronation fix.' },
    ],
  },

  'Upper B': {
    title: 'Upper B — Shoulders + Back',
    duration: '~55 min',
    phase: 'original',
    exercises: [
      { name: 'Push Press', sets: 4, reps: 7, weight: 40, group: 'Main', category: 'main', note: 'Standing BB. Replaces seated OHP.' },
      { name: 'Pull-Ups AMRAP', sets: 3, reps: 0, weight: 0, group: 'Main', category: 'amrap', note: 'Bodyweight max reps. Last 2 reps = 5s slow negative.' },
      { name: 'Chest-Supported DB Row', sets: 4, reps: 9, weight: 30, group: 'Superset A', category: 'accessory', note: 'Heavier than Upper A.' },
      { name: 'Archer Push-Ups', sets: 4, reps: 8, weight: 0, group: 'Superset A', category: 'amrap', note: '8/side. Bodyweight, slow, full reach.' },
      { name: 'Single-Arm Lat Pulldown', sets: 3, reps: 10, weight: 17.5, group: 'Superset B', category: 'accessory', note: '10/side. Full stretch at top.' },
      { name: 'DB Lateral Raise', sets: 3, reps: 13, weight: 7, group: 'Superset B', category: 'accessory', note: 'Slight forward lean.' },
      { name: 'Hammer Curls', sets: 3, reps: 11, weight: 12.5, group: 'Superset C', category: 'accessory', note: 'Strict, wrist neutral.' },
      { name: 'Dead Hangs', sets: 3, reps: 0, weight: 0, group: 'Superset C', category: 'time', unit: 'seconds', note: 'Max time. Log SECONDS in reps column.' },
    ],
  },

  'Lower B': {
    title: 'Lower B — Glutes + Hamstrings',
    duration: '~50 min',
    phase: 'original',
    exercises: [
      { name: 'Romanian Deadlift', sets: 4, reps: 7, weight: 62.5, group: 'Main', category: 'main', note: 'Add 5kg when top set hits 8.' },
      { name: 'Barbell Hip Thrust', sets: 3, reps: 11, weight: 60, group: 'Main', category: 'main', note: 'Full squeeze at top.' },
      { name: 'Walking Lunges', sets: 3, reps: 8, weight: 12.5, group: 'Superset A', category: 'accessory', note: '8/leg. Glute bias, forward lean.' },
      { name: 'Weighted Plank', sets: 3, reps: 45, weight: 15, group: 'Superset A', category: 'time', unit: 'seconds', note: '15kg plate. Log SECONDS in reps column.' },
      { name: 'Single-Leg Calf Raise', sets: 3, reps: 10, weight: 10, group: 'Superset B', category: 'accessory', note: '10/leg. Full ROM.' },
      { name: 'Tibialis Raises', sets: 3, reps: 20, weight: 0, group: 'Superset B', category: 'rehab', note: 'Heels on wall.' },
      { name: 'Cable Woodchopper', sets: 3, reps: 12, weight: 20, group: 'Superset C — Stability', category: 'accessory', note: '12/side. Rotational, controlled.' },
      { name: 'Single-Leg Balance', sets: 3, reps: 30, weight: 0, group: 'Superset C — Stability', category: 'time', unit: 'seconds', note: '30s/side. Folded towel. Log SECONDS in reps.' },
    ],
  },

  // ─── UNTIL-RECOVERY PHASE ──────────────────────────────────────

  'Upper A - Until Recovery': {
    title: 'Upper A — Recovery (Chest, Back, Arms)',
    duration: '~60 min',
    phase: 'until-recovery',
    exercises: [
      // Shared with original (same name → shared progression history)
      { name: 'Bench Press', sets: 4, reps: 5, weight: 72.5, group: 'Main', category: 'main', note: '2s pause on set 1.' },
      { name: 'Weighted Pull-Ups', sets: 4, reps: 5, weight: 5, group: 'Main', category: 'weighted-bw', note: '+5kg belt or DB between feet.' },
      { name: 'Incline DB Press', sets: 4, reps: 8, weight: 20, group: 'Superset A', category: 'accessory', note: '3s eccentric.' },
      { name: 'Chest-Supported DB Row', sets: 4, reps: 10, weight: 25, group: 'Superset A', category: 'accessory', note: '1s squeeze.' },
      // New
      { name: 'DB Flyes', sets: 3, reps: 12, weight: 10, group: 'Superset B', category: 'accessory', note: 'Full stretch.' },
      { name: 'Single-Arm Lat Pulldown', sets: 3, reps: 10, weight: 17.5, group: 'Superset B', category: 'accessory', note: '10/side. Full stretch top.' },
      { name: 'EZ Bar Curl', sets: 4, reps: 8, weight: 20, group: 'Superset C', category: 'accessory', note: 'Strict.' },
      { name: 'Close-Grip Bench Press', sets: 4, reps: 8, weight: 50, group: 'Superset C', category: 'main', note: 'Elbows tucked.' },
      { name: 'Reverse Curls', sets: 3, reps: 12, weight: 15, group: 'Superset D — Wrist Rehab', category: 'rehab', note: 'EZ bar, slow eccentric.' },
      { name: 'Wrist Curls', sets: 3, reps: 15, weight: 7.5, group: 'Superset D — Wrist Rehab', category: 'rehab', note: 'Forearm on bench, palms up.' },
    ],
  },

  'Recovery + Core A - Until Recovery': {
    title: 'Recovery + Core A — Back, Arms, Core',
    duration: '~55 min',
    phase: 'until-recovery',
    exercises: [
      { name: 'Seated Cable Row (Heavy)', sets: 4, reps: 8, weight: 50, group: 'Main', category: 'main', note: '+2.5kg when clean.' },
      { name: 'Lat Pulldown (Heavy)', sets: 4, reps: 8, weight: 50, group: 'Main', category: 'main', note: '+2.5kg when clean.' },
      { name: 'Hammer Curls', sets: 4, reps: 10, weight: 12.5, group: 'Superset A', category: 'accessory', note: 'Strict, wrist neutral.' },
      { name: 'Overhead Tricep Extension', sets: 4, reps: 10, weight: 15, group: 'Superset A', category: 'accessory', note: 'Full stretch overhead.' },
      { name: 'Reverse Wrist Curls', sets: 3, reps: 15, weight: 5, group: 'Superset B — Forearm', category: 'rehab', note: 'Palms down.' },
      { name: 'Plate Pinches', sets: 3, reps: 30, weight: 10, group: 'Superset B — Forearm', category: 'time', unit: 'seconds', note: '2x10kg plates pinched. Log SECONDS in reps.' },
      { name: 'Cable Crunch', sets: 3, reps: 13, weight: 50, group: 'Superset C — Core', category: 'accessory', note: 'Kneel, elbows to knees.' },
      { name: 'Pallof Press', sets: 3, reps: 12, weight: 15, group: 'Superset C — Core', category: 'accessory', note: '12/side. Hold tension.' },
      { name: 'Hanging Knee Raise', sets: 3, reps: 11, weight: 0, group: 'Superset D — Core', category: 'accessory', note: 'Bodyweight. Controlled.' },
      { name: 'Lying Leg Curl', sets: 3, reps: 12, weight: 20, group: 'Superset D — Core', category: 'accessory', trial: true, note: 'TRIAL — stop if focal shin pain. Load is at the cuff, not axial.' },
    ],
  },

  'Upper B - Until Recovery': {
    title: 'Upper B — Recovery (Shoulders, Back, Arms)',
    duration: '~60 min',
    phase: 'until-recovery',
    exercises: [
      { name: 'Seated DB Shoulder Press', sets: 4, reps: 7, weight: 22.5, group: 'Main', category: 'main', note: '+1kg/DB when clean. Replaces Push Press for the recovery phase.' },
      { name: 'Pull-Ups AMRAP', sets: 3, reps: 0, weight: 0, group: 'Main', category: 'amrap', note: 'Bodyweight max reps. Last 2 = 5s slow negative.' },
      { name: 'Chest-Supported DB Row', sets: 4, reps: 9, weight: 30, group: 'Superset A', category: 'accessory', note: 'Heavier.' },
      { name: 'Archer Push-Ups', sets: 4, reps: 8, weight: 0, group: 'Superset A', category: 'amrap', note: '8/side. Bodyweight, slow.' },
      { name: 'DB Lateral Raise', sets: 4, reps: 12, weight: 7, group: 'Superset B', category: 'accessory', note: 'Pinky up.' },
      { name: 'Cable Face Pull', sets: 4, reps: 14, weight: 30, group: 'Superset B', category: 'accessory', note: 'Elbows high.' },
      { name: 'Incline DB Curl', sets: 4, reps: 10, weight: 10, group: 'Superset C', category: 'accessory', note: 'Bench at 60°.' },
      { name: 'DB Skullcrushers', sets: 4, reps: 10, weight: 12.5, group: 'Superset C', category: 'accessory', note: 'Full ROM.' },
      { name: 'Hammer Curls', sets: 3, reps: 11, weight: 12.5, group: 'Superset D', category: 'accessory', note: 'Strict.' },
      { name: 'Dead Hangs', sets: 3, reps: 0, weight: 0, group: 'Superset D', category: 'time', unit: 'seconds', note: 'Max time. Step UP to bar (no jump).' },
    ],
  },

  'Recovery + Core B - Until Recovery': {
    title: 'Recovery + Core B — Push, Pull, Core',
    duration: '~55 min',
    phase: 'until-recovery',
    exercises: [
      { name: 'Incline Bench Press', sets: 4, reps: 6, weight: 55, group: 'Main', category: 'main', note: '+2.5kg when clean.' },
      { name: 'Weighted Chin-Ups', sets: 4, reps: 6, weight: 2.5, group: 'Main', category: 'weighted-bw', note: '+2.5kg when clean.' },
      { name: 'Cable Crossovers', sets: 4, reps: 12, weight: 15, group: 'Superset A', category: 'accessory', note: 'High-to-low, squeeze.' },
      { name: 'Push-Ups', sets: 4, reps: 0, weight: 0, group: 'Superset A', category: 'amrap', note: 'Max reps. Step UP to position (no jumping).' },
      { name: 'Cable Curl', sets: 4, reps: 10, weight: 25, group: 'Superset B', category: 'accessory', note: 'Constant tension.' },
      { name: 'Tricep Pushdown', sets: 4, reps: 12, weight: 25, group: 'Superset B', category: 'accessory', note: 'Full ROM.' },
      { name: "Farmer's Carry Static Hold", sets: 3, reps: 30, weight: 25, group: 'Superset C — Forearm', category: 'time', unit: 'seconds', note: '25kg DBs. Log SECONDS. Hold static — DO NOT walk.' },
      { name: 'Wrist Roller', sets: 3, reps: 2, weight: 5, group: 'Superset C — Forearm', category: 'rehab', note: '2 rolls up + down. Or sub Wrist Curls 3×15 @ 7.5kg.' },
      { name: 'Weighted Plank', sets: 3, reps: 45, weight: 15, group: 'Superset D — Core', category: 'time', unit: 'seconds', note: '15kg plate. Log SECONDS.' },
      { name: 'Side Plank', sets: 3, reps: 30, weight: 0, group: 'Superset D — Core', category: 'time', unit: 'seconds', note: '30s/side. Log SECONDS.' },
    ],
  },
}

/** Lookup exercises for a workout_type. Returns [] for Rest / unknown. */
export function exercisesFor(workoutType) {
  const entry = PROGRAM[workoutType]
  return entry ? entry.exercises : []
}

/** Lookup the display title for a workout_type. */
export function titleFor(workoutType) {
  const entry = PROGRAM[workoutType]
  return entry ? entry.title : workoutType
}

/** Phase a workout belongs to ('original' | 'until-recovery' | null for Rest). */
export function phaseFor(workoutType) {
  const entry = PROGRAM[workoutType]
  return entry ? entry.phase : null
}

/** All workout types for a given phase, in display order. */
export function workoutTypesInPhase(phase) {
  if (phase === 'until-recovery') return WORKOUT_TYPES_RECOVERY
  return WORKOUT_TYPES_ORIGINAL
}
