import { useState, useEffect, useCallback, useRef } from 'react';
import {
  apiGet,
  apiPost,
  staffApiGet,
  staffApiPost,
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
import { SignalingService } from '../services/websocket';
import { WebRTCConnection } from '../services/webrtc';


const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turns:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];


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
  const updateConsultationControl = useCallback((key, value) => {
    setConsultationControls((prev) => ({ ...prev, [key]: value }));
  }, []);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // WebRTC & Call states
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle, waiting, active
  const [connectionStatus, setConnectionStatus] = useState('new');

  const signalingServiceRef = useRef(null);
  const webrtcRef = useRef(null);

  // Poll for incoming calls (Doctors only)
  useEffect(() => {
    if (!isAuthenticated || !doctor) return;

    const pollIncoming = async () => {
      try {
        const list = await apiGet('/call/requests/');
        if (list && list.length > 0) {
          if (!activeCall && !incomingCall) {
            setIncomingCall(list[0]);
          }
        } else {
          setIncomingCall(null);
        }
      } catch (err) {
        // Polling is best-effort
      }
    };

    pollIncoming();
    const interval = setInterval(pollIncoming, 3500);
    return () => clearInterval(interval);
  }, [isAuthenticated, doctor, activeCall, incomingCall]);

  const startLocalStream = useCallback(async () => {
    try {
      console.log('Requesting camera/microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error('Local stream permission error:', err);
      showToast('Camera or Microphone access denied. Allow permissions in settings.', 'error');
      throw err;
    }
  }, [showToast]);

  const stopLocalStream = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  const cleanupCall = useCallback(() => {
    console.log('Cleaning up active consultation call streams and connections...');
    if (signalingServiceRef.current) {
      signalingServiceRef.current.close();
      signalingServiceRef.current = null;
    }
    if (webrtcRef.current) {
      webrtcRef.current.close();
      webrtcRef.current = null;
    }
    
    // Stop local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    
    setRemoteStream(null);
    setActiveCall(null);
    setCallStatus('idle');
    setConnectionStatus('disconnected');
    
    // Reset controls
    setConsultationControls({
      micMuted: false,
      videoOn: true,
      chatOpen: false,
    });
  }, [localStream]);

  const connectSignaling = useCallback((roomId, token, stream) => {
    const webrtc = new WebRTCConnection(
      ICE_SERVERS,
      (signal) => {
        if (signalingServiceRef.current) {
          signalingServiceRef.current.send(signal);
        }
      },
      (rStream) => {
        console.log('Setting remote feed from stream');
        setRemoteStream(rStream);
      },
      (state) => {
        setConnectionStatus(state);
        if (state === 'connected') {
          setCallStatus('active');
        } else if (state === 'failed') {
          showToast('WebRTC Uplink establishment failed. Try restarting call.', 'error');
        }
      },
      (iceState) => {
        console.log('ICE connection state is:', iceState);
        if (iceState === 'disconnected') {
          setConnectionStatus('disconnected');
          showToast('Tactical connection interrupted. Trying to reconnect...', 'warning');
        }
      }
    );

    webrtc.initialize(stream);
    webrtcRef.current = webrtc;

    const signaling = new SignalingService(
      roomId,
      token,
      async (data) => {
        if (data.type === 'peer-joined') {
          showToast(`Tactical Uplink established. Peer connected as ${data.role}.`, 'success');
          // If we are Doctor, initiate the offer
          const isDoc = !!getStoredDoctor();
          if (isDoc) {
            console.log('We are the Doctor. Initiating WebRTC offer...');
            await webrtcRef.current?.createOffer();
          } else {
            // We are the Medic. Send a "ready" signal to prompt the Doctor to start negotiation
            console.log('Doctor joined. Sending ready signal to peer...');
            signalingServiceRef.current?.send({ type: 'ready' });
          }
        } else if (data.type === 'ready') {
          const isDoc = !!getStoredDoctor();
          if (isDoc) {
            console.log('Received ready signal from Medic. Initiating WebRTC offer as Doctor...');
            await webrtcRef.current?.createOffer();
          }
        } else if (data.type === 'peer-left') {
          showToast('Peer disconnected from consultation room', 'warning');
          setConnectionStatus('disconnected');
        } else {
          await webrtcRef.current?.handleSignal(data);
        }
      },
      () => {
        console.log('Signaling closed');
      },
      () => {
        showToast('WebSocket signaling server error', 'error');
      }
    );

    signaling.connect();
    signalingServiceRef.current = signaling;
  }, [showToast]);

  const initiateCall = useCallback(async (soldierId) => {
    try {
      setCallStatus('waiting');
      const data = await staffApiPost('/call/request/', { soldierId });
      setActiveCall(data);
      
      const stream = await startLocalStream();
      connectSignaling(data.roomId, getStaffToken(), stream);
      showToast('Consultation requested. Awaiting Medical Officer...', 'success');
      return data;
    } catch (err) {
      setCallStatus('idle');
      showToast(err.message || 'Failed to place call request', 'error');
      throw err;
    }
  }, [startLocalStream, connectSignaling, showToast]);

  const acceptCall = useCallback(async (consultationId) => {
    try {
      const data = await apiPost('/call/accept/', { consultationId });
      setActiveCall(data);
      setIncomingCall(null);
      setCallStatus('active');
      
      const stream = await startLocalStream();
      connectSignaling(data.roomId, getToken(), stream);
      showToast('Uplink accepted. Initializing secure WebRTC feed...', 'success');
      return data;
    } catch (err) {
      showToast(err.message || 'Failed to accept incoming call', 'error');
      throw err;
    }
  }, [startLocalStream, connectSignaling, showToast]);

  const rejectCall = useCallback(async (consultationId) => {
    try {
      await apiPost('/call/reject/', { consultationId });
      setIncomingCall(null);
      showToast('Consultation request rejected', 'info');
    } catch (err) {
      showToast(err.message || 'Failed to reject call request', 'error');
    }
  }, [showToast]);

  const endCall = useCallback(async () => {
    if (!activeCall) return;
    try {
      const isStaff = !!getStaffToken();
      if (isStaff) {
        await staffApiPost('/call/end/', { roomId: activeCall.roomId });
      } else {
        await apiPost('/call/end/', { roomId: activeCall.roomId });
      }
      showToast('Consultation ended', 'info');
    } catch (err) {
      console.error('Error ending consultation call:', err);
    } finally {
      cleanupCall();
    }
  }, [activeCall, cleanupCall, showToast]);

  // Check if active call status has updated (For staff side detection of acceptance or rejection)
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'waiting') return;

    const pollStatus = async () => {
      try {
        const isStaff = !!getStaffToken();
        const data = isStaff 
          ? await staffApiGet(`/call/status/${activeCall.roomId}/`)
          : await apiGet(`/call/status/${activeCall.roomId}/`);
          
        if (data.status === 'accepted') {
          setActiveCall(data);
          setCallStatus('active');
        } else if (data.status === 'rejected') {
          cleanupCall();
          showToast('Consultation rejected by Doctor', 'error');
        }
      } catch (err) {
        // Polling is best-effort
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [activeCall, cleanupCall, showToast]);

  const toggleMic = useCallback(() => {
    const isMuted = !consultationControls.micMuted;
    updateConsultationControl('micMuted', isMuted);
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
    showToast(isMuted ? 'Microphone muted' : 'Microphone unmuted', 'info');
  }, [consultationControls.micMuted, localStream, updateConsultationControl, showToast]);

  const toggleVideo = useCallback(() => {
    const isVideoOn = !consultationControls.videoOn;
    updateConsultationControl('videoOn', isVideoOn);
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = isVideoOn;
      });
    }
    showToast(isVideoOn ? 'Camera enabled' : 'Camera disabled', 'info');
  }, [consultationControls.videoOn, localStream, updateConsultationControl, showToast]);


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
    activeCall,
    incomingCall,
    localStream,
    remoteStream,
    callStatus,
    connectionStatus,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMic,
    toggleVideo,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
