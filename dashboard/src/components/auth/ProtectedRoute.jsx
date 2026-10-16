import React from 'react';
import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export const ProtectedRoute = ({ user, allowedLevels, strictAllowedLevels, exactPermissions, allowAgent, children }) => {
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

  const normalizedRole = user?.role ? user.role.toLowerCase().replace(' ', '_') : '';

  let hasAccess = false;

  if (allowedLevels) {
    hasAccess = allowedLevels.some(level => hasAtLeast(level));
  } else if (strictAllowedLevels) {
    hasAccess = strictAllowedLevels.some(level => isStrictlyAbove(level));
  } else if (exactPermissions) {
    hasAccess = exactPermissions.some(p => permissions.includes(p));
  } else {
    hasAccess = true;
  }

  if (allowAgent && normalizedRole === 'agent') {
    hasAccess = true;
  }

  if (!hasAccess) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem', margin: '2rem', color: 'var(--danger)' }}>
        <Shield size={48} style={{ marginBottom: '1rem', display: 'inline-block' }} />
        <h3>Accès Refusé</h3>
        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <Link to="/dashboard" className="btn btn-secondary mt-4" style={{ display: 'inline-flex' }}>Retour à l'accueil</Link>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
