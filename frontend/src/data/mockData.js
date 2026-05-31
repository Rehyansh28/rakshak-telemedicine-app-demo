export const SECURE_NODE = 'JOD-01';

export const doctorProfile = {
  name: 'Col. Dr. Arjun Mehta',
  rank: 'Colonel',
  unit: 'Army Medical Corps',
  avatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAGu5kWmnvvYL57JiCxZgBaoPiswIFoiq1OjqJo8nVcpgCcWwxrGWkwk5k-e3mf7O3XxL2wbgT6yYI6vGl5T9-F6w8xW30TCqdFXSxGDCthuDGz5dixKvCCbjjq6sZ4TtdsaHUrfKK8S7sTeNC3iHVe7CDmnwR8CdEGsDCAzpXJZfIGK8w1TM7TiEWJYvWRNgl1Ic031opu6Izn4vegNy65Px5lh0hLqPyzTTNkaVTOczTIQ_8_5Sn5VVMj9XtZsnizBRotC0mnKB0',
};

export const hologramImage =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDJ2bhoNN-njM64sR_zSqx0CCusOt-7QFNB9aGbmU5U6PbUsW651Z0UR8TMiHUFBO3crkc7c5o95_2Vz7f4aUFpinb8FjY08Xx0kii9sHXYzqxaav8aTdhD0QKycBfhDd8lmsce1xZk7qFrK4GTqgcfkE1L3egs75mtVB5ruYcz7CY5RbsiMdX8R8Ssej5isJASfThI7cmm0jDhXPuIjI0SBgdvoLB_MEXrel92oAQHRuv-9nDvLnkp1SMQ3zwECtbdrP1GetxgxQw';

export const patients = [
  {
    id: 'IA-SLD-2847',
    name: 'Nk. Rajesh Kumar',
    rank: 'Naik',
    regiment: '14 Rajput',
    status: 'critical',
    altitude: 14200,
    heartRate: 118,
    spo2: 89,
    temp: 37.8,
    fatigue: 78,
    stress: 72,
    location: 'Siachen Forward Post',
    lastUpdate: '2 min ago',
  },
  {
    id: 'IA-SLD-1923',
    name: 'Hav. Vikram Singh',
    rank: 'Havildar',
    regiment: '9 Para SF',
    status: 'monitoring',
    altitude: 11800,
    heartRate: 72,
    spo2: 97,
    temp: 36.4,
    fatigue: 42,
    stress: 35,
    location: 'Leh Sector HQ',
    lastUpdate: '5 min ago',
  },
  {
    id: 'IA-SLD-3102',
    name: 'Sep. Amit Sharma',
    rank: 'Sepoy',
    regiment: '5 Gorkha Rifles',
    status: 'stable',
    altitude: 9800,
    heartRate: 68,
    spo2: 99,
    temp: 36.2,
    fatigue: 28,
    stress: 22,
    location: 'Dras Medical Camp',
    lastUpdate: '12 min ago',
  },
  {
    id: 'IA-SLD-4451',
    name: 'Lt. Priya Nair',
    rank: 'Lieutenant',
    regiment: 'Army Medical Corps',
    status: 'consultation',
    altitude: 10500,
    heartRate: 76,
    spo2: 96,
    temp: 36.6,
    fatigue: 55,
    stress: 48,
    location: 'Kargil Relay Station',
    lastUpdate: 'LIVE',
  },
];

export const activePatient = patients[0];

export const emergencyAlerts = [
  {
    id: 1,
    type: 'critical',
    title: 'SpO2 Critical Drop',
    patient: 'Nk. Rajesh Kumar',
    soldierId: 'IA-SLD-2847',
    message: 'Oxygen saturation dropped to 89% — altitude sickness risk HIGH',
    time: '00:42 ago',
  },
  {
    id: 2,
    type: 'warning',
    title: 'Elevated Heart Rate',
    patient: 'Nk. Rajesh Kumar',
    soldierId: 'IA-SLD-2847',
    message: 'Sustained tachycardia at 118 BPM for 15 minutes',
    time: '03:15 ago',
  },
  {
    id: 3,
    type: 'info',
    title: 'AI Recommendation',
    patient: 'Hav. Vikram Singh',
    soldierId: 'IA-SLD-1923',
    message: 'Schedule hydration protocol — fatigue index rising',
    time: '08:22 ago',
  },
];

