import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, DeviceEventEmitter, Image, Modal } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { apiFetch } from '../../services/apiClient';
import { ArrowLeft, Check, Download, AlertTriangle, ShieldCheck, Star, X, FileText, Eye, WifiOff, Clock, Trash2, Edit3 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { WebView } from 'react-native-webview';
import { Platform } from 'react-native';

import { savePdfToCache, getPdfFromCache, getFromCache, updateSyncedDemandeInCache } from '../../database/localDb';
import NetInfo from '@react-native-community/netinfo';

import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';

const ALL_DAILY_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00',
  '15:00', '15:30', '16:00', '16:30', '17:00'
];

const isWeekend = (date: Date | null) => {
  if (!date) return false;
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
};

const getRdvStatusLabel = (status: string) => {
  switch (status) {
    case 'EFFECTUE': return 'Présent';
    case 'ABSENT': return 'Absent';
    case 'CONFIRME': return 'Confirmé';
    case 'REPORTE': return 'Reporté';
    case 'ANNULE': return 'Annulé';
    default: return status;
  }
};

const getRdvStatusColor = (status: string) => {
  switch (status) {
    case 'EFFECTUE': return '#2563eb'; // Green
    case 'ABSENT': return '#ef4444'; // Red
    case 'ANNULE': return '#ef4444'; // Red
    case 'CONFIRME': return '#2563eb'; // Blue
    case 'REPORTE': return '#f59e0b'; // Orange
    default: return '#cbd5e1';
  }
};

