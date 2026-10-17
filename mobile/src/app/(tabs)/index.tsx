import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions, TextInput, Image, Modal, Alert, DeviceEventEmitter,
  Platform, StatusBar, FlatList, Animated
} from 'react-native';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TapEffect } from '../../components/TapEffect';
import { useRouter } from 'expo-router';
import { getPendingSyncDemandes, getFromCache } from '../../database/localDb';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch, getApiUrl } from '../../services/apiClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useVoiceScroll } from '../../hooks/useVoiceNavigator';
import { useVoiceNavigatorSetting } from '../../components/VoiceNavigatorButton';

// PremiumPressable — legacy component kept for stat cards
const PremiumPressable = ({ children, onPress, style, activeOpacity = 0.95, containerStyle }: { children: React.ReactNode; onPress: () => void; style?: any; activeOpacity?: number; containerStyle?: any }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 18, stiffness: 280, mass: 0.8 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 220, mass: 0.8 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
      style={[containerStyle, { overflow: 'visible' }]}
    >
      <AnimatedReanimated.View style={[animatedStyle, style]}>
        {children}
      </AnimatedReanimated.View>
    </TouchableOpacity>
  );
};
import {
  Bell, RefreshCw, ChevronRight, FileCheck, Clock,
  FileWarning, FileText, Sun, Moon, Building2,
  Trash2, DollarSign, MapPin, ArrowRight, Search, X, Sparkles
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getBureauIllustrativeIcon, getBureauGradientColors } from '../../components/IllustrativeIcons';
import NetInfo from '@react-native-community/netinfo';

const { width } = Dimensions.get('window');

