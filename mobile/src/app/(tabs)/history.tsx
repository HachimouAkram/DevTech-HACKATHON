import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TextInput, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/apiClient';
import { Search, ChevronRight, ClipboardList, Calendar, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, Modal } from 'react-native';
import { getPendingSyncDemandes, getFromCache } from '../../database/localDb';
import { TapEffect } from '../../components/TapEffect';

export default function HistoryScreen() {
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

  // ── Optimized: useMemo instead of double-rendering state + useEffect ──
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

    // Search Filter
    if (searchText.trim()) {
      const query = searchText.toLowerCase();
      result = result.filter(
        d => d.reference.toLowerCase().includes(query) || 
             d.activite_nom.toLowerCase().includes(query)
      );
    }

    // Date Filter
    if (searchDate.trim()) {
      const dQuery = searchDate.trim().toLowerCase();
      result = result.filter(d => {
        const dStr = formatDate(d.date_soumission).toLowerCase();
        return dStr.includes(dQuery) || d.date_soumission.includes(dQuery);
      });
    }

    return result;
  }, [demandes, searchText, activeFilter, searchDate]);

  // ── Optimized: pre-compute tab counts to avoid inner rendering filter loops ──
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

    // Listen to global real-time events from root layout
    const sseDemandesSub = DeviceEventEmitter.addListener('refresh_demandes', () => {
      console.log('[History] Global refresh_demandes received — refreshing list');
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

  // Removed getStatusStyle from inside HistoryScreen to place it globally outside.

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
        <Text style={[styles.title, { color: theme.text }]}>Mes Demandes</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Consultez l'historique et l'avancement de vos actes civils</Text>
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
      </View>

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
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
          renderItem={({ item }) => (
            <DemandCard
              item={item}
              theme={theme}
              activeTheme={activeTheme}
              onPress={() => router.push(`/demande/${item.id}`)}
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

// ── Memoized Demand Card ──
const DemandCard = React.memo(({ item, theme, activeTheme, onPress }: any) => {
  const statusStyle = getStatusStyle(item);
  return (
    <TapEffect
      style={[
        styles.demandCard, 
        { 
          backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#ffffff', 
          borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#e2e8f0' 
        }
      ]}
      onPress={onPress}
      borderRadius={20}
      rippleOpacity={0.15}
      scaleDown={0.97}
      elevation={5}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.cardRef, { color: theme.textSecondary }]}>{item.reference}</Text>
        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {statusStyle.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.cardAct, { color: theme.text }]}>{item.activite_nom || 'Acte civil'}</Text>
      <Text style={[styles.cardService, { color: theme.textSecondary }]}>{item.service_nom || 'Administration'}</Text>

      <View style={[styles.cardFooter, { borderTopColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
        <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
          Soumis le : {formatDate(item.date_soumission)}
        </Text>
        <View style={styles.amountBox}>
          <Text style={[styles.cardAmount, { color: theme.text }]}>{item.montant_paye?.toLocaleString()} F</Text>
          <ChevronRight size={16} color="#8c9ba5" />
        </View>
      </View>
    </TapEffect>
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
    fontSize: 14,
    fontWeight: '700',
    color: '#2563eb',
  },
  listContent: {
    padding: 20,
    paddingBottom: 110,
    gap: 16,
  },
  demandCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardRef: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardAct: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardService: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  cardDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  amountBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
});
