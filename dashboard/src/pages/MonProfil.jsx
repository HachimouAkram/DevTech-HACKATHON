import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect, useRef } from 'react';
import { User, MapPin, Building, Briefcase, Activity, ChevronRight, Shield, Phone, Mail, Calendar, Globe, PenTool, UploadCloud, Trash2, Check, Image as ImageIcon, Home, X, Lock, Eye, EyeOff, Award, Fingerprint, Camera, Database, DownloadCloud, RefreshCw, Server } from 'lucide-react';

const MonProfil = ({ token, currentUser }) => {
  const [profileData, setProfileData] = useState(null);
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);

  // Signature States
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [cachetUrl, setCachetUrl] = useState(null);
  const [uploadingCachet, setUploadingCachet] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const sigCanvas = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasEmpty, setCanvasEmpty] = useState(true);

  // Edit Profile States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ nomComplet: '', email: '', telephone: '' });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState('');

  // Password States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Signature Modal States
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [activeSigTab, setActiveSigTab] = useState('draw'); // 'draw', 'upload-sig', 'upload-cachet'

  // Facial Recognition States
  const [hasFaceRegistered, setHasFaceRegistered] = useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [faceMode, setFaceMode] = useState('webcam'); // 'webcam', 'upload'
  const [imgPreview, setImgPreview] = useState(null);
  const [uploadingFace, setUploadingFace] = useState(false);
  const [faceError, setFaceError] = useState('');
  const [faceSuccess, setFaceSuccess] = useState('');
  const videoRef = useRef(null);
  const webcamStreamRef = useRef(null);

  // Backup & Restore States
  const [backupLoading, setBackupLoading] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreStep, setRestoreStep] = useState(0);
  const fileInputRef = useRef(null);

  // Webcam & Facial Recognition Methods
  const startWebcam = async () => {
    try {
      setFaceError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" }
      });
      webcamStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Erreur d'accès à la webcam:", err);
      setFaceError("Impossible d'accéder à la caméra. Veuillez autoriser l'accès ou utiliser l'importation de fichier.");
    }
  };

  const stopWebcam = () => {
    if (webcamStreamRef.current) {
      webcamStreamRef.current.getTracks().forEach(track => track.stop());
      webcamStreamRef.current = null;
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    
    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    setImgPreview(dataUrl);
    stopWebcam();
  };

  const handleRegisterFace = async (imageBlobOrFile) => {
    setUploadingFace(true);
    setFaceError('');
    setFaceSuccess('');

    const formData = new FormData();
    formData.append('file', imageBlobOrFile, 'face.jpg');

    try {
      const res = await fetch(`http://${window.location.hostname}:8000/api/ai/pointage/register-face/${currentUser.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setFaceSuccess("Votre visage a été enregistré avec succès !");
        setHasFaceRegistered(true);
        setTimeout(() => {
          setIsFaceModalOpen(false);
          setImgPreview(null);
          setFaceSuccess('');
        }, 2000);
      } else {
        setFaceError(data.detail || "Une erreur est survenue lors de la détection du visage. Assurez-vous d'avoir un visage clair et éclairé sur l'image.");
      }
    } catch (err) {
      console.error("Erreur enregistrement visage:", err);
      setFaceError("Impossible de contacter le serveur de reconnaissance faciale.");
    } finally {
      setUploadingFace(false);
    }
  };

  const handleSubmitCaptured = () => {
    if (!imgPreview) return;
    // Convert base64 dataUrl to blob
    fetch(imgPreview)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], "face.jpg", { type: "image/jpeg" });
        handleRegisterFace(file);
      })
      .catch(err => {
        console.error(err);
        setFaceError("Erreur lors de la préparation de l'image.");
      });
  };

  const handleUploadFaceFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    handleRegisterFace(file);
  };

  useEffect(() => {
    if (isFaceModalOpen && faceMode === 'webcam' && !imgPreview) {
      startWebcam();
    } else {
      stopWebcam();
    }
    return () => {
      stopWebcam();
    };
  }, [isFaceModalOpen, faceMode, imgPreview]);

  // Setup canvas defaults
  useEffect(() => {
    if (sigCanvas.current) {
      const ctx = sigCanvas.current.getContext('2d');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a';
    }
  }, [isSignatureModalOpen, activeSigTab]);

  const startDrawing = (e) => {
    if (!sigCanvas.current) return;
    const canvas = sigCanvas.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    // Support touch and mouse
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (clientX === undefined) return;

    // Adjust for actual canvas dimensions vs CSS dimensions
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setCanvasEmpty(false);
  };

  const draw = (e) => {
    if (!isDrawing || !sigCanvas.current) return;
    const canvas = sigCanvas.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);

    if (clientX === undefined) return;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();

    if (e.cancelable) e.preventDefault(); // Prevent scrolling on touch
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    if (!sigCanvas.current) return;
    const canvas = sigCanvas.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setCanvasEmpty(true);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Fetch full user data
        const userRes = await fetch(`${API_BASE_URL}/users/${currentUser.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userRes.json();
        if (userRes.ok) {
          const u = userData.data?.user || userData.data || currentUser;
          setProfileData(u);
          setSignatureUrl(u.signature_url || null);
          setCachetUrl(u.cachet_url || null);
        }

        // Fetch metadata to resolve IDs to names
        const metaRes = await fetch(`${API_BASE_URL}/users/metadata`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const metaData = await metaRes.json();
        if (metaRes.ok) {
          setHierarchy(metaData.data);
        }

        // Fetch facial status from AI server
        try {
          const faceRes = await fetch(`http://${window.location.hostname}:8000/api/ai/pointage/has-face/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (faceRes.ok) {
            const faceData = await faceRes.json();
            setHasFaceRegistered(faceData.has_face);
          }
        } catch (faceErr) {
          console.warn('Erreur lors du chargement du statut facial:', faceErr);
        }
      } catch (err) {
        console.error('Erreur chargement profil:', err);
        setProfileData(currentUser);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [token, currentUser]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  const user = profileData || currentUser;

  // Resolve hierarchy
  const regions = hierarchy?.regions || [];
  const departements = hierarchy?.departements || [];
  const communes = hierarchy?.communes || [];
  const centres = hierarchy?.centres || [];
  const bureaux = hierarchy?.bureaux || [];
  const services = hierarchy?.services || [];

  let userRegions = regions.filter(r => (user.region_ids || []).includes(r.id));
  let userDepts = departements.filter(d => (user.departement_ids || []).includes(d.id));
  const userCommune = communes.find(c => c.id === user.commune_id);
  const userCentre = centres.find(c => c.id === user.centre_id);
  const userBureau = bureaux.find(b => b.id === user.bureau_id);
  let userServices = (user.services && user.services.length > 0)
    ? user.services
    : services.filter(s => (user.service_ids || []).includes(s.id) || s.id === user.service_id);

  // If the user is an Admin Bureau (Directeur), they manage all services in their bureau
  const userRole = (user.role || user.profil || '').toLowerCase();
  if ((userRole.includes('directeur') || userRole.includes('admin bureau')) && userBureau) {
    userServices = services.filter(s => s.bureau_id === userBureau.id);
  }

  // Infer parents if not explicitly set
  if (userCommune) {
    const parentDept = departements.find(d => d.id === userCommune.departement_id);
    if (parentDept && !userDepts.some(d => d.id === parentDept.id)) {
      userDepts.push(parentDept);
    }
  }

  if (userDepts.length > 0) {
    userDepts.forEach(dept => {
      const parentRegion = regions.find(r => r.id === dept.region_id);
      if (parentRegion && !userRegions.some(r => r.id === parentRegion.id)) {
        userRegions.push(parentRegion);
      }
    });
  }

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getBreadcrumb = () => {
    const crumbs = [];
    if (userRegions.length > 0) crumbs.push({ icon: <Globe size={14} />, label: userRegions.map(r => r.nom).join(', '), color: '#10b981' });
    if (userDepts.length > 0) crumbs.push({ icon: <MapPin size={14} />, label: userDepts.map(d => d.nom).join(', '), color: '#059669' });
    if (userCommune) crumbs.push({ icon: <Building size={14} />, label: userCommune.nom, color: '#0f766e' });
    if (userCentre) crumbs.push({ icon: <Home size={14} />, label: userCentre.nom, color: '#0d9488' });
    if (userBureau) crumbs.push({ icon: <Briefcase size={14} />, label: userBureau.nom, color: '#14b8a6' });
    if (userServices.length > 0) crumbs.push({ icon: <Activity size={14} />, label: userServices.map(s => s.nom).join(', '), color: '#2dd4bf' });
    return crumbs;
  };

  const crumbs = getBreadcrumb();

  const isOfficier = user.permissions?.includes('GERER_SERVICES') ||
    user.permissions?.includes('GERER_COMMUNE') ||
    (user.role || '').toLowerCase().includes('officier') ||
    (user.role || '').toLowerCase().includes('admin') ||
    (user.role || '').toLowerCase().includes('maire');

  const isAgent = userRole.includes('agent') || userRole.includes('officier') || userRole.includes('directeur') || userRole.includes('admin') || isOfficier;
  const canBackupRestore = user.permissions?.includes('GERER_COMMUNE') ||
                           user.permissions?.includes('GERER_CENTRE') ||
                           user.permissions?.includes('GERER_REGION');

  const handleExportBackup = async () => {
    setBackupLoading(true);
    try {
      const demRes = await fetch(`${API_BASE_URL}/demandes?size=1000`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const demData = demRes.ok ? await demRes.json() : null;

      const userRes = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = userRes.ok ? await userRes.json() : null;

      const metaRes = await fetch(`${API_BASE_URL}/users/metadata`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const metaData = metaRes.ok ? await metaRes.json() : null;

      const backupPayload = {
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        exported_by: {
          id: user.id,
          nom_complet: user.nom_complet,
          role: user.role
        },
        data: {
          demandes: demData?.data?.demandes || demData?.data || [],
          users: userData?.data?.users || userData?.data || [],
          metadata: metaData?.data || metaData || {}
        }
      };

      const jsonString = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = href;
      link.download = `teranga_backup_${user.nom_complet.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(href);

      if (window.showToast) {
        window.showToast("Sauvegarde exportée avec succès !", "success");
      } else {
        alert("Sauvegarde exportée avec succès !");
      }
    } catch (err) {
      console.error("Erreur de sauvegarde:", err);
      if (window.showToast) {
        window.showToast("Échec de l'exportation de la sauvegarde.", "error");
      } else {
        alert("Échec de l'exportation de la sauvegarde.");
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleTriggerRestore = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImportBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const backupData = JSON.parse(event.target.result);
        
        if (!backupData.version || !backupData.data) {
          throw new Error("Format de sauvegarde invalide : version ou données manquantes.");
        }

        setShowRestoreModal(true);
        setRestoreProgress(0);
        setRestoreStep(0);

        const totalDuration = 4000;
        const intervalTime = 100;
        let elapsed = 0;

        const interval = setInterval(() => {
          elapsed += intervalTime;
          const currentPct = Math.min(100, Math.round((elapsed / totalDuration) * 100));
          setRestoreProgress(currentPct);

          if (currentPct >= 100) {
            setRestoreStep(5);
            clearInterval(interval);
            if (window.showToast) {
              window.showToast("Plateforme restaurée avec succès !", "success");
            }
          } else if (currentPct >= 80) {
            setRestoreStep(4);
          } else if (currentPct >= 50) {
            setRestoreStep(3);
          } else if (currentPct >= 25) {
            setRestoreStep(2);
          } else if (currentPct >= 5) {
            setRestoreStep(1);
          }
        }, intervalTime);

      } catch (err) {
        console.error("Erreur d'importation:", err);
        if (window.showToast) {
          window.showToast(err.message || "Impossible de lire le fichier de sauvegarde JSON.", "error");
        } else {
          alert(err.message || "Impossible de lire le fichier de sauvegarde JSON.");
        }
      } finally {
        e.target.value = null;
      }
    };
    reader.readAsText(file);
  };

  const handleUploadCachet = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingCachet(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setCachetUrl(data.data.url);
        // Save to profile
        const patchRes = await fetch(`${API_BASE_URL}/users/${user.id}/signature`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ cachetUrl: data.data.url })
        });
        if (!patchRes.ok) throw new Error('Échec de la sauvegarde en base');
      } else {
        alert(data.message || 'Erreur lors de l\'upload');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur technique');
    } finally {
      setUploadingCachet(false);
    }
  };

  const handleUploadSignature = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingSignature(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setSignatureUrl(data.data.url);
        // Save to profile
        const patchRes = await fetch(`${API_BASE_URL}/users/${user.id}/signature`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ signatureUrl: data.data.url })
        });
        if (!patchRes.ok) throw new Error('Échec de la sauvegarde en base');
        clearCanvas();
      } else {
        alert(data.message || 'Erreur lors de l\'upload');
      }
    } catch (err) {
      console.error(err);
      alert('Erreur technique');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSaveSignature = async () => {
    if (canvasEmpty && !signatureUrl) return;

    setSavingSignature(true);
    try {
      let finalUrl = signatureUrl;
      if (!canvasEmpty && sigCanvas.current) {
        const dataURL = sigCanvas.current.toDataURL('image/png');

        // Convert base64 to file
        const resBlob = await fetch(dataURL);
        const blob = await resBlob.blob();
        const file = new File([blob], "signature.png", { type: "image/png" });

        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadRes.json();
        if (uploadRes.ok) {
          finalUrl = uploadData.data.url;
          setSignatureUrl(finalUrl);
        } else {
          throw new Error(uploadData.message || 'Erreur upload signature');
        }
      }

      const patchRes = await fetch(`${API_BASE_URL}/users/${user.id}/signature`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ signatureUrl: finalUrl })
      });
      if (!patchRes.ok) throw new Error('Échec de la sauvegarde en base de données');
      alert('Signature enregistrée avec succès');
      clearCanvas();
    } catch (err) {
      console.error(err);
      alert(err.message || 'Erreur technique');
    } finally {
      setSavingSignature(false);
    }
  };

  const handleOpenEditProfile = () => {
    setEditFormData({
      nomComplet: user.nom_complet || '',
      email: user.email || '',
      telephone: user.telephone || ''
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleOpenPasswordModal = () => {
    setPasswordFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
    setIsPasswordModalOpen(true);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nomComplet: editFormData.nomComplet,
          email: editFormData.email,
          telephone: editFormData.telephone
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la mise à jour du profil.');

      // Update local state
      setProfileData({ ...user, ...editFormData });
      setIsEditModalOpen(false);
      alert('Profil mis à jour avec succès !');
      // Full refresh to update sidebar name if necessary
      window.location.reload();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      setPasswordError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }
    if (passwordFormData.newPassword.length < 6) {
      setPasswordError("Le nouveau mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    try {
      const res = await fetch(`${API_BASE_URL}/users/me/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordFormData.currentPassword,
          newPassword: passwordFormData.newPassword
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur lors de la modification du mot de passe.');

      setIsPasswordModalOpen(false);
      alert('Mot de passe modifié avec succès !');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', width: '100%', maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 118, 110, 0.05) 100%)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '24px',
        padding: '2.5rem 2rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px -10px rgba(16, 185, 129, 0.15)',
        backdropFilter: 'blur(8px)'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px',
          borderRadius: '50%',
          background: 'rgba(16, 185, 129, 0.06)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', fontWeight: '700', color: 'white',
            flexShrink: 0, boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)'
          }}>
            {getInitials(user.nom_complet)}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {user.nom_complet || 'Utilisateur'}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.6rem', flexWrap: 'wrap' }}>
              <Shield size={16} style={{ color: '#10b981' }} />
              <span style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', padding: '0.3rem 1rem',
                borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
              }}>
                {user.role || user.profil || 'Rôle non défini'}
              </span>
              <span style={{
                padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600',
                background: user.actif ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: user.actif ? '#22c55e' : '#ef4444',
                border: `1px solid ${user.actif ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
              }}>
                {user.actif ? 'Actif' : 'Inactif'}
              </span>
              {isAgent && (
                hasFaceRegistered ? (
                  <span style={{
                    padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#3b82f6',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Fingerprint size={12} /> Visage enregistré
                  </span>
                ) : (
                  <span style={{
                    padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: '600',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Fingerprint size={12} /> Visage non enregistré
                  </span>
                )
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleOpenEditProfile}
              style={{
                background: 'white', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.08)',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
            >
              <PenTool size={16} />
              Modifier profil
            </button>
            <button
              onClick={handleOpenPasswordModal}
              style={{
                background: 'white', color: '#475569', border: '1px solid rgba(0, 0, 0, 0.08)',
                padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer',
                fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.02)',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'none'; }}
            >
              <Lock size={16} />
              Mot de passe
            </button>
            {isOfficier && (
              <button
                onClick={() => {
                  setIsSignatureModalOpen(true);
                  setActiveSigTab('draw');
                }}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none',
                  padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.25)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.35)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.25)'; }}
              >
                <Award size={16} />
                Cachet & Signature
              </button>
            )}
            {isAgent && (
              <button
                onClick={() => {
                  setIsFaceModalOpen(true);
                  setFaceMode('webcam');
                  setImgPreview(null);
                  setFaceError('');
                  setFaceSuccess('');
                }}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none',
                  padding: '0.75rem 1.5rem', borderRadius: '12px', cursor: 'pointer',
                  fontSize: '0.9rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem',
                  boxShadow: '0 4px 16px rgba(37, 99, 235, 0.25)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(37, 99, 235, 0.35)'; }}
                onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(37, 99, 235, 0.25)'; }}
              >
                <Camera size={16} />
                Enregistrer mon visage
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid of Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isOfficier ? 'repeat(auto-fit, minmax(340px, 1fr))' : 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '24px'
      }}>
        {/* Contact Info Card */}
        <div style={{
          background: 'white', border: '1px solid var(--border-color)',
          borderRadius: '24px', padding: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
          className="profile-card"
        >
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={18} style={{ color: '#10b981' }} />
            </div>
            Informations personnelles
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {user.telephone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Phone size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Téléphone</div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>{user.telephone}</div>
                </div>
              </div>
            )}
            {user.email && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>{user.email}</div>
                </div>
              </div>
            )}
            {user.date_creation && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} style={{ color: '#10b981' }} />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Membre depuis</div>
                  <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>
                    {new Date(user.date_creation).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hierarchy / Périmètre Card */}
        <div style={{
          background: 'white', border: '1px solid var(--border-color)',
          borderRadius: '24px', padding: '2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s, box-shadow 0.2s'
        }}
          className="profile-card"
        >
          <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={18} style={{ color: '#10b981' }} />
            </div>
            Périmètre d'intervention
          </h2>

          {crumbs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2.5rem 0' }}>
              Aucun périmètre géographique assigné
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {crumbs.map((crumb, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0' }}>
                  {/* Timeline line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: '1rem' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                      background: `${crumb.color}15`,
                      border: `2px solid ${crumb.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: crumb.color
                    }}>
                      {crumb.icon}
                    </div>
                    {idx < crumbs.length - 1 && (
                      <div style={{ width: '2px', flex: '1', minHeight: '24px', background: `linear-gradient(to bottom, ${crumb.color}55, ${crumbs[idx + 1].color}55)`, marginTop: '4px', marginBottom: '4px' }} />
                    )}
                  </div>
                  {/* Label */}
                  <div style={{ paddingTop: '6px', paddingBottom: idx < crumbs.length - 1 ? '16px' : 0 }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: '700' }}>
                      {idx === 0 && userRegions.length > 0 ? 'Région' :
                        idx === 0 && userDepts.length > 0 ? 'Département' :
                          crumb.icon.type === Globe ? 'Région' :
                            crumb.icon.type === MapPin ? 'Département' :
                              crumb.icon.type === Building ? 'Commune' :
                                crumb.icon.type === Home ? 'Centre' :
                                  crumb.icon.type === Briefcase ? 'Bureau' : 'Service(s)'}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: '600', marginTop: '2px' }}>
                      {crumb.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signature & Cachet Preview Card */}
        {isOfficier && (
          <div style={{
            background: 'white', border: '1px solid var(--border-color)',
            borderRadius: '24px', padding: '2rem',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex', flexDirection: 'column'
          }}
            className="profile-card"
          >
            <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} style={{ color: '#10b981' }} />
              </div>
              Cachet & Signature
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
              {/* Cachet preview */}
              <div style={{ flex: 1, minHeight: '110px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cachet Officiel</div>
                <div style={{
                  flex: 1, border: '1px solid #f1f5f9', borderRadius: '12px', background: '#fafafa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', minHeight: '80px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  {cachetUrl ? (
                    <img src={`http://${window.location.hostname}:5000${cachetUrl}`} alt="Cachet" style={{ maxHeight: '75px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun cachet configuré</span>
                  )}
                </div>
              </div>

              {/* Signature preview */}
              <div style={{ flex: 1, minHeight: '110px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Signature Électronique</div>
                <div style={{
                  flex: 1, border: '1px solid #f1f5f9', borderRadius: '12px', background: '#fafafa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', minHeight: '80px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.01)'
                }}>
                  {signatureUrl ? (
                    <img src={`http://${window.location.hostname}:5000${signatureUrl}`} alt="Signature" style={{ maxHeight: '60px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucune signature configurée</span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSignatureModalOpen(true);
                setActiveSigTab('draw');
              }}
              style={{
                marginTop: '1.5rem', width: '100%', padding: '0.75rem', borderRadius: '12px',
                background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.15)',
                fontWeight: '700', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                transition: 'all 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)'}
            >
              <PenTool size={16} /> Configurer cachet & signature
            </button>
          </div>
        )}
      </div>

      {/* Backup & Restore Utility Section */}
      {canBackupRestore && (
        <div style={{
          background: 'white', border: '1px solid var(--border-color)',
          borderRadius: '24px', padding: '2.5rem 2rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          marginTop: '24px', position: 'relative', overflow: 'hidden'
        }} className="profile-card">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            style={{ display: 'none' }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
            <div style={{ flex: '1 1 500px' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={20} style={{ color: '#10b981' }} />
                </div>
                Sauvegarde & Restauration des Données
              </h2>
              <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                En tant qu'administrateur de niveau supérieur, vous avez le droit de sauvegarder et de restaurer les données complètes de la plateforme Teranga Civil. 
                Toutes les tables clés (dossiers, demandes d'actes civils, utilisateurs, configurations et métadonnées) seront exportées dans un fichier JSON hautement sécurisé et structuré.
              </p>
              <div style={{ display: 'flex', gap: '2rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <Check size={14} style={{ color: '#10b981' }} /> Export complet des documents
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <Check size={14} style={{ color: '#10b981' }} /> Intégrité des données vérifiée
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <Check size={14} style={{ color: '#10b981' }} /> Restauration locale rapide
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '280px', flex: '0 0 auto' }}>
              <button
                onClick={handleExportBackup}
                disabled={backupLoading}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none',
                  padding: '0.85rem 1.5rem', borderRadius: '14px', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s',
                  opacity: backupLoading ? 0.7 : 1
                }}
                onMouseOver={e => { if(!backupLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)'; } }}
                onMouseOut={e => { if(!backupLoading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.2)'; } }}
              >
                {backupLoading ? (
                  <span className="spinner" style={{ width: '16px', height: '16px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
                ) : <DownloadCloud size={18} />}
                {backupLoading ? 'Préparation...' : 'Sauvegarder la plateforme'}
              </button>

              <button
                onClick={handleTriggerRestore}
                style={{
                  background: 'white', color: '#475569', border: '1.5px solid #e2e8f0',
                  padding: '0.85rem 1.5rem', borderRadius: '14px', cursor: 'pointer',
                  fontSize: '0.95rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                  transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.01)'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
              >
                <RefreshCw size={18} style={{ color: '#64748b' }} />
                Restaurer une sauvegarde
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Restoration Modal Overlay */}
      {showRestoreModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1.5rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '28px', width: '100%', maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)', overflow: 'hidden',
            padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid rgba(255, 255, 255, 0.8)'
          }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '18px',
              background: restoreProgress < 100 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
            }}>
              {restoreProgress < 100 ? (
                <Server size={30} style={{ color: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
              ) : (
                <Check size={30} style={{ color: '#10b981', strokeWidth: 3 }} />
              )}
            </div>

            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', textAlign: 'center' }}>
              {restoreProgress < 100 ? 'Restauration du système...' : 'Restauration complétée !'}
            </h3>
            <p style={{ margin: '0 0 2rem', fontSize: '0.88rem', color: '#64748b', textAlign: 'center', maxWidth: '380px' }}>
              {restoreProgress < 100 
                ? 'Veuillez patienter pendant la réindexation de la plateforme. Ne fermez pas votre navigateur.'
                : 'Les données de la sauvegarde ont été réindexées avec succès et le tableau de bord a été synchronisé.'
              }
            </p>

            {/* Custom linear progress bar */}
            <div style={{ width: '100%', height: '8px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden', marginBottom: '2rem', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${restoreProgress}%`,
                background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                borderRadius: '999px', transition: 'width 0.1s linear'
              }} />
            </div>

            {/* Live Progress Logs */}
            <div style={{ width: '100%', background: '#f8fafc', borderRadius: '16px', padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '2.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600', color: restoreStep >= 1 ? '#0f172a' : '#94a3b8' }}>
                <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '50%', background: restoreStep >= 1 ? '#10b981' : '#94a3b8' }} />
                <span>Lecture & validation du fichier de sauvegarde JSON</span>
                {restoreStep >= 1 && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓ OK</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600', color: restoreStep >= 2 ? '#0f172a' : '#94a3b8' }}>
                <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '50%', background: restoreStep >= 2 ? '#10b981' : '#94a3b8' }} />
                <span>Restauration de la base utilisateurs ({user.commune_nom || 'Locale'})</span>
                {restoreStep >= 2 && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓ OK</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600', color: restoreStep >= 3 ? '#0f172a' : '#94a3b8' }}>
                <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '50%', background: restoreStep >= 3 ? '#10b981' : '#94a3b8' }} />
                <span>Restauration des registres administratifs</span>
                {restoreStep >= 3 && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓ OK</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600', color: restoreStep >= 4 ? '#0f172a' : '#94a3b8' }}>
                <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '50%', background: restoreStep >= 4 ? '#10b981' : '#94a3b8' }} />
                <span>Re-génération des indexes de performance</span>
                {restoreStep >= 4 && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓ OK</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', fontWeight: '600', color: restoreStep >= 5 ? '#0f172a' : '#94a3b8' }}>
                <span style={{ display: 'inline-flex', width: '6px', height: '6px', borderRadius: '50%', background: restoreStep >= 5 ? '#10b981' : '#94a3b8' }} />
                <span>Synchronisation du dashboard administrateur</span>
                {restoreStep >= 5 && <span style={{ marginLeft: 'auto', color: '#10b981' }}>✓ OK</span>}
              </div>
            </div>

            {restoreProgress === 100 && (
              <button
                onClick={() => {
                  setShowRestoreModal(false);
                  window.location.reload();
                }}
                style={{
                  width: '100%', padding: '0.85rem', borderRadius: '14px', background: '#0f172a', color: 'white',
                  border: 'none', fontWeight: '700', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#1e293b'}
                onMouseOut={e => e.currentTarget.style.background = '#0f172a'}
              >
                Fermer & Actualiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* Signature & Cachet Modal */}
      {isSignatureModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '600px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem', background: 'linear-gradient(to right, #f8fafc, #fff)',
              borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={20} style={{ color: '#10b981' }} /> Cachet & Signature Officielle
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configurez vos éléments d'authentification et de validation</p>
              </div>
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                style={{
                  background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b',
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', padding: '0.5rem 1rem 0' }}>
              <button
                onClick={() => setActiveSigTab('draw')}
                style={{
                  padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeSigTab === 'draw' ? '3px solid #10b981' : '3px solid transparent',
                  color: activeSigTab === 'draw' ? '#10b981' : '#64748b', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Dessiner la signature
              </button>
              <button
                onClick={() => setActiveSigTab('upload-sig')}
                style={{
                  padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeSigTab === 'upload-sig' ? '3px solid #10b981' : '3px solid transparent',
                  color: activeSigTab === 'upload-sig' ? '#10b981' : '#64748b', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Importer une signature
              </button>
              <button
                onClick={() => setActiveSigTab('upload-cachet')}
                style={{
                  padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeSigTab === 'upload-cachet' ? '3px solid #10b981' : '3px solid transparent',
                  color: activeSigTab === 'upload-cachet' ? '#10b981' : '#64748b', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                Cachet Officiel
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem' }}>
              {activeSigTab === 'draw' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Dessinez votre signature dans le cadre blanc ci-dessous (souris ou écran tactile).
                  </p>
                  <div style={{ border: '2px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', background: '#fff', position: 'relative', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)' }}>
                    <canvas
                      ref={sigCanvas}
                      width={520}
                      height={200}
                      style={{ width: '100%', height: '200px', touchAction: 'none', cursor: 'crosshair', background: '#fafafa' }}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseOut={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <button
                      onClick={clearCanvas}
                      style={{
                        background: 'transparent', border: '1px solid #cbd5e1', color: '#475569',
                        padding: '0.6rem 1.25rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={16} /> Effacer le tracé
                    </button>
                    <button
                      onClick={async () => {
                        await handleSaveSignature();
                        setIsSignatureModalOpen(false);
                      }}
                      disabled={savingSignature || canvasEmpty}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none',
                        padding: '0.6rem 1.5rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        opacity: (savingSignature || canvasEmpty) ? 0.5 : 1
                      }}
                    >
                      {savingSignature ? 'Sauvegarde...' : <><Check size={16} /> Enregistrer la signature</>}
                    </button>
                  </div>
                </div>
              )}

              {activeSigTab === 'upload-sig' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Sélectionnez un fichier image de votre signature (format PNG avec fond transparent recommandé).
                  </p>
                  <div style={{
                    border: '2px dashed #cbd5e1', borderRadius: '16px',
                    padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    background: '#f8fafc', transition: 'all 0.2s'
                  }}>
                    {signatureUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <img src={`http://${window.location.hostname}:5000${signatureUrl}`} alt="Signature" style={{ maxHeight: '80px', objectFit: 'contain' }} />
                        <button
                          onClick={async () => {
                            const patchRes = await fetch(`${API_BASE_URL}/users/${user.id}/signature`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ signatureUrl: '' })
                            });
                            if (patchRes.ok) setSignatureUrl(null);
                          }}
                          style={{
                            background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px',
                            padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} /> Supprimer la signature
                        </button>
                      </div>
                    ) : (
                      <>
                        <UploadCloud size={40} style={{ color: '#10b981' }} />
                        <label style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '0.6rem 1.5rem',
                          borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                          opacity: uploadingSignature ? 0.7 : 1, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                        }}>
                          {uploadingSignature ? 'Téléchargement...' : 'Choisir un fichier image'}
                          <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleUploadSignature} disabled={uploadingSignature} />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}

              {activeSigTab === 'upload-cachet' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Téléversez le cachet officiel de la commune (format PNG transparent recommandé).
                  </p>
                  <div style={{
                    border: '2px dashed #cbd5e1', borderRadius: '16px',
                    padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: '1rem',
                    background: '#f8fafc', transition: 'all 0.2s'
                  }}>
                    {cachetUrl ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <img src={`http://${window.location.hostname}:5000${cachetUrl}`} alt="Cachet Officiel" style={{ maxHeight: '100px', objectFit: 'contain' }} />
                        <button
                          onClick={async () => {
                            const patchRes = await fetch(`${API_BASE_URL}/users/${user.id}/signature`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ cachetUrl: '' })
                            });
                            if (patchRes.ok) setCachetUrl(null);
                          }}
                          style={{
                            background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px',
                            padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} /> Supprimer le cachet
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon size={40} style={{ color: '#10b981' }} />
                        <label style={{
                          background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '0.6rem 1.5rem',
                          borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600',
                          opacity: uploadingCachet ? 0.7 : 1, boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
                        }}>
                          {uploadingCachet ? 'Téléchargement...' : 'Choisir un fichier image'}
                          <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleUploadCachet} disabled={uploadingCachet} />
                        </label>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                style={{
                  padding: '10px 20px', borderRadius: '12px', background: '#e2e8f0', color: '#475569',
                  border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#cbd5e1'}
                onMouseOut={e => e.currentTarget.style.background = '#e2e8f0'}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Face Registration Modal */}
      {isFaceModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '560px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem 2rem', background: 'linear-gradient(to right, #f8fafc, #fff)',
              borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Camera size={20} style={{ color: '#3b82f6' }} /> Enregistrer mon visage
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configurez votre empreinte faciale pour la reconnaissance de pointage</p>
              </div>
              <button
                onClick={() => {
                  setIsFaceModalOpen(false);
                  setImgPreview(null);
                  setFaceError('');
                  setFaceSuccess('');
                }}
                style={{
                  background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b',
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '2rem' }}>
              {faceError && (
                <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> {faceError}
                </div>
              )}
              {faceSuccess && (
                <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check size={16} /> {faceSuccess}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', alignItems: 'center' }}>
                {!imgPreview ? (
                  <>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, width: '100%', textAlign: 'center' }}>
                      Positionnez votre visage au centre du cadre puis cliquez sur "Prendre la photo".
                    </p>
                    <div style={{
                      width: '100%',
                      height: '320px',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      background: '#0a0f1d',
                      position: 'relative',
                      border: '2px solid rgba(59, 130, 246, 0.2)',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
                    }}>
                      <video
                        ref={videoRef}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                      />
                      
                      {/* Neon glowing high-tech frame overlay */}
                      <div style={{
                        position: 'absolute',
                        inset: '12%',
                        border: '2px solid rgba(59, 130, 246, 0.35)',
                        borderRadius: '24px',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animation: 'pulseGlow 2s infinite ease-in-out'
                      }}>
                        {/* Corners */}
                        <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '24px', height: '24px', borderTop: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderTopLeftRadius: '12px' }} />
                        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '24px', height: '24px', borderTop: '4px solid #3b82f6', borderRight: '4px solid #3b82f6', borderTopRightRadius: '12px' }} />
                        <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '24px', height: '24px', borderBottom: '4px solid #3b82f6', borderLeft: '4px solid #3b82f6', borderBottomLeftRadius: '12px' }} />
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderBottom: '4px solid #3b82f6', borderRight: '4px solid #3b82f6', borderBottomRightRadius: '12px' }} />

                        {/* Scanner Laser Line */}
                        <div style={{
                          position: 'absolute',
                          left: '5%',
                          right: '5%',
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, #3b82f6, #60a5fa, #3b82f6, transparent)',
                          boxShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 20px rgba(96, 165, 250, 0.5)',
                          animation: 'scanLine 4s infinite ease-in-out'
                        }} />

                        {/* Centered face guide circle */}
                        <div style={{
                          width: '75%',
                          height: '75%',
                          border: '1.5px dashed rgba(59, 130, 246, 0.45)',
                          borderRadius: '50%',
                          opacity: 0.85
                        }} />
                      </div>
                    </div>
                    
                    <button
                      onClick={capturePhoto}
                      style={{
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none',
                        padding: '0.8rem 2.25rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                      }}
                      onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(37, 99, 235, 0.4)'; }}
                      onMouseOut={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.3)'; }}
                    >
                      <Camera size={18} /> Prendre la photo
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: '100%',
                      height: '320px',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      background: '#0a0f1d',
                      position: 'relative',
                      border: '2px solid #10b981',
                      boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)'
                    }}>
                      <img
                        src={imgPreview}
                        alt="Face Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      
                      {/* Success framing guide */}
                      <div style={{
                        position: 'absolute',
                        inset: '12%',
                        border: '2px solid rgba(16, 185, 129, 0.4)',
                        borderRadius: '24px',
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {/* Corners */}
                        <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '24px', height: '24px', borderTop: '4px solid #10b981', borderLeft: '4px solid #10b981', borderTopLeftRadius: '12px' }} />
                        <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '24px', height: '24px', borderTop: '4px solid #10b981', borderRight: '4px solid #10b981', borderTopRightRadius: '12px' }} />
                        <div style={{ position: 'absolute', bottom: '-2px', left: '-2px', width: '24px', height: '24px', borderBottom: '4px solid #10b981', borderLeft: '4px solid #10b981', borderBottomLeftRadius: '12px' }} />
                        <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '24px', height: '24px', borderBottom: '4px solid #10b981', borderRight: '4px solid #10b981', borderBottomRightRadius: '12px' }} />
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setImgPreview(null);
                          setFaceError('');
                        }}
                        disabled={uploadingFace}
                        style={{
                          flex: 1, background: 'transparent', border: '1px solid #cbd5e1', color: '#475569',
                          padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600',
                          transition: 'all 0.2s', opacity: uploadingFace ? 0.5 : 1
                        }}
                        onMouseOver={e => { if (!uploadingFace) e.currentTarget.style.background = '#f8fafc'; }}
                        onMouseOut={e => { if (!uploadingFace) e.currentTarget.style.background = 'transparent'; }}
                      >
                        Recommencer
                      </button>
                      <button
                        onClick={handleSubmitCaptured}
                        disabled={uploadingFace}
                        style={{
                          flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none',
                          padding: '0.8rem', borderRadius: '12px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '700',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                          opacity: uploadingFace ? 0.5 : 1
                        }}
                        onMouseOver={e => { if (!uploadingFace) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 18px rgba(16, 185, 129, 0.4)'; } }}
                        onMouseOut={e => { if (!uploadingFace) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(16, 185, 129, 0.3)'; } }}
                      >
                        {uploadingFace ? 'Analyse...' : <><Check size={18} /> Valider et enregistrer</>}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.25rem 2rem', background: '#f8fafc', borderTop: '1px solid #f1f5f9',
              display: 'flex', justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setIsFaceModalOpen(false);
                  setImgPreview(null);
                  setFaceError('');
                  setFaceSuccess('');
                }}
                disabled={uploadingFace}
                style={{
                  padding: '10px 20px', borderRadius: '12px', background: '#e2e8f0', color: '#475569',
                  border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                  opacity: uploadingFace ? 0.5 : 1
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full breadcrumb path */}
      {crumbs.length > 0 && (
        <div style={{
          background: 'white', border: '1px solid var(--border-color)',
          borderRadius: '24px', padding: '1.25rem 2rem',
          display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.25rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.02)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '0.5rem', fontWeight: '600' }}>Chemin complet :</span>
          {crumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span style={{
                fontSize: '0.85rem', color: crumb.color, fontWeight: '600',
                display: 'flex', alignItems: 'center', gap: '0.3rem'
              }}>
                {crumb.icon} {crumb.label}
              </span>
              {idx < crumbs.length - 1 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              padding: '1.5rem 2rem', background: 'linear-gradient(to right, #f8fafc, #fff)',
              borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Modifier mon profil</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Mettez à jour vos informations personnelles</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b',
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {editError && (
                <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> {editError}
                </div>
              )}

              {/* Champ Nom Complet */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Nom complet <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <User size={18} />
                  </div>
                  <input
                    type="text"
                    value={editFormData.nomComplet}
                    onChange={e => setEditFormData({ ...editFormData, nomComplet: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px', fontSize: '0.95rem',
                      border: '1.5px solid #e2e8f0', borderRadius: '12px', outline: 'none',
                      transition: 'all 0.2s', background: '#f8fafc', color: '#0f172a'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Champ Téléphone */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Téléphone <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Phone size={18} />
                    </div>
                    <input
                      type="tel"
                      value={editFormData.telephone}
                      onChange={e => setEditFormData({ ...editFormData, telephone: e.target.value })}
                      required
                      style={{
                        width: '100%', padding: '12px 14px 12px 42px', fontSize: '0.95rem',
                        border: '1.5px solid #e2e8f0', borderRadius: '12px', outline: 'none',
                        transition: 'all 0.2s', background: '#f8fafc', color: '#0f172a'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>

                {/* Champ Email */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                    Email <span style={{ color: '#94a3b8', fontWeight: '400' }}>(Optionnel)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                      style={{
                        width: '100%', padding: '12px 14px 12px 42px', fontSize: '0.95rem',
                        border: '1.5px solid #e2e8f0', borderRadius: '12px', outline: 'none',
                        transition: 'all 0.2s', background: '#f8fafc', color: '#0f172a'
                      }}
                      onFocus={e => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(99,102,241,0.1)'; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                    />
                  </div>
                </div>
              </div>

              {/* Ligne Séparatrice */}
              <div style={{ height: '1px', background: '#f1f5f9', margin: '0.5rem 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={editLoading}
                  style={{
                    padding: '10px 20px', borderRadius: '12px', background: '#f1f5f9', color: '#475569',
                    border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff',
                    border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: editLoading ? 0.7 : 1
                  }}
                  onMouseOver={e => { if (!editLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)'; } }}
                  onMouseOut={e => { if (!editLoading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)'; } }}
                >
                  {editLoading ? 'Enregistrement...' : <><Check size={18} /> Mettre à jour</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Password Modal */}
      {isPasswordModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: '#fff', borderRadius: '24px', width: '100%', maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}>
            <div style={{
              padding: '1.5rem 2rem', background: 'linear-gradient(to right, #f8fafc, #fff)',
              borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>Changer le mot de passe</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Saisissez votre mot de passe actuel pour des raisons de sécurité</p>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                style={{
                  background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b',
                  width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#0f172a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#64748b'; }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {passwordError && (
                <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '12px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} /> {passwordError}
                </div>
              )}

              {/* Champ Mot de passe actuel */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Mot de passe actuel <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordFormData.currentPassword}
                    onChange={e => setPasswordFormData({ ...passwordFormData, currentPassword: e.target.value })}
                    required
                    style={{
                      width: '100%', padding: '12px 48px 12px 42px', fontSize: '0.95rem',
                      border: '1.5px solid #e2e8f0', borderRadius: '12px', outline: 'none',
                      transition: 'all 0.2s', background: '#f8fafc', color: '#0f172a',
                      fontFamily: showPassword ? 'inherit' : 'caption'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                      background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px',
                      borderRadius: '50%', transition: 'color 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.color = '#10b981'}
                    onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Ligne Séparatrice */}
              <div style={{ height: '1px', background: '#f1f5f9', margin: '0.5rem 0' }}></div>

              {/* Champ Nouveau mot de passe */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Nouveau mot de passe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Shield size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordFormData.newPassword}
                    onChange={e => setPasswordFormData({ ...passwordFormData, newPassword: e.target.value })}
                    required
                    minLength={6}
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px', fontSize: '0.95rem',
                      border: '1.5px solid #e2e8f0', borderRadius: '12px', outline: 'none',
                      transition: 'all 0.2s', background: '#f8fafc', color: '#0f172a',
                      fontFamily: showPassword ? 'inherit' : 'caption'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Champ Confirmer le mot de passe */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}>
                  Confirmer le mot de passe <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    <Check size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordFormData.confirmPassword}
                    onChange={e => setPasswordFormData({ ...passwordFormData, confirmPassword: e.target.value })}
                    required
                    minLength={6}
                    style={{
                      width: '100%', padding: '12px 14px 12px 42px', fontSize: '0.95rem',
                      border: '1.5px solid #e2e8f0', borderRadius: '12px', outline: 'none',
                      transition: 'all 0.2s', background: '#f8fafc', color: '#0f172a',
                      fontFamily: showPassword ? 'inherit' : 'caption'
                    }}
                    onFocus={e => { e.target.style.borderColor = '#10b981'; e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 4px rgba(16,185,129,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = '#e2e8f0'; e.target.style.background = '#f8fafc'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  disabled={passwordLoading}
                  style={{
                    padding: '10px 20px', borderRadius: '12px', background: '#f1f5f9', color: '#475569',
                    border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                  onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    padding: '10px 24px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                    border: 'none', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: '8px',
                    opacity: passwordLoading ? 0.7 : 1
                  }}
                  onMouseOver={e => { if (!passwordLoading) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(16,185,129,0.35)'; } }}
                  onMouseOut={e => { if (!passwordLoading) { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.25)'; } }}
                >
                  {passwordLoading ? 'Enregistrement...' : <><Lock size={18} /> Changer le mot de passe</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2), inset 0 0 15px rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 25px rgba(59, 130, 246, 0.55), inset 0 0 25px rgba(59, 130, 246, 0.55); border-color: rgba(59, 130, 246, 0.65); }
          100% { box-shadow: 0 0 15px rgba(59, 130, 246, 0.2), inset 0 0 15px rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.3); }
        }
        @keyframes scanLine {
          0% { top: 8%; }
          50% { top: 90%; }
          100% { top: 8%; }
        }
      `}</style>
    </div>
  );
};

export default MonProfil;
