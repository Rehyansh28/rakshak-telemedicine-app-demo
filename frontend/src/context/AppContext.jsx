import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { patients, activePatient as defaultPatient, SECURE_NODE } from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [selectedPatient, setSelectedPatient] = useState(defaultPatient);
  const [patientList] = useState(patients);
  const [liveTimestamp, setLiveTimestamp] = useState(new Date());
  const [vitals, setVitals] = useState({
    heartRate: defaultPatient.heartRate,
    spo2: defaultPatient.spo2,
    temp: defaultPatient.temp,
    respiration: 16,
    bpSystolic: 120,
    bpDiastolic: 80,
  });
  const [selectedOrgan, setSelectedOrgan] = useState(null);
  const [sensorProgress, setSensorProgress] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null);
  const [patientFilter, setPatientFilter] = useState('all');
  const [patientSort, setPatientSort] = useState('priority');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

  useEffect(() => {
    const ts = setInterval(() => setLiveTimestamp(new Date()), 1000);
    return () => clearInterval(ts);
  }, []);

  useEffect(() => {
    const vitalsInterval = setInterval(() => {
      setVitals((prev) => ({
        ...prev,
        heartRate: prev.heartRate + (Math.random() > 0.5 ? 1 : -1),
        spo2: Math.max(85, Math.min(100, prev.spo2 + (Math.random() > 0.6 ? -1 : 0))),
      }));
    }, 3000);
    return () => clearInterval(vitalsInterval);
  }, []);

  const selectPatient = useCallback((patient) => {
    setSelectedPatient(patient);
    setVitals({
      heartRate: patient.heartRate,
      spo2: patient.spo2,
      temp: patient.temp,
      respiration: 16,
      bpSystolic: 120,
      bpDiastolic: 80,
    });
  }, []);

  const updateConsultationControl = useCallback((key, value) => {
    setConsultationControls((prev) => ({ ...prev, [key]: value }));
  }, []);

  const value = {
    secureNode: SECURE_NODE,
    selectedPatient,
    setSelectedPatient: selectPatient,
    patientList,
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
    consultationControls,
    updateConsultationControl,
    setConsultationControls,
    toast,
    showToast,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
