import React from 'react';
import { X } from 'lucide-react';

export default function RejectModal({
  isOpen,
  onClose,
  motifRejet,
  setMotifRejet,
  rejectLoading,
  isOfficerOrAbove,
  onRetourAgent,
  onWorkflowReturn,
  onSubmitRejection
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Retour pour correction ou Rejet</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Motif ou Commentaire</label>
            <textarea
              required
              className="form-input"
              placeholder="Ex: Document justificatif manquant, signature illisible, etc."
              value={motifRejet}
              onChange={(e) => setMotifRejet(e.target.value)}
              style={{ height: '100px', resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={rejectLoading}>
              Annuler
            </button>
            {isOfficerOrAbove ? (
              <button type="button" className="btn btn-warning" onClick={onRetourAgent} disabled={rejectLoading}>
                {rejectLoading ? <div className="loading-spinner"></div> : null}
                <span>Confirmer le retour à l'agent</span>
              </button>
            ) : (
              <>
                <button type="button" className="btn btn-warning" onClick={onWorkflowReturn} disabled={rejectLoading}>
                  {rejectLoading ? <div className="loading-spinner"></div> : null}
                  <span>Retour pour correction</span>
                </button>
                <button type="button" className="btn btn-danger" onClick={onSubmitRejection} disabled={rejectLoading}>
                  {rejectLoading ? <div className="loading-spinner"></div> : null}
                  <span>Rejet définitif (au citoyen)</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
