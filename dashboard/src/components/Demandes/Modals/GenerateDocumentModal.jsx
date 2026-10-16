import React from 'react';
import { X } from 'lucide-react';
import { API_BASE_URL } from '../../../utils/api.js';

export default function GenerateDocumentModal({
  isOpen,
  onClose,
  selectedDemande,
  templatesForActivity,
  selectedTemplate,
  setSelectedTemplate,
  generationLoading,
  generatedDocxUrl,
  finalUploadFile,
  setFinalUploadFile,
  onGenerate,
  onFinalUpload
}) {
  if (!isOpen || !selectedDemande) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Générer l'acte final</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '1rem 0' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Choisissez le modèle d'acte à utiliser pour la demande <strong>{selectedDemande.reference}</strong>.
          </p>
          
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Modèle applicable</label>
            {templatesForActivity.length === 0 ? (
              <div style={{ padding: '1rem', background: '#fffbeb', color: '#b45309', borderRadius: '4px', fontSize: '0.85rem' }}>
                Aucun modèle configuré pour cette activité. Veuillez en créer un dans "Modèles de Documents".
              </div>
            ) : (
              <select
                className="form-input form-select"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
              >
                <option value="">-- Sélectionner un modèle --</option>
                {templatesForActivity.map(t => (
                  <option key={t.id} value={t.id}>{t.nom} ({t.type})</option>
                ))}
              </select>
            )}
          </div>

          {!generatedDocxUrl && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
              <button 
                className="btn btn-success" 
                onClick={onGenerate}
                disabled={!selectedTemplate || generationLoading}
              >
                {generationLoading ? 'Génération...' : 'Générer'}
              </button>
            </div>
          )}

          {generatedDocxUrl && (
            <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '8px' }}>
              <h4 style={{ fontWeight: 600, color: '#1e3a8a', marginBottom: '0.5rem' }}>Document Word généré !</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Veuillez télécharger le document pour le signer ou le retoucher, puis importez la version PDF finale.
              </p>
              <div style={{ marginBottom: '1rem' }}>
                <a href={`${API_BASE_URL.replace('/api', '')}${generatedDocxUrl}`} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  📥 Télécharger le DOCX
                </a>
              </div>
              
              <div className="form-group">
                <label className="form-label">Fichier final (PDF)</label>
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="form-input" 
                  onChange={(e) => setFinalUploadFile(e.target.files[0])} 
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  className="btn btn-success" 
                  onClick={onFinalUpload}
                  disabled={!finalUploadFile || generationLoading}
                >
                  {generationLoading ? 'Enregistrement...' : 'Valider & Clôturer'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
