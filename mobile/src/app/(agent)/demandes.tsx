import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, DeviceEventEmitter, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/apiClient';
import { Search, ChevronRight, ClipboardList, Calendar, X, Eye, FileText, CheckCircle2, User } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Modal } from 'react-native';
import { getPendingSyncDemandes, getFromCache } from '../../database/localDb';

export default function AgentDemandesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  
  const [demandes, setDemandes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDateObj, setSelectedDateObj] = useState<Date | null>(null);
  const [tempDateObj, setTempDateObj] = useState<Date | null>(null);
  
  const params = useLocalSearchParams<{ filter?: string }>();
  const [activeFilter, setActiveFilter] = useState(params.filter || 'tous'); // tous, en_attente, en_cours, valide, rejete
  const [selectedActType, setSelectedActType] = useState('Tous');

  const uniqueActTypes = React.useMemo(() => {
    const types = demandes.map(d => d.activite_nom).filter(Boolean);
    return ['Tous', ...Array.from(new Set(types))];
  }, [demandes]);

  useEffect(() => {
    if (params.filter) {
      setActiveFilter(params.filter);
    }
  }, [params.filter]);

  // Ref to track last fetched data (avoid unnecessary re-renders)
  const lastDataRef = React.useRef<string>('');
  const isMountedRef = React.useRef(true);

  React.useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ── Concurrency guard: prevents parallel fetchData executions ─────────────
  const isFetchingRef = React.useRef(false);
  // ── Debounce timers for event-driven refreshes ────────────────────────────
  const networkRestoredTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCompletedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fetch demands — isInitial=true shows loading spinner, false is silent */
  const fetchDemandes = async (isInitial = false) => {
    if (isFetchingRef.current) {
      console.log('[History] fetchDemandes skipped — already in progress');
      return;
    }
    isFetchingRef.current = true;
    try {
      // ── Step 1: Load from cache immediately (no wait) ───────────────────
      try {
        const cachedDemandes = await getFromCache('historique_cache', '/demandes');
        const cachedList: any[] = cachedDemandes?.data?.demandes || [];
        const pendingRaw = await getPendingSyncDemandes().catch(() => []);
        const cachedPending = pendingRaw.map((p: any) => {
          let parsed: any = {};
          try { parsed = JSON.parse(p.payload); } catch (e) {}
          const metadata = parsed._offline_metadata || {};
          const timestamp = parseInt(p.id.split('_')[1]) || Date.now();
          return {
            id: p.id,
            reference: `HORS-LIGNE-${p.id.split('_')[2]?.toUpperCase() || 'DEM'}`,
            statut: p.status === 'error' ? 'sync_error' : 'pending_sync',
            errorMessage: p.error_message || '',
            activite_nom: metadata.activite_nom || 'Acte civil',
            service_nom: metadata.service_nom || 'Administration',
            date_soumission: new Date(timestamp).toISOString(),
            montant_paye: parsed.montant_paye || 0,
            mode_paiement: parsed.mode_paiement || 'offline',
            isOfflinePending: true
          };
        });
        const cachedMerged = [...cachedPending, ...cachedList];
        
        // Update state with cached data instantly
        const cachedDataStr = JSON.stringify(cachedMerged.map((d: any) => `${d.id}|${d.statut}`));
        if (isMountedRef.current && (isInitial || cachedDataStr !== lastDataRef.current)) {
          lastDataRef.current = cachedDataStr;
          setDemandes(cachedMerged);
        }
        
        if (isInitial) {
          if (cachedMerged.length > 0) {
            setLoading(false); // Show immediately — network refresh below
          } else {
            setLoading(true); // No cache yet — show spinner while waiting for network
          }
        }
      } catch (cacheErr) {
        if (isInitial) {
          setLoading(true);
        }
      }

      // ── Step 2: Fetch fresh data from network ───────────────────────────
      let list: any[] = [];
      try {
        const res = await apiFetch('/demandes');
        if (res.status === 'success') {
          list = res.data.demandes || [];
        }
      } catch (err) {
        // Use whatever we got from cache
        console.warn('Error fetching demands from API/Cache:', err);
      }

      // 2. Get pending demands from local queue
      let pendingList: any[] = [];
      try {
        const pending = await getPendingSyncDemandes();
        pendingList = pending.map(p => {
          let parsed = {};
          try { parsed = JSON.parse(p.payload); } catch (e) {}
          const metadata = (parsed as any)._offline_metadata || {};
          const timestamp = parseInt(p.id.split('_')[1]) || Date.now();
          return {
            id: p.id,
            reference: `HORS-LIGNE-${p.id.split('_')[2]?.toUpperCase() || 'DEM'}`,
            statut: p.status === 'error' ? 'sync_error' : 'pending_sync',
            errorMessage: p.error_message || '',
            activite_nom: metadata.activite_nom || 'Acte civil',
            service_nom: metadata.service_nom || 'Administration',
            date_soumission: new Date(timestamp).toISOString(),
            montant_paye: (parsed as any).montant_paye || 0,
            mode_paiement: (parsed as any).mode_paiement || 'offline',
            isOfflinePending: true
          };
        });
      } catch (err) {
        console.warn('Error fetching pending offline demands:', err);
      }

      const merged = [...pendingList, ...list];

      // Only update state if data actually changed — prevents needless re-renders
      const newDataStr = JSON.stringify(merged.map(d => `${d.id}|${d.statut}`));
      if (isMountedRef.current && (isInitial || newDataStr !== lastDataRef.current)) {
        lastDataRef.current = newDataStr;
        setDemandes(merged);
      }
    } catch (err) {
      console.warn('Error loading demands history:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
      isFetchingRef.current = false;
    }
  };

  const filteredDemandes = React.useMemo(() => {
    let result = [...demandes];

    // Status Filter
    if (activeFilter === 'en_attente') {
      result = result.filter(d => ['en_attente', 'pending_sync', 'sync_error'].includes(d.statut));
    } else if (activeFilter === 'en_cours') {
      result = result.filter(d => ['en_cours', 'verification_dossier', 'en_traitement', 'signature'].includes(d.statut));
    } else if (activeFilter === 'valide') {
      result = result.filter(d => ['valide', 'pret'].includes(d.statut));
    } else if (activeFilter === 'hors_delais') {
      result = result.filter(d => d.statut === 'hors_delais');
    } else if (activeFilter !== 'tous') {
      result = result.filter(d => d.statut === activeFilter);
    }

    // Act Type Filter
    if (selectedActType !== 'Tous') {
      result = result.filter(d => d.activite_nom === selectedActType);
    }

    // Search Filter
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        d => d.reference.toLowerCase().includes(query) || 
             (d.activite_nom && d.activite_nom.toLowerCase().includes(query)) ||
             (d.citoyen_nom && d.citoyen_nom.toLowerCase().includes(query)) ||
             (d.citoyen_telephone && d.citoyen_telephone.toLowerCase().includes(query))
      );
    }

    // Date Filter
    if (selectedDateObj) {
      const targetYear = selectedDateObj.getFullYear();
      const targetMonth = selectedDateObj.getMonth();
      const targetDate = selectedDateObj.getDate();
      
      result = result.filter(d => {
        if (!d.date_soumission) return false;
        try {
          const parts = d.date_soumission.split('T')[0].split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return y === targetYear && m === targetMonth && day === targetDate;
          }
        } catch (e) {}
        
        const dDate = new Date(d.date_soumission);
        return dDate.getFullYear() === targetYear &&
               dDate.getMonth() === targetMonth &&
               dDate.getDate() === targetDate;
      });
    }

    return result;
  }, [demandes, searchText, activeFilter, selectedDateObj, selectedActType]);

  useEffect(() => {
    fetchDemandes(true); // Initial load with spinner

    // When sync finishes → debounced refresh (2s) to coalesce multiple sync_completed events
    const syncSub = DeviceEventEmitter.addListener('sync_completed', () => {
      console.log('[History] sync_completed received — refreshing list');
      if (syncCompletedTimerRef.current) clearTimeout(syncCompletedTimerRef.current);
      syncCompletedTimerRef.current = setTimeout(() => fetchDemandes(false), 2000);
    });

    // When network is restored → debounced refresh (3s) — gives SyncEngine time to sync first
    const networkSub = DeviceEventEmitter.addListener('network_restored', () => {
      console.log('[History] network_restored received — triggering instant refresh');
      if (networkRestoredTimerRef.current) clearTimeout(networkRestoredTimerRef.current);
      networkRestoredTimerRef.current = setTimeout(() => fetchDemandes(false), 3000);
    });

    // When server sends a realtime refresh event (SSE)
    const sseDemandesSub = DeviceEventEmitter.addListener('refresh_demandes', () => {
      console.log('[AgentDemandes] refresh_demandes received — refreshing list');
      fetchDemandes(false);
    });

    return () => {
      if (syncCompletedTimerRef.current) clearTimeout(syncCompletedTimerRef.current);
      if (networkRestoredTimerRef.current) clearTimeout(networkRestoredTimerRef.current);
      syncSub.remove();
      networkSub.remove();
      sseDemandesSub.remove();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    const { syncOfflineDemandes } = require('../../services/SyncEngine');
    syncOfflineDemandes().then(() => {
      fetchDemandes(false);
    }).catch((err: any) => {
      console.warn('Sync failed on refresh:', err);
      fetchDemandes(false);
    });
  };



  const handleOpenDatePicker = () => {
    setTempDateObj(selectedDateObj || new Date());
    setShowDatePicker(true);
  };

  const handleConfirmDate = () => {
    if (tempDateObj) {
      setSelectedDateObj(tempDateObj);
      const day = String(tempDateObj.getDate()).padStart(2, '0');
      const month = String(tempDateObj.getMonth() + 1).padStart(2, '0');
      const year = tempDateObj.getFullYear();
      setSearchDate(`${day}/${month}/${year}`);
    }
    setShowDatePicker(false);
  };

  const handleClearDate = () => {
    setSearchDate('');
    setSelectedDateObj(null);
    setTempDateObj(null);
    setShowDatePicker(false);
  };

  const isTodaySelected = React.useMemo(() => {
    if (!selectedDateObj) return false;
    const today = new Date();
    return selectedDateObj.getDate() === today.getDate() &&
           selectedDateObj.getMonth() === today.getMonth() &&
           selectedDateObj.getFullYear() === today.getFullYear();
  }, [selectedDateObj]);

  const handleSelectToday = () => {
    if (isTodaySelected) {
      handleClearDate();
    } else {
      const today = new Date();
      setSelectedDateObj(today);
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      setSearchDate(`${day}/${month}/${year}`);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selectedDate) {
        setSelectedDateObj(selectedDate);
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const year = selectedDate.getFullYear();
        setSearchDate(`${day}/${month}/${year}`);
      }
    } else {
      if (selectedDate) {
        setTempDateObj(selectedDate);
      }
    }
  };

  const filterCounts = React.useMemo(() => {
    return {
      tous: demandes.length,
      en_attente: demandes.filter(d => ['en_attente', 'pending_sync', 'sync_error'].includes(d.statut)).length,
      en_cours: demandes.filter(d => ['en_cours', 'verification_dossier', 'en_traitement', 'signature'].includes(d.statut)).length,
      valide: demandes.filter(d => ['valide', 'pret'].includes(d.statut)).length,
      rejete: demandes.filter(d => d.statut === 'rejete').length,
      hors_delais: demandes.filter(d => d.statut === 'hors_delais').length,
    };
  }, [demandes]);

  const getCountForFilter = (key: string) => {
    return (filterCounts as any)[key] || 0;
  };

  const filterTabs = [
    { key: 'tous', label: 'Tous' },
    { key: 'en_attente', label: 'En attente' },
    { key: 'en_cours', label: 'En cours' },
    { key: 'valide', label: 'Validés' },
    { key: 'rejete', label: 'Rejetés' },
    { key: 'hors_delais', label: 'Expirés' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.background }]}>
        <Text style={[styles.title, { color: theme.text }]}>Dossiers Assignés</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Gérez l'avancement des actes dont vous avez la charge</Text>
      </View>

      {/* Search Input */}
      <View style={[styles.searchSection, { backgroundColor: theme.background }]}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={[styles.searchWrapper, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, flex: 2 }]}>
            <Search size={18} color="#8c9ba5" style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, flex: 1 }]}
              placeholder="Rechercher..."
              placeholderTextColor="#8c9ba5"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
          <TouchableOpacity 
            style={[styles.searchWrapper, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, flex: 1.5 }]}
            onPress={handleOpenDatePicker}
            activeOpacity={0.7}
          >
            <Calendar size={18} color="#8c9ba5" style={{ marginRight: 8 }} />
            <Text style={{ color: searchDate ? theme.text : '#8c9ba5', fontSize: 15, flex: 1 }} numberOfLines={1}>
              {searchDate || "Date exacte"}
            </Text>
            {searchDate ? (
              <TouchableOpacity onPress={handleClearDate} style={{ padding: 4 }}>
                <X size={16} color="#8c9ba5" />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
          <TouchableOpacity
            style={[
              styles.todayBtn,
              isTodaySelected
                ? styles.todayBtnActive
                : { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }
            ]}
            onPress={handleSelectToday}
            activeOpacity={0.7}
          >
            <Calendar size={14} color={isTodaySelected ? '#ffffff' : '#2563eb'} style={{ marginRight: 6 }} />
            <Text style={[styles.todayBtnLabel, { color: isTodaySelected ? '#ffffff' : theme.text }]}>
              Aujourd'hui
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Document Type Filter */}
      {uniqueActTypes.length > 2 && (
        <View style={{ paddingBottom: 12 }}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={uniqueActTypes}
            keyExtractor={item => item}
            contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.actTypeTab,
                  selectedActType === item 
                    ? styles.actTypeTabActive 
                    : { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }
                ]}
                onPress={() => setSelectedActType(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.actTypeTabLabel,
                    selectedActType === item ? styles.actTypeTabLabelActive : { color: theme.textSecondary }
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* DatePicker */}
      {showDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent={true} animationType="fade" visible={showDatePicker}>
            <TouchableOpacity 
              style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }} 
              activeOpacity={1} 
              onPress={() => setShowDatePicker(false)}
            >
              <View 
                style={{ backgroundColor: theme.backgroundElement, padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
                onStartShouldSetResponder={() => true}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, alignItems: 'center' }}>
                  <TouchableOpacity onPress={handleClearDate}>
                    <Text style={{ color: '#ef4444', fontSize: 16 }}>Effacer</Text>
                  </TouchableOpacity>
                  <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>Choisir une date</Text>
                  <TouchableOpacity onPress={handleConfirmDate}>
                    <Text style={{ color: '#2563eb', fontSize: 16, fontWeight: '700' }}>Valider</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={tempDateObj || new Date()}
                  mode="date"
                  display="inline"
                  onChange={handleDateChange}
                  themeVariant={activeTheme as 'light' | 'dark'}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={selectedDateObj || new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )
      )}

      {/* Horizontal Status Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.background, borderBottomColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }]}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={item => item.key}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterTab,
                activeFilter === item.key 
                  ? styles.filterTabActive 
                  : { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }
              ]}
              onPress={() => setActiveFilter(item.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabLabel,
                  activeFilter === item.key ? styles.filterTabLabelActive : { color: theme.textSecondary }
                ]}
              >
                {item.label}
              </Text>
              {getCountForFilter(item.key) > 0 && (
                <View style={[
                  styles.filterTabCount,
                  activeFilter === item.key
                    ? { backgroundColor: 'rgba(255,255,255,0.3)' }
                    : { backgroundColor: item.key === 'en_attente' ? '#f59e0b' : item.key === 'rejete' ? '#ef4444' : '#2563eb' }
                ]}>
                  <Text style={styles.filterTabCountText}>
                    {getCountForFilter(item.key)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filteredDemandes.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: theme.backgroundSelected }]}>
            {searchDate ? <Calendar size={36} color={theme.textSecondary} /> : <ClipboardList size={36} color={theme.textSecondary} />}
          </View>
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {searchDate
              ? `Aucune demande le ${searchDate}`
              : searchText.trim()
              ? `Aucun résultat pour "${searchText}"`
              : activeFilter === 'en_attente' ? 'Aucune demande en attente'
              : activeFilter === 'en_cours'   ? 'Aucune demande en cours d\'examen'
              : activeFilter === 'valide'     ? 'Aucune demande validée'
              : activeFilter === 'rejete'     ? 'Aucune demande rejetée'
              : activeFilter === 'hors_delais' ? 'Aucune demande expirée'
              : 'Aucune demande soumise'}
          </Text>
          <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
            {searchDate
              ? 'Essayez une autre date ou effacez le filtre de date.'
              : searchText.trim()
              ? 'Vérifiez l\'orthographe ou essayez un autre terme.'
              : activeFilter !== 'tous'
              ? 'Vos demandes de cette catégorie apparaîtront ici.'
              : 'Faites votre première demande en cliquant sur Accueil.'}
          </Text>
          {(searchDate || searchText.trim()) && (
            <TouchableOpacity
              style={styles.emptyResetBtn}
              onPress={() => { setSearchDate(''); setSelectedDateObj(null); setSearchText(''); }}
              activeOpacity={0.8}
            >
              <X size={14} color="#2563eb" style={{ marginRight: 6 }} />
              <Text style={styles.emptyResetText}>Effacer les filtres</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredDemandes}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
          renderItem={({ item }) => (
            <AgentDemandCard
              item={item}
              theme={theme}
              activeTheme={activeTheme}
              onPressView={() => router.push(`/(agent)/dossier/${item.id}` as any)}
              onPressDoc={() => Alert.alert('Acte civil', 'Ouverture du document...')}
              onPressProcess={() => router.push(`/(agent)/dossier/${item.id}` as any)}
            />
          )}
        />
      )}
    </View>
  );
}

// ── Helpers ──
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {}
  return dateStr;
};

const getStatusStyle = (item: any) => {
  const statut = item.statut;
  switch (statut) {
    case 'en_attente':
      return { bg: '#fef3c7', text: '#d97706', label: 'En attente' };
    case 'pending_sync':
      return { bg: '#e0f2fe', text: '#0284c7', label: 'Hors-ligne (Attente Sync)' };
    case 'sync_error':
      return { bg: '#fee2e2', text: '#dc2626', label: item.errorMessage ? `Échec : ${item.errorMessage}` : 'Hors-ligne (Échec Sync)' };
    case 'en_cours':
      return { bg: '#dbeafe', text: '#2563eb', label: 'Examen' };
    case 'verification_dossier':
      return { bg: '#e0e7ff', text: '#4f46e5', label: 'Vérification' };
    case 'en_traitement':
      return { bg: '#ccfbf1', text: '#0d9488', label: 'Traitement' };
    case 'signature':
      return { bg: '#fce7f3', text: '#db2777', label: 'À signer' };
    case 'pret':
      return { bg: '#d1fae5', text: '#059669', label: 'Prêt' };
    case 'valide':
      return { bg: '#d1fae5', text: '#059669', label: 'Validé' };
    case 'rejete':
      return { bg: '#fee2e2', text: '#dc2626', label: 'Rejeté' };
    case 'hors_delais':
      return { bg: '#fef3c7', text: '#b45309', label: 'Expiré' };
    default:
      return { bg: '#f1f5f9', text: '#475569', label: statut };
  }
};

// ── Memoized Agent Demand Card ──
const AgentDemandCard = React.memo(({ item, theme, activeTheme, onPressView, onPressProcess, onPressDoc }: any) => {
  const statusStyle = getStatusStyle(item);
  return (
    <View style={[
      styles.card, 
      { 
        backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#ffffff',
        borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0'
      }
    ]}>
      {/* Header Section */}
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
            Dossier N° {item.reference}
          </Text>
          <Text style={[styles.referenceText, { color: theme.textSecondary }]}>
            Soumis le : {formatDate(item.date_soumission)}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>

      {/* Separator */}
      <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]} />

      {/* Details Section */}
      <View style={styles.detailsContainer}>
        <View style={styles.infoRow}>
          <FileText size={16} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
            {item.activite_nom || 'Acte civil'}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <User size={16} color={theme.textSecondary} />
          <Text style={[styles.infoText, { color: theme.text }]} numberOfLines={1}>
            {item.citoyen_nom || 'Citoyen inconnu'} {item.citoyen_telephone ? `(${item.citoyen_telephone})` : ''}
          </Text>
        </View>

        {item.service_nom ? (
          <View style={styles.infoRow}>
            <ClipboardList size={16} color={theme.textSecondary} />
            <Text style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={1}>
              {item.service_nom}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Actions Section */}
      <View style={[styles.actionsRow, { borderTopColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnView]}
          onPress={onPressView}
          activeOpacity={0.7}
        >
          <Eye size={16} color="#4b5563" />
          <Text style={styles.actionBtnTextView}>Consulter</Text>
        </TouchableOpacity>

        {(item.statut === 'pret' || item.statut === 'valide') && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.btnDoc]}
            onPress={onPressDoc}
            activeOpacity={0.7}
          >
            <FileText size={16} color="#2563eb" />
            <Text style={styles.actionBtnTextDoc}>Voir Acte</Text>
          </TouchableOpacity>
        )}

        {(item.statut === 'en_attente' || item.statut === 'en_cours') && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.btnProcess]}
            onPress={onPressProcess}
            activeOpacity={0.7}
          >
            <CheckCircle2 size={16} color="#2563eb" />
            <Text style={styles.actionBtnTextProcess}>Traiter</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  searchSection: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 48,
    paddingHorizontal: 14,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    letterSpacing: 0,
  },
  filterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterTabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabLabelActive: {
    color: '#ffffff',
  },
  filterTabCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  filterTabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  emptyResetText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 24,
    gap: 16,
    paddingBottom: 120,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  referenceText: {
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  separator: {
    height: 1,
    marginVertical: 8,
    opacity: 0.4,
  },
  detailsContainer: {
    gap: 8,
    marginVertical: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnView: {
    borderColor: 'rgba(100, 116, 139, 0.2)',
    backgroundColor: 'rgba(100, 116, 139, 0.05)',
  },
  btnDoc: {
    borderColor: 'rgba(37, 99, 235, 0.2)',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  btnProcess: {
    borderColor: 'rgba(37, 99, 235, 0.2)',
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  actionBtnTextView: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnTextDoc: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  actionBtnTextProcess: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
  },
  actTypeTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  actTypeTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  actTypeTabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actTypeTabLabelActive: {
    color: '#ffffff',
  },
  todayBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  todayBtnLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
