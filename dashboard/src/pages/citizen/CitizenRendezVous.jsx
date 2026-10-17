import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, MapPin, FileText, ChevronRight, X,
  RotateCcw, AlertTriangle, CheckCircle2, QrCode, Printer,
  RefreshCw, Search, ShieldCheck, ArrowRight, ExternalLink
} from 'lucide-react';
import api from '../../utils/api';

const ALL_DAILY_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const isWeekend = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 0 || day === 6; // Dimanche ou Samedi
};

export default function CitizenRendezVous({ user }) {
  const navigate = useNavigate();

  const [rendezvous, setRendezvous] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('TOUS');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Modale Report
  const [reportingRdv, setReportingRdv] = useState(null);
  const [newRdvDate, setNewRdvDate] = useState('');
  const [newRdvHeure, setNewRdvHeure] = useState('');
  const [creneauxDispo, setCreneauxDispo] = useState([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  // Modale Annulation
  const [cancellingRdv, setCancellingRdv] = useState(null);
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Modale Ticket Officiel
  const [ticketRdv, setTicketRdv] = useState(null);

  // Message de confirmation / toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchRendezvous = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/rendez-vous/mes-rendez-vous');
      const list = res?.data || [];
      setRendezvous(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Erreur chargement rendez-vous:', err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRendezvous();
    const interval = setInterval(() => fetchRendezvous(true), 20000);
    return () => clearInterval(interval);
  }, [user]);

  // Chargement des créneaux pour report
  useEffect(() => {
    if (!reportingRdv || !newRdvDate || isWeekend(newRdvDate)) {
      setCreneauxDispo([]);
      setNewRdvHeure('');
      return;
    }

    const fetchCreneaux = async () => {
      setLoadingCreneaux(true);
      setReportError('');
      try {
        const cId = reportingRdv.centreId;
        const res = await api.get(`/rendez-vous/disponibilites?centreId=${cId}&date=${newRdvDate}`);
        const prises = (res.data || []).map(h => typeof h === 'string' ? h.substring(0, 5) : h);
        const dispo = ALL_DAILY_SLOTS.filter(slot => !prises.includes(slot));
        setCreneauxDispo(dispo);
      } catch (err) {
        console.warn('Erreur créneaux:', err);
        setCreneauxDispo(ALL_DAILY_SLOTS);
      } finally {
        setLoadingCreneaux(false);
      }
    };

    fetchCreneaux();
  }, [reportingRdv, newRdvDate]);

  // Soumission du report
  const handleConfirmReport = async () => {
    if (!reportingRdv || !newRdvDate || !newRdvHeure) {
      setReportError('Veuillez sélectionner une date valide et un horaire de passage.');
      return;
    }
    setSubmittingReport(true);
    setReportError('');
    try {
      await api.patch(`/rendez-vous/${reportingRdv.id}/reporter`, {
        date: newRdvDate,
        heure: newRdvHeure
      });
      showToast('Votre rendez-vous a été reporté avec succès.');
      setReportingRdv(null);
      setNewRdvDate('');
      setNewRdvHeure('');
      fetchRendezvous(true);
    } catch (err) {
      setReportError(err?.response?.data?.message || err.message || 'Impossible de reporter ce rendez-vous.');
    } finally {
      setSubmittingReport(false);
    }
  };

  // Soumission de l'annulation
  const handleConfirmCancel = async () => {
    if (!cancellingRdv) return;
    setSubmittingCancel(true);
    setCancelError('');
    try {
      await api.patch(`/rendez-vous/${cancellingRdv.id}/statut`, {
        statut: 'ANNULE'
      });
      showToast('Votre rendez-vous a bien été annulé.');
      setCancellingRdv(null);
      fetchRendezvous(true);
    } catch (err) {
      setCancelError(err?.response?.data?.message || err.message || "Erreur lors de l'annulation.");
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Styles de statut miroir mobile
  const getStatusStyle = (statut) => {
    const s = statut?.toUpperCase();
    switch (s) {
      case 'CONFIRME':
        return { color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', label: 'Confirmé' };
      case 'EFFECTUE':
        return { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', label: 'Effectué' };
      case 'ABSENT':
        return { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: 'Absent' };
      case 'ANNULE':
        return { color: '#94a3b8', bg: '#f1f5f9', border: '#e2e8f0', label: 'Annulé' };
      case 'REPORTE':
        return { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'Reporté' };
      default:
        return { color: 'var(--c-text-muted, #64748b)', bg: '#f1f5f9', border: '#e2e8f0', label: statut || 'En attente' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) return `${parts[0]}:${parts[1]}`;
    return timeStr;
  };

  // Filtrage combiné : statut + recherche + date
  const filteredRendezvous = rendezvous.filter((item) => {
    // 1. Statut
    if (activeFilter !== 'TOUS' && item.statut?.toUpperCase() !== activeFilter) {
      return false;
    }
    // 2. Date
    if (filterDate && item.date !== filterDate) {
      return false;
    }
    // 3. Recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const numMatch = (item.numeroRendezVous || '').toLowerCase().includes(q);
      const refMatch = (item.demandeReference || '').toLowerCase().includes(q);
      const actMatch = (item.activiteNom || '').toLowerCase().includes(q);
      const centreMatch = (item.centreNom || '').toLowerCase().includes(q);
      if (!numMatch && !refMatch && !actMatch && !centreMatch) return false;
    }
    return true;
  });

  // Calcul des compteurs
  const counts = {
    TOUS: rendezvous.length,
    CONFIRME: rendezvous.filter(r => r.statut?.toUpperCase() === 'CONFIRME').length,
    EFFECTUE: rendezvous.filter(r => r.statut?.toUpperCase() === 'EFFECTUE').length,
    ABSENT: rendezvous.filter(r => r.statut?.toUpperCase() === 'ABSENT').length,
    REPORTE: rendezvous.filter(r => r.statut?.toUpperCase() === 'REPORTE').length,
    ANNULE: rendezvous.filter(r => r.statut?.toUpperCase() === 'ANNULE').length,
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>

      {/* ── TOAST NOTIFICATION FLOTTANT ── */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#065f46',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          zIndex: 99999,
          fontWeight: '700',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} color="#a7f3d0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── EN-TÊTE PAGE RENDU MIROIR MOBILE ── */}
      <div style={{
        backgroundColor: 'var(--c-bg-card, #ffffff)',
        borderRadius: '24px',
        padding: '2rem',
        border: '1px solid var(--c-border, #e2e8f0)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: '800',
                padding: '3px 10px',
                borderRadius: '6px'
              }}>
                GUICHET OFFICIEL
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)' }}>
                République du Sénégal
              </span>
            </div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0, letterSpacing: '-0.02em' }}>
              Mes Rendez-vous en Mairie
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)', margin: '4px 0 0' }}>
              Suivez vos planifications, convocations physiques et tickets de passage au guichet
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => fetchRendezvous(true)}
              title="Rafraîchir les créneaux"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--c-text-muted, #64748b)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <Link
              to="/citoyen/demandes"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.88rem',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
              }}
            >
              <span>Suivre mes démarches</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* ── BARRE DE FILTRES D'ÉTATS HORIZONTAUX (MIROIR MOBILE) ── */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          borderTop: '1px solid #f1f5f9',
          paddingTop: '1.25rem'
        }}>
          {[
            { key: 'TOUS', label: 'Tous' },
            { key: 'CONFIRME', label: 'Confirmés' },
            { key: 'EFFECTUE', label: 'Effectués' },
            { key: 'REPORTE', label: 'Reportés' },
            { key: 'ABSENT', label: 'Absents' },
            { key: 'ANNULE', label: 'Annulés' },
          ].map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '999px',
                  border: `1.5px solid ${isActive ? '#2563eb' : '#e2e8f0'}`,
                  backgroundColor: isActive ? '#2563eb' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: isActive ? '#ffffff' : '#64748b'
                }}>
                  {counts[tab.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── RECHERCHE & FILTRE CALENDRIER ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher par N° ticket, réf dossier, démarche ou centre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 38px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                fontSize: '0.85rem',
                color: 'var(--c-text-primary, #334155)',
                outline: 'none'
              }}
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                  color: 'var(--c-text-muted, #64748b)',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Effacer date
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── ÉTAT DE CHARGEMENT ── */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--c-text-muted, #64748b)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid #e2e8f0',
            borderTopColor: '#2563eb',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>Chargement de vos convocations officielles...</span>
        </div>
      ) : rendezvous.length === 0 ? (
        /* ── ÉTAT VIDE GLOBAL ── */
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            backgroundColor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}>
            <Calendar size={32} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>
            Aucun rendez-vous planifié
          </h2>
          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
            Vos convocations et passages au guichet municipal s'afficheront ici dès que vos dossiers auront été instruits par nos agents civils.
          </p>
          <Link
            to="/citoyen/demandes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.92rem',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
            }}
          >
            <span>Consulter mes démarches</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : filteredRendezvous.length === 0 ? (
        /* ── ÉTAT AUCUN RÉSULTAT FILTRÉ ── */
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '3rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--c-border, #e2e8f0)'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '18px',
            backgroundColor: 'var(--c-bg-subtle, #f1f5f9)',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem'
          }}>
            <Search size={26} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
            Aucun rendez-vous trouvé
          </h3>
          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem', margin: 0 }}>
            Aucun rendez-vous ne correspond à vos critères de recherche actuels.
          </p>
          <button
            type="button"
            onClick={() => { setActiveFilter('TOUS'); setSearchQuery(''); setFilterDate(''); }}
            style={{
              marginTop: '1rem',
              padding: '8px 16px',
              borderRadius: '10px',
              border: '1px solid var(--c-border, #cbd5e1)',
              backgroundColor: 'var(--c-bg-card, #ffffff)',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : (
        /* ── GRILLE DES CARTES DE RENDEZ-VOUS ── */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
          gap: '1.25rem'
        }}>
          {filteredRendezvous.map((rv) => {
            const status = getStatusStyle(rv.statut);
            const canReport = ['CONFIRME', 'REPORTE'].includes(rv.statut?.toUpperCase());
            const canCancel = ['CONFIRME', 'REPORTE'].includes(rv.statut?.toUpperCase());

            return (
              <div
                key={rv.id}
                style={{
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  borderRadius: '22px',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Ligne En-tête Carte */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', letterSpacing: '-0.01em' }}>
                        RDV N° {rv.numeroRendezVous || rv.id}
                      </div>
                      {rv.demandeReference && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)', marginTop: '2px', fontFamily: 'monospace' }}>
                          Réf : {rv.demandeReference}
                        </div>
                      )}
                    </div>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.75rem',
                      fontWeight: '800',
                      backgroundColor: status.bg,
                      color: status.color,
                      border: `1px solid ${status.border}`,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {status.label}
                    </span>
                  </div>

                  <div style={{ height: '1px', backgroundColor: 'var(--c-bg-subtle, #f1f5f9)', margin: '10px 0 14px' }} />

                  {/* Détails du rendez-vous */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
                    {/* Activité */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={15} />
                      </div>
                      <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--c-text-primary, #1e293b)' }}>
                        {rv.activiteNom || 'Retrait de document civil'}
                      </span>
                    </div>

                    {/* Date */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--c-bg-subtle, #f8fafc)', color: 'var(--c-text-muted, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Calendar size={15} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-primary, #334155)', fontWeight: '600' }}>
                        {formatDate(rv.date)}
                      </span>
                    </div>

                    {/* Heure */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--c-bg-subtle, #f8fafc)', color: 'var(--c-text-muted, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Clock size={15} />
                      </div>
                      <span style={{ fontSize: '0.85rem', color: 'var(--c-text-primary, #334155)', fontWeight: '600' }}>
                        Créneau officiel : {formatTime(rv.heure)}
                      </span>
                    </div>

                    {/* Centre */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'var(--c-bg-subtle, #f8fafc)', color: 'var(--c-text-muted, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <MapPin size={15} />
                      </div>
                      <span style={{ fontSize: '0.84rem', color: 'var(--c-text-muted, #64748b)' }}>
                        {rv.centreNom || "Centre principal d'état civil"}
                      </span>
                    </div>
                  </div>

                  {/* Consignes officielles */}
                  <div style={{
                    backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                    borderRadius: '12px',
                    padding: '10px 12px',
                    fontSize: '0.78rem',
                    color: 'var(--c-text-muted, #64748b)',
                    lineHeight: 1.45,
                    border: '1px solid var(--c-border-subtle, #f1f5f9)',
                    marginBottom: '1rem'
                  }}>
                    Présentez-vous 10 min avant votre créneau muni de votre pièce d'identité physique et de ce ticket.
                  </div>
                </div>

                {/* Actions au bas de la carte */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Bouton Ticket QR */}
                    <button
                      type="button"
                      onClick={() => setTicketRdv(rv)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #dbeafe',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        cursor: 'pointer'
                      }}
                    >
                      <QrCode size={15} />
                      <span>Ticket officiel</span>
                    </button>

                    {/* Bouton Reporter */}
                    {canReport && (
                      <button
                        type="button"
                        onClick={() => {
                          setReportingRdv(rv);
                          setNewRdvDate(rv.date || '');
                          setNewRdvHeure('');
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '9px 12px',
                          borderRadius: '10px',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          border: '1px solid #fde68a',
                          fontWeight: '700',
                          fontSize: '0.82rem',
                          cursor: 'pointer'
                        }}
                      >
                        <RotateCcw size={14} />
                        <span>Reporter</span>
                      </button>
                    )}

                    {/* Bouton Annuler */}
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancellingRdv(rv)}
                        title="Annuler ce créneau"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          backgroundColor: '#fef2f2',
                          color: '#dc2626',
                          border: '1px solid #fee2e2',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  {/* Lien Voir la demande */}
                  {rv.demandeId && (
                    <Link
                      to={`/citoyen/demande/${rv.demandeId}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                        color: 'var(--c-text-secondary, #475569)',
                        fontSize: '0.8rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        border: '1px solid var(--c-border, #e2e8f0)'
                      }}
                    >
                      <span>Voir le dossier de demande</span>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── MODALE REPORT DE RENDEZ-VOUS ── */}
      {reportingRdv && (
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
            maxWidth: '520px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RotateCcw size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
                    Reporter le Rendez-vous
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)' }}>
                    RDV N° {reportingRdv.numeroRendezVous} • {reportingRdv.centreNom}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportingRdv(null)}
                style={{ background: 'none', border: 'none', color: 'var(--c-text-muted, #64748b)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {reportError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 14px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600' }}>
                {reportError}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                Choisir une nouvelle date (du Lundi au Vendredi)
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={newRdvDate}
                onChange={(e) => {
                  if (isWeekend(e.target.value)) {
                    setReportError('Les guichets de mairie sont fermés le week-end. Veuillez choisir du lundi au vendredi.');
                    setNewRdvDate('');
                    return;
                  }
                  setReportError('');
                  setNewRdvDate(e.target.value);
                }}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--c-border, #cbd5e1)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {newRdvDate && (
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '8px' }}>
                  Sélectionner un nouveau créneau horaire
                </label>
                {loadingCreneaux ? (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem' }}>
                    Recherche des créneaux disponibles...
                  </div>
                ) : creneauxDispo.length === 0 ? (
                  <div style={{ padding: '1rem', backgroundColor: '#fef2f2', borderRadius: '10px', textAlign: 'center', color: '#b91c1c', fontSize: '0.85rem' }}>
                    Aucun créneau libre pour cette date. Veuillez choisir un autre jour.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    {creneauxDispo.map(creneau => {
                      const isSelected = newRdvHeure === creneau;
                      return (
                        <button
                          key={creneau}
                          type="button"
                          onClick={() => setNewRdvHeure(creneau)}
                          style={{
                            padding: '8px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isSelected ? '#2563eb' : '#e2e8f0'}`,
                            backgroundColor: isSelected ? '#2563eb' : '#ffffff',
                            color: isSelected ? '#ffffff' : '#1e293b',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {creneau}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => setReportingRdv(null)}
                disabled={submittingReport}
                style={{ padding: '10px 18px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', backgroundColor: 'var(--c-bg-card, #ffffff)', fontWeight: '700', color: 'var(--c-text-secondary, #475569)', cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReport}
                disabled={submittingReport || !newRdvDate || !newRdvHeure}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.25)'
                }}
              >
                {submittingReport ? 'Report en cours...' : 'Confirmer le report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE CONFIRMATION ANNULATION ── */}
      {cancellingRdv && (
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
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
              Annuler ce rendez-vous ?
            </h3>
            <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              Voulez-vous vraiment annuler votre passage prévu le <strong>{formatDate(cancellingRdv.date)}</strong> à <strong>{formatTime(cancellingRdv.heure)}</strong> ? Vous devrez planifier un nouveau créneau pour retirer votre acte.
            </p>
            {cancelError && (
              <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '8px', borderRadius: '8px', fontSize: '0.82rem' }}>
                {cancelError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setCancellingRdv(null)}
                disabled={submittingCancel}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', backgroundColor: 'var(--c-bg-card, #ffffff)', fontWeight: '700', cursor: 'pointer' }}
              >
                Retour
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={submittingCancel}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', fontWeight: '800', cursor: 'pointer' }}
              >
                {submittingCancel ? 'Annulation...' : "Confirmer l'annulation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALE TICKET OFFICIEL DE CONVOCATION & QR CODE ── */}
      {ticketRdv && (
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
            maxWidth: '480px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            position: 'relative'
          }}>
            {/* Bouton fermer */}
            <button
              type="button"
              onClick={() => setTicketRdv(null)}
              style={{ position: 'absolute', right: '16px', top: '16px', background: 'none', border: 'none', color: 'var(--c-text-muted, #64748b)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* En-tête ticket officiel */}
            <div style={{ textAlign: 'center', borderBottom: '2px dashed #e2e8f0', paddingBottom: '1.25rem' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#ecfdf5', color: '#065f46', padding: '4px 12px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800', marginBottom: '8px' }}>
                <ShieldCheck size={14} />
                <span>RÉPUBLIQUE DU SÉNÉGAL • ÉTAT CIVIL</span>
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '4px 0 2px' }}>
                Ticket de Convocation Officiel
              </h2>
              <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)' }}>
                Présentation requise au guichet municipal
              </div>
            </div>

            {/* QR Code de vérification nationale */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
              borderRadius: '16px',
              padding: '1.25rem',
              border: '1px solid var(--c-border, #e2e8f0)'
            }}>
              <div style={{
                width: '130px',
                height: '130px',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                border: '2px solid #0f172a',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
              }}>
                <QrCode size={100} color="#0f172a" />
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#2563eb', marginTop: '10px', letterSpacing: '0.04em' }}>
                N° {ticketRdv.numeroRendezVous}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted, #64748b)', fontFamily: 'monospace' }}>
                Réf: {ticketRdv.demandeReference || ticketRdv.demandeId}
              </div>
            </div>

            {/* Informations récapitulatives */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Démarche :</span>
                <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{ticketRdv.activiteNom}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Date de passage :</span>
                <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{formatDate(ticketRdv.date)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Heure exacte :</span>
                <span style={{ fontWeight: '800', color: '#2563eb', fontSize: '0.92rem' }}>{formatTime(ticketRdv.heure)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
                <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Lieu / Guichet :</span>
                <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{ticketRdv.centreNom}</span>
              </div>
            </div>

            {/* Actions ticket */}
            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
              <button
                type="button"
                onClick={() => window.print()}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37,99,235,0.2)'
                }}
              >
                <Printer size={16} />
                <span>Imprimer le ticket</span>
              </button>
              <button
                type="button"
                onClick={() => setTicketRdv(null)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: '1px solid var(--c-border, #cbd5e1)',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  color: 'var(--c-text-secondary, #475569)',
                  fontWeight: '700',
                  fontSize: '0.88rem',
                  cursor: 'pointer'
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
