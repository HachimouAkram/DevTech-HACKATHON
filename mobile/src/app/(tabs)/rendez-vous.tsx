import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/apiClient';
import { getFromCache } from '../../database/localDb';
import { Calendar, Clock, MapPin, Info, CalendarOff, ChevronRight, FileText } from 'lucide-react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function CitizenRendezvousScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark';
  const insets = useSafeAreaInsets();

  const [rendezvous, setRendezvous] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('TOUS');

  const filteredRendezvous = rendezvous.filter((item) => {
    if (activeFilter === 'TOUS') return true;
    return item.statut?.toUpperCase() === activeFilter;
  });

  const fetchRendezvous = async (isInitial = false) => {
    try {
      if (isInitial) {
        // Cache-first to avoid screen flash
        const cached = await getFromCache('historique_cache', '/rendez-vous/mes-rendez-vous').catch(() => null);
        const cachedList = cached?.data || [];
        if (cachedList.length > 0) {
          setRendezvous(cachedList);
          setLoading(false);
        }
      }

      // Fetch fresh data
      const res = await apiFetch('/rendez-vous/mes-rendez-vous');
      if (res && res.status === 'success') {
        setRendezvous(res.data || []);
      }
    } catch (err) {
      console.warn('Error fetching citizen rendezvous:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRendezvous(true);
    // Polling every 15s to keep appointments updated
    const interval = setInterval(() => fetchRendezvous(false), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchRendezvous(false);
  };

  const getStatusStyle = (statut: string) => {
    const s = statut?.toUpperCase();
    switch (s) {
      case 'CONFIRME': 
        return { color: '#2563eb', bg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#dbeafe', label: 'Confirmé' };
      case 'EFFECTUE': 
        return { color: '#16a34a', bg: isDark ? 'rgba(22, 163, 74, 0.15)' : '#dcfce7', label: 'Effectué' };
      case 'ABSENT': 
      case 'ANNULE': 
        return { color: '#dc2626', bg: isDark ? 'rgba(220, 38, 38, 0.15)' : '#fee2e2', label: s === 'ABSENT' ? 'Absent' : 'Annulé' };
      case 'REPORTE': 
        return { color: '#d97706', bg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#fef3c7', label: 'Reporté' };
      default: 
        return { color: '#64748b', bg: isDark ? 'rgba(100, 116, 139, 0.15)' : '#f1f5f9', label: statut || 'En attente' };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return timeStr;
  };

  const handlePressCard = (item: any) => {
    if (item.demandeId) {
      router.push(`/demande/${item.demandeId}`);
    }
  };

  const renderRdvCard = ({ item }: { item: any }) => {
    const status = getStatusStyle(item.statut);
    
    return (
      <TouchableOpacity
        style={[
          styles.rdvCard, 
          { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }
        ]}
        onPress={() => handlePressCard(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleWrapper}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              RDV N° {item.numeroRendezVous || 'Inconnu'}
            </Text>
            {item.demandeReference && (
              <Text style={[styles.referenceText, { color: theme.textSecondary }]}>
                Réf: {item.demandeReference}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]} />

        <View style={styles.detailsContainer}>
          {item.activiteNom && (
            <View style={styles.infoRow}>
              <FileText size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.text, fontWeight: '600' }]} numberOfLines={1}>
                {item.activiteNom}
              </Text>
            </View>
          )}

          <View style={styles.datetimeRow}>
            <View style={styles.infoRow}>
              <Calendar size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {formatDate(item.date)}
              </Text>
            </View>

            <View style={[styles.infoRow, { marginLeft: 16 }]}>
              <Clock size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.text }]}>
                {formatTime(item.heure)}
              </Text>
            </View>
          </View>

          {item.centreNom && (
            <View style={styles.infoRow}>
              <MapPin size={16} color={theme.textSecondary} />
              <Text style={[styles.infoText, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.centreNom}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.footerRow}>
          <Text style={[styles.viewDetailsText, { color: '#2563eb' }]}>Voir la demande</Text>
          <ChevronRight size={16} color="#2563eb" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.backgroundElement, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }]}>
        <Text style={[styles.title, { color: theme.text }]}>Mes Rendez-vous</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Suivez vos planifications et convocations physiques</Text>
      </View>

      {/* Horizontal Status Filter Bar */}
      {rendezvous.length > 0 && (
        <View style={[styles.filterBar, { backgroundColor: theme.background, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[
              { key: 'TOUS', label: 'Tous' },
              { key: 'CONFIRME', label: 'Confirmés' },
              { key: 'EFFECTUE', label: 'Présents' },
              { key: 'ABSENT', label: 'Absents' },
              { key: 'ANNULE', label: 'Annulés' },
            ]}
            keyExtractor={item => item.key}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  activeFilter === item.key 
                    ? styles.filterTabActive 
                    : { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#cbd5e1' }
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
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : rendezvous.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }]}>
            <CalendarOff size={36} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: theme.text, fontWeight: '600', fontSize: 16 }]}>
            Aucun rendez-vous planifié
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Vos convocations ou réservations physiques apparaîtront ici.
          </Text>
        </View>
      ) : filteredRendezvous.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9' }]}>
            <CalendarOff size={36} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: theme.text, fontWeight: '600', fontSize: 16 }]}>
            Aucun rendez-vous trouvé
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
            Aucun rendez-vous avec le statut sélectionné.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRendezvous}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
          renderItem={renderRdvCard}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 110,
    gap: 16,
  },
  rdvCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleWrapper: {
    flex: 1,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    marginVertical: 12,
  },
  detailsContainer: {
    gap: 10,
  },
  datetimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(37, 99, 235, 0.08)',
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  filterBar: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8,
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
  }
});
