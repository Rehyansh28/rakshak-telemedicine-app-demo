/**
 * Fallback organ labels for AR body map (offline / before API load).
 * Live diagnostics use GET /api/patients/:id/organs/ via OrganInfoPanel.
 */
export const organData = {
  heart: {
    label: 'Cardiac System',
    bpm: 72,
    rhythm: 'Sinus Rhythm',
    sound: 'S1/S2 Normal',
    risk: 'Moderate',
    ecgPoints: [20, 25, 80, 30, 22, 28, 75, 32, 24, 26, 78, 28, 21, 27, 82, 31],
  },
  lungs: { label: 'Pulmonary', spo2: 98, capacity: '4.2L', risk: 'Low' },
  brain: { label: 'Neural Stress', score: 68, cortisol: 'Elevated', risk: 'Moderate' },
  chest: { label: 'Thoracic', o2: 98, pressure: 'Normal', risk: 'Low' },
  arms: { label: 'Peripheral BP', systolic: 120, diastolic: 80, risk: 'Low' },
  legs: { label: 'Circulation', perfusion: 'Good', edema: 'None', risk: 'Low' },
  nose: { label: 'Respiration', rate: 16, pattern: 'Regular', risk: 'Low' },
};
