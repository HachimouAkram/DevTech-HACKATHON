import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { Plus, Trash, Save, ArrowLeft, GripVertical } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

export default function WorkflowBuilder({ activite, onClose }) {
  const [circuit, setCircuit] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Profils mock ou fetch, pour l'exemple
  const availableProfils = ["OFFICIER_ETAT_CIVIL", "MAIRE", "AGENT", "ARCHITECTE", "RESPONSABLE_URBANISME", "DIRECTEUR_TECHNIQUE"];

  async function fetchCircuit() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/workflow/circuit/activite/${activite.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCircuit(data);
        setSteps(data.steps || []);
      } else {
        // Pas de circuit existant
        setCircuit({ nom: `Circuit - ${activite.nom}` });
        setSteps([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activite) {
      fetchCircuit();
    }
  }, [activite]);

  const handleAddStep = () => {
    setSteps([...steps, { 
      ordre: steps.length + 1, 
      nom: '', 
      actionAttendue: 'validation', 
      typeSignature: '', 
      profilsAutorises: [], 
      documentRequis: false, 
      notificationEmail: true 
    }]);
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleRemoveStep = (index) => {
    const newSteps = steps.filter((_, i) => i !== index);
    // Reordonner
    newSteps.forEach((s, i) => s.ordre = i + 1);
    setSteps(newSteps);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nom: circuit?.nom || `Circuit - ${activite.nom}`,
        steps: steps.map((s, i) => ({ ...s, ordre: i + 1 }))
      };

      const res = await fetch(`${API_BASE_URL}/workflow/circuit/${activite.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        alert("Circuit sauvegardé avec succès");
        onClose();
      } else {
        alert("Erreur de sauvegarde");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'validation': return '#3b82f6';
      case 'signature': return '#8b5cf6';
      case 'finalisation': return '#10b981';
      default: return '#64748b';
    }
  };

  const getActionBg = (action) => {
    switch (action) {
      case 'validation': return '#eff6ff';
      case 'signature': return '#f5f3ff';
      case 'finalisation': return '#ecfdf5';
      default: return '#f8fafc';
    }
  };

  return (
    <ErrorBoundary>
      <div className="p-6 max-w-5xl mx-auto space-y-6" style={{ paddingBottom: '4rem' }}>
        <div className="flex justify-between items-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <button className="btn btn-secondary btn-icon" onClick={onClose} title="Retour" style={{ borderRadius: '50%' }}>
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold" style={{ margin: 0, color: 'var(--text-primary)' }}>Circuit de validation</h1>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Workflow : <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{activite?.nom}</span>
              </p>
            </div>
          </div>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', padding: '0.6rem 1.5rem', fontSize: '1rem', borderRadius: '12px' }}>
            <Save size={18} style={{ marginRight: '0.5rem' }} />
            {saving ? 'Enregistrement...' : 'Enregistrer le Circuit'}
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Étapes du Traitement</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Définissez l'ordre d'exécution, les actions attendues et les rôles autorisés pour chaque étape.</p>
            </div>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Ligne verticale de connexion */}
              {steps.length > 1 && (
                <div style={{ position: 'absolute', top: '2rem', bottom: '2rem', left: '23px', width: '3px', background: '#e2e8f0', zIndex: 0, borderRadius: '4px' }} />
              )}
              
              {steps.map((step, index) => {
                const actionColor = getActionColor(step.actionAttendue);
                const actionBg = getActionBg(step.actionAttendue);
                
                return (
                  <div key={index} style={{ 
                    position: 'relative', zIndex: 1, 
                    background: '#fff', 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0',
                    borderLeft: `5px solid ${actionColor}`,
                    display: 'flex', 
                    gap: '1.5rem', 
                    padding: '1.5rem',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                    transition: 'all 0.2s ease-in-out'
                  }}>
                    
                    {/* Indicateur de numéro */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ 
                        width: '46px', height: '46px', 
                        borderRadius: '50%', 
                        background: actionColor, 
                        color: '#fff', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: '1.25rem', fontWeight: 'bold', 
                        boxShadow: `0 0 0 6px ${actionBg}`,
                        zIndex: 2
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ color: '#cbd5e1', cursor: 'grab', padding: '0.5rem', borderRadius: '8px' }} className="hover-bg-light">
                        <GripVertical size={20} />
                      </div>
                    </div>
                    
                    {/* Contenu de l'étape */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ color: '#475569', fontWeight: '600' }}>Nom de l'étape *</label>
                        <input 
                          className="form-input" 
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}
                          value={step.nom} 
                          onChange={e => handleStepChange(index, 'nom', e.target.value)} 
                          placeholder="ex: Vérification des documents" 
                        />
                      </div>
                      
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ color: '#475569', fontWeight: '600' }}>Action Attendue *</label>
                        <select 
                          className="form-input form-select" 
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem', fontWeight: '500', color: actionColor }}
                          value={step.actionAttendue} 
                          onChange={e => handleStepChange(index, 'actionAttendue', e.target.value)}
                        >
                          <option value="validation">Validation / Vérification</option>
                          <option value="signature">Signature</option>
                          <option value="finalisation">Finalisation (Génération Document)</option>
                        </select>
                      </div>

                      {step.actionAttendue === 'signature' && (
                        <div className="form-group" style={{ margin: 0 }}>
                          <label className="form-label" style={{ color: '#475569', fontWeight: '600' }}>Type de Signature</label>
                          <select 
                            className="form-input form-select" 
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.75rem 1rem' }}
                            value={step.typeSignature} 
                            onChange={e => handleStepChange(index, 'typeSignature', e.target.value)}
                          >
                            <option value="individuelle">Individuelle (1 seul signataire)</option>
                            <option value="multiple">Multiple (Tous les rôles désignés)</option>
                          </select>
                        </div>
                      )}

                      <div className="form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                        <label className="form-label" style={{ color: '#475569', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Rôles / Profils Autorisés *</span>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 'normal' }}>Maintenez Ctrl pour sélection multiple</span>
                        </label>
                        <select 
                          multiple 
                          className="form-input" 
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '0.5rem', height: '100px', width: '100%' }}
                          value={step.profilsAutorises || []} 
                          onChange={e => {
                            const options = Array.from(e.target.options);
                            const selected = options.filter(o => o.selected).map(o => o.value);
                            handleStepChange(index, 'profilsAutorises', selected);
                          }}
                        >
                          {availableProfils.map(p => (
                            <option key={p} value={p} style={{ padding: '0.5rem 0.75rem', margin: '2px 0', borderRadius: '6px' }}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Actions de l'étape */}
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                      <button 
                        className="btn btn-danger btn-icon" 
                        onClick={() => handleRemoveStep(index)} 
                        title="Supprimer cette étape"
                        style={{ borderRadius: '10px', background: '#fef2f2', border: 'none' }}
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={handleAddStep} 
              style={{ 
                marginTop: '2rem', 
                width: '100%', 
                padding: '1.25rem', 
                border: '2px dashed #cbd5e1', 
                borderRadius: '16px', 
                background: '#f8fafc', 
                color: '#64748b', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.75rem', 
                fontSize: '1rem', 
                fontWeight: '600', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.color = 'var(--primary-color)'; e.currentTarget.style.background = '#f0fdf4'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#64748b'; e.currentTarget.style.background = '#f8fafc'; }}
            >
              <Plus size={20} /> Ajouter une Nouvelle Étape
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hover-bg-light:hover { background: #f1f5f9; }
        .form-input option:checked { background: var(--primary-color) linear-gradient(0deg, var(--primary-color) 0%, var(--primary-color) 100%); color: #fff; }
      `}</style>
    </ErrorBoundary>
  );
}
