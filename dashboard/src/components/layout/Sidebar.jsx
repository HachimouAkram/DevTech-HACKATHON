import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Users, User, LogOut, Landmark, Globe, Map, LayoutDashboard, 
  Briefcase, Activity, Building, Building2, Shield, ChevronDown, 
  ChevronRight, FolderTree, Archive, Calendar, BarChart2, ScanFace, Banknote, PenTool 
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/api.js';

export const Sidebar = ({ user, sidebarCollapsed, sidebarOpen, setSidebarOpen, onLogout }) => {
  const location = useLocation();
  const [isUsersMenuOpen, setIsUsersMenuOpen] = useState(false);
  const [isCatalogueOpen, setIsCatalogueOpen] = useState(false);
  const [isTerritoiresOpen, setIsTerritoiresOpen] = useState(false);

  const normalizedRole = user?.role ? user.role.toLowerCase().replace(' ', '_') : '';
  const permissions = user?.permissions || [];
  const hierarchy = ['GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES'];
  const userLevelIndex = permissions.length > 0 ? Math.min(...permissions.map(p => hierarchy.indexOf(p)).filter(i => i !== -1)) : -1;

  const hasAtLeast = (level) => {
    if (userLevelIndex === -1) return false;
    const requiredIndex = hierarchy.indexOf(level);
    if (requiredIndex === -1) return false;
    return userLevelIndex <= requiredIndex;
  };

  const isStrictlyAbove = (level) => {
    if (userLevelIndex === -1) return false;
    const requiredIndex = hierarchy.indexOf(level);
    if (requiredIndex === -1) return false;
    return userLevelIndex < requiredIndex;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const [pendingSignaturesCount, setPendingSignaturesCount] = useState(0);

  useEffect(() => {
    if (hasAtLeast('GERER_COMMUNE') && !permissions.includes('GERER_GLOBAL')) {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_BASE_URL}/demandes?statut=signature&size=1`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data.data && data.data.totalElements !== undefined) {
              setPendingSignaturesCount(data.data.totalElements);
            }
          })
          .catch(err => console.error("Erreur chargement signatures:", err));
      }
    }
  }, [user, location.pathname]);

  return (
    <>
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon-box">
            <img src="/logo.png" alt="SenInnov" className="logo-icon-img" />
          </div>
          {!sidebarCollapsed && (
            <div className="logo-brand-wrap">
              <span className="logo-text-styled">
                <span className="logo-text-primary">Sen</span>
                <span className="logo-text-accent">Innov</span>
              </span>
              <span className="logo-text-badge">SÉNÉGAL</span>
            </div>
          )}
        </div>
        <nav style={{ flexGrow: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <ul className="sidebar-menu">
            <li>
              <Link to="/dashboard" className={`sidebar-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
                <LayoutDashboard size={20} />
                <span>Accueil</span>
              </Link>
            </li>

            {/* Utilisateurs & Accès Group */}
            {hasAtLeast('GERER_SERVICES') && (() => {
              const showUsers = hasAtLeast('GERER_SERVICES');
              const showProfiles = hasAtLeast('GERER_GLOBAL');
              const showLogs = hasAtLeast('GERER_CENTRE');
              const visibleItems = [
                showUsers && { path: '/dashboard/users', icon: User, label: 'Utilisateurs' },
                showProfiles && { path: '/dashboard/profils', icon: Shield, label: 'Profils & Permissions' },
                showLogs && { path: '/dashboard/audit-logs', icon: Activity, label: "Historique d'activités" },
              ].filter(Boolean);

              if (visibleItems.length === 0) return null;

              if (visibleItems.length === 1) {
                const item = visibleItems[0];
                return (
                  <li>
                    <Link to={item.path} className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}>
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              }

              const isActive = visibleItems.some(item => location.pathname.startsWith(item.path));
              return (
                <li>
                  <div
                    className={`sidebar-link ${isActive && !isUsersMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsUsersMenuOpen(!isUsersMenuOpen)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Users size={20} />
                      <span>Utilisateurs & Accès</span>
                    </div>
                    {isUsersMenuOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>

                  {isUsersMenuOpen && (
                    <ul style={{ listStyle: 'none', paddingLeft: '1.5rem', margin: '0.25rem 0' }}>
                      {visibleItems.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>
                          <Link to={item.path} className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })()}

            {/* Catalogue Group (Bureaux, Services, Activités) */}
            {(hasAtLeast('GERER_GLOBAL') || hasAtLeast('GERER_BUREAU') || ['agent'].includes(normalizedRole)) && (() => {
              const showBureaux = hasAtLeast('GERER_GLOBAL');
              const showServices = hasAtLeast('GERER_BUREAU');
              const showActivities = hasAtLeast('GERER_GLOBAL') || ['agent'].includes(normalizedRole);
              const showTemplates = hasAtLeast('GERER_GLOBAL');

              const visibleItems = [
                showBureaux && { path: '/dashboard/bureaux', icon: Building2, label: 'Bureaux' },
                showServices && { path: '/dashboard/services', icon: Briefcase, label: 'Services' },
                showActivities && { path: '/dashboard/activities', icon: Activity, label: normalizedRole === 'agent' ? 'Mes Activités' : 'Activités & Formulaires' },
                showTemplates && { path: '/dashboard/document-templates', icon: FolderTree, label: 'Modèles de Documents' }
              ].filter(Boolean);

              if (visibleItems.length === 0) return null;

              if (visibleItems.length === 1) {
                const item = visibleItems[0];
                return (
                  <li>
                    <Link to={item.path} className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}>
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              }

              const isActive = visibleItems.some(item => location.pathname.startsWith(item.path));
              return (
                <li>
                  <div
                    className={`sidebar-link ${isActive && !isCatalogueOpen ? 'active' : ''}`}
                    onClick={() => setIsCatalogueOpen(!isCatalogueOpen)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <FolderTree size={20} />
                      <span>Gestion des Services</span>
                    </div>
                    {isCatalogueOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>

                  {isCatalogueOpen && (
                    <ul style={{ listStyle: 'none', paddingLeft: '1.5rem', margin: '0.25rem 0' }}>
                      {visibleItems.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>
                          <Link to={item.path} className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })()}

            {/* Territoires Group (Régions, Départements, Communes, Centres) */}
            {hasAtLeast('GERER_COMMUNE') && (() => {
              const showRegions = isStrictlyAbove('GERER_REGION');
              const showDepartements = isStrictlyAbove('GERER_DEPARTEMENT');
              const showCommunes = isStrictlyAbove('GERER_COMMUNE');
              const showCentres = permissions.includes('GERER_COMMUNE');

              const visibleItems = [
                showRegions && { path: '/dashboard/regions', icon: Globe, label: 'Régions' },
                showDepartements && { path: '/dashboard/departements', icon: Map, label: 'Départements' },
                showCommunes && { path: '/dashboard/communes', icon: Landmark, label: 'Communes' },
                showCentres && { path: '/dashboard/centres', icon: Building, label: 'Centres' }
              ].filter(Boolean);

              if (visibleItems.length === 0) return null;

              if (visibleItems.length === 1) {
                const item = visibleItems[0];
                return (
                  <li>
                    <Link to={item.path} className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`}>
                      <item.icon size={20} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              }

              const isActive = visibleItems.some(item => location.pathname.startsWith(item.path));
              return (
                <li>
                  <div
                    className={`sidebar-link ${isActive && !isTerritoiresOpen ? 'active' : ''}`}
                    onClick={() => setIsTerritoiresOpen(!isTerritoiresOpen)}
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <Map size={20} />
                      <span>Territoires</span>
                    </div>
                    {isTerritoiresOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>

                  {isTerritoiresOpen && (
                    <ul style={{ listStyle: 'none', paddingLeft: '1.5rem', margin: '0.25rem 0' }}>
                      {visibleItems.map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '0.25rem' }}>
                          <Link to={item.path} className={`sidebar-link ${location.pathname.startsWith(item.path) ? 'active' : ''}`} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                            <item.icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })()}

            {/* Demandes Link */}
            {hasAtLeast('GERER_COMMUNE') && !permissions.includes('GERER_GLOBAL') && pendingSignaturesCount > 0 && (
              <li>
                <Link to="/dashboard/documents-a-signer" className={`sidebar-link ${location.pathname === '/dashboard/documents-a-signer' ? 'active' : ''}`}>
                  <PenTool size={20} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                    <span>Documents à signer</span>
                    {!sidebarCollapsed && (
                      <span style={{ backgroundColor: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}>
                        {pendingSignaturesCount}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            )}

            {(!hasAtLeast('GERER_COMMUNE') && !permissions.includes('GERER_ARCHIVE')) && (
              <>
                <li>
                  <Link to="/dashboard/demandes" className={`sidebar-link ${location.pathname === '/dashboard/demandes' ? 'active' : ''}`}>
                    <FolderTree size={20} />
                    <span>Demandes</span>
                  </Link>
                </li>
                {(!hasAtLeast('GERER_SERVICES') && !permissions.includes('GERER_ARCHIVE')) && (
                  <li>
                    <Link to="/dashboard/rendez-vous" className={`sidebar-link ${location.pathname === '/dashboard/rendez-vous' ? 'active' : ''}`}>
                      <Calendar size={20} />
                      <span>Rendez-vous</span>
                    </Link>
                  </li>
                )}
              </>
            )}

            {/* Rapports */}
            {hasAtLeast('GERER_BUREAU') && (
              <>
                <li>
                  <Link to="/dashboard/rapports" className={`sidebar-link ${location.pathname === '/dashboard/rapports' ? 'active' : ''}`}>
                    <BarChart2 size={20} />
                    <span>Rapports</span>
                  </Link>
                </li>
                {!permissions.includes('GERER_GLOBAL') && (
                  <li>
                    <Link to="/dashboard/transactions" className={`sidebar-link ${location.pathname === '/dashboard/transactions' ? 'active' : ''}`}>
                      <Banknote size={20} />
                      <span>Transactions</span>
                    </Link>
                  </li>
                )}
              </>
            )}

            {/* Dossiers Archivés */}
            {permissions.includes('GERER_ARCHIVE') && (
              <li>
                <Link to="/dashboard/archives" className={`sidebar-link ${location.pathname === '/dashboard/archives' ? 'active' : ''}`}>
                  <Archive size={20} />
                  <span>Dossiers Archivés</span>
                </Link>
              </li>
            )}

            {/* Pointage */}
            {(user?.centre_id || user?.bureau_id) && hasAtLeast('GERER_BUREAU') && (
              <li>
                <Link to="/dashboard/pointage" className={`sidebar-link ${location.pathname === '/dashboard/pointage' ? 'active' : ''}`}>
                  <ScanFace size={20} />
                  <span>Pointage & Présence</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">
              {getInitials(user?.nom_complet)}
            </div>
            {!sidebarCollapsed && (
              <div className="user-info">
                <span className="username" title={user?.nom_complet}>{user?.nom_complet?.split(' ')[0]}</span>
                <span className="user-role">{user?.role?.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          <button onClick={onLogout} className="btn-logout" style={{ justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            <LogOut size={18} />
            {!sidebarCollapsed && <span>Déconnexion</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
