import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, Building, Edit2, Trash2, Settings, Globe, Map, Landmark } from 'lucide-react';
import CentreConfiguration from './CentreConfiguration';

export default function CentresList({ token, currentUser }) {
  const [centres, setCentres] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [configuringCentre, setConfiguringCentre] = useState(null);

  // Search and Filters
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [search, setSearch] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterDepartement, setFilterDepartement] = useState('');
  const [filterCommune, setFilterCommune] = useState('');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editCentre, setEditCentre] = useState(null); // If not null, we are editing
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Cascading states in modal
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [formData, setFormData] = useState({ nom: '', code: '' });

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch Centres
      const centresRes = await fetch(`${API_BASE_URL}/divisions/centres?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const centresData = await centresRes.json();
      if (!centresRes.ok) throw new Error(centresData.message || 'Erreur centres.');
      setCentres(centresData.data.centres || []);

      // Fetch Metadata (regions, departements, communes)
      const metaRes = await fetch(`${API_BASE_URL}/users/metadata?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error(metaData.message || 'Erreur métadonnées.');
      
      let loadedDepts = metaData.data.departements || [];
      let loadedRegions = metaData.data.regions || [];
      let loadedCommunes = metaData.data.communes || [];

      if (currentUser?.permissions?.includes('GERER_COMMUNE') && currentUser.commune_id) {
        loadedCommunes = loadedCommunes.filter(c => c.id === currentUser.commune_id);
        loadedDepts = loadedDepts.filter(d => loadedCommunes.map(c => c.departement_id).includes(d.id));
        loadedRegions = loadedRegions.filter(r => loadedDepts.map(d => d.region_id).includes(r.id));
      } else if (currentUser?.permissions?.includes('GERER_DEPARTEMENT') && currentUser.departement_ids?.length > 0) {
        loadedDepts = loadedDepts.filter(d => currentUser.departement_ids.includes(d.id));
        loadedRegions = loadedRegions.filter(r => loadedDepts.map(d => d.region_id).includes(r.id));
        loadedCommunes = loadedCommunes.filter(c => currentUser.departement_ids.includes(c.departement_id));
      } else if (currentUser?.permissions?.includes('GERER_REGION') && currentUser.region_ids?.length > 0) {
        loadedDepts = loadedDepts.filter(d => currentUser.region_ids.includes(d.region_id));
        loadedRegions = loadedRegions.filter(r => currentUser.region_ids.includes(r.id));
        loadedCommunes = loadedCommunes.filter(c => loadedDepts.map(d => d.id).includes(c.departement_id));
      }

      setRegions(loadedRegions);
      setDepartements(loadedDepts);
      setCommunes(loadedCommunes);

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
    setEditCentre(null);
    setSelectedRegion(regions.length === 1 ? regions[0].id.toString() : '');
    setSelectedDepartment(departements.length === 1 ? departements[0].id.toString() : '');
    setSelectedCommune(communes.length === 1 ? communes[0].id.toString() : '');
    setFormData({ nom: '', code: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (centre) => {
    setEditCentre(centre);
    setSelectedRegion(centre.region_id ? centre.region_id.toString() : '');
    setSelectedDepartment(centre.departement_id.toString());
    setSelectedCommune(centre.commune_id.toString());
    setFormData({ nom: centre.nom, code: centre.code });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveCentre = async (e) => {
    e.preventDefault();
    if (!selectedCommune) {
      setFormError('Veuillez sélectionner une commune.');
      return;
    }

    setFormLoading(true);
    setFormError('');
    try {
      const url = editCentre 
        ? `${API_BASE_URL}/divisions/centres/${editCentre.id}`
        : `${API_BASE_URL}/divisions/centres`;
      const method = editCentre ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          commune_id: selectedCommune,
          nom: formData.nom,
          code: formData.code
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur de sauvegarde.');

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCentre = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce centre ?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/divisions/centres/${id}`, {
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
  const filteredCentres = centres.filter(c => {
    const matchesSearch = c.nom.toLowerCase().includes(search.toLowerCase()) || 
                          c.code.toLowerCase().includes(search.toLowerCase());
    
    const matchesRegion = filterRegion ? c.region_id === parseInt(filterRegion) : true;
    const matchesDept = filterDepartement ? c.departement_id === parseInt(filterDepartement) : true;
    const matchesCommune = filterCommune ? c.commune_id === parseInt(filterCommune) : true;

    return matchesSearch && matchesRegion && matchesDept && matchesCommune;
  });

  // Modal cascading lists
  const modalDepartments = departements.filter(d => d.region_id === parseInt(selectedRegion));
  const modalCommunes = communes.filter(c => c.departement_id === parseInt(selectedDepartment));

  if (configuringCentre) {
    return <CentreConfiguration 
      centreId={configuringCentre.id} 
      centreNom={configuringCentre.nom} 
      communeNom={configuringCentre.commune_nom}
      onBack={() => setConfiguringCentre(null)} 
      token={token} 
      currentUser={currentUser} 
    />;
  }

  const totalCentres = centres.length;
  const uniqueCommunes = new Set(centres.map(c => c.commune_id).filter(Boolean)).size;
  const uniqueDeptCount = new Set(centres.map(c => c.departement_id).filter(Boolean)).size;
  const filteredCount = filteredCentres.length;

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez, modifiez ou créez les centres d'administration territoriale rattachés aux communes sénégalaises.
          </p>
        </div>
        {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouveau Centre</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-purple">
          <div className="kpi-icon icon-purple">
            <Building size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Centres</span>
            <span className="kpi-number">{totalCentres}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Landmark size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Communes</span>
            <span className="kpi-number">{uniqueCommunes}</span>
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
            <Search size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Filtrés</span>
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
              placeholder="Rechercher par centre ou code..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              style={{ paddingLeft: '2.5rem' }}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
            <select
              className="form-input form-select"
              value={filterRegion}
              onChange={(e) => {
                setFilterRegion(e.target.value);
                setFilterDepartement('');
                setFilterCommune('');
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
              onChange={(e) => {
                setFilterDepartement(e.target.value);
                setFilterCommune('');
              }}
              disabled={!filterRegion}
              style={{ width: '180px' }}
            >
              <option value="">Département : Tous</option>
              {departements
                .filter(d => d.region_id === parseInt(filterRegion))
                .map(d => (
                  <option key={d.id} value={d.id}>{d.nom}</option>
                ))
              }
            </select>

            <select
              className="form-input form-select"
              value={filterCommune}
              onChange={(e) => setFilterCommune(e.target.value)}
              disabled={!filterDepartement}
              style={{ width: '180px' }}
            >
              <option value="">Commune : Toutes</option>
              {communes
                .filter(c => c.departement_id === parseInt(filterDepartement))
                .map(c => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))
              }
            </select>
          </div>
        </div>
      </div>

      {/* Tableau des Centres */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredCentres.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun centre d'administration territoriale trouvé.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>N°</th>
                  <th>Nom du Centre</th>
                  <th>Commune</th>
                  <th>Département</th>
                  <th>Région</th>
                  <th>Code Centre</th>
                  {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCentres.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((centre, index) => (
                  <tr key={centre.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building size={16} style={{ color: 'var(--text-muted)' }} />
                        <span>{centre.nom}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{centre.commune_nom}</span>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{centre.departement_nom}</span>
                    </td>
                    <td>
                      <span className="badge badge-success">{centre.region_nom}</span>
                    </td>
                    <td>
                      <span className="badge badge-warning">{centre.code}</span>
                    </td>
                    {(currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') !== '' && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {(currentUser?.permissions?.some(p => ['GERER_GLOBAL','GERER_REGION','GERER_DEPARTEMENT','GERER_COMMUNE'].includes(p))) && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => setConfiguringCentre({ id: centre.id, nom: centre.nom, commune_nom: centre.commune_nom })}
                              title="Configurer les services de ce centre"
                            >
                              <Settings size={13} /> Configurer
                            </button>
                          )}
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(centre)}
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteCentre(centre.id)}
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
              totalItems={filteredCentres.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {/* Modal Création/Modification Centre */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editCentre ? "Modifier le centre d'administration" : "Créer un nouveau centre d'administration"}
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

            <form onSubmit={handleSaveCentre}>
              <div className="form-group">
                <label className="form-label">Région</label>
                <select
                  required
                  className="form-input form-select"
                  value={selectedRegion}
                  onChange={(e) => {
                    setSelectedRegion(e.target.value);
                    setSelectedDepartment('');
                    setSelectedCommune('');
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
                    onChange={(e) => {
                      setSelectedDepartment(e.target.value);
                      setSelectedCommune('');
                    }}
                  >
                    <option value="">Sélectionner le département</option>
                    {modalDepartments.map(d => (
                      <option key={d.id} value={d.id}>{d.nom} ({d.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedDepartment && (
                <div className="form-group">
                  <label className="form-label">Commune de rattachement</label>
                  <select
                    required
                    className="form-input form-select"
                    value={selectedCommune}
                    onChange={(e) => setSelectedCommune(e.target.value)}
                  >
                    <option value="">Sélectionner la commune</option>
                    {modalCommunes.map(c => (
                      <option key={c.id} value={c.id}>{c.nom} ({c.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Nom du Centre</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Centre Principal de Ouakam, Centre Secondaire..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Code Centre (Unique)</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: C-DK-PL-P, C-DK-MD-S..."
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
                  <span>{editCentre ? 'Enregistrer les modifications' : 'Créer le Centre'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
