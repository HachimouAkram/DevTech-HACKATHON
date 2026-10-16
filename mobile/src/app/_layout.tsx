import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState, usePathname } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useAppTheme } from '../context/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initLocalDb } from '../database/localDb';
import { startSyncEngine, syncOfflineDemandes } from '../services/SyncEngine';
import { initApiUrl } from '../services/apiClient';
import * as SplashScreen from 'expo-splash-screen';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';
import { View, Text, Image, StyleSheet, useColorScheme as useDeviceColorScheme, DeviceEventEmitter } from 'react-native';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationWrapper() {
  const { isAuthenticated, loading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const pathname = usePathname();
  const { activeTheme } = useAppTheme();

  useEffect(() => {
    if (loading || !rootNavigationState?.key) return;

    const inAuthGroup = segments[0] === '(auth)' || pathname.startsWith('/(auth)') || pathname.includes('welcome') || pathname.includes('login') || pathname.includes('register') || pathname.includes('denied');
    const isRoot = pathname === '/' || pathname === '/index';
    
    const isAgent = (u: any) => {
      if (!u) return false;
      const permissions = u.permissions || [];
      return permissions.includes('GERER_ACTIVITES') || permissions.includes('GERER_SERVICES') || permissions.includes('GERER_BUREAU') || permissions.includes('GERER_CENTRE');
    };

    const isBlockedAdmin = (u: any) => {
      if (!u) return false;
      const permissions = u.permissions || [];
      return permissions.includes('GERER_GLOBAL') || permissions.includes('GERER_REGION') || permissions.includes('GERER_DEPARTEMENT') || permissions.includes('GERER_COMMUNE');
    };

    const timer = setTimeout(() => {
      if (!isAuthenticated && !inAuthGroup) {
        // Redirect to welcome onboarding screen if not logged in
        router.replace('/(auth)/welcome');
      } else if (isAuthenticated && isRoot) {
        // Only redirect from true root `/`
        if (isBlockedAdmin(user)) {
          router.replace('/(auth)/denied');
        } else if (isAgent(user)) {
          router.replace('/(agent)');
        } else {
          router.replace('/(tabs)');
        }
      } else if (isAuthenticated && inAuthGroup) {
        // Redirect away from auth screens if already logged in
        if (isBlockedAdmin(user)) {
          router.replace('/(auth)/denied');
        } else if (isAgent(user)) {
          router.replace('/(agent)');
        } else {
          router.replace('/(tabs)');
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [isAuthenticated, loading, rootNavigationState?.key, segments, pathname]); // Added segments and pathname to resolve initial route race conditions

  useEffect(() => {
    if (isAuthenticated) {
      console.log('NavigationWrapper: User is authenticated, triggering offline sync check...');
      syncOfflineDemandes();
    }
  }, [isAuthenticated]);

  // Global Real-time stream (SSE) for automatic syncing across all citizen/agent dashboards & screens
  useEffect(() => {
    let activeXhr: XMLHttpRequest | null = null;
    let isConnected = true;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connectRealtime = () => {
      if (!isAuthenticated || !isConnected) return;

      const { getApiUrl } = require('../services/apiClient');
      const baseUrl = getApiUrl();
      const url = baseUrl.endsWith('/api')
        ? baseUrl + '/realtime/stream'
        : baseUrl + '/api/realtime/stream';

      console.log('[Global Real-time] Connecting to SSE stream:', url);

      if (activeXhr) {
        try { activeXhr.abort(); } catch (e) {}
      }

      const xhr = new XMLHttpRequest();
      activeXhr = xhr;
      xhr.open('GET', url, true);
      xhr.setRequestHeader('Accept', 'text/event-stream');

      let lastIndex = 0;

      xhr.onreadystatechange = () => {
        if (!isConnected) return;

        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const text = xhr.responseText || '';
          
          if (text.length > 100 * 1024) {
            console.log('[Global Real-time] Buffer limit exceeded (100KB). Aborting stream to free memory...');
            xhr.abort();
            return;
          }

          const newText = text.substring(lastIndex);
          lastIndex = text.length;

          const lines = newText.split('\n');
          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.replace('event:', '').trim();
            } else if (line.startsWith('data:') && currentEvent) {
              const eventData = line.replace('data:', '').trim();
              console.log('[Global Real-time] SSE event received:', currentEvent, eventData);
              
              DeviceEventEmitter.emit(currentEvent, eventData);
              currentEvent = '';
            }
          }
        }

        if (xhr.readyState === 4) {
          console.log('[Global Real-time] Connection closed, reconnecting in 5 seconds...');
          reconnectTimeout = setTimeout(connectRealtime, 5000);
        }
      };

      xhr.onerror = () => {
        if (!isConnected) return;
        console.log('[Global Real-time] Connection error, reconnecting in 8 seconds...');
        reconnectTimeout = setTimeout(connectRealtime, 8000);
      };

      xhr.send();
    };

    if (isAuthenticated) {
      connectRealtime();
    }

    return () => {
      isConnected = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (activeXhr) {
        try { activeXhr.abort(); } catch (e) {}
      }
      console.log('[Global Real-time] Cleaned up SSE connection.');
    };
  }, [isAuthenticated]);

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(agent)" options={{ headerShown: false }} />
        <Stack.Screen name="demande/new" options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="demande/[id]" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const isMounted = useRef(true);
  const deviceColorScheme = useDeviceColorScheme();
  const isDark = deviceColorScheme === 'dark';
  const splashBgColor = isDark ? '#090d16' : '#ffffff';

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const safeHideSplash = () => {
    if (isMounted.current) {
      setSplashVisible(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    initApiUrl()
      .then(() => initLocalDb())
      .then(() => {
        console.log('Local DB and API URL initialized for Offline Mode');
        startSyncEngine();
      })
      .catch(e => console.error('Error initializing app:', e))
      .finally(() => {
        if (isMounted.current) {
          setAppIsReady(true);
        }
      });

    return () => {
      isMounted.current = false;
    };
  }, []);

  const animatedSplashStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    if (appIsReady) {
      // Hide the native splash screen immediately
      SplashScreen.hideAsync().catch(() => {});

      // Animate the custom splash screen fade out and scale out
      opacity.value = withTiming(0, { duration: 450 });
      scale.value = withTiming(1.05, { duration: 450 }, (finished) => {
        if (finished) {
          runOnJS(safeHideSplash)();
        }
      });
    }
  }, [appIsReady]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <ErrorBoundary>
              <NavigationWrapper />
            </ErrorBoundary>
            
            {splashVisible && (
              <Animated.View style={[StyleSheet.absoluteFill, styles.splashContainer, { backgroundColor: splashBgColor }, animatedSplashStyle]}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.splashImage}
                  resizeMode="contain"
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16 }}>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 }}>Teranga</Text>
                  <Text style={{ fontSize: 28, fontWeight: '800', color: '#2563eb', letterSpacing: -0.5 }}>Civil</Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 2, marginTop: 4, textTransform: 'uppercase' }}>
                  République du Sénégal
                </Text>
              </Animated.View>
            )}
          </View>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
  },
  splashImage: {
    width: 200,
    height: 200,
  },
});

