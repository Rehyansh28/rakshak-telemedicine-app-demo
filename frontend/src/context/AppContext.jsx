import { useState, useEffect, useCallback } from 'react';
import {
  apiGet,
  apiPost,
  getStoredDoctor,
  getStoredStaff,
  getToken,
  getStaffToken,
  setStoredDoctor,
  setStoredStaff,
  clearAuth,
  clearStaffAuth,
} from '../api/client';
import { AppContext } from './app-context';

export function AppProvider({ children }) {
  const [selectedPatient, setSelectedPatientState] = useState(null);
  const [patientList, setPatientList] = useState([]);
  const [secureNode, setSecureNode] = useState('JOD-01');
  const [doctor, setDoctor] = useState(getStoredDoctor);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date());
  const [vitals, setVitals] = useState({
    heartRate: 0,
    spo2: 0,
    temp: 0,
    respiration: 16,
    bpSystolic: 120,
    bpDiastolic: 80,
  });
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [sensorProgress, setSensorProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(!!getToken());
  const [staff, setStaffState] = useState(getStoredStaff);
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(!!getStaffToken());
  const [role, setRole] = useState(null);
  const [patientFilter, setPatientFilter] = useState('all');
  const [patientSort, setPatientSort] = useState('priority');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [consultationControls, setConsultationControls] = useState({
    micMuted: false,
    videoOn: true,
    chatOpen: false,
  });
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const applyPatientVitals = useCallback((patient) => {
    if (!patient) return;
    setVitals({
      heartRate: patient.heartRate,
      spo2: patient.spo2,
      temp: patient.temp,
      respiration: patient.respiration ?? 16,
      bpSystolic: patient.bpSystolic ?? 120,
      bpDiastolic: patient.bpDiastolic ?? 80,
    });
  }, []);

  const selectPatient = useCallback(
    (patient) => {
      setSelectedPatientState(patient);
      if (patient) applyPatientVitals(patient);
    },
    [applyPatientVitals]
  );

  const refreshPatientList = useCallback(async () => {
    const patients = await apiGet('/patients/');
    setPatientList(patients);
    return patients;
  }, []);

  const setDoctorProfile = useCallback((profile) => {
    setDoctor(profile);
    setStoredDoctor(profile);
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setIsAuthenticated(false);
    setDoctor(null);
  }, []);

  const setStaff = useCallback((profile) => {
    setStaffState(profile);
    setStoredStaff(profile);
  }, []);

  const staffLogout = useCallback(() => {
    clearStaffAuth();
    setIsStaffAuthenticated(false);
    setStaffState(null);
  }, []);

  useEffect(() => {
    const ts = setInterval(() => setLiveTimestamp(new Date()), 1000);
    return () => clearInterval(ts);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      setLoading(true);
      setError(null);
      try {
        const [config, patients] = await Promise.all([
          apiGet('/config/'),
          apiGet('/patients/'),
        ]);
        if (cancelled) return;
        setSecureNode(config.secureNode);
        setPatientList(patients);
        if (patients.length > 0) {
          const first = patients[0];
          setSelectedPatientState(first);
          applyPatientVitals(first);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [applyPatientVitals]);

  useEffect(() => {
    if (!selectedPatient?.id) return;
    let cancelled = false;

    const refreshVitals = async () => {
      try {
        await apiPost(`/patients/${selectedPatient.id}/vitals/jitter/`);
        const detail = await apiGet(`/patients/${selectedPatient.id}/`);
        if (cancelled) return;
        setVitals({
          heartRate: detail.heartRate,
          spo2: detail.spo2,
          temp: detail.temp,
          respiration: detail.respiration ?? 16,
          bpSystolic: detail.bpSystolic ?? 120,
          bpDiastolic: detail.bpDiastolic ?? 80,
        });
        setPatientList((list) =>
          list.map((p) => (p.id === detail.id ? { ...p, ...detail } : p))
        );
        setSelectedPatientState((prev) =>
          prev?.id === detail.id ? { ...prev, ...detail } : prev
        );
      } catch {
        /* polling is best-effort */
      }
    };

    const interval = setInterval(refreshVitals, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [selectedPatient?.id]);

  const updateConsultationControl = useCallback((key, value) => {
    setConsultationControls((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = {
    secureNode,
    selectedPatient,
    setSelectedPatient: selectPatient,
    patientList,
    refreshPatientList,
    loading,
    error,
    doctor,
    setDoctor: setDoctorProfile,
    logout,
    staff,
    setStaff,
    isStaffAuthenticated,
    setIsStaffAuthenticated,
    staffLogout,
    liveTimestamp,
    vitals,
    selectedOrgan,
    setSelectedOrgan,
    sensorProgress,
    setSensorProgress,
    isAuthenticated,
    setIsAuthenticated,
    role,
    setRole,
    patientFilter,
    setPatientFilter,
    patientSort,
    setPatientSort,
    notificationsOpen,
    setNotificationsOpen,
    mobileNavOpen,
    setMobileNavOpen,
    sidebarCollapsed,
    setSidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed((c) => !c),
    profileOpen,
    setProfileOpen,
    consultationControls,
    updateConsultationControl,
    setConsultationControls,
    toast,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