export default function RequestDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const id = params.id as string;
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark';

  const [demande, setDemande] = useState<any>(null);
  const [champs, setChamps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [rating, setRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string>('');
  const [rendezVous, setRendezVous] = useState<any>(null);

  const [rdvDate, setRdvDate] = useState<Date | null>(null);
  const [rdvHeure, setRdvHeure] = useState<string>('');
  const [showRdvDatePicker, setShowRdvDatePicker] = useState<boolean>(false);
  const [creneauxDispo, setCreneauxDispo] = useState<string[]>([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState<boolean>(false);

  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [newRdvDate, setNewRdvDate] = useState<Date | null>(null);
  const [newRdvHeure, setNewRdvHeure] = useState<string>('');
  const [showNewRdvDatePicker, setShowNewRdvDatePicker] = useState<boolean>(false);
  const [newCreneauxDispo, setNewCreneauxDispo] = useState<string[]>([]);
  const [loadingNewCreneaux, setLoadingNewCreneaux] = useState<boolean>(false);

  const [submittingRdv, setSubmittingRdv] = useState<boolean>(false);
  const isCancelledRef = React.useRef(false);
  const isFetchingRef = React.useRef(false);

  const getFullCentrePath = (centreNom: string, communeNom?: string, deptNom?: string, regionNom?: string) => {
    if (!centreNom) return 'Non spécifié';
    const parts = [communeNom, deptNom, regionNom].filter(Boolean);
    if (parts.length === 0) return centreNom;
    return `${centreNom} (${parts.join(', ')})`;
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (rdvDate && demande && (demande.centre_id || demande.centreId)) {
      setLoadingCreneaux(true);
      const centreId = demande.centre_id || demande.centreId;
      const dateStr = formatDateString(rdvDate);
      apiFetch(`/rendez-vous/disponibilites?centreId=${centreId}&date=${dateStr}`)
        .then(res => {
          if (res && res.status === 'success') {
            const rawData = Array.isArray(res.data) ? res.data : (res.data?.disponibilites || []);
            const formattedTimes = rawData.map((t: any) => {
              if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
              if (typeof t === 'string') return t.substring(0, 5);
              return String(t);
            });
            setCreneauxDispo(formattedTimes);
          } else {
            setCreneauxDispo([]);
          }
        })
        .catch(() => setCreneauxDispo([]))
        .finally(() => setLoadingCreneaux(false));
    } else {
      setCreneauxDispo([]);
    }
  }, [rdvDate, demande?.centre_id, demande?.centreId]);

  useEffect(() => {
    const targetCentre = demande?.centre_id || demande?.centreId || (rendezVous && (rendezVous.centre_id || rendezVous.centreId));
    if (newRdvDate && targetCentre) {
      setLoadingNewCreneaux(true);
      const dateStr = formatDateString(newRdvDate);
      apiFetch(`/rendez-vous/disponibilites?centreId=${targetCentre}&date=${dateStr}`)
        .then(res => {
          if (res && res.status === 'success') {
            const rawData = Array.isArray(res.data) ? res.data : (res.data?.disponibilites || []);
            const formattedTimes = rawData.map((t: any) => {
              if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
              if (typeof t === 'string') return t.substring(0, 5);
              return String(t);
            });
            setNewCreneauxDispo(formattedTimes);
          } else {
            setNewCreneauxDispo([]);
          }
        })
        .catch(() => setNewCreneauxDispo([]))
        .finally(() => setLoadingNewCreneaux(false));
    } else {
      setNewCreneauxDispo([]);
    }
  }, [newRdvDate, demande?.centre_id, demande?.centreId, rendezVous?.centre_id, rendezVous?.centreId]);

  const resolveDocUrl = (val: string) => {
    if (!val || typeof val !== 'string') return val;
    if (val.startsWith('file://') || val.startsWith('content://')) {
      return val;
    }
    if (val.startsWith('/')) {
      const { getApiUrl } = require('../../services/apiClient');
      const apiUrl = getApiUrl();
      const origin = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      return `${origin}${val}`;
    }
    return val;
  };

  const fetchDetails = async (showSpinner = false) => {
    if (isCancelledRef.current) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    
    if (showSpinner) {
      // Try to load from local cache first (instant display!)
      try {
        const cached = await getFromCache('historique_cache', '/demandes');
        if (cached && cached.status === 'success' && cached.data) {
          const list = cached.data.demandes || [];
          const found = list.find((d: any) => d.id.toString() === id);
          if (found) {
            setDemande(found);
            setLoading(false); // Stop showing loading indicator immediately!
            showSpinner = false; // Disable spinner for background API call
          }
        }
      } catch (err) {
        console.warn('Failed to read from demands cache:', err);
      }
      if (showSpinner) setLoading(true);
    }
    
    try {
      if (id && id.startsWith('offline_')) {
        const { getDb } = require('../../database/localDb');
        const database = await getDb();
        const result = (await database.getFirstAsync(
          `SELECT id, payload, created_at FROM demandes_offline WHERE id = ?`, [id]
        )) as any;
        if (result) {
          let parsed: any = {};
          try { parsed = JSON.parse(result.payload); } catch (e) {}
          const metadata = parsed._offline_metadata || {};
          const timestamp = result.created_at || Date.now();
          
          setDemande({
            id: result.id,
            reference: `HORS-LIGNE-${result.id.split('_')[2]?.toUpperCase() || 'DEM'}`,
            statut: 'pending_sync',
            activite_nom: metadata.activite_nom || 'Acte civil',
            service_nom: metadata.service_nom || 'Administration',
            date_soumission: new Date(timestamp).toISOString(),
            montant_paye: parsed.montant_paye || 0,
            mode_paiement: parsed.mode_paiement || 'offline',
            donnees: parsed.donnees || {},
            documents_url: parsed.documents_url || {},
            isOfflinePending: true
          });
        } else {
          setDemande(null);
        }
      } else {
        try {
          const res = await apiFetch(`/demandes/${id}`);
          if (isCancelledRef.current) return;
          if (res.status === 'success' && res.data?.demande) {
            const found = res.data.demande;
            setDemande((prev: any) => {
              if (!prev || JSON.stringify(prev) !== JSON.stringify(found)) {
                return found;
              }
              return prev;
            });
            // Update the item inside history cache as well
            updateSyncedDemandeInCache(found);
          } else {
            throw new Error('Single demand fetch response was not success');
          }
        } catch (fetchErr) {
          if (isCancelledRef.current) return;
          // Fallback to full demands list fetch if the backend is not yet restarted with the new endpoint
          console.log('[Details Screen] Single demand endpoint failed, falling back to full list:', fetchErr);
          try {
            const res = await apiFetch('/demandes');
            if (isCancelledRef.current) return;
            if (res.status === 'success') {
              const list = res.data.demandes || [];
              const found = list.find((d: any) => d.id.toString() === id);
              if (found) {
                setDemande((prev: any) => {
                  if (!prev || JSON.stringify(prev) !== JSON.stringify(found)) {
                    return found;
                  }
                  return prev;
                });
                updateSyncedDemandeInCache(found);
              } else {
                setDemande(null);
              }
            }
          } catch (fallbackErr) {
            if (isCancelledRef.current) return;
            console.error('[Details Screen] Fallback list fetch failed:', fallbackErr);
          }
        }
      }
      try {
        if (id && !id.startsWith('offline_')) {
          const rvRes = await apiFetch('/rendez-vous/mes-rendez-vous');
          if (rvRes.status === 'success') {
            const list = rvRes.data || [];
            const foundRv = list.find((r: any) => r.demandeId?.toString() === id);
            if (foundRv) {
              setRendezVous(foundRv);
            } else {
              setRendezVous(null);
            }
          }
        }
      } catch (err) {
        console.warn('Error loading rendez-vous:', err);
      }
    } catch (err) {
      console.warn('Error loading demand details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (demande) {
      const actId = demande.activite?.id || demande.activiteId || demande.activite_id;
      if (actId) {
        apiFetch(`/champs-dynamiques?activiteId=${actId}`)
          .then(res => {
            if (res.status === 'success') setChamps(res.data.champs || []);
          })
          .catch(err => console.warn('Erreur chargement champs:', err));
      }
    }
  }, [demande?.activite?.id, demande?.activiteId, demande?.activite_id]);

  useEffect(() => {
    fetchDetails(true);

    const subscription = DeviceEventEmitter.addListener('sync_completed', () => {
      if (isCancelledRef.current) return;
      console.log('[Details Screen] Sync completed event received.');
      if (id && id.startsWith('offline_')) {
        const { getDb } = require('../../database/localDb');
        getDb().then(async (database: any) => {
          const result = (await database.getFirstAsync(
            `SELECT id FROM demandes_offline WHERE id = ?`, [id]
          )) as any;
          if (!result) {
            router.replace('/(tabs)/history');
          }
        });
      } else {
        fetchDetails(false);
      }
    });

    const sseDemandesSub = DeviceEventEmitter.addListener('refresh_demandes', () => {
      if (isCancelledRef.current) return;
      console.log('[Details Screen] SSE event refresh_demandes received, refreshing details...');
      fetchDetails(false);
    });

    // Poll silently every 30s as a fallback (reduced frequency from 15s since SSE is now primary)
    const interval = setInterval(() => {
      if (id && !id.startsWith('offline_') && !isCancelledRef.current) {
        fetchDetails(false);
      }
    }, 30000);

    return () => {
      subscription.remove();
      sseDemandesSub.remove();
      clearInterval(interval);
      isCancelledRef.current = true;
    };
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDetails();
  };

  const handleDownloadPDF = async () => {
    try {
      setDownloading(true);
      const { getApiUrl, getAuthToken } = require('../../services/apiClient');
      
      const netState = await NetInfo.fetch();

      // Check if offline to use cache
      if (netState.isConnected === false) {
        const cachedUri = await getPdfFromCache(demande.id.toString());
        if (cachedUri) {
          try {
            const info = await FileSystem.getInfoAsync(cachedUri);
            if (info.exists) {
              const isDocx = cachedUri.toLowerCase().endsWith('.docx');
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(cachedUri, {
                  mimeType: isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
                  dialogTitle: 'Enregistrer votre acte',
                  UTI: isDocx ? 'org.openxmlformats.wordprocessingml.document' : 'com.adobe.pdf',
                });
              } else {
                Alert.alert('Succès', 'Fichier disponible : ' + cachedUri);
              }
              return;
            }
          } catch (e) { /* Cache file missing */ }
        }

        Alert.alert(
          '📡 Hors-ligne',
          'Le document n\'a pas encore été téléchargé et vous n\'avez pas de connexion internet.\n\nReconnectez-vous et téléchargez le document une fois pour pouvoir le consulter hors-ligne.'
        );
        return;
      }

      const baseUrl = getApiUrl();
      const token = getAuthToken();
      const pdfUrl = `${baseUrl}/demandes/${demande.id}/pdf?token=${encodeURIComponent(token || '')}`;
      
      // Download to a temporary file first
      const tempUri = `${FileSystem.documentDirectory}Acte_temp_${Date.now()}.tmp`;
      const result = await FileSystem.downloadAsync(pdfUrl, tempUri);

      if (result.status !== 200 && result.status !== 302 && result.status !== 304) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        Alert.alert('Modèle non disponible', "Le modèle de téléchargement n'est pas disponible pour cette activité. Veuillez vous rendre sur place.");
        return;
      }

      // Determine actual file type from headers
      const contentType = (result.headers['Content-Type'] || result.headers['content-type'] || result.mimeType || '').toLowerCase();
      const contentDisposition = (result.headers['Content-Disposition'] || result.headers['content-disposition'] || '').toLowerCase();
      const isDocx = contentType.includes('wordprocessingml') || contentDisposition.includes('.docx');
      
      const ext = isDocx ? '.docx' : '.pdf';
      const mime = isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';
      const uti = isDocx ? 'org.openxmlformats.wordprocessingml.document' : 'com.adobe.pdf';

      // Rename to correct extension
      const fileUri = `${FileSystem.documentDirectory}Acte_${demande.reference || 'Officiel'}${ext}`;
      await FileSystem.moveAsync({ from: tempUri, to: fileUri });

      // Save to local cache for offline use
      await savePdfToCache(demande.id.toString(), fileUri);

      // Open native save/view sheet
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: mime,
          dialogTitle: 'Enregistrer votre acte',
          UTI: uti,
        });
      } else {
        Alert.alert('Succès', 'Fichier téléchargé : ' + fileUri);
      }
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de télécharger le document : ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleViewPDF = async () => {
    try {
      const { getApiUrl, getAuthToken } = require('../../services/apiClient');

      const netState = await NetInfo.fetch();

      // If offline, try to use cache
      if (netState.isConnected === false) {
        const cachedUri = await getPdfFromCache(demande.id.toString());
        if (cachedUri) {
          const info = await FileSystem.getInfoAsync(cachedUri).catch(() => null);
          if (info && info.exists) {
            const isDocx = cachedUri.toLowerCase().endsWith('.docx');
            if (Platform.OS === 'android') {
              // Android WebView can't render local file:// PDFs — use native share/view
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(cachedUri, {
                  mimeType: isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
                  dialogTitle: 'Ouvrir le document',
                  UTI: isDocx ? 'org.openxmlformats.wordprocessingml.document' : 'com.adobe.pdf',
                });
              } else {
                Alert.alert('Fichier disponible', 'Document sauvegardé : ' + cachedUri);
              }
            } else {
              // iOS WebView renders PDF natively via file:// (Note: DOCX might need QuickLook)
              if (isDocx && await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(cachedUri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    dialogTitle: 'Ouvrir le document',
                    UTI: 'org.openxmlformats.wordprocessingml.document',
                  });
              } else {
                  setViewerUrl(cachedUri);
                  setViewerTitle('Document officiel');
                  setViewerVisible(true);
              }
            }
            return;
          }
        }

        Alert.alert(
          '📡 Hors-ligne',
          'Veuillez d\'abord télécharger le document quand vous êtes connecté pour pouvoir le consulter hors-ligne.'
        );
        return;
      }

      const baseUrl = getApiUrl();
      const token = getAuthToken();
      const pdfUrl = `${baseUrl}/demandes/${demande.id}/pdf?token=${encodeURIComponent(token || '')}`;

      // Android Google Docs Viewer cannot access local IP addresses, 
      // and HEAD request might fail. Let's just use download and view locally!
      const tempUri = `${FileSystem.documentDirectory}View_temp_${Date.now()}.tmp`;
      const result = await FileSystem.downloadAsync(pdfUrl, tempUri);

      if (result.status !== 200 && result.status !== 302 && result.status !== 304) {
        await FileSystem.deleteAsync(tempUri, { idempotent: true });
        Alert.alert('Modèle non disponible', "Le modèle de téléchargement n'est pas disponible pour cette activité.");
        return;
      }

      const contentType = (result.headers['Content-Type'] || result.headers['content-type'] || result.mimeType || '').toLowerCase();
      const contentDisposition = (result.headers['Content-Disposition'] || result.headers['content-disposition'] || '').toLowerCase();
      const isDocx = contentType.includes('wordprocessingml') || contentDisposition.includes('.docx');
      const ext = isDocx ? '.docx' : '.pdf';
      const fileUri = `${FileSystem.documentDirectory}View_${demande.reference || 'Officiel'}${ext}`;
      
      await FileSystem.moveAsync({ from: tempUri, to: fileUri });

      if (Platform.OS === 'android') {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: isDocx ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
            dialogTitle: 'Ouvrir le document'
          });
        }
      } else {
        if (isDocx && await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            UTI: 'org.openxmlformats.wordprocessingml.document'
          });
        } else {
          setViewerUrl(fileUri);
          setViewerTitle('Document officiel');
          setViewerVisible(true);
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir le document : ' + err.message);
    }
  };

  const handleRatingSubmit = async (score: number) => {
    const originalScore = demande.evaluation_score;
    // Optimistic UI update
    setDemande((prev: any) => prev ? { ...prev, evaluation_score: score } : prev);
    
    try {
      setSubmittingRating(true);
      const res = await apiFetch(`/demandes/${demande.id}/evaluate`, {
        method: 'PUT',
        bodyData: { score }
      });
      if (res.status === 'success') {
        Alert.alert("Succès", "Merci pour votre évaluation !");
      } else {
        // Rollback
        setDemande((prev: any) => prev ? { ...prev, evaluation_score: originalScore } : prev);
        Alert.alert("Erreur", res.message || "Impossible d'envoyer l'évaluation");
      }
    } catch (err: any) {
      // Rollback
      setDemande((prev: any) => prev ? { ...prev, evaluation_score: originalScore } : prev);
      Alert.alert("Erreur", err.message || "Impossible d'envoyer l'évaluation");
    } finally {
      setSubmittingRating(false);
    }
  };

  // ─── Suppression d'une demande en_attente ────────────────────────────────────
  const handleDeleteDemande = () => {
    Alert.alert(
      'Supprimer la demande',
      'Êtes-vous sûr de vouloir supprimer définitivement cette demande ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer', style: 'destructive',
          onPress: async () => {
            isCancelledRef.current = true;
            try {
              if (id && id.startsWith('offline_')) {
                // Suppression depuis SQLite local
                const { getDb } = require('../../database/localDb');
                const database = await getDb();
                await database.runAsync(`DELETE FROM demandes_offline WHERE id = ?`, [id]);
                router.replace('/(tabs)/history');
              } else {
                const res = await apiFetch(`/demandes/${id}`, { method: 'DELETE' });
                if (res.status === 'success') {
                  router.replace('/(tabs)/history');
                } else {
                  isCancelledRef.current = false;
                  Alert.alert('Erreur', res.message || 'Impossible de supprimer la demande.');
                }
              }
            } catch (err: any) {
              isCancelledRef.current = false;
              Alert.alert('Erreur', err.message || 'Une erreur s\'est produite.');
            }
          }
        }
      ]
    );
  };

  const handleCancelRdv = () => {
    Alert.alert(
      "Annuler le rendez-vous",
      "Êtes-vous sûr de vouloir annuler ce rendez-vous ? L'administration en sera notifiée.",
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler', style: 'destructive',
          onPress: async () => {
            const originalRdv = rendezVous;
            // Optimistic UI update
            if (rendezVous) {
              setRendezVous((prev: any) => prev ? { ...prev, statut: 'ANNULE' } : prev);
            }
            
            try {
              const res = await apiFetch(`/rendez-vous/${rendezVous.id}/statut`, {
                method: 'PATCH',
                bodyData: { statut: 'ANNULE' }
              });
              if (res.status === 'success') {
                Alert.alert("Succès", "Rendez-vous annulé.");
                fetchDetails(false); // Background refresh
              } else {
                // Rollback
                setRendezVous(originalRdv);
                Alert.alert("Erreur", res.message || "Impossible d'annuler le rendez-vous.");
              }
            } catch (err: any) {
              // Rollback
              setRendezVous(originalRdv);
              Alert.alert("Erreur", err.message || "Impossible d'annuler le rendez-vous.");
            }
          }
        }
      ]
    );
  };

  const handleBookRdv = async () => {
    if (!rdvDate || !rdvHeure) return;
    setSubmittingRdv(true);
    const centreId = demande.centre_id || demande.centreId;
    const dateStr = formatDateString(rdvDate);
    
    // Optimistic UI update
    const optimisticRdv = {
      id: 'optimistic_' + Date.now(),
      demandeId: demande.id,
      centreId: centreId,
      date: dateStr,
      heure: rdvHeure,
      statut: 'CONFIRME',
      isOptimistic: true
    };
    setRendezVous(optimisticRdv);

    try {
      const res = await apiFetch('/rendez-vous', {
        method: 'POST',
        bodyData: {
          demandeId: demande.id,
          centreId: centreId,
          date: dateStr,
          heure: rdvHeure
        }
      });
      if (res.status === 'success') {
        Alert.alert("Succès", "Votre rendez-vous a été planifié avec succès.");
        setRdvDate(null);
        setRdvHeure('');
        fetchDetails(false); // Background refresh
      } else {
        // Rollback
        setRendezVous(null);
        Alert.alert("Erreur", res.message || "Impossible de réserver ce créneau.");
      }
    } catch (err: any) {
      // Rollback
      setRendezVous(null);
      Alert.alert("Erreur", err.message || "Une erreur s'est produite.");
    } finally {
      setSubmittingRdv(false);
    }
  };

  const handleRescheduleRdv = async () => {
    if (!newRdvDate || !newRdvHeure || !rendezVous) return;
    setSubmittingRdv(true);
    const originalRdv = rendezVous;
    const dateStr = formatDateString(newRdvDate);
    
    // Optimistic UI update
    setRendezVous((prev: any) => prev ? {
      ...prev,
      date: dateStr,
      heure: newRdvHeure,
      statut: 'CONFIRME'
    } : prev);

    try {
      const res = await apiFetch(`/rendez-vous/${rendezVous.id}/reporter`, {
        method: 'PATCH',
        bodyData: {
          date: dateStr,
          heure: newRdvHeure
        }
      });
      if (res.status === 'success') {
        Alert.alert("Succès", "Votre rendez-vous a été reporté avec succès.");
        setNewRdvDate(null);
        setNewRdvHeure('');
        setIsReporting(false);
        fetchDetails(false); // Background refresh
      } else {
        // Rollback
        setRendezVous(originalRdv);
        Alert.alert("Erreur", res.message || "Impossible de reporter à ce créneau.");
      }
    } catch (err: any) {
      // Rollback
      setRendezVous(originalRdv);
      Alert.alert("Erreur", err.message || "Une erreur s'est produite.");
    } finally {
      setSubmittingRdv(false);
    }
  };


  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!demande) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Dossier introuvable.</Text>
        <TouchableOpacity style={[styles.backHomeBtn, { backgroundColor: isDark ? '#1e293b' : '#0f172a' }]} onPress={() => router.back()}>
          <Text style={styles.backHomeBtnText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'pending_sync': return 'Hors-ligne (Attente Sync)';
      case 'en_attente': return 'En attente de traitement';
      case 'en_cours': return 'Dossier en cours d\'examen';
      case 'verification_dossier': return 'Vérification des pièces';
      case 'en_traitement': return 'Dossier en cours de rédaction';
      case 'signature': return 'Acte en attente de signature';
      case 'pret': return 'Document prêt pour retrait';
      case 'valide': return demande?.presence_physique_requise ? 'Dossier validé - Présentez-vous au centre' : 'Acte validé et signé';
      case 'valide_cloture': return 'Dossier clôturé — Pièces remises en centre';
      case 'rejete': return 'Dossier rejeté';
      case 'hors_delais': return 'Délai dépassé (Expiré)';
      default: return statut;
    }
  };

  const hasTransfer = demande?.centre_delivrance_id && demande.centre_delivrance_id !== demande.centre_id;

  const stepsList = demande?.presence_physique_requise 
    ? (hasTransfer
        ? [
            { title: "Dossier soumis", desc: "Votre demande a bien été enregistrée et payée." },
            { title: "En cours", desc: "Prise en charge de votre dossier par un agent." },
            { title: "En traitement", desc: "Un agent civil vérifie vos justificatifs et saisies." },
            { title: "Rendez-vous", desc: "Choisissez une date et une heure de rendez-vous pour déposer les pièces physiques." },
            { title: "En attente de signature", desc: "L'officier du centre de dépôt valide et signe l'acte." },
            { title: "Expédié / En transit", desc: "L'acte a été signé et expédié vers votre centre de retrait." },
            { title: "Prêt", desc: "L'acte est arrivé au centre de retrait et est prêt à être récupéré." }
          ]
        : [
            { title: "Dossier soumis", desc: "Votre demande a bien été enregistrée et payée." },
            { title: "En cours", desc: "Prise en charge de votre dossier par un agent." },
            { title: "En traitement", desc: "Un agent civil vérifie vos justificatifs et saisies." },
            { title: "Rendez-vous", desc: "Choisissez une date et une heure de rendez-vous pour déposer les pièces physiques." },
            { title: "En attente de signature", desc: "L'officier valide et signe l'acte d'état civil." },
            { title: "Prêt", desc: "Votre acte est prêt. Vous pouvez le récupérer." }
          ]
      )
    : (hasTransfer
        ? [
            { title: "Dossier soumis", desc: "Votre demande a bien été enregistrée et payée." },
            { title: "En cours", desc: "Prise en charge de votre dossier par un agent." },
            { title: "En traitement", desc: "Un agent civil vérifie vos justificatifs et saisies." },
            { title: "En attente de signature", desc: "L'officier du centre de dépôt valide et signe l'acte." },
            { title: "Expédié / En transit", desc: "L'acte a été signé et expédié vers votre centre de retrait." },
            { title: "Prêt", desc: "L'acte est arrivé au centre de retrait et est prêt à être récupéré." }
          ]
        : [
            { title: "Dossier soumis", desc: "Votre demande a bien été enregistrée et payée." },
            { title: "En cours", desc: "Prise en charge de votre dossier par un agent." },
            { title: "En traitement", desc: "Un agent civil vérifie vos justificatifs et saisies." },
            { title: "En attente de signature", desc: "L'officier valide et signe l'acte d'état civil." },
            { title: "Prêt", desc: "Votre acte est prêt. Vous pouvez le télécharger ci-dessous." }
          ]
      );

  // Progress steps calculation
  const getStepStatus = (stepIndex: number) => {
    const s = demande.statut;
    if (s === 'rejete') return 'inactive';
    
    const hasRdv = rendezVous !== null && rendezVous.statut !== 'ANNULE';
    
    if (demande.presence_physique_requise) {
      const getLevel = (stat: string) => {
        if (stat === 'pending_sync' || stat === 'en_attente') return 1;
        if (stat === 'en_cours') return 2;
        if (stat === 'verification_dossier' || stat === 'en_traitement' || stat === 'hors_delais') {
          return hasRdv ? 4 : 3;
        }
        if (stat === 'signature') return 5;
        if (stat === 'pret' || stat === 'valide' || stat === 'disponible' || stat === 'valide_cloture') {
          if (hasTransfer) {
            return (demande.statut_transfert === 'recu' || demande.statutTransfert === 'recu') ? 7 : 6;
          }
          return 6;
        }
        return 0;
      };
      
      const level = getLevel(s);
      if (stepIndex < level) return 'completed';
      if (stepIndex === level) {
        const maxStep = hasTransfer ? 7 : 6;
        return stepIndex === maxStep ? 'completed' : 'active';
      }
      return 'pending';
    } else {
      const getLevel = (stat: string) => {
        if (stat === 'pending_sync' || stat === 'en_attente') return 1;
        if (stat === 'en_cours') return 2;
        if (stat === 'verification_dossier' || stat === 'en_traitement' || stat === 'hors_delais') return 3;
        if (stat === 'signature') return 4;
        if (stat === 'pret' || stat === 'valide' || stat === 'disponible' || stat === 'valide_cloture') {
          if (hasTransfer) {
            return (demande.statut_transfert === 'recu' || demande.statutTransfert === 'recu') ? 6 : 5;
          }
          return 5;
        }
        return 0;
      };
      
      const level = getLevel(s);
      if (stepIndex < level) return 'completed';
      if (stepIndex === level) {
        const maxStep = hasTransfer ? 6 : 5;
        return stepIndex === maxStep ? 'completed' : 'active';
      }
      return 'pending';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.backgroundElement, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Suivi de dossier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* Status card */}
        <View style={[
          styles.statusCard,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1'
          },
          (demande.statut === 'valide' || demande.statut === 'pret' || demande.statut === 'valide_cloture') && {
            backgroundColor: isDark ? '#064e3b33' : '#f6fdf9',
            borderColor: 'rgba(37, 99, 235, 0.4)'
          },
          (demande.statut === 'rejete' || demande.statut === 'hors_delais') && {
            backgroundColor: isDark ? '#7f1d1d33' : '#fdf2f2',
            borderColor: 'rgba(220, 38, 38, 0.4)'
          }
        ]}>
          <Text style={[styles.statusCardLbl, { color: theme.textSecondary }]}>État actuel</Text>
          <Text style={[
            styles.statusCardVal,
            { color: isDark ? '#60a5fa' : '#2563eb' },
            (demande.statut === 'valide' || demande.statut === 'pret' || demande.statut === 'valide_cloture') && { color: '#2563eb' },
            (demande.statut === 'rejete' || demande.statut === 'hors_delais') && { color: '#dc2626' }
          ]}>
            {getStatusLabel(demande.statut)}
          </Text>
          <Text style={[styles.statusCardRef, { color: theme.textSecondary }]}>Réf: {demande.reference}</Text>
        </View>

        {/* Boutons Modifier / Supprimer — visibles seulement si en_attente ou pending_sync */}
        {(demande.statut === 'en_attente' || demande.statut === 'pending_sync') && (
          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.ctaEditBtn, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#cbd5e1' }]}
              onPress={() => router.push(`/demande/new?edit_id=${id}`)}
              activeOpacity={0.8}
            >
              <Edit3 size={16} color={isDark ? '#94a3b8' : '#475569'} />
              <Text style={[styles.ctaEditText, { color: isDark ? '#94a3b8' : '#475569' }]}>Modifier la demande</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Progress Timeline */}
        {demande.statut !== 'rejete' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Étapes de traitement</Text>
            <View style={[styles.timeline, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
              {stepsList.map((stepInfo, idx) => {
                const stepNum = idx + 1;
                const status = getStepStatus(stepNum);
                const isLast = stepNum === stepsList.length;
                return (
                  <View key={stepNum} style={styles.timelineRow}>
                    <View style={styles.timelineNodeBox}>
                      <View style={[
                        styles.timelineNode,
                        styles[`node_${status}` as keyof typeof styles] as any,
                        status === 'active' && { backgroundColor: theme.backgroundElement, borderColor: isDark ? '#60a5fa' : '#2563eb' },
                        status === 'pending' && { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' },
                        status === 'inactive' && { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }
                      ]}>
                        {status === 'completed' ? (
                          <Check size={12} color="#ffffff" />
                        ) : (
                          <Text style={[styles.nodeText, { color: status === 'pending' ? theme.textSecondary : (status === 'active' ? (isDark ? '#60a5fa' : '#2563eb') : theme.text) }]}>
                            {stepNum}
                          </Text>
                        )}
                      </View>
                      {!isLast && (
                        <View style={[
                          styles.timelineLine,
                          styles[`line_${getStepStatus(stepNum + 1)}` as keyof typeof styles] as any,
                          getStepStatus(stepNum + 1) === 'pending' && { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }
                        ]} />
                      )}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={[styles.timelineTitle, { color: theme.text }]}>{stepInfo.title}</Text>
                      <Text style={[styles.timelineDesc, { color: theme.textSecondary }]}>{stepInfo.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Rejection Motif Box */}
        {demande.statut === 'rejete' && (
          <View style={{ gap: 12 }}>
            <View style={[styles.rejectCard, { backgroundColor: isDark ? '#7f1d1d33' : '#fdf2f2', borderColor: isDark ? 'rgba(220, 38, 38, 0.4)' : 'rgba(220, 38, 38, 0.2)' }]}>
              <View style={styles.rejectHeader}>
                <AlertTriangle size={20} color="#dc2626" />
                <Text style={[styles.rejectTitle, { color: isDark ? '#fca5a5' : '#dc2626' }]}>Motif du rejet</Text>
              </View>
              <Text style={[styles.rejectContent, { color: isDark ? '#fca5a5' : '#7f1d1d' }]}>
                {demande.motif_rejet || 'Aucun motif renseigné. Veuillez contacter le centre civil.'}
              </Text>
            </View>

            {/* Display submitted documents inside the rejection box for review */}
            {demande.documents_url && Object.keys(demande.documents_url).length > 0 && (
              <View style={[styles.rejectCard, { borderLeftColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1', backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1' }]}>
                <View style={[styles.rejectHeader, { marginBottom: 8 }]}>
                  <FileText size={20} color={theme.textSecondary} />
                  <Text style={[styles.rejectTitle, { color: theme.text }]}>Pièces jointes soumises</Text>
                </View>
                {Object.entries(demande.documents_url).map(([key, val]: any) => {
                  if (!val) return null;
                  const isLocal = typeof val === 'string' && (val.startsWith('file://') || val.startsWith('content://'));
                  const label = key === 'cni' ? "Pièce d'identité" : key === 'justificatif' ? "Justificatif de domicile" : key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}
                      onPress={() => {
                        const resolvedUrl = resolveDocUrl(val);
                        setViewerUrl(resolvedUrl);
                        setViewerTitle(label);
                        setViewerVisible(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={{ color: theme.textSecondary, fontSize: 14, fontWeight: '500' }}>{label}</Text>
                      <Text style={{ color: '#2563eb', fontWeight: '700', textDecorationLine: 'underline', fontSize: 14 }}>
                        {isLocal ? 'Fichier local' : 'Visualiser'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.recoursBtn}
              onPress={() => router.push(`/demande/new?recours_id=${demande.id}`)}
              activeOpacity={0.8}
            >
              <Text style={styles.recoursBtnText}>Rectifier mon dossier (Faire un recours)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Statut : Dossier Clôturé Présentiel (valide_cloture) */}
        {demande.statut === 'valide_cloture' && (
          <View style={styles.qrSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Dossier Clôturé</Text>
            <View style={[styles.qrCard, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
              <View style={[styles.qrCodeBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }]}>
                <ShieldCheck size={48} color="#2563eb" />
                <Text style={styles.qrText}>TERMINÉ</Text>
              </View>
              <Text style={[styles.qrDesc, { color: theme.textSecondary }]}>
                Les pièces physiques ont été remises à l'usager. Ce dossier est définitivement clôturé.
              </Text>
            </View>
          </View>
        )}

        {/* Validated QR & PDF Download */}
        {(demande.statut === 'valide' || demande.statut === 'pret') && (
          <View style={styles.qrSection}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Votre acte officiel signé</Text>
            <View style={[styles.qrCard, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
              {/* Simulated QR Code */}
              <View style={[styles.qrCodeBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }]}>
                <View style={[styles.qrCornerTopLeft, { borderColor: theme.text }]} />
                <View style={[styles.qrCornerTopRight, { borderColor: theme.text }]} />
                <View style={[styles.qrCornerBottomLeft, { borderColor: theme.text }]} />
                <View style={[styles.qrCornerBottomRight, { borderColor: theme.text }]} />
                <ShieldCheck size={48} color="#2563eb" />
                <Text style={styles.qrText}>ACTE SIGNÉ</Text>
                <Text style={[styles.qrMiniRef, { color: theme.textSecondary }]}>{demande.reference}</Text>
              </View>
              
              <Text style={[styles.qrDesc, { color: theme.textSecondary }]}>
                Ce document est certifié conforme. Le QR Code permet aux administrations de vérifier l'authenticité de l'acte.
              </Text>

              {/* Si présentiel requis ou pas de document final généré : pas de téléchargement, message pour se présenter */}
              {demande.presence_physique_requise || !demande.has_document_final ? (
                <View style={{ width: '100%', backgroundColor: isDark ? 'rgba(5, 150, 105, 0.12)' : '#ecfdf5', borderRadius: 10, borderWidth: 1, borderColor: '#2563eb', padding: 14, marginTop: 4 }}>
                  <Text style={{ color: '#065f46', fontWeight: '700', fontSize: 13, marginBottom: 6 }}>📍 Retrait en personne requis</Text>
                  <Text style={{ color: isDark ? '#6ee7b7' : '#047857', fontSize: 13, lineHeight: 20 }}>
                    Votre dossier a été validé. Présentez-vous au centre <Text style={{ fontWeight: '700' }}>{demande.centre_delivrance_nom || demande.centre_nom}</Text> pour récupérer votre acte.
                  </Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
                  <TouchableOpacity
                    style={[styles.downloadBtn, { flex: 1, backgroundColor: isDark ? '#2d3748' : '#f1f5f9' }]}
                    onPress={handleViewPDF}
                    activeOpacity={0.8}
                  >
                    <Eye size={18} color={theme.text} style={{ marginRight: 8 }} />
                    <Text style={[styles.downloadBtnText, { color: theme.text }]}>Voir</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.downloadBtn, downloading && { opacity: 0.7 }, { flex: 1 }]}
                    onPress={handleDownloadPDF}
                    disabled={downloading}
                    activeOpacity={0.8}
                  >
                    {downloading ? (
                      <ActivityIndicator color="#ffffff" size="small" />
                    ) : (
                      <>
                        <Download size={18} color="#ffffff" style={{ marginRight: 8 }} />
                        <Text style={styles.downloadBtnText}>Télécharger</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Rendez-Vous Section */}
        {rendezVous && rendezVous.statut !== 'ANNULE' && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Votre Rendez-vous</Text>
            <View style={[styles.detailsCard, { backgroundColor: theme.backgroundElement, borderColor: '#2563eb', borderWidth: 2 }]}>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Référence RDV :</Text>
                <Text style={[styles.detailVal, { color: theme.text, fontWeight: '700' }]}>{rendezVous.numeroRendezVous}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Date :</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>{new Date(rendezVous.date).toLocaleDateString('fr-FR')}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Heure :</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>{rendezVous.heure}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Lieu :</Text>
                <Text style={[styles.detailVal, { color: theme.text }]}>{rendezVous.centreNom}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Statut :</Text>
                <Text style={[styles.detailVal, { color: getRdvStatusColor(rendezVous.statut), fontWeight: '800' }]}>
                  {getRdvStatusLabel(rendezVous.statut)}
                </Text>
              </View>

              {(rendezVous.statut === 'CONFIRME' || rendezVous.statut === 'REPORTE') && (
                <View style={{ gap: 12, marginTop: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const rdvDateObj = new Date(rendezVous.date);
                      rdvDateObj.setHours(0, 0, 0, 0);
                      const diffTime = today.getTime() - rdvDateObj.getTime();
                      const diffDays = diffTime / (1000 * 60 * 60 * 24);
                      const canReschedule = diffDays <= 2;
                      return (
                        <TouchableOpacity
                          style={[
                            styles.recoursBtn,
                            { flex: 1, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderWidth: 1 },
                            !canReschedule && { opacity: 0.5 }
                          ]}
                          onPress={() => setIsReporting(!isReporting)}
                          disabled={!canReschedule}
                        >
                          <Text style={[styles.recoursBtnText, { color: !canReschedule ? '#8c9ba5' : theme.text }]}>Reporter le RDV</Text>
                        </TouchableOpacity>
                      );
                    })()}

                    <TouchableOpacity
                      style={[styles.recoursBtn, { flex: 1, backgroundColor: isDark ? '#450a0a' : '#fef2f2', borderColor: '#fca5a5' }]}
                      onPress={handleCancelRdv}
                    >
                      <Text style={[styles.recoursBtnText, { color: '#ef4444' }]}>Annuler le RDV</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Reschedule inline picker */}
                  {isReporting && (
                    <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', paddingTop: 16 }}>
                      <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13, marginBottom: 12 }}>Choisir une autre date disponible :</Text>
                      
                      <TouchableOpacity
                        style={[styles.selectInput, { backgroundColor: theme.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderWidth: 1, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                        onPress={() => setShowNewRdvDatePicker(true)}
                      >
                        <Text style={{ color: newRdvDate ? theme.text : '#8c9ba5' }}>
                          {newRdvDate ? newRdvDate.toLocaleDateString('fr-FR') : 'Choisir une nouvelle date...'}
                        </Text>
                        <Clock size={16} color="#8c9ba5" />
                      </TouchableOpacity>

                      {newRdvDate && (
                        <View style={{ marginTop: 12 }}>
                          <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Créneaux disponibles :</Text>
                          {loadingNewCreneaux ? (
                            <ActivityIndicator color="#2563eb" />
                          ) : isWeekend(newRdvDate) ? (
                            <Text style={{ color: '#ef4444', fontSize: 13 }}>Le centre est fermé les week-ends.</Text>
                          ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                              {ALL_DAILY_SLOTS.map(slot => {
                                const isAvailable = newCreneauxDispo.includes(slot);
                                return (
                                  <TouchableOpacity
                                    key={slot}
                                    style={[
                                      { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1', backgroundColor: theme.background },
                                      newRdvHeure === slot && { borderColor: '#2563eb', backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.05)' },
                                      !isAvailable && { borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0', backgroundColor: isDark ? '#1a202c' : '#f1f5f9', opacity: 0.4 }
                                    ]}
                                    onPress={() => isAvailable && setNewRdvHeure(slot)}
                                    disabled={!isAvailable}
                                  >
                                    <Text style={[
                                      { color: theme.text, fontSize: 12 },
                                      newRdvHeure === slot && { color: '#2563eb', fontWeight: '700' },
                                      !isAvailable && { color: '#8c9ba5', textDecorationLine: 'line-through' }
                                    ]}>
                                      {slot}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      )}

                      {newRdvDate && newRdvHeure !== '' && (
                        <TouchableOpacity
                          style={[styles.recoursBtn, { backgroundColor: '#2563eb', marginTop: 16 }, submittingRdv && { opacity: 0.7 }]}
                          onPress={handleRescheduleRdv}
                          disabled={submittingRdv}
                        >
                          {submittingRdv ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.recoursBtnText}>Valider la modification</Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Prendre Rendez-vous Section */}
        {demande.presence_physique_requise && (!rendezVous || rendezVous.statut === 'ANNULE') && (demande.statut !== 'en_attente' && demande.statut !== 'en_cours' && demande.statut !== 'rejete') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Votre Rendez-vous</Text>
            <View style={[styles.detailsCard, { backgroundColor: theme.backgroundElement, borderColor: '#2563eb', borderWidth: 2, padding: 16 }]}>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 12 }}>
                Cette démarche nécessite le dépôt physique de pièces justificatives au centre {demande.centre_nom}. Veuillez choisir une date et un créneau horaire disponible.
              </Text>
              
              <View style={{ gap: 12 }}>
                <TouchableOpacity
                  style={[styles.selectInput, { backgroundColor: theme.background, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderWidth: 1, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                  onPress={() => setShowRdvDatePicker(true)}
                >
                  <Text style={{ color: rdvDate ? theme.text : '#8c9ba5' }}>
                    {rdvDate ? rdvDate.toLocaleDateString('fr-FR') : 'Choisir une date...'}
                  </Text>
                  <Clock size={16} color="#8c9ba5" />
                </TouchableOpacity>

                {rdvDate && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>Créneaux disponibles :</Text>
                    {loadingCreneaux ? (
                      <ActivityIndicator color="#2563eb" />
                    ) : isWeekend(rdvDate) ? (
                      <Text style={{ color: '#ef4444', fontSize: 13 }}>Le centre est fermé les week-ends.</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {ALL_DAILY_SLOTS.map(slot => {
                          const isAvailable = creneauxDispo.includes(slot);
                          return (
                            <TouchableOpacity
                              key={slot}
                              style={[
                                { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1', backgroundColor: theme.background },
                                rdvHeure === slot && { borderColor: '#2563eb', backgroundColor: isDark ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.05)' },
                                !isAvailable && { borderColor: isDark ? 'rgba(255,255,255,0.04)' : '#e2e8f0', backgroundColor: isDark ? '#1a202c' : '#f1f5f9', opacity: 0.4 }
                              ]}
                              onPress={() => isAvailable && setRdvHeure(slot)}
                              disabled={!isAvailable}
                            >
                              <Text style={[
                                { color: theme.text, fontSize: 12 },
                                rdvHeure === slot && { color: '#2563eb', fontWeight: '700' },
                                !isAvailable && { color: '#8c9ba5', textDecorationLine: 'line-through' }
                              ]}>
                                {slot}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {rdvDate && rdvHeure !== '' && (
                  <TouchableOpacity
                    style={[styles.recoursBtn, { backgroundColor: '#2563eb', marginTop: 12 }, submittingRdv && { opacity: 0.7 }]}
                    onPress={handleBookRdv}
                    disabled={submittingRdv}
                  >
                    {submittingRdv ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.recoursBtnText}>Confirmer le Rendez-vous</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Dynamic data fields */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Données du dossier</Text>
          <View style={[styles.detailsCard, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Service :</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>{demande.service_nom || 'Administration'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Type d'acte :</Text>
              <Text style={[styles.detailVal, { fontWeight: '700', color: theme.text }]}>{demande.activite_nom || 'Acte civil'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Centre de dépôt :</Text>
              <Text style={[styles.detailVal, { color: theme.text }]}>
                {(() => {
                  const metadata = (demande.documents_url && typeof demande.documents_url === 'object') ? (demande.documents_url as any)._offline_metadata : null;
                  const cNom = demande.centre_nom || demande.centreNom || metadata?.centre_nom;
                  const comNom = demande.centre_commune_nom || metadata?.commune_nom;
                  const depNom = demande.centre_departement_nom || metadata?.dept_nom;
                  const regNom = demande.centre_region_nom || metadata?.region_nom;
                  return getFullCentrePath(cNom, comNom, depNom, regNom);
                })()}
              </Text>
            </View>
            {(demande.centre_delivrance_nom || demande.centreDelivranceNom || (demande.documents_url && typeof demande.documents_url === 'object' && (demande.documents_url as any)._offline_metadata?.deliv_centre_nom)) ? (
              <View style={styles.detailRow}>
                <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Centre de retrait :</Text>
                <Text style={[styles.detailVal, { color: '#7c3aed', fontWeight: '700' }]}>
                  {(() => {
                    const metadata = (demande.documents_url && typeof demande.documents_url === 'object') ? (demande.documents_url as any)._offline_metadata : null;
                    const cNom = demande.centre_delivrance_nom || demande.centreDelivranceNom || metadata?.deliv_centre_nom;
                    const comNom = demande.centre_delivrance_commune_nom || metadata?.deliv_commune_nom;
                    const depNom = demande.centre_delivrance_departement_nom || metadata?.deliv_dept_nom;
                    const regNom = demande.centre_delivrance_region_nom || metadata?.deliv_region_nom;
                    return getFullCentrePath(cNom, comNom, depNom, regNom) + ' (Délocalisé)';
                  })()}
                </Text>
              </View>
            ) : null}
            {Object.entries(demande.donnees || {}).map(([key, val]: any) => {
              const isFile = typeof val === 'string' && (
                val.startsWith('http://') || 
                val.startsWith('https://') || 
                val.includes('/upload/') ||
                val.startsWith('file://') ||
                val.startsWith('content://')
              );
              const foundChamp = champs.find(c => c.nom_champ === key);
              const labelAffiche = foundChamp ? foundChamp.label : key;
              return (
                <View key={key} style={styles.detailRow}>
                  <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>{labelAffiche} :</Text>
                  {isFile ? (
                    <Text
                      style={[styles.detailVal, { color: '#2563eb', textDecorationLine: 'underline', fontWeight: '700' }]}
                      onPress={() => {
                        const resolvedUrl = resolveDocUrl(val);
                        setViewerUrl(resolvedUrl);
                        setViewerTitle(key);
                        setViewerVisible(true);
                      }}
                    >
                      Voir le fichier
                    </Text>
                  ) : (
                    <Text style={[styles.detailVal, { color: theme.text }]}>{val.toString()}</Text>
                  )}
                </View>
              );
            })}
            <View style={[styles.detailRow, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9', paddingTop: 12, marginTop: 4 }]}>
              <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>Prix d'établissement :</Text>
              <Text style={[styles.detailVal, { color: '#2563eb', fontWeight: '700' }]}>
                {demande.montant_paye === 0 ? 'Gratuit' : `${demande.montant_paye} CFA`}
              </Text>
            </View>
          </View>
        </View>
        {/* Documents joints */}
        {demande.documents_url && Object.keys(demande.documents_url).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Documents joints</Text>
            <View style={[styles.detailsCard, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
              {Object.entries(demande.documents_url).map(([key, val]: any) => {
                if (!val) return null;
                const isLocal = typeof val === 'string' && (val.startsWith('file://') || val.startsWith('content://'));
                const label = key === 'cni' ? "Pièce d'identité" : key === 'justificatif' ? "Justificatif de domicile" : key;
                return (
                  <View key={key} style={styles.detailRow}>
                    <Text style={[styles.detailLbl, { color: theme.textSecondary }]}>{label} :</Text>
                    <Text
                      style={[styles.detailVal, { color: '#2563eb', textDecorationLine: 'underline', fontWeight: '700' }]}
                      onPress={() => {
                        const resolvedUrl = resolveDocUrl(val);
                        setViewerUrl(resolvedUrl);
                        setViewerTitle(label);
                        setViewerVisible(true);
                      }}
                    >
                      {isLocal ? 'Fichier local (En attente)' : 'Voir le document'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {/* Rating Section */}
        {(demande.statut === 'valide' || demande.statut === 'pret' || demande.statut === 'disponible') && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Évaluation du service</Text>
            <View style={[styles.ratingCard, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
              {demande.evaluation_score != null ? (
                <>
                  <Text style={[styles.ratingText, { color: theme.textSecondary }]}>Merci d'avoir évalué notre service !</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={28} color={star <= demande.evaluation_score ? "#f59e0b" : (isDark ? "#2d3748" : "#e2e8f0")} fill={star <= demande.evaluation_score ? "#f59e0b" : "none"} />
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={[styles.ratingText, { color: theme.textSecondary }]}>Comment évaluez-vous le traitement de votre dossier ?</Text>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity 
                        key={star} 
                        onPress={() => setRating(star)}
                        disabled={submittingRating}
                        activeOpacity={0.7}
                        style={styles.starBtn}
                      >
                        <Star size={32} color={star <= rating ? "#f59e0b" : (isDark ? "#2d3748" : "#cbd5e1")} fill={star <= rating ? "#f59e0b" : "none"} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  {rating > 0 && (
                    <TouchableOpacity 
                      style={[styles.submitRatingBtn, { backgroundColor: isDark ? '#1e293b' : '#0f172a' }, submittingRating && { opacity: 0.7 }]}
                      onPress={() => handleRatingSubmit(rating)}
                      disabled={submittingRating}
                    >
                      {submittingRating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.submitRatingText}>Envoyer l'évaluation</Text>}
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}


        {/* Date details */}
        <View style={styles.dateSection}>
          <Text style={[styles.dateText, { color: theme.textSecondary }]}>Soumis le : {new Date(demande.date_soumission).toLocaleString()}</Text>
          {demande.date_validation && (
            <Text style={[styles.dateText, { color: theme.textSecondary }]}>Validé le : {new Date(demande.date_validation).toLocaleString()}</Text>
          )}
        </View>

        {/* Bouton Supprimer placé en bas de page */}
        {(demande.statut === 'en_attente' || demande.statut === 'pending_sync') && (
          <TouchableOpacity
            style={[styles.ctaDeleteBtn, { marginHorizontal: 20, marginBottom: 30, marginTop: 10 }]}
            onPress={handleDeleteDemande}
            activeOpacity={0.6}
          >
            <Trash2 size={18} color="#ef4444" />
            <Text style={[styles.ctaDeleteText, { fontSize: 16 }]}>Supprimer la demande</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* DATE PICKERS POUR RENDEZ-VOUS (NOUVEAU ET MODIFICATION) */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showRdvDatePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 'auto', width: '100%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Date du rendez-vous</Text>
                <TouchableOpacity onPress={() => setShowRdvDatePicker(false)}>
                  <Text style={{ fontSize: 16, color: '#2563eb', fontWeight: '800' }}>Terminer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={rdvDate || new Date()}
                mode="date"
                display="spinner"
                textColor={isDark ? '#ffffff' : '#0f172a'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setRdvDate(selectedDate);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showRdvDatePicker && (
          <DateTimePicker
            value={rdvDate || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowRdvDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setRdvDate(selectedDate);
              }
            }}
          />
        )
      )}

      {Platform.OS === 'ios' ? (
        <Modal visible={showNewRdvDatePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 'auto', width: '100%' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Nouvelle date du rendez-vous</Text>
                <TouchableOpacity onPress={() => setShowNewRdvDatePicker(false)}>
                  <Text style={{ fontSize: 16, color: '#2563eb', fontWeight: '800' }}>Terminer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={newRdvDate || new Date()}
                mode="date"
                display="spinner"
                textColor={isDark ? '#ffffff' : '#0f172a'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setNewRdvDate(selectedDate);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showNewRdvDatePicker && (
          <DateTimePicker
            value={newRdvDate || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowNewRdvDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setNewRdvDate(selectedDate);
              }
            }}
          />
        )
      )}

      {/* Document Viewer Modal */}
      <Modal
        visible={viewerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.viewerContainer, { backgroundColor: theme.background }]}>
            <View style={[styles.viewerHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
              <Text style={[styles.viewerTitle, { color: theme.text }]}>{viewerTitle}</Text>
              <TouchableOpacity onPress={() => setViewerVisible(false)} style={styles.closeViewerBtn}>
                <X size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.viewerContent, { flex: 1, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }]}>
              {(() => {
                if (!viewerUrl) return null;
                
                // Detect if this is a PDF source:
                // - URL ends with .pdf
                // - URL contains /pdf (API endpoint)
                // - URL contains docs.google.com (Google Docs PDF viewer)
                // - URL is a local file:// and the title says "Document officiel"
                const isPdf = 
                  viewerUrl.toLowerCase().includes('.pdf') ||
                  viewerUrl.includes('/pdf') ||
                  viewerUrl.includes('docs.google.com') ||
                  (viewerUrl.startsWith('file://') && viewerTitle === 'Document officiel');
                
                // Detect image
                const isImage = !isPdf && (
                  viewerUrl.startsWith('content://') ||
                  viewerUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i) !== null ||
                  viewerUrl.includes('/upload')
                );
                
                if (isPdf) {
                  return (
                    <WebView
                      key={viewerUrl}
                      source={{ uri: viewerUrl }}
                      style={{ flex: 1, width: '100%', height: '100%', backgroundColor: 'transparent' }}
                      originWhitelist={['*', 'file://*', 'data:*']}
                      allowFileAccess={true}
                      allowUniversalAccessFromFileURLs={true}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      renderLoading={() => (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                          <ActivityIndicator size="large" color="#2563eb" />
                          <Text style={{ color: isDark ? '#94a3b8' : '#64748b', marginTop: 12, fontSize: 14 }}>Chargement du document...</Text>
                        </View>
                      )}
                    />
                  );
                }
                
                if (isImage) {
                  return (
                    <Image
                      source={{ uri: viewerUrl }}
                      style={styles.viewerImage}
                      resizeMode="contain"
                    />
                  );
                }
                
                // Fallback for unknown types
                return (
                  <View style={styles.fallbackViewer}>
                    <AlertTriangle size={48} color="#eab308" />
                    <Text style={[styles.fallbackText, { color: theme.textSecondary }]}>Aperçu non disponible pour ce type de fichier.</Text>
                    <TouchableOpacity
                      style={styles.openExternalBtn}
                      onPress={() => {
                        const { Linking } = require('react-native');
                        Linking.openURL(viewerUrl!);
                      }}
                    >
                      <Text style={styles.openExternalBtnText}>Ouvrir dans le navigateur</Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fa',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  scrollContent: {
    padding: 24,
    gap: 24,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: '#f4f6fa',
  },
  errorText: {
    color: '#475569',
    fontSize: 16,
    marginBottom: 20,
  },
  backHomeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  backHomeBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    gap: 6,
  },
  statusCardSuccess: {
    borderColor: 'rgba(37, 99, 235, 0.3)',
    backgroundColor: '#f6fdf9',
  },
  statusCardDanger: {
    borderColor: 'rgba(220, 38, 38, 0.3)',
    backgroundColor: '#fdf2f2',
  },
  statusCardLbl: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8c9ba5',
    textTransform: 'uppercase',
  },
  statusCardVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563eb',
  },
  statusCardRef: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    marginTop: 4,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  // Timeline styles
  timeline: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineRow: {
    flexDirection: 'row',
    gap: 16,
    minHeight: 64,
  },
  timelineNodeBox: {
    alignItems: 'center',
    width: 24,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  nodeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  // Node states styles
  node_completed: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  node_active: {
    backgroundColor: '#ffffff',
    borderColor: '#2563eb',
  },
  node_pending: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    color: '#8c9ba5',
  },
  node_inactive: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
  },
  // Line states styles
  line_completed: {
    backgroundColor: '#2563eb',
  },
  line_active: {
    backgroundColor: '#2563eb',
  },
  line_pending: {
    backgroundColor: '#e2e8f0',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  timelineDesc: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  // Rejection styles
  rejectCard: {
    backgroundColor: '#fdf2f2',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  rejectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rejectTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#dc2626',
  },
  rejectContent: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
    marginLeft: 30,
  },
  recoursBtn: {
    backgroundColor: '#3b82f6',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 8,
  },
  recoursBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  // Details card
  detailsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    alignItems: 'flex-start',
    gap: 16,
  },
  detailLbl: {
    fontSize: 13,
    color: '#8c9ba5',
    flexShrink: 0,
  },
  detailVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
  },
  dateSection: {
    gap: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  dateText: {
    fontSize: 11,
    color: '#8c9ba5',
  },
  // QR code section
  qrSection: {
    gap: 12,
  },
  qrCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  qrCodeBox: {
    width: 140,
    height: 140,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    position: 'relative',
    marginBottom: 16,
  },
  qrText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 8,
  },
  qrMiniRef: {
    fontSize: 8,
    color: '#8c9ba5',
    marginTop: 2,
  },
  // QR framing corners decoration
  qrCornerTopLeft: { position: 'absolute', top: 10, left: 10, width: 15, height: 15, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#0f172a' },
  qrCornerTopRight: { position: 'absolute', top: 10, right: 10, width: 15, height: 15, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#0f172a' },
  qrCornerBottomLeft: { position: 'absolute', bottom: 10, left: 10, width: 15, height: 15, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#0f172a' },
  qrCornerBottomRight: { position: 'absolute', bottom: 10, right: 10, width: 15, height: 15, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#0f172a' },
  qrDesc: {
    fontSize: 12,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    height: 48,
    borderRadius: 12,
    width: '100%',
  },
  downloadBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Rating styles
  ratingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    gap: 16,
  },
  ratingText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starBtn: {
    padding: 4,
  },
  submitRatingBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  submitRatingText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Document Viewer Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewerContainer: {
    width: '100%',
    height: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  viewerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  closeViewerBtn: {
    padding: 4,
  },
  viewerContent: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  fallbackViewer: {
    padding: 40,
    alignItems: 'center',
    gap: 16,
  },
  fallbackText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
  },
  openExternalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    marginTop: 8,
  },
  openExternalBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  selectInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // ── Boutons Modifier / Supprimer ─────────────────────────────────────────────
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  ctaEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  ctaEditText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ctaDeleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  ctaDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
