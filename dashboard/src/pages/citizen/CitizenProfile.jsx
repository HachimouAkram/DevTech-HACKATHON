import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User, Shield, Lock, KeyRound, Bell, FileText, Star, Mic, MicOff,
  Moon, Sun, HelpCircle, Globe, Settings, LogOut, ChevronRight,
  ChevronDown, ChevronUp, CheckCircle, CheckCircle2, AlertCircle,
  Phone, Mail, MapPin, Camera, Trash2, Download, Eye, EyeOff,
  Search, Save, X, RefreshCw, Share2, MessageSquare, ThumbsUp,
  Activity, Check, ExternalLink, Printer, ArrowLeft, Volume2, Info
} from 'lucide-react';
import api, { API_BASE_URL } from '../../utils/api';

// 9 Questions Officielles de l'application Mobile (Strictement identiques)
const FAQ_ITEMS = [
  {
    question: "Comment suivre l'avancement de ma demande ?",
    answer: "Rendez-vous dans la section 'Mes demandes'. Chaque dossier dispose d'une frise chronologique détaillée en 5 étapes indiquant l'état en temps réel (Soumis, En attente, En cours, Validé ou Rejeté)."
  },
  {
    question: "Quels sont les délais de traitement des actes ?",
    answer: "Les délais dépendent du centre d'état civil choisi. En moyenne, l'instruction prend 2 à 5 jours ouvrés. Vous recevrez une notification in-app et un SMS dès que votre acte est disponible."
  },
  {
    question: "Le paiement des frais de dossier est-il sécurisé ?",
    answer: "Oui, tous les paiements effectués via Wave ou Orange Money sont entièrement chiffrés et sécurisés par nos passerelles de paiement partenaires agréées."
  },
  {
    question: "Puis-je retirer mon document dans n'importe quel centre ?",
    answer: "Non, votre demande d'acte civil doit être traitée et retirée (si présence physique requise) dans le centre d'état civil de la commune où l'événement d'origine a été enregistré."
  },
  {
    question: "Que faire si ma commune n'est pas dans la liste ?",
    answer: "Si votre commune ne figure pas dans les choix possibles, cela signifie qu'elle n'est pas encore numérisée sur SenInnov. Vous devrez effectuer vos démarches physiquement dans ce centre."
  },
  {
    question: "Quels documents justificatifs dois-je fournir en général ?",
    answer: "Cela dépend de la démarche (ex: certificat de mariage, acte de décès). Généralement, une copie lisible de votre CNI (Carte Nationale d'Identité) ou de votre passeport ainsi qu'un justificatif de domicile sont requis."
  },
  {
    question: "Puis-je faire une demande d'acte pour un tiers ?",
    answer: "Oui, à condition d'avoir les pièces justificatives requises (comme le livret de famille ou une procuration signée) et de préciser votre lien avec le titulaire dans les champs du formulaire."
  },
  {
    question: "Comment télécharger la version PDF signée officiellement ?",
    answer: "Une fois le statut de votre demande marqué comme 'Acte validé et signé', ouvrez les détails de la demande et cliquez sur le bouton 'Télécharger'. Vous pouvez également visualiser le document directement."
  },
  {
    question: "Comment fonctionne le système de signature numérique ?",
    answer: "L'officier d'état civil signe électroniquement votre acte grâce à un certificat sécurisé. Un code QR unique est imprimé sur le document, permettant à n'importe quelle administration de vérifier son authenticité en le scannant."
  }
];

// Section Header Component declared outside of render
const SectionHeader = ({ title, subtitle, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '10px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '38px',
          height: '38px',
          borderRadius: '12px',
          border: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: 'var(--bg-card, #ffffff)',
          color: 'var(--text-primary, #0f172a)',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        title="Retour au menu principal"
      >
        <ArrowLeft size={18} />
      </button>
      <div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: 0 }}>
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
    <button
      type="button"
      onClick={onBack}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '0.82rem',
        fontWeight: '700',
        color: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        border: '1px solid rgba(37, 99, 235, 0.15)',
        padding: '7px 14px',
        borderRadius: '10px',
        cursor: 'pointer'
      }}
    >
      <span>Vue d'ensemble</span>
    </button>
  </div>
);

