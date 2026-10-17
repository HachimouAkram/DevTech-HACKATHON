/**
 * VoiceNavigatorButton
 *
 * Floating action button that activates voice navigation.
 * - Tap once → start recording ("Je vous écoute…")
 * - Tap again → stop recording → IA processes and speaks the reply / navigates
 * - Long-press → cancel
 *
 * States:
 *   idle        → mic icon, blue gradient
 *   recording   → animated pulse ring + waveform bars + red stop icon
 *   processing  → spinning dots
 *   speaking    → soundwave animation + purple gradient
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mic, MicOff, Loader, Volume2, X } from 'lucide-react-native';
import { useVoiceNavigator, VoiceNavigatorOptions } from '../hooks/useVoiceNavigator';

export const VOICE_NAV_STORAGE_KEY = 'seninnov_voice_navigator_enabled';

/**
 * Hook to read and toggle the voice navigator activation status.
 * Stored in AsyncStorage and synced via DeviceEventEmitter.
 */
export function useVoiceNavigatorSetting() {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(VOICE_NAV_STORAGE_KEY).then((val) => {
      setEnabled(val === 'true');
      setReady(true);
    });

    const sub = DeviceEventEmitter.addListener('VOICE_NAV_TOGGLED', (val: boolean) => {
      setEnabled(val);
    });

    return () => sub.remove();
  }, []);

  const toggle = async (val: boolean) => {
    setEnabled(val);
    await AsyncStorage.setItem(VOICE_NAV_STORAGE_KEY, String(val));
    DeviceEventEmitter.emit('VOICE_NAV_TOGGLED', val);
  };

  return { enabled, toggle, ready };
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface VoiceNavigatorButtonProps extends VoiceNavigatorOptions {
  /** Bottom offset from screen edge (default 120 so it sits above tab bar) */
  bottom?: number;
  /** Right offset from screen edge (default 20) */
  right?: number;
}

// ─────────────────────────────────────────────
// Waveform bars component (recording state)
// ─────────────────────────────────────────────
const WaveformBars = () => {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4, 0.9, 0.6];
  const anims = useRef(bars.map(() => new Animated.Value(0.4))).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.timing(anim, {
            toValue: bars[i],
            duration: 350,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.2,
            duration: 350,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.waveformContainer}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            { transform: [{ scaleY: anim }] },
          ]}
        />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────
// Spinning loader dots (processing state)
// ─────────────────────────────────────────────
const SpinnerDots = () => {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <Loader size={22} color="#fff" />
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// Sound wave (speaking state)
// ─────────────────────────────────────────────
const SoundwaveIcon = () => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.15, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Volume2 size={22} color="#fff" />
    </Animated.View>
  );
};

// ─────────────────────────────────────────────
// Pulse ring (recording state)
// ─────────────────────────────────────────────
const PulseRing = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.6,
          duration: 1000,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
};

// ─────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────
export default function VoiceNavigatorButton({
  scrollRef,
  context,
  bottom = 120,
  right = 20,
}: VoiceNavigatorButtonProps) {
  const { enabled } = useVoiceNavigatorSetting();
  const { state, startListening, stopListening, cancel, lastAction } =
    useVoiceNavigator({ scrollRef, context });

  if (!enabled) {
    return null;
  }

  const handlePress = () => {
    if (state === 'idle') {
      startListening();
    } else if (state === 'recording') {
      stopListening();
    } else if (state === 'speaking' || state === 'processing') {
      cancel();
    }
  };

  // Determine gradient colors per state
  const getBgColor = () => {
    switch (state) {
      case 'recording': return '#dc2626'; // red
      case 'processing': return '#7c3aed'; // violet
      case 'speaking': return '#0891b2'; // cyan
      default: return '#2563eb'; // blue (brand)
    }
  };

  const getStatusLabel = () => {
    switch (state) {
      case 'recording': return "J'écoute… (appuyer pour arrêter)";
      case 'processing': return 'Traitement…';
      case 'speaking': return 'Je parle… (appuyer pour arrêter)';
      default: return 'Navigation vocale';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'recording': return <WaveformBars />;
      case 'processing': return <SpinnerDots />;
      case 'speaking': return <SoundwaveIcon />;
      default: return <Mic size={22} color="#fff" />;
    }
  };

  const isActive = state !== 'idle';

  return (
    <View
      style={[styles.container, { bottom, right }]}
      pointerEvents="box-none"
    >
      {/* Status label (shown when active) */}
      {isActive && (
        <View style={styles.labelContainer}>
          <Text style={styles.labelText} numberOfLines={2}>
            {getStatusLabel()}
          </Text>
        </View>
      )}

      {/* Pulse ring (recording only) */}
      {state === 'recording' && <PulseRing />}

      {/* Main FAB */}
      <Pressable
        onPress={handlePress}
        onLongPress={cancel}
        delayLongPress={600}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: getBgColor() },
          pressed && styles.fabPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={getStatusLabel()}
      >
        {getIcon()}
      </Pressable>

      {/* Cancel X (active states only) */}
      {isActive && (
        <Pressable onPress={cancel} style={styles.cancelBtn} accessibilityLabel="Annuler">
          <X size={12} color="#fff" />
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const FAB_SIZE = 56;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 9999,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  pulseRing: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 2,
    borderColor: '#dc2626',
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelContainer: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    maxWidth: 200,
  },
  labelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 24,
  },
  waveBar: {
    width: 3,
    height: 20,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});
