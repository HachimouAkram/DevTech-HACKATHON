import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import Pagination from '../components/Pagination';
import {
  Plus, Pencil, Trash2, Power, Building2, Save, X, RefreshCw,
  FileText, DollarSign, Briefcase, MapPin, Users, Heart, Shield
} from 'lucide-react';

const LucideIcons = {
  Plus, Pencil, Trash2, Power, Building2, Save, X, RefreshCw,
  FileText, DollarSign, Briefcase, MapPin, Users, Heart, Shield
};

const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };
  const config = {
    method: options.method || 'GET',
    headers,
    cache: 'no-store',
  };
  if (options.bodyData) {
    config.body = JSON.stringify(options.bodyData);
  }
  const res = await fetch(url, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Une erreur est survenue.');
  return data;
};

const ICONE_OPTIONS = [
  { value: 'FileText',   label: 'État Civil' },
  { value: 'Building2',  label: 'Urbanisme' },
  { value: 'Trash2',     label: 'Nettoyage / Salubrité' },
  { value: 'DollarSign', label: 'Finances / Taxes' },
  { value: 'Briefcase',  label: 'Général / Administration' },
  { value: 'MapPin',     label: 'Local / Territoire' },
  { value: 'Users',      label: 'Social / Population' },
  { value: 'Heart',      label: 'Santé / Social' },
  { value: 'Shield',     label: 'Sécurité / Police' },
];

const COLOR_PRESETS = [
  '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
];