export default function CitizenProfile({ user: initialUser, token, onLogout }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Section active : 'main', 'profile', 'security', 'favorites', 'downloads', 'voice', 'notifications', 'help', 'faq', 'api', 'references'
  const sectionParam = searchParams.get('section');
  const [activeSection, setActiveSection] = useState(sectionParam || 'main');

  useEffect(() => {
    if (sectionParam) {
      setActiveSection(sectionParam);
    }
  }, [sectionParam]);

  const setSection = (sec) => {
    setActiveSection(sec);
    if (sec === 'main') {
      searchParams.delete('section');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ section: sec }, { replace: true });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // État utilisateur
  const [currentUser, setCurrentUser] = useState(initialUser || {});
  useEffect(() => {
    if (initialUser) setCurrentUser(initialUser);
  }, [initialUser]);

  // Thème
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Toasts
  const [toastMessage, setToastMessage] = useState({ text: '', type: 'success' });
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage({ text: '', type: 'success' }), 4000);
  };

  // Avatar et photo
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar_url || null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Aperçu immédiat local
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await api.post('/upload', formData);
      if (uploadRes?.url || uploadRes?.data?.url) {
        const remoteUrl = uploadRes?.url || uploadRes?.data?.url;
        await api.patch(`/users/${currentUser.id}/avatar`, { avatar_url: remoteUrl });
        const updated = { ...currentUser, avatar_url: remoteUrl };
        setCurrentUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
        showToast('Photo de profil mise à jour avec succès');
      } else {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const b64 = reader.result;
          localStorage.setItem(`user_profile_image_${currentUser.id}`, b64);
          showToast('Photo enregistrée localement');
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.warn('Erreur téléversement avatar:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        localStorage.setItem(`user_profile_image_${currentUser.id}`, reader.result);
        showToast('Photo enregistrée localement');
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setAvatarPreview(null);
      localStorage.removeItem(`user_profile_image_${currentUser.id}`);
      await api.patch(`/users/${currentUser.id}/avatar`, { avatar_url: '' });
      const updated = { ...currentUser, avatar_url: null };
      setCurrentUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      showToast('Photo de profil supprimée');
    } catch (err) {
      console.warn('Erreur suppression avatar:', err);
      showToast('Photo supprimée localement');
    }
  };

  // 1. Édition des informations personnelles
  const [savingInfo, setSavingInfo] = useState(false);
  const [editNomComplet, setEditNomComplet] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLieuNaissance, setEditLieuNaissance] = useState('');
  const [editNin, setEditNin] = useState('');

  useEffect(() => {
    if (currentUser) {
      setEditNomComplet(currentUser.nom_complet || '');
      setEditTelephone(currentUser.telephone || '');
      setEditEmail(currentUser.email || '');
      setEditLieuNaissance(currentUser.lieu_naissance || '');
      setEditNin(currentUser.nin || currentUser.cni || '');
    }
  }, [currentUser]);

  const handleSaveInfo = async (e) => {
    if (e) e.preventDefault();
    if (!editNomComplet.trim() || !editTelephone.trim()) {
      showToast('Le nom complet et le numéro de téléphone sont obligatoires', 'error');
      return;
    }

    setSavingInfo(true);
    try {
      const payload = {
        nom_complet: editNomComplet.trim(),
        telephone: editTelephone.trim(),
        email: editEmail.trim() || undefined,
        lieu_naissance: editLieuNaissance.trim() || undefined,
        cni: editNin.trim() || undefined,
        role: currentUser.role || 'citoyen'
      };

      let updatedData = null;
      try {
        const res = await api.put('/users/me/profile', payload);
        updatedData = res?.user || res?.data?.user;
      } catch (err1) {
        // Fallback sur /users/:id
        const res2 = await api.put(`/users/${currentUser.id}`, payload);
        updatedData = res2?.user || res2?.data?.user;
      }

      const updated = { ...currentUser, ...payload, ...(updatedData || {}) };
      setCurrentUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      showToast('Profil mis à jour avec succès');
    } catch (err) {
      console.error('Erreur mise à jour profil:', err);
      showToast(err.message || 'Impossible de mettre à jour le profil', 'error');
    } finally {
      setSavingInfo(false);
    }
  };

  // 2. Sécurité & Mot de passe
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Modale suppression de compte
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleSavePassword = async (e) => {
    if (e) e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('Veuillez renseigner tous les champs du mot de passe', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Le nouveau mot de passe doit comporter au moins 6 caractères', 'error');
      return;
    }
    if (newPassword === oldPassword) {
      showToast("Le nouveau mot de passe doit être différent de l'ancien", 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Les deux nouveaux mots de passe ne correspondent pas', 'error');
      return;
    }

    setSavingPassword(true);
    try {
      try {
        await api.put('/users/me/password', {
          currentPassword: oldPassword,
          newPassword: newPassword
        });
      } catch (err1) {
        // Fallback sur /users/:id/password
        await api.put(`/users/${currentUser.id}/password`, {
          old_password: oldPassword,
          password: newPassword
        });
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Mot de passe mis à jour avec succès');
    } catch (err) {
      console.error('Erreur changement mot de passe:', err);
      showToast(err.message || 'Erreur lors de la modification du mot de passe', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      setDeleteError('Veuillez saisir votre mot de passe pour confirmer la suppression.');
      return;
    }

    setDeletingAccount(true);
    setDeleteError('');
    try {
      await api.delete(`/users/${currentUser.id}?password=${encodeURIComponent(deletePassword)}`);
      showToast('Votre compte a été supprimé avec succès');
      setTimeout(() => {
        if (onLogout) onLogout();
        else navigate('/login');
      }, 1000);
    } catch (err) {
      setDeleteError(err.message || 'Échec de la suppression du compte. Vérifiez votre mot de passe.');
    } finally {
      setDeletingAccount(false);
    }
  };

  // 3. Démarches favorites
  const [favorites, setFavorites] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);

  const favoritesKey = currentUser ? `favorite_activities_${currentUser.id || currentUser.email || 'guest'}` : 'favorite_activities_guest';

  const fetchFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const stored = localStorage.getItem(favoritesKey);
      const favIds = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(favIds) || favIds.length === 0) {
        setFavorites([]);
        setLoadingFavorites(false);
        return;
      }

      const res = await api.get('/activities');
      const allActs = res?.data?.activities || res?.activities || (Array.isArray(res?.data) ? res.data : []);
      const matched = allActs.filter(a => favIds.includes(String(a.id)) || favIds.includes(a.id));
      setFavorites(matched);
    } catch (err) {
      console.warn('Erreur chargement favoris:', err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const removeFavorite = (actId) => {
    try {
      const stored = localStorage.getItem(favoritesKey);
      let favIds = stored ? JSON.parse(stored) : [];
      favIds = favIds.filter(id => String(id) !== String(actId));
      localStorage.setItem(favoritesKey, JSON.stringify(favIds));
      setFavorites(prev => prev.filter(a => String(a.id) !== String(actId)));
      showToast('Démarche retirée des favoris');
    } catch (err) {
      console.warn('Erreur suppression favori:', err);
    }
  };

  // 4. Documents signés téléchargeables
  const [downloadDemandes, setDownloadDemandes] = useState([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewDemandeRef, setPreviewDemandeRef] = useState('');

  const fetchDownloads = async () => {
    setLoadingDownloads(true);
    try {
      const res = await api.get('/demandes');
      const list = res?.demandes || res?.data?.demandes || (Array.isArray(res?.data) ? res.data : []);
      const downloadable = list.filter(d => 
        ['valide', 'pret', 'valide_cloture'].includes(d.statut) &&
        !d.presence_physique_requise &&
        (d.has_document_final || d.fichier_document_final || d.statut === 'valide')
      );
      setDownloadDemandes(downloadable);
    } catch (err) {
      console.warn('Erreur chargement téléchargements:', err);
    } finally {
      setLoadingDownloads(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'favorites') {
      fetchFavorites();
    } else if (activeSection === 'downloads') {
      fetchDownloads();
    }
  }, [activeSection]);

  // 5. Assistant & Navigation vocale
  const [voiceEnabled, setVoiceEnabled] = useState(
    localStorage.getItem('voice_navigator_enabled') === 'true' ||
    localStorage.getItem('seninnov_voice_nav_enabled') === 'true'
  );
  const [speechPitch, setSpeechPitch] = useState(1);
  const [speechRate, setSpeechRate] = useState(1);
  const [voiceLang, setVoiceLang] = useState('fr');

  const toggleVoiceSetting = () => {
    const nextVal = !voiceEnabled;
    setVoiceEnabled(nextVal);
    localStorage.setItem('voice_navigator_enabled', String(nextVal));
    localStorage.setItem('seninnov_voice_nav_enabled', String(nextVal));
    window.dispatchEvent(new Event('storage'));
    showToast(nextVal ? 'Assistant vocal activé' : 'Assistant vocal désactivé');
  };

  const handleTestSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const text = "Bonjour ! L'assistant vocal SenInnov est prêt à vous guider dans toutes vos démarches administratives.";
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = voiceLang === 'wo' ? 'fr-FR' : 'fr-FR';
      utterance.rate = speechRate;
      utterance.pitch = speechPitch;
      window.speechSynthesis.speak(utterance);
      showToast("Synthèse vocale en cours d'exécution...");
    } else {
      showToast("La synthèse vocale n'est pas prise en charge sur ce navigateur", 'error');
    }
  };

  // 6. Notifications
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifSms, setNotifSms] = useState(true);
  const [notifEmail, setNotifEmail] = useState(false);
  const [notifRdv, setNotifRdv] = useState(true);

  // 7. FAQ
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [faqSearch, setFaqSearch] = useState('');

  const filteredFaqs = FAQ_ITEMS.filter(f => 
    f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
    f.answer.toLowerCase().includes(faqSearch.toLowerCase())
  );

  // 8. Configuration API & Diagnostic
  const [apiPingStatus, setApiPingStatus] = useState(null);
  const [apiLatency, setApiLatency] = useState(null);
  const [testingApi, setTestingApi] = useState(false);

  const testApiConnection = async () => {
    setTestingApi(true);
    setApiPingStatus(null);
    const start = Date.now();
    try {
      await api.get('/users/metadata');
      const latency = Date.now() - start;
      setApiLatency(latency);
      setApiPingStatus('success');
      showToast(`Serveur en ligne (${latency} ms)`);
    } catch (err) {
      const latency = Date.now() - start;
      setApiLatency(latency);
      setApiPingStatus('error');
      showToast('Échec de la connexion au serveur', 'error');
    } finally {
      setTestingApi(false);
    }
  };

  // 9. Références & Avis
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleSendFeedback = (e) => {
    e.preventDefault();
    if (!feedbackComment.trim()) {
      showToast("Veuillez saisir votre avis avant d'envoyer", 'error');
      return;
    }
    setSendingFeedback(true);
    setTimeout(() => {
      setSendingFeedback(false);
      setFeedbackSent(true);
      setFeedbackComment('');
      showToast('Merci ! Votre avis a été transmis avec succès.');
    }, 1200);
  };

  const handleShareApp = () => {
    const url = window.location.origin + '/citoyen';
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Lien de la plateforme copié dans le presse-papier !');
    } else {
      showToast('Partagez le lien : ' + url);
    }
  };

  const handleBackToMain = () => setSection('main');

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Toast Notification */}
      {toastMessage.text && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          backgroundColor: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '600',
          fontSize: '0.9rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toastMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Titre Général de la Page */}
      <div>
        <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 6px' }}>
          Profil & Paramètres Citoyen
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
          Gérez vos informations personnelles, votre sécurité, vos préférences vocales et vos documents officiels
        </p>
      </div>

      {/* Hero Card Citoyen (En-tête Identique Mobile) */}
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: '24px',
        padding: '1.75rem',
        border: '1px solid var(--border-color, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow décoratif */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(255,255,255,0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          {/* Avatar avec badge d'édition et statut en ligne */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '24px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.2rem',
                fontWeight: '800',
                boxShadow: '0 10px 25px rgba(37,99,235,0.25)',
                cursor: 'pointer',
                overflow: 'hidden',
                border: '3px solid #ffffff'
              }}
              title="Cliquez pour changer votre photo"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUser?.nom_complet ? currentUser.nom_complet.charAt(0).toUpperCase() : 'C'
              )}
            </div>

            {/* Bouton caméra miniature */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }}
              title="Changer la photo"
            >
              <Camera size={13} />
            </button>

            {/* Statut connecté */}
            <div
              style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
                border: '2px solid #ffffff'
              }}
              title="En ligne"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: 0 }}>
                {currentUser?.nom_complet || 'Citoyen'}
              </h2>
              <span style={{
                fontSize: '0.74rem',
                fontWeight: '800',
                color: '#059669',
                backgroundColor: '#ecfdf5',
                padding: '4px 10px',
                borderRadius: '999px',
                border: '1px solid #a7f3d0',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}>
                <CheckCircle size={12} />
                Compte Citoyen Vérifié
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.86rem', color: 'var(--text-secondary, #64748b)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Phone size={14} color="#94a3b8" />
                {currentUser?.telephone || 'Numéro non renseigné'}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <Mail size={14} color="#94a3b8" />
                {currentUser?.email || 'Email non renseigné'}
              </span>
              {currentUser?.lieu_naissance && (
                <>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="#94a3b8" />
                    {currentUser.lieu_naissance}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Boutons d'action rapide */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setSection('profile')}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              border: '1px solid rgba(37,99,235,0.2)',
              backgroundColor: 'rgba(37,99,235,0.06)',
              color: '#2563eb',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <User size={15} />
            <span>Modifier</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter de votre compte citoyen ?')) {
                if (onLogout) onLogout();
                else navigate('/login');
              }
            }}
            style={{
              padding: '9px 16px',
              borderRadius: '12px',
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={15} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Navigation Rapide par Onglets (Accessible sur toutes les vues) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        overflowX: 'auto',
        paddingBottom: '4px',
        scrollbarWidth: 'none'
      }}>
        {[
          { id: 'main', label: "Vue d'ensemble", icon: Settings },
          { id: 'profile', label: 'Mon Profil', icon: User },
          { id: 'security', label: 'Sécurité', icon: Shield },
          { id: 'favorites', label: 'Favoris', icon: Star },
          { id: 'downloads', label: 'Documents Signés', icon: FileText },
          { id: 'voice', label: 'Assistant Vocal', icon: Mic },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'faq', label: 'FAQ Officielle', icon: HelpCircle },
          { id: 'help', label: "Centre d'Aide", icon: HelpCircle },
          { id: 'api', label: 'Configuration API', icon: Activity },
          { id: 'references', label: 'Références & Avis', icon: Globe }
        ].map(tab => {
          const isActive = activeSection === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 16px',
                borderRadius: '12px',
                fontSize: '0.84rem',
                fontWeight: isActive ? '800' : '600',
                backgroundColor: isActive ? '#2563eb' : 'var(--bg-card, #ffffff)',
                color: isActive ? '#ffffff' : 'var(--text-secondary, #64748b)',
                border: isActive ? '1px solid #2563eb' : '1px solid var(--border-color, #e2e8f0)',
                boxShadow: isActive ? '0 4px 12px rgba(37,99,235,0.2)' : 'none',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={14} color={isActive ? '#ffffff' : '#94a3b8'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* VUE PRINCIPALE : VUE D'ENSEMBLE (Identique aux menus de l'app mobile)    */}
      {/* ========================================================================= */}
      {activeSection === 'main' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Groupe : MON COMPTE */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px' }}>
              Mon Compte
            </div>
            <div style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
              <div
                onClick={() => setSection('profile')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <User size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Mon Profil</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Informations personnelles & coordonnées</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              <div
                onClick={() => setSection('security')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Shield size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Sécurité</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Mot de passe & suppression du compte</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          </div>

          {/* Groupe : DÉMARCHES */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px' }}>
              Démarches & Documents
            </div>
            <div style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
              <div
                onClick={() => setSection('favorites')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Star size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Favoris</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Vos types de documents favoris</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              <div
                onClick={() => setSection('downloads')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <FileText size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Télécharger documents</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Accéder à vos actes officiels signés en PDF</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          </div>

          {/* Groupe : PARAMÈTRES & ACCESSIBILITÉ */}
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', paddingLeft: '4px' }}>
              Paramètres & Accessibilité
            </div>
            <div style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '20px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
              
              {/* Apparence */}
              <div
                onClick={toggleTheme}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: theme === 'dark' ? '#334155' : '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    {theme === 'dark' ? <Moon size={19} /> : <Sun size={19} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Apparence</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Mode actuel : {theme === 'dark' ? 'Sombre' : 'Clair'}</div>
                  </div>
                </div>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', padding: '5px 12px', borderRadius: '8px' }}>
                  Basculer
                </span>
              </div>

              {/* Assistant & Navigation vocale */}
              <div
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color, #f1f5f9)' }}
              >
                <div 
                  onClick={() => setSection('voice')}
                  style={{ display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flex: 1 }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Mic size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Assistant & Navigation vocale</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
                      {voiceEnabled ? 'Bouton micro actif sur vos écrans' : 'Désactivé (masqué par défaut)'}
                    </div>
                  </div>
                </div>
                <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={toggleVoiceSetting}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: voiceEnabled ? '#2563eb' : '#cbd5e1',
                    borderRadius: '34px',
                    transition: '0.2s',
                    boxShadow: voiceEnabled ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
                  }}>
                    <span style={{
                      position: 'absolute', content: '""', height: '20px', width: '20px', left: voiceEnabled ? '24px' : '3px', bottom: '3px',
                      backgroundColor: 'white', borderRadius: '50%', transition: '0.2s'
                    }} />
                  </span>
                </label>
              </div>

              {/* Notifications */}
              <div
                onClick={() => setSection('notifications')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Bell size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Notifications</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>In-App, SMS, Email & rappels de RDV</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Configuration API */}
              <div
                onClick={() => setSection('api')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Settings size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Configuration API & Serveur</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Adresse du serveur et diagnostic de synchronisation</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Centre d'aide */}
              <div
                onClick={() => setSection('help')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <HelpCircle size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Centre d'aide & Contact</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Assistance téléphonique, email & mentions légales</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* FAQ Officielle */}
              <div
                onClick={() => setSection('faq')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid var(--border-color, #f1f5f9)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <HelpCircle size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Foire Aux Questions (FAQ)</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Consulter les 9 questions clés des démarches</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>

              {/* Références & Avis */}
              <div
                onClick={() => setSection('references')}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.015)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                    <Globe size={19} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Références & Avis</div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Langue de l'application, partager & donner votre avis</div>
                  </div>
                </div>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          </div>

          {/* Bouton de Déconnexion */}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                if (onLogout) onLogout();
                else navigate('/login');
              }
            }}
            style={{
              padding: '16px 20px',
              borderRadius: '20px',
              border: '1px solid #fee2e2',
              backgroundColor: 'var(--bg-card, #ffffff)',
              color: '#ef4444',
              fontSize: '0.95rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 2px 10px rgba(239,68,68,0.04)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--bg-card, #ffffff)'}
          >
            <LogOut size={18} color="#ef4444" />
            <span>Se déconnecter</span>
          </button>

          <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary, #94a3b8)', padding: '10px 0 20px' }}>
            SenInnov v1.0.0 · Plateforme Officielle de l'État Civil Sénégalais © 2026
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 1 : MON PROFIL (Édition des coordonnées)                         */}
      {/* ========================================================================= */}
      {activeSection === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Mon Profil & Coordonnées"
            subtitle="Modifiez vos informations personnelles et identifiants officiels"
          />

          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
          }}>
            <form onSubmit={handleSaveInfo}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Nom Complet *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={editNomComplet}
                      onChange={e => setEditNomComplet(e.target.value)}
                      required
                      placeholder="Ex: Abdoulaye Diallo"
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Numéro de Téléphone *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="tel"
                      value={editTelephone}
                      onChange={e => setEditTelephone(e.target.value)}
                      required
                      placeholder="Ex: 77 123 45 67"
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Adresse E-mail
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="Ex: citoyen@exemple.sn"
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Lieu de Naissance
                  </label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={editLieuNaissance}
                      onChange={e => setEditLieuNaissance(e.target.value)}
                      placeholder="Ex: Dakar, Thiès, Saint-Louis..."
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Numéro CNI / NIN (Identité Nationale)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Shield size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={editNin}
                      onChange={e => setEditNin(e.target.value)}
                      placeholder="Ex: 1 234 1990 00123"
                      style={{
                        width: '100%',
                        padding: '12px 14px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Rôle & Statut
                  </label>
                  <input
                    type="text"
                    value="Citoyen vérifié (Accès portail complet)"
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      backgroundColor: 'rgba(0,0,0,0.03)',
                      color: 'var(--text-secondary, #64748b)',
                      fontSize: '0.9rem',
                      fontWeight: '600'
                    }}
                  />
                </div>
              </div>

              {/* Actions Formulaire */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '2rem', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => setSection('main')}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary, #64748b)',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: savingInfo ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                    opacity: savingInfo ? 0.7 : 1
                  }}
                >
                  {savingInfo ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Enregistrer les modifications</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2 : SÉCURITÉ & MOT DE PASSE (Avec Zone Danger)                    */}
      {/* ========================================================================= */}
      {activeSection === 'security' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Sécurité & Authentification"
            subtitle="Modifiez votre mot de passe et gérez la confidentialité de votre compte"
          />

          {/* Formulaire Changement Mot de Passe */}
          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            boxShadow: '0 4px 15px rgba(0,0,0,0.02)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="#2563eb" />
              Modifier mon mot de passe
            </h3>

            <form onSubmit={handleSavePassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '540px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Mot de passe actuel *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld(v => !v)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Nouveau mot de passe *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Au moins 6 caractères"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {newPassword && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: newPassword.length >= 6 ? '#059669' : '#e11d48', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} />
                      {newPassword.length >= 6 ? 'Longueur conforme (au moins 6 caractères)' : 'Trop court (min. 6 caractères requis)'}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Confirmer le nouveau mot de passe *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Confirmez à l'identique"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 42px 12px 42px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-color, #cbd5e1)',
                        backgroundColor: 'var(--bg-primary, #f8fafc)',
                        color: 'var(--text-primary, #0f172a)',
                        fontSize: '0.9rem'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== newPassword && (
                    <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> Les mots de passe ne correspondent pas
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    style={{
                      padding: '11px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: '700',
                      cursor: savingPassword ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                      opacity: savingPassword ? 0.7 : 1
                    }}
                  >
                    {savingPassword ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        <span>Mise à jour...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound size={16} />
                        <span>Mettre à jour le mot de passe</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* ZONE DANGER : Suppression du compte citoyen */}
          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid #fee2e2',
            boxShadow: '0 4px 15px rgba(239,68,68,0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', maxWidth: '600px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                  <Trash2 size={20} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#ef4444', margin: '0 0 6px' }}>
                    Zone de Danger : Supprimer mon compte citoyen
                  </h4>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #64748b)', margin: 0, lineHeight: 1.5 }}>
                    Attention : cette action est irréversible. Toutes vos demandes d'actes d'état civil, vos justificatifs, vos rendez-vous et vos historiques personnels seront définitivement effacés de la plateforme SenInnov.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  fontSize: '0.86rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Trash2 size={16} />
                <span>Supprimer mon compte</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION DE SUPPRESSION DE COMPTE */}
      {deleteModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '2rem',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #fee2e2'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem', color: '#ef4444' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertCircle size={22} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>Confirmation de suppression</h3>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Veuillez saisir votre mot de passe pour confirmer la suppression définitive de votre compte citoyen :
            </p>

            {deleteError && (
              <div style={{ padding: '10px 14px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={15} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
              <input
                type={showDeletePwd ? 'text' : 'password'}
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                placeholder="Votre mot de passe actuel"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color, #cbd5e1)',
                  backgroundColor: 'var(--bg-primary, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)',
                  fontSize: '0.9rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowDeletePwd(v => !v)}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                {showDeletePwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setDeleteModalOpen(false); setDeletePassword(''); setDeleteError(''); }}
                style={{ padding: '10px 18px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', color: '#64748b', fontSize: '0.86rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: '700',
                  cursor: deletingAccount ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {deletingAccount ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3 : DÉMARCHES FAVORITES                                           */}
      {/* ========================================================================= */}
      {activeSection === 'favorites' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Mes Démarches Favorites"
            subtitle="Accédez en 1 clic à vos actes les plus couramment demandés"
          />

          {loadingFavorites ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Chargement de vos favoris...</div>
            </div>
          ) : favorites.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '24px',
              padding: '3rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fef3c7', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Star size={30} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 6px' }}>
                Aucune démarche favorite
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                Vous pouvez ajouter des actes en favoris lors de votre navigation sur l'accueil pour y accéder immédiatement.
              </p>
              <button
                type="button"
                onClick={() => navigate('/citoyen')}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Explorer les actes disponibles
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {favorites.map(act => (
                <div
                  key={act.id}
                  style={{
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    border: '1px solid var(--border-color, #e2e8f0)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', padding: '3px 8px', borderRadius: '6px' }}>
                        {act.service_nom || 'État civil'}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFavorite(act.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Retirer des favoris"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                      {act.nom}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                      Frais : <strong style={{ color: act.prix === 0 ? '#059669' : '#2563eb' }}>{act.prix === 0 ? 'Gratuit' : `${act.prix} CFA`}</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/citoyen/demande/nouvelle?activityId=${act.id}&bureauId=${act.bureau_id || ''}`)}
                    style={{
                      width: '100%',
                      padding: '9px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.84rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>Commencer la démarche</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4 : DOCUMENTS SIGNÉS & TÉLÉCHARGEMENTS                            */}
      {/* ========================================================================= */}
      {activeSection === 'downloads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Mes Documents & Actes Signés"
            subtitle="Téléchargez ou imprimez vos actes officiels portant la signature électronique certifiée"
          />

          {loadingDownloads ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <div>Recherche de vos actes officiels...</div>
            </div>
          ) : downloadDemandes.length === 0 ? (
            <div style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '24px',
              padding: '3rem 2rem',
              textAlign: 'center',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <FileText size={30} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 6px' }}>
                Aucun acte officiel prêt à être téléchargé
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary, #64748b)', maxWidth: '420px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                Dès que vos demandes d'actes d'état civil sont signées électroniquement par l'officier municipal, les fichiers PDF officiels certifiés apparaissent automatiquement ici.
              </p>
              <button
                type="button"
                onClick={() => navigate('/citoyen/demandes')}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Suivre l'avancement de mes demandes
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {downloadDemandes.map(dem => {
                const pdfDownloadUrl = `${API_BASE_URL}/demandes/${dem.id}/pdf?token=${encodeURIComponent(token || localStorage.getItem('token') || '')}`;
                return (
                  <div
                    key={dem.id}
                    style={{
                      backgroundColor: 'var(--bg-card, #ffffff)',
                      borderRadius: '20px',
                      padding: '1.25rem 1.5rem',
                      border: '1px solid var(--border-color, #e2e8f0)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: 'rgba(37,99,235,0.08)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={22} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#2563eb' }}>
                            {dem.reference}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 6px', borderRadius: '4px' }}>
                            ✓ Signé & Scellé
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 2px' }}>
                          {dem.activite_nom || 'Acte officiel'}
                        </h4>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>
                          {dem.bureau_nom || dem.service_nom || "Centre d'état civil"}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewPdfUrl(pdfDownloadUrl);
                          setPreviewDemandeRef(dem.reference);
                        }}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-color, #cbd5e1)',
                          backgroundColor: 'var(--bg-card, #ffffff)',
                          color: 'var(--text-primary, #0f172a)',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Eye size={15} />
                        <span>Aperçu</span>
                      </button>

                      <a
                        href={pdfDownloadUrl}
                        download={`acte_${dem.reference || dem.id}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '8px 16px',
                          borderRadius: '10px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={15} />
                        <span>Télécharger PDF</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Modale Lightbox Aperçu PDF */}
          {previewPdfUrl && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10000, padding: '20px'
            }}>
              <div style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '20px',
                width: '100%', maxWidth: '860px', height: '85vh',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color="#2563eb" />
                    <span style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary, #0f172a)' }}>
                      Acte Officiel · {previewDemandeRef}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <a
                      href={previewPdfUrl}
                      download
                      style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.8rem', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      <Download size={14} /> Télécharger
                    </a>
                    <button
                      type="button"
                      onClick={() => setPreviewPdfUrl(null)}
                      style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div style={{ flex: 1, backgroundColor: '#f1f5f9' }}>
                  <iframe
                    src={previewPdfUrl}
                    title="Aperçu PDF de l'acte officiel"
                    style={{ width: '100%', height: '100%', border: 'none' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5 : ASSISTANT & NAVIGATION VOCALE                                 */}
      {/* ========================================================================= */}
      {activeSection === 'voice' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Assistant & Navigation Vocale"
            subtitle="Configurez la reconnaissance vocale et découvrez toutes les commandes pour piloter la plateforme à la voix"
          />

          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* Switch Principal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color, #e2e8f0)', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: voiceEnabled ? '#2563eb' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mic size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                    Activer l'assistant vocal interactif
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', margin: 0 }}>
                    Affiche le bouton micro flottant permettant de dicter vos recherches et de naviguer sans clavier
                  </p>
                </div>
              </div>

              <label style={{ position: 'relative', display: 'inline-block', width: '56px', height: '30px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={toggleVoiceSetting}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: voiceEnabled ? '#2563eb' : '#cbd5e1',
                  borderRadius: '34px',
                  transition: '0.2s',
                  boxShadow: voiceEnabled ? '0 2px 10px rgba(37,99,235,0.35)' : 'none'
                }}>
                  <span style={{
                    position: 'absolute', content: '""', height: '24px', width: '24px', left: voiceEnabled ? '28px' : '3px', bottom: '3px',
                    backgroundColor: 'white', borderRadius: '50%', transition: '0.2s'
                  }} />
                </span>
              </label>
            </div>

            {/* Réglages Synthèse Vocale */}
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Volume2 size={18} color="#2563eb" />
                Retour audio & Synthèse vocale
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                    Vitesse d'élocution ({speechRate}x)
                  </label>
                  <input
                    type="range"
                    min="0.75"
                    max="1.5"
                    step="0.05"
                    value={speechRate}
                    onChange={e => setSpeechRate(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563eb' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', marginBottom: '6px' }}>
                    Hauteur de voix ({speechPitch})
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.3"
                    step="0.05"
                    value={speechPitch}
                    onChange={e => setSpeechPitch(parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: '#2563eb' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleTestSpeech}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: '1px solid rgba(37,99,235,0.2)',
                    backgroundColor: 'rgba(37,99,235,0.08)',
                    color: '#2563eb',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Volume2 size={15} />
                  <span>Tester la voix de l'assistant</span>
                </button>
              </div>
            </div>

            {/* Guide & Aide-Mémoire des Commandes Vocales */}
            <div style={{ borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 1rem' }}>
                Commandes vocales reconnues
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {[
                  { cmd: '"Accueil"', desc: "Ouvre le tableau de bord citoyen" },
                  { cmd: '"Mes demandes"', desc: "Affiche la liste de vos dossiers d'actes" },
                  { cmd: '"Nouvelle demande"', desc: "Démarre le formulaire de demande d'acte" },
                  { cmd: '"Rendez-vous"', desc: "Ouvre la gestion de vos convocations" },
                  { cmd: '"Profil" / "Paramètres"', desc: "Accède à cette page de réglages" },
                  { cmd: '"Descendre" / "Monter"', desc: "Fait défiler la page de haut en bas" },
                  { cmd: '"Aide" / "FAQ"', desc: "Consulte le centre d'assistance officiel" }
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: 'var(--bg-primary, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <code style={{ fontSize: '0.85rem', fontWeight: '800', color: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                      {item.cmd}
                    </code>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)' }}>
                      {item.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 6 : NOTIFICATIONS & ALERTES                                       */}
      {/* ========================================================================= */}
      {activeSection === 'notifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Notifications & Canaux d'Alerte"
            subtitle="Choisissez comment être informé du traitement de vos actes et convocations"
          />

          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            {/* In-App */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Notifications dans l'application (In-App)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Alertes sous forme de pastille cloche dans la barre supérieure</div>
              </div>
              <input type="checkbox" checked={notifInApp} onChange={e => setNotifInApp(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }} />
            </div>

            {/* SMS */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Alertes par SMS direct</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Réception d'un SMS au {currentUser?.telephone || 'numéro associé'} lors de chaque avancée</div>
              </div>
              <input type="checkbox" checked={notifSms} onChange={e => setNotifSms(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }} />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color, #e2e8f0)' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Notifications par E-mail</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Recevoir la confirmation de dépôt et les reçus de paiement officiels</div>
              </div>
              <input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }} />
            </div>

            {/* Rappels de RDV */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Rappel automatique de rendez-vous</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary, #64748b)' }}>Rappel 24 heures avant l'heure de convocation au bureau d'état civil</div>
              </div>
              <input type="checkbox" checked={notifRdv} onChange={e => setNotifRdv(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#2563eb', cursor: 'pointer' }} />
            </div>

            {/* Notice opérateur */}
            <div style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: '#fefce8', border: '1px solid #fef08a', color: '#854d0e', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} color="#eab308" />
              <span>Les notifications SMS de l'État sont gratuites. Selon votre opérateur mobile, des délais de transmission peuvent exceptionnellement survenir.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => showToast('Préférences de notification enregistrées')}
                style={{
                  padding: '10px 22px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.86rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Enregistrer les préférences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 7 : FOIRE AUX QUESTIONS (FAQ) OFFICIELLE - 9 QUESTIONS            */}
      {/* ========================================================================= */}
      {activeSection === 'faq' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Foire Aux Questions (FAQ)"
            subtitle="Consultez les réponses officielles aux 9 questions clés concernant vos démarches administratives"
          />

          {/* Recherche dans la FAQ */}
          <div style={{ position: 'relative' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={faqSearch}
              onChange={e => setFaqSearch(e.target.value)}
              placeholder="Rechercher une question (délais, paiement, retrait, pièces, signature...)"
              style={{
                width: '100%',
                padding: '14px 16px 14px 46px',
                borderRadius: '16px',
                border: '1px solid var(--border-color, #cbd5e1)',
                backgroundColor: 'var(--bg-card, #ffffff)',
                color: 'var(--text-primary, #0f172a)',
                fontSize: '0.92rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
              }}
            />
            {faqSearch && (
              <button
                type="button"
                onClick={() => setFaqSearch('')}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Liste des Accordéons */}
          <div style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderRadius: '24px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden' }}>
            {filteredFaqs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                Aucune question ne correspond à votre recherche "{faqSearch}".
              </div>
            ) : (
              filteredFaqs.map((faq, idx) => {
                const isExpanded = expandedFaq === idx;
                return (
                  <div key={idx} style={{ borderBottom: idx < filteredFaqs.length - 1 ? '1px solid var(--border-color, #f1f5f9)' : 'none' }}>
                    <div
                      onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                      style={{
                        padding: '18px 22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        backgroundColor: isExpanded ? 'rgba(37,99,235,0.02)' : 'transparent',
                        transition: 'background 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '8px',
                          backgroundColor: isExpanded ? '#2563eb' : 'rgba(0,0,0,0.05)',
                          color: isExpanded ? '#ffffff' : '#64748b',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: '800'
                        }}>
                          {idx + 1}
                        </span>
                        <span style={{ fontSize: '0.96rem', fontWeight: '700', color: isExpanded ? '#2563eb' : 'var(--text-primary, #0f172a)' }}>
                          {faq.question}
                        </span>
                      </div>
                      {isExpanded ? <ChevronUp size={18} color="#2563eb" /> : <ChevronDown size={18} color="#94a3b8" />}
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '0 22px 18px 60px', fontSize: '0.88rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.6 }}>
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bandeau Support si la question n'est pas traitée */}
          <div style={{
            padding: '1.5rem',
            borderRadius: '20px',
            backgroundColor: 'rgba(37,99,235,0.06)',
            border: '1px solid rgba(37,99,235,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: '800', color: '#1e40af', margin: '0 0 4px' }}>
                Vous ne trouvez pas la réponse à votre démarche ?
              </h4>
              <p style={{ fontSize: '0.84rem', color: '#3b82f6', margin: 0 }}>
                Notre équipe d'assistance citoyenne et nos agents d'état civil répondent sous 24h.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSection('help')}
              style={{
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Contacter le support
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 8 : CENTRE D'AIDE & CONTACT                                       */}
      {/* ========================================================================= */}
      {activeSection === 'help' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Centre d'Aide & Support"
            subtitle="Nos agents municipaux sont à votre écoute pour vous guider"
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {/* Téléphone */}
            <a
              href="tel:+221770000000"
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '20px',
                padding: '1.75rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Phone size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                  Assistance Téléphonique
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 8px' }}>
                  Ligne directe disponible du Lundi au Vendredi de 8h à 17h.
                </p>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#2563eb' }}>
                  +221 77 000 00 00
                </div>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:support@seninnov.sn?subject=Assistance%20Citoyen%20SenInnov"
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '20px',
                padding: '1.75rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                textDecoration: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: '#6366f1', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                  Support par Courriel
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 8px' }}>
                  Envoyez vos questions ou réclamations, réponse garantie sous 24h.
                </p>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#6366f1' }}>
                  support@seninnov.sn
                </div>
              </div>
            </a>

            {/* Questions fréquentes */}
            <div
              onClick={() => setSection('faq')}
              style={{
                backgroundColor: 'var(--bg-card, #ffffff)',
                borderRadius: '20px',
                padding: '1.75rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                transition: 'transform 0.15s, box-shadow 0.15s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <div style={{ width: '46px', height: '46px', borderRadius: '14px', backgroundColor: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HelpCircle size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                  Questions Fréquentes (FAQ)
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 8px' }}>
                  Consulter les 9 réponses officielles aux démarches d'état civil.
                </p>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Accéder à la FAQ</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Mentions Légales & Conformité */}
          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '1.75rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#0ea5e9', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Shield size={20} />
            </div>
            <div>
              <h4 style={{ fontSize: '0.98rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 3px' }}>
                Sécurité & Conformité Règlementaire
              </h4>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: 0, lineHeight: 1.5 }}>
                Plateforme conforme à la Loi n° 2008-12 sur la protection des données à caractère personnel (Commission des Données Personnelles - CDP Sénégal). Tous les échanges et signatures électroniques sont chiffrés de bout en bout.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 9 : CONFIGURATION API & DIAGNOSTIC SERVEUR                         */}
      {/* ========================================================================= */}
      {activeSection === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Configuration API & Diagnostic Réseau"
            subtitle="Consultez l'état de la connexion au serveur d'état civil"
          />

          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border-color, #e2e8f0)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                Adresse du Serveur Backend (API)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  value={API_BASE_URL}
                  disabled
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color, #cbd5e1)',
                    backgroundColor: 'rgba(0,0,0,0.03)',
                    color: 'var(--text-primary, #0f172a)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
                    fontWeight: '600'
                  }}
                />
                <button
                  type="button"
                  onClick={testApiConnection}
                  disabled={testingApi}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.86rem',
                    fontWeight: '700',
                    cursor: testingApi ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Activity size={16} />
                  <span>{testingApi ? 'Test...' : 'Tester le serveur'}</span>
                </button>
              </div>
            </div>

            {/* Résultat du test */}
            {apiPingStatus && (
              <div style={{
                padding: '16px',
                borderRadius: '14px',
                backgroundColor: apiPingStatus === 'success' ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${apiPingStatus === 'success' ? '#a7f3d0' : '#fecaca'}`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: apiPingStatus === 'success' ? '#10b981' : '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {apiPingStatus === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: '800', color: apiPingStatus === 'success' ? '#065f46' : '#991b1b' }}>
                    {apiPingStatus === 'success' ? 'Serveur opérationnel et synchronisé' : 'Connexion au serveur impossible'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: apiPingStatus === 'success' ? '#047857' : '#b91c1c' }}>
                    Latence mesurée : <strong>{apiLatency} ms</strong> · Toutes les requêtes sont sécurisées par jeton JWT.
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', borderTop: '1px solid var(--border-color, #e2e8f0)', paddingTop: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Version du Système</span>
                <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>SenInnov Web 1.0.0</div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Chiffrement</span>
                <div style={{ fontSize: '0.92rem', fontWeight: '700', color: '#059669' }}>TLS / AES-256 bits</div>
              </div>
              <div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Authentification</span>
                <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Bearer JWT Token</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 10 : RÉFÉRENCES, LANGUE & AVIS CITOYEN                            */}
      {/* ========================================================================= */}
      {activeSection === 'references' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SectionHeader onBack={handleBackToMain}
            title="Références & Avis Citoyen"
            subtitle="Choisissez la langue d'affichage et partagez vos impressions"
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* Langue */}
            <div style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#8b5cf6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Globe size={20} />
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                  Langue de l'interface
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 1.25rem' }}>
                  Sélectionnez la langue pour la navigation et les formulaires
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px', border: voiceLang === 'fr' ? '2px solid #2563eb' : '1px solid var(--border-color, #cbd5e1)', backgroundColor: voiceLang === 'fr' ? 'rgba(37,99,235,0.04)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Français (Langue officielle)</span>
                    </div>
                    <input type="radio" name="lang" checked={voiceLang === 'fr'} onChange={() => { setVoiceLang('fr'); showToast('Langue : Français'); }} />
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: '12px', border: voiceLang === 'wo' ? '2px solid #2563eb' : '1px solid var(--border-color, #cbd5e1)', backgroundColor: voiceLang === 'wo' ? 'rgba(37,99,235,0.04)' : 'transparent', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)' }}>Wolof (Bientôt disponible)</span>
                    </div>
                    <input type="radio" name="lang" checked={voiceLang === 'wo'} onChange={() => { setVoiceLang('wo'); showToast('Le support du Wolof sera activé très prochainement'); }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Partager */}
            <div style={{
              backgroundColor: 'var(--bg-card, #ffffff)',
              borderRadius: '20px',
              padding: '1.75rem',
              border: '1px solid var(--border-color, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                  <Share2 size={20} />
                </div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 4px' }}>
                  Partager SenInnov
                </h4>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
                  Faites connaître la plateforme à vos proches afin qu'ils obtiennent leurs actes d'état civil sans déplacement ni file d'attente.
                </p>
              </div>

              <button
                type="button"
                onClick={handleShareApp}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                <Share2 size={16} />
                <span>Copier le lien du portail</span>
              </button>
            </div>
          </div>

          {/* Formulaire Donner un avis */}
          <div style={{
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '2rem',
            border: '1px solid var(--border-color, #e2e8f0)'
          }}>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary, #0f172a)', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MessageSquare size={18} color="#2563eb" />
              Donner votre avis sur SenInnov
            </h4>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary, #64748b)', margin: '0 0 1.25rem' }}>
              Votre retour est précieux pour améliorer la qualité du service public d'état civil
            </p>

            {feedbackSent ? (
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={20} color="#10b981" />
                <span>Merci beaucoup pour votre contribution ! Votre retour a bien été pris en compte.</span>
              </div>
            ) : (
              <form onSubmit={handleSendFeedback}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Note globale
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: star <= feedbackRating ? '#f59e0b' : '#cbd5e1'
                        }}
                      >
                        <Star size={24} fill={star <= feedbackRating ? '#f59e0b' : 'none'} />
                      </button>
                    ))}
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary, #0f172a)', marginLeft: '8px' }}>
                      {feedbackRating} / 5 étoiles
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Votre commentaire ou suggestion
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackComment}
                    onChange={e => setFeedbackComment(e.target.value)}
                    placeholder="Partagez votre expérience sur la simplicité des démarches, les délais ou l'interface..."
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid var(--border-color, #cbd5e1)',
                      backgroundColor: 'var(--bg-primary, #f8fafc)',
                      color: 'var(--text-primary, #0f172a)',
                      fontSize: '0.9rem',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingFeedback}
                  style={{
                    padding: '11px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: sendingFeedback ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {sendingFeedback ? 'Envoi en cours...' : 'Transmettre mon avis'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
