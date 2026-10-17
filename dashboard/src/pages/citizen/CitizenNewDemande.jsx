import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, ArrowRight, CheckCircle2, Upload, X,
  AlertCircle, ShieldCheck, MapPin, Building2, Calendar, CreditCard,
  Clock, Star, Search, Trash2, Eye, Landmark, Users, Navigation,
  ChevronRight, Smartphone, Check, Lock, QrCode, Wallet, Send,
  RefreshCw, AlertTriangle
} from 'lucide-react';
import api from '../../utils/api';

// Helper pour déduire le type de champ à partir de son libellé
const guessFieldType = (label = '') => {
  const l = label.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/cni|identite|justif|certif|acte|piece|photo|pdf|quittance|document|fichier|livret|jugement/i.test(l)) return 'file';
  if (/date/i.test(l)) return 'date';
  if (/sexe|genre|situation/i.test(l)) return 'select';
  if (/annee|nombre|numero|num|montant|prix/i.test(l)) return 'number';
  if (/telephone|tel|phone/i.test(l)) return 'phone';
  if (/motif|observation|commentaire|adresse|description/i.test(l)) return 'textarea';
  return 'text';
};

// Extraction uniforme des champs dynamiques et des pièces
const extractChamps = (act) => {
  if (!act) return [];
  const raw = act.champs_dynamiques || act.champsDynamiques || act.champs;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map((c, i) => ({
      id: c.id || i,
      nom_champ: c.nom_champ || c.nomChamp || `champ_${i}`,
      label: c.label || c.nom_champ,
      type_champ: c.type_champ || c.typeChamp || 'text',
      obligatoire: c.obligatoire !== undefined ? c.obligatoire : true,
      ordre: c.ordre !== undefined ? c.ordre : i,
      placeholder: c.placeholder || '',
      options: Array.isArray(c.options) ? c.options : (typeof c.options === 'string' ? JSON.parse(c.options || '[]') : []),
    }));
  }
  if (Array.isArray(act.champs_requis) && act.champs_requis.length > 0) {
    return act.champs_requis.map((lbl, i) => {
      const type = guessFieldType(lbl);
      return {
        id: i,
        nom_champ: lbl.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9_]/g, '_'),
        label: lbl,
        type_champ: type,
        obligatoire: true,
        ordre: i,
        placeholder: `Saisir : ${lbl.toLowerCase()}`,
        options: type === 'select' && lbl.toLowerCase().includes('sexe') ? ['Masculin', 'Féminin'] : []
      };
    });
  }
  return [];
};