export const aiRecommendations = [
  'Initiate supplemental O2 protocol for IA-SLD-2847',
  'Monitor cardiac rhythm — irregular pattern detected',
  'Recommend descent to 10,000 ft within 6 hours',
  'Administer acetazolamide per altitude protocol',
];

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

export const aiInsights = {
  fatiguePrediction: 78,
  altitudeSicknessRisk: 85,
  cardiacRisk: 62,
  stressScore: 72,
  readiness: 45,
  trends: {
    heartRate: [
      { t: '00:00', v: 68 },
      { t: '04:00', v: 72 },
      { t: '08:00', v: 85 },
      { t: '12:00', v: 98 },
      { t: '16:00', v: 110 },
      { t: '20:00', v: 118 },
    ],
    spo2: [
      { t: '00:00', v: 97 },
      { t: '04:00', v: 96 },
      { t: '08:00', v: 94 },
      { t: '12:00', v: 92 },
      { t: '16:00', v: 90 },
      { t: '20:00', v: 89 },
    ],
    stress: [
      { t: 'Mon', v: 45 },
      { t: 'Tue', v: 52 },
      { t: 'Wed', v: 58 },
      { t: 'Thu', v: 65 },
      { t: 'Fri', v: 72 },
    ],
  },
};

export const medicalReport = {
  reportId: 'RXR-2026-IA-2847',
  generatedAt: new Date().toISOString(),
  patient: activePatient,
  doctor: doctorProfile,
  diagnosis: 'Acute Mountain Sickness (AMS) — Stage II',
  organs: [
    { name: 'Heart', status: 'Tachycardia', value: '118 BPM' },
    { name: 'Lungs', status: 'Hypoxemia', value: 'SpO2 89%' },
    { name: 'Brain', status: 'Stress Elevated', value: 'Score 72' },
  ],
  timeline: [
    { time: '14:32', event: 'Sensor sync initiated' },
    { time: '14:35', event: 'Vitals baseline captured' },
    { time: '14:41', event: 'AI alert: SpO2 drop detected' },
    { time: '14:45', event: 'Live consultation started' },
    { time: '14:52', event: 'AR diagnostic scan complete' },
  ],
  notes:
    'Patient presents with symptoms consistent with high-altitude hypoxia. Recommend immediate O2 supplementation and monitored descent. Follow-up in 4 hours.',
  hash: 'SHA-256: a3f8c2...9d4e1b',
};

export const sensorSteps = [
  { id: 1, label: 'ECG Patch', icon: 'heart', status: 'connected' },
  { id: 2, label: 'SpO2 Sensor', icon: 'droplets', status: 'connected' },
  { id: 3, label: 'Temp Probe', icon: 'thermometer', status: 'syncing' },
  { id: 4, label: 'STRAT-LINK', icon: 'shield', status: 'pending' },
];

export const recentActivity = [
  { action: 'Consultation ended', patient: 'Sep. Amit Sharma', time: '18 min ago' },
  { action: 'Report generated', patient: 'Hav. Vikram Singh', time: '1 hr ago' },
  { action: 'Emergency alert resolved', patient: 'Lt. Priya Nair', time: '2 hr ago' },
];

export function generateEcgPoints(length = 40) {
  const points = [];
  for (let i = 0; i < length; i++) {
    const base = 50;
    const spike = i % 8 === 3 ? 90 : i % 8 === 4 ? 20 : base + Math.sin(i * 0.5) * 8;
    points.push({ x: i, y: spike + Math.random() * 5 });
  }
  return points;
}
