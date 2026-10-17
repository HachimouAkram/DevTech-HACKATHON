import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  KeyRound, Phone, ShieldCheck, Landmark, Lock, Settings,
  Eye, EyeOff, ArrowLeft, ArrowRight, User, Mail, Check,
  MessageSquare, MessageCircle, X, CheckSquare, Square
} from 'lucide-react';
import { isCitizenUser } from '../utils/roles.js';
import { API_BASE_URL } from '../utils/api.js';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const rightPaneRef = useRef(null);

  // Mode: Connexion vs Création de compte
  const [isRegister, setIsRegister] = useState(false);

  // Connexion state
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Change state
  const [requirePasswordChange, setRequirePasswordChange] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Inscription Citoyenne state (aligné 100% avec le mobile)
  const [regPrenom, setRegPrenom] = useState('');
  const [regNom, setRegNom] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptData, setAcceptData] = useState(true); // Par défaut accepté comme sur mobile

  // Modal de choix de vérification & Saisie du code
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [regStep, setRegStep] = useState('form'); // 'form' | 'verify-code'
  const [verifyMethod, setVerifyMethod] = useState('sms'); // 'sms' | 'email' | 'whatsapp'
  const [verifyCode, setVerifyCode] = useState('');

  // Switch tabs
  const handleTabToggle = (registerMode) => {
    setIsRegister(registerMode);
    setError('');
    setRegStep('form');
    setShowVerificationModal(false);
    if (rightPaneRef.current) {
      rightPaneRef.current.scrollTop = 0;
    }
  };

  // Calcul de la force du mot de passe (exactement comme sur mobile)
  const getPasswordStrength = (pwd) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = getPasswordStrength(regPassword);
  const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#2563eb'];
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];

  const formatPhoneNumber = (phone) => {
    let formatted = phone.trim().replace(/\s+/g, '');
    if (!formatted.startsWith('+221') && !formatted.startsWith('221')) {
      formatted = '+221' + formatted;
    } else if (formatted.startsWith('221')) {
      formatted = '+' + formatted;
    }
    return formatted;
  };

  // 1. Clic sur Créer mon compte (Validation formulaire)
  const handleRegisterClick = (e) => {
    e.preventDefault();
    if (!regPrenom.trim() || !regNom.trim() || !regPhone.trim() || !regPassword.trim()) {
      setError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!acceptCGU || !acceptData) {
      setError('Vous devez accepter les conditions générales et le consentement RGPD pour créer un compte.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Les mots de passe saisis ne sont pas identiques.');
      return;
    }
    if (strengthScore < 4) {
      setError('Le mot de passe doit respecter les 4 critères requis (au moins 8 caractères, une majuscule, un chiffre et un caractère spécial).');
      return;
    }

    setError('');
    setShowVerificationModal(true);
  };

  // 2. Choix de la méthode et envoi du code (/auth/send-verification)
  const handleProceedVerification = async (method) => {
    if (method === 'email' && !regEmail.trim()) {
      setError('Veuillez renseigner votre email pour recevoir le code par email.');
      return;
    }

    setVerifyMethod(method);
    setShowVerificationModal(false);
    setLoading(true);
    setError('');

    const formattedPhone = formatPhoneNumber(regPhone);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          telephone: formattedPhone,
          email: regEmail.trim() || undefined
        })
      });

      // Passe à l'étape de saisie du code
      setRegStep('verify-code');
      if (rightPaneRef.current) {
        rightPaneRef.current.scrollTop = 0;
      }
    } catch (err) {
      console.warn("send-verification fallback", err);
      setRegStep('verify-code');
    } finally {
      setLoading(false);
    }
  };

  // 3. Soumission du code de vérification & Création finale (/auth/register)
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    const code = (verifyCode || '').trim();
    if (code.length !== 6) {
      setError('Veuillez saisir un code de vérification à 6 chiffres.');
      return;
    }

    setLoading(true);
    setError('');

    const formattedPhone = formatPhoneNumber(regPhone);
    const fullName = `${regPrenom.trim()} ${regNom.trim()}`;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nom_complet: fullName,
          nomComplet: fullName,
          telephone: formattedPhone,
          email: regEmail.trim() || undefined,
          password: regPassword,
          code: code
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Le code saisi est incorrect ou a expiré.');
      }

      const jwtToken = data.token;
      const user = data.data?.user || data.user;
      onLogin(jwtToken, user);
      navigate('/citoyen');
    } catch (err) {
      setError(err.message || 'Échec de la validation du compte. Vérifiez le code.');
    } finally {
      setLoading(false);
    }
  };

  // Connexion classique
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ identifier, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Identifiants incorrects.');
      }

      const jwtToken = data.token;
      const user = data.data.user;
      if (user.must_change_password) {
        setRequirePasswordChange({
          user: user,
          token: jwtToken,
          oldPassword: password
        });
      } else {
        onLogin(jwtToken, user);
        if (isCitizenUser(user)) {
          navigate('/citoyen');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

  // Changement de mot de passe requis
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/users/${requirePasswordChange.user.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ old_password: requirePasswordChange.oldPassword, password: newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Échec du changement de mot de passe.');
      }

      const updatedUser = { ...requirePasswordChange.user, must_change_password: false };
      onLogin(requirePasswordChange.token || null, updatedUser);
      if (isCitizenUser(updatedUser)) {
        navigate('/citoyen');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors du changement de mot de passe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-container">
        {/* Left Pane - Branding & Decorative Illustrations */}
        <div className="login-left-pane">
          {/* Top: White rounded card with Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10, width: '100%', gap: '10px' }}>
            <div style={{ background: '#ffffff', padding: '12px', borderRadius: '24px', width: '120px', height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
              <img
                src="/logo.png"
                alt="SenInnov Logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: '#ffffff', fontSize: '1.45rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
                SenInnov
              </h1>
            </div>
          </div>

          {/* Middle: Animation Card */}
          <div className="illustration-container" style={{ margin: '1rem 0' }}>
            <div className="illust-circle circle-1"></div>
            <div className="illust-circle circle-2"></div>

            {/* Floating realistic icons */}
            <div className="floating-icon icon-key">
              <KeyRound size={20} />
            </div>
            <div className="floating-icon icon-lock">
              <Lock size={20} />
            </div>
            <div className="floating-icon icon-gear">
              <Settings size={20} />
            </div>

            <div className="illust-card card-main">
              <div className="card-header-bar">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>

              <div className="card-mock-row">
                <div className="mock-avatar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={24} style={{ color: '#10b981' }} />
                </div>
                <div className="mock-lines">
                  <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#ffffff' }}>Base Sécurisée</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>Administration connectée</div>
                </div>
              </div>

              <div className="card-mock-body">
                <div className="mock-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={14} style={{ color: '#10b981' }} />
                  <div className="mock-item-left" style={{ background: 'transparent', color: '#ffffff', fontSize: '0.75rem', width: 'auto' }}>Accès Certifié</div>
                  <div className="mock-item-right" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', width: 'auto', height: 'auto' }}>ACTIF</div>
                </div>

                <div className="mock-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Lock size={14} style={{ color: '#fbbf24' }} />
                  <div className="mock-item-left" style={{ background: 'transparent', color: '#ffffff', fontSize: '0.75rem', width: 'auto' }}>Chiffrement AES</div>
                  <div className="mock-item-right" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '700', width: 'auto', height: 'auto' }}>128-BIT</div>
                </div>
              </div>
            </div>

            <div className="illust-card card-badge">
              <ShieldCheck size={24} className="badge-icon" />
              <div>
                <div className="badge-title">Portail Sécurisé</div>
                <div className="badge-subtitle">Accès admin agent</div>
              </div>
            </div>
          </div>

          {/* Bottom: Left Footer with green dot */}
          <div className="left-pane-footer" style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10, color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.06em' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981', display: 'inline-block' }}></span>
            <span>2026 - SENINNOV</span>
          </div>
        </div>

        {/* Right Pane - Form Container */}
        <div className="login-right-pane" ref={rightPaneRef} style={{ overflowY: 'auto', maxHeight: '92vh', scrollBehavior: 'smooth' }}>
          <div className="login-card" style={{ boxShadow: 'none', border: 'none', padding: 0, paddingBottom: '2.5rem' }}>
            
            {/* Tabs Connexion / Inscription */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => handleTabToggle(false)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: !isRegister ? '#ffffff' : 'transparent',
                    color: !isRegister ? '#2563eb' : '#64748b',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: !isRegister ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => handleTabToggle(true)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isRegister ? '#ffffff' : 'transparent',
                    color: isRegister ? '#2563eb' : '#64748b',
                    fontWeight: '700',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: isRegister ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Créer un compte Citoyen
                </button>
              </div>

              <h2 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', marginBottom: '6px' }}>
                {isRegister
                  ? (regStep === 'verify-code' ? 'Vérification du compte' : 'Créer votre compte')
                  : 'Bienvenue sur SenInnov'}
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: 0, lineHeight: '1.45' }}>
                {isRegister
                  ? (regStep === 'verify-code' ? `Saisissez le code envoyé par ${verifyMethod.toUpperCase()} pour finaliser l'accès.` : 'Enregistrez vos coordonnées pour accéder aux services de démarche en ligne')
                  : 'Connectez-vous à votre espace citoyen ou professionnel'}
              </p>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                color: '#dc2626',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                fontWeight: '500'
              }}>
                <ShieldCheck size={18} color="#dc2626" />
                <span>{error}</span>
              </div>
            )}

            {/* ========================================================
                MODE 1 : INSCRIPTION CITOYENNE (DESIGN MOBILE 100% IDENTIQUE)
                ======================================================== */}
            {isRegister ? (
              regStep === 'verify-code' ? (
                /* ÉTAPE DE VÉRIFICATION DU CODE */
                <form onSubmit={handleVerifyAndRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '16px',
                    padding: '1.25rem',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(37,99,235,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px auto'
                    }}>
                      <ShieldCheck size={30} color="#2563eb" />
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e3a8a' }}>
                      Code envoyé par {verifyMethod === 'email' ? 'Email' : verifyMethod === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px' }}>
                      au : <strong>{verifyMethod === 'email' ? (regEmail || 'votre email') : formatPhoneNumber(regPhone)}</strong>
                    </div>
                  </div>

                  {/* Input 6 chiffres */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                      CODE DE VÉRIFICATION (6 CHIFFRES) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                      style={{
                        width: '100%',
                        height: '54px',
                        borderRadius: '16px',
                        border: '2px solid #2563eb',
                        backgroundColor: '#ffffff',
                        textAlign: 'center',
                        fontSize: '1.6rem',
                        fontWeight: '800',
                        letterSpacing: '8px',
                        color: '#0f172a',
                        outline: 'none'
                      }}
                      autoFocus
                    />
                  </div>

                  {/* Code démo raccourci */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Code de test disponible : <strong>326532</strong></span>
                    <button
                      type="button"
                      onClick={() => setVerifyCode('326532')}
                      style={{
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      Insérer
                    </button>
                  </div>

                  {/* Boutons validation */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.5rem' }}>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        width: '100%',
                        height: '52px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontWeight: '700',
                        fontSize: '1rem',
                        borderRadius: '16px',
                        border: 'none',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      {loading ? (
                        <div className="loading-spinner" style={{ borderLeftColor: '#ffffff' }}></div>
                      ) : (
                        <>
                          <span>Vérifier et créer mon compte</span>
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegStep('form')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Modifier mes coordonnées</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* FORMULAIRE PRINCIPAL (MÊME QUE MOBILE) */
                <form onSubmit={handleRegisterClick} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  
                  {/* Prénom * */}
                  <div style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    padding: '0 16px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'border-color 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <User size={18} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Prénom *"
                      value={regPrenom}
                      onChange={(e) => setRegPrenom(e.target.value)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>

                  {/* Nom * */}
                  <div style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    padding: '0 16px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <User size={18} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Nom *"
                      value={regNom}
                      onChange={(e) => setRegNom(e.target.value)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>

                  {/* Numéro de téléphone * (+221) */}
                  <div style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    padding: '0 16px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Phone size={18} color="#94a3b8" />
                    <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>+221</span>
                    <input
                      type="tel"
                      placeholder="Numéro de téléphone *"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                      required
                    />
                  </div>

                  {/* Email (facultatif) */}
                  <div style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    padding: '0 16px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Mail size={18} color="#94a3b8" />
                    <input
                      type="email"
                      placeholder="Email (facultatif)"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                    />
                  </div>

                  {/* Mot de passe * */}
                  <div style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    padding: '0 16px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Lock size={18} color="#94a3b8" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      placeholder="Mot de passe *"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex' }}
                    >
                      {showRegPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Jauge de force du mot de passe */}
                  {regPassword.length > 0 && (
                    <div style={{ padding: '0 4px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[1, 2, 3, 4].map((index) => (
                          <div
                            key={index}
                            style={{
                              flex: 1,
                              height: '4px',
                              borderRadius: '2px',
                              backgroundColor: index <= strengthScore ? strengthColors[strengthScore] : '#e2e8f0',
                              transition: 'background-color 0.25s'
                            }}
                          />
                        ))}
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: '600', color: strengthColors[strengthScore] }}>
                        {strengthLabels[strengthScore]}
                      </div>
                    </div>
                  )}

                  {/* Confirmer le mot de passe * */}
                  <div style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    backgroundColor: '#ffffff',
                    padding: '0 16px',
                    height: '52px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                  }}>
                    <Lock size={18} color="#94a3b8" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirmer le mot de passe *"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '0.92rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#94a3b8', display: 'flex' }}
                    >
                      {showRegConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Boîte Critères requis : (exactement comme sur mobile) */}
                  <div style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '14px',
                    border: '1px solid #f1f5f9',
                    padding: '12px 14px',
                    marginTop: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px'
                  }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#475569', marginBottom: '2px' }}>
                      Critères requis :
                    </div>
                    <div style={{ fontSize: '0.8rem', color: regPassword.length >= 8 ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700' }}>{regPassword.length >= 8 ? '✔' : '○'}</span> 8 caractères minimum
                    </div>
                    <div style={{ fontSize: '0.8rem', color: /[A-Z]/.test(regPassword) ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700' }}>{/[A-Z]/.test(regPassword) ? '✔' : '○'}</span> 1 majuscule
                    </div>
                    <div style={{ fontSize: '0.8rem', color: /[0-9]/.test(regPassword) ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700' }}>{/[0-9]/.test(regPassword) ? '✔' : '○'}</span> 1 chiffre
                    </div>
                    <div style={{ fontSize: '0.8rem', color: /[^A-Za-z0-9]/.test(regPassword) ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: '700' }}>{/[^A-Za-z0-9]/.test(regPassword) ? '✔' : '○'}</span> 1 caractère spécial
                    </div>
                  </div>

                  {/* Checkbox 1 : CGU */}
                  <div
                    onClick={() => setAcceptCGU(!acceptCGU)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginTop: '6px' }}
                  >
                    {acceptCGU ? (
                      <CheckSquare size={19} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <Square size={19} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
                      J'accepte les conditions générales d'utilisation
                    </span>
                  </div>

                  {/* Checkbox 2 : RGPD */}
                  <div
                    onClick={() => setAcceptData(!acceptData)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '8px' }}
                  >
                    {acceptData ? (
                      <CheckSquare size={19} color="#2563eb" style={{ flexShrink: 0, marginTop: '2px' }} />
                    ) : (
                      <Square size={19} color="#94a3b8" style={{ flexShrink: 0, marginTop: '2px' }} />
                    )}
                    <span style={{ fontSize: '0.8rem', color: '#475569', lineHeight: '1.4' }}>
                      Je consens au traitement de mes données personnelles conformément au RGPD sénégalais (Loi 2008-12)
                    </span>
                  </div>

                  {/* Bouton Créer mon compte */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      height: '52px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: '700',
                      fontSize: '1rem',
                      borderRadius: '16px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {loading ? (
                      <div className="loading-spinner" style={{ borderLeftColor: '#ffffff' }}></div>
                    ) : (
                      <span>Créer mon compte</span>
                    )}
                  </button>

                  {/* Footer link */}
                  <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '0.88rem' }}>
                    <span style={{ color: '#64748b' }}>Déjà inscrit ? </span>
                    <button
                      type="button"
                      onClick={() => handleTabToggle(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Se connecter
                    </button>
                  </div>

                </form>
              )
            ) : requirePasswordChange ? (
              /* CHANGEMENT DE MOT DE PASSE REQUIS */
              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ marginBottom: '1rem', background: 'rgba(251,191,36,0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <p style={{ color: '#b45309', fontSize: '0.875rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} />
                    Sécurité du compte
                  </p>
                  <p style={{ color: '#b45309', fontSize: '0.8rem', marginTop: '0.5rem' }}>Il s'agit de votre première connexion. Vous devez définir un mot de passe personnel avant d'accéder à la plateforme.</p>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      className="login-form-input"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 3.75rem 0 1rem',
                        background: '#ecf2ff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                    />
                    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: '#94a3b8'
                        }}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <KeyRound size={18} style={{ color: '#94a3b8' }} />
                    </div>
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmer le nouveau mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="login-form-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 3.75rem 0 1rem',
                        background: '#ecf2ff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                    />
                    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: '#94a3b8'
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <KeyRound size={18} style={{ color: '#94a3b8' }} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{
                    width: '100%',
                    height: '48px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading-spinner" style={{ borderLeftColor: '#ffffff' }}></div>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      <span>Mettre à jour et continuer</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* FORMULAIRE DE CONNEXION CLASSIQUE */
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adresse Email ou Téléphone</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="login-form-input"
                      placeholder="77 123 45 67 ou abbd@gmail.com"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 1rem',
                        background: '#ecf2ff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0.5rem' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mot de passe</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="login-form-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        height: '48px',
                        padding: '0 3.75rem 0 1rem',
                        background: '#ecf2ff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.95rem',
                        color: '#0f172a',
                        fontWeight: '500',
                        outline: 'none'
                      }}
                    />
                    <div style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center',
                          color: '#94a3b8'
                        }}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <KeyRound size={18} style={{ color: '#94a3b8' }} />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn"
                  style={{
                    width: '100%',
                    height: '48px',
                    background: '#2563eb',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading-spinner" style={{ borderLeftColor: '#ffffff' }}></div>
                  ) : (
                    <>
                      <span>Se connecter à mon espace</span>
                      <span style={{ fontSize: '1.1rem' }}>→</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="right-pane-footer" style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'auto', textAlign: 'center', width: '100%', fontWeight: '600', paddingTop: '1.5rem' }}>
            SENINNOV — ADMINISTRATION EN LIGNE — SENEGAL 2026
          </div>
        </div>
      </div>

      {/* ========================================================
          MODAL DE CHOIX DE VÉRIFICATION (SMS / EMAIL / WHATSAPP)
          IDENTIQUE AU MODAL DU MOBILE
          ======================================================== */}
      {showVerificationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                Vérification du compte
              </h3>
              <button
                type="button"
                onClick={() => setShowVerificationModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem 0', lineHeight: '1.45' }}>
              Comment souhaitez-vous recevoir votre code de vérification à 6 chiffres ?
            </p>

            {/* Option 1 : SMS */}
            <div
              onClick={() => handleProceedVerification('sms')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                marginBottom: '10px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#ffffff'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 99, 235, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '14px',
                flexShrink: 0
              }}>
                <MessageSquare size={22} color="#2563eb" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>Par SMS</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sur le {formatPhoneNumber(regPhone)}</div>
              </div>
              <ArrowRight size={18} color="#94a3b8" />
            </div>

            {/* Option 2 : Email */}
            <div
              onClick={() => handleProceedVerification('email')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                marginBottom: '10px',
                cursor: regEmail ? 'pointer' : 'not-allowed',
                opacity: regEmail ? 1 : 0.6,
                transition: 'all 0.2s',
                backgroundColor: '#ffffff'
              }}
              onMouseEnter={(e) => { if (regEmail) { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = '#f8fafc'; } }}
              onMouseLeave={(e) => { if (regEmail) { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; } }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(59, 130, 246, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '14px',
                flexShrink: 0
              }}>
                <Mail size={22} color="#3b82f6" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>Par Email</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  {regEmail ? `Sur ${regEmail}` : 'Veuillez saisir un email dans le formulaire'}
                </div>
              </div>
              <ArrowRight size={18} color="#94a3b8" />
            </div>

            {/* Option 3 : WhatsApp */}
            <div
              onClick={() => handleProceedVerification('whatsapp')}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '14px',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: '#ffffff'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#25D366'; e.currentTarget.style.backgroundColor = '#f8fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                backgroundColor: 'rgba(37, 211, 102, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '14px',
                flexShrink: 0
              }}>
                <MessageCircle size={22} color="#25D366" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#0f172a' }}>Par WhatsApp</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sur le {formatPhoneNumber(regPhone)}</div>
              </div>
              <ArrowRight size={18} color="#94a3b8" />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