const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || typeof hex !== 'string') return `rgba(37, 99, 235, ${alpha})`;
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(37, 99, 235, ${alpha})`;
};

// Map icon name string → React component
const ICON_MAP: Record<string, any> = {
  FileText: FileText,
  Building2: Building2,
  Trash2: Trash2,
  DollarSign: DollarSign,
  MapPin: MapPin,
};

function BureauIcon({ name, size = 28, color = '#fff' }: { name: string; size?: number; color?: string }) {
  const IconComp = ICON_MAP[name] || Building2;
  return <IconComp size={size} color={color} />;
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const theme = useTheme();
  const { activeTheme, setThemePreference } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [profileImage, setProfileImage] = useState<string | null>(null);

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

  const avatarUri = user?.avatar_url ? resolveImageUrl(user.avatar_url) : profileImage;

  const fetchLatestUser = async () => {
    try {
      if (user?.id) {
        const res = await apiFetch(`/users/${user.id}`);
        if (res.status === 'success' && res.data?.user) {
          updateUser(res.data.user);
        }
      }
    } catch (err) {
      console.log('[Home] Failed to fetch latest user profile:', err);
    }
  };

  // Static value for AI assistant button sizing
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [bureaux, setBureaux] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, enCours: 0, valides: 0, rejetees: 0 });
  const [recentDemandes, setRecentDemandes] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showOtherServicesModal, setShowOtherServicesModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Voice navigation auto-scroll ref & setting ───────────────────────────
  const mainScrollRef = useRef<ScrollView>(null);
  useVoiceScroll(mainScrollRef);
  const { enabled: isVoiceEnabled } = useVoiceNavigatorSetting();

  // ── Concurrency guard: prevents parallel fetchData executions ─────────────
  const isFetchingRef = useRef(false);
  // ── Debounce timers for event-driven refreshes ────────────────────────────
  const networkRestoredTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncCompletedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredBureaux = bureaux.filter(b =>
    b.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  /** Handle bureau card press — block if no services configured */
  const handleBureauPress = (bureau: any, closeModal?: () => void) => {
    // Only show "not configured" if we're sure we're online AND services_count is confirmed 0
    if (bureau.services_count !== undefined && bureau.services_count !== null && bureau.services_count === 0) {
      Alert.alert(
        '🚧 Bientôt disponible',
        `La démarche « ${bureau.nom} » n'est pas encore configurée.\n\nNous travaillons dessus. Revenez bientôt !`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    if (closeModal) closeModal();
    const gradColors = getBureauGradientColors(bureau.nom);
    router.push(`/demande/new?bureauId=${bureau.id}&bureauNom=${encodeURIComponent(bureau.nom)}&bureauCouleur=${encodeURIComponent(gradColors[0])}`);
  };

  // ── Helper: build state from data objects ──────────────────────────────────
  const applyData = useCallback(async (bureauxData: any[], demandesData: any[], notifsData: any[]) => {
    // Uniquement les bureaux actifs et externes (visibles aux citoyens)
    // N'exclut pas les nouveaux bureaux créés pour permettre aux citoyens de voir leur disponibilité
    const activeBureaux = (bureauxData || []).filter(b => 
      b.actif !== false &&
      b.config?.type_acces !== 'interne' &&
      b.config?.is_externe !== false
    );
    setBureaux(activeBureaux);

    let pendingList: any[] = [];
    try {
      const pending = await getPendingSyncDemandes();
      pendingList = pending.map(p => {
        let parsed = {};
        try { parsed = JSON.parse(p.payload); } catch (e) { }
        const metadata = (parsed as any)._offline_metadata || {};
        const timestamp = parseInt(p.id.split('_')[1]) || Date.now();
        return {
          id: p.id,
          reference: `HORS-LIGNE-${p.id.split('_')[2]?.toUpperCase() || 'DEM'}`,
          statut: 'pending_sync',
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

    const merged = [...pendingList, ...demandesData];
    setRecentDemandes(merged.slice(0, 3));
    setStats({
      total: merged.length,
      enCours: merged.filter((d: any) =>
        ['en_cours', 'verification_dossier', 'en_traitement', 'signature'].includes(d.statut)
      ).length,
      valides: merged.filter((d: any) => ['valide', 'pret'].includes(d.statut)).length,
      rejetees: merged.filter((d: any) => d.statut === 'rejete').length,
    });
    const unread = notifsData.filter((n: any) => !n.lu).length;
    setUnreadCount(unread);
  }, []);

  const fetchData = useCallback(async (source = 'manual') => {
    // ── Concurrency guard: skip if a fetch is already in progress ──────────
    if (isFetchingRef.current) {
      console.log(`[Home] fetchData(${source}) skipped — already in progress`);
      return;
    }
    isFetchingRef.current = true;
    try {
      fetchLatestUser().catch(() => null);
      // ── Step 1: Load from cache immediately so UI shows right away ──────
      const [cachedBureaux, cachedDemandes, cachedNotifs] = await Promise.all([
        getFromCache('historique_cache', '/bureaux').catch(() => null),
        getFromCache('historique_cache', '/demandes').catch(() => null),
        getFromCache('historique_cache', '/notifications').catch(() => null),
      ]);

      const hasCachedBureaux = cachedBureaux?.data?.bureaux?.length > 0;
      if (hasCachedBureaux) {
        await applyData(
          cachedBureaux.data.bureaux || [],
          cachedDemandes?.data?.demandes || [],
          cachedNotifs?.data?.notifications || [],
        );
        // Show UI immediately — network refresh happens silently below
        setLoading(false);
      }

      // ── Step 2: Fetch fresh data from network (background if cache hit) ─
      const [bureauxRes, demandesRes, notifsRes] = await Promise.all([
        apiFetch(`/bureaux?t=${Date.now()}`).catch(() => null),
        apiFetch('/demandes').catch(() => null),
        apiFetch('/notifications').catch(() => null),
      ]);

      const freshBureaux = bureauxRes?.status === 'success' ? (bureauxRes.data.bureaux || []) : (cachedBureaux?.data?.bureaux || []);
      const freshDemandes = demandesRes?.status === 'success' ? (demandesRes.data.demandes || []) : (cachedDemandes?.data?.demandes || []);
      const freshNotifs = notifsRes?.status === 'success' ? (notifsRes.data.notifications || []) : (cachedNotifs?.data?.notifications || []);

      await applyData(freshBureaux, freshDemandes, freshNotifs);
    } catch (err) {
      console.warn('Erreur chargement accueil:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, [applyData]);

  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        if (user?.id) {
          const savedImage = await AsyncStorage.getItem(`user_profile_image_${user.id}`);
          if (savedImage) setProfileImage(savedImage);
          else setProfileImage(null);
        } else {
          setProfileImage(null);
        }
      } catch (err) {
        console.warn('Error loading profile image in HomeScreen:', err);
      }
    };
    loadProfileImage();
  }, [user?.id]);

  useEffect(() => {
    fetchData('initial');

    const profileImageSub = DeviceEventEmitter.addListener('profile_image_updated', (uri: string | null) => {
      setProfileImage(uri);
    });

    // When sync finishes → debounced refresh (2s) to coalesce multiple sync_completed events
    const syncSub = DeviceEventEmitter.addListener('sync_completed', () => {
      console.log('[Home] sync_completed received — refreshing home data');
      if (syncCompletedTimerRef.current) clearTimeout(syncCompletedTimerRef.current);
      syncCompletedTimerRef.current = setTimeout(() => fetchData('sync_completed'), 2000);
    });

    // When network is restored → debounced refresh (3s) — gives SyncEngine time to sync first
    const networkSub = DeviceEventEmitter.addListener('network_restored', () => {
      console.log('[Home] network_restored received — triggering instant refresh');
      if (networkRestoredTimerRef.current) clearTimeout(networkRestoredTimerRef.current);
      networkRestoredTimerRef.current = setTimeout(() => fetchData('network_restored'), 3000);
    });

    // Listen to global real-time events from root layout
    const sseDemandesSub = DeviceEventEmitter.addListener('refresh_demandes', () => {
      console.log('[Home] Global refresh_demandes received — refreshing data');
      if (sseRefreshTimerRef.current) clearTimeout(sseRefreshTimerRef.current);
      sseRefreshTimerRef.current = setTimeout(() => fetchData('sse_refresh_demandes'), 1500);
    });

    const sseNotificationsSub = DeviceEventEmitter.addListener('refresh_notifications', () => {
      console.log('[Home] Global refresh_notifications received — refreshing data');
      if (sseRefreshTimerRef.current) clearTimeout(sseRefreshTimerRef.current);
      sseRefreshTimerRef.current = setTimeout(() => fetchData('sse_refresh_notifications'), 1500);
    });

    const sseProfileSub = DeviceEventEmitter.addListener('refresh_user_profile', (updatedUserId) => {
      if (user?.id && String(user.id) === String(updatedUserId)) {
        console.log('[Home] Global user profile update received for current user!');
        fetchLatestUser();
      }
    });

    const catalogSub = DeviceEventEmitter.addListener('catalog_updated', () => {
      console.log('[Home] catalog_updated received — silently refreshing bureaux');
      fetchData('catalog_refresh');
    });

    return () => {
      if (networkRestoredTimerRef.current) clearTimeout(networkRestoredTimerRef.current);
      if (syncCompletedTimerRef.current) clearTimeout(syncCompletedTimerRef.current);
      if (sseRefreshTimerRef.current) clearTimeout(sseRefreshTimerRef.current);
      syncSub.remove();
      networkSub.remove();
      profileImageSub.remove();
      sseDemandesSub.remove();
      sseNotificationsSub.remove();
      sseProfileSub.remove();
      catalogSub.remove();
    };
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    const { syncOfflineDemandes } = require('../../services/SyncEngine');
    syncOfflineDemandes().then(() => {
      fetchData();
    }).catch((err: any) => {
      console.warn('Sync failed on refresh:', err);
      fetchData();
    });
  };

  const getStatusStyle = (statut: string) => {
    switch (statut) {
      case 'en_attente': return { bg: '#fef3c7', text: '#d97706', label: 'En attente' };
      case 'pending_sync': return { bg: '#e0f2fe', text: '#0284c7', label: 'Hors-ligne (Attente Sync)' };
      case 'en_cours': return { bg: '#dbeafe', text: '#2563eb', label: 'En cours' };
      case 'valide': return { bg: '#d1fae5', text: '#059669', label: 'Validé' };
      case 'pret': return { bg: '#d1fae5', text: '#059669', label: 'Prêt' };
      case 'rejete': return { bg: '#fee2e2', text: '#dc2626', label: 'Rejeté' };
      case 'hors_delais': return { bg: '#fef3c7', text: '#b45309', label: 'Expiré' };
      default: return { bg: '#f1f5f9', text: '#475569', label: statut };
    }
  };

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return 'C';
    return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatName = (name: string | null | undefined) => {
    if (!name) return 'Citoyen';
    const firstWord = name.trim().split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  };

  const headerContent = (
    <View style={styles.headerRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={styles.avatarCircle}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%', borderRadius: 26 }} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(user?.nom_complet || '')}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>
            Bonjour, {user?.nom_complet ? formatName(user.nom_complet) : 'Citoyen'}
          </Text>
          <Text style={styles.welcomeText} numberOfLines={1}>
            Bienvenue sur votre espace
          </Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => setThemePreference(activeTheme === 'dark' ? 'light' : 'dark')}
        >
          {activeTheme === 'dark' ? <Sun size={18} color="#fff" /> : <Moon size={18} color="#fff" />}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.push('/notifications')}
        >
          <Bell size={18} color="#fff" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {Platform.OS === 'android' ? (
        activeTheme === 'light' ? (
          <LinearGradient
            key="header-android-light-grad"
            colors={['#2563eb', '#1d4ed8']}
            style={[
              styles.header,
              {
                paddingTop: (StatusBar.currentHeight || 24) + 16,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
              }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {headerContent}
          </LinearGradient>
        ) : (
          <LinearGradient
            key="header-android-dark-grad"
            colors={['rgba(37, 99, 235, 0.25)', 'rgba(29, 78, 216, 0.08)']}
            style={[
              styles.header,
              {
                paddingTop: (StatusBar.currentHeight || 24) + 16,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
              }
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {headerContent}
          </LinearGradient>
        )
      ) : (
        <View style={[styles.headerContainer, activeTheme === 'dark' && { borderBottomWidth: 1, borderBottomColor: 'rgba(37, 99, 235, 0.15)', backgroundColor: 'rgba(9, 13, 22, 0.95)' }]}>
          {activeTheme === 'dark' && Platform.OS === 'ios' && (
            <BlurView tint="dark" intensity={45} style={StyleSheet.absoluteFill} />
          )}
          {activeTheme === 'dark' && Platform.OS !== 'ios' && (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(9, 13, 22, 0.75)' }]} />
          )}
          <LinearGradient
            key={`header-gradient-${activeTheme}`}
            colors={activeTheme === 'dark' ? ['rgba(37, 99, 235, 0.25)', 'rgba(29, 78, 216, 0.08)'] : ['#2563eb', '#1d4ed8']}
            style={[styles.header, { paddingTop: insets.top + 18 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {headerContent}
          </LinearGradient>
        </View>
      )}

      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563eb']} />}
      >
        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: <FileText size={20} color="#ffffff" />, val: stats.total, lbl: 'Soumises total', color: '#64748b', routeFilter: 'tous' },
            { icon: <Clock size={20} color="#ffffff" />, val: stats.enCours, lbl: 'En cours', color: '#3b82f6', routeFilter: 'en_cours' },
            { icon: <FileCheck size={20} color="#ffffff" />, val: stats.valides, lbl: 'Validées', color: '#10b981', routeFilter: 'valide' },
            { icon: <FileWarning size={20} color="#ffffff" />, val: stats.rejetees, lbl: 'Rejetées', color: '#ef4444', routeFilter: 'rejete' },
          ].map((s, i) => (
            <PremiumPressable
              key={i}
              onPress={() => router.push(`/(tabs)/history?filter=${s.routeFilter}`)}
              containerStyle={{ width: '23%' }}
              style={[
                styles.statCard,
                {
                  backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                  width: '100%'
                }
              ]}
            >
              <View style={[styles.statIconContainer, { shadowColor: s.color }]}>
                <LinearGradient
                  colors={[s.color, s.color + '99']}
                  style={styles.statIconGradient}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                >
                  {s.icon}
                </LinearGradient>
                <View style={styles.statIconHighlight} />
              </View>
              <Text style={[styles.statVal, { color: theme.text }]}>{s.val > 49 ? '50+' : s.val}</Text>
              <Text style={[styles.statLbl, { color: theme.textSecondary }]}>{s.lbl}</Text>
            </PremiumPressable>
          ))}
        </View>

        {/* Section Bureaux */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Démarches administratives</Text>
            <Text style={[styles.sectionSub, { color: theme.textSecondary }]}>Choisissez une démarche </Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[
          styles.searchContainer,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
          }
        ]}>
          <Search size={18} color={theme.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Rechercher une  démarche..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading ? (
          <ActivityIndicator color="#2563eb" style={{ marginVertical: 30 }} />
        ) : filteredBureaux.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: theme.backgroundElement }]}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center' }}>
              Aucun Administration correspondant à votre recherche.
            </Text>
          </View>
        ) : (
          <View style={styles.bureauxGrid}>
             {filteredBureaux.slice(0, 3).map((bureau: any) => {
              const gradColors = getBureauGradientColors(bureau.nom);
              return (
                <TapEffect
                  key={bureau.id}
                  containerStyle={{ width: '48%' }}
                  style={[
                    styles.bureauGridCard,
                    {
                      borderColor: hexToRgba(gradColors[0], activeTheme === 'dark' ? 0.25 : 0.18),
                      width: '100%',
                      backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#ffffff',
                    }
                  ]}
                  onPress={() => handleBureauPress(bureau)}
                  color={gradColors[0]}
                  borderRadius={20}
                  rippleOpacity={0.22}
                  scaleDown={0.955}
                  elevation={6}
                >
                  {/* Inner View clips the gradient on Android without breaking elevation */}
                  <View style={styles.bureauCardInner}>
                    <LinearGradient
                      colors={
                        activeTheme === 'dark'
                          ? [hexToRgba(gradColors[0], 0.18), hexToRgba(gradColors[1] || gradColors[0], 0.06), '#1e293b']
                          : [hexToRgba(gradColors[0], 0.10), hexToRgba(gradColors[1] || gradColors[0], 0.04), '#ffffff']
                      }
                      style={styles.bureauCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      {Platform.OS === 'ios' && (
                        <View style={[styles.bureauCardGlow, { backgroundColor: hexToRgba(gradColors[0], activeTheme === 'dark' ? 0.20 : 0.12) }]} />
                      )}
                      <View style={{ alignSelf: 'center', marginBottom: 8 }}>
                        {getBureauIllustrativeIcon(bureau.nom, 68)}
                      </View>
                      <Text style={[styles.bureauGridNom, { color: theme.text }]} numberOfLines={2}>
                        {bureau.nom}
                      </Text>
                      <View style={[styles.badgeServices, { backgroundColor: hexToRgba(gradColors[0], 0.12), borderWidth: 1, borderColor: hexToRgba(gradColors[0], 0.22) }]}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: gradColors[0] }}>
                          {!bureau.services_count || bureau.services_count === 0
                            ? 'À venir'
                            : `${bureau.services_count} service${bureau.services_count > 1 ? 's' : ''}`}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                </TapEffect>
              );
            })}

            {filteredBureaux.length > 3 && (
              <TapEffect
                containerStyle={{ width: '48%' }}
                style={[
                  styles.bureauGridCard,
                  {
                    borderColor: activeTheme === 'dark' ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.18)',
                    width: '100%',
                    backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#ffffff',
                  }
                ]}
                onPress={() => setShowOtherServicesModal(true)}
                color="#8b5cf6"
                borderRadius={20}
                rippleOpacity={0.22}
                scaleDown={0.955}
                elevation={6}
              >
                <View style={styles.bureauCardInner}>
                  <LinearGradient
                    colors={
                      activeTheme === 'dark'
                        ? ['rgba(139,92,246,0.18)', 'rgba(109,40,217,0.06)', '#1e293b']
                        : ['rgba(139,92,246,0.10)', 'rgba(109,40,217,0.04)', '#ffffff']
                    }
                    style={styles.bureauCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {Platform.OS === 'ios' && (
                      <View style={[styles.bureauCardGlow, { backgroundColor: activeTheme === 'dark' ? 'rgba(139,92,246,0.20)' : 'rgba(139,92,246,0.12)' }]} />
                    )}
                    <View style={{ alignSelf: 'center', marginBottom: 8 }}>
                      {getBureauIllustrativeIcon('autres', 68)}
                    </View>
                    <Text style={[styles.bureauGridNom, { color: theme.text }]} numberOfLines={2}>
                      Autres démarches
                    </Text>
                    <View style={[styles.badgeServices, { backgroundColor: 'rgba(139,92,246,0.12)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.22)' }]}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#8b5cf6' }}>Voir tout</Text>
                    </View>
                  </LinearGradient>
                </View>
              </TapEffect>
            )}
          </View>
        )}

        {/* Demandes récentes */}
        {recentDemandes.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 16 }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Mes demandes récentes</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
                <Text style={styles.seeAll}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.demandesList}>
              {recentDemandes.map((d: any) => {
                const st = getStatusStyle(d.statut);
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.demandeRow, { backgroundColor: theme.backgroundElement }]}
                    onPress={() => {
                      router.push(`/demande/${d.id}`);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.demandeRef, { color: theme.textSecondary }]}>{d.reference}</Text>
                      <Text style={[styles.demandeAct, { color: theme.text }]}>{d.activite_nom || 'Acte civil'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusText, { color: st.text }]}>{st.label}</Text>
                    </View>
                    <ArrowRight size={16} color={theme.textSecondary} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Autres Services */}
      <Modal visible={showOtherServicesModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Autres services</Text>
              <TouchableOpacity onPress={() => setShowOtherServicesModal(false)} style={styles.modalCloseBtn}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={filteredBureaux.slice(3)}
              keyExtractor={item => item.id.toString()}
              numColumns={2}
              columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 16 }}
              contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={({ item: bureau }) => {
                const gradColors = getBureauGradientColors(bureau.nom);
                return (
                  <TapEffect
                    containerStyle={{ width: '48%' }}
                    style={[
                      styles.bureauGridCard,
                      {
                        borderColor: hexToRgba(gradColors[0], activeTheme === 'dark' ? 0.25 : 0.18),
                        width: '100%',
                        backgroundColor: activeTheme === 'dark' ? '#1e293b' : '#ffffff',
                      }
                    ]}
                    onPress={() => handleBureauPress(bureau, () => setShowOtherServicesModal(false))}
                    color={gradColors[0]}
                    borderRadius={20}
                    rippleOpacity={0.22}
                    scaleDown={0.955}
                    elevation={6}
                  >
                    <View style={styles.bureauCardInner}>
                      <LinearGradient
                        colors={
                          activeTheme === 'dark'
                            ? [hexToRgba(gradColors[0], 0.18), hexToRgba(gradColors[1] || gradColors[0], 0.06), '#1e293b']
                            : [hexToRgba(gradColors[0], 0.10), hexToRgba(gradColors[1] || gradColors[0], 0.04), '#ffffff']
                        }
                        style={styles.bureauCardGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        {Platform.OS === 'ios' && (
                          <View style={[styles.bureauCardGlow, { backgroundColor: hexToRgba(gradColors[0], activeTheme === 'dark' ? 0.20 : 0.12) }]} />
                        )}
                        <View style={{ alignSelf: 'center', marginBottom: 8 }}>
                          {getBureauIllustrativeIcon(bureau.nom, 68)}
                        </View>
                        <Text style={[styles.bureauGridNom, { color: theme.text }]} numberOfLines={2}>
                          {bureau.nom}
                        </Text>
                        <View style={[styles.badgeServices, { backgroundColor: hexToRgba(gradColors[0], 0.12), borderWidth: 1, borderColor: hexToRgba(gradColors[0], 0.22) }]}>
                          <Text style={{ fontSize: 11, fontWeight: '700', color: gradColors[0] }}>
                            {!bureau.services_count || bureau.services_count === 0
                              ? 'À venir'
                              : `${bureau.services_count} service${bureau.services_count > 1 ? 's' : ''}`}
                          </Text>
                        </View>
                      </LinearGradient>
                    </View>
                  </TapEffect>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Floating AI Assistant Button (FAB) */}
      <TouchableOpacity
        style={[
          styles.aiFab,
          isVoiceEnabled ? { bottom: 148 } : { bottom: 84 },
        ]}
        onPress={() => router.push('/ai-assistant')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#2563eb', '#06b6d4']}
          style={styles.aiFabGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Sparkles size={24} color="#ffffff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    overflow: 'hidden',
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  userName: { fontSize: 17, fontWeight: '800', color: '#ffffff', marginBottom: 1 },
  welcomeText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#ef4444', borderRadius: 9,
    minWidth: 18, height: 18,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: '#1d4ed8',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  locationBadge: {
    flexDirection: 'row', alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, marginTop: 12,
  },
  locationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 110 },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '23%',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderColor: '#e2e8f0',
    shadowColor: '#8c9ba5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 42, height: 42,
    borderRadius: 14,
    marginBottom: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
  },
  statIconGradient: {
    width: '100%', height: '100%',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconHighlight: {
    position: 'absolute',
    top: 2, left: 4, right: 4, height: 8,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 8,
  },
  statVal: { fontSize: 18, fontWeight: '700' },
  statLbl: { fontSize: 10, fontWeight: '500', textAlign: 'center', marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginTop: 2 },
  seeAll: { color: '#2563eb', fontSize: 13, fontWeight: '600' },
  emptyBox: {
    borderRadius: 16, padding: 32, alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 20,
    borderColor: '#e2e8f0',
    shadowColor: '#8c9ba5', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1, fontSize: 14, fontWeight: '500',
    padding: 0, // Removes default padding on Android
    letterSpacing: 0,
  },
  bureauxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  bureauGridCard: {
    width: '48%',
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderColor: '#f1f5f9',
    // iOS: colored shadow. Android: elevation only (color is ignored on Android)
    ...Platform.select({
      ios: {
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
  },
  bureauCardInner: {
    width: '100%',
    borderRadius: 20,
    overflow: Platform.OS === 'ios' ? 'hidden' : 'visible',
  },
  bureauCardGradient: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  bureauCardGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.8,
  },
  icon3DContainer: {
    width: 64, height: 64,
    borderRadius: 20,
    marginBottom: 14,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  icon3DGradient: {
    width: '100%', height: '100%',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon3DHighlight: {
    position: 'absolute',
    top: 2, left: 6, right: 6, height: 12,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 10,
  },
  bureauGridNom: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 18,
  },
  badgeServices: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  demandesList: { gap: 10 },
  demandeRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  demandeRef: { fontSize: 11, fontWeight: '600' },
  demandeAct: { fontSize: 14, fontWeight: '600', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalItemName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalItemDesc: {
    fontSize: 12,
  },
  aiFab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 999,
  },
  aiFabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiFabGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
  },
});
