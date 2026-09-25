// Detective Dr. Jellybone — melody library.
// All tunes are in C-diatonic so they work with our bell set.
// `null` entries are RESTS — silent beats that preserve the rhythm so the tune
// is recognizable, but aren't shown as numbered slots and aren't wrong-note candidates.

export const DETECTIVE_TUNES = [
  // ===== Beginner: very familiar nursery tunes =====
  {
    id: 'twinkle',
    name: 'Twinkle Twinkle Little Star',
    level: 'easy',
    notes: ['C', 'C', 'G', 'G', 'A', 'A', 'G', null, 'F', 'F', 'E', 'E', 'D', 'D', 'C'],
  },
  {
    id: 'mary_lamb',
    name: 'Mary Had a Little Lamb',
    level: 'easy',
    notes: ['E', 'D', 'C', 'D', 'E', 'E', 'E', null, 'D', 'D', 'D', null, 'E', 'G', 'G'],
  },
  {
    id: 'hot_cross',
    name: 'Hot Cross Buns',
    level: 'easy',
    notes: ['E', 'D', 'C', null, 'E', 'D', 'C'],
  },
  {
    id: 'row_boat',
    name: 'Row Row Row Your Boat',
    level: 'easy',
    notes: ['C', 'C', 'C', 'D', 'E', null, 'E', 'D', 'E', 'F', 'G'],
  },

  // ===== Intermediate =====
  {
    id: 'frere_jacques',
    name: 'Frère Jacques',
    level: 'medium',
    notes: ['C', 'D', 'E', 'C', null, 'C', 'D', 'E', 'C', null, 'E', 'F', 'G', null, 'E', 'F', 'G'],
  },
  {
    id: 'london_bridge',
    name: 'London Bridge',
    level: 'medium',
    notes: ['G', 'A', 'G', 'F', 'E', 'F', 'G', null, 'D', 'E', 'F', null, 'E', 'F', 'G'],
  },
  {
    id: 'old_macdonald',
    name: 'Old MacDonald',
    level: 'medium',
    notes: ['G', 'G', 'G', 'D', 'E', 'E', 'D', null, 'B', 'B', 'A', 'A', 'G'],
  },
  {
    id: 'when_saints_short',
    name: 'When the Saints',
    level: 'medium',
    notes: ['C', 'E', 'F', 'G', null, 'C', 'E', 'F', 'G', null, 'C', 'E', 'F', 'G', 'E', 'C', 'E', 'D'],
  },

  // ===== Master =====
  {
    id: 'ode_to_joy',
    name: 'Ode to Joy',
    level: 'hard',
    notes: ['E', 'E', 'F', 'G', 'G', 'F', 'E', 'D', 'C', 'C', 'D', 'E', 'E', 'D', 'D'],
  },
  {
    id: 'jingle_bells',
    name: 'Jingle Bells',
    level: 'hard',
    notes: ['E', 'E', 'E', null, 'E', 'E', 'E', null, 'E', 'G', 'C', 'D', 'E'],
  },
  {
    id: 'happy_birthday',
    name: 'Birthday Tune',
    level: 'hard',
    notes: ['C', 'C', 'D', 'C', 'F', 'E', null, 'C', 'C', 'D', 'C', 'G', 'F'],
  },
];

// All 8 diatonic bells in scale-order. Used for "swap by N scale steps" logic.
export const SCALE_ORDER = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'High C'];
