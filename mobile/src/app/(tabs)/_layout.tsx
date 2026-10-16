import React, { useState, useEffect, useRef } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Platform, View, Text, DeviceEventEmitter, Pressable, StyleSheet } from 'react-native';
import { Home, ClipboardList, Calendar, User, WifiOff, Wifi } from 'lucide-react-native';
import { useTheme } from '../../hooks/use-theme';
import { useNetInfo } from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import VoiceNavigatorButton from '../../components/VoiceNavigatorButton';

// Custom springy scaling button for the bottom tabs
const TabBarButton = (props: any) => {
  const { accessibilityState, children, onPress } = props;
  const selected = accessibilityState?.selected;

  const scale = useSharedValue(1);

  // When selected state changes, apply a subtle scale bounce animation
  useEffect(() => {
    if (selected) {
      scale.value = withSpring(1.08, { damping: 10, stiffness: 100 }, () => {
        scale.value = withSpring(1, { damping: 10, stiffness: 100 });
      });
    }
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9, { damping: 12, stiffness: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(selected ? 1.05 : 1, { damping: 12, stiffness: 150 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
    >
      <Animated.View style={[animatedStyle, { alignItems: 'center', justifyContent: 'center', width: '100%' }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function TabLayout() {
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const netInfo = useNetInfo();
  const isOffline = netInfo.type !== 'unknown' && netInfo.isConnected === false;
  const insets = useSafeAreaInsets();

  const [bannerState, setBannerState] = useState<'none' | 'offline' | 'syncing' | 'synced' | 'uptodate' | 'error'>('none');
  const [bannerText, setBannerText] = useState('');

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOfflineRef = useRef(isOffline);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  // Handle offline banner state
  useEffect(() => {
    if (isOffline) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setBannerState('offline');
      setBannerText('Mode Hors-Ligne - Synchro en attente');
    } else if (bannerState === 'offline' && !isOffline) {
      // Transition from offline to online, start syncing
      setBannerState('syncing');
      setBannerText('Connexion rétablie - Synchronisation...');
    }
  }, [isOffline]);

  // Route protection
  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated || !user) {
        router.replace('/(auth)/welcome');
        return;
      }

      const permissions = user.permissions || [];
      const isBlockedAdmin = permissions.includes('GERER_GLOBAL') || permissions.includes('GERER_REGION') || permissions.includes('GERER_DEPARTEMENT') || permissions.includes('GERER_COMMUNE');
      const isAgent = permissions.includes('GERER_ACTIVITES') || permissions.includes('GERER_SERVICES') || permissions.includes('GERER_BUREAU') || permissions.includes('GERER_CENTRE');

      if (isBlockedAdmin) {
        router.replace('/(auth)/denied');
      } else if (isAgent) {
        router.replace('/(agent)');
      }
    }
  }, [isAuthenticated, user, loading]);

  if (loading || (user && user.role && user.role.toLowerCase() !== 'citoyen' && user.role.toLowerCase() !== 'user')) {
    return null;
  }

  // Listen for sync events from SyncEngine
  useEffect(() => {
    const startSub = DeviceEventEmitter.addListener('sync_started', () => {
      if (!isOfflineRef.current) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setBannerState('syncing');
        setBannerText('Synchronisation en cours...');
      }
    });

    const successSub = DeviceEventEmitter.addListener('sync_success', (data) => {
      if (!isOfflineRef.current) {
        setBannerState('synced');
        setBannerText('Données synchronisées ! ✓');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setBannerState('none');
        }, 2500);
      }
    });

    const noneSub = DeviceEventEmitter.addListener('sync_none', () => {
      if (!isOfflineRef.current) {
        setBannerState('uptodate');
        setBannerText('Données à jour ✓');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setBannerState('none');
        }, 1500);
      }
    });

    const errorSub = DeviceEventEmitter.addListener('sync_error', (data) => {
      if (!isOfflineRef.current) {
        setBannerState('error');
        setBannerText(data?.message ? `Échec Sync : ${data.message}` : 'Erreur de synchronisation');
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setBannerState('none');
        }, 6000); // 6 seconds to read the clear error message
      }
    });

    return () => {
      startSub.remove();
      successSub.remove();
      noneSub.remove();
      errorSub.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const getBannerConfig = () => {
    switch (bannerState) {
      case 'offline':
        return { color: '#ef4444', icon: <WifiOff color="#ffffff" size={16} style={{ marginRight: 8 }} /> };
      case 'syncing':
        return { color: '#0284c7', icon: <Wifi color="#ffffff" size={16} style={{ marginRight: 8 }} /> };
      case 'synced':
      case 'uptodate':
        return { color: '#2563eb', icon: <Wifi color="#ffffff" size={16} style={{ marginRight: 8 }} /> };
      case 'error':
        return { color: '#f97316', icon: <WifiOff color="#ffffff" size={16} style={{ marginRight: 8 }} /> };
      default:
        return null;
    }
  };

  const bannerConfig = getBannerConfig();

  const isDark = activeTheme === 'dark';

  return (
    <View style={{ flex: 1 }}>
      {bannerConfig && (
        <View style={{ 
          backgroundColor: bannerConfig.color, 
          paddingTop: insets.top + 8, 
          paddingBottom: 8,
          paddingHorizontal: 16, 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000
        }}>
          {bannerConfig.icon}
          <Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '600' }}>{bannerText}</Text>
        </View>
      )}
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarButton: (props) => <TabBarButton {...props} />,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            elevation: 0,
            backgroundColor: isDark ? 'rgba(9, 13, 22, 0.75)' : 'rgba(255, 255, 255, 0.72)',
            borderTopWidth: 1,
            borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
            height: Platform.OS === 'ios' ? 88 : 64,
            paddingBottom: Platform.OS === 'ios' ? 30 : 10,
            paddingTop: 10,
          },
          tabBarBackground: () => (
            <BlurView tint={isDark ? 'dark' : 'light'} intensity={85} style={StyleSheet.absoluteFill} />
          ),
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Accueil',
            tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'Mes demandes',
            tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="rendez-vous"
          options={{
            title: 'Rendez-vous',
            tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Paramètres',
            tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
          }}
        />
      </Tabs>

      {/* ── Floating voice navigator button ── */}
      <VoiceNavigatorButton
        bottom={Platform.OS === 'ios' ? 100 : 76}
        right={20}
        context={{ page: 'citoyen' }}
      />
    </View>
  );
}

