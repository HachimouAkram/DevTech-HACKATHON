import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import { Plus, Search, X, FileText, Edit2, Trash2, Eye, EyeOff, Settings, GitMerge, CheckCircle, XCircle, FolderOpen } from 'lucide-react';
import FormDesigner from './FormDesigner';
import WorkflowBuilder from '../components/WorkflowBuilder';

const PREDEFINED_FIELDS_CATEGORIES = [
  {
    category: "Informations sur l'acte",
    fields: ["Région", "Département", "Commune", "Centre d'état civil", "Année de déclaration", "Numéro de l'acte"]
  },
  {
    category: "Renseignement concernant le titulaire",
    fields: ["CNI du titulaire", "Prénom", "Nom", "Sexe", "Date de naissance", "Lieu de naissance"]
  },
  {
    category: "Informations sur les parents",
    fields: ["Prénom du père", "Nom du père", "Prénom de la mère", "Nom de la mère"]
  },
  {
    category: "Informations de Mariage",
    fields: ["Prénom de l'époux", "Nom de l'époux", "CNI de l'époux", "Prénom de l'épouse", "Nom de l'épouse", "CNI de l'épouse", "Date du mariage", "Lieu du mariage"]
  },
  {
    category: "Informations de Décès",
    fields: ["Prénom du défunt", "Nom du défunt", "CNI du défunt", "Date du décès", "Lieu du décès"]
  }
];

