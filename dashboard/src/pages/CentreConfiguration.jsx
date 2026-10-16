import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Building2, Briefcase, Activity, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, ToggleLeft, ToggleRight, Loader2, AlertCircle,
  Info, Check
} from 'lucide-react';

const API = `http://${window.location.hostname}:5000`;

export default function CentreConfiguration({ token, centreId, centreNom, communeNom, onBack }) {
  const [step, setStep] = useState(1); // 1=Bureaux, 2=Services, 3=Activités/Résumé
  const [selectedBureauId, setSelectedBureauId] = useState(null);
  const [bureauxDispo, setBureauxDispo] = useState([]);
  const [servicesDispo, setServicesDispo] = useState([]);
  const [configuration, setConfiguration] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ─── Chargement des données ───────────────────────────────────────────────

  const fetchBureaux = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/centres/${centreId}/bureaux-disponibles`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setBureauxDispo(data.data.bureaux || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [centreId]);

  const fetchServices = useCallback(async (bureauId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/centres/${centreId}/bureaux/${bureauId}/services-disponibles`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setServicesDispo(data.data.services || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [centreId]);

  const fetchConfiguration = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/centres/${centreId}/configuration`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setConfiguration(data.data.configuration || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [centreId]);

  useEffect(() => { fetchBureaux(); }, [fetchBureaux]);

  // ─── Actions Bureau ────────────────────────────────────────────────────────

  const toggleBureau = async (bureauId, currentlyActive) => {
    setActionLoading(prev => ({ ...prev, [`bureau_${bureauId}`]: true }));
    try {
      const method = currentlyActive ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/centres/${centreId}/bureaux/${bureauId}`, { method, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data?.data?.message || data?.message || (currentlyActive ? 'Bureau désactivé' : 'Bureau activé'));
      await fetchBureaux();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(prev => ({ ...prev, [`bureau_${bureauId}`]: false })); }
  };

  // ─── Actions Service ───────────────────────────────────────────────────────

  const toggleService = async (serviceId, currentlyActive) => {
    setActionLoading(prev => ({ ...prev, [`service_${serviceId}`]: true }));
    try {
      const method = currentlyActive ? 'DELETE' : 'POST';
      const res = await fetch(`${API}/api/centres/${centreId}/services/${serviceId}`, { method, headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data?.data?.message || data?.message || (currentlyActive ? 'Service désactivé' : 'Service activé'));
      await fetchServices(selectedBureauId);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(prev => ({ ...prev, [`service_${serviceId}`]: false })); }
  };

  // ─── Actions Activité ──────────────────────────────────────────────────────

  const toggleActivite = async (activiteId, currentlyActive) => {
    setActionLoading(prev => ({ ...prev, [`activite_${activiteId}`]: true }));
    try {
      const res = await fetch(`${API}/api/centres/${centreId}/activites/${activiteId}/toggle`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ actif: !currentlyActive })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data?.data?.message || data?.message || 'Activité mise à jour');
      await fetchConfiguration();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setActionLoading(prev => ({ ...prev, [`activite_${activiteId}`]: false })); }
  };

  // ─── Navigation entre étapes ───────────────────────────────────────────────

  const goToStep2 = (bureauId) => {
    setSelectedBureauId(bureauId);
    fetchServices(bureauId);
    setStep(2);
  };

  const goToStep3 = () => {
    fetchConfiguration();
    setStep(3);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const selectedBureau = bureauxDispo.find(b => b.bureau_id === selectedBureauId);

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: '12px', display: 'flex',
          alignItems: 'center', gap: '0.5rem', boxShadow: '0 8px 30px rgba(0,0,0,0.15)',
          background: toast.type === 'error' ? 'var(--danger)' : 'var(--success)',
          color: '#fff', fontWeight: 600, fontSize: '0.875rem',
          animation: 'slideIn 0.2s ease'
        }}>
          {toast.type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
          {toast.msg}
        </div>
      )}

      {/* En-tête */}
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={16} /> Retour aux centres
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>
          Configuration — {centreNom} ({communeNom})
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Configurez les bureaux, services et activités disponibles dans ce centre.
        </p>
      </div>

      {/* Barre de progression (3 étapes) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0', marginBottom: '2rem',
        background: 'var(--bg-secondary)', borderRadius: '12px', padding: '1rem 1.5rem'
      }}>
        {[
          { num: 1, label: 'Bureaux', icon: Building2 },
          { num: 2, label: 'Services', icon: Briefcase },
          { num: 3, label: 'Résumé & Activités', icon: Activity },
        ].map((s, i) => (
          <React.Fragment key={s.num}>
            <div
              onClick={() => {
                if (s.num === 1) { setStep(1); fetchBureaux(); }
                if (s.num === 3 && step >= 2) goToStep3();
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer',
                background: step === s.num ? 'var(--primary)' : 'transparent',
                color: step === s.num ? '#fff' : step > s.num ? 'var(--success)' : 'var(--text-muted)',
                fontWeight: step === s.num ? 700 : 500, transition: 'all 0.2s'
              }}
            >
              <s.icon size={16} />
              <span style={{ fontSize: '0.875rem' }}>{s.label}</span>
            </div>
            {i < 2 && <ChevronRight size={16} style={{ color: 'var(--text-muted)', margin: '0 0.25rem' }} />}
          </React.Fragment>
        ))}
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '8px', padding: '1rem', color: 'var(--danger)', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Loader2 size={32} className="spin" style={{ color: 'var(--primary)', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <>
          {/* ─── ÉTAPE 1 : BUREAUX ──────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  <Info size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Sélectionnez les bureaux actifs dans ce centre. Cliquez sur un bureau pour configurer ses services.
                </p>
                <button className="btn btn-primary" onClick={goToStep3} style={{ fontSize: '0.8rem' }}>
                  Voir le résumé <ChevronRight size={14} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {bureauxDispo.map(bureau => (
                  <div key={bureau.bureau_id} className="glass-card" style={{
                    padding: '1.25rem', border: bureau.actif
                      ? `2px solid ${bureau.bureau_couleur || 'var(--primary)'}33`
                      : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: `${bureau.bureau_couleur || '#10b981'}22`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: bureau.bureau_couleur || '#10b981'
                        }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{bureau.bureau_nom}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {bureau.nb_services_actifs}/{bureau.nb_services_catalogue} services actifs
                          </div>
                        </div>
                      </div>

                      {/* Toggle On/Off */}
                      <button
                        onClick={() => toggleBureau(bureau.bureau_id, bureau.actif)}
                        disabled={!!actionLoading[`bureau_${bureau.bureau_id}`]}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        title={bureau.actif ? 'Désactiver' : 'Activer'}
                      >
                        {actionLoading[`bureau_${bureau.bureau_id}`]
                          ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                          : bureau.actif
                            ? <ToggleRight size={28} style={{ color: 'var(--success)' }} />
                            : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />
                        }
                      </button>
                    </div>

                    {/* Bouton configurer les services */}
                    {bureau.actif && (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => goToStep2(bureau.bureau_id)}
                        style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
                      >
                        Configurer les services <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── ÉTAPE 2 : SERVICES ─────────────────────────────────── */}
          {step === 2 && selectedBureau && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: `${selectedBureau.bureau_couleur || '#10b981'}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: selectedBureau.bureau_couleur || '#10b981'
                }}>
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 style={{ fontWeight: 700, margin: 0 }}>{selectedBureau.bureau_nom}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>
                    Sélectionnez les services actifs dans ce centre. Les activités suivent automatiquement.
                  </p>
                </div>
              </div>

              {servicesDispo.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <Briefcase size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                  <p>Aucun service dans le catalogue pour ce bureau.</p>
                  <p style={{ fontSize: '0.8rem' }}>Le Super Admin doit d'abord créer des services.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {servicesDispo.map(service => (
                    <div key={service.service_id} className="glass-card" style={{
                      padding: '1rem 1.25rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: service.actif ? '1.5px solid var(--success)33' : '1.5px solid transparent'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '8px',
                          background: 'var(--bg-secondary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--text-muted)'
                        }}>
                          <Briefcase size={16} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{service.service_nom}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {service.nb_activites_catalogue} activité(s) dans le catalogue
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {service.actif && (
                          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Actif</span>
                        )}
                        <button
                          onClick={() => toggleService(service.service_id, service.actif)}
                          disabled={!!actionLoading[`service_${service.service_id}`]}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          {actionLoading[`service_${service.service_id}`]
                            ? <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                            : service.actif
                              ? <ToggleRight size={28} style={{ color: 'var(--success)' }} />
                              : <ToggleLeft size={28} style={{ color: 'var(--text-muted)' }} />
                          }
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={14} /> Retour aux bureaux
                </button>
                <button className="btn btn-primary" onClick={goToStep3}>
                  Voir le résumé <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ─── ÉTAPE 3 : RÉSUMÉ & ACTIVITÉS ───────────────────────── */}
          {step === 3 && (
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                <Info size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                Résumé de la configuration de <strong>{centreNom}</strong>.
                Vous pouvez activer/désactiver des activités individuellement.
              </p>

              {configuration.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                  <Building2 size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                  <p>Aucun bureau configuré pour ce centre.</p>
                  <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setStep(1)}>
                    Configurer maintenant
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {configuration.map(bureau => (
                    <div key={bureau.bureau_id} className="glass-card" style={{ padding: '1.25rem' }}>
                      {/* En-tête bureau */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '10px',
                          background: `${bureau.bureau_couleur || '#10b981'}22`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: bureau.bureau_couleur || '#10b981', flexShrink: 0
                        }}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{bureau.bureau_nom}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {bureau.services?.length || 0} service(s) configuré(s)
                          </div>
                        </div>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: 'auto', fontSize: '0.75rem' }}
                          onClick={() => { setSelectedBureauId(bureau.bureau_id); fetchServices(bureau.bureau_id); setStep(2); }}
                        >
                          <Briefcase size={12} /> Modifier services
                        </button>
                      </div>

                      {/* Services */}
                      {(bureau.services || []).length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '0.5rem 0.75rem',
                          background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                          Aucun service sélectionné pour ce bureau.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1rem' }}>
                          {bureau.services.map(service => (
                            <div key={service.service_id}>
                              <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                marginBottom: '0.5rem', padding: '0.5rem 0.75rem',
                                background: 'var(--bg-secondary)', borderRadius: '8px'
                              }}>
                                <Briefcase size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{service.service_nom}</span>
                                <span className={`badge ${service.actif ? 'badge-success' : 'badge-warning'}`}
                                  style={{ fontSize: '0.65rem', marginLeft: 'auto' }}>
                                  {service.actif ? 'Actif' : 'Inactif'}
                                </span>
                              </div>

                              {/* Activités */}
                              <div style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {(service.activites || []).map(activite => (
                                  <div key={activite.activite_id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                                    padding: '0.5rem 0.75rem', borderRadius: '6px',
                                    background: activite.actif ? 'rgba(16,185,129,0.04)' : 'rgba(239,68,68,0.04)',
                                    border: `1px solid ${activite.actif ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)'}`
                                  }}>
                                    {activite.actif
                                      ? <CheckCircle2 size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
                                      : <XCircle size={14} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                                    }
                                    <span style={{ flexGrow: 1, fontSize: '0.82rem', fontWeight: 500 }}>
                                      {activite.activite_nom}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                      {activite.prix?.toLocaleString()} FCFA · {activite.delai_min_jours}-{activite.delai_max_jours}j
                                    </span>
                                    <button
                                      onClick={() => toggleActivite(activite.activite_id, activite.actif)}
                                      disabled={!!actionLoading[`activite_${activite.activite_id}`]}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                                      title={activite.actif ? 'Désactiver cette activité' : 'Activer cette activité'}
                                    >
                                      {actionLoading[`activite_${activite.activite_id}`]
                                        ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
                                        : activite.actif
                                          ? <ToggleRight size={22} style={{ color: 'var(--success)' }} />
                                          : <ToggleLeft size={22} style={{ color: 'var(--text-muted)' }} />
                                      }
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
