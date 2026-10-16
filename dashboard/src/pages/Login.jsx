import { API_BASE_URL } from '../utils/api.js';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Phone, ShieldCheck, Landmark, Lock, Settings, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password Change State
  const [requirePasswordChange, setRequirePasswordChange] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

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
        throw new Error(data.message || 'Échec de la connexion.');
      }

      const jwtToken = data.token; // Token is at root level in response
      const user = data.data.user;
      if (user.must_change_password) {
        setRequirePasswordChange({
          user: user,
          token: jwtToken,
          oldPassword: password
        });
      } else {
        onLogin(jwtToken, user);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue lors de la connexion.');
    } finally {
      setLoading(false);
    }
  };

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

      // Success, now log them in completely
      const updatedUser = { ...requirePasswordChange.user, must_change_password: false };
      onLogin(requirePasswordChange.token || null, updatedUser);
      navigate('/dashboard');
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
            <div style={{ background: '#ffffff', padding: '8px', borderRadius: '18px', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
              <img src="/logo.png" alt="TerangaCivil Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
              <span style={{ color: '#ffffff' }}>Teranga</span>
              <span style={{ background: 'linear-gradient(135deg, #34d399 0%, #fbbf24 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Civil</span>
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
            <span>2026 - TERANGA CIVIL</span>
          </div>
        </div>

        {/* Right Pane - Login form */}
        <div className="login-right-pane">
          <div className="login-card" style={{ boxShadow: 'none', border: 'none', padding: 0 }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>Connexion</h2>
              <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Identifiez-vous pour accéder au pilotage</p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.15)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <ShieldCheck size={16} />
                <span>{error}</span>
              </div>
            )}

            {requirePasswordChange ? (
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
                      required
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
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confirmer le mot de passe</label>
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
                      required
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
                    background: '#0c9d5d',
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
                    boxShadow: '0 4px 12px rgba(12, 157, 93, 0.2)'
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
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adresse Email ou Téléphone</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      className="login-form-input"
                      placeholder="abbd@gmail.com"
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
                    background: '#0c9d5d',
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
                    boxShadow: '0 4px 12px rgba(12, 157, 93, 0.2)'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="loading-spinner" style={{ borderLeftColor: '#ffffff' }}></div>
                  ) : (
                    <>
                      <span>Accéder au Dashboard</span>
                      <span style={{ fontSize: '1.1rem' }}>→</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="right-pane-footer" style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 'auto', textAlign: 'center', width: '100%', fontWeight: '600', paddingTop: '1.5rem' }}>
            TERANGA CIVIL — ADMINISTRATION EN LIGNE — SENEGAL 2026
          </div>
        </div>
      </div>
    </div>
  );
}
