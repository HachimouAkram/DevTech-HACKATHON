import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, Map, Edit2, Trash2, Globe } from 'lucide-react';

export default function DepartementsList({ token, currentUser }) {
  const [departements, setDepartements] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and Filter
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editDepartement, setEditDepartement] = useState(null); // Not null means edit mode
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ region_id: '', nom: '', code: '' });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Departements
      const deptResponse = await fetch(`${API_BASE_URL}/divisions/departements?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const deptData = await deptResponse.json();
      if (!deptResponse.ok) throw new Error(deptData.message || 'Erreur départements.');
      let loadedDepts = deptData.data.departements || [];
      if (currentUser?.permissions?.includes('GERER_REGION') && currentUser.region_ids?.length > 0) {
        loadedDepts = loadedDepts.filter(d => currentUser.region_ids.includes(d.region_id));
      }
      setDepartements(loadedDepts);

      // Fetch Regions for dropdowns
      const regResponse = await fetch(`${API_BASE_URL}/divisions/regions?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const regData = await regResponse.json();
      if (regResponse.ok) {
        let loadedRegions = regData.data.regions || [];
        if (currentUser?.permissions?.includes('GERER_REGION') && currentUser.region_ids?.length > 0) {
          loadedRegions = loadedRegions.filter(r => currentUser.region_ids.includes(r.id));
        }
        setRegions(loadedRegions);
      }
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
    setEditDepartement(null);
    setFormData({ region_id: regions.length === 1 ? regions[0].id.toString() : '', nom: '', code: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (dept) => {
    setEditDepartement(dept);
    setFormData({ region_id: dept.region_id.toString(), nom: dept.nom, code: dept.code });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveDepartement = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const url = editDepartement 
        ? `${API_BASE_URL}/divisions/departements/${editDepartement.id}`
        : `${API_BASE_URL}/divisions/departements`;
      const method = editDepartement ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          region_id: parseInt(formData.region_id),
          nom: formData.nom,
          code: formData.code
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la sauvegarde.');

      setIsModalOpen(false);
      setFormData({ region_id: '', nom: '', code: '' });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteDepartement = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce département ? Toutes les communes associées seront également supprimées.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/divisions/departements/${id}`, {
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

  // Filter local data
  const filteredDepartements = departements.filter(d => {
    const matchesSearch = d.nom.toLowerCase().includes(search.toLowerCase()) || 
                          d.code.toLowerCase().includes(search.toLowerCase());
    const matchesRegion = filterRegion ? d.region_id === parseInt(filterRegion) : true;
    return matchesSearch && matchesRegion;
  });

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez, modifiez ou créez les départements rattachés aux régions du Sénégal.
          </p>
        </div>
        {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouveau Département</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <Map size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Départements</span>
            <span className="kpi-number">{departements.length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-blue">
          <div className="kpi-icon icon-blue">
            <Globe size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Régions</span>
            <span className="kpi-number">{new Set(departements.map(d => d.region_id).filter(Boolean)).size}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Search size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Filtrés</span>
            <span className="kpi-number">{filteredDepartements.length}</span>
          </div>
        </div>
      </div>

      {/* Recherche et Filtres */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div className="flex-space" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
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

          <div style={{ minWidth: '200px' }}>
            <select
              className="form-input form-select"
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value)}
            >
              <option value="">Toutes les Régions</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Départements */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredDepartements.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun département trouvé.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>N°</th>
                  <th>Nom du Département</th>
                  <th>Région de Rattachement</th>
                  <th>Code Département</th>
                  {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredDepartements.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((dept, index) => (
                  <tr key={dept.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Map size={16} style={{ color: 'var(--text-muted)' }} />
                        <span>{dept.nom}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-success">{dept.region_nom}</span>
                    </td>
                    <td>
                      <span className="badge badge-info">{dept.code}</span>
                    </td>
                    {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(dept)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteDepartement(dept.id)}
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
              totalItems={filteredDepartements.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {/* Modal Création/Modification Département */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editDepartement ? 'Modifier le département' : 'Créer un nouveau département'}
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

            <form onSubmit={handleSaveDepartement}>
              <div className="form-group">
                <label className="form-label">Région de Rattachement</label>
                <select
                  required
                  className="form-input form-select"
                  value={formData.region_id}
                  onChange={(e) => setFormData({ ...formData, region_id: e.target.value })}
                >
                  <option value="">Sélectionner la région</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.nom} ({r.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Nom du Département</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Dakar, Rufisque, Mbour..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Code Département (Unique)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: DK-DK, DK-RF, TH-MB..."
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
                  <span>{editDepartement ? 'Enregistrer' : 'Créer le Département'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
