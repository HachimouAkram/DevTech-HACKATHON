import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import { Search, Filter, Eye, Activity, Calendar, Clock, ArrowRight, X } from 'lucide-react';

export default function AuditLogsList({ token }) {
  const { addToast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfil, setSelectedProfil] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Profils
  const [profilsList, setProfilsList] = useState([]);

  useEffect(() => {
    const fetchProfils = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/profils`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setProfilsList(data.data?.profils || []);
        }
      } catch (err) {
        console.error("Erreur chargement profils", err);
      }
    };
    fetchProfils();
  }, [token]);

  const fetchLogs = async (page = 0) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        size: 20,
        sortBy: 'createdAt',
        sortDir: 'desc'
      });
      if (searchQuery) params.append('search', searchQuery);
      if (selectedProfil) params.append('profil', selectedProfil);
      if (startDate) params.append('startDate', new Date(startDate).toISOString());
      if (endDate) params.append('endDate', new Date(endDate).toISOString());

      const res = await fetch(`${API_BASE_URL}/audit-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.content);
        setTotalPages(data.totalPages);
        setCurrentPage(data.number);
      } else {
        addToast(data.message || 'Erreur lors du chargement des logs', 'error');
      }
    } catch (err) {
      addToast('Erreur serveur', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(0);
  }, [selectedProfil, startDate, endDate]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs(0);
  };

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return { bg: '#dcfce7', text: '#166534', label: 'Création' };
      case 'UPDATE': return { bg: '#dbeafe', text: '#1e40af', label: 'Modification' };
      case 'DELETE': return { bg: '#fee2e2', text: '#991b1b', label: 'Suppression' };
      default: return { bg: '#f1f5f9', text: '#475569', label: action };
    }
  };

  const formatJSON = (obj) => {
    if (!obj) return 'Aucune donnée';
    return JSON.stringify(obj, null, 2);
  };

  return (
    <div className="page-container">
      {/* En-tête supprimé car le titre est maintenant dans la Navbar */}

      {/* Barre de Recherche et Filtres */}
      <div className="glass-card mb-6" style={{ padding: '1rem' }}>
        <div className="flex-space" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <form onSubmit={handleSearch} style={{ flexGrow: 1, minWidth: '250px', position: 'relative' }}>
            <input
              type="text"
              placeholder="Rechercher par nom..."
              className="form-input"
              style={{ paddingLeft: '2.5rem', width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </form>

          <div className="flex-gap" style={{ minWidth: '200px' }}>
            <select
              className="form-input form-select"
              value={selectedProfil}
              onChange={(e) => setSelectedProfil(e.target.value)}
            >
              <option value="">Tous les profils</option>
              {profilsList.map(p => (
                <option key={p.id} value={p.nom}>{p.nom}</option>
              ))}
            </select>
          </div>

          <div className="flex-gap" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Du :</span>
            <input
              type="date"
              className="form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Au :</span>
            <input
              type="date"
              className="form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tableau des historiques */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            Aucun historique trouvé.
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Utilisateur</th>
                  <th>Profil / Portée</th>
                  <th>Action</th>
                  <th>Entité Cible</th>
                  <th style={{ textAlign: 'right' }}>Détails</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actionStyle = getActionColor(log.action);
                  return (
                    <tr key={log.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 500 }}>{new Date(log.createdAt).toLocaleDateString()}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{log.nomComplet}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{log.profil}</div>
                        {(log.centreNom || log.communeNom) && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {log.centreNom ? `Centre: ${log.centreNom}` : `Commune: ${log.communeNom}`}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{
                          backgroundColor: actionStyle.bg,
                          color: actionStyle.text,
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.75rem',
                          fontWeight: 600
                        }}>
                          {actionStyle.label}
                        </span>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontWeight: 600 }}>{log.entityType}</span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '6px' }}>#{log.entityId}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-icon btn-sm btn-secondary"
                          onClick={() => setSelectedLog(log)}
                          title="Voir les détails"
                          style={{ padding: '0.35rem', color: '#3b82f6' }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Page {currentPage + 1} sur {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    disabled={currentPage === 0}
                    onClick={() => fetchLogs(currentPage - 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Précédent
                  </button>
                  <button
                    disabled={currentPage === totalPages - 1}
                    onClick={() => fetchLogs(currentPage + 1)}
                    className="btn btn-secondary btn-sm"
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Détails */}
      {selectedLog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '90%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Détails de l'action
                </h2>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                  <span><Calendar size={12} style={{ marginRight: '4px', display: 'inline' }} />{new Date(selectedLog.createdAt).toLocaleString()}</span>
                  <span>Par: {selectedLog.nomComplet}</span>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5rem' }}>
                <X size={24} color="#64748b" />
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ padding: '0.5rem 1rem', backgroundColor: '#f1f5f9', borderRadius: '8px', fontWeight: 600 }}>
                  {selectedLog.entityType} #{selectedLog.entityId}
                </div>
                <div style={{ padding: '0.5rem 1rem', backgroundColor: getActionColor(selectedLog.action).bg, color: getActionColor(selectedLog.action).text, borderRadius: '8px', fontWeight: 600 }}>
                  {getActionColor(selectedLog.action).label}
                </div>
              </div>

              {(() => {
                const oldV = selectedLog.oldValues || {};
                const newV = selectedLog.newValues || {};

                const ignoreKeys = ['passwordHash', 'password', 'createdAt', 'updatedAt'];
                const allKeys = new Set([...Object.keys(oldV), ...Object.keys(newV)]);
                const fields = Array.from(allKeys).filter(k => !ignoreKeys.includes(k));

                if (fields.length === 0) return <div style={{ color: '#64748b' }}>Aucune donnée détaillée pertinente.</div>;

                const formatValue = (val) => {
                  if (val === null || val === undefined) return 'N/A';
                  if (typeof val === 'boolean') return val ? 'Oui' : 'Non';
                  if (Array.isArray(val)) {
                    if (val.length >= 3 && typeof val[0] === 'number' && val[0] > 2000) {
                      const [year, month, day, hour = 0, minute = 0, second = 0] = val;
                      return new Date(year, month - 1, day, hour, minute, second).toLocaleString();
                    }
                    if (val.length === 0) return 'Vide';
                    return val.map(v => formatValue(v)).join(', ');
                  }
                  if (typeof val === 'object') {
                    if (val.nomComplet) return val.nomComplet;
                    if (val.nom) return val.nom;
                    if (val.libelle) return val.libelle;
                    if (val.id) return `#${val.id}`;
                    return JSON.stringify(val);
                  }
                  return String(val);
                };

                const formatKey = (k) => {
                  const result = k.replace(/([A-Z])/g, ' $1');
                  return result.charAt(0).toUpperCase() + result.slice(1);
                };

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {fields.map(key => {
                      const oldVal = oldV[key];
                      const newVal = newV[key];
                      const formattedOld = formatValue(oldVal);
                      const formattedNew = formatValue(newVal);

                      if (selectedLog.action === 'UPDATE') {
                        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                          return (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <span style={{ width: '180px', fontWeight: 600, color: '#475569' }}>{formatKey(key)}</span>
                              <span style={{ color: '#ef4444', textDecoration: 'line-through', flex: 1 }}>{formattedOld}</span>
                              <ArrowRight size={16} color="#94a3b8" style={{ margin: '0 1rem' }} />
                              <span style={{ color: '#10b981', fontWeight: 600, flex: 1 }}>{formattedNew}</span>
                            </div>
                          );
                        }
                        return null;
                      }

                      const valToShow = selectedLog.action === 'DELETE' ? formattedOld : formattedNew;
                      if (!valToShow || valToShow === 'N/A') return null;

                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', padding: '0.75rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ width: '180px', fontWeight: 600, color: '#475569' }}>{formatKey(key)}</span>
                          <span style={{ color: '#334155', flex: 1 }}>{valToShow}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
