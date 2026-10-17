export const isCitizenUser = (user) => {
  if (!user) return true;
  
  const permissions = user.permissions || [];
  const hasStaffPermission = permissions.some(p => typeof p === 'string' && p.startsWith('GERER_'));
  
  const staffRoles = ['admin', 'administrateur', 'officier', 'agent', 'maire', 'archiviste', 'superadmin'];
  const userRole = (user.role || '').toLowerCase();
  const hasStaffRole = staffRoles.some(r => userRole.includes(r));
  
  return !hasStaffPermission && !hasStaffRole;
};

export default { isCitizenUser };