function BureauModal({ bureau, onClose, onSaved, token }) {
  const isNew = !bureau?.id;
  const [form, setForm] = useState({
    nom: bureau?.nom || '',
    description: bureau?.description || '',
    code: bureau?.code || '',
    icone: bureau?.icone || 'Building2',
    couleur: bureau?.couleur || '#10b981',
    actif: bureau?.actif !== false,
    ordre: bureau?.ordre || 0,
    type_acces: bureau?.config?.type_acces || (bureau?.config?.is_externe === false ? 'interne' : 'externe'),
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (!form.nom.trim() || !form.code.trim()) {
      setErr('Le nom et le code sont obligatoires.'); return;
    }
    setSaving(true);
    setErr('');
    try {
      const endpoint = isNew ? '/bureaux' : `/bureaux/${bureau.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const payload = {
        nom: form.nom,
        description: form.description,
        code: form.code,
        icone: form.icone,
        couleur: form.couleur,
        actif: form.actif,
        ordre: form.ordre,
        config: {
          ...(bureau?.config || {}),
          type_acces: form.type_acces,
          is_externe: form.type_acces === 'externe'
        }
      };
      const res = await apiFetch(endpoint, { method, bodyData: payload });
      if (res.status === 'success') {
        onSaved(res.data.bureau);
      }
    } catch (e) {
      setErr(e.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderBottom: `3px solid ${form.couleur}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isNew ? <Plus size={18} style={{ color: form.couleur }} /> : <Pencil size={18} style={{ color: form.couleur }} />}
            <h3 style={{ margin: 0 }}>{isNew ? 'Nouveau bureau' : `Modifier — ${bureau.nom}`}</h3>
          </div>
          <button className="icon-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          {err && <div className="alert-error">{err}</div>}

          <div className="form-row">
            <div className="form-col">
              <label>Nom du bureau *</label>
              <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Ex: État Civil" />
            </div>
            <div className="form-col">
              <label>Code unique *</label>
              <input
                value={form.code}
                onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s+/g, '_') }))}
                placeholder="Ex: ETAT_CIVIL"
                style={{ fontFamily: 'monospace', fontWeight: 700 }}
              />
            </div>
          </div>

          <div className="form-col" style={{ marginBottom: 14 }}>
            <label>Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Description du bureau..."
            />
          </div>

          <div className="form-row">
            <div className="form-col">
              <label>Icône</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <select value={form.icone} onChange={e => setForm(p => ({ ...p, icone: e.target.value }))} style={{ flex: 1 }}>
                  {ICONE_OPTIONS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, border: '1.5px solid #e2e8f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc',
                  color: form.couleur || '#10b981', flexShrink: 0
                }}>
                  {(() => {
                    const Icon = LucideIcons[form.icone] || LucideIcons.Building2;
                    return <Icon size={20} />;
                  })()}
                </div>
              </div>
            </div>
            <div className="form-col">
              <label>Ordre d'affichage</label>
              <input
                type="number" min="0"
                value={form.ordre}
                onChange={e => setForm(p => ({ ...p, ordre: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>
              Couleur du bureau
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(p => ({ ...p, couleur: c }))}
                  style={{
                    width: 32, height: 32, borderRadius: 8, backgroundColor: c, border: 'none',
                    cursor: 'pointer', outline: form.couleur === c ? `3px solid ${c}` : 'none',
                    outlineOffset: 2, transition: 'all 0.2s',
                  }}
                />
              ))}
              <input
                type="color"
                value={form.couleur}
                onChange={e => setForm(p => ({ ...p, couleur: e.target.value }))}
                title="Couleur personnalisée"
                style={{ width: 36, height: 36, borderRadius: 8, border: '1.5px solid #e2e8f0', cursor: 'pointer' }}
              />
              <span style={{ fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>{form.couleur}</span>
            </div>
          </div>

          {/* TYPE D'ACCÈS DU BUREAU : EXTERNE (CITOYEN) OU INTERNE (ADMIN) */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
              Visibilité et type d'accès du bureau *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                onClick={() => setForm(p => ({ ...p, type_acces: 'externe' }))}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `2px solid ${form.type_acces === 'externe' ? '#2563eb' : '#e2e8f0'}`,
                  backgroundColor: form.type_acces === 'externe' ? '#eff6ff' : '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: form.type_acces === 'externe' ? '#2563eb' : '#e2e8f0',
                  color: form.type_acces === 'externe' ? '#fff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: form.type_acces === 'externe' ? '#1d4ed8' : '#334155' }}>
                    Bureau Externe
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                    Visible par les citoyens sur le portail Web et l'application mobile.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setForm(p => ({ ...p, type_acces: 'interne' }))}
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: `2px solid ${form.type_acces === 'interne' ? '#7c3aed' : '#e2e8f0'}`,
                  backgroundColor: form.type_acces === 'interne' ? '#f5f3ff' : '#f8fafc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: form.type_acces === 'interne' ? '#7c3aed' : '#e2e8f0',
                  color: form.type_acces === 'interne' ? '#fff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Shield size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: form.type_acces === 'interne' ? '#6d28d9' : '#334155' }}>
                    Bureau Interne
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', lineHeight: 1.3 }}>
                    Usage administratif interne uniquement. Invisible pour les citoyens.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.actif} onChange={e => setForm(p => ({ ...p, actif: e.target.checked }))} />
            Bureau actif (activé dans le système)
          </label>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Annuler</button>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: form.couleur }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '…' : <><Save size={15} /> {isNew ? 'Créer le bureau' : 'Enregistrer'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BureauxList({ token, currentUser }) {
  const [bureaux, setBureaux] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editBureau, setEditBureau] = useState(null);

  const fetchBureaux = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await apiFetch(`/bureaux/all?t=${Date.now()}`);
      if (res.status === 'success') setBureaux(res.data.bureaux || []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => { fetchBureaux(); }, []);

  const handleToggle = async (bureau) => {
    try {
      const newActif = !bureau.actif;
      await apiFetch(`/bureaux/${bureau.id}/toggle`, {
        method: 'PATCH',
        bodyData: { actif: newActif },
      });
      setBureaux(prev => prev.map(b => b.id === bureau.id ? { ...b, actif: newActif } : b));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (bureau) => {
    if (!window.confirm(`Supprimer le bureau "${bureau.nom}" ?`)) return;
    try {
      await apiFetch(`/bureaux/${bureau.id}`, { method: 'DELETE' });
      setBureaux(prev => prev.filter(b => b.id !== bureau.id));
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  const handleSaved = (saved) => {
    setShowModal(false);
    if (editBureau) {
      setBureaux(prev => prev.map(b => b.id === saved.id ? saved : b));
    } else {
      setBureaux(prev => [...prev, saved]);
    }
    setEditBureau(null);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header" style={{ justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={fetchBureaux} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Actualiser
          </button>
          <button
            className="btn btn-primary"
            style={{ backgroundColor: '#10b981' }}
            onClick={() => { setEditBureau(null); setShowModal(true); }}
          >
            <Plus size={16} /> Nouveau bureau
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-box">
          <div className="spinner" />
          <span>Chargement des bureaux...</span>
        </div>
      ) : (
        <div className="bureaux-grid">
          {bureaux.length === 0 ? (
            <div className="empty-state">
              <Building2 size={48} color="#cbd5e1" />
              <p>Aucun bureau configuré.</p>
              <button className="btn btn-primary" style={{ backgroundColor: '#10b981' }}
                onClick={() => setShowModal(true)}>
                <Plus size={15} /> Créer le premier bureau
              </button>
            </div>
          ) : [...bureaux].sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(b => (
            <div key={b.id} className={`bureau-card ${!b.actif ? 'inactive' : ''}`}>
              <div className="bureau-card-top" style={{ background: `linear-gradient(135deg, ${b.couleur}, ${b.couleur}aa)` }}>
                <div className="bureau-card-icon" style={{ color: '#fff' }}>
                  {(() => {
                    const Icon = LucideIcons[b.icone] || LucideIcons.Building2;
                    return <Icon size={26} />;
                  })()}
                </div>
                <div>
                  <div className="bureau-card-code">{b.code}</div>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {b.config?.type_acces === 'interne' || b.config?.is_externe === false ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: 'rgba(124, 58, 237, 0.85)',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: '700'
                      }}>
                        <Shield size={10} /> Interne
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        backgroundColor: 'rgba(37, 99, 235, 0.85)',
                        color: '#fff',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        fontSize: '10px',
                        fontWeight: '700'
                      }}>
                        <Users size={10} /> Externe (Citoyens)
                      </span>
                    )}
                    {!b.actif && <span className="badge-inactive">Inactif</span>}
                  </div>
                </div>
              </div>
              <div className="bureau-card-body">
                <h3 className="bureau-card-nom">{b.nom}</h3>
                <p className="bureau-card-desc">{b.description || '—'}</p>
                <div className="bureau-card-meta">
                  <span>Ordre : <strong>{b.ordre}</strong></span>
                </div>
              </div>
              <div className="bureau-card-actions" style={{ justifyContent: 'flex-end' }}>
                <button
                  className={`btn btn-icon ${b.actif ? 'btn-outline' : 'btn-success'}`}
                  style={!b.actif ? { backgroundColor: '#10b981', color: '#fff' } : {}}
                  onClick={() => handleToggle(b)}
                  title={b.actif ? 'Désactiver' : 'Activer'}
                >
                  <Power size={16} />
                </button>
                <button className="btn btn-outline btn-icon" onClick={() => { setEditBureau(b); setShowModal(true); }} title="Modifier">
                  <Pencil size={16} />
                </button>
                <button className="btn btn-danger btn-icon" onClick={() => handleDelete(b)} title="Supprimer">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <BureauModal
          bureau={editBureau}
          onClose={() => { setShowModal(false); setEditBureau(null); }}
          onSaved={handleSaved}
        />
      )}

      <style>{`
        .page-container { padding: 24px; max-width: 1200px; }
        .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 28px; }
        .page-title { font-size: 22px; font-weight: 800; color: #0f172a; display: flex; align-items: center; margin: 0 0 4px; }
        .page-subtitle { font-size: 14px; color: #64748b; margin: 0; }
        .bureaux-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 1024px) { .bureaux-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) { .bureaux-grid { grid-template-columns: 1fr; } }
        .bureau-card {
          border-radius: 18px; overflow: hidden; background: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s;
        }
        .bureau-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
        .bureau-card.inactive { opacity: 0.65; }
        .bureau-card-top {
          padding: 20px 16px; display: flex; align-items: center; gap: 14px; color: #fff;
        }
        .bureau-card-icon {
          width: 56px; height: 56px; background: rgba(255,255,255,0.25);
          border-radius: 16px; display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .bureau-card-code { font-size: 12px; font-weight: 700; opacity: 0.85; font-family: monospace; }
        .badge-inactive {
          display: inline-block; background: rgba(0,0,0,0.3); color: #fff;
          border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-top: 4px;
        }
        .bureau-card-body { padding: 16px; }
        .bureau-card-nom { font-size: 17px; font-weight: 800; color: #0f172a; margin: 0 0 6px; }
        .bureau-card-desc { font-size: 13px; color: #64748b; margin: 0 0 10px; line-height: 1.5; }
        .bureau-card-meta { font-size: 12px; color: #94a3b8; }
        .bureau-card-actions {
          display: flex; gap: 8px; padding: 12px 16px;
          border-top: 1px solid #f1f5f9; background: #fafbfc;
          flex-wrap: wrap;
        }
        .empty-state {
          grid-column: 1/-1; display: flex; flex-direction: column;
          align-items: center; gap: 16px; padding: 60px; color: #94a3b8;
        }
        .loading-box { display: flex; align-items: center; gap: 12px; padding: 40px; color: #64748b; }
        .spinner {
          width: 28px; height: 28px; border: 3px solid #e2e8f0;
          border-radius: 50%; border-top-color: #10b981;
          animation: spin 0.8s linear infinite; flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center; z-index: 1000;
        }
        .modal-card {
          background: #fff; border-radius: 20px; width: 560px; max-width: 95vw;
          max-height: 90vh; overflow: auto; box-shadow: 0 24px 48px rgba(0,0,0,0.2);
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px; 
        }
        .modal-header h3 { font-size: 18px; font-weight: 800; color: #0f172a; margin: 0; }
        .modal-body { padding: 20px 24px; }
        .modal-footer {
          display: flex; justify-content: flex-end; gap: 10px;
          padding: 16px 24px; border-top: 1px solid #f1f5f9;
        }
        .icon-close { background: none; border: none; cursor: pointer; color: #64748b; padding: 4px; }
        .alert-error {
          background: #fef2f2; color: #dc2626; border: 1.5px solid #fecaca;
          border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
        }
        .form-row { display: flex; gap: 14px; margin-bottom: 12px; }
        .form-col { flex: 1; display: flex; flex-direction: column; gap: 5px; }
        .form-col label { font-size: 12px; font-weight: 700; color: #374151; }
        .form-col input, .form-col select, .form-col textarea {
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          padding: 10px 12px; font-size: 13px; color: #0f172a;
          outline: none; font-family: inherit; resize: vertical;
        }
        .form-col input:focus, .form-col select:focus { border-color: #10b981; }
        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 9px 14px; border-radius: 10px; font-size: 13px;
          font-weight: 700; cursor: pointer; border: none; transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-primary { color: #fff; box-shadow: 0 3px 8px rgba(0,0,0,0.15); }
        .btn-primary:hover { filter: brightness(0.92); }
        .btn-outline { background: #fff; border: 1.5px solid #e2e8f0; color: #475569; }
        .btn-outline:hover { border-color: #10b981; color: #10b981; }
        .btn-danger { background: #fff; border: 1.5px solid #fecaca; color: #dc2626; }
        .btn-danger:hover { background: #fef2f2; }
        .btn-icon { padding: 9px; justify-content: center; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
