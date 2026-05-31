export const PATHS = {
  home: '/',
  roleSelection: '/role-selection',
  doctor: {
    login: '/doctor/login',
    dashboard: '/doctor/dashboard',
    patients: '/doctor/patients',
    consultation: '/doctor/consultation',
    arDiagnostic: '/doctor/ar-diagnostic',
    organ: (id) => `/doctor/organ/${id}`,
    aiInsights: '/doctor/ai-insights',
    report: '/doctor/report',
  },
  patient: {
    sensors: '/patient/sensors',
    camera: '/patient/camera',
    waitingRoom: '/patient/waiting-room',
  },
};
