import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, Layers, Baby, Heart, Activity, Trash2, Edit2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ServicesList({ token, currentUser }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search state
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [search, setSearch] = useState('');

  // Modal creation/edition state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editService, setEditService] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Hierarchical metadata
  const [allBureaux, setAllBureaux] = useState([]);

  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    icone: 'Layers',
    bureau_id: '',
    config: { fields: [] },
    actif: true
  });

  // Determine user's highest permission level
  const hasGlobal = currentUser?.permissions?.includes('GERER_GLOBAL');

  const fetchServices = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/services?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors du chargement.');
      setServices(data.data.services || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      // Fetch bureaux
      const burRes = await fetch(`${API_BASE_URL}/bureaux?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const burData = await burRes.json();
      const bureaux = burData.data.bureaux || [];

      setAllBureaux(bureaux);
    } catch (err) {
      console.error('Erreur métadonnées:', err);
    }
  };

  useEffect(() => {
    fetchServices();
    fetchMetadata();
  }, []);

  const handleOpenCreateModal = () => {
    setEditService(null);
    setFormData({
      nom: '',
      description: '',
      icone: 'Layers',
      bureau_id: '',
      config: { fields: [] },
      actif: true
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service) => {
    setEditService(service);
    setFormData({
      nom: service.nom,
      description: service.description || '',
      icone: service.icone || 'Layers',
      bureau_id: service.bureau_id || '',
      config: service.config || { fields: [] },
      actif: service.actif
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveService = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');
    try {
      const url = editService
        ? `${API_BASE_URL}/services/${editService.id}`
        : `${API_BASE_URL}/services`;
      const method = editService ? 'PUT' : 'POST';

      const bodyData = { ...formData };
      if (bodyData.bureau_id === '') bodyData.bureau_id = null;
      else if (bodyData.bureau_id) bodyData.bureau_id = parseInt(bodyData.bureau_id);

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

      setIsModalOpen(false);
      
      const saved = data.data.service || data.data; // Assuming backend returns the saved service
      if (editService) {
        setServices(prev => prev.map(s => s.id === saved.id ? saved : s));
      } else {
        setServices(prev => [...prev, saved]);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce service ? Toutes les activités associées seront également supprimées.')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/services/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suppression.');
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (service) => {
    const newActif = !service.actif;
    try {
      const response = await fetch(`${API_BASE_URL}/services/${service.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ actif: newActif })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suspension.');
      setServices(services.map(s => s.id === service.id ? { ...s, actif: newActif } : s));
    } catch (err) {
      alert(err.message);
    }
  };

  const getServiceIcon = (iconName) => {
    switch (iconName) {
      case 'Baby': return <Baby size={20} style={{ color: 'var(--primary)' }} />;
      case 'Heart': return <Heart size={20} style={{ color: 'var(--danger)' }} />;
      case 'Activity': return <Activity size={20} style={{ color: 'var(--warning)' }} />;
      default: return <Layers size={20} style={{ color: 'var(--secondary)' }} />;
    }
  };

  const filteredServices = services.filter(s =>
    s.nom.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    const bureauA = a.bureau_nom || '';
    const bureauB = b.bureau_nom || '';
    return bureauA.localeCompare(bureauB);
  });

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez et gérez les départements organisationnels (ex: État Civil, Nettoyage) et leurs formulaires associés.
          </p>
        </div>
        {hasGlobal && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouveau Service</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-blue">
          <div className="kpi-icon icon-blue">
            <Layers size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Services</span>
            <span className="kpi-number">{services.length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Actifs</span>
            <span className="kpi-number">{services.filter(s => s.actif).length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-red">
          <div className="kpi-icon icon-red">
            <XCircle size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Suspendus</span>
            <span className="kpi-number">{services.filter(s => !s.actif).length}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Search size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Filtrés</span>
            <span className="kpi-number">{filteredServices.length}</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher un service..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Liste des Services */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredServices.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun service disponible.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>N°</th>
                  <th>Nom du Service</th>
                  <th>Description</th>
                  <th>Statut</th>
                  {hasGlobal && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredServices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((service, index) => (
                  <tr key={service.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {getServiceIcon(service.icone)}
                        <span>{service.nom}</span>
                      </div>

                      {service.bureau_nom && (
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginLeft: '2rem' }}>
                          Bureau : {service.bureau_nom}
                        </div>
                      )}
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {service.description}
                    </td>
                    <td>
                      <span className={`badge ${service.actif ? 'badge-success' : 'badge-danger'}`}>
                        {service.actif ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    {hasGlobal && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', color: service.actif ? 'var(--warning)' : 'var(--success)' }}
                            onClick={() => handleToggleStatus(service)}
                            title={service.actif ? 'Suspendre' : 'Activer'}
                          >
                            {service.actif ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(service)}
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteService(service.id)}
                            title="Supprimer"
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
              totalItems={filteredServices.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {/* Modal Création/Modification Service */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editService ? 'Modifier le service' : 'Créer un nouveau service'}
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

            <form onSubmit={handleSaveService}>



              {/* Bureau */}
              {allBureaux.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Bureau d'affectation</label>
                  <select
                    className="form-input form-select"
                    required
                    value={formData.bureau_id}
                    onChange={(e) => setFormData({ ...formData, bureau_id: e.target.value })}
                  >
                    <option value="" disabled>Sélectionnez un bureau...</option>
                    {allBureaux.map(b => (
                      <option key={b.id} value={b.id}>{b.nom} ({b.code})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nom */}
              <div className="form-group">
                <label className="form-label">Nom du Service</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Passeport, Certificats, Naissance..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-input"
                  placeholder="Expliquez brièvement le rôle de ce service..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{ height: '80px', resize: 'none' }}
                />
              </div>

              {/* Icône */}
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label">Icône Graphique</label>
                <select
                  required
                  className="form-input form-select"
                  value={formData.icone}
                  onChange={(e) => setFormData({ ...formData, icone: e.target.value })}
                >
                  <option value="Layers">Générique (Calques)</option>
                  <option value="Baby">Naissance (Bébé)</option>
                  <option value="Heart">Mariage (Cœur)</option>
                  <option value="Activity">Décès (Activité)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <div className="loading-spinner"></div> : null}
                  <span>{editService ? 'Enregistrer' : 'Créer le Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
