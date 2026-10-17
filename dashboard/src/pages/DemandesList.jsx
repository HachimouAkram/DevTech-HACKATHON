import { API_BASE_URL } from '../utils/api.js';
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Pagination from '../components/Pagination';
import { Search, Eye, Check, XCircle, X, ShieldAlert, ClipboardCheck, DollarSign, Clock, FileText, CheckCircle, Download, ExternalLink } from 'lucide-react';
import RejectModal from '../components/Demandes/Modals/RejectModal';
import AssignModal from '../components/Demandes/Modals/AssignModal';
import GenerateDocumentModal from '../components/Demandes/Modals/GenerateDocumentModal';
import DetailModal from '../components/Demandes/Modals/DetailModal';
import { useDemandes, useToggleArchive, useUpdateDemandeStatus, useProgressWorkflow, useReturnWorkflow } from '../hooks/useDemandes';
import { useQueryClient } from '@tanstack/react-query';

export default function DemandesList({ token, currentUser, defaultArchive = false }) {
  const queryClient = useQueryClient();
  const [demandes, setDemandes] = useState([]);
  const [allDemandes, setAllDemandes] = useState([]);

  // Search & Filters

  // Handlers for transferts (Délivrance Décentralisée)
  const handleConfirmTransfertReceipt = async (demandeId) => {
    if (!window.confirm("Confirmez-vous avoir reçu physiquement cet acte civil dans votre centre ?")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${demandeId}/transfert/statut`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: 'recu' })
      });
      if (response.ok) {
        alert("Réception confirmée. L'acte est marqué comme disponible pour retrait.");
        fetchDemandes();
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Erreur: " + (err.message || "Impossible de confirmer la réception"));
      }
    } catch (err) {
      alert("Erreur réseau: " + err.message);
    }
  };

  const handleExpedierDocument = async (demandeId) => {
    if (!window.confirm("Voulez-vous vraiment expédier ce document au centre de délivrance ?\n\nCela rendra le document visible par le centre de délivrance pour réception.")) return;
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${demandeId}/transfert/expedier`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        alert("Document expédié avec succès.");
        fetchDemandes();
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Erreur: " + (err.message || "Impossible d'expédier le document"));
      }
    } catch (err) {
      alert("Erreur réseau: " + err.message);
    }
  };

  const handleSendTransfertMessage = async (demandeId, msg) => {
    if (!msg.trim()) return;
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${demandeId}/transfert/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: msg })
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedDemande(data.data.demande);
        fetchDemandes();
      } else {
        const err = await response.json().catch(() => ({}));
        alert("Erreur d'envoi: " + (err.message || "Action impossible"));
      }
    } catch (err) {
      alert("Erreur réseau: " + err.message);
    }
  };

  const handleDownloadPdf = async (e, demandeId) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${demandeId}/pdf?token=${token}`, {
        method: 'GET'
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        alert(`Cette activité n'a pas de document électronique.\nL'agent devra remplir les informations manuellement sur le document physique.`);
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors du téléchargement du PDF.");
    }
  };

  // Pagination State
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => {
    const queryParams = new URLSearchParams(window.location.search);
    return queryParams.get('statut') || '';
  });
  const [showArchived, setShowArchived] = useState(defaultArchive);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Filtres customisés
  const [activiteId, setActiviteId] = useState('');
  const [activitiesList, setActivitiesList] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [kpiCounts, setKpiCounts] = useState({
    rejete: 0,
    en_cours: 0,
    valide: 0,
    signature: 0,
    loading: false
  });

  useEffect(() => {
    let active = true;
    const fetchKPIs = async () => {
      setKpiCounts(prev => ({ ...prev, loading: true }));
      try {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
        if (activiteId) queryParams.append('activiteId', activiteId);
        queryParams.append('archive', showArchived ? 'true' : 'false');
        queryParams.append('size', '1');
        queryParams.append('page', '0');

        const fetchStatusCount = async (statut) => {
          const params = new URLSearchParams(queryParams);
          if (statut) params.append('statut', statut);
          const response = await fetch(`${API_BASE_URL}/demandes?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            return data.data?.totalElements || 0;
          }
          return 0;
        };

        const [
          countRejete,
          countEnAttente,
          countEnCours,
          countVerification,
          countEnTraitement,
          countRecours,
          countValide,
          countValideCloture,
          countPret,
          countSignature
        ] = await Promise.all([
          fetchStatusCount('rejete'),
          fetchStatusCount('en_attente'),
          fetchStatusCount('en_cours'),
          fetchStatusCount('verification_dossier'),
          fetchStatusCount('en_traitement'),
          fetchStatusCount('recours'),
          fetchStatusCount('valide'),
          fetchStatusCount('valide_cloture'),
          fetchStatusCount('pret'),
          fetchStatusCount('signature')
        ]);

        if (active) {
          setKpiCounts({
            rejete: countRejete,
            en_cours: countEnAttente + countEnCours + countVerification + countEnTraitement + countRecours,
            valide: countValide + countValideCloture + countPret,
            signature: countSignature,
            loading: false
          });
        }
      } catch (err) {
        console.error("Erreur de chargement des KPIs:", err);
        if (active) {
          setKpiCounts(prev => ({ ...prev, loading: false }));
        }
      }
    };

    fetchKPIs();
    return () => { active = false; };
  }, [search, startDate, endDate, activiteId, showArchived, token, demandes]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlStatut = queryParams.get('statut') || '';
    setStatusFilter(urlStatut);
    setCurrentPage(1);
  }, [location.search]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/activities`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setActivitiesList(data.data.activities || []);
        }
      })
      .catch(err => console.error("Erreur chargement liste activités:", err));
  }, [token]);

  const handleMonthYearChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);

    if (month === '' && year === '') {
      setStartDate('');
      setEndDate('');
      setCurrentPage(1);
      return;
    }

    const y = year || new Date().getFullYear().toString();
    if (month === '') {
      setStartDate(`${y}-01-01`);
      setEndDate(`${y}-12-31`);
    } else {
      const m = parseInt(month) + 1;
      const formattedMonth = m < 10 ? `0${m}` : `${m}`;
      const lastDay = new Date(parseInt(y), m, 0).getDate();
      setStartDate(`${y}-${formattedMonth}-01`);
      setEndDate(`${y}-${formattedMonth}-${lastDay}`);
    }
    setCurrentPage(1);
  };

  const handleTodayFilter = () => {
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setSelectedMonth('');
    setSelectedYear('');
    setCurrentPage(1);
  };

  // Detail Modal
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDemandeFields, setSelectedDemandeFields] = useState([]);

  // Reject Modal
  const [rejectingId, setRejectingId] = useState(null);
  const [motifRejet, setMotifRejet] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // File Preview Lightbox
  const [previewFileUrl, setPreviewFileUrl] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [previewRotation, setPreviewRotation] = useState(0);

  // Document Generation / Upload
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [templatesForActivity, setTemplatesForActivity] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [generationLoading, setGenerationLoading] = useState(false);
  const [generatedDocxUrl, setGeneratedDocxUrl] = useState('');
  const [finalUploadFile, setFinalUploadFile] = useState(null);

  // Assign Signer Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignDemandeId, setAssignDemandeId] = useState(null);
  const [assignStep, setAssignStep] = useState(1); // 1: Profile, 2: User
  const [assignProfile, setAssignProfile] = useState(''); // GERER_COMMUNE, GERER_CENTRE, GERER_SERVICES
  const [assignUsers, setAssignUsers] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedAssignUserId, setSelectedAssignUserId] = useState('');

  const hierarchy = ['GERER_GLOBAL', 'GERER_REGION', 'GERER_DEPARTEMENT', 'GERER_COMMUNE', 'GERER_CENTRE', 'GERER_BUREAU', 'GERER_SERVICES', 'GERER_ACTIVITES', 'GERER_ARCHIVE'];
  const userLevelIndex = currentUser?.permissions?.length > 0 ? Math.min(...currentUser.permissions.map(p => hierarchy.indexOf(p)).filter(i => i !== -1)) : -1;
  const isOfficerOrAbove = userLevelIndex !== -1 && userLevelIndex <= hierarchy.indexOf('GERER_SERVICES');
  const isAgentOrAbove = userLevelIndex !== -1 && userLevelIndex <= hierarchy.indexOf('GERER_ACTIVITES');
  const isArchiviste = currentUser?.permissions?.includes('GERER_ARCHIVE');

  const { data: demandesResponse, isLoading: loading, error: queryError } = useDemandes(token, {
    page: currentPage - 1,
    size: itemsPerPage,
    statusFilter,
    search,
    showArchived,
    startDate,
    endDate,
    activiteId
  });
  const error = queryError ? queryError.message : '';

  useEffect(() => {
    if (demandesResponse?.data) {
      setAllDemandes(demandesResponse.data.demandes || []);
      setDemandes(demandesResponse.data.demandes || []);
      setTotalElements(demandesResponse.data.totalElements || (demandesResponse.data.demandes || []).length);
    }
  }, [demandesResponse]);

  const fetchDemandes = () => {
    queryClient.invalidateQueries({ queryKey: ['demandes'] });
  };

  const toggleArchiveMutation = useToggleArchive(token);
  const updateStatusMutation = useUpdateDemandeStatus(token);
  const progressWorkflowMutation = useProgressWorkflow(token);
  const returnWorkflowMutation = useReturnWorkflow(token);

  const filteredDemandes = demandes.filter(d => {
    // If filtering by incoming transfers
    if (statusFilter === 'transferts_recus') {
      const isTransfer = d.centre_delivrance_id && currentUser?.centre_id && d.centre_delivrance_id === currentUser.centre_id && d.centre_id !== currentUser.centre_id;
      const hasValidTransferStatus = d.statut_transfert === 'en_transit' || d.statut_transfert === 'recu' || d.statut_transfert === 'pret_a_expedier' || d.statut_transfert === 'en_attente_envoi';
      if (!isTransfer || !hasValidTransferStatus) return false;
    }
    return true;
  });

  const handleToggleArchive = async (demandeId, currentArchiveState) => {
    const actionStr = currentArchiveState ? 'désarchiver' : 'archiver';
    if (!window.confirm(`Voulez-vous vraiment ${actionStr} ce dossier ?`)) return;

    try {
      await toggleArchiveMutation.mutateAsync({ id: demandeId, archive: !currentArchiveState });
      alert(`Dossier ${currentArchiveState ? 'désarchivé' : 'archivé'} avec succès.`);
      if (isDetailModalOpen) setIsDetailModalOpen(false);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    // Real-time synchronization via Server-Sent Events (SSE)
    const eventSource = new EventSource(`${API_BASE_URL}/realtime/stream`);

    eventSource.addEventListener("refresh_demandes", (event) => {
      console.log("Real-time update received: refresh demandes", event.data);
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
    });

    eventSource.onerror = () => {
      console.log("Real-time connection temporary loss or reconnecting...");
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);

  useEffect(() => {
    if (selectedDemande && demandes.length > 0) {
      const updated = demandes.find(d => d.id === selectedDemande.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedDemande)) {
        console.log("Synchronizing selectedDemande with updated demandes list", updated);
        setSelectedDemande(updated);
      }
    }
  }, [demandes, selectedDemande]);

  useEffect(() => {
    if (selectedDemande && selectedDemande.activite_id) {
      fetch(`${API_BASE_URL}/champs-dynamiques?activiteId=${selectedDemande.activite_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(res => {
          if (res.status === 'success') {
            setSelectedDemandeFields(res.data.champs || []);
          } else {
            setSelectedDemandeFields([]);
          }
        })
        .catch(err => {
          console.error('Error fetching dynamic fields:', err);
          setSelectedDemandeFields([]);
        });
    } else {
      setSelectedDemandeFields([]);
    }
  }, [selectedDemande, token]);

  const getFieldLabel = (key) => {
    const fieldObj = selectedDemandeFields.find(f => f.nom_champ === key);
    if (fieldObj) return fieldObj.label;
    const standardLabels = {
      destinataire: "Destinataire",
      type_document: "Type de document",
      motif: "Motif de la demande",
    };
    return standardLabels[key] || key;
  };

  const getFieldValueLabel = (key, val) => {
    const fieldObj = selectedDemandeFields.find(f => f.nom_champ === key);
    if (fieldObj && fieldObj.type_champ === 'select' && fieldObj.options) {
      const option = fieldObj.options.find(o => o.value === val);
      if (option) return option.label;
    }
    return val;
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDemandes();
  };

  const handlePrendreEnCharge = async (demandeId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${demandeId}/prendre-en-charge`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        alert("Demande prise en charge avec succès.");
        fetchDemandes();
      } else {
        const error = await response.json();
        alert("Erreur lors de la prise en charge : " + (error.message || "Erreur inconnue"));
      }
    } catch (err) {
      alert("Erreur réseau : " + err.message);
    }
  };

  // Change request status (Take charge or Validate)
  const handleUpdateStatus = async (demandeId, newStatut) => {
    if (newStatut === 'valide' && !window.confirm('Voulez-vous vraiment valider et signer cet acte civil ?')) return;

    try {
      const url = newStatut === 'valide'
        ? `${API_BASE_URL}/demandes/${demandeId}/finaliser`
        : `${API_BASE_URL}/demandes/${demandeId}/status`;

      const method = newStatut === 'valide' ? 'POST' : 'PUT';
      const bodyParams = newStatut === 'valide' ? null : JSON.stringify({ statut: newStatut });

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: bodyParams
      });

      if (response.ok) {
        alert(newStatut === 'valide' ? 'Demande finalisée avec succès' : 'Statut mis à jour avec succès');
        fetchDemandes();
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(`Erreur: ${errorData.message || 'Impossible de mettre à jour le statut'}`);
      }
    } catch (err) {
      alert(`Erreur réseau: ${err.message}`);
    }
  };

  const handleWorkflowProgress = async (demandeId, commentaire = "") => {
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${demandeId}/workflow/progress`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentaire })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la progression du workflow.');

      alert('Étape validée avec succès.');
      fetchDemandes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleWorkflowReturn = async (e) => {
    e.preventDefault();
    if (!motifRejet.trim()) {
      alert('Veuillez indiquer un motif ou commentaire de retour.');
      return;
    }

    setRejectLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${rejectingId}/workflow/return`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ commentaire: motifRejet })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors du retour en correction.');

      alert('Dossier retourné pour correction.');
      setRejectingId(null);
      fetchDemandes();
    } catch (err) {
      alert(err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // Submit Retour Agent (by Officer)
  const handleRetourAgent = async (e) => {
    e.preventDefault();
    if (!motifRejet.trim()) {
      alert('Veuillez indiquer un motif de refus.');
      return;
    }

    setRejectLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${rejectingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: 'en_traitement', motif_rejet: motifRejet })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors du retour à l\'agent.');

      alert('Dossier retourné à l\'agent instructeur.');
      setRejectingId(null);
      fetchDemandes();
    } catch (err) {
      alert(err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // Open Rejection Dialog
  const handleOpenRejectModal = (demandeId) => {
    setRejectingId(demandeId);
    setMotifRejet('');
    setIsDetailModalOpen(false);
  };

  // Submit Rejection
  const handleSubmitRejection = async (e) => {
    e.preventDefault();
    if (!motifRejet.trim()) {
      alert('Veuillez indiquer un motif de rejet.');
      return;
    }

    setRejectLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${rejectingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: 'rejete', motif_rejet: motifRejet })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors du rejet.');

      alert('Dossier rejeté.');
      setRejectingId(null);
      fetchDemandes();
    } catch (err) {
      alert(err.message);
    } finally {
      setRejectLoading(false);
    }
  };

  // Bulk Sign Logic (for DemandesList)
  const [isBulkSignModalOpen, setIsBulkSignModalOpen] = useState(false);
  const [bulkSignLoading, setBulkSignLoading] = useState(false);

  const handleBulkSign = async () => {
    setBulkSignLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/bulk-sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur lors de la signature groupée.');
      
      alert('Toutes vos demandes en attente de signature ont été validées et signées avec succès.');
      setIsBulkSignModalOpen(false);
      fetchDemandes();
    } catch (err) {
      alert(err.message);
    } finally {
      setBulkSignLoading(false);
    }
  };

  const [availableProfiles, setAvailableProfiles] = useState(null);

  const handleOpenAssignModal = async (demandeId) => {
    setAssignDemandeId(demandeId);
    setAssignStep(1);
    setAssignProfile('');
    setAssignUsers([]);
    setSelectedAssignUserId('');
    setIsAssignModalOpen(true);
    setIsDetailModalOpen(false);
    setAvailableProfiles(null);

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        let allUsers = data.data.users?.content || data.data.users || [];
        if (!Array.isArray(allUsers)) allUsers = [];
        const counts = {
          GERER_COMMUNE: allUsers.filter(u => u.permissions?.includes('GERER_COMMUNE') && u.commune_id === currentUser.commune_id).length,
          GERER_CENTRE: allUsers.filter(u => u.permissions?.includes('GERER_CENTRE') && u.centre_id === currentUser.centre_id).length,
          GERER_BUREAU: allUsers.filter(u => u.permissions?.includes('GERER_BUREAU') && (currentUser.bureau_id ? u.bureau_id === currentUser.bureau_id : u.centre_id === currentUser.centre_id)).length,
          GERER_SERVICES: allUsers.filter(u => u.permissions?.includes('GERER_SERVICES') && (currentUser.bureau_id ? u.bureau_id === currentUser.bureau_id : u.centre_id === currentUser.centre_id)).length
        };
        setAvailableProfiles(counts);
      } else {
        setAvailableProfiles({ GERER_COMMUNE: 1, GERER_CENTRE: 1, GERER_BUREAU: 1, GERER_SERVICES: 1 });
      }
    } catch (err) {
      console.error('Erreur prefetch users:', err);
      setAvailableProfiles({ GERER_COMMUNE: 1, GERER_CENTRE: 1, GERER_BUREAU: 1, GERER_SERVICES: 1 });
    }
  };

  const handleFetchAssignUsers = async (profilePermission) => {
    setAssignProfile(profilePermission);
    setAssignStep(2);
    setAssignLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users?permission=${profilePermission}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        let fetchedUsers = data.data.users.content || data.data.users || [];
        if (!Array.isArray(fetchedUsers)) fetchedUsers = [];
        if (profilePermission === 'GERER_COMMUNE') {
          fetchedUsers = fetchedUsers.filter(u => u.commune_id === currentUser.commune_id);
        } else if (profilePermission === 'GERER_CENTRE') {
          fetchedUsers = fetchedUsers.filter(u => u.centre_id === currentUser.centre_id);
        } else if (profilePermission === 'GERER_BUREAU' || profilePermission === 'GERER_SERVICES') {
          if (currentUser.bureau_id) {
            fetchedUsers = fetchedUsers.filter(u => u.bureau_id === currentUser.bureau_id);
          } else if (currentUser.centre_id) {
            fetchedUsers = fetchedUsers.filter(u => u.centre_id === currentUser.centre_id);
          }
        }
        setAssignUsers(fetchedUsers);
      } else {
        alert(data.message || 'Erreur chargement utilisateurs');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSubmitAssign = async () => {
    if (!selectedAssignUserId) {
      alert("Veuillez sélectionner une personne.");
      return;
    }
    setAssignLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/demandes/${assignDemandeId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ statut: 'signature', officier_id: selectedAssignUserId })
      });
      if (response.ok) {
        alert("Dossier envoyé à la signature avec succès.");
        setIsAssignModalOpen(false);
        fetchDemandes();
      } else {
        const err = await response.json().catch(() => ({}));
        alert(err.message || "Erreur lors de l'assignation");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleOpenGenerateModal = async (demande) => {
    setSelectedDemande(demande);
    setIsDetailModalOpen(false);
    setTemplatesForActivity([]);
    setSelectedTemplate('');
    setGeneratedDocxUrl('');
    setFinalUploadFile(null);
    setIsGenerateModalOpen(true);

    try {
      const res = await fetch(`${API_BASE_URL}/document-templates/activite/${demande.activite_id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const activeTemplates = data.filter(t => t.actif);
        setTemplatesForActivity(activeTemplates);

        const principal = activeTemplates.find(t => t.principal);
        if (principal) {
          setSelectedTemplate(principal.id.toString());
        } else if (activeTemplates.length === 1) {
          setSelectedTemplate(activeTemplates[0].id.toString());
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) return alert("Veuillez sélectionner un modèle");
    setGenerationLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/demandes/${selectedDemande.id}/generer-document?templateId=${selectedTemplate}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur de génération');

      const templateObj = templatesForActivity.find(t => t.id === parseInt(selectedTemplate));
      if (templateObj.type === 'HTML') {
        alert('Document généré et associé à la demande !');
        fetchDemandes();
        setIsGenerateModalOpen(false);
        handleUpdateStatus(selectedDemande.id, 'valide');
      } else {
        setGeneratedDocxUrl(data.data.url);
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerationLoading(false);
    }
  };

  const handleFinalUpload = async () => {
    if (!finalUploadFile) return alert("Veuillez sélectionner le fichier final (PDF)");
    setGenerationLoading(true);
    try {
      const form = new FormData();
      form.append('file', finalUploadFile);
      const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: form
      });
      if (!uploadRes.ok) throw new Error("Erreur upload du PDF final");
      const urlText = await uploadRes.text();

      const finalizeRes = await fetch(`${API_BASE_URL}/demandes/${selectedDemande.id}/upload-final-document?url=${encodeURIComponent(urlText)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!finalizeRes.ok) throw new Error("Erreur lors de l'association du document final");

      alert('Document final enregistré !');
      fetchDemandes();
      setIsGenerateModalOpen(false);
      handleUpdateStatus(selectedDemande.id, 'valide');
    } catch (err) {
      alert(err.message);
    } finally {
      setGenerationLoading(false);
    }
  };

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'en_attente':
        return <span className="badge badge-warning">En attente</span>;
      case 'en_cours':
        return <span className="badge badge-info">En cours d'examen</span>;
      case 'verification_dossier':
        return <span className="badge" style={{ backgroundColor: 'rgba(79, 70, 229, 0.12)', color: '#4f46e5', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Vérification</span>;
      case 'en_traitement':
        return <span className="badge" style={{ backgroundColor: 'rgba(13, 148, 136, 0.12)', color: '#0d9488', border: '1px solid rgba(13, 148, 136, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>En traitement</span>;
      case 'signature':
        return <span className="badge" style={{ backgroundColor: 'rgba(219, 39, 119, 0.12)', color: '#db2777', border: '1px solid rgba(219, 39, 119, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>À signer</span>;
      case 'pret':
        return <span className="badge" style={{ backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Prêt</span>;
      case 'valide':
        return <span className="badge badge-success">Validé &amp; Clôturé</span>;
      case 'valide_cloture':
        return <span className="badge" style={{ backgroundColor: 'rgba(6, 78, 59, 0.15)', color: '#065f46', border: '1px solid rgba(6, 78, 59, 0.3)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700 }}>✅ Clôturé Présentiel</span>;
      case 'rejete':
        return <span className="badge badge-danger">Rejeté</span>;
      case 'recours':
        return <span className="badge" style={{ backgroundColor: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', border: '1px solid rgba(124, 58, 237, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Recours</span>;
      case 'hors_delais':
        return <span className="badge badge-danger" style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.25rem 0.5rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Délai dépassé</span>;
      default:
        return <span className="badge badge-secondary">{statut}</span>;
    }
  };


  return (
    <div>
      <div className="mb-6" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            {defaultArchive ? 'Dossiers Archivés' : "Suivi des Demandes d'Actes"}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {defaultArchive ? 'Consultez les dossiers archivés et désarchivez-les si nécessaire.' : "Consultez, traitez, validez ou rejetez les demandes de pièces administratives soumises par les citoyens."}
          </p>
        </div>
        
        {kpiCounts.signature > 0 && currentUser?.permissions?.includes('GERER_COMMUNE') && (
          <button
            onClick={() => setIsBulkSignModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', padding: '0.5rem 1rem', background: '#db2777', borderColor: '#db2777' }}
          >
            <ClipboardCheck size={18} /> Tout Signer ({kpiCounts.signature} en attente)
          </button>
        )}
      </div>

      {/* KPI Summary Cards */}
      <div className="premium-kpi-grid mb-6">
        <div className="kpi-card glass-card border-orange">
          <div className="kpi-icon icon-orange">
            <Clock size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Dossiers en cours</span>
            <span className="kpi-number">
              {kpiCounts.loading ? '...' : kpiCounts.en_cours}
            </span>
          </div>
        </div>

        <div className="kpi-card glass-card border-purple">
          <div className="kpi-icon icon-purple">
            <FileText size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Actes à signer</span>
            <span className="kpi-number">
              {kpiCounts.loading ? '...' : kpiCounts.signature}
            </span>
          </div>
        </div>

        <div className="kpi-card glass-card border-green">
          <div className="kpi-icon icon-green">
            <CheckCircle size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Dossiers validés</span>
            <span className="kpi-number">
              {kpiCounts.loading ? '...' : kpiCounts.valide}
            </span>
          </div>
        </div>

        <div className="kpi-card glass-card border-red">
          <div className="kpi-icon icon-red">
            <XCircle size={24} />
          </div>
          <div className="kpi-info-vertical">
            <span className="kpi-label">Dossiers rejetés</span>
            <span className="kpi-number">
              {kpiCounts.loading ? '...' : kpiCounts.rejete}
            </span>
          </div>
        </div>
      </div>

      {/* Barre de Recherche et Filtres Avancés */}
      <div className="glass-card mb-6" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Première Ligne : Recherche, Type d'acte, Statut */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Barre de recherche */}
            <div style={{ position: 'relative', flex: '2 1 300px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher par référence, citoyen..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                style={{ paddingLeft: '2.5rem', height: '42px', fontSize: '0.9rem' }}
              />
              <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Type de Document (Actif uniquement) */}
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <select
                className="form-input form-select"
                value={activiteId}
                onChange={(e) => { setActiviteId(e.target.value); setCurrentPage(1); }}
                style={{ height: '42px', fontSize: '0.9rem' }}
              >
                <option value="">Tous les documents</option>
                {activitiesList.filter(a => a.actif).map(a => (
                  <option key={a.id} value={a.id}>{a.nom}</option>
                ))}
              </select>
            </div>

            {/* Filtre par Statut */}
            <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
              <select
                className="form-input form-select"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ height: '42px', fontSize: '0.9rem' }}
              >
                <option value="">Tous les statuts</option>
                <option value="en_attente">En attente de traitement</option>
                <option value="en_cours">En cours d'instruction</option>
                <option value="verification_dossier">Vérification de dossier</option>
                <option value="en_traitement">En traitement</option>
                <option value="signature">À signer</option>
                <option value="pret">Prêt</option>
                <option value="valide">Dossiers validés</option>
                <option value="rejete">Dossiers rejetés</option>
                <option value="recours">Dossiers en recours</option>
                <option value="hors_delais">Délai dépassé (Expiré)</option>
                {currentUser?.centre_id && (
                  <option value="transferts_recus" style={{ fontWeight: 'bold', color: 'var(--primary)' }}>✈️ Transferts à recevoir</option>
                )}
              </select>
            </div>
          </div>

          {/* Deuxième Ligne : Filtres Temporels (Mois, Année, Aujourd'hui, Dates personnalisées, Réinitialiser) */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Sélecteur de Mois */}
              <select
                className="form-input form-select"
                value={selectedMonth}
                onChange={(e) => handleMonthYearChange(e.target.value, selectedYear)}
                style={{ width: '135px', height: '38px', fontSize: '0.85rem' }}
              >
                <option value="">Tous les mois</option>
                <option value="0">Janvier</option>
                <option value="1">Février</option>
                <option value="2">Mars</option>
                <option value="3">Avril</option>
                <option value="4">Mai</option>
                <option value="5">Juin</option>
                <option value="6">Juillet</option>
                <option value="7">Août</option>
                <option value="8">Septembre</option>
                <option value="9">Octobre</option>
                <option value="10">Novembre</option>
                <option value="11">Décembre</option>
              </select>

              {/* Sélecteur d'Année */}
              <select
                className="form-input form-select"
                value={selectedYear}
                onChange={(e) => handleMonthYearChange(selectedMonth, e.target.value)}
                style={{ width: '135px', height: '38px', fontSize: '0.85rem' }}
              >
                <option value="">Toutes les années</option>
                <option value="2022">2022</option>
                <option value="2023">2023</option>
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="2028">2028</option>
              </select>

              {/* Bouton Aujourd'hui */}
              <button
                type="button"
                onClick={handleTodayFilter}
                className="btn btn-secondary"
                style={{
                  padding: '0 1rem',
                  height: '38px',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--primary)',
                  border: '1px solid rgba(16, 185, 129, 0.2)'
                }}
              >
                Aujourd'hui
              </button>

              <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)', margin: '0 0.25rem' }}></div>

              {/* Plage de dates Du / Au */}
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Du</span>
                  <input
                    type="date"
                    className="form-input form-select"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setSelectedMonth('');
                      setSelectedYear('');
                      setCurrentPage(1);
                    }}
                    style={{ padding: '0 0.5rem', height: '38px', fontSize: '0.85rem', borderRadius: '8px', width: '135px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Au</span>
                  <input
                    type="date"
                    className="form-input form-select"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setSelectedMonth('');
                      setSelectedYear('');
                      setCurrentPage(1);
                    }}
                    style={{ padding: '0 0.5rem', height: '38px', fontSize: '0.85rem', borderRadius: '8px', width: '135px' }}
                  />
                </div>
              </div>

              {/* Bouton Effacer / Réinitialiser */}
              {(startDate !== '' || endDate !== '' || search !== '' || statusFilter !== '' || activiteId !== '' || selectedMonth !== '' || selectedYear !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setStartDate('');
                    setEndDate('');
                    setSearch('');
                    setStatusFilter('');
                    setActiviteId('');
                    setSelectedMonth('');
                    setSelectedYear('');
                    setCurrentPage(1);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '0 0.75rem',
                    height: '38px',
                    borderRadius: '8px',
                    border: '1px dashed var(--danger)',
                    background: 'rgba(239, 68, 68, 0.05)',
                    color: 'var(--danger)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Réinitialiser tous les filtres"
                >
                  <X size={14} /> Effacer
                </button>
              )}
            </div>

            {/* Affichage des archives et compteurs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: 'auto' }}>
              {isArchiviste && !defaultArchive && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  <input
                    type="checkbox"
                    checked={showArchived}
                    onChange={(e) => setShowArchived(e.target.checked)}
                    style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                  />
                  Afficher les archives
                </label>
              )}

              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', backgroundColor: 'var(--bg-primary)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
                {totalElements} résultat{totalElements !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des Demandes */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
            <div className="loading-spinner"></div>
          </div>
        ) : error ? (
          <div style={{ padding: '2rem', color: 'var(--danger)', textAlign: 'center' }}>
            Une erreur est survenue : {error}
          </div>
        ) : filteredDemandes.length === 0 ? (
          <div style={{ padding: '3rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
            {(startDate !== '' || endDate !== '') ? `Aucune demande pour la période sélectionnée.` : 'Aucune demande trouvée.'}
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Citoyen</th>
                  <th>Acte Demandé</th>
                  <th>Lieu de Traitement / Dépôt</th>
                  <th>Centre de Délivrance</th>
                  <th>Frais (CFA)</th>
                  <th>Date Soumission</th>
                  <th>Instructeur / Validateur</th>
                  <th>Statut</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDemandes.map((demande) => (
                  <tr key={demande.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--secondary)' }}>{demande.reference}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{demande.citoyen_nom || 'Citoyen Anonyme'}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{demande.citoyen_telephone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 550 }}>{demande.activite_nom}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{demande.service_nom}</div>
                      {demande.motif && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '2px', fontWeight: 600 }}>Motif: {demande.motif}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{demande.centre_nom || 'Non spécifié'}</div>
                    </td>
                    <td>
                      {demande.centre_delivrance_id && demande.centre_delivrance_id !== demande.centre_id ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#8b5cf6' }}>
                            {demande.centre_delivrance_nom || 'Non spécifié'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#8b5cf6', fontWeight: 700, marginTop: '2px' }}>
                            ✈️ Retrait délocalisé
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {demande.centre_nom || 'Non spécifié'}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{demande.montant_paye?.toLocaleString()} F</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', textTransform: 'uppercase' }}>
                        {demande.mode_paiement?.replace('_', ' ')}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {new Date(demande.date_soumission).toLocaleDateString()}
                    </td>
                    <td>
                      {demande.agent_nom && (
                        <div style={{ fontSize: '0.85rem' }}>
                          Agent: <span style={{ fontWeight: 500 }}>{demande.agent_nom}</span>
                        </div>
                      )}
                      {demande.officier_nom && (
                        <div style={{ fontSize: '0.85rem' }}>
                          Off: <span style={{ fontWeight: 500 }}>{demande.officier_nom}</span>
                        </div>
                      )}
                      {!demande.agent_nom && !demande.officier_nom && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Non assigné</span>
                      )}
                    </td>
                    <td>
                      {getStatusBadge(demande.statut)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        {/* Voir détails */}
                        <button
                          onClick={() => { setSelectedDemande(demande); setIsDetailModalOpen(true); }}
                          className="btn btn-secondary btn-icon"
                          title="Consulter les détails"
                          style={{ padding: '0.35rem' }}
                        >
                          <Eye size={16} />
                        </button>

                        {/* Télécharger PDF si validé */}
                        {(demande.statut === 'valide' || demande.statut === 'disponible' || demande.statut === 'pret') && (
                          <a
                            href="#"
                            onClick={(e) => handleDownloadPdf(e, demande.id)}
                            className="btn btn-icon"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.35rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', textDecoration: 'none', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}
                            title="Télécharger l'acte (PDF)"
                          >
                            PDF
                          </a>
                        )}

                        {/* Prendre en charge (Agent uniquement, si en attente ou recours) */}
                        {isAgentOrAbove && (demande.statut === 'en_attente' || demande.statut === 'recours') && (
                          <button
                            onClick={() => handlePrendreEnCharge(demande.id)}
                            className="btn btn-primary btn-icon"
                            title="Prendre en charge"
                            style={{ padding: '0.35rem' }}
                          >
                            <Check size={16} />
                          </button>
                        )}

                        {/* Actions Agent : Envoyer pour signature (seulement si en_traitement) et Rejeter */}
                        {isAgentOrAbove && ['en_cours', 'verification_dossier', 'en_traitement', 'recours', 'hors_delais'].includes(demande.statut) && (demande.statut === 'en_attente' || demande.statut === 'hors_delais' || demande.agent_id === currentUser.id || isOfficerOrAbove) && (
                          <>
                            {demande.statut === 'en_traitement' && (
                              <button
                                onClick={() => handleUpdateStatus(demande.id, 'signature')}
                                className="btn btn-icon"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  background: 'rgba(219, 39, 119, 0.1)',
                                  color: '#db2777',
                                  border: '1px solid rgba(219, 39, 119, 0.2)',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Envoyer la signature (transmettre à l'officier)"
                              >
                                ✉️ Envoyer signature
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenRejectModal(demande.id)}
                              className="btn btn-icon"
                              style={{ padding: '0.35rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                              title="Rejeter la demande"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {/* Actions Officier : Valider & Signer / Rejeter */}
                        {isOfficerOrAbove && ['signature'].includes(demande.statut) && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(demande.id, 'valide')}
                              className="btn btn-icon"
                              style={{ padding: '0.35rem', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                              title="Valider & Signer la demande"
                            >
                              <ClipboardCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenRejectModal(demande.id)}
                              className="btn btn-icon"
                              style={{ padding: '0.35rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                              title="Refuser (Retour à l'agent)"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}

                        {/* Archiver / Désarchiver (Officier ou au-dessus) */}
                        {isOfficerOrAbove && (
                          <>
                            {/* Bouton ARCHIVER mis en évidence pour les dossiers terminés */}
                            {(demande.statut === 'pret' || demande.statut === 'valide') && !demande.archive && (
                              <button
                                onClick={() => handleToggleArchive(demande.id, false)}
                                className="btn btn-icon"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  background: 'rgba(107, 114, 128, 0.12)',
                                  color: '#374151',
                                  border: '1px solid rgba(107, 114, 128, 0.3)',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Archiver ce dossier"
                              >
                                📥 Archiver
                              </button>
                            )}
                            {/* Bouton DÉSARCHIVER si déjà archivé */}
                            {demande.archive && (
                              <button
                                onClick={() => handleToggleArchive(demande.id, true)}
                                className="btn btn-icon"
                                style={{
                                  padding: '0.3rem 0.6rem',
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  color: '#10b981',
                                  border: '1px solid rgba(16, 185, 129, 0.2)',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  whiteSpace: 'nowrap'
                                }}
                                title="Désarchiver ce dossier"
                              >
                                📤 Désarchiver
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <Pagination
              currentPage={currentPage}
              totalItems={totalElements}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>

      {/* Modal Détails Demande (Extracted to Component) */}
      <DetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        selectedDemande={selectedDemande}
        getFieldLabel={getFieldLabel}
        getFieldValueLabel={getFieldValueLabel}
        token={token}
        currentUser={currentUser}
        isOfficerOrAbove={isOfficerOrAbove}
        isAgentOrAbove={isAgentOrAbove}
        isArchiviste={isArchiviste}
        handleUpdateStatus={handleUpdateStatus}
        handleOpenAssignModal={handleOpenAssignModal}
        handleOpenGenerateModal={handleOpenGenerateModal}
        handleOpenRejectModal={handleOpenRejectModal}
        handleToggleArchive={handleToggleArchive}
        handleWorkflowProgress={handleWorkflowProgress}
        setPreviewFileUrl={setPreviewFileUrl}
        handleConfirmTransfertReceipt={handleConfirmTransfertReceipt}
        handleExpedierDocument={handleExpedierDocument}
        handleSendTransfertMessage={handleSendTransfertMessage}
      />

      {/* Modal Motif de Rejet ou Correction */}
      <RejectModal
        isOpen={!!rejectingId}
        onClose={() => setRejectingId(null)}
        motifRejet={motifRejet}
        setMotifRejet={setMotifRejet}
        rejectLoading={rejectLoading}
        isOfficerOrAbove={isOfficerOrAbove}
        onRetourAgent={handleRetourAgent}
        onWorkflowReturn={handleWorkflowReturn}
        onSubmitRejection={handleSubmitRejection}
      />

      {/* ASSIGN SIGNER MODAL */}
      <AssignModal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        assignStep={assignStep}
        setAssignStep={setAssignStep}
        assignLoading={assignLoading}
        assignUsers={assignUsers}
        selectedAssignUserId={selectedAssignUserId}
        setSelectedAssignUserId={setSelectedAssignUserId}
        onFetchAssignUsers={handleFetchAssignUsers}
        onSubmitAssign={handleSubmitAssign}
        availableProfiles={availableProfiles}
      />
      {/* Modal de Génération d'Acte */}
      <GenerateDocumentModal
        isOpen={isGenerateModalOpen}
        onClose={() => setIsGenerateModalOpen(false)}
        selectedDemande={selectedDemande}
        templatesForActivity={templatesForActivity}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
        generationLoading={generationLoading}
        generatedDocxUrl={generatedDocxUrl}
        finalUploadFile={finalUploadFile}
        setFinalUploadFile={setFinalUploadFile}
        onGenerate={handleGenerate}
        onFinalUpload={handleFinalUpload}
      />

      {/* Visionneuse Intégrée (Lightbox Light) */}
      {previewFileUrl && (() => {
        const isPdf = previewFileUrl.toLowerCase().includes('/pdf') || previewFileUrl.toLowerCase().endsWith('.pdf') || previewFileUrl.startsWith('data:application/pdf');
        return (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content" style={{ maxWidth: '950px', width: '95%', height: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 className="modal-title" style={{ margin: 0 }}>Prévisualisation du document</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Type : {isPdf ? 'Document PDF officiel' : 'Fichier Image / Photo'}
                  </span>
                </div>

                {/* PDF Top Action Bar */}
                {isPdf && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <a
                      href={previewFileUrl}
                      download="document_officiel.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Télécharger le fichier PDF"
                    >
                      <Download size={15} /> Télécharger le PDF
                    </a>
                    <a
                      href={previewFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '6px 14px', fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Ouvrir dans un nouvel onglet"
                    >
                      <ExternalLink size={15} /> Plein écran ↗
                    </a>
                  </div>
                )}

                {/* Image controls for Zoom & Rotate */}
                {!isPdf && (
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setPreviewZoom(z => Math.max(0.5, z - 0.25))}>
                      Zoom -
                    </button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, minWidth: '45px', textAlign: 'center', color: 'var(--text-primary)' }}>
                      {Math.round(previewZoom * 100)}%
                    </span>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }} onClick={() => setPreviewZoom(z => Math.min(4, z + 0.25))}>
                      Zoom +
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setPreviewRotation(r => (r + 90) % 360)}>
                      ↻ Rotation
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', cursor: 'pointer' }} onClick={() => { setPreviewZoom(1); setPreviewRotation(0); }}>
                      Réinitialiser
                    </button>
                  </div>
                )}

                <button className="modal-close" onClick={() => { setPreviewFileUrl(null); setPreviewZoom(1); setPreviewRotation(0); }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, backgroundColor: '#f1f5f9', borderRadius: '8px', overflow: 'auto', padding: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {previewFileUrl.startsWith('file://') || previewFileUrl.startsWith('content://') ? (
                  <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <span style={{ fontSize: '3rem' }}>📱</span>
                    <h4 style={{ color: '#d97706', marginTop: '1rem', fontWeight: 700 }}>Fichier Resté sur le Téléphone</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '480px', margin: '0.5rem auto 1rem' }}>
                      Ce document a été sélectionné en mode hors-ligne sur le terminal mobile du citoyen ({previewFileUrl.split('/').pop()}) et attend d'être synchronisé avec la mairie.
                    </p>
                  </div>
                ) : isPdf ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <object
                      data={previewFileUrl}
                      type="application/pdf"
                      style={{ width: '100%', height: '100%', border: 'none', borderRadius: '4px', minHeight: '60vh' }}
                    >
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        padding: '2rem',
                        textAlign: 'center',
                        backgroundColor: '#ffffff',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          width: '64px',
                          height: '64px',
                          borderRadius: '16px',
                          backgroundColor: 'rgba(239, 68, 68, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: '1rem',
                          color: '#ef4444'
                        }}>
                          <FileText size={32} />
                        </div>
                        <h4 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem', fontWeight: 700 }}>
                          Document PDF Prêt à l'Emploi
                        </h4>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', maxWidth: '460px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
                          Le fichier PDF est disponible. Vous pouvez l'afficher en plein écran dans un nouvel onglet ou le télécharger directement sur votre ordinateur.
                        </p>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <a
                            href={previewFileUrl}
                            download="document_officiel.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                          >
                            <Download size={16} /> Télécharger
                          </a>
                          <a
                            href={previewFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary"
                            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
                          >
                            <ExternalLink size={16} /> Ouvrir le document ↗
                          </a>
                        </div>
                      </div>
                    </object>
                  </div>
                ) : (
                  <div style={{
                    minWidth: '100%',
                    minHeight: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '2rem'
                  }}>
                    <img
                      src={previewFileUrl}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const errElem = e.target.nextElementSibling;
                        if (errElem) errElem.style.display = 'flex';
                      }}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '70vh',
                        objectFit: 'contain',
                        transform: `scale(${previewZoom}) rotate(${previewRotation}deg)`,
                        transition: 'transform 0.25s ease-out',
                        borderRadius: '4px',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                      }}
                      alt="Aperçu du document"
                    />
                    <div style={{ display: 'none', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                      <span style={{ fontSize: '2.5rem' }}>⚠️</span>
                      <h4 style={{ color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>Aperçu indisponible directement</h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: 0 }}>
                        Le navigateur n'a pas pu afficher directement ce fichier image.
                      </p>
                      <a href={previewFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none', marginTop: '0.5rem' }}>
                        Ouvrir le fichier dans un nouvel onglet ↗
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => { setPreviewFileUrl(null); setPreviewZoom(1); setPreviewRotation(0); }}>
                  Fermer la prévisualisation
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Bulk Sign Confirmation Modal */}
      {isBulkSignModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Signature groupée</h3>
              <button className="modal-close" onClick={() => setIsBulkSignModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem 0' }}>
              <div style={{ background: 'rgba(219, 39, 119, 0.05)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(219, 39, 119, 0.2)', marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, color: '#db2777', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <ClipboardCheck size={20} />
                  Confirmation de signature
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
                  Vous êtes sur le point de valider et de signer électroniquement <strong>{kpiCounts.signature}</strong> document(s).
                  <br /><br />
                  Cette action appliquera votre signature officielle sur tous ces documents et les fera passer à l'étape suivante du processus.
                </p>
              </div>
              <p style={{ fontWeight: 600, fontSize: '1.05rem', textAlign: 'center', marginTop: '1.5rem' }}>
                Êtes-vous sûr de vouloir signer tous ces documents ?
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsBulkSignModalOpen(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" style={{ background: '#db2777', borderColor: '#db2777' }} onClick={handleBulkSign} disabled={bulkSignLoading}>
                {bulkSignLoading ? 'Signature en cours...' : 'Oui, tout signer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
