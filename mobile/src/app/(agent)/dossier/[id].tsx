import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking, Modal, DeviceEventEmitter } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertCircle, ArrowLeft, CheckCircle, Circle, MapPin, DollarSign, FileText, XCircle, ClipboardCheck, MessageCircle, Info, Camera, Image as ImageIcon, Send, X } from 'lucide-react-native';
import { apiFetch, getApiUrl, apiUpload } from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { TextInput, Image } from 'react-native';

export default function DemandeDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!user || !user.role || user.role.toLowerCase() === 'citoyen') {
        router.replace(`/demande/${id}`);
      }
    }
  }, [user, authLoading, id]);
  
  const [demande, setDemande] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Rapport intervention states
  const [photoAvant, setPhotoAvant] = useState<string | null>(null);
  const [photoApres, setPhotoApres] = useState<string | null>(null);
  const [rapport, setRapport] = useState<string>('');
  const [reportSaving, setReportSaving] = useState(false);

  // Officer assignment states
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignStep, setAssignStep] = useState(1); // 1: Choose profile, 2: Choose officer
  const [assignUsers, setAssignUsers] = useState<any[]>([]);
  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null);
  const [assignProfile, setAssignProfile] = useState<string>('');

  // Rejection states
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchDemandeDetails(true);

    const sseDemandesSub = DeviceEventEmitter.addListener('refresh_demandes', () => {
      console.log('[AgentDossierDetail] refresh_demandes received — refreshing details');
      fetchDemandeDetails(false);
    });

    return () => {
      sseDemandesSub.remove();
    };
  }, [id]);

  useEffect(() => {
    if (demande) {
      setPhotoAvant(demande.photo_avant_url || null);
      setPhotoApres(demande.photo_apres_url || null);
      setRapport(demande.motif || '');
    }
  }, [demande]);

  const fetchDemandeDetails = async (showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const res = await apiFetch('/demandes', { method: 'GET' });
      if (res && res.data && res.data.demandes) {
        const found = res.data.demandes.find((d: any) => d.id.toString() === id);
        setDemande(found || null);
      }
    } catch (err) {
      console.error('Erreur fetch demande details:', err);
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  const updateStatus = async (newStatut: string) => {
    try {
      setActionLoading(true);
      await apiFetch(`/demandes/${id}/status`, {
        method: 'PUT',
        bodyData: { statut: newStatut }
      });
      Alert.alert('Succès', `Statut mis à jour : ${newStatut}`);
      fetchDemandeDetails();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour le statut.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un motif de rejet.');
      return;
    }
    try {
      setActionLoading(true);
      await apiFetch(`/demandes/${id}/status`, {
        method: 'PUT',
        bodyData: { statut: 'rejete', motif_rejet: rejectionReason.trim() }
      });
      Alert.alert('Succès', 'Demande rejetée.');
      setIsRejectModalOpen(false);
      setRejectionReason('');
      fetchDemandeDetails();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de rejeter.');
    } finally {
      setActionLoading(false);
    }
  };

  const pickImage = async (type: 'avant' | 'apres') => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert('Erreur', 'Permission de la caméra refusée.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      if (type === 'avant') {
        setPhotoAvant(result.assets[0].uri);
      } else {
        setPhotoApres(result.assets[0].uri);
      }
    }
  };

  const submitReport = async () => {
    if (!photoAvant || !photoApres || !rapport.trim()) {
      Alert.alert('Erreur', 'Veuillez prendre les deux photos et remplir le rapport.');
      return;
    }

    try {
      setReportSaving(true);
      let finalPhotoAvant = photoAvant;
      let finalPhotoApres = photoApres;

      // Upload Photo Avant if local
      if (photoAvant.startsWith('file://') || photoAvant.startsWith('content://')) {
        const filename = `photo_avant_${id}_${Date.now()}.jpg`;
        const res = await apiUpload('/upload', {
          uri: photoAvant,
          type: 'image/jpeg',
          name: filename
        });
        if (res.status === 'success' && res.data?.url) {
          finalPhotoAvant = res.data.url;
        } else {
          throw new Error('Échec du téléversement de la photo avant.');
        }
      }

      // Upload Photo Apres if local
      if (photoApres.startsWith('file://') || photoApres.startsWith('content://')) {
        const filename = `photo_apres_${id}_${Date.now()}.jpg`;
        const res = await apiUpload('/upload', {
          uri: photoApres,
          type: 'image/jpeg',
          name: filename
        });
        if (res.status === 'success' && res.data?.url) {
          finalPhotoApres = res.data.url;
        } else {
          throw new Error('Échec du téléversement de la photo après.');
        }
      }

      // Save using status endpoint keeping the same status
      await apiFetch(`/demandes/${id}/status`, {
        method: 'PUT',
        bodyData: {
          statut: demande.statut,
          photo_avant_url: finalPhotoAvant,
          photo_apres_url: finalPhotoApres,
          motif: rapport
        }
      });

      Alert.alert('Succès', 'Le rapport d\'intervention a été sauvegardé avec succès.');
      fetchDemandeDetails();
    } catch (err: any) {
      console.error('Erreur sauvegarde rapport:', err);
      Alert.alert('Erreur', err.message || 'Impossible de sauvegarder le rapport.');
    } finally {
      setReportSaving(false);
    }
  };

  const handleOpenAssignModal = () => {
    setAssignStep(1);
    setAssignProfile('');
    setAssignUsers([]);
    setSelectedOfficerId(null);
    setIsAssignModalOpen(true);
  };

  const handleFetchAssignUsers = async (profilePermission: string) => {
    setAssignProfile(profilePermission);
    setAssignStep(2);
    setAssignLoading(true);
    try {
      const response = await apiFetch(`/users?permission=${profilePermission}`);
      if (response && response.status === 'success' && response.data) {
        setAssignUsers(response.data.users?.content || response.data.users || []);
      } else if (response && response.data) {
        setAssignUsers(response.data.users?.content || response.data.users || []);
      } else {
        setAssignUsers([]);
      }
    } catch (err) {
      console.error('Erreur chargement officiers:', err);
      Alert.alert('Erreur', 'Impossible de charger la liste des officiers.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleSendToSignature = async () => {
    if (!selectedOfficerId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un officier.');
      return;
    }
    try {
      setActionLoading(true);
      await apiFetch(`/demandes/${id}/status`, {
        method: 'PUT',
        bodyData: {
          statut: 'signature',
          officier_id: selectedOfficerId
        }
      });
      Alert.alert('Succès', 'Le dossier a été envoyé à l\'officier pour signature.');
      setIsAssignModalOpen(false);
      fetchDemandeDetails();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d\'envoyer le dossier.');
    } finally {
      setActionLoading(false);
    }
  };

  const resolveImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      const apiUrl = getApiUrl();
      const origin = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      return `${origin}${url}`;
    }
    return url;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Chargement de la demande...</Text>
      </View>
    );
  }

  if (!demande) {
    return (
      <View style={styles.center}>
        <AlertCircle size={48} color="#ef4444" />
        <Text style={{ marginTop: 10, fontSize: 16 }}>Demande introuvable.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'en_attente': return { label: 'En attente', color: '#f59e0b', bg: '#fef3c7' };
      case 'recours': return { label: 'Recours', color: '#8b5cf6', bg: '#f5f3ff' };
      case 'hors_delais': return { label: 'Expiré', color: '#b45309', bg: '#fef3c7' };
      case 'en_cours': return { label: 'Examen', color: '#3b82f6', bg: '#dbeafe' };
      case 'verification_dossier': return { label: 'Vérification', color: '#4f46e5', bg: '#e0e7ff' };
      case 'en_traitement': return { label: 'Traitement', color: '#0d9488', bg: '#ccfbf1' };
      case 'signature': return { label: 'À signer', color: '#db2777', bg: '#fce7f3' };
      case 'pret': return { label: 'Prêt', color: '#059669', bg: '#d1fae5' };
      case 'valide': return { label: 'Validé & Clôturé', color: '#2563eb', bg: '#d1fae5' };
      case 'rejete': return { label: 'Rejeté', color: '#ef4444', bg: '#fee2e2' };
      default: return { label: statut, color: '#6b7280', bg: '#f3f4f6' };
    }
  };

  const badge = getStatusBadge(demande.statut);
  
  const getFullCentrePath = (nom: string, commune: string, dept: string, region: string) => {
    return `${nom || ''} ${commune ? `(${commune})` : ''}`.trim();
  };

  const formatLabel = (key: string) => {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Determine if this is a civil status document (Naissance, Mariage, Décès)
  const isEtatCivil = 
    ['naissance', 'mariage', 'décès', 'deces'].includes(demande.service_nom?.toLowerCase() || '') ||
    ['naissance', 'mariage', 'décès', 'deces'].some(s => demande.activite_nom?.toLowerCase().includes(s));

  const showReportSection = !isEtatCivil && (
    ['en_cours', 'verification_dossier', 'en_traitement'].includes(demande.statut) ||
    !!(demande.photo_avant_url || demande.photo_apres_url || demande.motif)
  );

  const canEditReport = ['en_cours', 'verification_dossier', 'en_traitement'].includes(demande.statut);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <ArrowLeft size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails du Dossier</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Info Card (Reference and Basic) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.reference}>{demande.reference}</Text>
          <View style={[styles.badgeContainer, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.documentType}>{demande.activite_nom || demande.type_document}</Text>
        <Text style={styles.serviceName}>{demande.service_nom}</Text>
        {demande.motif && !isEtatCivil && <Text style={styles.motif}>Rapport: {demande.motif}</Text>}
        {demande.motif && isEtatCivil && <Text style={styles.motif}>Motif: {demande.motif}</Text>}
      </View>

      {/* Grid Info (Citoyen, Depot, Retrait) */}
      <View style={styles.gridContainer}>
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Citoyen</Text>
          <Text style={styles.gridValue}>{demande.citoyen_prenom || ''} {demande.citoyen_nom}</Text>
          <Text style={styles.gridSubValue}>{demande.citoyen_telephone}</Text>
        </View>
        
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Lieu de Dépôt</Text>
          <Text style={styles.gridValue}>{getFullCentrePath(demande.centre_nom, demande.centre_commune_nom, demande.centre_departement_nom, demande.centre_region_nom)}</Text>
        </View>
        
        <View style={styles.gridItem}>
          <Text style={styles.gridLabel}>Centre de Retrait</Text>
          {demande.centre_delivrance_id && demande.centre_delivrance_id !== demande.centre_id ? (
            <Text style={[styles.gridValue, { color: '#7c3aed' }]}>
              {getFullCentrePath(demande.centre_delivrance_nom, demande.centre_delivrance_commune_nom, demande.centre_delivrance_departement_nom, demande.centre_delivrance_region_nom)}
            </Text>
          ) : (
            <Text style={[styles.gridValue, { color: '#6b7280' }]}>Même centre</Text>
          )}
        </View>
      </View>

      {/* Données Saisies */}
      {demande.donnees && Object.keys(demande.donnees).length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Données Saisies</Text>
          <View style={styles.dataContainer}>
            {Object.entries(demande.donnees).map(([key, val]) => (
              <View key={key} style={styles.dataRow}>
                <Text style={styles.dataLabel}>{formatLabel(key)}</Text>
                <Text style={styles.dataValue}>{String(val)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Paiement */}
      <View style={styles.section}>
        <View style={styles.paymentContainer}>
          <DollarSign size={24} color="#2563eb" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.paymentText}>Paiement Reçu : {demande.montant_paye?.toLocaleString()} CFA</Text>
            <Text style={styles.paymentMode}>Mode : {demande.mode_paiement?.replace('_', ' ')}</Text>
          </View>
        </View>
      </View>

      {/* Acheminement Inter-Centres */}
      {demande.centre_delivrance_id && demande.centre_delivrance_id !== demande.centre_id && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: '#4f46e5' }]}>Acheminement Inter-Centres</Text>
          <View style={styles.transferContainer}>
            <Text style={styles.transferStatus}>Statut: {demande.statut_transfert === 'recu' ? 'Reçu au centre' : demande.statut_transfert === 'en_transit' ? 'En transit' : 'Préparation'}</Text>
          </View>
        </View>
      )}

      {/* Pièces Justificatives */}
      {demande.documents_url && Object.keys(demande.documents_url).some(k => demande.documents_url[k]) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pièces Justificatives</Text>
          {Object.entries(demande.documents_url).map(([key, url]) => {
            if (!url) return null;
            return (
              <View key={key} style={styles.documentRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FileText size={20} color="#6b7280" />
                  <Text style={styles.documentName}>{key.toUpperCase()}</Text>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(`${getApiUrl().replace('/api', '')}${url}`)}>
                  <Text style={styles.documentLink}>Voir</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      {/* Rapports & Photos (Si pas de l'Etat Civil) */}
      {showReportSection && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rapport d'Intervention</Text>
          <View style={styles.reportContainer}>
            {canEditReport ? (
              <>
                <View style={styles.photoRow}>
                  <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('avant')}>
                    {photoAvant ? (
                      <Image source={{ uri: resolveImageUrl(photoAvant) || undefined }} style={styles.photoPreview} />
                    ) : (
                      <>
                        <Camera size={24} color="#6b7280" />
                        <Text style={styles.photoBtnText}>Photo Avant</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.photoBtn} onPress={() => pickImage('apres')}>
                    {photoApres ? (
                      <Image source={{ uri: resolveImageUrl(photoApres) || undefined }} style={styles.photoPreview} />
                    ) : (
                      <>
                        <Camera size={24} color="#6b7280" />
                        <Text style={styles.photoBtnText}>Photo Après</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
                
                <TextInput
                  style={styles.textInput}
                  placeholder="Saisissez le rapport d'intervention..."
                  multiline
                  numberOfLines={4}
                  value={rapport}
                  onChangeText={setRapport}
                />
                
                <TouchableOpacity style={styles.btnSecondary} onPress={submitReport} disabled={reportSaving}>
                  {reportSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.btnSecondaryText}>Sauvegarder le Rapport</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.photoRow}>
                  {demande.photo_avant_url ? (
                    <TouchableOpacity 
                      style={styles.photoBtnReadOnly} 
                      onPress={() => Linking.openURL(resolveImageUrl(demande.photo_avant_url) || '')}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: resolveImageUrl(demande.photo_avant_url) || undefined }} style={styles.photoPreview} />
                      <View style={styles.photoLabelOverlay}>
                        <Text style={styles.photoLabelText}>Photo Avant</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                  
                  {demande.photo_apres_url ? (
                    <TouchableOpacity 
                      style={styles.photoBtnReadOnly} 
                      onPress={() => Linking.openURL(resolveImageUrl(demande.photo_apres_url) || '')}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: resolveImageUrl(demande.photo_apres_url) || undefined }} style={styles.photoPreview} />
                      <View style={styles.photoLabelOverlay}>
                        <Text style={styles.photoLabelText}>Photo Après</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}
                </View>
                
                {demande.motif ? (
                  <View style={styles.readOnlyRapportBox}>
                    <Text style={styles.readOnlyRapportTitle}>Description de l'intervention :</Text>
                    <Text style={styles.readOnlyRapportText}>{demande.motif}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {/* Actions */}
      <Text style={styles.sectionTitle}>Actions Disponibles</Text>
      <View style={styles.actionsContainer}>
        {['en_attente', 'recours', 'hors_delais'].includes(demande.statut) && (
          <TouchableOpacity 
            style={[styles.btnPrimary, actionLoading && styles.btnDisabled]} 
            onPress={() => updateStatus('en_cours')}
            disabled={actionLoading}
          >
            {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Prendre en charge</Text>}
          </TouchableOpacity>
        )}

        {['en_cours', 'verification_dossier', 'en_traitement'].includes(demande.statut) && (
          <>
            <TouchableOpacity 
              style={[
                styles.btnPrimary, 
                { backgroundColor: '#4f46e5' },
                demande.statut === 'verification_dossier' && { opacity: 0.8 },
                actionLoading && styles.btnDisabled
              ]} 
              onPress={() => updateStatus('verification_dossier')}
              disabled={actionLoading}
            >
              <Text style={styles.btnPrimaryText}>Vérification du dossier</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.btnPrimary, 
                { backgroundColor: '#0d9488' },
                demande.statut === 'en_traitement' && { opacity: 0.8 },
                actionLoading && styles.btnDisabled
              ]} 
              onPress={() => updateStatus('en_traitement')}
              disabled={actionLoading}
            >
              <Text style={styles.btnPrimaryText}>En traitement</Text>
            </TouchableOpacity>

            {demande.statut === 'en_traitement' && (
              <TouchableOpacity 
                style={[styles.btnPrimary, { backgroundColor: '#db2777' }, actionLoading && styles.btnDisabled]} 
                onPress={handleOpenAssignModal}
                disabled={actionLoading}
              >
                <Text style={styles.btnPrimaryText}>✉️ Envoyer pour signature</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {!['valide', 'pret', 'rejete'].includes(demande.statut) && (
          <TouchableOpacity 
            style={[styles.btnDanger, actionLoading && styles.btnDisabled]} 
            onPress={() => setIsRejectModalOpen(true)}
            disabled={actionLoading}
          >
            <Text style={styles.btnDangerText}>Rejeter la demande</Text>
          </TouchableOpacity>
        )}
        
        {['valide', 'pret', 'rejete'].includes(demande.statut) && (
          <Text style={{ color: '#6b7280', fontStyle: 'italic', textAlign: 'center' }}>Aucune action disponible à ce stade.</Text>
        )}
      </View>

      {/* Modal de sélection d'officier */}
      <Modal visible={isAssignModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transmettre pour Signature</Text>
              <TouchableOpacity onPress={() => setIsAssignModalOpen(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {assignStep === 1 ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalSubtitle}>Sélectionnez le profil de l'officier destinataire :</Text>
                
                <TouchableOpacity style={styles.profileBtn} onPress={() => handleFetchAssignUsers('GERER_CENTRE')}>
                  <Text style={styles.profileBtnText}>Officier de Centre</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileBtn} onPress={() => handleFetchAssignUsers('GERER_COMMUNE')}>
                  <Text style={styles.profileBtnText}>Officier de Commune</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.profileBtn} onPress={() => handleFetchAssignUsers('GERER_SERVICES')}>
                  <Text style={styles.profileBtnText}>Chef de Service / Directeur</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <TouchableOpacity style={styles.backLink} onPress={() => setAssignStep(1)}>
                  <ArrowLeft size={16} color="#3b82f6" />
                  <Text style={styles.backLinkText}>Retour aux profils</Text>
                </TouchableOpacity>

                <Text style={styles.modalSubtitle}>Choisissez l'officier de destination :</Text>

                {assignLoading ? (
                  <ActivityIndicator size="small" color="#4f46e5" style={{ marginVertical: 20 }} />
                ) : (!Array.isArray(assignUsers) || assignUsers.length === 0) ? (
                  <Text style={styles.emptyText}>Aucun officier trouvé pour cette catégorie.</Text>
                ) : (
                  <ScrollView style={styles.officerList} contentContainerStyle={{ gap: 8 }}>
                    {(Array.isArray(assignUsers) ? assignUsers : []).map((officer) => (
                      <TouchableOpacity
                        key={officer.id}
                        style={[
                          styles.officerRow,
                          selectedOfficerId === officer.id && styles.officerRowSelected
                        ]}
                        onPress={() => setSelectedOfficerId(officer.id)}
                      >
                        <Text style={[
                          styles.officerName,
                          selectedOfficerId === officer.id && styles.officerNameSelected
                        ]}>
                          {officer.nom_complet || officer.nomComplet}
                        </Text>
                        <Text style={styles.officerDetails}>
                          {officer.telephone || officer.email || 'Pas de contact'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {selectedOfficerId && (
                  <TouchableOpacity style={styles.btnModalPrimary} onPress={handleSendToSignature} disabled={actionLoading}>
                    {actionLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.btnModalPrimaryText}>Transmettre le dossier</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de Rejet */}
      <Modal visible={isRejectModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rejeter la Demande</Text>
              <TouchableOpacity onPress={() => setIsRejectModalOpen(false)}>
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>Veuillez indiquer le motif du rejet :</Text>
              
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Documents illisibles, signature manquante, etc..."
                multiline
                numberOfLines={3}
                value={rejectionReason}
                onChangeText={setRejectionReason}
              />

              <TouchableOpacity 
                style={[styles.btnModalPrimary, { backgroundColor: '#dc2626', marginTop: 10 }]} 
                onPress={handleReject} 
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnModalPrimaryText}>Confirmer le rejet</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backArrow: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  backBtn: { marginTop: 20, padding: 10, backgroundColor: '#e5e7eb', borderRadius: 8 },
  backBtnText: { color: '#374151', fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 15, padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  reference: { fontSize: 16, fontWeight: '800', color: '#111827' },
  badgeContainer: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  documentType: { fontSize: 18, fontWeight: '800', color: '#2563eb', marginBottom: 5 },
  serviceName: { fontSize: 14, color: '#6b7280', marginBottom: 5 },
  motif: { fontSize: 14, color: '#3b82f6', fontWeight: '600', marginTop: 5 },
  
  gridContainer: { flexDirection: 'column', marginHorizontal: 15, gap: 10 },
  gridItem: { backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  gridLabel: { fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', marginBottom: 4 },
  gridValue: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  gridSubValue: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  
  section: { marginHorizontal: 15, marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 10 },
  
  dataContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  dataRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  dataLabel: { fontSize: 14, color: '#6b7280', flex: 1 },
  dataValue: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1, textAlign: 'right' },
  
  paymentContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#a7f3d0' },
  paymentText: { fontSize: 15, fontWeight: '700', color: '#065f46' },
  paymentMode: { fontSize: 13, color: '#047857', textTransform: 'uppercase', marginTop: 2 },
  
  transferContainer: { backgroundColor: '#eef2ff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#c7d2fe' },
  transferStatus: { fontSize: 14, fontWeight: '600', color: '#4338ca' },
  
  documentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#f3f4f6' },
  documentName: { marginLeft: 10, fontSize: 14, fontWeight: '600', color: '#374151' },
  documentLink: { color: '#3b82f6', fontWeight: '600' },
  
  actionsContainer: { marginHorizontal: 15, gap: 15 },
  btnPrimary: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnSuccess: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnDanger: { backgroundColor: '#fee2e2', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5' },
  btnDangerText: { color: '#ef4444', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
  
  reportContainer: { backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  photoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 15 },
  photoBtn: { flex: 1, height: 100, backgroundColor: '#f3f4f6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  photoBtnText: { fontSize: 12, color: '#6b7280', marginTop: 5, fontWeight: '500' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 12, resizeMode: 'cover' },
  textInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, minHeight: 100, textAlignVertical: 'top', color: '#111827', marginBottom: 15 },
  btnSecondary: { backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  photoBtnReadOnly: { flex: 1, height: 120, backgroundColor: '#f3f4f6', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  photoLabelOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, alignItems: 'center' },
  photoLabelText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  readOnlyRapportBox: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 5 },
  readOnlyRapportTitle: { fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 4 },
  readOnlyRapportText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 14, color: '#4b5563', marginBottom: 15 },
  modalBody: { gap: 10 },
  profileBtn: { backgroundColor: '#f3f4f6', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center', marginBottom: 8 },
  profileBtnText: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
  backLinkText: { color: '#3b82f6', fontWeight: '600', fontSize: 14 },
  officerList: { maxHeight: 300, marginBottom: 15 },
  officerRow: { padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#f3f4f6', backgroundColor: '#f9fafb', marginBottom: 8 },
  officerRowSelected: { borderColor: '#4f46e5', backgroundColor: '#e0e7ff' },
  officerName: { fontSize: 14, fontWeight: '600', color: '#1f2937' },
  officerNameSelected: { color: '#4338ca' },
  officerDetails: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  btnModalPrimary: { backgroundColor: '#4f46e5', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnModalPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  emptyText: { color: '#6b7280', textAlign: 'center', marginVertical: 20, fontSize: 14 }
});
