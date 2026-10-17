import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  FileText, Home, PlusCircle, Calendar, User, LogOut,
  Bell, Moon, Sun, Menu, X, ShieldCheck, ChevronDown,
  Download, Mic, Sparkles, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import api from '../../utils/api';
import CitizenAiFloatingWidget from './CitizenAiFloatingWidget';
import VoiceNavigatorWidget from './VoiceNavigatorWidget';

export default function CitizenLayout({ user, onLogout, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [voiceEnabled, setVoiceEnabled] = useState(
    localStorage.getItem('voice_navigator_enabled') === 'true'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const toggleVoice = () => {
    setVoiceEnabled(prev => {
      const next = !prev;
      localStorage.setItem('voice_navigator_enabled', String(next));
      return next;
    });
  };

  // Load unread notifications
  useEffect(() => {
    if (user?.id) {
      api.get('/notifications')
        .then(res => {
          const notifs = res?.data?.notifications || res?.data || [];
          setNotifications(Array.isArray(notifs) ? notifs : []);
        })
        .catch(() => {});
    }
  }, [user]);

  const unreadCount = notifications.filter(n => !n.lu).length;

  // 4 Primary tabs matching mobile
  const primaryTabs = [
    { to: '/citoyen', label: 'Accueil', icon: Home, exact: true },
    { to: '/citoyen/demandes', label: 'Mes Démarches', icon: FileText },
    { to: '/citoyen/rendez-vous', label: 'Rendez-vous', icon: Calendar },
    { to: '/citoyen/actes', label: 'Mes Actes PDF', icon: Download },
    { to: '/citoyen/profil', label: 'Paramètres', icon: User },
  ];

  const isStaff = user?.permissions && user.permissions.length > 0 && user.permissions.some(p => p.startsWith('GERER_'));

  return (
    <div className="citizen-app-root" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-primary, #f8fafc)',
      color: 'var(--text-primary, #0f172a)',
      fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
    }}>
      {/* ── TOP HEADER ── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'var(--c-header-bg, rgba(255, 255, 255, 0.95))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--c-border, rgba(0, 0, 0, 0.08))',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 1.25rem',
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          {/* Brand Logo */}
          <Link to="/citoyen" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--c-bg-card, #ffffff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,99,235,0.15)',
              border: '1px solid var(--c-border, #e2e8f0)',
              overflow: 'hidden'
            }}>
              <img src="/logo.png" alt="SenInnov" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px', lineHeight: 1.1 }}>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>Sen</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#2563eb' }}>Innov</span>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Portail Citoyen
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links (4 Mobile Tabs + Action Buttons) */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className="citizen-desktop-nav">
            {primaryTabs.filter(l => l.to !== '/citoyen/profil').map((link) => {
              const Icon = link.icon;
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 13px',
                    borderRadius: '12px',
                    fontSize: '0.86rem',
                    fontWeight: isActive ? '700' : '500',
                    textDecoration: 'none',
                    color: isActive ? '#2563eb' : 'var(--c-text-secondary, #475569)',
                    backgroundColor: isActive ? 'rgba(37,99,235,0.1)' : 'transparent',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                >
                  <Icon size={16} color={isActive ? '#2563eb' : 'currentColor'} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      padding: '1px 6px',
                      borderRadius: '999px',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff'
                    }}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}

            {/* Direct CTA: Nouvelle Demande */}
            <Link
              to="/citoyen/demande/nouvelle"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.88rem',
                fontWeight: '700',
                textDecoration: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                transition: 'all 0.2s ease',
                marginLeft: '8px'
              }}
            >
              <PlusCircle size={16} />
              <span>Nouvelle demande</span>
            </Link>
          </nav>

          {/* Right Section: Voice Toggle, Theme, Notifications & Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Voice Navigator Toggle */}
            <button
              type="button"
              onClick={toggleVoice}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: voiceEnabled ? 'rgba(37,99,235,0.1)' : 'rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: voiceEnabled ? '#2563eb' : '#64748b',
                transition: 'all 0.2s ease'
              }}
              title={voiceEnabled ? 'Assistant vocal activé' : 'Activer l\'assistant vocal'}
            >
              <Mic size={18} />
            </button>

            {/* Theme switch */}
            <button
              type="button"
              onClick={toggleTheme}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: 'rgba(0,0,0,0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
              title={theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
            >
              {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} />}
            </button>

            {/* Notifications Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  position: 'relative',
                  color: '#64748b'
                }}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444'
                  }} />
                )}
              </button>

              {notificationsOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '48px',
                  width: '320px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '12px',
                  zIndex: 200
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', paddingBottom: '6px', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.88rem' }}>Notifications</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{unreadCount} non lues</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                      Aucune nouvelle notification
                    </div>
                  ) : (
                    <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {notifications.slice(0, 5).map((n) => (
                        <div key={n.id} style={{
                          padding: '8px 10px',
                          borderRadius: '8px',
                          backgroundColor: n.lu ? 'transparent' : '#f0fdf4',
                          border: n.lu ? 'none' : '1px solid #bbf7d0',
                          fontSize: '0.8rem'
                        }}>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{n.titre || 'Mise à jour'}</div>
                          <div style={{ color: '#475569', fontSize: '0.76rem', marginTop: '2px' }}>{n.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '5px 12px 5px 6px',
                  borderRadius: '12px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '10px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.85rem'
                }}>
                  {user?.nom_complet?.charAt(0) || 'C'}
                </div>
                <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }} className="citizen-user-info">
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#0f172a', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.nom_complet || 'Citoyen'}
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                    {user?.telephone || 'Sénégal'}
                  </span>
                </div>
                <ChevronDown size={14} color="#64748b" />
              </button>

              {userDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '48px',
                  width: '240px',
                  backgroundColor: '#ffffff',
                  borderRadius: '14px',
                  boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '8px',
                  zIndex: 200
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', marginBottom: '6px' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#0f172a' }}>{user?.nom_complet}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{user?.telephone || user?.email}</div>
                  </div>

                  <Link
                    to="/citoyen/profil"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#334155',
                      textDecoration: 'none'
                    }}
                  >
                    <User size={16} color="#64748b" />
                    <span>Mon Profil & Paramètres</span>
                  </Link>

                  <Link
                    to="/citoyen/actes"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#334155',
                      textDecoration: 'none'
                    }}
                  >
                    <Download size={16} color="#64748b" />
                    <span>Mes Actes Téléchargés</span>
                  </Link>

                  <Link
                    to="/citoyen/assistant-ia"
                    onClick={() => setUserDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      fontSize: '0.85rem',
                      color: '#4f46e5',
                      backgroundColor: 'rgba(79,70,229,0.06)',
                      textDecoration: 'none',
                      marginTop: '4px'
                    }}
                  >
                    <Sparkles size={16} color="#4f46e5" />
                    <span>Assistant IA Juridique</span>
                  </Link>

                  {isStaff && (
                    <Link
                      to="/dashboard"
                      onClick={() => setUserDropdownOpen(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#2563eb',
                        backgroundColor: 'rgba(37,99,235,0.06)',
                        textDecoration: 'none',
                        margin: '4px 0'
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>Espace Administration</span>
                    </Link>
                  )}

                  <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '6px', paddingTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onLogout();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        color: '#ef4444',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <LogOut size={16} />
                      <span>Se déconnecter</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="citizen-mobile-menu-btn"
              style={{
                display: 'none',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid rgba(0,0,0,0.08)',
                backgroundColor: 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderTop: '1px solid var(--c-border, #f1f5f9)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {primaryTabs.map((link) => {
              const Icon = link.icon;
              const isActive = link.exact
                ? location.pathname === link.to
                : location.pathname.startsWith(link.to);

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: isActive ? '700' : '600',
                    textDecoration: 'none',
                    color: isActive ? '#ffffff' : 'var(--c-text-primary, #334155)',
                    backgroundColor: isActive ? '#2563eb' : 'var(--c-bg-subtle, #f8fafc)',
                    border: '1px solid var(--c-border, transparent)'
                  }}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                  {link.badge && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.7rem',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '999px',
                      backgroundColor: '#7c3aed',
                      color: '#ffffff'
                    }}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            <Link
              to="/citoyen/demande/nouvelle"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: '700',
                textDecoration: 'none',
                color: '#ffffff',
                backgroundColor: '#10b981',
                marginTop: '6px'
              }}
            >
              <PlusCircle size={18} />
              <span>Nouvelle demande</span>
            </Link>
          </div>
        )}
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '1.75rem 1.25rem 3rem' }}>
        {children}
      </main>

      {/* ── BOTTOM MOBILE BAR (Visible on mobile screens) ── */}
      <div className="citizen-bottom-mobile-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        zIndex: 90,
        justifyContent: 'space-around',
        alignItems: 'center',
        boxShadow: '0 -4px 16px rgba(0,0,0,0.05)'
      }}>
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);

          return (
            <Link
              key={tab.to}
              to={tab.to}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                textDecoration: 'none',
                color: isActive ? '#2563eb' : '#64748b',
                fontSize: '0.72rem',
                fontWeight: isActive ? '700' : '500'
              }}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── FOOTER ── */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        padding: '2rem 1.25rem',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          fontSize: '0.85rem',
          color: '#64748b'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>SenInnov</span>
            <span>• République du Sénégal • Ministère de l\'Intérieur</span>
          </div>
          <div>
            Plateforme Nationale de Dématérialisation de l\'État Civil • Certifiée conforme
          </div>
        </div>
      </footer>

      {/* Floating AI Assistant Widget button */}
      <CitizenAiFloatingWidget user={user} />

      {/* Voice Navigator Widget */}
      <VoiceNavigatorWidget enabled={voiceEnabled} onToggle={toggleVoice} />
    </div>
  );
}
