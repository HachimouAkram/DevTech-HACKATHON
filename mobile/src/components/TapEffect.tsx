/**
 * TapEffect — Premium press animation component
 *
 * Combines:
 *  - Spring scale squeeze (Reanimated withSpring) → buttery 60fps
 *  - Ripple wave from tap point (React Native Animated) → cross-platform
 *  - Elevation boost on Android press → tactile depth feedback
 *
 * Usage:
 *   <TapEffect onPress={handlePress} color="#2563eb">
 *     <View style={styles.card}>...</View>
 *   </TapEffect>
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  StyleProp,
  ViewStyle,
} from 'react-native';
import AnimatedReanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '../context/ThemeContext';

interface TapEffectProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  color?: string;           // Ripple / glow color
  scaleDown?: number;       // How much to scale on press (default 0.96)
  scaleUp?: number;         // Bounce-up scale after release (default 1.015)
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  disabled?: boolean;
  rippleSize?: number;      // Max ripple diameter (default 260)
  rippleOpacity?: number;   // Max ripple opacity (default 0.18)
  borderRadius?: number;
  elevation?: number;       // Android elevation on press
}

export const TapEffect: React.FC<TapEffectProps> = ({
  children,
  onPress,
  onLongPress,
  color = '#2563eb',
  scaleDown = 0.96,
  scaleUp = 1.015,
  style,
  containerStyle,
  disabled = false,
  rippleSize = 260,
  rippleOpacity = 0.18,
  borderRadius = 20,
  elevation = 6,
}) => {
  let activeTheme: 'light' | 'dark' = 'light';
  try {
    const themeContext = useAppTheme();
    activeTheme = themeContext?.activeTheme || 'light';
  } catch (e) {
    // Fallback if rendered outside ThemeProvider
  }

  // Flatten the style prop
  const flatStyle = StyleSheet.flatten(style) || {};

  // Extract layout, shadow, and background styles
  const {
    // Shadow properties
    shadowColor = activeTheme === 'dark' ? '#000000' : '#94a3b8',
    shadowOffset = { width: 0, height: 4 },
    shadowOpacity: initialShadowOpacity = activeTheme === 'dark' ? 0.25 : 0.12,
    shadowRadius = 10,
    elevation: styleElevation,

    // Background and border styles
    backgroundColor = activeTheme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius: styleBorderRadius = borderRadius,
    borderWidth,
    borderColor,

    // Margins and layout styles (apply to outer container so alignment is preserved)
    margin,
    marginHorizontal,
    marginVertical,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    width,
    height,
    flex,
    position,
    top,
    bottom,
    left,
    right,
    alignSelf,

    // Remaining styles are inner styles
    ...innerStyle
  } = flatStyle;

  const outerLayoutStyles: ViewStyle = {
    margin,
    marginHorizontal,
    marginVertical,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    width,
    height,
    flex,
    position,
    top,
    bottom,
    left,
    right,
    alignSelf,
  };

  const baseElevation = typeof styleElevation === 'number' ? styleElevation : 3;
  const pressedElevation = typeof elevation === 'number' ? elevation : baseElevation + 4;

  // ── Spring animation values (Reanimated — smooth 60fps) ───────────────────
  const scale = useSharedValue(1);
  const shadowOpacityVal = useSharedValue(initialShadowOpacity);
  const elevationVal = useSharedValue(baseElevation);

  // Animated style for the shadow-casting/scaling wrapper
  const wrapperAnimatedStyle = useAnimatedStyle(() => {
    const animatedStyles: any = {
      transform: [{ scale: scale.value }],
    };
    
    if (Platform.OS === 'android') {
      animatedStyles.elevation = elevationVal.value;
    } else if (Platform.OS === 'ios') {
      animatedStyles.shadowOpacity = shadowOpacityVal.value;
    }
    
    return animatedStyles;
  });

  // ── Ripple state ──────────────────────────────────────────────────────────
  const rippleAnim = useRef(new Animated.Value(0)).current;
  const rippleOpacityAnim = useRef(new Animated.Value(0)).current;
  const [ripplePos, setRipplePos] = useState({ x: 0, y: 0 });
  const [rippleVisible, setRippleVisible] = useState(false);

  const handlePressIn = useCallback((event: any) => {
    // Capture tap position relative to the component
    const { locationX, locationY } = event.nativeEvent;
    setRipplePos({ x: locationX, y: locationY });
    setRippleVisible(true);

    // Reset ripple
    rippleAnim.setValue(0);
    rippleOpacityAnim.setValue(rippleOpacity);

    // Animate ripple outward
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
    Animated.timing(rippleOpacityAnim, {
      toValue: 0,
      duration: 450,
      delay: 80,
      useNativeDriver: true,
    }).start(() => setRippleVisible(false));

    // Spring scale squeeze + shadow lift/deepen
    scale.value = withSpring(scaleDown, {
      damping: 18,
      stiffness: 280,
      mass: 0.8,
    });

    if (Platform.OS === 'android') {
      elevationVal.value = withSpring(pressedElevation, {
        damping: 18,
        stiffness: 280,
        mass: 0.8,
      });
    } else {
      shadowOpacityVal.value = withSpring((initialShadowOpacity as number) * 1.6, {
        damping: 18,
        stiffness: 280,
        mass: 0.8,
      });
    }
  }, [scaleDown, rippleOpacity, pressedElevation, initialShadowOpacity]);

  const handlePressOut = useCallback(() => {
    // Spring back with slight bounce
    scale.value = withSpring(1, {
      damping: 14,
      stiffness: 220,
      mass: 0.8,
    });

    if (Platform.OS === 'android') {
      elevationVal.value = withSpring(baseElevation, {
        damping: 14,
        stiffness: 220,
        mass: 0.8,
      });
    } else {
      shadowOpacityVal.value = withSpring(initialShadowOpacity as number, {
        damping: 14,
        stiffness: 220,
        mass: 0.8,
      });
    }
  }, [scaleUp, baseElevation, initialShadowOpacity]);

  // Ripple scale interpolation
  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 1],
  });

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      style={[outerLayoutStyles, containerStyle, { overflow: 'visible' }]}
      android_ripple={null} // Disable default Android ripple — we use our own
    >
      <AnimatedReanimated.View
        style={[
          {
            borderRadius: styleBorderRadius,
            backgroundColor: backgroundColor,
            // Cast shadows on iOS
            ...Platform.select({
              ios: {
                shadowColor,
                shadowOffset,
                shadowRadius,
              },
            }),
          },
          wrapperAnimatedStyle,
        ]}
      >
        <View
          style={[
            {
              borderRadius: styleBorderRadius,
              overflow: 'hidden',
              position: 'relative',
              borderWidth,
              borderColor,
            },
            innerStyle,
          ]}
        >
          {children}

          {/* Ripple overlay */}
          {rippleVisible && (
            <Animated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                { borderRadius: styleBorderRadius, overflow: 'hidden' },
              ]}
            >
              <Animated.View
                style={{
                  position: 'absolute',
                  top: ripplePos.y - rippleSize / 2,
                  left: ripplePos.x - rippleSize / 2,
                  width: rippleSize,
                  height: rippleSize,
                  borderRadius: rippleSize / 2,
                  backgroundColor: color,
                  opacity: rippleOpacityAnim,
                  transform: [{ scale: rippleScale }],
                }}
              />
            </Animated.View>
          )}
        </View>
      </AnimatedReanimated.View>
    </Pressable>
  );
};

export default TapEffect;
