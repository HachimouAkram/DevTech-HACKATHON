import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, ActivityIndicator, TouchableOpacity, Platform, StatusBar, Image, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FileText, CheckCircle, Clock, AlertTriangle, Bell, Sun, Moon, Star, XCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiFetch, getApiUrl } from '../../services/apiClient';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const cardWidth = (width - 24 * 2 - 16) / 2;

export default function AgentDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const theme = useTheme();
  const { activeTheme, setThemePreference } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [stats, setStats] = useState({
    totalAssigned: 0,
    traitesCeMois: 0,
    enAttente: 0,
    horsDelai: 0,
    rejetsParMoi: 0,
    satisfactionRate: 'N/A',
    satisfactionPercent: 100,
    enCours: 0,
    valides: 0,
    rejetes: 0
  });
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
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

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return 'A';
    return name.trim().split(/\s+/).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatName = (name: string | null | undefined) => {
    if (!name) return 'Agent';
    const firstWord = name.trim().split(/\s+/)[0];
    return firstWord.charAt(0).toUpperCase() + firstWord.slice(1);
  };

  const formatRole = (role: string | null | undefined) => {
    if (!role) return 'Agent d\'administration';
    const cleaned = role.replace('ROLE_', '').toLowerCase();
    if (cleaned === 'officier') return 'Officier d\'état civil';
    if (cleaned === 'agent') return 'Agent d\'administration';
    if (cleaned === 'admin') return 'Administrateur système';
    return `Agent - ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`;
  };

  const getActivitySubtitle = () => {
    if (user?.bureau_nom) {
      const bureau = user.bureau_nom.trim();
      const lower = bureau.toLowerCase();
      
      if (lower.includes('civil') || lower.includes('état')) {
        return "Vous êtes connecté en tant qu'agent de l'État Civil";
      }
      if (lower.includes('urbanisme')) {
        return "Vous êtes connecté en tant qu'agent de l'Urbanisme";
      }
      if (lower.includes('social')) {
        return "Vous êtes connecté en tant qu'agent des Affaires Sociales";
      }
      if (lower.includes('finance')) {
        return "Vous êtes connecté en tant qu'agent des Finances";
      }
      if (lower.includes('nettoyage')) {
        return "Vous êtes connecté en tant qu'agent du Service Nettoyage";
      }
      
      // Generic vowel check
      const firstChar = lower.charAt(0);
      const isVowel = ['a', 'e', 'i', 'o', 'u', 'y', 'é', 'è', 'à'].includes(firstChar);
      
      if (isVowel) {
        return `Vous êtes connecté en tant qu'agent de l'${bureau}`;
      }
      return `Vous êtes connecté en tant qu'agent du bureau ${bureau}`;
    }
    
    if (user?.activities && user.activities.length > 0) {
      const names = user.activities.map((a: any) => {
        const nom = a.nom.trim();
        return nom.charAt(0).toUpperCase() + nom.slice(1);
      }).join(', ');
      return `Vous êtes connecté en tant qu'agent : ${names}`;
    }

    return "Vous êtes connecté en tant qu'agent d'administration";
  };

  const fetchStats = async () => {
    try {
      const [res, notifsRes] = await Promise.all([
        apiFetch('/demandes').catch(() => null),
        apiFetch('/notifications').catch(() => null),
      ]);

      if (notifsRes?.status === 'success' && notifsRes.data?.notifications) {
        setUnreadCount(notifsRes.data.notifications.filter((n: any) => !n.lu).length);
      }

      if (res?.status === 'success' && res.data?.demandes) {
        const demandes = res.data.demandes;

        const assignedActivityIds = user?.activities?.map((a: any) => a.id) || [];
        const assignedActivityNames = user?.activities?.map((a: any) => a.nom.toLowerCase()) || [];

        const isAssigned = (d: any) => {
          if (!user?.activities || user.activities.length === 0) return true; // default fallback
          
          const actId = d.activite_id || d.activite?.id;
          if (actId && assignedActivityIds.includes(actId)) return true;
          
          const actNom = (d.activite_nom || d.activite?.nom || '').toLowerCase();
          if (actNom) {
            return assignedActivityNames.some((name: string) => 
              actNom.includes(name) || name.includes(actNom)
            );
          }
          return false;
        };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const isThisMonth = (dateStr: string | null | undefined) => {
          if (!dateStr) return false;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        };

        let totalAssigned = 0;
        let traitesCeMois = 0;
        let enAttente = 0;
        let horsDelai = 0;
        let rejetsParMoi = 0;
        let totalScore = 0;
        let ratedCount = 0;

        let enCoursChart = 0;
        let validesChart = 0;
        let rejetesChart = 0;

        demandes.forEach((d: any) => {
          if (isAssigned(d)) {
            totalAssigned++;

            const isProcessedByMe = 
              (d.agent_id != null && user?.id != null && String(d.agent_id) === String(user?.id)) ||
              (d.officier_id != null && user?.id != null && String(d.officier_id) === String(user?.id));

            const dateToCheck = d.date_validation || d.date_soumission;
            if (isProcessedByMe && ['valide', 'pret', 'disponible', 'rejete', 'en_attente_validation', 'signature'].includes(d.statut) && isThisMonth(dateToCheck)) {
              traitesCeMois++;
            }

            const isPending = ['en_attente', 'en_cours', 'verification_dossier', 'en_traitement', 'recours'].includes(d.statut);
            const isMineOrUnassigned = 
              (!d.agent_id && !d.officier_id) || 
              (user?.id != null && (String(d.agent_id) === String(user?.id) || String(d.officier_id) === String(user?.id)));
              
            if (isPending && isMineOrUnassigned) {
              enAttente++;
            }

            if (d.statut === 'hors_delais') {
              horsDelai++;
            }

            if (d.statut === 'rejete' && isProcessedByMe) {
              rejetsParMoi++;
            }

            const score = d.evaluationScore !== undefined ? d.evaluationScore : d.evaluation_score;
            if (isProcessedByMe && score !== undefined && score !== null) {
              totalScore += score;
              ratedCount++;
            }

            // Chart stats (for agent folders only)
            if (isProcessedByMe) {
              if (['en_cours', 'verification_dossier', 'en_traitement', 'recours', 'en_attente_validation', 'signature'].includes(d.statut)) {
                enCoursChart++;
              } else if (['valide', 'pret', 'disponible'].includes(d.statut)) {
                validesChart++;
              } else if (d.statut === 'rejete') {
                rejetesChart++;
              }
            }
          }
        });

        const satisfactionRate = ratedCount > 0 ? (totalScore / ratedCount).toFixed(1) : "N/A";
        const satisfactionPercent = ratedCount > 0 ? Math.round((totalScore / (ratedCount * 5)) * 100) : 100;

        setStats({
          totalAssigned,
          traitesCeMois,
          enAttente,
          horsDelai,
          rejetsParMoi,
          satisfactionRate,
          satisfactionPercent,
          enCours: enCoursChart,
          valides: validesChart,
          rejetes: rejetesChart
        });
      }
    } catch (e) {
      console.error('Error fetching agent stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  useEffect(() => {
    const sseDemandesSub = DeviceEventEmitter.addListener('refresh_demandes', () => {
      console.log('[AgentDashboard] SSE event refresh_demandes received, refreshing stats...');
      fetchStats();
    });

    const sseNotificationsSub = DeviceEventEmitter.addListener('refresh_notifications', () => {
      console.log('[AgentDashboard] SSE event refresh_notifications received, refreshing stats...');
      fetchStats();
    });

    const sseProfileSub = DeviceEventEmitter.addListener('refresh_user_profile', (updatedUserId) => {
      if (!updatedUserId || (user?.id && String(updatedUserId) === String(user.id))) {
        console.log('[AgentDashboard] SSE event refresh_user_profile received, refreshing stats...');
        fetchStats();
      }
    });

    return () => {
      sseDemandesSub.remove();
      sseNotificationsSub.remove();
      sseProfileSub.remove();
    };
  }, [user]);

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
        console.warn('Error loading profile image in AgentDashboard:', err);
      }
    };
    loadProfileImage();

    const profileImageSub = DeviceEventEmitter.addListener('profile_image_updated', (uri: string | null) => {
      setProfileImage(uri);
    });

    return () => {
      profileImageSub.remove();
    };
  }, [user?.id]);

  const headerContent = (
    <View style={styles.headerRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <View style={styles.avatarCircle}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%', borderRadius: 23 }} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(user?.nom_complet || '')}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName} numberOfLines={1}>
            Bonjour, {user?.nom_complet ? formatName(user.nom_complet) : 'Agent'}
          </Text>
          <Text style={styles.welcomeText} numberOfLines={1}>
            {user?.role ? formatRole(user.role) : 'Agent d\'administration'}
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
          onPress={() => router.push('/(agent)/notifications')}
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
            key="header-agent-android-light-grad"
            colors={['#2563eb', '#1d4ed8']}
            style={[
              styles.gradientHeader,
              {
                paddingTop: (StatusBar.currentHeight || 24) + 16,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
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
            key="header-agent-android-dark-grad"
            colors={['rgba(37, 99, 235, 0.25)', 'rgba(4, 120, 87, 0.08)']}
            style={[
              styles.gradientHeader,
              {
                paddingTop: (StatusBar.currentHeight || 24) + 16,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
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
        <View style={[styles.headerContainer, activeTheme === 'dark' && { borderBottomWidth: 1, borderBottomColor: 'rgba(37, 99, 235, 0.15)' }]}>
          {activeTheme === 'dark' && (
            <BlurView tint="dark" intensity={45} style={StyleSheet.absoluteFill} />
          )}
          <LinearGradient
            key={`header-agent-gradient-${activeTheme}`}
            colors={activeTheme === 'dark' ? ['rgba(37, 99, 235, 0.25)', 'rgba(29, 78, 216, 0.08)'] : ['#2563eb', '#1d4ed8']}
            style={[styles.gradientHeader, { paddingTop: insets.top + 18 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {headerContent}
          </LinearGradient>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Tableau de Bord</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {getActivitySubtitle()}
          </Text>
        </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.gridContainer}>
            {/* Card 1: Total */}
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>TOTAL DEMANDES</Text>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                  <FileText color="#3b82f6" size={20} />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{stats.totalAssigned}</Text>
              <Text style={styles.cardSubtitle}>Statistiques temps réel</Text>
              <View style={[styles.borderBottom, { borderBottomColor: '#3b82f6' }]} />
            </View>

            {/* Card 2: Traités ce mois */}
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>TRAITÉS PAR MOI</Text>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                  <CheckCircle color="#2563eb" size={20} />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{stats.traitesCeMois}</Text>
              <Text style={styles.cardSubtitle}>Statistiques temps réel</Text>
              <View style={[styles.borderBottom, { borderBottomColor: '#2563eb' }]} />
            </View>

            {/* Card 3: Reste à traiter */}
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>RESTE À TRAITER</Text>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Clock color="#f59e0b" size={20} />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{stats.enAttente}</Text>
              <Text style={styles.cardSubtitle}>Statistiques temps réel</Text>
              <View style={[styles.borderBottom, { borderBottomColor: '#f59e0b' }]} />
            </View>

            {/* Card 4: Hors délai */}
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>HORS DÉLAI</Text>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <AlertTriangle color="#ef4444" size={20} />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{stats.horsDelai}</Text>
              <Text style={styles.cardSubtitle}>Statistiques temps réel</Text>
              <View style={[styles.borderBottom, { borderBottomColor: '#ef4444' }]} />
            </View>

            {/* Card 5: Taux de satisfaction */}
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>SATISFACTION</Text>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                  <Star color="#f59e0b" size={20} fill="#f59e0b" />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{stats.satisfactionPercent}%</Text>
              <Text style={styles.cardSubtitle}>Moyenne : {stats.satisfactionRate}/5</Text>
              <View style={[styles.borderBottom, { borderBottomColor: '#f59e0b' }]} />
            </View>

            {/* Card 6: Rejets par moi */}
            <View style={[styles.statCard, { backgroundColor: theme.card }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>MES REJETS</Text>
                <View style={[styles.iconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <XCircle color="#ef4444" size={20} />
                </View>
              </View>
              <Text style={[styles.cardValue, { color: theme.text }]}>{stats.rejetsParMoi}</Text>
              <Text style={styles.cardSubtitle}>Statistiques temps réel</Text>
              <View style={[styles.borderBottom, { borderBottomColor: '#ef4444' }]} />
            </View>
          </View>

          <View style={[styles.chartCard, { backgroundColor: theme.card }]}>
            <Text style={[styles.chartTitle, { color: theme.text }]}>Statut de Mes Dossiers Affectés</Text>
            <Text style={[styles.chartSubtitle, { color: theme.textSecondary }]}>État actuel des dossiers d'actes qui vous sont affectés</Text>
            <View style={styles.chartPlaceholder}>
              <View style={styles.donutPlaceholder}>
                <Text style={[styles.donutText, { color: theme.text }]}>{stats.valides + stats.rejetes}</Text>
                <Text style={styles.donutLabel}>TRAITÉS</Text>
              </View>
            </View>
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>En cours ({stats.enCours})</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Rejetés ({stats.rejetes})</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2563eb' }]} /><Text style={[styles.legendText, { color: theme.textSecondary }]}>Validés ({stats.valides})</Text></View>
            </View>
          </View>

          {/* Activités assignées */}
          <View style={styles.activitiesContainer}>
            <Text style={[styles.activitiesTitle, { color: theme.text }]}>Mes Activités Assignées</Text>
            <Text style={[styles.activitiesSubtitle, { color: theme.textSecondary }]}>Actes que vous êtes habilité(e) à traiter</Text>
            
            {user?.activities && user.activities.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activitiesScroll}>
                {user.activities.map((act: any) => (
                  <View key={act.id} style={[styles.activityCard, { backgroundColor: theme.card }]}>
                    <View style={[styles.activityIconContainer, { backgroundColor: 'rgba(37, 99, 235, 0.1)' }]}>
                      <FileText color="#2563eb" size={24} />
                    </View>
                    <Text style={[styles.activityName, { color: theme.text }]} numberOfLines={2}>{act.nom}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.emptyActivities, { backgroundColor: theme.card }]}>
                <Text style={[styles.emptyActivitiesText, { color: theme.textSecondary }]}>Aucune activité assignée pour le moment.</Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    zIndex: 10,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  gradientHeader: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  welcomeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1d4ed8',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
    marginTop: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    letterSpacing: 0.3,
    fontWeight: '600',
    lineHeight: 18,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    gap: 16,
  },
  statCard: {
    width: cardWidth,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    width: '60%',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 10,
    color: '#9ca3af',
  },
  borderBottom: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    borderBottomWidth: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  chartCard: {
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    marginBottom: 20,
  },
  chartPlaceholder: {
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 15,
    borderColor: '#2563eb',
    borderRightColor: '#3b82f6',
    borderBottomColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutText: {
    fontSize: 24,
    fontWeight: '800',
  },
  donutLabel: {
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activitiesContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  activitiesTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  activitiesSubtitle: {
    fontSize: 13,
    marginBottom: 16,
  },
  activitiesScroll: {
    paddingRight: 24,
    gap: 16,
  },
  activityCard: {
    width: 140,
    height: 140,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginRight: 16,
  },
  activityIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyActivities: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActivitiesText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
