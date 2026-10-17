import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Search, PlusCircle, Clock, CheckCircle2, Download,
  Eye, AlertCircle, ChevronRight, Filter, Calendar, X, RefreshCw
} from 'lucide-react';
import api from '../../utils/api';

export default function CitizenDemandesList({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [demandes, setDemandes] = useState([]);
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'EN_ATTENTE' | 'EN_COURS' | 'VALIDE' | 'REJETE' | 'EXPIRE'

  useEffect(() => {
    fetchDemandes();
  }, [user]);

  const fetchDemandes = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/demandes');
      const list = res?.data?.demandes || res?.data?.content || (Array.isArray(res?.data) ? res.data : []);
      setDemandes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Erreur chargement démarches:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'valide':
      case 'disponible':
      case 'pret':
        return { label: 'Prêt / Validé', bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' };
      case 'en_cours':
      case 'en_traitement':
      case 'signature':
      case 'verification_dossier':
        return { label: 'En cours', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
      case 'rejete':
        return { label: 'Rejeté', bg: '#fef2f2', color: '#dc2626', border: '#fecaca' };
      case 'hors_delais':
        return { label: 'Expiré', bg: '#f1f5f9', color: 'var(--c-text-muted, #64748b)', border: '#cbd5e1' };
      default:
        return { label: 'En attente', bg: '#fffbeb', color: '#d97706', border: '#fde68a' };
    }
  };

  const filteredDemandes = demandes.filter(d => {
    const actNom = d.activite_nom || d.activiteNom || d.activite?.nom || '';
    const centreNom = d.centre_nom || d.centreNom || d.centre?.nom || '';
    const ref = d.reference || '';

    const matchesSearch = ref.toLowerCase().includes(search.toLowerCase()) ||
                          actNom.toLowerCase().includes(search.toLowerCase()) ||
                          centreNom.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    // Filtrage par date spécifique
    if (filterDate) {
      const dateRaw = d.date_soumission || d.dateSoumission;
      if (dateRaw) {
        const itemDate = new Date(dateRaw).toISOString().split('T')[0];
        if (itemDate !== filterDate) return false;
      }
    }

    // Filtrage par onglet de statut
    if (activeTab === 'EN_ATTENTE') {
      return d.statut === 'en_attente';
    }
    if (activeTab === 'EN_COURS') {
      return ['en_cours', 'en_traitement', 'signature', 'verification_dossier'].includes(d.statut);
    }
    if (activeTab === 'VALIDE') {
      return ['valide', 'disponible', 'pret'].includes(d.statut);
    }
    if (activeTab === 'REJETE') {
      return d.statut === 'rejete';
    }
    if (activeTab === 'EXPIRE') {
      return d.statut === 'hors_delais';
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
            Mes Démarches & Suivi
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)', margin: 0 }}>
            Retrouvez tous vos dossiers d'état civil et suivez leur instruction officielle en direct
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => fetchDemandes(true)}
            title="Rafraîchir"
            style={{
              width: '40px',
              height: '40px',
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
            <RefreshCw size={17} className={refreshing ? 'animate-spin' : ''} />
          </button>

          <Link
            to="/citoyen/demande/nouvelle"
            style={{
              padding: '10px 20px',
              fontSize: '0.9rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: '700',
              boxShadow: '0 4px 14px rgba(37,99,235,0.25)'
            }}
          >
            <PlusCircle size={18} />
            <span>Nouvelle Demande</span>
          </Link>
        </div>
      </div>

      {/* ── FILTER & SEARCH STRIP ── */}
      <div style={{
        backgroundColor: 'var(--c-bg-card, #ffffff)',
        borderRadius: '20px',
        padding: '1.25rem',
        border: '1px solid var(--c-border, #e2e8f0)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        {/* Ligne 1 : Recherche texte + Sélecteur de date */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          {/* Recherche */}
          <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Rechercher par référence (DEC-...), type d'acte, centre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 1rem 0 2.5rem',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                fontSize: '0.88rem'
              }}
            />
          </div>

          {/* Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Calendar size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-muted, #64748b)' }} />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  height: '42px',
                  padding: '0 12px 0 34px',
                  borderRadius: '12px',
                  border: '1px solid var(--c-border, #cbd5e1)',
                  backgroundColor: filterDate ? '#eff6ff' : '#f8fafc',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: filterDate ? '#2563eb' : '#334155'
                }}
              />
            </div>
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate('')}
                title="Effacer la date"
                style={{
                  height: '42px',
                  padding: '0 10px',
                  borderRadius: '10px',
                  border: '1px solid var(--c-border, #cbd5e1)',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  color: 'var(--c-text-muted, #64748b)',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Effacer date
              </button>
            )}
          </div>
        </div>

        {/* Ligne 2 : Onglets de statuts complets demandés */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          {[
            { id: 'ALL', label: `Toutes (${demandes.length})` },
            { id: 'EN_ATTENTE', label: `En attente (${demandes.filter(d => d.statut === 'en_attente').length})` },
            { id: 'EN_COURS', label: `En cours (${demandes.filter(d => ['en_cours', 'en_traitement', 'signature', 'verification_dossier'].includes(d.statut)).length})` },
            { id: 'VALIDE', label: `Validées (${demandes.filter(d => ['valide', 'disponible', 'pret'].includes(d.statut)).length})` },
            { id: 'REJETE', label: `Rejetées (${demandes.filter(d => d.statut === 'rejete').length})` },
            { id: 'EXPIRE', label: `Expirées (${demandes.filter(d => d.statut === 'hors_delais').length})` }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: isActive ? '#2563eb' : '#ffffff',
                  color: isActive ? '#ffffff' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: isActive ? '800' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DEMANDES CARDS LIST ── */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--c-text-muted, #64748b)' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '4px solid #e2e8f0',
            borderTopColor: '#2563eb',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          Chargement de vos démarches...
        </div>
      ) : filteredDemandes.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
        }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: 'var(--c-bg-subtle, #f1f5f9)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: '#94a3b8' }}>
            <FileText size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
            Aucun dossier trouvé
          </h3>
          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
            {search || filterDate ? 'Aucune démarche ne correspond à vos filtres actuels.' : 'Vous n\'avez pas encore initié de demande sur votre espace citoyen.'}
          </p>
          <Link
            to="/citoyen/demande/nouvelle"
            style={{
              padding: '12px 24px',
              fontSize: '0.9rem',
              borderRadius: '12px',
              textDecoration: 'none',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontWeight: '700',
              display: 'inline-block'
            }}
          >
            Faire une nouvelle démarche
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredDemandes.map(d => {
            const badge = getStatusBadge(d.statut);
            const isReady = ['valide', 'disponible', 'pret'].includes(d.statut);
            const pdfUrl = `http://localhost:5000/api/demandes/${d.id}/pdf`;
            const actNom = d.activite_nom || d.activiteNom || d.activite?.nom || 'Acte d\'état civil';
            const cNom = d.centre_nom || d.centreNom || d.centre?.nom || 'Centre d\'état civil';
            const dateStr = d.date_soumission || d.dateSoumission;

            return (
              <div
                key={d.id}
                style={{
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  borderRadius: '20px',
                  padding: '1.25rem 1.5rem',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px', flex: 1 }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    backgroundColor: isReady ? '#ecfdf5' : '#eff6ff',
                    color: isReady ? '#059669' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                      {actNom}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '3px' }}>
                      <span style={{ fontWeight: '800', color: '#2563eb' }}>Réf : {d.reference}</span>
                      <span>•</span>
                      <span>{cNom}</span>
                      <span>•</span>
                      <span>{dateStr ? new Date(dateStr).toLocaleDateString('fr-FR') : 'Date récente'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.78rem',
                    fontWeight: '800',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`
                  }}>
                    {badge.label}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate(`/citoyen/demande/${d.id}`)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid var(--c-border, #cbd5e1)',
                      backgroundColor: 'var(--c-bg-card, #ffffff)',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      color: 'var(--c-text-primary, #334155)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Eye size={15} /> Voir le dossier
                  </button>

                  {isReady && (
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Download size={15} /> Télécharger
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
