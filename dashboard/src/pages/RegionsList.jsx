import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, Globe, Edit2, Trash2 } from 'lucide-react';

export default function RegionsList({ token, currentUser }) {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search state
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [search, setSearch] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editRegion, setEditRegion] = useState(null); // Not null means edit mode
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ nom: '', code: '' });

  const fetchRegions = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/divisions/regions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur de chargement.');
      setRegions(data.data.regions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  const handleOpenCreateModal = () => {
    setEditRegion(null);
    setFormData({ nom: '', code: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (region) => {
    setEditRegion(region);
    setFormData({ nom: region.nom, code: region.code });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveRegion = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const url = editRegion 
        ? `${API_BASE_URL}/divisions/regions/${editRegion.id}`
        : `${API_BASE_URL}/divisions/regions`;
      const method = editRegion ? 'PUT' : 'POST';

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
      setFormData({ nom: '', code: '' });
      fetchRegions();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteRegion = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette région ? Tous les départements et communes associés seront également supprimés.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/divisions/regions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suppression.');
      fetchRegions();
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter local search
  const filteredRegions = regions.filter(r => 
    r.nom.toLowerCase().includes(search.toLowerCase()) || 
    r.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez, modifiez ou créez les régions administratives du territoire national.
          </p>
        </div>
        {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouvelle Région</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-blue">
          <div className="kpi-icon icon-blue">
            <Globe size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Régions</span>
            <span className="kpi-number">{regions.length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <Globe size={24} style={{ opacity: 0.8 }} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Codes ISO</span>
            <span className="kpi-number">{new Set(regions.map(r => r.code).filter(Boolean)).size}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Search size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Filtrées</span>
            <span className="kpi-number">{filteredRegions.length}</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher par nom ou code..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Tableau des Régions */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredRegions.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucune région trouvée.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>N°</th>
                  <th>Nom de la Région</th>
                  <th>Code ISO / Territorial</th>
                  {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredRegions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((region, index) => (
                  <tr key={region.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Globe size={16} style={{ color: 'var(--text-muted)' }} />
                        <span>{region.nom}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{region.code}</span>
                    </td>
                    {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(region)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteRegion(region.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination 
              currentPage={currentPage} 
              totalItems={filteredRegions.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {/* Modal Création/Modification Région */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editRegion ? 'Modifier la région' : 'Créer une nouvelle région'}
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

            <form onSubmit={handleSaveRegion}>
              <div className="form-group">
                <label className="form-label">Nom de la Région</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Dakar, Thiès, Diourbel..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Code Région (Unique)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: DK, TH, DB..."
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <div className="loading-spinner"></div> : null}
                  <span>{editRegion ? 'Enregistrer' : 'Créer la Région'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
