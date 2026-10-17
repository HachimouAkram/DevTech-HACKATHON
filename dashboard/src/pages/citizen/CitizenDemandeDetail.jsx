import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, CheckCircle2, Clock, ShieldCheck, Download,
  Eye, Calendar, MapPin, AlertCircle, X, ExternalLink, ChevronRight,
  Trash2, RefreshCw, Star, AlertTriangle, Building2, Check, Smartphone, Pencil, Save,
  CreditCard, Share2, HelpCircle
} from 'lucide-react';
import api from '../../utils/api';

const ALL_DAILY_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

const isWeekend = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6; // Dimanche ou Samedi
};

export default function CitizenDemandeDetail({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [demande, setDemande] = useState(null);
  const [error, setError] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Modification de la demande (uniquement si en_attente)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');

  // Visionneuse PDF et documents
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('Document officiel');

  // Rendez-vous
  const [rendezVous, setRendezVous] = useState(null);
  const [showBookingCard, setShowBookingCard] = useState(false);
  const [rdvDate, setRdvDate] = useState('');
  const [rdvHeure, setRdvHeure] = useState('');
  const [creneauxDispo, setCreneauxDispo] = useState([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);
  const [submittingRdv, setSubmittingRdv] = useState(false);

  // Report de rendez-vous
  const [isReporting, setIsReporting] = useState(false);
  const [newRdvDate, setNewRdvDate] = useState('');
  const [newRdvHeure, setNewRdvHeure] = useState('');
  const [newCreneauxDispo, setNewCreneauxDispo] = useState([]);
  const [loadingNewCreneaux, setLoadingNewCreneaux] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Évaluation citoyenne (1 à 5 étoiles)
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);

  // Chargement des données
  // Chargement des données
  const fetchDemandeDetails = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError('');

    try {
      let found = null;
      // 1. Essai de l'endpoint unitaire
      try {
        const res = await api.get('/demandes/' + id);
        found = res?.data?.demande || res?.data;
      } catch (errSingle) {
        // 2. Fallback robuste miroir mobile : récupération de la liste /demandes
        try {
          const resList = await api.get('/demandes');
          const list = resList?.data?.demandes || resList?.data?.content || (Array.isArray(resList?.data) ? resList.data : []);
          found = Array.isArray(list) ? list.find(d => String(d.id) === String(id) || String(d.reference) === String(id)) : null;
        } catch (errList) {
          console.warn('Fallback list error:', errList);
        }
      }

      if (found) {
        setDemande(found);
        if (found.evaluation_score) {
          setRating(found.evaluation_score);
        }
      } else {
        setError('Dossier introuvable');
      }

      // Récupérer le rendez-vous lié à cette demande
      try {
        const rvRes = await api.get('/rendez-vous/mes-rendez-vous');
        const list = Array.isArray(rvRes?.data) ? rvRes.data : (rvRes?.data?.rendezVous || []);
        const matched = list.find(r => String(r.demandeId || r.demande_id) === String(id) && r.statut !== 'ANNULE');
        setRendezVous(matched || null);
      } catch {
        // Optionnel
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erreur lors du chargement de la demande.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDemandeDetails();
  }, [id]);

  // Chargement des créneaux de rendez-vous
  const handleDateChange = async (dateVal, isNew = false) => {
    if (isNew) {
      setNewRdvDate(dateVal);
      setNewRdvHeure('');
    } else {
      setRdvDate(dateVal);
      setRdvHeure('');
    }

    if (!dateVal || isWeekend(dateVal)) return;

    const targetCentre = demande?.centre?.id || demande?.centre_id;
    if (!targetCentre) return;

    if (isNew) setLoadingNewCreneaux(true);
    else setLoadingCreneaux(true);

    try {
      const res = await api.get(`/rendez-vous/disponibilites?centreId=${targetCentre}&date=${dateVal}`);
      const rawData = Array.isArray(res?.data) ? res.data : (res?.data?.disponibilites || []);
      const formatted = rawData.map(t => {
        if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
        if (typeof t === 'string') return t.substring(0, 5);
        return String(t);
      });

      if (isNew) setNewCreneauxDispo(formatted.length > 0 ? formatted : ALL_DAILY_SLOTS);
      else setCreneauxDispo(formatted.length > 0 ? formatted : ALL_DAILY_SLOTS);
    } catch {
      if (isNew) setNewCreneauxDispo(ALL_DAILY_SLOTS);
      else setCreneauxDispo(ALL_DAILY_SLOTS);
    } finally {
      if (isNew) setLoadingNewCreneaux(false);
      else setLoadingCreneaux(false);
    }
  };

  // Réservation d'un rendez-vous
  const handleBookRdv = async () => {
    if (!rdvDate || !rdvHeure) return;
    setSubmittingRdv(true);
    setError('');

    try {
      const centreId = demande?.centre?.id || demande?.centre_id;
      const res = await api.post('/rendez-vous', {
        demandeId: Number(id),
        centreId: centreId,
        date: rdvDate,
        heure: rdvHeure
      });

      if (res?.data) {
        setShowBookingCard(false);
        fetchDemandeDetails(true);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Impossible de réserver ce créneau.');
    } finally {
      setSubmittingRdv(false);
    }
  };

  // Reporter un rendez-vous existant
  const handleRescheduleRdv = async () => {
    if (!newRdvDate || !newRdvHeure || !rendezVous) return;
    setSubmittingReport(true);
    setError('');

    try {
      await api.put(`/rendez-vous/${rendezVous.id}/reporter`, {
        date: newRdvDate,
        heure: newRdvHeure
      });
      setIsReporting(false);
      setNewRdvDate('');
      setNewRdvHeure('');
      fetchDemandeDetails(true);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Impossible de reporter à ce créneau.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Annuler un rendez-vous existant
  const handleCancelRdv = async () => {
    if (!rendezVous) return;
    if (!window.confirm("Êtes-vous sûr de vouloir annuler ce rendez-vous ? L'administration en sera notifiée.")) return;

    try {
      await api.put(`/rendez-vous/${rendezVous.id}/statut`, {
        statut: 'ANNULE'
      });
      setRendezVous(null);
      fetchDemandeDetails(true);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Impossible d'annuler le rendez-vous.");
    }
  };

  // Soumission de l'évaluation citoyenne
  const handleRatingSubmit = async (score) => {
    setRating(score);
    setSubmittingRating(true);

    try {
      await api.put(`/demandes/${id}/evaluate`, { score });
      setRatingSuccess(true);
      setTimeout(() => setRatingSuccess(false), 4000);
    } catch {
      // Tolérant si la route n'est pas encore migrée
    } finally {
      setSubmittingRating(false);
    }
  };

  // Modification d'une demande en attente via le formulaire dynamique complet
  const handleOpenEdit = () => {
    if (demande?.statut !== 'en_attente') {
      alert("Cette démarche ne peut plus être modifiée car elle est déjà prise en charge.");
      return;
    }
    navigate(`/citoyen/demande/nouvelle?editId=${demande.id}`);
  };

  const handleSaveEdit = async () => {
    setSavingEdit(true);
    setEditError('');
    setEditSuccess('');
    try {
      const payload = {
        activiteId: demande.activite?.id || demande.activiteId,
        centreId: demande.centre?.id || demande.centreId,
        centreDelivranceId: demande.centreDelivrance?.id || demande.centreDelivranceId || null,
        donnees: editForm,
        documentsUrl: demande.documents_url || demande.documentsUrl || {},
        motif: editForm.motif || demande.motif || 'Démarche citoyenne'
      };
      await api.put(`/demandes/${demande.id}`, payload);
      setDemande(prev => ({
        ...prev,
        donnees: editForm,
        motif: editForm.motif || prev.motif
      }));
      setEditSuccess('Modifications enregistrées avec succès.');
      setTimeout(() => {
        setEditModalOpen(false);
        setEditSuccess('');
        fetchDemandeDetails(true);
      }, 1000);
    } catch (err) {
      setEditError(err?.response?.data?.message || err.message || 'Erreur lors de la mise à jour.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteDemande = async () => {
    setDeleting(true);
    try {
      await api.delete(`/demandes/${id}`);
      navigate('/citoyen/demandes');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Impossible de supprimer cette demande.');
      setDeleteModalOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center', padding: '3rem' }}>
        <div style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          border: '4px solid #e2e8f0',
          borderTopColor: '#2563eb',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1.5rem'
        }} />
        <h3 style={{ color: 'var(--c-text-primary, #0f172a)', fontWeight: '800' }}>Chargement du dossier citoyen...</h3>
        <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.9rem' }}>Vérification des données administratives et du statut officiel</p>
      </div>
    );
  }

  if (error && !demande) {
    return (
      <div style={{ maxWidth: '600px', margin: '3rem auto', backgroundColor: 'var(--c-bg-card, #ffffff)', borderRadius: '24px', padding: '3rem 2rem', textAlign: 'center', border: '1px solid var(--c-border, #e2e8f0)' }}>
        <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>Dossier introuvable</h2>
        <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>{error}</p>
        <button
          onClick={() => navigate('/citoyen/demandes')}
          style={{ padding: '12px 24px', borderRadius: '12px', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', border: 'none', cursor: 'pointer' }}
        >
          Retour à mes démarches
        </button>
      </div>
    );
  }

  // ── LOGIQUE DES ÉTAPES DE PROGRESSION (MIRROIR MOBILE EXACT) ──
  const presenceRequise = Boolean(demande?.activite?.presence_physique_requise || demande?.presence_physique_requise);
  const hasTransfer = Boolean(demande?.centre_delivrance_id && demande.centre_delivrance_id !== demande.centre_id);

  // Libellé de statut
  const getStatusInfo = (statut) => {
    switch (statut) {
      case 'en_attente':
        return { label: 'En attente de traitement', color: '#f59e0b', bg: '#fef3c7', border: '#fde68a' };
      case 'en_cours':
        return { label: "Dossier en cours d'examen", color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' };
      case 'verification_dossier':
        return { label: 'Vérification des pièces', color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd' };
      case 'en_traitement':
        return { label: 'Dossier en cours de rédaction', color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe' };
      case 'signature':
        return { label: 'Acte en attente de signature', color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' };
      case 'pret':
      case 'valide':
      case 'disponible':
        return {
          label: presenceRequise ? 'Dossier prêt - Présentez-vous au centre' : 'Acte validé et certifié conforme',
          color: '#10b981',
          bg: '#ecfdf5',
          border: '#a7f3d0'
        };
      case 'rejete':
        return { label: 'Dossier rejeté', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
      default:
        return { label: statut, color: 'var(--c-text-muted, #64748b)', bg: '#f1f5f9', border: '#e2e8f0' };
    }
  };

  const statusInfo = getStatusInfo(demande?.statut || 'en_attente');
  const isReady = ['valide', 'pret', 'disponible'].includes(demande?.statut);

  // Définition de la liste des étapes
  const stepsList = presenceRequise
    ? (hasTransfer
        ? [
            { id: 1, title: 'Dossier soumis', desc: 'Votre demande a bien été enregistrée et payée.' },
            { id: 2, title: 'En cours', desc: 'Prise en charge de votre dossier par un agent.' },
            { id: 3, title: 'En traitement', desc: 'Un agent civil vérifie vos justificatifs et saisies.' },
            { id: 4, title: 'Rendez-vous', desc: 'Dépôt des pièces physiques au guichet du centre.' },
            { id: 5, title: 'En attente de signature', desc: "L'officier valide et signe l'acte d'état civil." },
            { id: 6, title: 'Expédié / En transit', desc: "L'acte a été signé et expédié vers votre centre de retrait." },
            { id: 7, title: 'Prêt', desc: "L'acte est arrivé au centre de retrait et est prêt à être récupéré." }
          ]
        : [
            { id: 1, title: 'Dossier soumis', desc: 'Votre demande a bien été enregistrée et payée.' },
            { id: 2, title: 'En cours', desc: 'Prise en charge de votre dossier par un agent.' },
            { id: 3, title: 'En traitement', desc: 'Un agent civil vérifie vos justificatifs et saisies.' },
            { id: 4, title: 'Rendez-vous', desc: 'Dépôt des pièces physiques au guichet du centre.' },
            { id: 5, title: 'En attente de signature', desc: "L'officier valide et signe l'acte d'état civil." },
            { id: 6, title: 'Prêt', desc: 'Votre acte est prêt. Vous pouvez le récupérer.' }
          ]
      )
    : (hasTransfer
        ? [
            { id: 1, title: 'Dossier soumis', desc: 'Votre demande a bien été enregistrée et payée.' },
            { id: 2, title: 'En cours', desc: 'Prise en charge de votre dossier par un agent.' },
            { id: 3, title: 'En traitement', desc: 'Un agent civil vérifie vos justificatifs et saisies.' },
            { id: 4, title: 'En attente de signature', desc: "L'officier valide et signe l'acte officiel." },
            { id: 5, title: 'Expédié / En transit', desc: "L'acte a été signé et expédié vers votre centre de retrait." },
            { id: 6, title: 'Prêt', desc: "L'acte est disponible au centre de retrait sélectionné." }
          ]
        : [
            { id: 1, title: 'Dossier soumis', desc: 'Votre demande a bien été enregistrée et payée.' },
            { id: 2, title: 'En cours', desc: 'Prise en charge de votre dossier par un agent.' },
            { id: 3, title: 'En traitement', desc: 'Un agent civil vérifie vos justificatifs et saisies.' },
            { id: 4, title: 'En attente de signature', desc: "L'officier valide et signe électroniquement l'acte." },
            { id: 5, title: 'Prêt', desc: 'Votre acte certifié est prêt et téléchargeable en ligne.' }
          ]
      );

  // Calcul du niveau atteint (1-indexé)
  const calculateCurrentStepLevel = () => {
    const s = demande?.statut;
    if (s === 'rejete') return 0;
    const hasActiveRdv = rendezVous && rendezVous.statut !== 'ANNULE';

    if (presenceRequise) {
      if (s === 'en_attente') return 1;
      if (s === 'en_cours') return 2;
      if (s === 'verification_dossier' || s === 'en_traitement') return hasActiveRdv ? 4 : 3;
      if (s === 'signature') return 5;
      if (s === 'pret' || s === 'valide' || s === 'disponible') {
        if (hasTransfer) return (demande?.statut_transfert === 'recu' || demande?.statutTransfert === 'recu') ? 7 : 6;
        return 6;
      }
      return 1;
    } else {
      if (s === 'en_attente') return 1;
      if (s === 'en_cours') return 2;
      if (s === 'verification_dossier' || s === 'en_traitement') return 3;
      if (s === 'signature') return 4;
      if (s === 'pret' || s === 'valide' || s === 'disponible') {
        if (hasTransfer) return (demande?.statut_transfert === 'recu' || demande?.statutTransfert === 'recu') ? 6 : 5;
        return 5;
      }
      return 1;
    }
  };

  const currentLevel = calculateCurrentStepLevel();
  const pdfDownloadUrl = `http://localhost:5000/api/demandes/${demande.id}/pdf`;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>

      {/* ── EN-TÊTE DÉTAIL DOSSIER ── */}
      <div style={{
        backgroundColor: 'var(--c-bg-card, #ffffff)',
        borderRadius: '24px',
        padding: '1.75rem 2rem',
        border: '1px solid var(--c-border, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              type="button"
              onClick={() => navigate('/citoyen/demandes')}
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text-secondary, #475569)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#2563eb', letterSpacing: '0.04em' }}>
                  RÉFÉRENCE OFFICIELLE :
                </span>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: '800',
                  color: 'var(--c-text-primary, #0f172a)',
                  backgroundColor: 'var(--c-bg-subtle, #f1f5f9)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--c-border, #e2e8f0)'
                }}>
                  {demande.reference || `DEC-${demande.id}`}
                </span>
              </div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '4px 0 0', letterSpacing: '-0.02em' }}>
                {demande.activite?.nom || demande.activite_nom || "Acte d'état civil"}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: '0.82rem',
              fontWeight: '800',
              backgroundColor: statusInfo.bg,
              color: statusInfo.color,
              border: `1px solid ${statusInfo.border}`
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: statusInfo.color }} />
              {statusInfo.label}
            </span>

            <button
              type="button"
              onClick={() => fetchDemandeDetails(true)}
              title="Rafraîchir"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text-muted, #64748b)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Message d'erreur local */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#b91c1c',
            fontSize: '0.85rem',
            fontWeight: '600'
          }}>
            <AlertCircle size={18} />
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {/* ── TIMELINE DE SUIVI EN TEMPS RÉEL (IMAGE 5 / MIROIR MOBILE) ── */}
      <div style={{
        backgroundColor: 'var(--c-bg-card, #ffffff)',
        borderRadius: '24px',
        padding: '2rem',
        border: '1px solid var(--c-border, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
              Suivi officiel de l'avancement
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--c-text-muted, #64748b)', margin: '3px 0 0' }}>
              Traçabilité en direct étape par étape auprès des officiers civils certifiés
            </p>
          </div>
          <span style={{
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            fontSize: '0.75rem',
            fontWeight: '800',
            padding: '4px 10px',
            borderRadius: '8px'
          }}>
            Étape {currentLevel} sur {stepsList.length}
          </span>
        </div>

        {/* Ligne chronologique des étapes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', position: 'relative' }}>
          {stepsList.map((stepItem, idx) => {
            const isCompleted = currentLevel > stepItem.id || (currentLevel === stepsList.length && stepItem.id === stepsList.length);
            const isActive = currentLevel === stepItem.id && currentLevel !== stepsList.length;
            const isPending = currentLevel < stepItem.id;
            const isLast = idx === stepsList.length - 1;

            return (
              <div key={stepItem.id} style={{ display: 'flex', gap: '1.25rem', position: 'relative' }}>
                {/* Colonne icône & ligne */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '38px', flexShrink: 0 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? '#10b981' : (isActive ? '#2563eb' : '#f1f5f9'),
                    color: isCompleted || isActive ? '#ffffff' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    boxShadow: isActive ? '0 0 0 5px rgba(37,99,235,0.18)' : 'none',
                    transition: 'all 0.2s ease',
                    zIndex: 2
                  }}>
                    {isCompleted ? <Check size={18} strokeWidth={3} /> : stepItem.id}
                  </div>
                  {!isLast && (
                    <div style={{
                      width: '3px',
                      flex: 1,
                      backgroundColor: isCompleted ? '#10b981' : '#e2e8f0',
                      minHeight: '44px',
                      margin: '4px 0'
                    }} />
                  )}
                </div>

                {/* Contenu de l'étape */}
                <div style={{ flex: 1, paddingBottom: isLast ? '0' : '1.75rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    <span style={{
                      fontSize: '1rem',
                      fontWeight: '800',
                      color: isActive ? '#2563eb' : (isCompleted ? '#0f172a' : '#64748b')
                    }}>
                      {stepItem.title}
                    </span>
                    {isActive && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        color: '#2563eb',
                        backgroundColor: '#eff6ff',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #bfdbfe'
                      }}>
                        En cours actuellement
                      </span>
                    )}
                    {isCompleted && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: '#10b981',
                        backgroundColor: '#ecfdf5',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        Validé
                      </span>
                    )}
                  </div>
                  <p style={{
                    fontSize: '0.85rem',
                    color: isPending ? '#94a3b8' : '#64748b',
                    margin: '4px 0 0',
                    lineHeight: 1.45
                  }}>
                    {stepItem.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── BANNIÈRE DOCUMENT OFFICIEL CERTIFIÉ PRÊT ── */}
      {isReady && (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: '24px',
          padding: '2.25rem',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(37,99,235,0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
            <div style={{ maxWidth: '580px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '0.78rem',
                fontWeight: '800',
                marginBottom: '12px',
                backdropFilter: 'blur(4px)'
              }}>
                <ShieldCheck size={16} color="#67e8f9" />
                <span>Format PDF Officiel • Certifié Conforme & Signé Électroniquement</span>
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 10px', lineHeight: 1.25 }}>
                Votre acte officiel est prêt et authentifié
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'rgba(255,255,255,0.92)', margin: 0, lineHeight: 1.55 }}>
                Cet extrait numérique a été signé électroniquement par l'officier municipal. Il comporte le cachet officiel et le QR code de vérification nationale de la République du Sénégal.
              </p>
            </div>

            {/* Boutons Visualiser & Télécharger */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '220px' }}>
              <button
                type="button"
                onClick={() => {
                  setPreviewPdfUrl(pdfDownloadUrl);
                  setPreviewTitle(demande.activite?.nom || "Acte d'état civil");
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  color: '#1e3a8a',
                  padding: '12px 22px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                <Eye size={18} color="#2563eb" />
                <span>Visualiser le Document</span>
              </button>

              <a
                href={pdfDownloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  padding: '12px 22px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Download size={18} />
                <span>Télécharger le PDF</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── GESTION CONTEXTUELLE DU RENDEZ-VOUS ── */}
      {/* 1. Affichage du Rendez-vous existant */}
      {rendezVous && (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '1.75rem',
          border: '2px solid #2563eb',
          boxShadow: '0 4px 16px rgba(37,99,235,0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
                  Votre Rendez-vous au Guichet
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)' }}>
                  Numéro : {rendezVous.numeroRendezVous || rendezVous.id}
                </span>
              </div>
            </div>

            <span style={{
              backgroundColor: '#ecfdf5',
              color: '#10b981',
              padding: '4px 12px',
              borderRadius: '999px',
              fontSize: '0.8rem',
              fontWeight: '800',
              border: '1px solid #a7f3d0'
            }}>
              {rendezVous.statut || 'Confirmé'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', backgroundColor: 'var(--c-bg-subtle, #f8fafc)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--c-border, #e2e8f0)' }}>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)', fontWeight: '700' }}>DATE RETENUE</span>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', marginTop: '2px' }}>
                {new Date(rendezVous.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)', fontWeight: '700' }}>HEURE</span>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
                {rendezVous.heure}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)', fontWeight: '700' }}>LIEU DU DÉPÔT</span>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', marginTop: '2px' }}>
                {rendezVous.centreNom || demande.centre?.nom || "Centre d'état civil"}
              </div>
            </div>
          </div>

          {/* Actions : Reporter ou Annuler */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setIsReporting(!isReporting)}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--c-bg-subtle, #f1f5f9)',
                color: 'var(--c-text-primary, #334155)',
                border: '1px solid var(--c-border, #cbd5e1)',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {isReporting ? 'Fermer le formulaire de report' : 'Reporter le rendez-vous'}
            </button>
            <button
              type="button"
              onClick={handleCancelRdv}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Annuler le rendez-vous
            </button>
          </div>

          {/* Formulaire de report intégré */}
          {isReporting && (
            <div style={{ backgroundColor: 'var(--c-bg-subtle, #f8fafc)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--c-border, #cbd5e1)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                Sélectionnez une nouvelle date disponible :
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <input
                  type="date"
                  value={newRdvDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDateChange(e.target.value, true)}
                  style={{ height: '42px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.88rem', backgroundColor: 'var(--c-bg-card, #ffffff)' }}
                />

                {newRdvDate && (
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    {loadingNewCreneaux ? (
                      <span style={{ fontSize: '0.82rem', color: '#2563eb' }}>Recherche des créneaux libres...</span>
                    ) : isWeekend(newRdvDate) ? (
                      <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: '600' }}>Le centre est fermé les week-ends.</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {newCreneauxDispo.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setNewRdvHeure(slot)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid ' + (newRdvHeure === slot ? '#2563eb' : '#cbd5e1'),
                              backgroundColor: newRdvHeure === slot ? '#2563eb' : '#ffffff',
                              color: newRdvHeure === slot ? '#ffffff' : '#334155',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {newRdvDate && newRdvHeure && (
                  <button
                    type="button"
                    onClick={handleRescheduleRdv}
                    disabled={submittingReport}
                    style={{
                      padding: '10px 18px',
                      borderRadius: '10px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.85rem',
                      fontWeight: '800',
                      cursor: 'pointer'
                    }}
                  >
                    {submittingReport ? 'Report en cours...' : 'Confirmer la nouvelle date'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. Prise de Rendez-vous : visible UNIQUEMENT quand l'étape de rendez-vous est venue (Étape >= 4) */}
      {presenceRequise && !rendezVous && !isReady && currentLevel >= 4 && (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '1.75rem',
          border: '1.5px dashed #2563eb',
          boxShadow: '0 4px 16px rgba(37,99,235,0.06)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
                  Prendre un rendez-vous au guichet
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)' }}>
                  Présence physique requise pour la vérification des originaux
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowBookingCard(!showBookingCard)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                backgroundColor: showBookingCard ? '#f1f5f9' : '#2563eb',
                color: showBookingCard ? '#475569' : '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              {showBookingCard ? 'Fermer' : 'Planifier mon passage'}
            </button>
          </div>

          {showBookingCard && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Date</label>
                  <input
                    type="date"
                    value={rdvDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => handleDateChange(e.target.value, false)}
                    style={{ height: '42px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.88rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
                  />
                </div>

                {rdvDate && (
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Créneaux disponibles</label>
                    {loadingCreneaux ? (
                      <span style={{ fontSize: '0.82rem', color: '#2563eb' }}>Chargement des créneaux...</span>
                    ) : isWeekend(rdvDate) ? (
                      <span style={{ fontSize: '0.82rem', color: '#ef4444', fontWeight: '600' }}>Fermé le week-end</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {creneauxDispo.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setRdvHeure(slot)}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid ' + (rdvHeure === slot ? '#2563eb' : '#cbd5e1'),
                              backgroundColor: rdvHeure === slot ? '#2563eb' : '#ffffff',
                              color: rdvHeure === slot ? '#ffffff' : '#334155',
                              fontSize: '0.82rem',
                              fontWeight: '700',
                              cursor: 'pointer'
                            }}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {rdvDate && rdvHeure && (
                  <button
                    type="button"
                    onClick={handleBookRdv}
                    disabled={submittingRdv}
                    style={{
                      padding: '12px 22px',
                      borderRadius: '10px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.88rem',
                      fontWeight: '800',
                      cursor: 'pointer',
                      marginTop: '18px'
                    }}
                  >
                    {submittingRdv ? 'Validation...' : 'Confirmer le Rendez-vous'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GRILLE DES DONNÉES DU DOSSIER & PIÈCES JUSTIFICATIVES ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {/* Carte Données déclarées */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '1.75rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
            Données du dossier
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Service émetteur :</span>
              <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{demande.service_nom || demande.service?.nom || 'État Civil'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Centre de dépôt :</span>
              <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{demande.centre?.nom || demande.centre_nom || "Centre d'état civil"}</span>
            </div>

            {hasTransfer && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Centre de retrait délocalisé :</span>
                <span style={{ fontWeight: '700', color: '#7c3aed' }}>
                  {demande.centreDelivrance?.nom || demande.centre_delivrance_nom || 'Centre de retrait'}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Mode de règlement :</span>
              <span style={{ fontWeight: '700', color: '#2563eb', textTransform: 'uppercase' }}>
                {demande.modePaiement || demande.mode_paiement || 'Wave'}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Montant acquitté :</span>
              <span style={{ fontWeight: '800', color: '#10b981' }}>
                {demande.montantPaye ? `${Number(demande.montantPaye).toLocaleString('fr-FR')} FCFA` : 'Gratuit'}
              </span>
            </div>

            {/* Champs dynamiques soumis */}
            {demande.donnees && Object.entries(demande.donnees).map(([k, v]) => {
              if (k.startsWith('_')) return null;
              return (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--c-text-muted, #64748b)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')} :</span>
                  <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{String(v)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Carte Pièces justificatives transmises */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '1.75rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
            Pièces justificatives transmises
          </h3>

          {demande.documentsUrl && Object.keys(demande.documentsUrl).filter(k => !k.startsWith('_')).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(demande.documentsUrl).map(([k, rawUrl]) => {
                if (k.startsWith('_')) return null;
                const url = typeof rawUrl === 'string' ? rawUrl : rawUrl?.url;
                if (!url) return null;

                return (
                  <div
                    key={k}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                      border: '1px solid var(--c-border, #e2e8f0)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <FileText size={20} color="#2563eb" />
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--c-text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {k.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewPdfUrl(url);
                          setPreviewTitle(k);
                        }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--c-border, #cbd5e1)',
                          backgroundColor: 'var(--c-bg-card, #ffffff)',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          color: 'var(--c-text-primary, #334155)',
                          cursor: 'pointer'
                        }}
                      >
                        Visualiser
                      </button>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          backgroundColor: '#2563eb',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          textDecoration: 'none'
                        }}
                      >
                        Ouvrir
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
              borderRadius: '14px',
              padding: '1.5rem',
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '0.86rem'
            }}>
              Aucun document justificatif téléversé pour ce dossier.
            </div>
          )}
        </div>
      </div>

      {/* ── ÉVALUATION DU SERVICE CITOYEN (MIROIR MOBILE 5 ÉTOILES) ── */}
      {isReady && (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '2rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
            Évaluation de votre expérience citoyenne
          </h3>
          <p style={{ fontSize: '0.86rem', color: 'var(--c-text-muted, #64748b)', margin: 0 }}>
            Comment évaluez-vous la rapidité et le traitement de votre demande par nos services ?
          </p>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => handleRatingSubmit(star)}
                disabled={submittingRating}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  color: star <= rating ? '#f59e0b' : '#cbd5e1',
                  transition: 'transform 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Star size={34} fill={star <= rating ? '#f59e0b' : 'none'} />
              </button>
            ))}
          </div>

          {ratingSuccess && (
            <div style={{ color: '#10b981', fontSize: '0.86rem', fontWeight: '700' }}>
              Merci pour votre évaluation ! Votre avis contribue à améliorer les services publics.
            </div>
          )}
        </div>
      )}

      {/* ── ACTIONS CITOYEN : MODIFIER OU SUPPRIMER LA DEMANDE (SI EN ATTENTE) ── */}
      {demande.statut === 'en_attente' && (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '20px',
          padding: '1.25rem 1.75rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginTop: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
              Dossier modifiable & annulable
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--c-text-muted, #64748b)', marginTop: '2px' }}>
              Votre demande est en cours d'attente de prise en charge. Vous pouvez corriger vos informations ou annuler le dossier.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={handleOpenEdit}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
              }}
            >
              <Pencil size={16} />
              <span>Modifier les informations</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                border: '1px solid #fee2e2',
                fontWeight: '700',
                fontSize: '0.88rem',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} />
              <span>Supprimer le dossier</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODALE SUPPRESSION ── */}
      {deleteModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Trash2 size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
              Confirmer la suppression
            </h3>
            <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir supprimer définitivement votre dossier <strong>{demande.reference}</strong> ? Cette action est irréversible.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  fontWeight: '700',
                  color: 'var(--c-text-secondary, #475569)',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteDemande}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: '800',
                  cursor: 'pointer'
                }}
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ── MODALE VISIONNEUSE OFFICIELLE PDF & DOCUMENTS ── */}
      {previewPdfUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '24px',
            maxWidth: '960px',
            width: '95%',
            height: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: 'var(--c-bg-card, #ffffff)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FileText size={20} color="#2563eb" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
                  {previewTitle}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={previewPdfUrl}
                  download="document_officiel.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={15} />
                  <span>Télécharger</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewPdfUrl(null)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    backgroundColor: 'var(--c-bg-card, #ffffff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--c-text-muted, #64748b)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, backgroundColor: 'var(--c-bg-subtle, #f1f5f9)', padding: '1rem' }}>
              <object
                data={previewPdfUrl}
                type="application/pdf"
                style={{ width: '100%', height: '100%', borderRadius: '12px', border: 'none' }}
              >
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <FileText size={48} color="#2563eb" style={{ margin: '0 auto 1rem' }} />
                  <h4 style={{ fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>Aperçu du document</h4>
                  <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Votre navigateur ne prend pas en charge la visionneuse intégrée.
                  </p>
                  <a
                    href={previewPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      backgroundColor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: '700',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>Ouvrir dans un nouvel onglet</span>
                  </a>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
