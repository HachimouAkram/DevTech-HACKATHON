import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { Plus, Search, UserCheck, UserX, X, UserPlus, Edit2, Trash2, Key, Eye, Shield, Users } from 'lucide-react';
import Pagination from '../components/Pagination';

export default function UsersList({ token, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Metadata for form dropdowns
  const [regions, setRegions] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [centres, setCentres] = useState([]);
  const [services, setServices] = useState([]);
  const [bureaux, setBureaux] = useState([]);
  const [officerActivities, setOfficerActivities] = useState([]);
  const [profils, setProfils] = useState([]);

  // Cascading dropdown states
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [centreConfig, setCentreConfig] = useState(null);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalElements, setTotalElements] = useState(0);

  // Modal Creation / Edition State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null); // Utilisateur pour "Voir plus"
  const [editUser, setEditUser] = useState(null); // If not null, we are editing
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    nom_complet: '',
    telephone: '',
    email: '',
    password: '',
    role: '',
    commune_id: '',
    centre_id: '',
    bureau_id: '',
    service_id: '',
    service_ids: [],
    region_ids: [],
    departement_ids: [],
    actif: true,
    activity_ids: []
  });

  // Modal Password Reset State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const [passwordUserName, setPasswordUserName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  // Hiérarchie des permissions (Index plus bas = Niveau plus élevé)
  const hierarchy = ['GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES', 'GERER_ARCHIVE'];

  const getProfileLevelIndex = (profilObj) => {
    if (!profilObj || !profilObj.permissions) return -1;
    const indexes = profilObj.permissions.map(p => hierarchy.indexOf(p.nom)).filter(i => i !== -1);
    return indexes.length > 0 ? Math.min(...indexes) : -1;
  };

  // Get currentUser permissions dynamically
  const currentUserProfil = profils.find(p => p.nom.toLowerCase() === (currentUser?.role || '').toLowerCase());
  const hasPerm = (profilObj, permName) => profilObj?.permissions?.some(p => p.nom === permName) || false;

  const currentUserLevelIndex = getProfileLevelIndex(currentUserProfil);

  // Permission check for the role being CREATED/EDITED (based on formData.role)
  const selectedFormProfil = profils.find(p => p.nom === formData.role);
  const roleHasPerm = (permName) => selectedFormProfil?.permissions?.some(p => p.nom === permName) || false;

  const fullCurrentUser = users.find(u => u.id === currentUser?.id) || currentUser;

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.append('search', search);
      if (selectedRole) queryParams.append('role', selectedRole);
      queryParams.append('page', currentPage - 1);
      queryParams.append('size', itemsPerPage);

      const response = await fetch(`${API_BASE_URL}/users?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors du chargement des utilisateurs.');
      
      const responseData = data.data.users || {};
      setUsers(responseData.content || data.data.users || []);
      setTotalElements(responseData.totalElements || data.data.users?.length || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Metadata
  const fetchMetadata = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/metadata?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (response.ok) {
        setRegions(data.data.regions || []);
        setDepartements(data.data.departements || []);
        setCommunes(data.data.communes || []);
        setCentres(data.data.centres || []);
        setServices(data.data.services || []);
        setBureaux(data.data.bureaux || []);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const fetchOfficerActivities = async () => {
    if (!currentUserProfil || !hasPerm(currentUserProfil, 'GERER_SERVICES')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/activities`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setOfficerActivities(data.data.activities || []);
      }
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  // Fetch Profils
  const fetchProfils = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profils`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setProfils(data.data.profils || []);
      }
    } catch (err) {
      console.error('Failed to load profils:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
    fetchOfficerActivities();
    fetchProfils();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, selectedRole, currentPage, itemsPerPage]);

  // Fetch Commune Configuration when a commune is selected
  useEffect(() => {
    const fetchCentreConfig = async () => {
      const fullUser = users.find(u => u.id === currentUser?.id) || currentUser;
      const centreIdToFetch = formData.centre_id || fullUser?.centre_id;
      if (!centreIdToFetch) {
        setCentreConfig(null);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/centres/${centreIdToFetch}/configuration`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setCentreConfig(data.data.configuration || []);
        }
      } catch (err) {
        console.error('Failed to load commune config:', err);
      }
    };
    fetchCentreConfig();
  }, [formData.centre_id, currentUser, users, token]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  // Toggle user status (Activate/Deactivate)
  const handleToggleStatus = async (userId, isActif) => {
    const action = isActif ? 'deactivate' : 'activate';
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Action impossible.');

      // Update state locally
      setUsers(users.map(u => u.id === userId ? { ...u, actif: !isActif } : u));
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Delete User
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Action impossible.');
      fetchUsers();
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    }
  };

  // Open Edit Modal
  const handleOpenEditModal = (user) => {
    setEditUser(user);
    setFormError('');

    // Pre-populate cascade region & dept if commune exists
    if (user.commune_id) {
      const comm = communes.find(c => c.id === user.commune_id);
      if (comm) {
        setSelectedDepartment(comm.departement_id.toString());
        const dept = departements.find(d => d.id === comm.departement_id);
        if (dept) {
          setSelectedRegion(dept.region_id.toString());
        }
      }
    }

    const parts = (user.nom_complet || '').trim().split(/\s+/);
    const nom = parts.length > 1 ? parts.pop() : '';
    const prenom = parts.join(' ');

    setFormData({
      prenom,
      nom,
      nom_complet: user.nom_complet,
      telephone: user.telephone,
      email: user.email || '',
      password: '', // Blank during edit
      role: user.role || '',
      commune_id: user.commune_id || '',
      centre_id: user.centre_id || '',
      bureau_id: user.bureau_id || '',
      service_id: user.service_id || '',
      service_ids: user.service_ids || [],
      region_ids: user.region_ids || [],
      departement_ids: user.departement_ids || [],
      actif: user.actif,
      activity_ids: user.activity_ids || []
    });
    setIsModalOpen(true);
  };

  // Open Password Modal
  const handleOpenPasswordModal = (user) => {
    setPasswordUserId(user.id);
    setPasswordUserName(user.nom_complet);
    setNewPassword('');
    setPassError('');
    setIsPasswordModalOpen(true);
  };

  // Handle manual password reset
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPassError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setPassLoading(true);
    setPassError('');

    try {
      const response = await fetch(`${API_BASE_URL}/users/${passwordUserId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Erreur lors de la réinitialisation.');

      alert('Mot de passe mis à jour avec succès.');
      setIsPasswordModalOpen(false);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassLoading(false);
    }
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const selectedProfil = profils.find(p => p.nom === formData.role);
    const roleHasPerm = (perm) => selectedProfil && (selectedProfil.permissions || []).includes(perm);

    if (roleHasPerm('GERER_SERVICES') && (!formData.service_ids || formData.service_ids.length === 0)) {
      setFormError('Veuillez cocher au moins un service pour ce profil.');
      setFormLoading(false);
      return;
    }

    const bodyData = { ...formData };
    bodyData.nom_complet = `${formData.prenom || ''} ${formData.nom || ''}`.trim();
    delete bodyData.prenom;
    delete bodyData.nom;

    // Convert string inputs to proper numbers or null for backend compatibility
    const intFields = ['commune_id', 'centre_id', 'service_id', 'bureau_id'];
    intFields.forEach(field => {
      if (bodyData[field] === '') {
        bodyData[field] = null;
      } else if (bodyData[field] !== undefined && bodyData[field] !== null) {
        bodyData[field] = parseInt(bodyData[field]);
      }
    });

    // Remove password if editing and it's empty
    if (editUser && !bodyData.password) {
      delete bodyData.password;
    }

    // Role-based locked field assignments
    if (currentUserProfil && !hasPerm(currentUserProfil, 'GERER_GLOBAL') && !hasPerm(currentUserProfil, 'GERER_REGION') && !hasPerm(currentUserProfil, 'GERER_DEPARTEMENT')) {
      bodyData.commune_id = fullCurrentUser.commune_id;
      bodyData.bureau_id = fullCurrentUser.bureau_id;

      if (hasPerm(currentUserProfil, 'GERER_SERVICES')) {
        bodyData.service_ids = fullCurrentUser.service_ids || [fullCurrentUser.service_id];
        bodyData.service_id = fullCurrentUser.service_id;
        bodyData.centre_id = fullCurrentUser.centre_id;
      }
    }

    try {
      const url = editUser
        ? `${API_BASE_URL}/users/${editUser.id}`
        : `${API_BASE_URL}/users`;
      const method = editUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Erreur lors de la sauvegarde.');

      handleCloseModal();
      fetchUsers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Handle password reset email
  const handleResetPasswordEmail = async (user) => {
    if (!user.email) {
      alert("Cet utilisateur n'a pas d'adresse e-mail renseignée. Impossible d'envoyer le mot de passe.");
      return;
    }

    if (!window.confirm(`Êtes-vous sûr de vouloir réinitialiser le mot de passe de ${user.nom_complet} ?\nUn nouveau mot de passe sera généré et lui sera envoyé par email.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${user.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la réinitialisation du mot de passe.');

      alert(data.message || 'Mot de passe réinitialisé et envoyé par email avec succès.');
    } catch (err) {
      alert(`Erreur: ${err.message}`);
    }
  };



  // Allowed roles to create based on currentUser
  const getAllowedRolesToCreate = () => {
    if (currentUserLevelIndex === -1) return [];

    return profils
      .filter(p => p.nom !== 'Citoyen')
      .filter(p => {
        const pLevel = getProfileLevelIndex(p);
        
        if (pLevel === -1) return false;

        // Super Admin (GERER_GLOBAL) can create GERER_GLOBAL down to GERER_COMMUNE
        if (currentUserLevelIndex === hierarchy.indexOf('GERER_GLOBAL')) {
            return pLevel >= hierarchy.indexOf('GERER_GLOBAL') && pLevel <= hierarchy.indexOf('GERER_COMMUNE');
        }

        // Region / Departement managers can create down to Commune
        if (currentUserLevelIndex < hierarchy.indexOf('GERER_COMMUNE')) {
            return pLevel > currentUserLevelIndex && pLevel <= hierarchy.indexOf('GERER_COMMUNE');
        }

        // Maire (GERER_COMMUNE) can create Centre, Bureau, Service, Activite, Archiviste (below Commune)
        if (currentUserLevelIndex === hierarchy.indexOf('GERER_COMMUNE')) {
            return pLevel > hierarchy.indexOf('GERER_COMMUNE');
        }

        // Officiers (GERER_BUREAU) and others CANNOT create anyone
        if (currentUserLevelIndex > hierarchy.indexOf('GERER_COMMUNE')) {
            return false;
        }

        return false;
      })
      .map(p => ({ value: p.nom, label: p.nom }));
  };

  const filteredDepartments = departements.filter(d => d.region_id === parseInt(selectedRegion));
  const filteredCommunes = (hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION') || hasPerm(currentUserProfil, 'GERER_DEPARTEMENT'))
    ? communes.filter(c => c.departement_id === parseInt(selectedDepartment))
    : communes.filter(c => c.id === parseInt(fullCurrentUser.commune_id));

  const targetBureauId = parseInt(formData.bureau_id) || parseInt(fullCurrentUser.bureau_id);
  const targetServiceId = parseInt(formData.service_id) || parseInt(fullCurrentUser.service_id);

  const filteredServices = centreConfig
    ? (centreConfig.find(b => b.bureau_id === targetBureauId)?.services || []).filter(s => s.actif)
    : [];

  const filteredOfficerActivities = centreConfig
    ? (centreConfig.find(b => b.bureau_id === targetBureauId)?.services || [])
      .filter(s => (formData.service_ids || []).includes(s.service_id) || s.service_id === targetServiceId)
      .flatMap(s => s.activites || [])
      .filter(a => a.actif)
    : [];
  // Centres under the appropriate commune
  const modalCommuneId = (currentUserProfil && (hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION') || hasPerm(currentUserProfil, 'GERER_DEPARTEMENT')))
    ? formData.commune_id
    : fullCurrentUser.commune_id;
  const filteredCentres = centres.filter(c => c.commune_id === parseInt(modalCommuneId));

  const handleOpenCreateModal = () => {
    setEditUser(null);
    setFormError('');

    // Auto-populate for restricted creators
    const baseFormData = {
      prenom: '',
      nom: '',
      nom_complet: '',
      telephone: '',
      email: '',
      password: '',
      role: '',
      commune_id: '',
      centre_id: '',
      bureau_id: '',
      service_id: '',
      service_ids: [],
      region_ids: [],
      departement_ids: [],
      actif: true,
      activity_ids: []
    };

    if (currentUserLevelIndex >= hierarchy.indexOf('GERER_REGION')) {
      baseFormData.region_ids = fullCurrentUser.region_ids || [];
    }
    if (currentUserLevelIndex >= hierarchy.indexOf('GERER_DEPARTEMENT')) {
      baseFormData.departement_ids = fullCurrentUser.departement_ids || [];
    }
    if (currentUserLevelIndex >= hierarchy.indexOf('GERER_COMMUNE')) {
      baseFormData.commune_id = fullCurrentUser.commune_id || '';
    }
    if (currentUserLevelIndex >= hierarchy.indexOf('GERER_CENTRE')) {
      baseFormData.centre_id = fullCurrentUser.centre_id || '';
    }
    if (currentUserLevelIndex >= hierarchy.indexOf('GERER_BUREAU')) {
      baseFormData.bureau_id = fullCurrentUser.bureau_id || '';
    }
    if (currentUserLevelIndex >= hierarchy.indexOf('GERER_SERVICES')) {
      baseFormData.service_ids = fullCurrentUser.service_ids || [];
    }

    setFormData(baseFormData);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditUser(null);
    setSelectedRegion('');
    setSelectedDepartment('');
    setFormData({
      prenom: '',
      nom: '',
      nom_complet: '',
      telephone: '',
      email: '',
      password: '',
      role: '',
      commune_id: '',
      centre_id: '',
      service_id: '',
      service_ids: [],
      actif: true,
      activity_ids: []
    });
  };

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez, modifiez, désactivez ou créez les accès de l'administration territoriale.
          </p>
        </div>
        {getAllowedRolesToCreate().length > 0 && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouvel Utilisateur</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Users size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Utilisateurs</span>
            <span className="kpi-number">{totalElements}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <UserCheck size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Actifs (Page)</span>
            <span className="kpi-number">{users.filter(u => u.actif).length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-red">
          <div className="kpi-icon icon-red">
            <UserX size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Inactifs (Page)</span>
            <span className="kpi-number">{users.filter(u => !u.actif).length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-purple">
          <div className="kpi-icon icon-purple">
            <Shield size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Profils</span>
            <span className="kpi-number">{profils.length}</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} className="flex-space" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher par nom, téléphone, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div className="flex-gap" style={{ minWidth: '200px' }}>
            <select
              className="form-input form-select"
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
            >
              <option value="">Tous les Rôles</option>
              {profils.map(p => (
                <option key={p.id} value={p.nom}>{p.nom}</option>
              ))}
            </select>

            <button type="submit" className="btn btn-secondary">
              Filtrer
            </button>
          </div>
        </form>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun utilisateur trouvé correspondant aux critères.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nom Complet</th>
                  <th>Contact</th>
                  <th>Profil</th>
                  <th>Permissions</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{user.nom_complet}</div>
                    </td>
                    <td>
                      {(user.role || '').toLowerCase() === 'citoyen' ? (
                        <div style={{ fontWeight: 500 }}>{user.telephone}</div>
                      ) : (
                        <div>{user.email || <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{user.telephone}</span>}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${(user.role || '').toLowerCase().includes('admin') ? 'badge-danger' :
                          (user.role || '').toLowerCase().includes('directeur') ? 'badge-warning' :
                            (user.role || '').toLowerCase().includes('officier') ? 'badge-info' : 'badge-success'
                        }`}>
                        {user.role || 'Aucun'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(user.permissions || []).slice(0, 2).map((perm, idx) => (
                           <span key={idx} className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>{perm.replace('GERER_', '')}</span>
                        ))}
                        {(user.permissions || []).length > 2 && (
                           <span className="badge badge-secondary" style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}>+{(user.permissions.length - 2)}</span>
                        )}
                        {(!user.permissions || user.permissions.length === 0) && (
                           <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Aucune</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${user.actif ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}>
                        {user.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {/* Voir Plus Details */}
                        <button
                          onClick={() => setDetailsUser(user)}
                          className="btn btn-icon btn-sm btn-secondary"
                          title="Voir les détails complets"
                          style={{ padding: '0.35rem', color: '#3b82f6' }}
                        >
                          <Eye size={14} />
                        </button>
                        {/* Toggle Status (Active/Inactive) */}
                        {currentUser.id !== user.id && currentUserLevelIndex <= hierarchy.indexOf('GERER_COMMUNE') && (
                          <button
                            onClick={() => handleToggleStatus(user.id, user.actif)}
                            className={`btn btn-icon btn-sm ${user.actif ? 'btn-secondary' : 'btn-primary'}`}
                            title={user.actif ? 'Désactiver le compte' : 'Activer le compte'}
                            style={{ padding: '0.35rem' }}
                          >
                            {user.actif ? <UserX size={14} /> : <UserCheck size={14} />}
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => handleOpenPasswordModal(user)}
                          className="btn btn-icon btn-sm btn-secondary"
                          title="Réinitialiser le mot de passe"
                          style={{ padding: '0.35rem' }}
                        >
                          <Key size={14} />
                        </button>

                        {/* Edit Profile */}
                        {currentUserLevelIndex <= hierarchy.indexOf('GERER_COMMUNE') && (
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="btn btn-icon btn-sm btn-secondary"
                            title="Modifier le profil"
                            style={{ padding: '0.35rem' }}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {/* Delete Profile */}
                        {currentUser.id !== user.id && currentUserLevelIndex <= hierarchy.indexOf('GERER_COMMUNE') && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="btn btn-icon btn-sm btn-danger"
                            title="Supprimer définitivement"
                            style={{ padding: '0.35rem' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalItems={totalElements}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal de création / modification d'un utilisateur */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editUser ? `Modifier l'utilisateur : ${editUser.nom_complet}` : 'Créer un nouvel utilisateur'}
                {` (Debug: Bureaux loaded: ${bureaux.length}, Current user role: ${currentUser?.role})`}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveUser}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Prénom</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ex: Babacar"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ex: Ndiaye"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    placeholder="Ex: +221770000000"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Obligatoire)</label>
                  <input
                    type="email"
                    required
                    className="form-input"
                    placeholder="Ex: agent@anec.sn"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              {!editUser && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <Key size={18} style={{ color: '#10b981', marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: '#064e3b', fontSize: '0.9rem' }}>Création d'accès sécurisé</div>
                    <div style={{ color: '#065f46', fontSize: '0.8rem', marginTop: '4px' }}>Un mot de passe provisoire sera généré aléatoirement et envoyé directement à l'adresse e-mail de l'utilisateur. Lors de sa première connexion, il devra choisir un nouveau mot de passe.</div>
                  </div>
                </div>
              )}

              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: editUser ? 'span 2' : 'auto' }}>
                  <label className="form-label">Profil</label>
                  <select
                    required
                    className="form-input form-select"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    disabled={!!editUser} // Cannot change role of existing user to preserve audit log
                  >
                    <option value="">Sélectionner</option>
                    {!editUser ? (
                      getAllowedRolesToCreate().map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))
                    ) : (
                      <option value={formData.role}>{(formData.role || '').replace('_', ' ')}</option>
                    )}
                  </select>
                </div>
              </div>

              {/* Dynamic Location Selectors based on Role Permissions (For Super Admin) */}
              {(() => {
                if (!formData.role || !currentUserProfil) return null;
                const canAssignLocations = hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION') || hasPerm(currentUserProfil, 'GERER_DEPARTEMENT');

                const selectedProfilObj = profils.find(p => p.nom === formData.role);
                const roleHasPerm = (permName) => selectedProfilObj?.permissions?.some(p => p.nom === permName) || false;

                // Filter available locations based on current user's scope
                const availableRegions = hasPerm(currentUserProfil, 'GERER_GLOBAL')
                  ? regions
                  : regions.filter(r => (fullCurrentUser.region_ids || []).includes(r.id));

                const availableDepartements = hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION')
                  ? departements
                  : departements.filter(d => (fullCurrentUser.departement_ids || []).includes(d.id));

                return (
                  <div className="grid-2" style={{ gap: '1rem', marginTop: '1rem' }}>
                    {canAssignLocations && roleHasPerm('GERER_REGION') && (
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Régions Gérées</label>
                        <div style={{ background: 'rgba(15, 23, 42, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {availableRegions.map(region => {
                            const isChecked = (formData.region_ids || []).includes(region.id);
                            return (
                              <label key={region.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={isChecked} onChange={(e) => {
                                  let updated = [...(formData.region_ids || [])];
                                  if (e.target.checked) updated.push(region.id);
                                  else updated = updated.filter(id => id !== region.id);
                                  setFormData({ ...formData, region_ids: updated });
                                }} />
                                <span>{region.nom} ({region.code})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {canAssignLocations && roleHasPerm('GERER_DEPARTEMENT') && (
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        {/* Super Admin must pick a region first to filter departments */}
                        {hasPerm(currentUserProfil, 'GERER_GLOBAL') && (
                          <div className="form-group" style={{ marginBottom: '1rem' }}>
                            <label className="form-label">Région (pour filtrer les départements)</label>
                            <select className="form-input form-select" value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setFormData({ ...formData, departement_ids: [] }); }}>
                              <option value="">Toutes les régions</option>
                              {availableRegions.map(region => <option key={region.id} value={region.id}>{region.nom} ({region.code})</option>)}
                            </select>
                          </div>
                        )}
                        <label className="form-label">Départements Gérés</label>
                        <div style={{ background: 'rgba(15, 23, 42, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(hasPerm(currentUserProfil, 'GERER_GLOBAL') && selectedRegion
                            ? departements.filter(d => d.region_id === parseInt(selectedRegion))
                            : hasPerm(currentUserProfil, 'GERER_GLOBAL') && !selectedRegion
                              ? departements
                              : availableDepartements
                          ).map(dept => {
                            const isChecked = (formData.departement_ids || []).includes(dept.id);
                            return (
                              <label key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                <input type="checkbox" checked={isChecked} onChange={(e) => {
                                  let updated = [...(formData.departement_ids || [])];
                                  if (e.target.checked) updated.push(dept.id);
                                  else updated = updated.filter(id => id !== dept.id);
                                  setFormData({ ...formData, departement_ids: updated });
                                }} />
                                <span>{dept.nom} ({dept.code})</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}


                    {/* Bloc géographique : affiché dès que le rôle créé a besoin d'une commune (ou plus précis) */}
                    {(roleHasPerm('GERER_COMMUNE') || roleHasPerm('GERER_CENTRE') || roleHasPerm('GERER_BUREAU') || roleHasPerm('GERER_SERVICES') || roleHasPerm('GERER_ACTIVITES') || roleHasPerm('GERER_ARCHIVE')) && currentUserLevelIndex < hierarchy.indexOf('GERER_SERVICES') && (
                      <>
                        {/* Région – visible si l'opérateur connecté est au moins REGION */}
                        {(hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION') || currentUserProfil?.nom === 'Super Admin') && (
                          <div className="form-group">
                            <label className="form-label">Région d'affectation</label>
                            <select required className="form-input form-select" value={selectedRegion} onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDepartment(''); setFormData({ ...formData, commune_id: '', bureau_id: '' }); }}>
                              <option value="">Sélectionner</option>
                              {availableRegions.map(region => <option key={region.id} value={region.id}>{region.nom} ({region.code})</option>)}
                            </select>
                          </div>
                        )}

                        {/* Département – visible si l'opérateur est au moins DEPARTEMENT et qu'une région est choisie (ou cachée) */}
                        {(hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION') || hasPerm(currentUserProfil, 'GERER_DEPARTEMENT') || currentUserProfil?.nom === 'Super Admin') &&
                          (!hasPerm(currentUserProfil, 'GERER_GLOBAL') && !hasPerm(currentUserProfil, 'GERER_REGION') && currentUserProfil?.nom !== 'Super Admin' || selectedRegion) && (
                            <div className="form-group">
                              <label className="form-label">Département d'affectation</label>
                              <select required className="form-input form-select" value={selectedDepartment} onChange={(e) => { setSelectedDepartment(e.target.value); setFormData({ ...formData, commune_id: '', bureau_id: '' }); }}>
                                <option value="">Sélectionner</option>
                                {(!hasPerm(currentUserProfil, 'GERER_GLOBAL') && !hasPerm(currentUserProfil, 'GERER_REGION') && currentUserProfil?.nom !== 'Super Admin' ? availableDepartements : filteredDepartments).map(dept => <option key={dept.id} value={dept.id}>{dept.nom} ({dept.code})</option>)}
                              </select>
                            </div>
                          )}

                        {/* Commune – visible si l'opérateur est au moins COMMUNE et qu'un département est choisi (ou caché) */}
                        {(hasPerm(currentUserProfil, 'GERER_GLOBAL') || hasPerm(currentUserProfil, 'GERER_REGION') || hasPerm(currentUserProfil, 'GERER_DEPARTEMENT') || hasPerm(currentUserProfil, 'GERER_COMMUNE') || currentUserProfil?.nom === 'Super Admin') &&
                          (!hasPerm(currentUserProfil, 'GERER_GLOBAL') && !hasPerm(currentUserProfil, 'GERER_REGION') && !hasPerm(currentUserProfil, 'GERER_DEPARTEMENT') && currentUserProfil?.nom !== 'Super Admin' || selectedDepartment) && (
                            <div className="form-group">
                              <label className="form-label">Commune d'affectation</label>
                              <select required className="form-input form-select" value={formData.commune_id} onChange={(e) => setFormData({ ...formData, commune_id: e.target.value, bureau_id: '' })} disabled={currentUserLevelIndex >= hierarchy.indexOf('GERER_COMMUNE')}>
                                <option value="">Sélectionner</option>
                                {filteredCommunes.map(commune => <option key={commune.id} value={commune.id}>{commune.nom} ({commune.code})</option>)}
                              </select>
                            </div>
                          )}

                        {/* Centre - visible si le rôle gère un centre, bureau ou des services */}
                        {(roleHasPerm('GERER_CENTRE') || roleHasPerm('GERER_BUREAU') || roleHasPerm('GERER_SERVICES') || roleHasPerm('GERER_ACTIVITES') || roleHasPerm('GERER_ARCHIVE')) && currentUserLevelIndex < hierarchy.indexOf('GERER_CENTRE') && (
                          <div className="form-group">
                            <label className="form-label">Centre d'affectation</label>
                            <select required className="form-input form-select" value={formData.centre_id} onChange={(e) => setFormData({ ...formData, centre_id: e.target.value, bureau_id: '', service_ids: [], service_id: '', activity_ids: [] })} disabled={!formData.commune_id}>
                              <option value="">{formData.commune_id ? 'Sélectionner' : 'Sélectionnez une commune'}</option>
                              {filteredCentres.map(centre => <option key={centre.id} value={centre.id}>{centre.nom} ({centre.code})</option>)}
                            </select>
                          </div>
                        )}

                        {/* Bureau – uniquement si le rôle créé gère un bureau, service ou activité */}
                        {(roleHasPerm('GERER_BUREAU') || roleHasPerm('GERER_SERVICES') || roleHasPerm('GERER_ACTIVITES')) && currentUserLevelIndex < hierarchy.indexOf('GERER_BUREAU') && (
                          <div className="form-group">
                            <label className="form-label">Bureau d'affectation</label>
                            <select required className="form-input form-select" value={formData.bureau_id} onChange={(e) => setFormData({ ...formData, bureau_id: e.target.value, service_ids: [], service_id: '', activity_ids: [] })} disabled={!centreConfig || !formData.centre_id}>
                              <option value="">{centreConfig ? 'Sélectionner' : 'Sélectionnez un centre'}</option>
                              {(centreConfig || []).filter(b => b.actif).map(bureau => <option key={bureau.bureau_id} value={bureau.bureau_id}>{bureau.bureau_nom} ({bureau.bureau_code})</option>)}
                            </select>
                          </div>
                        )}

                        {/* Service(s) – uniquement si le rôle créé gère des services, et qu'un bureau est sélectionné */}
                        {(roleHasPerm('GERER_SERVICES') || roleHasPerm('GERER_ACTIVITES')) && formData.bureau_id && filteredServices.length > 0 && (
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label className="form-label">Service(s) d'affectation</label>
                            <div style={{ background: 'rgba(15, 23, 42, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {filteredServices.map(s => {
                                const isChecked = (formData.service_ids || []).includes(s.service_id);
                                return (
                                  <label key={s.service_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={isChecked} onChange={(e) => {
                                      let updated = [...(formData.service_ids || [])];
                                      if (e.target.checked) updated.push(s.service_id);
                                      else updated = updated.filter(id => id !== s.service_id);
                                      setFormData({ ...formData, service_ids: updated });
                                    }} />
                                    <span>{s.service_nom}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Activités – uniquement si le rôle créé gère des activités, et qu'un service est sélectionné */}
                        {roleHasPerm('GERER_ACTIVITES') && ((formData.service_ids && formData.service_ids.length > 0) || formData.service_id) && (
                          <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <div className="flex-space mb-2">
                              <label className="form-label" style={{ margin: 0 }}>Activités affectées (une ou plusieurs)</label>
                              {filteredOfficerActivities.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button type="button" onClick={() => setFormData({ ...formData, activity_ids: filteredOfficerActivities.map(a => (a.activite_id || a.id)) })} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Tout cocher</button>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>|</span>
                                  <button type="button" onClick={() => setFormData({ ...formData, activity_ids: [] })} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', cursor: 'pointer', padding: 0 }}>Tout décocher</button>
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'rgba(15, 23, 42, 0.05)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem 1rem', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                              {filteredOfficerActivities.map(activity => {
                                const isChecked = (formData.activity_ids || []).includes((activity.activite_id || activity.id));
                                return (
                                  <label key={(activity.activite_id || activity.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input type="checkbox" checked={isChecked} style={{ accentColor: 'var(--primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                                      onChange={(e) => {
                                        let updatedIds = [...(formData.activity_ids || [])];
                                        if (e.target.checked) updatedIds.push((activity.activite_id || activity.id));
                                        else updatedIds = updatedIds.filter(id => id !== (activity.activite_id || activity.id));
                                        setFormData({ ...formData, activity_ids: updatedIds });
                                      }}
                                    />
                                    <span>{(activity.activite_nom || activity.nom)}</span>
                                  </label>
                                );
                              })}
                              {filteredOfficerActivities.length === 0 && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucune activité trouvée pour votre service.</span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal} disabled={formLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <div className="loading-spinner"></div> : <UserPlus size={18} />}
                  <span>{editUser ? 'Modifier le Compte' : 'Créer le Compte'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de modification de mot de passe */}
      {isPasswordModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">Modifier le mot de passe</h3>
              <button className="modal-close" onClick={() => setIsPasswordModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Définir un nouveau mot de passe pour <strong>{passwordUserName}</strong>.
            </p>

            {passError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: 'var(--danger)',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}>
                {passError}
              </div>
            )}

            <form onSubmit={handleResetPassword}>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Nouveau mot de passe</label>
                <input
                  type="password"
                  required
                  className="form-input"
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsPasswordModalOpen(false)} disabled={passLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={passLoading}>
                  {passLoading ? <div className="loading-spinner"></div> : null}
                  <span>Mettre à jour</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Voir Plus (Détails de l'utilisateur) */}
      {detailsUser && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Détails de l'utilisateur</h3>
              <button className="modal-close" onClick={() => setDetailsUser(null)}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1rem 0' }}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {detailsUser.nom_complet.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>{detailsUser.nom_complet}</h4>
                  <span className={`badge ${(detailsUser.role || '').toLowerCase().includes('admin') ? 'badge-danger' : 'badge-success'}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                    {detailsUser.role || 'Aucun'}
                  </span>
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase' }}>Coordonnées</h5>
                <p style={{ margin: '0 0 0.25rem 0' }}><strong>Téléphone :</strong> {detailsUser.telephone}</p>
                {detailsUser.email && <p style={{ margin: 0 }}><strong>Email :</strong> {detailsUser.email}</p>}
              </div>

              <div style={{ backgroundColor: '#faf5ff', padding: '1rem', borderRadius: '8px', border: '1px solid #e9d5ff', marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#7e22ce', fontSize: '0.8rem', textTransform: 'uppercase' }}>Informations Système</h5>
                <p style={{ margin: '0 0 0.25rem 0' }}><strong>Statut :</strong> <span style={{ color: detailsUser.actif ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{detailsUser.actif ? 'Actif' : 'Inactif'}</span></p>
                <p style={{ margin: '0 0 0.25rem 0' }}><strong>Date de création :</strong> {new Date(detailsUser.created_at).toLocaleString()}</p>
                <p style={{ margin: 0 }}><strong>Dernière connexion :</strong> {detailsUser.last_login ? new Date(detailsUser.last_login).toLocaleString() : 'Jamais'}</p>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                <h5 style={{ margin: '0 0 0.5rem 0', color: '#166534', fontSize: '0.8rem', textTransform: 'uppercase' }}>Affectation</h5>
                {detailsUser.commune_nom ? <p style={{ margin: '0 0 0.25rem 0' }}><strong>Commune :</strong> {detailsUser.commune_nom}</p> : <p style={{ margin: '0 0 0.25rem 0' }}><strong>National (ANEC)</strong></p>}
                {detailsUser.centre_nom && <p style={{ margin: '0 0 0.25rem 0' }}><strong>Centre :</strong> {detailsUser.centre_nom}</p>}
                {detailsUser.bureau_nom && <p style={{ margin: '0 0 0.25rem 0' }}><strong>Bureau :</strong> {detailsUser.bureau_nom}</p>}
                {detailsUser.service_nom && <p style={{ margin: 0 }}><strong>Service :</strong> {detailsUser.service_nom}</p>}
              </div>

              {detailsUser.activities && detailsUser.activities.length > 0 && (
                <div style={{ backgroundColor: '#eff6ff', padding: '1rem', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <h5 style={{ margin: '0 0 0.5rem 0', color: '#1e40af', fontSize: '0.8rem', textTransform: 'uppercase' }}>Activités Autorisées ({detailsUser.activities.length})</h5>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: '#334155' }}>
                    {detailsUser.activities.map((a, i) => (
                      <li key={i} style={{ marginBottom: '0.25rem' }}>{a.nom}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setDetailsUser(null)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
