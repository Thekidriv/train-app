// src/lib/program.js
// Your 4-day split program. Targets prefill the Quick Log form;
// `note` shows as a small caption under the exercise name.
//
// Units: weight_kg in kilograms. For bodyweight exercises set weight: 0.
// For time-based exercises (planks, hangs, balance holds), log the SECONDS
// in the reps column — noted in the exercise `note`.

export const WORKOUT_TYPES = ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Rest']

export const PROGRAM = {
  'Upper A': {
    title: 'Upper A — Chest + Back',
    duration: '~55 min',
    exercises: [
      {
        name: 'Bench Press',
        sets: 4, reps: 5, weight: 72.5,
        group: 'Main',
        note: '2s pause on set 1. Add 2.5kg when all sets clean.',
      },
      {
        name: 'Weighted Pull-Ups',
        sets: 4, reps: 5, weight: 5,
        group: 'Main',
        note: '+5kg belt or DB between feet.',
      },
      {
        name: 'Incline DB Press',
        sets: 3, reps: 10, weight: 20,
        group: 'Superset A',
        note: '3s eccentric, full stretch at bottom.',
      },
      {
        name: 'Chest-Supported DB Row',
        sets: 3, reps: 10, weight: 25,
        group: 'Superset A',
        note: '1s squeeze, wrist neutral.',
      },
      {
        name: 'DB Lateral Raise',
        sets: 3, reps: 14, weight: 7,
        group: 'Superset B',
        note: 'Pinky up, no momentum.',
      },
      {
        name: 'Cable Face Pull',
        sets: 3, reps: 14, weight: 30,
        group: 'Superset B',
        note: 'Elbows high, pull to forehead.',
      },
      {
        name: 'Reverse Curls',
        sets: 3, reps: 12, weight: 15,
        group: 'Superset C — Wrist Rehab',
        note: 'EZ bar, slow eccentric.',
      },
      {
        name: 'Wrist Curls',
        sets: 3, reps: 15, weight: 7.5,
        group: 'Superset C — Wrist Rehab',
        note: 'Forearm on bench, palms up.',
      },
    ],
  },

  'Lower A': {
    title: 'Lower A — Quads Focus',
    duration: '~50 min',
    exercises: [
      {
        name: 'Back Squat',
        sets: 4, reps: 7, weight: 70,
        group: 'Main',
        note: 'Add 2.5kg when top set hits 8 clean.',
      },
      {
        name: 'Walking Lunges',
        sets: 3, reps: 10, weight: 10,
        group: 'Superset A',
        note: '10/leg. Replaces Bulgarian split squats.',
      },
      {
        name: 'Cable Crunch',
        sets: 3, reps: 13, weight: 50,
        group: 'Superset A',
        note: 'Kneel, elbows to knees.',
      },
      {
        name: 'Spanish Squat',
        sets: 3, reps: 13, weight: 10,
        group: 'Superset B',
        note: 'Band or cable, knees track toes.',
      },
      {
        name: 'Hanging Knee Raise',
        sets: 3, reps: 11, weight: 0,
        group: 'Superset B',
        note: 'Bodyweight. Controlled.',
      },
      {
        name: 'Calf Raise',
        sets: 3, reps: 15, weight: 20,
        group: 'Superset C — Shin Rehab',
        note: 'Full ROM, 1s pause at top.',
      },
      {
        name: 'Tibialis Raises',
        sets: 3, reps: 20, weight: 0,
        group: 'Superset C — Shin Rehab',
        note: 'Bodyweight. Overpronation fix.',
      },
    ],
  },

  'Upper B': {
    title: 'Upper B — Shoulders + Back',
    duration: '~55 min',
    exercises: [
      {
        name: 'Push Press',
        sets: 4, reps: 7, weight: 40,
        group: 'Main',
        note: 'Standing BB. Replaces seated OHP.',
      },
      {
        name: 'Pull-Ups AMRAP',
        sets: 3, reps: 0, weight: 0,
        group: 'Main',
        note: 'Bodyweight max reps. Last 2 reps = 5s slow negative.',
      },
      {
        name: 'Chest-Supported DB Row',
        sets: 4, reps: 9, weight: 30,
        group: 'Superset A',
        note: 'Heavier than Upper A.',
      },
      {
        name: 'Archer Push-Ups',
        sets: 4, reps: 8, weight: 0,
        group: 'Superset A',
        note: '8/side. Bodyweight, slow, full reach.',
      },
      {
        name: 'Single-Arm Lat Pulldown',
        sets: 3, reps: 10, weight: 17.5,
        group: 'Superset B',
        note: '10/side. Full stretch at top.',
      },
      {
        name: 'DB Lateral Raise',
        sets: 3, reps: 13, weight: 7,
        group: 'Superset B',
        note: 'Slight forward lean.',
      },
      {
        name: 'Hammer Curls',
        sets: 3, reps: 11, weight: 12.5,
        group: 'Superset C',
        note: 'Strict, wrist neutral.',
      },
      {
        name: 'Dead Hangs',
        sets: 3, reps: 0, weight: 0,
        group: 'Superset C',
        note: 'Max time. Log SECONDS in reps column.',
      },
    ],
  },

  'Lower B': {
    title: 'Lower B — Glutes + Hamstrings',
    duration: '~50 min',
    exercises: [
      {
        name: 'Romanian Deadlift',
        sets: 4, reps: 7, weight: 62.5,
        group: 'Main',
        note: 'Add 5kg when top set hits 8.',
      },
      {
        name: 'Barbell Hip Thrust',
        sets: 3, reps: 11, weight: 60,
        group: 'Main',
        note: 'Full squeeze at top.',
      },
      {
        name: 'Walking Lunges',
        sets: 3, reps: 8, weight: 12.5,
        group: 'Superset A',
        note: '8/leg. Glute bias, forward lean.',
      },
      {
        name: 'Weighted Plank',
        sets: 3, reps: 45, weight: 15,
        group: 'Superset A',
        note: '15kg plate. Log SECONDS in reps column.',
      },
      {
        name: 'Single-Leg Calf Raise',
        sets: 3, reps: 10, weight: 10,
        group: 'Superset B',
        note: '10/leg. Full ROM.',
      },
      {
        name: 'Tibialis Raises',
        sets: 3, reps: 20, weight: 0,
        group: 'Superset B',
        note: 'Heels on wall.',
      },
      {
        name: 'Cable Woodchopper',
        sets: 3, reps: 12, weight: 20,
        group: 'Superset C — Stability',
        note: '12/side. Rotational, controlled.',
      },
      {
        name: 'Single-Leg Balance',
        sets: 3, reps: 30, weight: 0,
        group: 'Superset C — Stability',
        note: '30s/side. Folded towel. Log SECONDS in reps.',
      },
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