export default function ActivitiesList({ token, currentUser }) {
  const [activities, setActivities] = useState([]);
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
  const [editActivity, setEditActivity] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [priceType, setPriceType] = useState('payant');

  // Form Designer state
  const [designerActivity, setDesignerActivity] = useState(null);

  // Workflow Builder state
  const [workflowActivity, setWorkflowActivity] = useState(null);

  // Dynamic fields state
  const [selectedFields, setSelectedFields] = useState([]);
  const [customFieldText, setCustomFieldText] = useState('');
  
  // Motifs state
  const [motifs, setMotifs] = useState([]);
  const [customMotifText, setCustomMotifText] = useState('');

  // Hierarchical metadata


  const [formData, setFormData] = useState({
    service_id: '',
    nom: '',
    prix: '',
    delai_min_jours: '',
    delai_max_jours: '',
    actif: true,
    presence_physique_requise: false
  });

  const toggleField = (field) => {
    setSelectedFields(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    );
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      // Fetch Activities
      const actResponse = await fetch(`${API_BASE_URL}/activities?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const actData = await actResponse.json();
      const fetchedActivities = actData.data.activities || [];
      if ((currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') === 'agent') {
        const assignedIds = currentUser.activity_ids || [];
        setActivities(fetchedActivities.filter(a => assignedIds.includes(a.id)));
      } else {
        setActivities(fetchedActivities);
      }

      // Fetch services for the dropdown
      const serResponse = await fetch(`${API_BASE_URL}/services?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
      });
      const serData = await serResponse.json();
      if (serResponse.ok) setServices(serData.data.services || []);

    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);


  const handleOpenCreateModal = () => {
    setEditActivity(null);
    const autoService = services.length === 1 ? services[0].id.toString() : '';
    setFormData({ service_id: autoService, nom: '', prix: '', delai_min_jours: '', delai_max_jours: '', actif: true, presence_physique_requise: false });
    setPriceType('payant');
    setSelectedFields([]);
    setMotifs([]);
    setCustomFieldText('');
    setCustomMotifText('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (act) => {
    setEditActivity(act);
    setFormData({
      service_id: act.service_id,
      nom: act.nom,
      prix: act.prix.toString(),
      delai_min_jours: act.delai_min_jours.toString(),
      delai_max_jours: act.delai_max_jours.toString(),
      actif: act.actif,
      presence_physique_requise: act.presence_physique_requise || false
    });
    setPriceType(act.prix === 0 ? 'gratuit' : 'payant');
    setSelectedFields(
      Array.isArray(act.champs_requis) 
        ? act.champs_requis 
        : []
    );
    setMotifs(
      Array.isArray(act.motifs) 
        ? act.motifs 
        : []
    );
    setCustomFieldText('');
    setCustomMotifText('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    const bodyData = {
      ...formData,
      prix: priceType === 'gratuit' ? 0 : parseInt(formData.prix || '0'),
      delai_min_jours: parseInt(formData.delai_min_jours),
      delai_max_jours: parseInt(formData.delai_max_jours),
      champs_requis: selectedFields,
      motifs: motifs,
      presence_physique_requise: formData.presence_physique_requise
    };

    // If Officier is creating, enforce their service
    if ((currentUser?.role ? currentUser.role.toLowerCase().replace(' ', '_') : '') === 'officier') {
      bodyData.service_id = currentUser.service_id;
    }

    try {
      const url = editActivity 
        ? `${API_BASE_URL}/activities/${editActivity.id}`
        : `${API_BASE_URL}/activities`;
      const method = editActivity ? 'PUT' : 'POST';

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
      
      const saved = data.data.activity || data.data; // Assuming backend returns the saved activity
      if (editActivity) {
        setActivities(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        setActivities(prev => [...prev, saved]);
      }
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette activité ?')) return;
    try {
      const response = await fetch(`${API_BASE_URL}/activities/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la suppression.');
      setActivities(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (act) => {
    const newActif = !act.actif;
    try {
      const response = await fetch(`${API_BASE_URL}/activities/${act.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ actif: newActif })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors du changement de statut.');
      
      // Update state locally
      setActivities(activities.map(a => a.id === act.id ? { ...a, actif: newActif } : a));
    } catch (err) {
      alert(err.message);
    }
  };

  // Filter local search and sort by service name
  const filteredActivities = activities.filter(a => 
    a.nom.toLowerCase().includes(search.toLowerCase()) || 
    (a.service_nom && a.service_nom.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    const serviceA = a.service_nom || '';
    const serviceB = b.service_nom || '';
    return serviceA.localeCompare(serviceB);
  });

  const totalActivities = activities.length;
  const activeCount = activities.filter(a => a.actif).length;
  const suspendedCount = activities.filter(a => !a.actif).length;
  const uniqueServices = new Set(activities.map(a => a.service_id).filter(Boolean)).size;

  return (
    <div>
      <div className="flex-space mb-6">
        <div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Consultez et gérez les formalités d'acte (actes de naissance, mariage, décès), les tarifs et les pièces requises.
          </p>
        </div>
        {currentUser?.permissions?.includes('GERER_GLOBAL') && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} />
            <span>Nouvelle Activité</span>
          </button>
        )}
      </div>

      {/* Statistiques KPI - Style Premium */}
      <div className="premium-kpi-grid">
        <div className="kpi-card glass-card border-blue">
          <div className="kpi-icon icon-blue">
            <FileText size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Total Formalités</span>
            <span className="kpi-number">{totalActivities}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Actives</span>
            <span className="kpi-number">{activeCount}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-red">
          <div className="kpi-icon icon-red">
            <XCircle size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Suspendues</span>
            <span className="kpi-number">{suspendedCount}</span>
          </div>
        </div>

        <div className="kpi-card glass-card border-purple">
          <div className="kpi-icon icon-purple">
            <FolderOpen size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Services Rattachés</span>
            <span className="kpi-number">{uniqueServices}</span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher une activité..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem' }}
          />
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Liste des Activités */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucune activité enregistrée.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Nom de l'Activité</th>
                  <th>Service Parent</th>
                  <th>Tarif (CFA)</th>
                  <th>Délais Moyen</th>
                  <th>Statut</th>
                  {currentUser?.permissions?.includes('GERER_GLOBAL') && <th style={{ textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((act) => (
                  <tr key={act.id}>
                    <td>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} style={{ color: 'var(--primary)' }} />
                        <span>{act.nom}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{act.service_nom}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: act.prix === 0 ? '#10b981' : 'var(--text-primary)' }}>
                        {act.prix === 0 ? 'Gratuit' : `${act.prix.toLocaleString()} F CFA`}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {act.delai_min_jours}j à {act.delai_max_jours}j
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${act.actif ? 'badge-success' : 'badge-danger'}`}>
                        {act.actif ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    {currentUser?.permissions?.includes('GERER_GLOBAL') && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {/* Suspend/Activate */}
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', color: act.actif ? 'var(--warning)' : 'var(--success)' }}
                            onClick={() => handleToggleStatus(act)}
                            title={act.actif ? 'Suspendre' : 'Activer'}
                          >
                            {act.actif ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>

                          {/* Form Designer */}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--primary)' }}
                            onClick={() => setDesignerActivity(act)}
                            title="Concevoir le formulaire"
                          >
                            <Settings size={14} />
                          </button>

                          {/* Workflow Builder */}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '0.25rem 0.5rem', color: '#8b5cf6' }}
                            onClick={() => setWorkflowActivity(act)}
                            title="Configurer le Workflow"
                          >
                            <GitMerge size={14} />
                          </button>

                          {/* Edit */}
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleOpenEditModal(act)}
                            title="Modifier"
                          >
                            <Edit2 size={14} />
                          </button>

                          {/* Delete */}
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '0.25rem 0.5rem', color: 'var(--danger)' }}
                            onClick={() => handleDeleteActivity(act.id)}
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
              totalItems={filteredActivities.length} 
              itemsPerPage={itemsPerPage} 
              onPageChange={setCurrentPage} 
              onItemsPerPageChange={setItemsPerPage} 
            />
          </div>
        )}
      </div>

      {/* ── Form Designer Panel (fullscreen overlay) ── */}
      {designerActivity && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: '#f8fafc', display: 'flex', flexDirection: 'column',
        }}>
          <FormDesigner
            activityId={designerActivity.id}
            activityNom={designerActivity.nom}
            activityMotifs={designerActivity.motifs || []}
            accentColor="#10b981"
            onClose={() => setDesignerActivity(null)}
          />
        </div>
      )}

      {/* ── Workflow Builder Panel (fullscreen overlay) ── */}
      {workflowActivity && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: '#f8fafc', display: 'flex', flexDirection: 'column', overflowY: 'auto'
        }}>
          <WorkflowBuilder
            activite={workflowActivity}
            onClose={() => setWorkflowActivity(null)}
          />
        </div>
      )}

      {/* Modal Création/Modification Activité */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 className="modal-title">
                {editActivity ? 'Modifier la formalité' : 'Créer une formalité'}
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

            <form onSubmit={handleSaveActivity}>

              <div className="form-group">
                <label className="form-label">Service (Global)</label>
                <select required className="form-input form-select" value={formData.service_id} onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}>
                  <option value="">Sélectionner le service</option>
                  {services.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Libellé de la Formalité</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="Ex: Copie intégrale d'acte de naissance..."
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Type de Tarif</label>
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                    <input
                      type="radio"
                      name="priceType"
                      value="payant"
                      checked={priceType === 'payant'}
                      onChange={() => setPriceType('payant')}
                      style={{ width: '1.1rem', height: '1.1rem' }}
                    />
                    <span>Payant</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '500' }}>
                    <input
                      type="radio"
                      name="priceType"
                      value="gratuit"
                      checked={priceType === 'gratuit'}
                      onChange={() => setPriceType('gratuit')}
                      style={{ width: '1.1rem', height: '1.1rem' }}
                    />
                    <span>Gratuit</span>
                  </label>
                </div>
              </div>

              <div className="grid-3">
                {priceType === 'payant' ? (
                  <div className="form-group">
                    <label className="form-label">Tarif (CFA)</label>
                    <input
                      type="number"
                      required
                      className="form-input"
                      placeholder="1000"
                      value={formData.prix}
                      onChange={(e) => setFormData({ ...formData, prix: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Tarif (CFA)</label>
                    <input
                      type="text"
                      disabled
                      className="form-input"
                      value="Gratuit"
                      style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Délai Min (j)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="1"
                    value={formData.delai_min_jours}
                    onChange={(e) => setFormData({ ...formData, delai_min_jours: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Délai Max (j)</label>
                  <input
                    type="number"
                    required
                    className="form-input"
                    placeholder="3"
                    value={formData.delai_max_jours}
                    onChange={(e) => setFormData({ ...formData, delai_max_jours: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label className="form-label" style={{ fontWeight: '700', marginBottom: '0.5rem', display: 'block' }}>
                  Motifs de demande possibles
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Si cette formalité a plusieurs motifs (ex: Nouvelle demande, Perte, Renouvellement), ajoutez-les ici. Le citoyen devra d'abord choisir l'un de ces motifs.
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Perte de document..."
                    value={customMotifText}
                    onChange={(e) => setCustomMotifText(e.target.value)}
                    style={{ flexGrow: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      const clean = customMotifText.trim();
                      if (clean && !motifs.includes(clean)) {
                        setMotifs([...motifs, clean]);
                        setCustomMotifText('');
                      }
                    }}
                  >
                    + Ajouter
                  </button>
                </div>

                {motifs.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
                      Motifs configurés ({motifs.length}) :
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', padding: '0.5rem', background: '#f1f5f9', borderRadius: '6px' }}>
                      {motifs.map((m, index) => (
                        <span
                          key={index}
                          className="badge badge-primary"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.6rem',
                            fontSize: '0.75rem',
                            borderRadius: '4px'
                          }}
                        >
                          {m}
                          <button
                            type="button"
                            onClick={() => setMotifs(motifs.filter(motif => motif !== m))}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              color: '#ffffff',
                              cursor: 'pointer',
                              fontWeight: '700',
                              fontSize: '0.75rem',
                              padding: '0 2px'
                            }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="form-group" style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
                  <input
                    type="checkbox"
                    checked={formData.presence_physique_requise}
                    onChange={(e) => setFormData({ ...formData, presence_physique_requise: e.target.checked })}
                    style={{ width: '1.2rem', height: '1.2rem' }}
                  />
                  <span>Finalisation en présentiel requise</span>
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1.7rem', marginTop: '0.25rem' }}>
                  Si activé, le citoyen devra obligatoirement choisir un rendez-vous à la fin de sa demande pour une présence physique au centre.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={formLoading}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={formLoading}>
                  {formLoading ? <div className="loading-spinner"></div> : null}
                  <span>{editActivity ? 'Enregistrer' : 'Créer la Formalité'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
