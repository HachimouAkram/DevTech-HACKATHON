import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '../../services/apiClient';
import { getFromCache } from '../../database/localDb';
import { Bell, CheckSquare, BellOff, Info, ChevronLeft } from 'lucide-react-native';

export default function AgentNotificationsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const isDark = activeTheme === 'dark';

  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('non_lues'); // 'toutes', 'non_lues', 'lues'

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'non_lues') return !n.lu;
    if (filter === 'lues') return n.lu;
    return true;
  });

  const fetchNotifications = async (isInitial = false) => {
    try {
      // Cache-first logic
      if (isInitial) {
        const cached = await getFromCache('historique_cache', '/notifications').catch(() => null);
        const cachedList = cached?.data?.notifications || [];
        if (cachedList.length > 0) {
          setNotifications(cachedList);
          setLoading(false);
        }
      }

      // Fresh network fetch
      const res = await apiFetch('/notifications');
      if (res.status === 'success') {
        setNotifications(res.data.notifications || []);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(false), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const markAsRead = async (id: number) => {
    try {
      const res = await apiFetch(`/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (res.status === 'success') {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, lu: true } : n)
        );
      }
    } catch (err) {
      console.warn('Error marking notification read:', err);
    }
  };

  const markAllRead = async () => {
    const unreadCount = notifications.filter(n => !n.lu).length;
    if (unreadCount === 0) return;

    try {
      const res = await apiFetch('/notifications/read-all', {
        method: 'PUT',
      });
      if (res.status === 'success') {
        setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
        Alert.alert('Succès', 'Toutes les notifications ont été marquées comme lues.');
      }
    } catch (err) {
      console.warn('Error marking all notifications read:', err);
    }
  };

  const handlePressNotification = (item: any) => {
    if (item.demande_id) {
      router.push(`/(agent)/dossier/${item.demande_id}` as any);
    }
    if (!item.lu) {
      setTimeout(() => {
        markAsRead(item.id);
      }, 300);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          paddingTop: insets.top + 10, 
          backgroundColor: theme.backgroundElement, 
          borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'
        }
      ]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
          <TouchableOpacity 
            style={[styles.backBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ChevronLeft size={22} color={theme.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>Notifications</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={1}>Suivi des dossiers & assignations</Text>
          </View>
        </View>
        
        {notifications.filter(n => !n.lu).length > 0 && (
          <TouchableOpacity
            style={[styles.markAllBtn, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}
            onPress={markAllRead}
            activeOpacity={0.7}
          >
            <CheckSquare size={16} color="#2563eb" />
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: theme.background, borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0', borderBottomWidth: 1 }]}>
        <View style={{ flexDirection: 'row', paddingHorizontal: 24, gap: 10 }}>
          {[
            { key: 'toutes', label: 'Toutes' },
            { key: 'non_lues', label: 'Non lues' },
            { key: 'lues', label: 'Lues' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterTab,
                filter === tab.key 
                  ? styles.filterTabActive 
                  : { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0' }
              ]}
              onPress={() => setFilter(tab.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabLabel,
                  filter === tab.key ? styles.filterTabLabelActive : { color: theme.textSecondary }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={[styles.emptyIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0' }]}>
            <BellOff size={36} color={theme.textSecondary} />
          </View>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {filter === 'non_lues' ? 'Aucune notification non lue' : filter === 'lues' ? 'Aucune notification lue' : 'Aucune notification'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#2563eb']} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationCard, 
                { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0' },
                !item.lu && { 
                  borderLeftColor: '#2563eb', 
                  borderLeftWidth: 4, 
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.06)' : '#f6fdf9', 
                  borderColor: isDark ? 'rgba(37, 99, 235, 0.15)' : '#e2e8f0'
                }
              ]}
              onPress={() => handlePressNotification(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.titleRow}>
                  <View style={[styles.iconWrapper, { backgroundColor: item.lu ? (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0') : 'rgba(37, 99, 235, 0.1)' }]}>
                    <Info size={16} color={item.lu ? theme.textSecondary : '#2563eb'} />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.textSecondary }, !item.lu && { color: theme.text, fontWeight: '700' }]}>
                    {item.titre}
                  </Text>
                </View>
                {!item.lu && <View style={styles.unreadDot} />}
              </View>
              
              <Text style={[styles.cardContent, { color: theme.text }]}>{item.contenu}</Text>
              
              <Text style={[styles.cardTime, { color: theme.textSecondary }]}>
                {new Date(item.date_envoi).toLocaleString()}
              </Text>
            </TouchableOpacity>
          )}
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
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  filterBar: {
    paddingVertical: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  filterTabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  filterTabLabelActive: {
    color: '#ffffff',
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
    fontSize: 14,
    textAlign: 'center',
  },
  listContent: {
    padding: 20,
    paddingBottom: 110,
    gap: 12,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginLeft: 8,
  },
  cardContent: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 38,
  },
  cardTime: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 8,
  },
});
