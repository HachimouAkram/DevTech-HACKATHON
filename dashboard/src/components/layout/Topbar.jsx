import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Bell, User, LogOut, Sun, Moon, Globe } from 'lucide-react';
import useNotifications from '../../hooks/useNotifications';

export const Topbar = ({ user, sidebarCollapsed, toggleSidebar, onLogout }) => {
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const { notifications, unreadCount, markAllRead, markAsRead } = useNotifications();

  // Dark / Light Theme Logic
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Tableau de Bord';
    if (path.startsWith('/dashboard/users')) return 'Gestion des Utilisateurs';
    if (path.startsWith('/dashboard/profils')) return 'Profils & Permissions';
    if (path.startsWith('/dashboard/regions')) return 'Régions';
    if (path.startsWith('/dashboard/departements')) return 'Départements';
    if (path.startsWith('/dashboard/communes')) return 'Communes';
    if (path.startsWith('/dashboard/centres')) return "Centres d'État Civil";
    if (path.startsWith('/dashboard/bureaux')) return "Gestion des Bureaux";
    if (path.startsWith('/dashboard/services')) return "Services d'État Civil";
    if (path.startsWith('/dashboard/activities')) return "Activités & Formulaires";
    if (path.startsWith('/dashboard/demandes')) return 'Demandes Citoyennes';
    if (path.startsWith('/dashboard/rendez-vous')) return 'Rendez-vous du jour';
    if (path.startsWith('/dashboard/document-templates')) return 'Modèles de Documents';
    if (path.startsWith('/dashboard/audit-logs')) return "Historique d'Activités";
    if (path.startsWith('/dashboard/archives')) return 'Dossiers Archivés';
    if (path.startsWith('/dashboard/rapports')) return 'Rapports & Statistiques';
    if (path.startsWith('/dashboard/profil')) return 'Mon Profil';
    return "Digitalisation de l'État Civil";
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className={`top-header ${sidebarCollapsed ? 'header-expanded' : ''}`}>
      <div className="flex-gap">
        <button className="sidebar-toggle-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={24} />
        </button>
        <div className="header-title">
          <h1>{getPageTitle()}</h1>
        </div>
      </div>
      <div className="flex-gap" style={{ position: 'relative' }}>
        {/* Link to Public Showcase Site Vitrine */}
        <Link
          to="/"
          className="sidebar-toggle-btn"
          style={{ marginRight: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'inherit' }}
          title="Voir le site vitrine public"
        >
          <Globe size={22} />
        </Link>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="sidebar-toggle-btn"
          style={{ marginRight: '0.5rem' }}
          title={theme === 'light' ? 'Activer le mode sombre' : 'Activer le mode clair'}
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </button>

        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="sidebar-toggle-btn"
          style={{ position: 'relative', marginRight: '0.5rem' }}
          title="Notifications"
        >
          <Bell size={22} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: 'var(--danger)',
              color: '#ffffff',
              fontSize: '0.65rem',
              fontWeight: 'bold',
              borderRadius: '50%',
              width: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification Dropdown */}
        {showNotifications && (
          <div className="notifications-dropdown">
            <div className="notifications-header">
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                >
                  Tout marquer lu
                </button>
              )}
            </div>
            <div className="notifications-list">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => { markAsRead(n.id); setShowNotifications(false); }}
                  className={`notification-item ${!n.lu ? 'unread' : ''}`}
                >
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{n.titre}</span>
                  <span style={{ fontSize: '0.8', color: 'var(--text-secondary)' }}>{n.contenu}</span>
                  <span className="notification-time">{new Date(n.date_envoi).toLocaleString()}</span>
                </div>
              ))}
              {notifications.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Aucune notification
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'var(--bg-secondary)', padding: '0.3rem 0.8rem', borderRadius: '20px' }}
          >
            <div className="avatar" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}>
              {getInitials(user?.nom_complet)}
            </div>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              {user?.nom_complet?.split(' ')[0] || 'Utilisateur'}
            </span>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown" style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              background: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              borderRadius: '8px',
              width: '200px',
              zIndex: 1000,
              padding: '0.5rem 0'
            }}>
              <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #eee' }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user?.nom_complet}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
              <Link
                to="/dashboard/profil"
                onClick={() => setShowProfileMenu(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  color: 'var(--text-primary)',
                  textDecoration: 'none',
                  fontSize: '0.9rem'
                }}
              >
                <User size={14} /> Mon Profil
              </Link>
              <button
                onClick={onLogout}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  cursor: 'pointer',
                  color: 'var(--danger)',
                  fontWeight: 500
                }}
              >
                <LogOut size={16} /> Déconnexion
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
