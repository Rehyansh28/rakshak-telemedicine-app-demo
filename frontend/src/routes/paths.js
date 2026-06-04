export const PATHS = {
  home: '/',
  roleSelection: '/role-selection',
  superadminuser: '/superadminuser',
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
  staff: {
    login: '/staff/login',
    dashboard: '/staff/dashboard',
    patients: '/staff/patients',
    select: '/staff/patients',
    sensors: '/staff/sensors',
    camera: '/staff/camera',
    waitingRoom: '/staff/waiting-room',
  },
  /** @deprecated Use PATHS.staff — redirects kept in router */
  patient: {
    sensors: '/staff/sensors',
    camera: '/staff/camera',
    waitingRoom: '/staff/waiting-room',
  },
};
