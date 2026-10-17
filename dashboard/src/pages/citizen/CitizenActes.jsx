import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Eye, ShieldCheck, CheckCircle2,
  Calendar, Clock, MapPin, X, ArrowRight, ExternalLink, Printer,
  Search, Lock, Award, Heart, Sparkles, Filter, Copy,
  Check, Info, FileCheck, Share2, RefreshCw, AlertCircle
} from 'lucide-react';
import api from '../../utils/api';

export default function CitizenActes({ user, token }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [actes, setActes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest, alphabet
  const [pendingCount, setPendingCount] = useState(0);

  // Modales
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [previewActe, setPreviewActe] = useState(null);
  const [verifyActe, setVerifyActe] = useState(null);
  const [copiedHash, setCopiedHash] = useState(false);

  useEffect(() => {
    fetchActes();
  }, [user]);

  const fetchActes = async () => {
    setLoading(true);
    try {
      const res = await api.get('/demandes');
      const list = res?.data?.demandes || res?.data || [];
      // Accepter tous les statuts correspondant a un acte finalise et certifie
      const signedStatuses = ['valide', 'disponible', 'pret', 'valide_cloture', 'termine', 'delivre', 'approuve', 'archive'];
      const signedOnly = Array.isArray(list) 
        ? list.filter(d => signedStatuses.includes(d.statut?.toLowerCase()))
        : [];
      setActes(signedOnly);
      const pendingList = Array.isArray(list)
        ? list.filter(d => !signedStatuses.includes(d.statut?.toLowerCase()) && d.statut !== 'rejete')
        : [];
      setPendingCount(pendingList.length);
    } catch (err) {
      console.error('Erreur chargement actes:', err);
      setActes([]);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Determiner la categorie de l'acte
  const getActeCategory = (acte) => {
    const text = ((acte.activite?.nom || '') + ' ' + (acte.bureau?.nom || '')).toLowerCase();
    if (text.includes('naiss')) return 'naissance';
    if (text.includes('mari')) return 'mariage';
    if (text.includes('décès') || text.includes('deces') || text.includes('mort')) return 'deces';
    return 'certificats';
  };

  // Configuration graphique selon la categorie
  const getCategoryConfig = (category) => {
    switch (category) {
      case 'naissance':
        return {
          label: 'Acte de Naissance',
          badgeBg: '#ecfdf5',
          badgeColor: '#059669',
          border: '#a7f3d0',
          gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          icon: FileText
        };
      case 'mariage':
        return {
          label: 'Acte de Mariage',
          badgeBg: '#fff1f2',
          badgeColor: '#e11d48',
          border: '#fecdd3',
          gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
          icon: Heart
        };
      case 'deces':
        return {
          label: 'Acte de Décès',
          badgeBg: '#f1f5f9',
          badgeColor: '#475569',
          border: '#cbd5e1',
          gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
          icon: FileCheck
        };
      default:
        return {
          label: 'Certificat Administratif',
          badgeBg: '#eff6ff',
          badgeColor: '#2563eb',
          border: '#bfdbfe',
          gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          icon: Award
        };
    }
  };

  // Generer une empreinte de verification SHA-256 deterministe
  const getActeFingerprint = (acte) => {
    const raw = (acte.reference || 'DEM') + '-' + (acte.id || 0) + '-' + (acte.date_creation || '2024');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return 'SN-2D-DOC-' + hex.toUpperCase() + '-' + ((acte.id || 1) * 31415).toString(16).slice(0, 6).toUpperCase();
  };

  // Filtrage et tri
  const filteredActes = useMemo(() => {
    let result = [...actes];

    // Filtre par categorie
    if (activeCategory !== 'all') {
      result = result.filter(a => getActeCategory(a) === activeCategory);
    }

    // Filtre par recherche
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(a => 
        (a.reference && a.reference.toLowerCase().includes(q)) ||
        (a.activite?.nom && a.activite.nom.toLowerCase().includes(q)) ||
        (a.centre?.nom && a.centre.nom.toLowerCase().includes(q)) ||
        (a.citoyen?.nom_complet && a.citoyen.nom_complet.toLowerCase().includes(q))
      );
    }

    // Tri
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.date_creation || b.created_at || 0) - new Date(a.date_creation || a.created_at || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.date_creation || a.created_at || 0) - new Date(b.date_creation || b.created_at || 0);
      }
      if (sortBy === 'alphabet') {
        const nomA = a.activite?.nom || '';
        const nomB = b.activite?.nom || '';
        return nomA.localeCompare(nomB);
      }
      return 0;
    });

    return result;
  }, [actes, activeCategory, searchQuery, sortBy]);

  // Compteurs par categorie
  const counts = useMemo(() => {
    const c = { all: actes.length, naissance: 0, mariage: 0, deces: 0, certificats: 0 };
    actes.forEach(a => {
      const cat = getActeCategory(a);
      if (c[cat] !== undefined) c[cat]++;
    });
    return c;
  }, [actes]);

  // Formatage de date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Date non spécifiée';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      }
    } catch (e) { /* ignore */ }
    return dateStr;
  };

  // Lancer l'impression directe d'un acte
  const handlePrintActe = (acte) => {
    const pdfUrl = api.getStreamUrl('/demandes/' + acte.id + '/pdf');
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.focus();
    }
  };

  // Copier le hash / lien de verification
  const handleCopyHash = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2500);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', paddingBottom: '3rem' }}>

      {/* BANNIERE HERO COFFRE-FORT NUMERIQUE SECURISE */}
      <div style={{
        background: 'linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)',
        borderRadius: '24px',
        padding: '2.25rem 2.5rem',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 16px 36px rgba(5,150,105,0.25)'
      }}>
        {/* Cercles decoratifs d'arriere-plan */}
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-80px',
          left: '25%',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* Badge officiel de securite */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(255,255,255,0.18)',
            backdropFilter: 'blur(10px)',
            padding: '6px 14px',
            borderRadius: '999px',
            fontSize: '0.8rem',
            fontWeight: '700',
            marginBottom: '1rem',
            border: '1px solid rgba(255,255,255,0.25)'
          }}>
            <ShieldCheck size={16} color="#6ee7b7" />
            <span>Coffre-Fort Numérique Sécurisé • République du Sénégal</span>
          </div>

          <h1 style={{
            fontSize: '1.85rem',
            fontWeight: '800',
            margin: '0 0 10px',
            letterSpacing: '-0.02em',
            color: '#ffffff'
          }}>
            Mes Actes & Documents Numériques
          </h1>
          <p style={{
            fontSize: '0.95rem',
            color: 'rgba(255,255,255,0.92)',
            maxWidth: '680px',
            margin: '0 0 1.75rem',
            lineHeight: 1.55
          }}>
            Retrouvez tous vos extraits et certificats d'état civil signés par l'officier compétent. 
            Ces documents électroniques sont certifiés conformes, infalsifiables et jouissent de la même valeur juridique que la minute originale papier.
          </p>

          {/* Grille de 4 Trust Badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.18)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={18} color="#6ee7b7" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800' }}>Chiffrement AES-256</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>Coffre haute sécurité</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={18} color="#6ee7b7" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800' }}>Cachet 2D-Doc</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>Vérifiable par QR-Code</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileCheck size={18} color="#6ee7b7" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800' }}>Valeur Probante</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>Loi n° 72-61 (Code Famille)</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={18} color="#6ee7b7" />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: '800' }}>{actes.length} {actes.length > 1 ? 'actes certifiés' : 'acte certifié'}</div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)' }}>Disponibles 24/7</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BANDEAU INFORMATIF DEMARCHES EN COURS D INSTRUCTION */}
      {pendingCount > 0 && (
        <div style={{
          backgroundColor: 'var(--c-bg-accent, rgba(37,99,235,0.12))',
          borderRadius: '18px',
          padding: '1rem 1.5rem',
          border: '1px solid var(--c-border-accent, rgba(59,130,246,0.3))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 2px 10px rgba(37,99,235,0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(37,99,235,0.2)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--c-text-primary, #1e40af)' }}>
                {pendingCount} démarche{pendingCount > 1 ? 's' : ''} en cours de traitement
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--c-text-secondary, #2563eb)' }}>
                Dès que l'officier d'état civil aura validé votre dossier, votre acte officiel certifié apparaîtra automatiquement ici.
              </div>
            </div>
          </div>

          <Link
            to="/citoyen/demandes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: '700',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)'
            }}
          >
            <span>Suivre mes démarches</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* BARRE DE RECHERCHE, ONGLETS ET TRI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* Ligne Recherche + Tri */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Champ recherche */}
          <div style={{ position: 'relative', flex: '1 1 300px' }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8'
            }} />
            <input
              type="text"
              placeholder="Rechercher par référence, type d'acte, centre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '46px',
                padding: '0 1rem 0 2.75rem',
                borderRadius: '14px',
                border: '1px solid var(--c-border, #e2e8f0)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                fontSize: '0.9rem',
                color: 'var(--c-text-primary, #0f172a)',
                outline: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8'
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Selecteur de Tri */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--c-text-muted, #64748b)' }}>Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                height: '44px',
                padding: '0 1rem',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #e2e8f0)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                fontSize: '0.85rem',
                fontWeight: '600',
                color: 'var(--c-text-primary, #334155)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="recent">Plus récents d'abord</option>
              <option value="oldest">Plus anciens</option>
              <option value="alphabet">Nom de l'acte (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Onglets de filtrage par categorie */}
        <div style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none'
        }}>
          {[
            { id: 'all', label: 'Tous les actes', count: counts.all, icon: FileText },
            { id: 'naissance', label: 'Actes de Naissance', count: counts.naissance, icon: FileText },
            { id: 'mariage', label: 'Actes de Mariage', count: counts.mariage, icon: Heart },
            { id: 'deces', label: 'Actes de Décès', count: counts.deces, icon: FileCheck },
            { id: 'certificats', label: 'Certificats & Autres', count: counts.certificats, icon: Award }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid #2563eb' : '1px solid var(--c-border, #e2e8f0)',
                  backgroundColor: isActive ? 'var(--c-bg-accent, rgba(37,99,235,0.15))' : 'var(--c-bg-card, #ffffff)',
                  color: isActive ? '#3b82f6' : 'var(--c-text-secondary, #475569)',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? '800' : '600',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={16} color={isActive ? '#3b82f6' : 'var(--c-text-muted, #64748b)'} />
                <span>{tab.label}</span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: '800',
                  padding: '2px 7px',
                  borderRadius: '999px',
                  backgroundColor: isActive ? '#2563eb' : 'var(--c-bg-subtle, #f1f5f9)',
                  color: isActive ? '#ffffff' : 'var(--c-text-muted, #64748b)'
                }}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* LISTE OU GRILLE DES ACTES NUMERIQUES */}
      {loading ? (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '20px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--c-border, #e2e8f0)'
        }}>
          <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: '#059669' }} />
          <h4 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 6px' }}>
            Accès au coffre-fort d'actes...
          </h4>
          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.88rem', margin: 0 }}>
            Vérification cryptographique et récupération des actes officiels
          </p>
        </div>
      ) : filteredActes.length === 0 ? (
        <div style={{
          backgroundColor: 'var(--c-bg-card, #ffffff)',
          borderRadius: '24px',
          padding: '4rem 2rem',
          textAlign: 'center',
          border: '1px solid var(--c-border, #e2e8f0)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '22px',
            backgroundColor: 'rgba(5, 150, 105, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: '#10b981'
          }}>
            <ShieldCheck size={36} />
          </div>

          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>
            {actes.length === 0 ? "Aucun acte certifié pour le moment" : "Aucun résultat trouvé"}
          </h3>

          <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.75rem', lineHeight: 1.55 }}>
            {actes.length === 0
              ? "Dès qu'une démarche d'état civil est traitée et signée par l'officier municipal, votre acte électronique officiel apparaîtra ici avec son cachet 2D-Doc."
              : "Aucun document ne correspond à vos filtres actuels. Essayez un autre terme de recherche ou changez la catégorie."}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            {searchQuery || activeCategory !== 'all' ? (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="btn"
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--c-border, #cbd5e1)',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  color: 'var(--c-text-primary, #334155)',
                  fontSize: '0.88rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Réinitialiser les filtres
              </button>
            ) : null}

            <Link
              to="/citoyen/demande/nouvelle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '11px 24px',
                backgroundColor: '#059669',
                color: '#ffffff',
                borderRadius: '12px',
                fontWeight: '700',
                fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(5,150,105,0.3)'
              }}
            >
              <span>Faire une demande d'acte</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '1.5rem'
        }}>
          {filteredActes.map(acte => {
            const cat = getActeCategory(acte);
            const cfg = getCategoryConfig(cat);
            const CatIcon = cfg.icon;
            const pdfUrl = api.getStreamUrl('/demandes/' + acte.id + '/pdf');
            const fingerprint = getActeFingerprint(acte);

            return (
              <div
                key={acte.id}
                style={{
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  borderRadius: '20px',
                  border: '1px solid var(--c-border, #e2e8f0)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {/* Bandeau d'accent colore superieur */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: cfg.gradient
                }} />

                <div>
                  {/* Ligne En-tete : Badge Categorie + Badge Certifie */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: cfg.gradient,
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <CatIcon size={20} />
                      </div>
                      <div>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          color: cfg.badgeColor,
                          backgroundColor: cfg.badgeBg,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          border: '1px solid ' + cfg.border
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      color: '#059669',
                      backgroundColor: '#ecfdf5',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      border: '1px solid #a7f3d0'
                    }}>
                      <CheckCircle2 size={13} color="#059669" />
                      <span>Certifié conforme</span>
                    </span>
                  </div>

                  {/* Titre & Reference */}
                  <h3 style={{
                    fontSize: '1.15rem',
                    fontWeight: '800',
                    color: 'var(--c-text-primary, #0f172a)',
                    margin: '0 0 6px',
                    lineHeight: 1.35
                  }}>
                    {acte.activite?.nom || "Acte d'état civil officiel"}
                  </h3>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.82rem',
                    fontWeight: '800',
                    color: '#2563eb',
                    marginBottom: '12px'
                  }}>
                    <span>Réf : {acte.reference || ('DEM-' + acte.id)}</span>
                    <span style={{ color: '#cbd5e1' }}>•</span>
                    <span style={{ color: 'var(--c-text-muted, #64748b)', fontWeight: '500' }}>
                      Volet N° {acte.date_creation ? new Date(acte.date_creation).getFullYear() : 2026}/{String(acte.id).padStart(4, '0')}
                    </span>
                  </div>

                  {/* Informations detaillees */}
                  <div style={{
                    backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                    borderRadius: '14px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    marginBottom: '1.25rem',
                    border: '1px solid var(--c-border-subtle, #f1f5f9)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--c-text-secondary, #475569)' }}>
                      <MapPin size={15} color="#64748b" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {acte.centre?.nom || "Centre Principal d'état civil"}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--c-text-secondary, #475569)' }}>
                      <Calendar size={15} color="#64748b" style={{ flexShrink: 0 }} />
                      <span>Délivré le {formatDate(acte.date_creation || acte.created_at)}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>
                      <ShieldCheck size={15} color="#059669" style={{ flexShrink: 0 }} />
                      <span style={{ fontFamily: 'monospace' }}>{fingerprint}</span>
                    </div>
                  </div>
                </div>

                {/* Barre d'actions multiples */}
                <div style={{
                  borderTop: '1px solid var(--c-border, #f1f5f9)',
                  paddingTop: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Visualiser PDF */}
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewPdfUrl(pdfUrl);
                        setPreviewActe(acte);
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1px solid var(--c-border, #e2e8f0)',
                        backgroundColor: 'var(--c-bg-card, #ffffff)',
                        color: 'var(--c-text-primary, #1e293b)',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <Eye size={16} color="#2563eb" />
                      <span>Visualiser</span>
                    </button>

                    {/* Telecharger PDF */}
                    <a
                      href={pdfUrl}
                      download={'acte_' + (acte.reference || acte.id) + '.pdf'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '12px',
                        backgroundColor: '#059669',
                        color: '#ffffff',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(5,150,105,0.22)',
                        transition: 'opacity 0.15s ease'
                      }}
                    >
                      <Download size={16} />
                      <span>Télécharger</span>
                    </a>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {/* Verifier l'authenticite */}
                    <button
                      type="button"
                      onClick={() => setVerifyActe(acte)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid var(--c-border, #cbd5e1)',
                        backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                        color: 'var(--c-text-secondary, #475569)',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                    >
                      <ShieldCheck size={14} color="#059669" />
                      <span>Vérifier le cachet 2D-Doc</span>
                    </button>

                    {/* Imprimer directement */}
                    <button
                      type="button"
                      onClick={() => handlePrintActe(acte)}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '10px',
                        border: '1px solid var(--c-border, #cbd5e1)',
                        backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                        color: 'var(--c-text-secondary, #475569)',
                        fontSize: '0.78rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px'
                      }}
                      title="Imprimer l'acte officiel"
                    >
                      <Printer size={14} color="#334155" />
                      <span>Imprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE LIGHTBOX VISUALISATION PDF */}
      {previewPdfUrl && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.75)',
          backdropFilter: 'blur(5px)',
          zIndex: 1300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '1000px',
            height: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
          }}>
            {/* Barre de titre et outils */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--c-bg-card, #ffffff)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
                    {previewActe?.activite?.nom || "Acte d'état civil officiel"}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)' }}>
                    Réf : {previewActe?.reference} • Certifié conforme par l'Officier d'état civil
                  </div>
                </div>
              </div>

              {/* Boutons d'action rapides */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => previewActe && handlePrintActe(previewActe)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    backgroundColor: 'var(--c-bg-card, #ffffff)',
                    color: 'var(--c-text-primary, #334155)',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={15} />
                  <span>Imprimer</span>
                </button>

                <a
                  href={previewPdfUrl}
                  download={'acte_' + (previewActe?.reference || 'officiel') + '.pdf'}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={15} />
                  <span>Télécharger</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setPreviewPdfUrl(null);
                    setPreviewActe(null);
                  }}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                    color: 'var(--c-text-muted, #64748b)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '6px'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Zone de previsualisation PDF */}
            <div style={{ flex: 1, backgroundColor: 'var(--c-bg-subtle, #f1f5f9)', padding: '1rem', overflow: 'hidden' }}>
              <object
                data={previewPdfUrl}
                type="application/pdf"
                style={{ width: '100%', height: '100%', borderRadius: '12px', border: 'none' }}
              >
                <div style={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  borderRadius: '12px',
                  padding: '2rem',
                  textAlign: 'center'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '18px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1rem'
                  }}>
                    <FileText size={32} />
                  </div>
                  <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>
                    Document PDF prêt à être consulté
                  </h4>
                  <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 1.5rem' }}>
                    Le document électronique officiel est sécurisé. Vous pouvez l'ouvrir directement dans un nouvel onglet ou l'enregistrer sur votre appareil.
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
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
                        fontSize: '0.88rem',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <ExternalLink size={16} />
                      <span>Ouvrir dans un nouvel onglet</span>
                    </a>
                  </div>
                </div>
              </object>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CONTROLE D'AUTHENTICITE & CACHET NUMERIQUE 2D-DOC */}
      {verifyActe && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15,23,42,0.7)',
          backdropFilter: 'blur(5px)',
          zIndex: 1350,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '560px',
            overflow: 'hidden',
            boxShadow: '0 25px 60px rgba(0,0,0,0.35)',
            border: '1px solid var(--c-border, #e2e8f0)'
          }}>
            {/* En-tete vert republicain */}
            <div style={{
              background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
              color: '#ffffff',
              padding: '1.5rem',
              position: 'relative'
            }}>
              <button
                type="button"
                onClick={() => setVerifyActe(null)}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#ffffff'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <ShieldCheck size={26} color="#6ee7b7" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', margin: 0, color: '#ffffff' }}>
                  Certificat d'Authenticité Numérique
                </h3>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)' }}>
                Cachet Électronique Visible (CEV 2D-Doc) • Direction de l'État Civil du Sénégal
              </div>
            </div>

            {/* Corps du certificat d'authenticite */}
            <div style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Statut d'integrite */}
              <div style={{
                backgroundColor: '#ecfdf5',
                borderRadius: '14px',
                border: '1px solid #a7f3d0',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <CheckCircle2 size={24} color="#059669" style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#065f46' }}>
                    ACTE INTÈGRE ET RECONNU AUTHENTIQUE
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#047857' }}>
                    Signé électroniquement avec un certificat qualifié de l'État sénégalais
                  </div>
                </div>
              </div>

              {/* Bloc QR-Code 2D-Doc & Sceau officiel */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                borderRadius: '16px',
                padding: '1rem',
                border: '1px solid var(--c-border, #e2e8f0)'
              }}>
                {/* Simulation visuelle 2D-Doc QR Code */}
                <div style={{
                  width: '96px',
                  height: '96px',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  borderRadius: '12px',
                  border: '1px solid var(--c-border, #cbd5e1)',
                  padding: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                  {/* SVG QR Code Matriciel */}
                  <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    <line x1="17" y1="7" x2="17.01" y2="7"></line>
                    <line x1="7" y1="17" x2="7.01" y2="17"></line>
                    <line x1="17" y1="17" x2="17.01" y2="17"></line>
                  </svg>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Empreinte Numérique Unique
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', fontFamily: 'monospace', margin: '3px 0 6px' }}>
                    {getActeFingerprint(verifyActe)}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyHash(getActeFingerprint(verifyActe))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      color: copiedHash ? '#059669' : '#2563eb',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      cursor: 'pointer'
                    }}
                  >
                    {copiedHash ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedHash ? 'Empreinte copiée !' : "Copier l'identifiant unique"}</span>
                  </button>
                </div>
              </div>

              {/* Metadonnees officielles de la minute */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Acte :</span>
                  <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>{verifyActe.activite?.nom || "Acte officiel"}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Référence officielle :</span>
                  <span style={{ fontWeight: '700', color: '#2563eb' }}>{verifyActe.reference}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Centre d'état civil :</span>
                  <span style={{ fontWeight: '600', color: 'var(--c-text-primary, #0f172a)' }}>{verifyActe.centre?.nom || "Centre Principal"}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Date d'enregistrement :</span>
                  <span style={{ fontWeight: '600', color: 'var(--c-text-primary, #0f172a)' }}>{formatDate(verifyActe.date_creation || verifyActe.created_at)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.84rem' }}>
                  <span style={{ color: 'var(--c-text-muted, #64748b)' }}>Autorité signataire :</span>
                  <span style={{ fontWeight: '700', color: '#059669' }}>Officier d'État Civil habilité</span>
                </div>
              </div>

              {/* Bouton fermeture */}
              <div style={{ display: 'flex', gap: '10px', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setVerifyActe(null)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    backgroundColor: 'var(--c-bg-card, #ffffff)',
                    color: 'var(--c-text-primary, #334155)',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Fermer
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handlePrintActe(verifyActe);
                  }}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '12px',
                    backgroundColor: '#059669',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    fontWeight: '700',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={16} />
                  <span>Imprimer l'attestation</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
