import React from 'react';
import { X } from 'lucide-react';

export default function AssignModal({
  isOpen,
  onClose,
  assignStep,
  setAssignStep,
  assignLoading,
  assignUsers,
  selectedAssignUserId,
  setSelectedAssignUserId,
  onFetchAssignUsers,
  onSubmitAssign,
  availableProfiles
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Assigner pour signature</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: '1rem 0' }}>
          {assignStep === 1 && (
            <div>
              <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>À quel niveau souhaitez-vous envoyer ce document pour signature ?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {!availableProfiles ? (
                  <p style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)' }}>Vérification des disponibilités...</p>
                ) : (
                  <>
                    {availableProfiles.GERER_COMMUNE > 0 && (
                      <button className="btn btn-secondary" onClick={() => onFetchAssignUsers('GERER_COMMUNE')} style={{ textAlign: 'left', display: 'block', width: '100%', justifyContent: 'flex-start' }}>
                        🏛️ Au niveau de la Commune (Maire / Adjoint)
                      </button>
                    )}
                    {availableProfiles.GERER_CENTRE > 0 && (
                      <button className="btn btn-secondary" onClick={() => onFetchAssignUsers('GERER_CENTRE')} style={{ textAlign: 'left', display: 'block', width: '100%', justifyContent: 'flex-start' }}>
                        🏢 Au niveau du Centre (Officier d'état civil)
                      </button>
                    )}
                    {availableProfiles.GERER_BUREAU > 0 && (
                      <button className="btn btn-secondary" onClick={() => onFetchAssignUsers('GERER_BUREAU')} style={{ textAlign: 'left', display: 'block', width: '100%', justifyContent: 'flex-start' }}>
                        💼 Au niveau du Bureau (Gérant de bureau)
                      </button>
                    )}
                    {availableProfiles.GERER_SERVICES > 0 && (
                      <button className="btn btn-secondary" onClick={() => onFetchAssignUsers('GERER_SERVICES')} style={{ textAlign: 'left', display: 'block', width: '100%', justifyContent: 'flex-start' }}>
                        📑 Au niveau du Service (Chef de service)
                      </button>
                    )}
                    
                    {availableProfiles.GERER_COMMUNE === 0 && availableProfiles.GERER_CENTRE === 0 && availableProfiles.GERER_BUREAU === 0 && availableProfiles.GERER_SERVICES === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--danger)', padding: '1rem', fontWeight: 600 }}>Aucun signataire n'est disponible dans votre secteur géographique.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {assignStep === 2 && (
            <div>
              <button onClick={() => setAssignStep(1)} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 600 }}>
                ← Retour au choix du niveau
              </button>
              
              {assignLoading ? (
                <p style={{ textAlign: 'center', padding: '1rem' }}>Chargement des utilisateurs...</p>
              ) : assignUsers.length === 0 ? (
                <p style={{ color: 'var(--danger)', textAlign: 'center', padding: '1rem' }}>Aucun utilisateur trouvé pour ce niveau dans votre secteur.</p>
              ) : (
                <div className="form-group">
                  <label>Sélectionnez la personne à assigner :</label>
                  <select 
                    className="form-input" 
                    value={selectedAssignUserId} 
                    onChange={(e) => setSelectedAssignUserId(e.target.value)}
                    size={Math.min(assignUsers.length, 6)}
                    style={{ padding: '0.5rem', width: '100%' }}
                  >
                    <option value="" disabled style={{ fontStyle: 'italic', color: '#999', padding: '0.5rem' }}>-- Choisissez une personne --</option>
                    {assignUsers.map(u => (
                      <option key={u.id} value={u.id} style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                        {u.nom_complet}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
        {assignStep === 2 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={onClose}>Annuler</button>
            <button className="btn btn-primary" onClick={onSubmitAssign} disabled={assignLoading || !selectedAssignUserId}>
              {assignLoading ? 'Envoi...' : 'Envoyer à cette personne'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
