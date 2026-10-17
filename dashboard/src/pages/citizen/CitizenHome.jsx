import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, PlusCircle, Search, Calendar, ArrowRight,
  Clock, CheckCircle2, ShieldCheck, AlertTriangle,
  Building2, Users, MapPin, ChevronRight, RefreshCw,
  Landmark, Sparkles, Heart, FileCheck, Award, X
} from 'lucide-react';
import api from '../../utils/api';

export default function CitizenHome({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [bureaux, setBureaux] = useState([]);
  const [recentDemandes, setRecentDemandes] = useState([]);
  const [stats, setStats] = useState({ total: 0, enCours: 0, valides: 0, rejetees: 0 });
  const [rdvCount, setRdvCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertModal, setAlertModal] = useState(null);

  useEffect(() => {
    fetchHomeData();
  }, [user]);

  const fetchHomeData = async () => {
    setLoading(true);
    try {
      const [bureauxRes, demandesRes, rdvRes] = await Promise.allSettled([
        api.get('/bureaux?t=' + Date.now()),
        api.get('/demandes'),
        api.get('/rendez-vous')
      ]);

      const bRaw = bureauxRes.status === 'fulfilled' ? (bureauxRes.value?.data?.bureaux || bureauxRes.value?.data || []) : [];
      const dRaw = demandesRes.status === 'fulfilled' ? (demandesRes.value?.data?.demandes || demandesRes.value?.data || []) : [];
      const rRaw = rdvRes.status === 'fulfilled' ? (rdvRes.value?.data?.rendezVous || rdvRes.value?.data || []) : [];

      const bList = Array.isArray(bRaw) ? bRaw : [];
      const dList = Array.isArray(dRaw) ? dRaw : [];
      const rList = Array.isArray(rRaw) ? rRaw : [];

      // Filtrage : demarches actives et externes (visibles citoyens)
      const activeBureaux = bList.filter(b => {
        if (b.actif === false) return false;
        if (b.config?.type_acces === 'interne' || b.config?.is_externe === false) return false;
        return true;
      });

      setBureaux(activeBureaux);
      setRecentDemandes(dList.slice(0, 4));
      setRdvCount(rList.length);

      // Calcul des KPI
      const enCoursCount = dList.filter(d => 
        ['en_cours', 'verification_dossier', 'en_traitement', 'signature', 'en_attente'].includes(d.statut)
      ).length;

      const validesCount = dList.filter(d => 
        ['valide', 'disponible', 'pret', 'valide_cloture'].includes(d.statut)
      ).length;

      const rejeteesCount = dList.filter(d => 
        ['rejete', 'hors_delais'].includes(d.statut)
      ).length;

      setStats({
        total: dList.length,
        enCours: enCoursCount,
        valides: validesCount,
        rejetees: rejeteesCount
      });
    } catch (err) {
      console.error('Erreur chargement accueil citoyen:', err);
    } finally {
      setLoading(false);
    }
  };

  // Couleurs de degrade et icones selon la demarche
  const getBureauConfig = (nom) => {
    const n = (nom || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (n.includes('civil') || n.includes('etat')) {
      return {
        colors: ['#2563eb', '#1d4ed8'],
        gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        badgeBg: 'rgba(37,99,235,0.12)',
        badgeColor: '#2563eb',
        icon: Landmark
      };
    }
    if (n.includes('urban') || n.includes('habitat') || n.includes('foncier')) {
      return {
        colors: ['#f59e0b', '#d97706'],
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        badgeBg: 'rgba(245,158,11,0.12)',
        badgeColor: '#d97706',
        icon: Building2
      };
    }
    if (n.includes('social') || n.includes('solidar') || n.includes('famille')) {
      return {
        colors: ['#ec4899', '#be185d'],
        gradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
        badgeBg: 'rgba(236,72,153,0.12)',
        badgeColor: '#be185d',
        icon: Users
      };
    }
    if (n.includes('fiscal') || n.includes('taxe') || n.includes('impot')) {
      return {
        colors: ['#8b5cf6', '#6d28d9'],
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
        badgeBg: 'rgba(139,92,246,0.12)',
        badgeColor: '#6d28d9',
        icon: FileText
      };
    }
    if (n.includes('populat') || n.includes('recens')) {
      return {
        colors: ['#a855f7', '#7e22ce'],
        gradient: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
        badgeBg: 'rgba(168,85,247,0.12)',
        badgeColor: '#7e22ce',
        icon: FileText
      };
    }
    return {
      colors: ['#059669', '#047857'],
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      badgeBg: 'rgba(5,150,105,0.12)',
      badgeColor: '#059669',
      icon: Award
    };
  };

  // Statut badge
  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'valide':
      case 'disponible':
      case 'pret':
      case 'valide_cloture':
        return { label: 'Prêt / Validé', bg: '#d1fae5', color: '#059669', border: '#a7f3d0' };
      case 'en_cours':
      case 'en_traitement':
      case 'verification_dossier':
        return { label: 'En cours de traitement', bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' };
      case 'signature':
        return { label: 'En attente de signature', bg: '#fce7f3', color: '#be185d', border: '#fbcfe8' };
      case 'rejete':
        return { label: 'Dossier rejeté', bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
      case 'hors_delais':
        return { label: 'Dossier expiré', bg: '#fef3c7', color: '#b45309', border: '#fde68a' };
      default:
        return { label: 'En attente de traitement', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
      }
    } catch (e) { /* ignore */ }
    return dateStr;
  };

  // Clic sur une demarche
  const handleBureauClick = (bureau) => {
    const sCount = bureau.services_count ?? (bureau.services ? bureau.services.length : null);
    if (sCount === 0) {
      setAlertModal({
        title: 'Bientôt disponible',
        message: 'La démarche « ' + bureau.nom + ' » n\'est pas encore configurée dans le système.\n\nNos services y travaillent activement.'
      });
      return;
    }

    const cfg = getBureauConfig(bureau.nom);
    navigate(
      '/citoyen/demande/nouvelle?bureauId=' + bureau.id +
      '&bureauNom=' + encodeURIComponent(bureau.nom) +
      '&bureauCouleur=' + encodeURIComponent(cfg.colors[0])
    );
  };

  // Filtrage par recherche
  const filteredBureaux = bureaux.filter(b => 
    b.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>
      
      {/* ── BANNIÈRE BIENVENUE HERO (Identique Screenshot 5) ── */}
      <div style={{
        background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
        borderRadius: '24px',
        padding: '2.5rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(37,99,235,0.25)'
      }}>
        {/* Cercles decoratifs d'ambiance */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-100px',
          left: '30%',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '800',
            margin: '0 0 10px',
            color: '#ffffff',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Bonjour, {user?.nom_complet || 'Citoyen'} 👋
          </h1>
          <p style={{
            fontSize: '0.96rem',
            color: 'rgba(255,255,255,0.92)',
            maxWidth: '680px',
            margin: '0 0 1.75rem',
            lineHeight: 1.55
          }}>
            Demandez vos actes d'état civil, certificats et documents administratifs en ligne. Suivez l'avancement en temps réel et téléchargez vos actes officiels signés.
          </p>

          {/* Deux boutons d'action dans la banniere (Identique Screenshot 5) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <Link
              to="/citoyen/demande/nouvelle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 22px',
                borderRadius: '14px',
                backgroundColor: '#ffffff',
                color: '#1d4ed8',
                fontWeight: '700',
                fontSize: '0.92rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
                transition: 'all 0.15s ease'
              }}
            >
              <PlusCircle size={17} color="#1d4ed8" />
              <span>Nouvelle Demande d'Acte</span>
            </Link>

            <Link
              to="/citoyen/demandes"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 22px',
                borderRadius: '14px',
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.92rem',
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <FileText size={17} color="#ffffff" />
              <span>Suivre mes dossiers ({stats.total})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── 4 CARTES D'ACCÈS RAPIDE (Identique Screenshot 5) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Carte 1: Nouvelle Demarche */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: 'var(--c-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: 'rgba(37,99,235,0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <PlusCircle size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
              Nouvelle Démarche
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--c-text-secondary, #64748b)', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              Initiez une demande d'acte civil en quelques clics avec pièces justificatives.
            </p>
          </div>
          <Link
            to="/citoyen/demande/nouvelle"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#2563eb',
              fontWeight: '700',
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            <span>Commencer</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Carte 2: Suivre mes Demandes */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: 'var(--c-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: 'rgba(16,185,129,0.1)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <FileCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
              Suivre mes Demandes
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--c-text-secondary, #64748b)', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              Consultez l'historique et l'avancement de vos dossiers en cours.
            </p>
          </div>
          <Link
            to="/citoyen/demandes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#10b981',
              fontWeight: '700',
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            <span>Voir l'historique ({stats.total})</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Carte 3: Rendez-vous Mairie */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: 'var(--c-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '14px',
              backgroundColor: 'rgba(245,158,11,0.1)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Calendar size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
              Rendez-vous Mairie
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--c-text-secondary, #64748b)', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              Prenez ou modifiez un créneau horaire pour retirer un acte physique au guichet.
            </p>
          </div>
          <Link
            to="/citoyen/rendez-vous"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#f59e0b',
              fontWeight: '700',
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            <span>Gérer mes RDV ({rdvCount})</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        {/* Carte 4: Assistant IA (24h/24) */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '20px',
          padding: '1.5rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: 'var(--c-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                backgroundColor: 'rgba(124,58,237,0.1)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={22} />
              </div>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: '800',
                backgroundColor: '#7c3aed',
                color: '#ffffff',
                padding: '3px 8px',
                borderRadius: '999px'
              }}>
                24h/24
              </span>
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
              Assistant IA
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--c-text-secondary, #64748b)', margin: '0 0 1.25rem', lineHeight: 1.45 }}>
              Posez toutes vos questions sur les démarches en Français et Wolof.
            </p>
          </div>
          <Link
            to="/citoyen/assistant-ia"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: '#7c3aed',
              fontWeight: '700',
              fontSize: '0.88rem',
              textDecoration: 'none'
            }}
          >
            <span>Ouvrir la discussion</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* ── BANDE KPI STATISTIQUES (Identique Screenshot 5) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem'
      }}>
        {/* KPI 1: Total */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '18px',
          padding: '1.15rem 1.25rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: 'var(--c-card-shadow)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'rgba(37,99,235,0.1)',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <FileText size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', lineHeight: 1 }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--c-text-muted, #64748b)', marginTop: '4px' }}>
              Total des demandes
            </div>
          </div>
        </div>

        {/* KPI 2: En cours */}
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '18px',
          padding: '1.15rem 1.25rem',
          border: '1px solid var(--c-border, #e2e8f0)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: 'var(--c-card-shadow)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'rgba(59,130,246,0.1)',
            color: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', lineHeight: 1 }}>
              {stats.enCours}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--c-text-muted, #64748b)', marginTop: '4px' }}>
              En cours de traitement
            </div>
          </div>
        </div>

        {/* KPI 3: Prêtes & Signees */}
        <div 
          onClick={() => navigate('/citoyen/actes')}
          style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '18px',
            padding: '1.15rem 1.25rem',
            border: '1px solid var(--c-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: 'var(--c-card-shadow)',
            transition: 'transform 0.15s ease'
          }}
          title="Consulter mes actes numériques"
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'rgba(16,185,129,0.1)',
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', lineHeight: 1 }}>
              {stats.valides}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--c-text-muted, #64748b)', marginTop: '4px' }}>
              Actes prêts & signés
            </div>
          </div>
        </div>

        {/* KPI 4: Rendez-vous */}
        <div 
          onClick={() => navigate('/citoyen/rendez-vous')}
          style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '18px',
            padding: '1.15rem 1.25rem',
            border: '1px solid var(--c-border, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            cursor: 'pointer',
            boxShadow: 'var(--c-card-shadow)'
          }}
          title="Gérer mes rendez-vous"
        >
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: 'rgba(245,158,11,0.1)',
            color: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', lineHeight: 1 }}>
              {rdvCount}
            </div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--c-text-muted, #64748b)', marginTop: '4px' }}>
              Rendez-vous programmés
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION DÉMARCHES ADMINISTRATIVES (REFONTE MODERNE & CLEAN) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 4px' }}>
              Démarches administratives
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-secondary, #64748b)', margin: 0 }}>
              Choisissez une démarche pour accéder aux services et formuler votre demande
            </p>
          </div>
        </div>

        {/* Barre de recherche */}
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher une démarche (État Civil, Urbanisme, etc.)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              height: '48px',
              padding: '0 1rem 0 2.75rem',
              borderRadius: '14px',
              border: '1px solid var(--c-border, #e2e8f0)',
              backgroundColor: 'var(--c-bg-input, #ffffff)',
              fontSize: '0.92rem',
              outline: 'none',
              color: 'var(--c-text-primary, #0f172a)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}
          />
        </div>

        {/* Grille moderne et aerée des demarches */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--c-text-secondary, #64748b)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 12px', color: '#2563eb' }} />
            <div>Chargement des démarches disponibles...</div>
          </div>
        ) : filteredBureaux.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '3rem 1rem',
            textAlign: 'center',
            border: '1px solid var(--c-border, #e2e8f0)',
            color: 'var(--c-text-secondary, #64748b)'
          }}>
            Aucune démarche ne correspond à votre recherche.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1.25rem'
          }}>
            {filteredBureaux.map((bureau) => {
              const cfg = getBureauConfig(bureau.nom);
              const BureauIcon = cfg.icon;
              const sCount = bureau.services_count ?? (bureau.services ? bureau.services.length : null);

              return (
                <div
                  key={bureau.id}
                  onClick={() => handleBureauClick(bureau)}
                  style={{
                    backgroundColor: 'var(--c-bg-card, #ffffff)',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    border: '1px solid var(--c-border, #e2e8f0)',
                    boxShadow: 'var(--c-card-shadow)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = cfg.colors[0];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--c-card-shadow)';
                    e.currentTarget.style.borderColor = 'var(--c-border, #e2e8f0)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '16px',
                      background: cfg.gradient,
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
                      flexShrink: 0
                    }}>
                      <BureauIcon size={24} />
                    </div>

                    <span style={{
                      backgroundColor: cfg.badgeBg,
                      color: cfg.badgeColor,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      fontSize: '0.74rem',
                      fontWeight: '800'
                    }}>
                      {sCount > 0 ? (sCount + ' services') : 'Voir tout'}
                    </span>
                  </div>

                  <div>
                    <h3 style={{
                      fontSize: '1.15rem',
                      fontWeight: '800',
                      color: 'var(--c-text-primary, #0f172a)',
                      margin: '0 0 6px',
                      lineHeight: 1.3
                    }}>
                      {bureau.nom}
                    </h3>
                    <p style={{
                      fontSize: '0.84rem',
                      color: 'var(--c-text-secondary, #64748b)',
                      margin: 0,
                      lineHeight: 1.45
                    }}>
                      {bureau.description || 'Démarches et formulaires officiels délivrés en ligne.'}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--c-border-subtle, #f1f5f9)',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    color: cfg.colors[0]
                  }}>
                    <span>Accéder aux services</span>
                    <ArrowRight size={15} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── SECTION DERNIÈRES DÉMARCHES SOUMISES (Identique Screenshot 2 & 5) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 4px' }}>
              Dernières démarches soumises
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-secondary, #64748b)', margin: 0 }}>
              Suivez l'état en direct de vos dossiers administratifs
            </p>
          </div>

          <Link
            to="/citoyen/demandes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.88rem',
              fontWeight: '700',
              color: '#2563eb',
              textDecoration: 'none'
            }}
          >
            <span>Voir tout</span>
            <ChevronRight size={16} />
          </Link>
        </div>

        {recentDemandes.length === 0 ? (
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '20px',
            padding: '3rem 2rem',
            textAlign: 'center',
            border: '1px solid var(--c-border, #e2e8f0)',
            boxShadow: 'var(--c-card-shadow)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: 'rgba(37,99,235,0.1)',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <FileText size={26} />
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
              Aucune démarche récente
            </h4>
            <p style={{ color: 'var(--c-text-secondary, #64748b)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              Vos demandes en cours et finalisées apparaîtront ici avec leur référence et leur suivi en direct.
            </p>
            <Link
              to="/citoyen/demande/nouvelle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.88rem',
                textDecoration: 'none'
              }}
            >
              <span>Initier une démarche</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentDemandes.map((demande) => {
              const statusCfg = getStatusBadge(demande.statut);
              const priceText = demande.montant_total > 0 
                ? (demande.montant_total + ' FCFA')
                : (demande.activite?.prix > 0 ? (demande.activite.prix + ' FCFA') : 'Gratuit');

              return (
                <div
                  key={demande.id}
                  onClick={() => navigate('/citoyen/demande/' + demande.id)}
                  style={{
                    backgroundColor: 'var(--c-bg-card, #ffffff)',
                    borderRadius: '20px',
                    padding: '1.25rem 1.5rem',
                    border: '1px solid var(--c-border, #e2e8f0)',
                    boxShadow: 'var(--c-card-shadow)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--c-border, #e2e8f0)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      backgroundColor: 'rgba(37,99,235,0.1)',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <FileText size={22} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--c-text-secondary, #64748b)', fontFamily: 'monospace' }}>
                          {demande.reference || ('DEC-' + demande.id)}
                        </span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          backgroundColor: statusCfg.bg,
                          color: statusCfg.color,
                          border: '1px solid ' + statusCfg.border
                        }}>
                          {statusCfg.label}
                        </span>
                      </div>

                      <h4 style={{
                        fontSize: '1.05rem',
                        fontWeight: '800',
                        color: 'var(--c-text-primary, #0f172a)',
                        margin: '0 0 2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {demande.activite?.nom || "Demande d'acte d'état civil"}
                      </h4>

                      <div style={{ fontSize: '0.8rem', color: 'var(--c-text-secondary, #64748b)' }}>
                        {demande.bureau?.nom || demande.service?.nom || 'Démarche citoyenne'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0, marginLeft: '12px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                        {priceText}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--c-text-muted, #94a3b8)' }}>
                        Soumis le {formatDate(demande.date_creation || demande.created_at)}
                      </div>
                    </div>

                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                      color: 'var(--c-text-secondary, #64748b)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODALE ALERTE SERVICE INDISPONIBLE ── */}
      {alertModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '20px',
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid var(--c-border, #e2e8f0)'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              backgroundColor: 'rgba(245,158,11,0.12)',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={26} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>
              {alertModal.title}
            </h3>

            <p style={{
              color: 'var(--c-text-secondary, #64748b)',
              fontSize: '0.9rem',
              lineHeight: 1.55,
              whiteSpace: 'pre-line',
              margin: '0 0 1.5rem'
            }}>
              {alertModal.message}
            </p>

            <button
              type="button"
              onClick={() => setAlertModal(null)}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontWeight: '700',
                fontSize: '0.9rem',
                cursor: 'pointer'
              }}
            >
              Compris
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
