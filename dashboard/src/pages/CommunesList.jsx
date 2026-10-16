import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, Landmark, Edit2, Trash2, Globe, Map } from 'lucide-react';

export default function CommunesList({ token, currentUser }) {
  const [communes, setCommunes] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search and Filters

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterDepartement, setFilterDepartement] = useState('');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCommune, setEditCommune] = useState(null); // Not null means edit mode
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Cascading states in modal
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [formData, setFormData] = useState({ nom: '', code: '' });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Communes
      const comResponse = await fetch(`${API_BASE_URL}/divisions/communes?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const comData = await comResponse.json();
      if (!comResponse.ok) throw new Error(comData.message || 'Erreur communes.');
      console.log('Frontend Communes loaded:', comData.data.communes);
      setCommunes(comData.data.communes || []);

      // Fetch Departements
      const deptResponse = await fetch(`${API_BASE_URL}/divisions/departements?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const deptData = await deptResponse.json();
      if (deptResponse.ok) setDepartements(deptData.data.departements || []);

      // Fetch Regions
      const regResponse = await fetch(`${API_BASE_URL}/divisions/regions?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const regData = await regResponse.json();
      if (regResponse.ok) setRegions(regData.data.regions || []);

    } catch (err) {
      setError(err.message);
    } finally {
      fetchDataCompleted();
    }
  };

  const fetchDataCompleted = () => {
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditCommune(null);
    setSelectedRegion('');
    setSelectedDepartment('');
    setFormData({ nom: '', code: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (commune) => {
    setEditCommune(commune);
    setSelectedRegion(commune.region_id ? commune.region_id.toString() : '');
    setSelectedDepartment(commune.departement_id.toString());
    setFormData({ nom: commune.nom, code: commune.code });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveCommune = async (e) => {
    e.preventDefault();
    if (!selectedDepartment) {
      setFormError('Veuillez sélectionner un département.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    try {
      const url = editCommune
        ? `${API_BASE_URL}/divisions/communes/${editCommune.id}`
        : `${API_BASE_URL}/divisions/communes`;
      const method = editCommune ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          departement_id: parseInt(selectedDepartment),
          nom: formData.nom,
          code: formData.code
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur de sauvegarde.');

      setIsModalOpen(false);
      setSelectedRegion('');
      setSelectedDepartment('');
      setFormData({ nom: '', code: '' });
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCommune = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette commune ? Tous les centres d\'état civil et utilisateurs associés seront également affectés.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/divisions/communes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur de suppression.');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  // Local filtering
  const filteredCommunes = communes.filter(c => {
    const matchesSearch = c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());

    const matchesRegion = filterRegion ? c.region_nom === regions.find(r => r.id === parseInt(filterRegion))?.nom : true;
    const matchesDept = filterDepartement ? c.departement_id === parseInt(filterDepartement) : true;

    return matchesSearch && matchesRegion && matchesDept;
  });

  // Modal cascading lists
  const modalDepartments = departements.filter(d => d.region_id === parseInt(selectedRegion));

  const totalCommunes = communes.length;
  const uniqueDeptCount = new Set(communes.map(c => c.departement_id).filter(Boolean)).size;
  const uniqueRegionCount = new Set(communes.map(c => c.region_nom).filter(Boolean)).size;
  const filteredCount = filteredCommunes.length;

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez, modifiez ou créez les communes sous la juridiction des départements.
          </p>
        </div>
        {currentUser?.permissions?.includes('GERER_GLOBAL') && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouvelle Commune</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Landmark size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Communes</span>
            <span className="kpi-number">{totalCommunes}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <Map size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Départements</span>
            <span className="kpi-number">{uniqueDeptCount}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-blue">
          <div className="kpi-icon icon-blue">
            <Globe size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Régions</span>
            <span className="kpi-number">{uniqueRegionCount}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Search size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Filtrées</span>
            <span className="kpi-number">{filteredCount}</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div className="flex-space" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flexGrow: 1, minWidth: '250px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Rechercher par commune ou code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div className="flex-gap">
            <select
              className="form-input form-select"
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                setFilterDepartement('');
              }}
              style={{ width: '180px' }}
            >
              <option value="">Région : Toutes</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.nom}</option>
              ))}
            </select>

            <select
              className="form-input form-select"
              value={filterDepartement}
              onChange={(e) => setFilterDepartement(e.target.value)}
              disabled={!filterRegion}
              style={{ width: '200px' }}
            >
              <option value="">Département : Tous</option>
              {departements
                .filter(d => d.region_id === parseInt(filterRegion))
                .map(d => (
                  <option key={d.id} value={d.id}>{d.nom}</option>
                ))
              }
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Communes */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredCommunes.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucune commune trouvée.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>N°</th>
                  <th>Nom de la Commune</th>
                  <th>Département</th>
                  <th>Région</th>
                  <th>Code Commune</th>
                  {currentUser?.permissions?.includes('GERER_GLOBAL') && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCommunes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((commune, index) => (
                  <tr key={commune.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Landmark size={16} style={{ color: 'var(--text-muted)' }} />
                        <span>{commune.nom}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{commune.departement_nom}</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{commune.region_nom}</span>
                    </td>
                    <td>
                      <span className="badge badge-warning">{commune.code}</span>
                    </td>
                    {currentUser?.permissions?.includes('GERER_GLOBAL') && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(commune)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteCommune(commune.id)}
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
              totalItems={filteredCommunes.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal Création/Modification Commune */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editCommune ? 'Modifier la commune' : 'Créer une nouvelle commune'}
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

            <form onSubmit={handleSaveCommune}>
              <div className="form-group">
                <label className="form-label">Région</label>
                <select
                  required
                  className="form-input form-select"
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedDepartment('');
                  }}
                >
                  <option value="">Sélectionner la région</option>
                  {regions.map(r => (
                    <option key={r.id} value={r.id}>{r.nom} ({r.code})</option>
                  ))}
                </select>
              </div>

              {selectedRegion && (
                <div className="form-group">
                  <label className="form-label">Département de rattachement</label>
                  <select
                    required
                    className="form-input form-select"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    <option value="">Sélectionner le département</option>
                    {modalDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.nom} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nom de la Commune</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Grand Yoff, Médina, Fann..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Code Commune (Unique)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: DK-DK-GY, DK-DK-MD..."
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
                  <span>{editCommune ? 'Enregistrer' : 'Créer la Commune'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
