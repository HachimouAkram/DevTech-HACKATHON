import { API_BASE_URL } from '../../../utils/api.js';
import React from 'react';
import { X, Eye, DollarSign, ShieldAlert, Check, ClipboardCheck, XCircle } from 'lucide-react';

export default function DetailModal({
  isOpen,
  onClose,
  selectedDemande,
  getFieldLabel,
  getFieldValueLabel,
  token,
  currentUser,
  isOfficerOrAbove,
  isAgentOrAbove,
  isArchiviste,
  handleUpdateStatus,
  handleOpenAssignModal,
  handleOpenGenerateModal,
  handleOpenRejectModal,
  handleToggleArchive,
  handleWorkflowProgress,
  setPreviewFileUrl,
  handleConfirmTransfertReceipt,
  handleExpedierDocument,
  handleSendTransfertMessage
}) {
  const [newMessageText, setNewMessageText] = React.useState('');
  if (!isOpen || !selectedDemande) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Détails du Dossier : {selectedDemande.reference}</h3>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Informations Générales */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(0,0,0,0.015)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Citoyen</span>
              <div style={{ fontWeight: 600 }}>{selectedDemande.citoyen_nom}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedDemande.citoyen_telephone}</div>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Acte demandé</span>
              <div style={{ fontWeight: 600 }}>{selectedDemande.activite_nom}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedDemande.service_nom}</div>
              {selectedDemande.motif && (
                <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600, marginTop: '4px' }}>Motif: {selectedDemande.motif}</div>
              )}
            </div>
          </div>

          {/* Formulaire saisi / Données dynamiques */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Données Saisies par le Citoyen</h4>
            <div style={{
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              border: '1px solid var(--border-color)'
            }}>
              {selectedDemande.donnees && Object.keys(selectedDemande.donnees).length > 0 ? (
                Object.entries(selectedDemande.donnees).map(([key, val]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.03)', paddingBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{getFieldLabel(key)} :</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://') || val.includes('/upload/')) ? (
                        <a
                          href={val.startsWith('/') ? `${API_BASE_URL.replace('/api', '')}${val}` : val}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: 'var(--primary)', textDecoration: 'underline', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={14} /> Voir le fichier
                        </a>
                      ) : (val != null ? getFieldValueLabel(key, val.toString()) : '')}
                    </span>
                  </div>
                ))
              ) : (
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Aucune donnée saisie</span>
              )}
            </div>
          </div>

          {/* Paiement */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(16, 185, 129, 0.04)', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--primary)' }}>
            <DollarSign style={{ color: 'var(--primary)' }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Paiement Reçu : {selectedDemande.montant_paye?.toLocaleString()} CFA</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mode de paiement : <span style={{ textTransform: 'uppercase', fontWeight: 500 }}>{selectedDemande.mode_paiement?.replace('_', ' ')}</span></div>
            </div>
          </div>

          {/* Pièces Justificatives */}
          {selectedDemande.documents_url && Object.keys(selectedDemande.documents_url).some(k => selectedDemande.documents_url[k]) && (
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Pièces Justificatives fournies</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {Object.entries(selectedDemande.documents_url).map(([key, relativeUrl]) => {
                  if (!relativeUrl) return null;
                  const absoluteUrl = `${API_BASE_URL.replace('/api', '')}${relativeUrl}`;
                  const isPdf = relativeUrl.toLowerCase().endsWith('.pdf');
                  return (
                    <div key={key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-primary)',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>{isPdf ? '📄' : '📷'}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>
                            {key === 'cni' ? 'Carte d\'Identité (CNI)' : key === 'justificatif' ? 'Justificatif de Domicile/Filiation' : getFieldLabel(key)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {isPdf ? 'Format PDF' : 'Image/Photo'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setPreviewFileUrl(absoluteUrl)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}
                      >
                        Visualiser
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Traitement actuel */}
          {selectedDemande.statut === 'rejete' && selectedDemande.motif_rejet && (
            <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <ShieldAlert size={16} /> Motif du rejet :
              </div>
              <div style={{ fontSize: '0.9rem' }}>{selectedDemande.motif_rejet}</div>
            </div>
          )}

          {/* Logique de Retrait : Numérique vs Présentiel */}
          {(selectedDemande.statut === 'valide' || selectedDemande.statut === 'disponible' || selectedDemande.statut === 'pret') && (
            <>
              {(!selectedDemande.presence_physique_requise && selectedDemande.has_document_final) ? (
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#3b82f6' }}>📄 Acte d'état civil disponible</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Le document officiel au format PDF a été généré et signé.</div>
                  </div>
                  <a
                    href={`${API_BASE_URL}/demandes/${selectedDemande.id}/pdf?token=${token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ background: '#3b82f6', borderColor: '#3b82f6', textDecoration: 'none' }}
                  >
                    Télécharger le PDF
                  </a>
                </div>
              ) : (
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#d97706' }}>🏢 Retrait Physique Requis</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {selectedDemande.presence_physique_requise 
                        ? 'Cette démarche exige que le citoyen se présente physiquement pour récupérer l\'acte.'
                        : 'Aucun document numérique généré automatiquement. Le document papier doit être remis en mains propres.'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!selectedDemande.presence_physique_requise ? (
                      <a
                        href={`${API_BASE_URL}/demandes/${selectedDemande.id}/pdf?token=${token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{ background: '#10b981', borderColor: '#10b981', textDecoration: 'none', color: 'white' }}
                        title="Générer et télécharger le document manquant"
                      >
                        ⚙️ Générer Document
                      </a>
                    ) : (
                      <button
                        onClick={() => alert("La prise de rendez-vous est disponible dans l'application mobile citoyenne. La gestion des rendez-vous depuis le tableau de bord sera bientôt disponible.")}
                        className="btn btn-primary"
                        style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                      >
                        📅 Prendre Rendez-vous
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Module de Délivrance Décentralisée / Transfert */}
          {selectedDemande.centre_delivrance_id && selectedDemande.centre_delivrance_id !== selectedDemande.centre_id && (
            <div style={{ background: 'rgba(139, 92, 246, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.2)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    ✈️ Délivrance Décentralisée (Transfert)
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ce document doit être transféré du centre de traitement vers le centre de délivrance pour remise au citoyen.
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {/* Action Centre Traitement : Expédier */}
                  {currentUser?.centre_id === selectedDemande.centre_id && 
                   (selectedDemande.statut_transfert === 'pret_a_expedier' || selectedDemande.statut_transfert === 'en_attente_envoi') && (
                    <button 
                      onClick={() => handleExpedierDocument(selectedDemande.id)}
                      className="btn btn-primary"
                      disabled={!['valide', 'pret', 'valide_cloture'].includes(selectedDemande.statut)}
                      title={!['valide', 'pret', 'valide_cloture'].includes(selectedDemande.statut) ? "La demande doit d'abord être validée par l'officier." : "Expédier le document"}
                      style={{ 
                        background: ['valide', 'pret', 'valide_cloture'].includes(selectedDemande.statut) ? '#8b5cf6' : '#c4b5fd', 
                        borderColor: ['valide', 'pret', 'valide_cloture'].includes(selectedDemande.statut) ? '#8b5cf6' : '#c4b5fd', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem',
                        cursor: ['valide', 'pret', 'valide_cloture'].includes(selectedDemande.statut) ? 'pointer' : 'not-allowed'
                      }}
                    >
                      📤 Expédier le document
                    </button>
                  )}

                  {/* Action Centre Délivrance : Réceptionner */}
                  {currentUser?.centre_id === selectedDemande.centre_delivrance_id && 
                   selectedDemande.statut_transfert === 'en_transit' && (
                    <button 
                      onClick={() => handleConfirmTransfertReceipt(selectedDemande.id)}
                      className="btn btn-success"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      📥 Confirmer la réception
                    </button>
                  )}
                </div>
              </div>

              {/* Statuts et informations du transfert */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.5)', padding: '0.75rem', borderRadius: '6px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>De : Centre de Traitement</div>
                  <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{selectedDemande.centre_nom}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vers : Centre de Délivrance</div>
                  <div style={{ fontWeight: 500, color: '#8b5cf6' }}>{selectedDemande.centre_delivrance_nom}</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Statut du Transfert</div>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {selectedDemande.statut_transfert === 'en_attente_envoi' && <span style={{ color: '#f59e0b' }}>⏳ En attente de finalisation</span>}
                    {selectedDemande.statut_transfert === 'pret_a_expedier' && <span style={{ color: '#3b82f6' }}>📦 Prêt à être expédié</span>}
                    {selectedDemande.statut_transfert === 'en_transit' && <span style={{ color: '#8b5cf6' }}>🚚 En transit vers le centre de retrait</span>}
                    {selectedDemande.statut_transfert === 'recu' && <span style={{ color: '#10b981' }}>✅ Reçu au centre de retrait</span>}
                  </div>
                </div>
              </div>

              {/* Chat / Discussion de transfert (Officers and Admins only) */}
              {(isOfficerOrAbove || currentUser?.permissions?.includes('GERER_GLOBAL')) && (
                <div style={{ borderTop: '1px solid rgba(139, 92, 246, 0.2)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#8b5cf6', marginBottom: '0.5rem' }}>💬 Suivi et Communication inter-centres</div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '0.5rem' }}>
                    {selectedDemande.discussion_transfert && Array.isArray(selectedDemande.discussion_transfert) && selectedDemande.discussion_transfert.length > 0 ? (
                      selectedDemande.discussion_transfert.map((msg, idx) => (
                        <div key={idx} style={{ background: msg.centre === currentUser?.centre_nom ? 'rgba(139, 92, 246, 0.1)' : '#f8fafc', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{msg.auteur} <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>({msg.centre})</span></span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(msg.date).toLocaleString()}</span>
                          </div>
                          <div>{msg.message}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>Aucun message échangé pour le moment.</div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ajouter une note de suivi (ex: Document confié au transporteur X...)" 
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      style={{ flexGrow: 1, padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    />
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleSendTransfertMessage(selectedDemande.id, newMessageText)}
                      disabled={!newMessageText.trim()}
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
                    >
                      Envoyer
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Recours Banner */}
          {selectedDemande.statut === 'recours' && selectedDemande.motif_rejet && (
            <div style={{ background: 'rgba(124, 58, 237, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(124, 58, 237, 0.2)', color: '#7c3aed' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                ⚠️ Dossier rectifié (En Recours)
              </div>
              <div style={{ fontSize: '0.9rem' }}>Ce citoyen a modifié son dossier suite à un rejet. Motif de rejet initial : <strong>{selectedDemande.motif_rejet}</strong></div>
            </div>
          )}

          {/* Agent Alert Banner for Retour Officier */}
          {isAgentOrAbove && selectedDemande.statut === 'en_traitement' && selectedDemande.motif_rejet && (
            <div style={{ background: '#fff1f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecdd3', color: '#be123c', marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                ⚠️ Dossier refusé par l'officier
              </div>
              <div style={{ fontSize: '0.9rem' }}>Motif du refus : <strong>{selectedDemande.motif_rejet}</strong></div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#e11d48' }}>Vous pouvez maintenant corriger le dossier ou le rejeter définitivement au citoyen.</div>
            </div>
          )}

          {/* Actions de pied de modal - Workflow Dynamique */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            
            {selectedDemande.current_step_nom && selectedDemande.statut !== 'valide' && selectedDemande.statut !== 'valide_cloture' && selectedDemande.statut !== 'rejete' ? (
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Étape Actuelle du Workflow</span>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>{selectedDemande.current_step_ordre}. {selectedDemande.current_step_nom}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Action attendue : <strong>{selectedDemande.current_step_action}</strong></p>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleWorkflowProgress(selectedDemande.id)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <Check size={16} /> Valider et passer à l'étape suivante
                  </button>

                  {selectedDemande.current_step_action === 'finalisation' && (
                    <button
                      onClick={() => handleOpenGenerateModal(selectedDemande)}
                      className="btn btn-success"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <ClipboardCheck size={16} /> Générer ou Importer l'acte final
                    </button>
                  )}

                  {selectedDemande.current_step_ordre > 1 && (
                    <button
                      onClick={() => handleOpenRejectModal(selectedDemande.id)}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#eab308' }}
                    >
                      <XCircle size={16} /> Retour pour correction
                    </button>
                  )}

                  <button
                    onClick={() => handleOpenRejectModal(selectedDemande.id)}
                    className="btn btn-danger"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <X size={16} /> Rejeter définitivement
                  </button>
                </div>
              </div>
            ) : (
              /* Fallback vers les anciennes actions statiques si pas de workflow défini */
              ((isOfficerOrAbove && selectedDemande.statut !== 'valide' && selectedDemande.statut !== 'valide_cloture' && selectedDemande.statut !== 'rejete') || 
               (isAgentOrAbove && 
                ['en_attente', 'en_cours', 'verification_dossier', 'en_traitement', 'recours', 'hors_delais'].includes(selectedDemande.statut) &&
                (selectedDemande.statut === 'en_attente' || selectedDemande.statut === 'recours' || selectedDemande.statut === 'hors_delais' || selectedDemande.agent_id === currentUser.id || isOfficerOrAbove))) && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                  <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Faire progresser le dossier (Mode Classique) :</h5>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {selectedDemande.statut === 'en_attente' || selectedDemande.statut === 'recours' || (selectedDemande.statut === 'hors_delais' && !selectedDemande.agent_id) ? (
                      <button
                        onClick={() => { handleUpdateStatus(selectedDemande.id, 'en_cours'); }}
                        className="btn btn-primary"
                      >
                        <Check size={16} style={{ marginRight: '4px' }} />
                        Prendre en charge
                      </button>
                    ) : (
                      <>
                        {/* Progress buttons for Agent */}
                        {isAgentOrAbove && (
                          <>
                            <button
                              onClick={() => { handleUpdateStatus(selectedDemande.id, 'verification_dossier'); }}
                              className="btn btn-secondary"
                              style={{ 
                                background: selectedDemande.statut === 'verification_dossier' ? 'rgba(79, 70, 229, 0.15)' : '', 
                                color: selectedDemande.statut === 'verification_dossier' ? '#4f46e5' : '',
                                border: selectedDemande.statut === 'verification_dossier' ? '1px solid #4f46e5' : '',
                                fontSize: '0.85rem',
                                padding: '0.4rem 0.8rem'
                              }}
                            >
                              Vérification dossier
                            </button>
                            <button
                              onClick={() => { handleUpdateStatus(selectedDemande.id, 'en_traitement'); }}
                              className="btn btn-secondary"
                              style={{ 
                                background: selectedDemande.statut === 'en_traitement' ? 'rgba(13, 148, 136, 0.15)' : '', 
                                color: selectedDemande.statut === 'en_traitement' ? '#0d9488' : '',
                                border: selectedDemande.statut === 'en_traitement' ? '1px solid #0d9488' : '',
                                fontSize: '0.85rem',
                                padding: '0.4rem 0.8rem'
                              }}
                            >
                              En traitement
                            </button>
                            {/* Agent transmits signature/validation button (only when status is en_traitement) */}
                            {selectedDemande.statut === 'en_traitement' && (
                              <button
                                onClick={() => handleOpenAssignModal(selectedDemande.id)}
                                className="btn btn-primary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: '#db2777', borderColor: '#db2777' }}
                              >
                                ✉️ {selectedDemande.presence_physique_requise ? "Envoyer pour validation" : "Envoyer pour signature"}
                              </button>
                            )}
                          </>
                        )}

                        {/* Action Button: Officer Sign and Validate */}
                        {isOfficerOrAbove && (
                          selectedDemande.statut === 'pret' ? (
                            <button
                              onClick={() => handleOpenGenerateModal(selectedDemande)}
                              className="btn btn-success"
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', background: '#10b981', borderColor: '#10b981' }}
                            >
                              <ClipboardCheck size={16} style={{ marginRight: '4px' }} />
                              Générer l'acte final
                            </button>
                          ) : selectedDemande.statut === 'signature' ? (
                            <>
                              <button
                                onClick={() => { handleUpdateStatus(selectedDemande.id, 'valide'); }}
                                className="btn btn-success"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                              >
                                <ClipboardCheck size={16} style={{ marginRight: '4px' }} />
                                {selectedDemande.presence_physique_requise ? "✅ Valider la demande" : "🖋️ Valider & Signer"}
                              </button>
                              <button
                                onClick={() => handleOpenRejectModal(selectedDemande.id)}
                                className="btn btn-warning"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', color: '#fff' }}
                              >
                                <XCircle size={16} style={{ marginRight: '4px' }} />
                                Refuser (Retour à l'agent)
                              </button>
                            </>
                          ) : null
                        )}

                        {/* Rejeter Button: ONLY FOR AGENT */}
                        {isAgentOrAbove && (
                          <button
                            onClick={() => handleOpenRejectModal(selectedDemande.id)}
                            className="btn btn-danger"
                            style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                          >
                            <XCircle size={16} style={{ marginRight: '4px' }} />
                            Rejeter définitivement
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              {isArchiviste && ['valide', 'pret', 'disponible', 'valide_cloture'].includes(selectedDemande.statut) && (
                <button
                  className={selectedDemande.archive ? "btn btn-success" : "btn btn-secondary"}
                  onClick={() => handleToggleArchive(selectedDemande.id, selectedDemande.archive)}
                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  {selectedDemande.archive ? "📤 Désarchiver ce dossier" : "📥 Archiver ce dossier"}
                </button>
              )}
              <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