export default function CitizenNewDemande({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const urlBureauId = searchParams.get('bureauId');
  const urlBureauNom = searchParams.get('bureauNom');
  const urlBureauCouleur = searchParams.get('bureauCouleur') || '#2563eb';
  const urlActivityId = searchParams.get('activityId');

  // Étapes :
  // 1 = Choix Acte (1A: Service, 1B: Document/Activité)
  // 2 = Lieu de dépôt
  // 3 = Données du dossier (champs dynamiques de l'activité, sans motif statique)
  // 4 = Documents (si hasDocumentStep = true) OU Résumé & Paiement (si hasDocumentStep = false)
  // 5 = Résumé & Paiement (si hasDocumentStep = true)
  const [step, setStep] = useState(1);
  const [subStepActe, setSubStepActe] = useState('services'); // 'services' | 'documents'

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdDemande, setCreatedDemande] = useState(null);
  const [error, setError] = useState('');

  // Bureau & Services data
  const [bureauNom, setBureauNom] = useState(urlBureauNom ? decodeURIComponent(urlBureauNom) : 'État Civil');
  const [bureauCouleur, setBureauCouleur] = useState(urlBureauCouleur);
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');

  // Activités data
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activitySearch, setActivitySearch] = useState('');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Favoris
  const favoritesKey = user?.id ? 'favorite_activities_' + user.id : 'favorite_activities_guest';
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(favoritesKey) || '[]');
    } catch {
      return [];
    }
  });

  const toggleFavorite = (actId, e) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(actId) ? prev.filter(id => id !== actId) : [...prev, actId];
      localStorage.setItem(favoritesKey, JSON.stringify(next));
      return next;
    });
  };

  // Champs dynamiques
  const [champsDynamiques, setChampsDynamiques] = useState([]);
  const [formValues, setFormValues] = useState({});

  // Pièces jointes (dynamiques)
  const [uploadedFiles, setUploadedFiles] = useState({});
  const [uploadingField, setUploadingField] = useState(null);

  // Divisions géographiques
  const [regions, setRegions] = useState([]);
  const [departements, setDepartements] = useState([]);
  const [communes, setCommunes] = useState([]);
  const [centres, setCentres] = useState([]);

  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedCommuneId, setSelectedCommuneId] = useState('');
  const [selectedCentreId, setSelectedCentreId] = useState('');

  // Centre de retrait alternatif (optionnel)
  const [hasTransfer, setHasTransfer] = useState(false);
  const [delivRegionId, setDelivRegionId] = useState('');
  const [delivDeptId, setDelivDeptId] = useState('');
  const [delivCommuneId, setDelivCommuneId] = useState('');
  const [delivCentreId, setDelivCentreId] = useState('');

  // Géolocalisation
  const [locating, setLocating] = useState(false);

  // Paiement PayTech & Opérateurs
  const [paymentOperator, setPaymentOperator] = useState('wave'); // 'wave' | 'orange_money' | 'free_money' | 'carte'
  const [payerFullName, setPayerFullName] = useState(user?.nom_complet || user?.nom || '');
  const [payerPhone, setPayerPhone] = useState(user?.telephone || '');
  const [payerEmail, setPayerEmail] = useState(user?.email || '');

  // Modal Guichet PayTech
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [omOtp, setOmOtp] = useState('');

  // ── Chargement initial : Divisions & Services ──
  useEffect(() => {
    async function loadInitial() {
      setLoading(true);
      try {
        const [regRes, depRes, comRes, cenRes] = await Promise.allSettled([
          api.get('/divisions/regions'),
          api.get('/divisions/departements'),
          api.get('/divisions/communes'),
          api.get('/divisions/centres')
        ]);

        setRegions(regRes.status === 'fulfilled' ? (regRes.value?.data?.regions || regRes.value?.data || []) : []);
        setDepartements(depRes.status === 'fulfilled' ? (depRes.value?.data?.departements || depRes.value?.data || []) : []);
        setCommunes(comRes.status === 'fulfilled' ? (comRes.value?.data?.communes || comRes.value?.data || []) : []);
        setCentres(cenRes.status === 'fulfilled' ? (cenRes.value?.data?.centres || cenRes.value?.data || []) : []);

        // Chargement des services pour ce bureau (ou tous les services si pas de bureauId)
        const sUrl = urlBureauId ? ('/services?bureauId=' + urlBureauId) : '/services';
        const sRes = await api.get(sUrl);
        const sList = sRes?.data?.services || sRes?.data || [];
        setServices(Array.isArray(sList) ? sList : []);

        // Si une activité est passée en paramètre d'URL
        if (urlActivityId) {
          const actRes = await api.get('/activities/' + urlActivityId);
          const actData = actRes?.data?.activity || actRes?.data;
          if (actData) {
            handleSelectActivity(actData);
            setStep(2);
          }
        }
      } catch (err) {
        console.error('Erreur initialisation:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [urlBureauId, urlActivityId]);

  // Chargement des activités au choix d'un service
  const handleSelectService = async (service) => {
    setSelectedService(service);
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/activities?serviceId=' + service.id + '&withChamps=true');
      const list = res?.data?.activities || res?.data || [];
      setActivities(Array.isArray(list) ? list : []);
      setSubStepActe('documents');
    } catch (err) {
      setError('Impossible de charger les documents pour ce service.');
    } finally {
      setLoading(false);
    }
  };

  // Sélection d'une activité -> extraction dynamique des champs et ouverture modal d'information
  const handleSelectActivity = async (act) => {
    setSelectedActivity(act);
    setLoading(true);
    try {
      const res = await api.get('/activities/' + act.id);
      const detailed = res?.data?.activity || res?.data || act;
      setSelectedActivity(detailed);
      const champs = extractChamps(detailed);
      setChampsDynamiques(champs);
      setShowInfoModal(true);
    } catch {
      const champs = extractChamps(act);
      setChampsDynamiques(champs);
      setShowInfoModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Condition dynamique : y a-t-il des pièces jointes requises ?
  const hasDocumentStep = champsDynamiques.some(c => c.type_champ === 'file');

  // Menus déroulants géographiques filtrés
  const filteredDepts = departements.filter(d => !selectedRegionId || d.region_id === Number(selectedRegionId));
  const filteredCommunes = communes.filter(c => !selectedDeptId || c.departement_id === Number(selectedDeptId));
  const filteredCentres = centres.filter(c => !selectedCommuneId || c.commune_id === Number(selectedCommuneId));

  const delivFilteredDepts = departements.filter(d => !delivRegionId || d.region_id === Number(delivRegionId));
  const delivFilteredCommunes = communes.filter(c => !delivDeptId || c.departement_id === Number(delivDeptId));
  const delivFilteredCentres = centres.filter(c => !delivCommuneId || c.commune_id === Number(delivCommuneId));

  // Calcul distance GPS Haversine
  const findClosestCentre = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let minD = Infinity;
        let closest = null;

        centres.forEach(c => {
          if (c.latitude && c.longitude) {
            const rad = Math.PI / 180;
            const dLat = (c.latitude - latitude) * rad;
            const dLon = (c.longitude - longitude) * rad;
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(latitude * rad) * Math.cos(c.latitude * rad) * Math.sin(dLon / 2) ** 2;
            const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (d < minD) {
              minD = d;
              closest = c;
            }
          }
        });

        if (closest) {
          const com = communes.find(co => co.id === closest.commune_id);
          const dep = departements.find(de => de.id === com?.departement_id);
          const reg = regions.find(re => re.id === dep?.region_id);

          if (reg) setSelectedRegionId(String(reg.id));
          if (dep) setSelectedDeptId(String(dep.id));
          if (com) setSelectedCommuneId(String(com.id));
          setSelectedCentreId(String(closest.id));
        } else if (centres.length > 0) {
          setSelectedCentreId(String(centres[0].id));
        }
        setLocating(false);
      },
      () => {
        alert("Impossible de récupérer votre position.");
        setLocating(false);
      }
    );
  };

  // Upload de fichier (PDF ou image)
  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;
    setUploadingField(fieldName);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': 'Bearer ' + token } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'envoi du fichier");

      const uploadedUrl = data.data?.url || data.url;
      const filename = data.data?.filename || file.name;

      setUploadedFiles(prev => ({
        ...prev,
        [fieldName]: {
          url: uploadedUrl,
          filename: filename,
          name: file.name
        }
      }));
    } catch (err) {
      setError('Erreur upload : ' + err.message);
    } finally {
      setUploadingField(null);
    }
  };

  const removeFile = (fieldName) => {
    setUploadedFiles(prev => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  // Navigation entre les étapes
  const goToNextStep = () => {
    setError('');
    if (step === 2) {
      if (!selectedCentreId) {
        setError("Veuillez sélectionner votre centre de dépôt d'état civil.");
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Valider champs obligatoires non-fichier
      for (const champ of champsDynamiques) {
        if (champ.obligatoire && champ.type_champ !== 'file') {
          const val = formValues[champ.nom_champ];
          if (!val || String(val).trim() === '') {
            setError('Le champ « ' + champ.label + ' » est obligatoire.');
            return;
          }
        }
      }
      // Valider motif si configuré
      if (selectedActivity?.motifs && selectedActivity.motifs.length > 0 && !formValues.motif) {
        setError('Veuillez sélectionner le motif officiel de la demande.');
        return;
      }

      // Si documents requis -> Étape 4 (Documents), sinon -> Étape 4 (Résumé & Paiement)
      if (hasDocumentStep) {
        setStep(4);
      } else {
        setStep(4); // Si pas de docs, l'étape 4 est le Résumé
      }
    } else if (step === 4 && hasDocumentStep) {
      // Valider fichiers obligatoires
      for (const champ of champsDynamiques) {
        if (champ.obligatoire && champ.type_champ === 'file') {
          if (!uploadedFiles[champ.nom_champ]) {
            setError('Veuillez joindre la pièce obligatoire : « ' + champ.label + ' ».');
            return;
          }
        }
      }
      setStep(5); // Vers Résumé & Paiement
    }
  };

  const goToPrevStep = () => {
    setError('');
    if (step === 5) {
      setStep(4);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  // Soumission finale de la demande avec affectation du paiement
  const handleSubmitDemande = async (isPaidConfirmation = false) => {
    setSubmitting(true);
    setError('');

    try {
      const documentsUrlMap = {};
      Object.keys(uploadedFiles).forEach(key => {
        documentsUrlMap[key] = uploadedFiles[key]?.url || uploadedFiles[key];
      });

      const montant = Number(selectedActivity?.prix || 0);
      const effectiveModePaiement = isPaidConfirmation ? paymentOperator : (montant > 0 ? paymentOperator : 'gratuit');

      const payload = {
        activite_id: selectedActivity.id,
        centre_id: Number(selectedCentreId),
        centre_delivrance_id: hasTransfer && delivCentreId ? Number(delivCentreId) : null,
        motif: formValues.motif || selectedActivity?.nom || 'Démarche citoyenne SenInnov',
        donnees: formValues,
        documents_url: documentsUrlMap,
        montant_paye: montant,
        mode_paiement: effectiveModePaiement,
        rendez_vous: null
      };

      const res = await api.post('/demandes', payload);
      const created = res?.data?.demande || res?.data;
      if (created) {
        setCreatedDemande(created);
        setShowPayModal(false);
      } else {
        throw new Error('Réponse inattendue du serveur.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Erreur lors de la création du dossier.');
      setShowPayModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  // Validation interactive du paiement PayTech
  const handleConfirmPaytechPayment = async () => {
    setPaymentProcessing(true);
    try {
      // Simulation temps réseau et validation opérateur
      await new Promise(r => setTimeout(r, 1200));
      await handleSubmitDemande(true);
    } catch (err) {
      setError('Erreur lors du traitement du paiement : ' + err.message);
    } finally {
      setPaymentProcessing(false);
    }
  };

  // ── ÉCRAN DE SUCCÈS ──
  if (createdDemande) {
    return (
      <div style={{
        maxWidth: '680px',
        margin: '2rem auto',
        backgroundColor: 'var(--c-bg-card, #ffffff)',
        borderRadius: '24px',
        padding: '3rem 2rem',
        textAlign: 'center',
        border: '1px solid var(--c-border, #e2e8f0)',
        boxShadow: '0 12px 36px rgba(0,0,0,0.06)'
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '22px',
          backgroundColor: '#ecfdf5',
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem'
        }}>
          <CheckCircle2 size={40} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '0 0 8px' }}>
          Demande transmise avec succès !
        </h2>
        <p style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.95rem', margin: '0 0 1.5rem' }}>
          Votre dossier a bien été enregistré sous la référence officielle :
        </p>

        <div style={{
          display: 'inline-block',
          backgroundColor: 'var(--c-bg-subtle, #f1f5f9)',
          border: '1px dashed #cbd5e1',
          borderRadius: '12px',
          padding: '12px 24px',
          fontSize: '1.25rem',
          fontWeight: '800',
          color: '#2563eb',
          letterSpacing: '0.04em',
          marginBottom: '1.5rem'
        }}>
          {createdDemande.reference || 'DEC-ENREGISTRE'}
        </div>

        {paymentOperator && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '10px',
            color: '#166534',
            fontSize: '0.88rem',
            fontWeight: '700',
            marginBottom: '2rem'
          }}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>Règlement affecté avec succès via {paymentOperator.replace('_', ' ').toUpperCase()}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={() => navigate('/citoyen/demande/' + createdDemande.id)}
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Eye size={18} />
            <span>Suivre mon dossier</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/citoyen')}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              backgroundColor: 'var(--c-bg-subtle, #f1f5f9)',
              color: 'var(--c-text-primary, #334155)',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.92rem',
              cursor: 'pointer'
            }}
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  // Configuration des étapes pour la barre de progression
  const isFreeActivity = Number(selectedActivity?.prix || 0) === 0;

  const stepsConfig = hasDocumentStep
    ? [
        { num: 1, label: 'Acte' },
        { num: 2, label: 'Lieu de dépôt' },
        { num: 3, label: 'Données' },
        { num: 4, label: 'Documents' },
        { num: 5, label: isFreeActivity ? 'Résumé & Confirmation' : 'Résumé & Paiement' }
      ]
    : [
        { num: 1, label: 'Acte' },
        { num: 2, label: 'Lieu de dépôt' },
        { num: 3, label: 'Données' },
        { num: 4, label: isFreeActivity ? 'Résumé & Confirmation' : 'Résumé & Paiement' }
      ];

  // Détection de la page résumé active
  const isRecapStep = hasDocumentStep ? step === 5 : step === 4;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '3rem' }}>

      {/* ── BANNIÈRE EN-TÊTE AVEC STEPPER MOBILE ── */}
      <div style={{
        backgroundColor: '#2563eb',
        borderRadius: '24px',
        padding: '2rem 1.5rem',
        color: '#ffffff',
        boxShadow: '0 10px 25px rgba(37,99,235,0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={() => {
              if (step === 1 && subStepActe === 'documents') {
                setSubStepActe('services');
              } else if (step > 1) {
                goToPrevStep();
              } else {
                navigate('/citoyen');
              }
            }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
              {bureauNom} {selectedService ? ('• ' + selectedService.nom) : ''}
            </div>
            <h1 style={{ fontSize: '1.45rem', fontWeight: '800', margin: '2px 0 0', letterSpacing: '-0.02em' }}>
              {selectedActivity ? selectedActivity.nom : 'Nouvelle démarche citoyenne'}
            </h1>
          </div>
        </div>

        {/* Stepper Dynamique */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '640px',
          margin: '0 auto',
          width: '100%',
          position: 'relative'
        }}>
          {stepsConfig.map((item, idx, arr) => {
            const isCompleted = step > item.num;
            const isActive = step === item.num;

            return (
              <React.Fragment key={item.label}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2 }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: isActive ? '#ffffff' : (isCompleted ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)'),
                    color: isActive ? '#2563eb' : '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.15)' : 'none'
                  }}>
                    {isCompleted ? <Check size={16} /> : item.num}
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: isActive ? '700' : '500', opacity: isActive ? 1 : 0.8, textAlign: 'center' }}>
                    {item.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    backgroundColor: isCompleted ? '#ffffff' : 'rgba(255,255,255,0.25)',
                    margin: '0 8px',
                    marginBottom: '20px'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fee2e2',
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          color: '#b91c1c',
          fontSize: '0.9rem',
          fontWeight: '600'
        }}>
          <AlertCircle size={20} />
          <span style={{ flex: 1 }}>{error}</span>
          <button type="button" onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#b91c1c', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
      )}

      {/* ── ÉTAPE 1 : CHOIX DE L'ACTE (SERVICES & DOCUMENTS) ── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {subStepActe === 'services' ? (
            <>
              {/* Recherche de service */}
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Rechercher un service (Naissance, Mariage, Décès...)"
                  value={serviceSearch}
                  onChange={(e) => setServiceSearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '16px',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    paddingLeft: '46px',
                    paddingRight: '16px',
                    fontSize: '0.92rem',
                    backgroundColor: 'var(--c-bg-card, #ffffff)'
                  }}
                />
              </div>

              {/* Grille des services */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {services
                  .filter(s => s.nom.toLowerCase().includes(serviceSearch.toLowerCase()))
                  .map((service) => (
                    <div
                      key={service.id}
                      onClick={() => handleSelectService(service)}
                      style={{
                        backgroundColor: 'var(--c-bg-card, #ffffff)',
                        borderRadius: '20px',
                        padding: '1.25rem',
                        border: '1px solid var(--c-border, #e2e8f0)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                      <div style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, ' + bureauCouleur + ' 0%, #1e40af 100%)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
                        flexShrink: 0
                      }}>
                        <FileText size={26} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {service.nom}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)', marginTop: '2px' }}>
                          {service.description || 'Délivrance officielle et authentifiée'}
                        </div>
                      </div>
                      <ChevronRight size={20} color="#94a3b8" />
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <>
              {/* Sous-étape Documents / Activités pour ce service */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  onClick={() => setSubStepActe('services')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--c-bg-card, #ffffff)',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: 'var(--c-text-secondary, #475569)',
                    cursor: 'pointer'
                  }}
                >
                  <ArrowLeft size={16} />
                  <span>Tous les services</span>
                </button>
                <span style={{ fontSize: '0.85rem', color: 'var(--c-text-muted, #64748b)', fontWeight: '600' }}>
                  {activities.length} acte{activities.length > 1 ? 's' : ''} disponible{activities.length > 1 ? 's' : ''}
                </span>
              </div>

              {/* Recherche d'activité */}
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Rechercher un document ou acte officiel..."
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  style={{
                    width: '100%',
                    height: '48px',
                    borderRadius: '16px',
                    border: '1px solid var(--c-border, #cbd5e1)',
                    paddingLeft: '46px',
                    paddingRight: '16px',
                    fontSize: '0.92rem',
                    backgroundColor: 'var(--c-bg-card, #ffffff)'
                  }}
                />
              </div>

              {/* Liste des activités */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {activities
                  .filter(a => a.nom.toLowerCase().includes(activitySearch.toLowerCase()))
                  .map((act) => {
                    const isFav = favorites.includes(act.id);

                    return (
                      <div
                        key={act.id}
                        onClick={() => handleSelectActivity(act)}
                        style={{
                          backgroundColor: 'var(--c-bg-card, #ffffff)',
                          borderRadius: '20px',
                          padding: '1.25rem 1.5rem',
                          border: '1px solid var(--c-border, #e2e8f0)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#2563eb'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                          <div style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '14px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FileText size={22} />
                          </div>
                          <div>
                            <div style={{ fontSize: '1.02rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                              {act.nom}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--c-text-muted, #64748b)' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={14} color="#f59e0b" />
                                {act.delai_min_jours || 1} à {act.delai_max_jours || 1} jours
                              </span>
                              <span>•</span>
                              <span style={{ fontWeight: '700', color: act.prix === 0 ? '#10b981' : '#2563eb' }}>
                                {act.prix === 0 ? 'Gratuit' : (act.prix.toLocaleString('fr-FR') + ' FCFA')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            type="button"
                            onClick={(e) => toggleFavorite(act.id, e)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              backgroundColor: isFav ? '#fef3c7' : '#f1f5f9',
                              color: isFav ? '#d97706' : '#94a3b8',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                          >
                            <Star size={18} fill={isFav ? '#d97706' : 'none'} />
                          </button>
                          <ChevronRight size={20} color="#94a3b8" />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── MODAL FICHE D'INFORMATION DU DOCUMENT ── */}
      {showInfoModal && selectedActivity && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--c-bg-card, #ffffff)',
            borderRadius: '24px',
            padding: '2rem',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <h3 style={{ fontSize: '1.45rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0, lineHeight: 1.2 }}>
              {selectedActivity.nom}
            </h3>

            {/* Cartes Tarif & Délai */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{
                backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                border: '1px solid var(--c-border-subtle, #f1f5f9)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <CreditCard size={20} color="#2563eb" />
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase' }}>
                  TARIF
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#2563eb' }}>
                  {selectedActivity.prix === 0 ? 'Gratuit' : (selectedActivity.prix.toLocaleString('fr-FR') + ' FCFA')}
                </span>
              </div>

              <div style={{
                backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
                border: '1px solid var(--c-border-subtle, #f1f5f9)',
                borderRadius: '16px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <Clock size={20} color="#f59e0b" />
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase' }}>
                  DÉLAI ESTIMÉ
                </span>
                <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#d97706' }}>
                  {selectedActivity.delai_min_jours || 1} à {selectedActivity.delai_max_jours || 1} J
                </span>
              </div>
            </div>

            {/* Pièces à fournir obligatoirement */}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.04em' }}>
                PIÈCES À FOURNIR OBLIGATOIREMENT :
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {champsDynamiques.filter(c => c.type_champ === 'file').length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#94a3b8' }} />
                    <span>Aucune pièce requise</span>
                  </div>
                ) : (
                  champsDynamiques.filter(c => c.type_champ === 'file').map(c => (
                    <div key={c.nom_champ} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--c-text-primary, #334155)' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                      <span style={{ fontWeight: '600' }}>{c.label}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Boutons Annuler / Commencer */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  border: '1.5px solid #cbd5e1',
                  color: 'var(--c-text-secondary, #475569)',
                  fontWeight: '700',
                  fontSize: '0.92rem',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInfoModal(false);
                  setStep(2); // Direction Lieu de dépôt
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.92rem',
                  cursor: 'pointer'
                }}
              >
                Commencer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : LIEU DE DÉPÔT & RETRAIT ── */}
      {step === 2 && (
        <div style={{ backgroundColor: 'var(--c-bg-card, #ffffff)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--c-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ÉTAPE 2
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '4px 0 6px' }}>
              Sélectionnez votre centre d'état civil
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)', margin: 0 }}>
              Choisissez le lieu de dépôt de votre dossier pour le traitement administratif officiel
            </p>
          </div>

          {/* Bouton GPS Trouver le centre le plus proche */}
          <button
            type="button"
            onClick={findClosestCentre}
            disabled={locating}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '12px 18px',
              borderRadius: '14px',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #bfdbfe',
              color: '#2563eb',
              fontWeight: '700',
              fontSize: '0.9rem',
              cursor: 'pointer',
              alignSelf: 'flex-start'
            }}
          >
            <Navigation size={18} />
            <span>{locating ? 'Recherche GPS en cours...' : 'Trouver le centre le plus proche (GPS)'}</span>
          </button>

          {/* Sélecteurs en cascade : Région -> Département -> Commune -> Centre */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                Région
              </label>
              <select
                value={selectedRegionId}
                onChange={(e) => {
                  setSelectedRegionId(e.target.value);
                  setSelectedDeptId('');
                  setSelectedCommuneId('');
                  setSelectedCentreId('');
                }}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
              >
                <option value="">Toutes les régions</option>
                {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                Département
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => {
                  setSelectedDeptId(e.target.value);
                  setSelectedCommuneId('');
                  setSelectedCentreId('');
                }}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
              >
                <option value="">Tous les départements</option>
                {filteredDepts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                Commune
              </label>
              <select
                value={selectedCommuneId}
                onChange={(e) => {
                  setSelectedCommuneId(e.target.value);
                  setSelectedCentreId('');
                }}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
              >
                <option value="">Toutes les communes</option>
                {filteredCommunes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                Centre d'état civil (Dépôt) *
              </label>
              <select
                value={selectedCentreId}
                onChange={(e) => setSelectedCentreId(e.target.value)}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '2px solid #2563eb', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-card, #ffffff)', fontWeight: '600' }}
              >
                <option value="">Sélectionner le centre *</option>
                {filteredCentres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Option de transfert vers un autre centre pour le retrait physique */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={hasTransfer}
                onChange={(e) => setHasTransfer(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)' }}>
                Je souhaite retirer mon document physique dans un autre centre (Commune de résidence)
              </span>
            </label>

            {hasTransfer && (
              <div style={{ backgroundColor: 'var(--c-bg-subtle, #f8fafc)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--c-border, #e2e8f0)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Région de retrait</label>
                  <select
                    value={delivRegionId}
                    onChange={(e) => {
                      setDelivRegionId(e.target.value);
                      setDelivDeptId('');
                      setDelivCommuneId('');
                      setDelivCentreId('');
                    }}
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.85rem' }}
                  >
                    <option value="">Toutes</option>
                    {regions.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Département de retrait</label>
                  <select
                    value={delivDeptId}
                    onChange={(e) => {
                      setDelivDeptId(e.target.value);
                      setDelivCommuneId('');
                      setDelivCentreId('');
                    }}
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.85rem' }}
                  >
                    <option value="">Tous</option>
                    {delivFilteredDepts.map(d => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Commune de retrait</label>
                  <select
                    value={delivCommuneId}
                    onChange={(e) => {
                      setDelivCommuneId(e.target.value);
                      setDelivCentreId('');
                    }}
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.85rem' }}
                  >
                    <option value="">Toutes</option>
                    {delivFilteredCommunes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Centre de retrait physique *</label>
                  <select
                    value={delivCentreId}
                    onChange={(e) => setDelivCentreId(e.target.value)}
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1.5px solid #2563eb', padding: '0 10px', fontSize: '0.85rem', fontWeight: '600' }}
                  >
                    <option value="">Sélectionner centre de retrait *</option>
                    {delivFilteredCentres.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Boutons d'étape */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={goToPrevStep}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              Continuer vers les informations
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 : DONNÉES DU DOSSIER (FORMULAIRE DYNAMIQUE SANS MOTIF STATIQUE) ── */}
      {step === 3 && (
        <div style={{ backgroundColor: 'var(--c-bg-card, #ffffff)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--c-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ÉTAPE 3
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '4px 0 6px' }}>
              Renseignement des informations
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)', margin: 0 }}>
              Complétez les données requises pour le traitement officiel de votre acte
            </p>
          </div>

          {/* Motif officiel si configuré pour l'activité */}
          {selectedActivity?.motifs && selectedActivity.motifs.length > 0 && (
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                Motif officiel de la démarche *
              </label>
              <select
                value={formValues.motif || ''}
                onChange={(e) => setFormValues(prev => ({ ...prev, motif: e.target.value }))}
                style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
              >
                <option value="">Sélectionnez un motif officiel...</option>
                {(Array.isArray(selectedActivity.motifs) ? selectedActivity.motifs : []).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {/* Champs dynamiques texte / date / number / select */}
          {champsDynamiques.filter(c => c.type_champ !== 'file').length === 0 ? (
            <div style={{
              backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
              borderRadius: '16px',
              padding: '2rem',
              border: '1px solid var(--c-border, #e2e8f0)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                borderRadius: '16px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FileText size={26} />
              </div>
              <div style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                Aucune information textuelle requise
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--c-text-muted, #64748b)', maxWidth: '420px', margin: 0 }}>
                Cette démarche administrative ne nécessite aucune saisie manuelle spécifique. Les informations d'identité certifiées de votre profil citoyen seront directement associées au dossier.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {champsDynamiques.filter(c => c.type_champ !== 'file').map((champ) => {
                const val = formValues[champ.nom_champ] || '';

                return (
                  <div key={champ.nom_champ}>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: '700', color: 'var(--c-text-primary, #334155)', marginBottom: '6px' }}>
                      {champ.label} {champ.obligatoire && <span style={{ color: '#ef4444' }}>*</span>}
                    </label>

                    {champ.type_champ === 'select' ? (
                      <select
                        value={val}
                        onChange={(e) => setFormValues(prev => ({ ...prev, [champ.nom_champ]: e.target.value }))}
                        style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
                      >
                        <option value="">Sélectionner...</option>
                        {(champ.options || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    ) : champ.type_champ === 'date' ? (
                      <input
                        type="date"
                        value={val}
                        onChange={(e) => setFormValues(prev => ({ ...prev, [champ.nom_champ]: e.target.value }))}
                        style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
                      />
                    ) : champ.type_champ === 'number' ? (
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => setFormValues(prev => ({ ...prev, [champ.nom_champ]: e.target.value }))}
                        placeholder={champ.placeholder || ''}
                        style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
                      />
                    ) : champ.type_champ === 'textarea' ? (
                      <textarea
                        rows={3}
                        value={val}
                        onChange={(e) => setFormValues(prev => ({ ...prev, [champ.nom_champ]: e.target.value }))}
                        placeholder={champ.placeholder || ''}
                        style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '10px 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)', resize: 'vertical' }}
                      />
                    ) : (
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setFormValues(prev => ({ ...prev, [champ.nom_champ]: e.target.value }))}
                        placeholder={champ.placeholder || ''}
                        style={{ width: '100%', height: '44px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 12px', fontSize: '0.9rem', backgroundColor: 'var(--c-bg-subtle, #f8fafc)' }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Boutons d'étape */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <button type="button" onClick={goToPrevStep} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', backgroundColor: 'var(--c-bg-card, #ffffff)', fontWeight: '600', cursor: 'pointer' }}>
              Précédent
            </button>
            <button type="button" onClick={goToNextStep} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}>
              {hasDocumentStep ? 'Continuer vers les pièces jointes' : (isFreeActivity ? 'Continuer vers la confirmation' : 'Continuer vers le résumé & paiement')}
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 : PIÈCES JUSTIFICATIVES (DYNAMIQUE) ── */}
      {step === 4 && hasDocumentStep && (
        <div style={{ backgroundColor: 'var(--c-bg-card, #ffffff)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--c-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              ÉTAPE 4
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '4px 0 6px' }}>
              Pièces justificatives obligatoires
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)', margin: 0 }}>
              Téléversez les documents justificatifs au format PDF ou image (PNG, JPG)
            </p>
          </div>

          {/* Liste des champs de type file */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {champsDynamiques.filter(c => c.type_champ === 'file').map((champ) => {
              const fileObj = uploadedFiles[champ.nom_champ];
              const isUploading = uploadingField === champ.nom_champ;

              return (
                <div
                  key={champ.nom_champ}
                  style={{
                    border: '1.5px dashed ' + (fileObj ? '#10b981' : '#cbd5e1'),
                    borderRadius: '16px',
                    padding: '1.25rem',
                    backgroundColor: fileObj ? '#f0fdf4' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: fileObj ? '#dcfce7' : '#f1f5f9',
                      color: fileObj ? '#10b981' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {fileObj ? <CheckCircle2 size={24} /> : <Upload size={22} />}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--c-text-primary, #0f172a)' }}>
                        {champ.label} {champ.obligatoire && <span style={{ color: '#ef4444' }}>*</span>}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)', marginTop: '2px' }}>
                        {fileObj ? fileObj.name : (champ.description || 'Format PDF, JPG ou PNG')}
                      </div>
                    </div>
                  </div>

                  <div>
                    {isUploading ? (
                      <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#2563eb' }}>Envoi en cours...</span>
                    ) : fileObj ? (
                      <button
                        type="button"
                        onClick={() => removeFile(champ.nom_champ)}
                        style={{
                          backgroundColor: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Supprimer</span>
                      </button>
                    ) : (
                      <label style={{
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <Upload size={14} />
                        <span>Téléverser</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={(e) => handleFileUpload(champ.nom_champ, e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boutons d'étape */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <button type="button" onClick={goToPrevStep} style={{ padding: '10px 20px', borderRadius: '12px', border: '1px solid var(--c-border, #cbd5e1)', backgroundColor: 'var(--c-bg-card, #ffffff)', fontWeight: '600', cursor: 'pointer' }}>
              Précédent
            </button>
            <button type="button" onClick={goToNextStep} style={{ padding: '10px 24px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: '700', cursor: 'pointer' }}>
              {isFreeActivity ? 'Continuer vers la confirmation' : 'Continuer vers le résumé & paiement'}
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 4 OU 5 : RÉSUMÉ DU DOSSIER & PAIEMENT (CATALOGUE COMPLET) ── */}
      {isRecapStep && (
        <div style={{ backgroundColor: 'var(--c-bg-card, #ffffff)', borderRadius: '20px', padding: '2rem', border: '1px solid var(--c-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--c-text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              DERNIÈRE ÉTAPE
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: '4px 0 6px' }}>
              {isFreeActivity ? 'Récapitulatif & Confirmation officielle' : 'Récapitulatif & Règlement officiel'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--c-text-muted, #64748b)', margin: 0 }}>
              {isFreeActivity ? 'Vérifiez les données du dossier avant de transmettre votre demande officielle' : 'Vérifiez les données du dossier et sélectionnez votre mode de paiement sécurisé'}
            </p>
          </div>

          {/* Carte Récapitulatif */}
          <div style={{ backgroundColor: 'var(--c-bg-subtle, #f8fafc)', borderRadius: '16px', padding: '1.25rem', border: '1px solid var(--c-border, #e2e8f0)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem' }}>Démarche / Service :</span>
              <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)', fontSize: '0.88rem' }}>{bureauNom} • {selectedService?.nom}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem' }}>Type de document :</span>
              <span style={{ fontWeight: '700', color: '#2563eb', fontSize: '0.88rem' }}>{selectedActivity?.nom}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <span style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem' }}>Centre de dépôt :</span>
              <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)', fontSize: '0.88rem' }}>
                {centres.find(c => String(c.id) === String(selectedCentreId))?.nom || "Centre d'état civil"}
              </span>
            </div>
            {hasTransfer && delivCentreId && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                <span style={{ color: 'var(--c-text-muted, #64748b)', fontSize: '0.85rem' }}>Centre de retrait physique :</span>
                <span style={{ fontWeight: '700', color: 'var(--c-text-primary, #0f172a)', fontSize: '0.88rem' }}>
                  {centres.find(c => String(c.id) === String(delivCentreId))?.nom || 'Centre de retrait'}
                </span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
              <span style={{ color: 'var(--c-text-primary, #0f172a)', fontWeight: '800', fontSize: '0.95rem' }}>Montant total de la démarche :</span>
              <span style={{ color: Number(selectedActivity?.prix || 0) === 0 ? '#10b981' : '#2563eb', fontWeight: '800', fontSize: '1.2rem' }}>
                {Number(selectedActivity?.prix || 0) === 0 ? 'Gratuit (0 FCFA)' : (Number(selectedActivity?.prix).toLocaleString('fr-FR') + ' FCFA')}
              </span>
            </div>
          </div>

          {/* ── SI DÉMARCHE GRATUITE : PAS DE PAIEMENT PAR WAVE / ORANGE MONEY ── */}
          {isFreeActivity ? (
            <div style={{
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #a7f3d0',
              borderRadius: '16px',
              padding: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '14px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CheckCircle2 size={26} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1.05rem', fontWeight: '800', color: '#065f46' }}>
                  Démarche administrative 100% Gratuite (0 FCFA)
                </div>
                <div style={{ fontSize: '0.85rem', color: '#047857', marginTop: '3px', lineHeight: 1.45 }}>
                  Cette démarche est entièrement prise en charge et exonérée de tout frais officiel. Aucun paiement par Wave, Orange Money ou carte bancaire n'est requis. Vous pouvez confirmer directement ci-dessous.
                </div>
              </div>
            </div>
          ) : (
          /* ── CATALOGUE OFFICIEL DES MODES DE PAIEMENT SÉNÉGALAIS ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)', margin: 0 }}>
                  Mode de règlement sécurisé (Passerelle PayTech)
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--c-text-muted, #64748b)', margin: '3px 0 0' }}>
                  Choisissez votre opérateur mobile ou bancaire pour valider et affecter le paiement
                </p>
              </div>
              <span style={{
                backgroundColor: '#ecfdf5',
                color: '#10b981',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <ShieldCheck size={14} />
                SÉCURISÉ 256-BIT
              </span>
            </div>

            {/* Cartes Opérateurs : Wave, Orange Money, Free Money, Carte Bancaire */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {[
                {
                  id: 'wave',
                  name: 'Wave Sénégal',
                  subtitle: 'Paiement sans frais • Instantané',
                  color: '#1CC2FF',
                  badge: 'Populaire',
                  icon: Smartphone
                },
                {
                  id: 'orange_money',
                  name: 'Orange Money',
                  subtitle: 'Direct mobile via #144# ou push',
                  color: '#FF7900',
                  badge: 'Direct #144#',
                  icon: Smartphone
                },
                {
                  id: 'free_money',
                  name: 'Free Money',
                  subtitle: 'Validation directe compte Free',
                  color: '#059669',
                  badge: 'Disponible',
                  icon: Smartphone
                },
                {
                  id: 'carte',
                  name: 'Carte Bancaire',
                  subtitle: 'Visa • Mastercard 3D Secure',
                  color: '#6366F1',
                  badge: 'International',
                  icon: CreditCard
                }
              ].map(op => {
                const isSelected = paymentOperator === op.id;
                const IconComp = op.icon;

                return (
                  <div
                    key={op.id}
                    onClick={() => setPaymentOperator(op.id)}
                    style={{
                      border: '2px solid ' + (isSelected ? op.color : '#e2e8f0'),
                      borderRadius: '16px',
                      padding: '14px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(37,99,235,0.03)' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? `0 4px 16px ${op.color}25` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: op.color + '15',
                        color: op.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <IconComp size={20} />
                      </div>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        border: '2px solid ' + (isSelected ? op.color : '#cbd5e1'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isSelected ? op.color : 'transparent'
                      }}>
                        {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                        {op.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--c-text-muted, #64748b)', marginTop: '2px' }}>
                        {op.subtitle}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', backgroundColor: op.color + '15', color: op.color }}>
                        {op.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coordonnées pré-remplies du payeur (modifiables) */}
            <div style={{
              backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
              borderRadius: '16px',
              padding: '1.25rem',
              border: '1px solid var(--c-border, #e2e8f0)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                  Coordonnées de facturation du payeur
                </span>
                <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#0284c7', backgroundColor: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                  Auto-rempli depuis votre compte
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>
                    Nom et prénom
                  </label>
                  <input
                    type="text"
                    value={payerFullName}
                    onChange={(e) => setPayerFullName(e.target.value)}
                    placeholder="Nom complet du payeur"
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>
                    Numéro de téléphone ({paymentOperator === 'orange_money' ? 'Orange' : (paymentOperator === 'wave' ? 'Wave' : 'Contact')})
                  </label>
                  <input
                    type="text"
                    value={payerPhone}
                    onChange={(e) => setPayerPhone(e.target.value)}
                    placeholder="77 000 00 00"
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>
                    Adresse Email (pour le reçu)
                  </label>
                  <input
                    type="email"
                    value={payerEmail}
                    onChange={(e) => setPayerEmail(e.target.value)}
                    placeholder="citoyen@domaine.sn"
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Boutons d'étape */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={goToPrevStep}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1px solid var(--c-border, #cbd5e1)',
                backgroundColor: 'var(--c-bg-card, #ffffff)',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Précédent
            </button>
            {isFreeActivity ? (
              <button
                type="button"
                onClick={() => handleSubmitDemande(false)}
                disabled={submitting}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(16,185,129,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle2 size={18} />
                <span>{submitting ? 'Transmission du dossier...' : 'Confirmer et transmettre ma demande'}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPayModal(true)}
                disabled={submitting}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: paymentOperator === 'wave' ? '#1CC2FF' : (paymentOperator === 'orange_money' ? '#FF7900' : '#2563eb'),
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  boxShadow: '0 6px 18px rgba(37,99,235,0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Lock size={18} />
                <span>
                  Payer et valider via {paymentOperator === 'wave' ? 'Wave' : (paymentOperator === 'orange_money' ? 'Orange Money' : (paymentOperator === 'free_money' ? 'Free Money' : 'Carte Bancaire'))}
                  {Number(selectedActivity?.prix || 0) > 0 ? ` (${Number(selectedActivity.prix).toLocaleString('fr-FR')} FCFA)` : ''}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL GUICHET DE PAIEMENT PAYTECH INTERACTIF ── */}
      {showPayModal && !isFreeActivity && (
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
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            {/* Entête PayTech */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '12px',
                  backgroundColor: paymentOperator === 'wave' ? '#e0f7ff' : (paymentOperator === 'orange_money' ? '#fff7ed' : '#eff6ff'),
                  color: paymentOperator === 'wave' ? '#1CC2FF' : (paymentOperator === 'orange_money' ? '#FF7900' : '#2563eb'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <CreditCard size={22} />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--c-text-primary, #0f172a)' }}>
                    Guichet PayTech • {paymentOperator === 'wave' ? 'Wave' : (paymentOperator === 'orange_money' ? 'Orange Money' : (paymentOperator === 'free_money' ? 'Free Money' : 'Carte Bancaire'))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--c-text-muted, #64748b)' }}>
                    République du Sénégal • Ministère de l'Intérieur
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={paymentProcessing || submitting}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Détails du montant */}
            <div style={{
              backgroundColor: 'var(--c-bg-subtle, #f8fafc)',
              borderRadius: '16px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              border: '1px solid var(--c-border, #e2e8f0)'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--c-text-muted, #64748b)', fontWeight: '700' }}>TOTAL TRANSACTION</span>
                <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--c-text-primary, #0f172a)' }}>
                  {Number(selectedActivity?.prix || 0) === 0 ? 'Gratuit (Frais 0 FCFA)' : (Number(selectedActivity?.prix).toLocaleString('fr-FR') + ' FCFA')}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--c-text-muted, #64748b)' }}>Bénéficiaire</span>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#2563eb' }}>SenInnov Trésor Public</div>
              </div>
            </div>

            {/* Contenu spécifique par opérateur */}
            {paymentOperator === 'wave' && (
              <div style={{
                backgroundColor: '#f0f9ff',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #bae6fd',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '16px',
                  backgroundColor: 'var(--c-bg-card, #ffffff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(28,194,255,0.2)',
                  border: '2px solid #1CC2FF'
                }}>
                  <QrCode size={64} color="#1CC2FF" />
                </div>
                <div>
                  <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0369a1' }}>
                    Scanner le QR Code Wave
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '2px' }}>
                    Ou validez directement le débit sur votre numéro : <strong>{payerPhone || user?.telephone || 'Numéro citoyen'}</strong>
                  </div>
                </div>
              </div>
            )}

            {paymentOperator === 'orange_money' && (
              <div style={{
                backgroundColor: '#fff7ed',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #ffedd5',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '800', color: '#c2410c' }}>
                  Autorisation Orange Money Sénégal
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9a3412', lineHeight: 1.4 }}>
                  Composez le <strong>#144#391#</strong> sur votre téléphone Orange pour générer un code temporaire ou validez la demande reçue sur votre application Orange Money.
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#9a3412', marginBottom: '4px' }}>
                    Code d'autorisation (OTP / USSD)
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={omOtp}
                    onChange={(e) => setOmOtp(e.target.value)}
                    placeholder="Ex: 849201 (Optionnel)"
                    style={{ width: '100%', height: '42px', borderRadius: '10px', border: '1.5px solid #fdba74', padding: '0 12px', fontSize: '0.95rem', fontWeight: '700', letterSpacing: '0.1em', backgroundColor: 'var(--c-bg-card, #ffffff)' }}
                  />
                </div>
              </div>
            )}

            {paymentOperator === 'free_money' && (
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '16px',
                padding: '1.25rem',
                border: '1.5px solid #bbf7d0',
                fontSize: '0.85rem',
                color: '#166534',
                lineHeight: 1.5
              }}>
                Un ordre de débit sera envoyé sur votre numéro Free <strong>{payerPhone || user?.telephone}</strong>. Vous recevrez un SMS pour confirmer votre paiement avec votre code secret Free Money.
              </div>
            )}

            {paymentOperator === 'carte' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Numéro de Carte Bancaire</label>
                  <input
                    type="text"
                    placeholder="4123 •••• •••• 9812"
                    defaultValue="4123 9018 2741 9812"
                    style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.9rem' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Date d'expiration</label>
                    <input
                      type="text"
                      placeholder="MM/AA"
                      defaultValue="08/28"
                      style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--c-text-muted, #64748b)', marginBottom: '4px' }}>Cryptogramme (CVV)</label>
                    <input
                      type="password"
                      maxLength={3}
                      placeholder="123"
                      defaultValue="789"
                      style={{ width: '100%', height: '40px', borderRadius: '10px', border: '1px solid var(--c-border, #cbd5e1)', padding: '0 10px', fontSize: '0.9rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Bouton d'action final */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={paymentProcessing || submitting}
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
                onClick={handleConfirmPaytechPayment}
                disabled={paymentProcessing || submitting}
                style={{
                  flex: 2,
                  padding: '12px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: paymentOperator === 'wave' ? '#1CC2FF' : (paymentOperator === 'orange_money' ? '#FF7900' : '#2563eb'),
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                  opacity: (paymentProcessing || submitting) ? 0.7 : 1
                }}
              >
                {(paymentProcessing || submitting) ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Affectation du règlement...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Confirmer et affecter le paiement</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
