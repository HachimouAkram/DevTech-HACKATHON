import React, { useState, useEffect, useRef } from 'react';
import { Camera, UserCheck, Clock, Settings, Users, CheckCircle2, XCircle, AlertCircle, Calendar, Play, StopCircle, Plus, Search, RefreshCw, Eye } from 'lucide-react';
import { useToast } from '../components/Toast';

const PointagePresence = ({ token, currentUser }) => {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState('scanner');
  
  // Camera state
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  
  // Separate Refs for each tab video element to avoid React conditional rendering conflicts
  const scannerVideoRef = useRef(null);
  const registerVideoRef = useRef(null);
  
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState({ type: 'idle', message: 'Caméra inactive' }); // idle, scanning, success, warning, error
  const [scannedAgent, setScannedAgent] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);
  
  // Refs for tracking active state in interval closures
  const isCooldownRef = useRef(false);
  const isCameraActiveRef = useRef(false);
  const activeTabRef = useRef('scanner');

  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const lastScannedUserRef = useRef(null);
  const hasUserClearedRef = useRef(true);

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  const [pointageSession, setPointageSession] = useState({
    active: false,
    type: 'Entrée',
    heureReference: '08:00'
  });
  const pointageSessionRef = useRef(pointageSession);

  useEffect(() => {
    pointageSessionRef.current = pointageSession;
  }, [pointageSession]);

  // Configuration and Reports state
  const [config, setConfig] = useState({
    heureOuverture: '08:00',
    heureFermeture: '17:00',
    heureLimiteArrivee: '08:30',
    actif: true
  });
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [rapportData, setRapportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  const hostname = window.location.hostname;
  const BACKEND_URL = `http://${hostname}:5000/api/pointage`;
  const AI_URL = `http://${hostname}:8000/api/ai/pointage`;

  // Sync refs to avoid stale closure in setInterval
  useEffect(() => {
    isCooldownRef.current = isCooldown;
  }, [isCooldown]);

  useEffect(() => {
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  // Fetch camera devices
  useEffect(() => {
    const getDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error('Error fetching cameras:', err);
      }
    };
    getDevices();
  }, []);

  // Fetch Config
  const fetchConfig = async () => {
    setIsLoadingConfig(true);
    try {
      const res = await fetch(`${BACKEND_URL}/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.status === 'success') {
        setConfig(resData.data);
      } else {
        addToast({ type: 'error', message: resData.message || 'Erreur lors de la récupération de la configuration' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingConfig(false);
    }
  };

  // Fetch Rapport
  const fetchRapport = async () => {
    setIsLoadingReport(true);
    try {
      const res = await fetch(`${BACKEND_URL}/rapport?date=${reportDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const resData = await res.json();
      if (res.ok && resData.status === 'success') {
        setRapportData(resData.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  // START SCANNER CAMERA
  async function startScannerCamera() {
    try {
      console.log("Current User in Pointage:", currentUser);
      setScanStatus({ type: 'idle', message: 'Caméra en cours de démarrage...' });
      const constraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (scannerVideoRef.current) {
        scannerVideoRef.current.srcObject = stream;
        scannerVideoRef.current.play();
      }
      setIsCameraActive(true);
      setScanStatus({ type: 'idle', message: 'Scanner automatique actif. Regardez la caméra.' });
    } catch (err) {
      console.error(err);
      setScanStatus({ type: 'error', message: "Impossible d'accéder à la webcam. Veuillez autoriser l'accès." });
    }
  }

  function stopScannerCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  }

  // Hands-Free Auto Detection & Verification function
  async function autoCaptureAndVerify() {
    if (!scannerVideoRef.current || !isCameraActiveRef.current || isCooldownRef.current || isScanningRef.current) {
      return;
    }

    setIsScanning(true);

    // Show a subtle scanning state in the status area
    setScanStatus(prev => {
      if (prev.type === 'success' || prev.type === 'warning') return prev;
      return { type: 'scanning', message: 'Détection de visage...' };
    });

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(scannerVideoRef.current, 0, 0, canvas.width, canvas.height);

      // Async wrapper for toBlob to prevent no-async-promise-executor
      const blob = await new Promise((resolveBlob) => {
        canvas.toBlob((b) => {
          resolveBlob(b);
        }, 'image/jpeg');
      });

      if (!blob) {
        setIsScanning(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', blob, 'scan.jpg');
      formData.append('type_session', pointageSessionRef.current.type);
      formData.append('heure_reference', pointageSessionRef.current.heureReference);
      
      if (currentUser.centre_id) {
        formData.append('centre_id', currentUser.centre_id);
      } else if (currentUser.bureau_id) {
        formData.append('bureau_id', currentUser.bureau_id);
      }

      try {
        const res = await fetch(`${AI_URL}/verify-face`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await res.json();
        if (res.ok) {
          if (data.status === 'success') {
            if (lastScannedUserRef.current === data.agent_id && !hasUserClearedRef.current) {
              // The user hasn't cleared the camera yet, ignore silently
              setScanStatus({ type: 'idle', message: 'Veuillez libérer le passage pour le prochain agent.' });
              setIsScanning(false);
              return;
            }

            // New match
            lastScannedUserRef.current = data.agent_id;
            hasUserClearedRef.current = false;

            setScanStatus({ type: 'success', message: data.message });
            setScannedAgent({
              nom: data.nom_complet,
              type: data.type_pointage,
              statut: data.statut,
              heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            });
            addToast({ type: 'success', message: data.message });
            fetchRapport();
            
            // Cooldown active, wait for user to click OK
            setIsCooldown(true);
          } else if (data.status === 'already_pointed') {
            if (lastScannedUserRef.current === data.agent_id && !hasUserClearedRef.current) {
              // The user hasn't cleared the camera yet, ignore silently
              setScanStatus({ type: 'idle', message: 'Veuillez libérer le passage pour le prochain agent.' });
              setIsScanning(false);
              return;
            }

            // New match
            lastScannedUserRef.current = data.agent_id;
            hasUserClearedRef.current = false;

            setScanStatus({ type: 'warning', message: data.message });
            setScannedAgent({
              nom: data.nom_complet,
              already: true,
              message: data.message
            });
            addToast({ type: 'info', message: data.message });
            
            // Cooldown active, wait for user to click OK
            setIsCooldown(true);
          }
        } else {
          console.log("AI API Error Data:", data);
          let detail = data.detail || 'Erreur de pointage';
          
          if (typeof detail !== 'string') {
             detail = JSON.stringify(detail);
          }

          if (detail === 'Aucun visage détecté' || detail.includes('Aucun visage')) {
            // User has cleared the camera
            hasUserClearedRef.current = true;
            lastScannedUserRef.current = null;

            setScanStatus(prev => {
              if (prev.type === 'success' || prev.type === 'warning' || prev.type === 'error') return prev;
              return { type: 'idle', message: 'Aucun visage détecté. Veuillez vous rapprocher et bien regarder la caméra.' };
            });
          } else if (detail.includes('non reconnu') || detail.includes('Aucun agent')) {
            setScanStatus({ type: 'error', message: 'Visage non reconnu. Assurez-vous d\'être enregistré dans ce bureau.' });
            setIsCooldown(true);
            setTimeout(() => {
              setIsCooldown(false);
              setScanStatus({ type: 'idle', message: 'Scanner automatique actif. Regardez la caméra.' });
            }, 2000); 
          } else {
            setScanStatus({ type: 'error', message: detail });
            setIsCooldown(true);
            setTimeout(() => {
              setIsCooldown(false);
              setScanStatus({ type: 'idle', message: 'Scanner automatique actif. Regardez la caméra.' });
            }, 2000);
          }
        }
      } catch (err) {
        console.error("AI microservice communication error:", err);
      } finally {
        setIsScanning(false);
      }
    } catch (err) {
      console.error("Auto scan capture error:", err);
      setIsScanning(false);
    }
  }

  useEffect(() => {
    fetchConfig();
    fetchRapport();
  }, [reportDate]);

  // Camera Management - Auto-start cameras on session start
  useEffect(() => {
    if (activeTab === 'scanner' && pointageSession.active) {
      startScannerCamera();
    } else {
      stopScannerCamera();
    }

    return () => {
      stopScannerCamera();
    };
  }, [activeTab, selectedCamera, pointageSession.active]);

  // Hands-free Automatic Scanner Loop
  useEffect(() => {
    let autoScanTimeout = null;
    let isActive = true;

    const scanStep = async () => {
      if (!isActive) return;

      if (isCameraActive && activeTab === 'scanner' && !isCooldownRef.current && pointageSessionRef.current.active) {
        await autoCaptureAndVerify();
      }

      // Schedule the next check in 1000ms after current check completes
      if (isActive) {
        autoScanTimeout = setTimeout(scanStep, 1000);
      }
    };

    if (isCameraActive && activeTab === 'scanner' && pointageSession.active) {
      scanStep();
    }

    return () => {
      isActive = false;
      if (autoScanTimeout) {
        clearTimeout(autoScanTimeout);
      }
    };
  }, [isCameraActive, activeTab, pointageSession.active]);

  // Reset scanner tracking when session is deactivated
  useEffect(() => {
    if (!pointageSession.active) {
      lastScannedUserRef.current = null;
      hasUserClearedRef.current = true;
    }
  }, [pointageSession.active]);



  // Update Config
  const handleUpdateConfig = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      const resData = await res.json();
      if (res.ok && resData.status === 'success') {
        setConfig(resData.data);
        addToast({ type: 'success', message: 'Configuration de présence mise à jour' });
      } else {
        addToast({ type: 'error', message: resData.message || 'Erreur lors de la mise à jour' });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', message: 'Erreur lors de la connexion au serveur' });
    }
  };

  return (
    <div className="pointage-presence-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Scope Style Block */}
      <style>{`
        .pointage-presence-container {
          animation: fadeIn 0.4s ease-out;
        }
        .header-section {
          background: linear-gradient(135deg, #064e3b 0%, #022c22 100%);
          border-radius: 20px;
          padding: 2rem;
          color: white;
          box-shadow: 0 10px 25px rgba(2, 44, 34, 0.15);
          position: relative;
          overflow: hidden;
        }
        .header-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at top right, rgba(16, 185, 129, 0.15), transparent 60%);
          pointer-events: none;
        }
        .tab-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid rgba(0,0,0,0.04);
          background: #ffffff;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 0.5rem;
          box-shadow: var(--shadow-sm);
        }
        .tab-btn.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
          box-shadow: 0 4px 12px var(--primary-glow);
        }
        .tab-btn:hover:not(.active) {
          background: var(--bg-primary);
          color: var(--text-primary);
          transform: translateY(-1px);
        }
        .webcam-card-panel {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.5rem;
          width: 100%;
        }
        .webcam-container {
          background: #0d1117;
          border-radius: 24px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 15px 35px rgba(0,0,0,0.25);
          border: 3px solid rgba(255, 255, 255, 0.15);
          aspect-ratio: 4/3;
          width: 100%;
          max-width: 580px;
          transition: all 0.3s ease;
        }
        .glow-border-success {
          box-shadow: 0 0 30px rgba(16, 185, 129, 0.75) !important;
          border-color: #10b981 !important;
        }
        .glow-border-warning {
          box-shadow: 0 0 30px rgba(245, 158, 11, 0.75) !important;
          border-color: #f59e0b !important;
        }
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.2), inset 0 0 10px rgba(16, 185, 129, 0.1);
            border-color: rgba(16, 185, 129, 0.35);
          }
          50% {
            box-shadow: 0 0 30px rgba(16, 185, 129, 0.5), inset 0 0 20px rgba(16, 185, 129, 0.3);
            border-color: rgba(16, 185, 129, 0.75);
          }
        }
        @keyframes scanLine {
          0% { top: 4%; opacity: 0.6; }
          50% { top: 96%; opacity: 1; filter: drop-shadow(0 0 8px #10b981); }
          100% { top: 4%; opacity: 0.6; }
        }
        .presence-card {
          border-radius: 16px;
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
          border: 1px solid var(--border-color);
        }
        .presence-card.present {
          background: rgba(16, 185, 129, 0.05);
          border-color: rgba(16, 185, 129, 0.2);
        }
        .presence-card.retard {
          background: rgba(245, 158, 11, 0.05);
          border-color: rgba(245, 158, 11, 0.2);
        }
        .presence-card.absent {
          background: rgba(239, 68, 68, 0.05);
          border-color: rgba(239, 68, 68, 0.2);
        }
      `}</style>

      {/* Header section with Senegalese Green background */}
      <div className="header-section">
        <div className="header-overlay"></div>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem', letterSpacing: '-0.025em' }}>
            Système de Pointage Facial
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem', maxWidth: '600px' }}>
            Reconnaissance faciale instantanée. Le système effectue le scan en continu de façon autonome.
          </p>
        </div>
      </div>

      {/* Dynamic Tab Selector */}
      <div className="flex-gap" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <button 
          className={`tab-btn ${activeTab === 'scanner' ? 'active' : ''}`}
          onClick={() => setActiveTab('scanner')}
        >
          <Camera size={18} />
          <span>Scanner de Présence</span>
        </button>

        <button 
          className={`tab-btn ${activeTab === 'rapport' ? 'active' : ''}`}
          onClick={() => setActiveTab('rapport')}
        >
          <Clock size={18} />
          <span>Rapports & Configuration</span>
        </button>
      </div>

      {/* TAB CONTENT: SCANNER DE PRÉSENCE */}
      {activeTab === 'scanner' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          
          {/* Left Panel: Camera Stream */}
          <div className="glass-card webcam-card-panel">
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Camera size={20} className="text-primary" />
              Session de Pointage
            </h2>

            {/* Session Controls */}
            <div style={{ width: '100%', background: 'rgba(0,0,0,0.015)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Type de Pointage</label>
                  <select 
                    className="form-input form-select"
                    value={pointageSession.type}
                    onChange={(e) => setPointageSession({...pointageSession, type: e.target.value})}
                    disabled={pointageSession.active}
                  >
                    <option value="Entrée">Entrée (Arrivée)</option>
                    <option value="Sortie">Sortie (Départ)</option>
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1, margin: 0 }}>
                  <label className="form-label">Heure de référence</label>
                  <input 
                    type="time" 
                    className="form-input"
                    value={pointageSession.heureReference}
                    onChange={(e) => setPointageSession({...pointageSession, heureReference: e.target.value})}
                    disabled={pointageSession.active}
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Choix de la Caméra</label>
                <select 
                  className="form-input form-select" 
                  value={selectedCamera} 
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  disabled={pointageSession.active}
                >
                  {cameraDevices.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label || `Caméra ${cameraDevices.indexOf(dev) + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              {!pointageSession.active ? (
                <button 
                  className="btn btn-primary" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0.75rem' }}
                  onClick={() => setPointageSession({...pointageSession, active: true})}
                >
                  <Play size={18} /> Démarrer la Session de Pointage
                </button>
              ) : (
                <button 
                  className="btn btn-danger" 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '0.75rem' }}
                  onClick={() => {
                    if (pointageSession.type === 'Sortie') {
                      // Reset to Entrée 08:00 for the next day
                      setPointageSession({ active: false, type: 'Entrée', heureReference: '08:00' });
                      addToast({ type: 'success', message: 'Session de sortie fermée. Le système est réinitialisé pour une nouvelle journée (Entrée 08:00).' });
                    } else {
                      setPointageSession({...pointageSession, active: false});
                    }
                  }}
                >
                  <StopCircle size={18} /> Fermer la Session (Terminer)
                </button>
              )}
            </div>

            {/* Webcam video window */}
            <div className={`webcam-container ${scanStatus.type === 'success' ? 'glow-border-success' : scanStatus.type === 'warning' ? 'glow-border-warning' : ''}`}>
              {isCameraActive && !isCooldown && (
                <>
                  {/* Glowing Scanning Box Guide */}
                  <div style={{
                    position: 'absolute',
                    inset: '12%',
                    border: '2px solid rgba(16, 185, 129, 0.4)',
                    borderRadius: '24px',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'pulseGlow 2s infinite ease-in-out',
                    zIndex: 10
                  }}>
                    {/* Glowing corner brackets */}
                    <div style={{ position: 'absolute', top: '-3px', left: '-3px', width: '28px', height: '28px', borderTop: '5px solid #10b981', borderLeft: '5px solid #10b981', borderTopLeftRadius: '14px', filter: 'drop-shadow(0 0 6px #10b981)' }} />
                    <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '28px', height: '28px', borderTop: '5px solid #10b981', borderRight: '5px solid #10b981', borderTopRightRadius: '14px', filter: 'drop-shadow(0 0 6px #10b981)' }} />
                    <div style={{ position: 'absolute', bottom: '-3px', left: '-3px', width: '28px', height: '28px', borderBottom: '5px solid #10b981', borderLeft: '5px solid #10b981', borderBottomLeftRadius: '14px', filter: 'drop-shadow(0 0 6px #10b981)' }} />
                    <div style={{ position: 'absolute', bottom: '-3px', right: '-3px', width: '28px', height: '28px', borderBottom: '5px solid #10b981', borderRight: '5px solid #10b981', borderBottomRightRadius: '14px', filter: 'drop-shadow(0 0 6px #10b981)' }} />

                    {/* High-tech sweeping scanning laser line */}
                    <div style={{
                      position: 'absolute',
                      left: '4%',
                      right: '4%',
                      height: '3px',
                      background: 'linear-gradient(90deg, transparent, #10b981, #34d399, #10b981, transparent)',
                      boxShadow: '0 0 14px rgba(16, 185, 129, 0.9), 0 0 25px rgba(52, 211, 153, 0.6)',
                      animation: 'scanLine 3.5s infinite ease-in-out',
                      zIndex: 11
                    }} />

                    {/* Centered target crosshair */}
                    <div style={{
                      width: '60px',
                      height: '60px',
                      position: 'relative',
                      opacity: 0.35
                    }}>
                      <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1.5px', background: '#10b981' }} />
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1.5px', background: '#10b981' }} />
                    </div>
                  </div>
                  {/* Subtle dark mask overlay outside the scanning area to focus on the face */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    boxShadow: 'inset 0 0 0 9999px rgba(15, 23, 42, 0.45)',
                    pointerEvents: 'none',
                    zIndex: 5
                  }} />
                </>
              )}
              
              <video 
                ref={scannerVideoRef} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
                playsInline
                muted
              />

              {!isCameraActive && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'rgba(15,23,42,0.9)', color: 'white', padding: '2rem' }}>
                  <RefreshCw size={36} className="animate-spin text-primary" style={{ marginBottom: '1rem' }} />
                  <p style={{ fontWeight: 600 }}>Démarrage du flux vidéo...</p>
                </div>
              )}
            </div>

            {/* Cooldown / Scan State Visual Overlay Banner */}
            <div style={{ width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div className="badge badge-info" style={{ margin: '0 auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
                Mode Mains Libres : Détection Automatique active
              </div>
            </div>
          </div>

          {/* Right Panel: Live Pointage Feedback */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', minHeight: '450px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={20} className="text-secondary" />
              Statut du Pointage
            </h2>

            {/* Status box */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '16px', background: 'rgba(0,0,0,0.01)', minHeight: '300px' }}>
              
              {scanStatus.type === 'idle' && (
                <>
                  <AlertCircle size={44} className="text-muted" style={{ marginBottom: '1rem' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Scanner prêt</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.25rem', maxWidth: '260px' }}>
                    {scanStatus.message}
                  </p>
                </>
              )}

              {scanStatus.type === 'scanning' && (
                <>
                  <RefreshCw size={44} className="text-secondary" style={{ marginBottom: '1rem', animation: 'spin 1.5s linear infinite' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{scanStatus.message}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Veuillez regarder l'objectif de la caméra.
                  </p>
                </>
              )}

              {scanStatus.type === 'success' && scannedAgent && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                  <CheckCircle2 size={54} style={{ color: 'var(--primary)', marginBottom: '1rem', margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {scannedAgent.nom}
                  </h3>
                  <div className={`badge ${scannedAgent.statut === 'RETARD' ? 'badge-warning' : 'badge-success'}`} style={{ marginTop: '0.5rem', padding: '0.4rem 1.25rem' }}>
                    {scannedAgent.type} Validé ({scannedAgent.statut || 'OK'})
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '1rem', fontWeight: 500 }}>
                    Enregistré à : {scannedAgent.heure}
                  </p>
                </div>
              )}

              {scanStatus.type === 'warning' && scannedAgent && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                  <AlertCircle size={54} style={{ color: 'var(--warning)', marginBottom: '1rem', margin: '0 auto 1rem' }} />
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {scannedAgent.nom}
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginTop: '0.5rem', padding: '0.25rem 1rem' }}>
                    {scannedAgent.message}
                  </p>
                </div>
              )}

              {scanStatus.type === 'error' && (
                <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                  <XCircle size={54} style={{ color: 'var(--danger)', marginBottom: '1rem', margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '1.1rem' }}>
                    {scanStatus.message.includes('non reconnu') ? 'Image Non Reconnue' : 'Erreur'}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', maxWidth: '260px', margin: '0.5rem auto 0' }}>
                    {scanStatus.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}



      {/* TAB CONTENT: RAPPORT JOURNALIER & CONFIGURATION */}
      {activeTab === 'rapport' && (
        <div className="glass-card" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={20} className="text-secondary" />
              Rapport de Présence Journalier
            </h2>
            
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', width: '220px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2.2rem' }} 
                  placeholder="Rechercher un agent..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <input 
                type="date" 
                className="form-input" 
                style={{ width: 'auto', padding: '0.5rem' }} 
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Agents</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0.25rem 0 0' }}>{rapportData.length}</h3>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Présents</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#10b981', margin: '0.25rem 0 0' }}>{rapportData.filter(d => d.statut === 'PRESENT').length}</h3>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>En Retard</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#f59e0b', margin: '0.25rem 0 0' }}>{rapportData.filter(d => d.statut.includes('RETARD')).length}</h3>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
              <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Absents</p>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444', margin: '0.25rem 0 0' }}>{rapportData.filter(d => d.statut === 'ABSENT' || (!d.heureArrivee && !d.heureDepart)).length}</h3>
            </div>
          </div>

            {isLoadingReport ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
                <RefreshCw className="animate-spin text-primary" size={32} />
              </div>
            ) : rapportData.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={36} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>Aucun agent enregistré dans ce centre/bureau.</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Employé</th>
                      <th>Numéro</th>
                      <th>Heure d'Entrée</th>
                      <th>Heure de Sortie</th>
                      <th>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = rapportData.filter(item => {
                        const term = searchTerm.toLowerCase();
                        return (
                          (item.nomComplet || '').toLowerCase().includes(term) ||
                          (item.telephone || '').toLowerCase().includes(term) ||
                          (item.statut || '').toLowerCase().includes(term)
                        );
                      });
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="5" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                              Aucun agent ne correspond à votre recherche.
                            </td>
                          </tr>
                        );
                      }
                      return filtered.map((item) => (
                        <tr key={item.agentId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                {item.nomComplet ? item.nomComplet.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) : ''}
                              </div>
                              <span style={{ fontWeight: 600 }}>{item.nomComplet}</span>
                            </div>
                          </td>
                          <td>{item.telephone}</td>
                          <td>{item.heureArrivee ? item.heureArrivee.substring(0, 5) : '-'}</td>
                          <td>{item.heureDepart ? item.heureDepart.substring(0, 5) : '-'}</td>
                          <td>
                            <span className={`badge ${item.statut === 'PRESENT' ? 'badge-success' : item.statut.includes('RETARD') ? 'badge-warning' : 'badge-danger'}`}>
                              {item.statut}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
      )}
      
      {/* SUCCESS MODAL OVERLAY */}
      {scannedAgent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.85)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center', animation: 'fadeIn 0.3s ease-out', backdropFilter: 'blur(5px)' }}>
          <div style={{ background: '#ffffff', padding: '3rem', borderRadius: '24px', textAlign: 'center', maxWidth: '440px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
            {scannedAgent.already ? (
              <AlertCircle size={80} style={{ color: '#f59e0b', margin: '0 auto 1.5rem' }} />
            ) : (
              <CheckCircle2 size={80} style={{ color: '#10b981', margin: '0 auto 1.5rem' }} />
            )}
            
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.5rem' }}>
              {scannedAgent.already ? "Déjà Pointé" : "Bienvenue"}
            </h2>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1.5rem' }}>
              {scannedAgent.nom}
            </h3>
            
            <p style={{ fontSize: '1.15rem', color: '#475569', marginBottom: '2.5rem', lineHeight: 1.5, fontWeight: '500' }}>
              {scannedAgent.already ? (
                "Vous êtes déjà pointé, merci."
              ) : (
                <>
                  Votre pointage est enregistré.
                  <span style={{ display: 'block', fontSize: '1rem', color: '#64748b', marginTop: '0.75rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 'bold' }}>
                    Heure : {scannedAgent.heure}
                  </span>
                </>
              )}
            </p>
            
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', padding: '1.1rem', fontSize: '1.1rem', borderRadius: '12px', fontWeight: 600 }}
              onClick={() => {
                setScannedAgent(null);
                setScanStatus({ type: 'idle', message: 'Scanner automatique actif. Regardez la caméra.' });
                setIsCooldown(false);
              }}
            >
              D'accord, merci
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PointagePresence;
