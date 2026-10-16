import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, Shield, Edit2, Trash2 } from 'lucide-react';

export default function ProfilsList({ token, currentUser }) {
  const [profils, setProfils] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProfil, setEditProfil] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    permissionIds: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profilsRes, permsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/profils`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_BASE_URL}/permissions`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const profilsData = await profilsRes.json();
      const permsData = await permsRes.json();
      
      if (!profilsRes.ok) throw new Error(profilsData.message);
      if (!permsRes.ok) throw new Error(permsData.message);
      
      setProfils(profilsData.data.profils || []);
      setPermissions(permsData.data.permissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditProfil(null);
    setFormData({ nom: '', description: '', permissionIds: [] });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (profil) => {
    setEditProfil(profil);
    setFormData({
      nom: profil.nom,
      description: profil.description || '',
      permissionIds: profil.permissions.map(p => p.id)
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveProfil = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const url = editProfil 
        ? `${API_BASE_URL}/profils/${editProfil.id}`
        : `${API_BASE_URL}/profils`;
      const method = editProfil ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la sauvegarde.');

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProfil = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce profil ?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/profils/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suppression.');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleTogglePermission = (permId) => {
    setFormData(prev => {
      const isSelected = prev.permissionIds.includes(permId);
      if (isSelected) {
        return { ...prev, permissionIds: prev.permissionIds.filter(id => id !== permId) };
      } else {
        return { ...prev, permissionIds: [...prev.permissionIds, permId] };
      }
    });
  };

  const filteredProfils = profils.filter(p => 
    p.nom.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Créez des rôles sur mesure et assignez-leur des droits spécifiques.
          </p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} />
          <span>Nouveau Profil</span>
        </button>
      </div>

      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredProfils.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun profil trouvé.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nom du Profil</th>
                  <th>Description</th>
                  <th>Permissions Accompagnées</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfils.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((profil) => (
                  <tr key={profil.id}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Shield size={16} style={{ color: 'var(--primary)' }} />
                        <span>{profil.nom}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        {profil.description || '-'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {profil.permissions.map(p => (
                          <span key={p.id} className="badge badge-info" style={{ fontSize: '0.75rem' }}>
                            {p.nom.replace('GERER_', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {profil.nom !== 'Citoyen' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(profil)}
                          >
                            <Edit2 size={14} />
                          </button>
                          {profil.nom !== 'Super Admin' && (
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                              onClick={() => handleDeleteProfil(profil.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination 
              currentPage={currentPage} 
              totalItems={filteredProfils.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editProfil ? 'Modifier le Profil' : 'Créer un Profil'}
              </h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
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

            <form onSubmit={handleSaveProfil}>
              <div className="form-group">
                <label className="form-label">Nom du Profil</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  disabled={editProfil && (editProfil.nom === 'Super Admin' || editProfil.nom === 'Citoyen')}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows="2"
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Niveau d'Accès (Hiérarchie)</label>
                <select
                  required
                  className="form-input form-select"
                  value={formData.permissionIds.length > 0 ? formData.permissionIds[0] : ''}
                  onChange={(e) => setFormData({ ...formData, permissionIds: [parseInt(e.target.value)] })}
                >
                  <option value="">Sélectionner un niveau d'accès...</option>
                  {permissions.map(perm => (
                    <option key={perm.id} value={perm.id}>
                      {perm.nom.replace('GERER_', 'Niveau ')}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <div className="loading-spinner"></div> : null}
                  <span>{editProfil ? 'Enregistrer' : 'Créer'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
