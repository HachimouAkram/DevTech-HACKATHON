import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../hooks/use-theme';

interface FloatingInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  icon: React.ReactNode;
  secureTextEntry?: boolean;
  rightElement?: React.ReactNode;
  leftPrefix?: React.ReactNode; // e.g. "+221" text for phone
  keyboardType?: any;
  autoCapitalize?: any;
}

export function FloatingInput({
  label,
  value,
  onChangeText,
  icon,
  secureTextEntry = false,
  rightElement,
  leftPrefix,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: FloatingInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const animValue = useRef(new Animated.Value(value ? 1 : 0)).current;
  const theme = useTheme();

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(animValue, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (!value) {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    }
  };

  const labelTop = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [17, -9],
  });

  const labelFontSize = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 12],
  });

  const labelColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.placeholder, isFocused ? theme.primary : theme.textSecondary],
  });

  // When label is in placeholder position (not focused, no value), background must be
  // transparent so the ugly colored box doesn't appear. When floated to the top border,
  // we need the inputBg color to mask the border line underneath.
  const isFloated = isFocused || !!value;

  const borderColor = isFocused ? theme.primary : theme.border;
  const borderWidth = isFocused ? 1.5 : 1;

  // Label left offset depends on whether there is a leftPrefix
  const labelLeft = leftPrefix ? 88 : 48;

  return (
    <View style={[styles.wrapper, { borderColor, borderWidth, backgroundColor: theme.inputBg }]}>
      {/* Floating label — transparent bg when in placeholder position, inputBg when floated */}
      <Animated.Text
        style={[
          styles.label,
          {
            top: labelTop,
            fontSize: labelFontSize,
            color: labelColor,
            left: labelLeft,
            backgroundColor: isFloated ? theme.inputBg : 'transparent',
          },
        ]}
        pointerEvents="none"
      >
        {label}
      </Animated.Text>

      {/* Icon on the left */}
      <View style={styles.iconBox}>{icon}</View>

      {/* Optional left prefix (e.g. "+221") */}
      {leftPrefix && (
        <View style={styles.prefixBox}>{leftPrefix}</View>
      )}

      {/* Input */}
      <TextInput
        style={[styles.input, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholder=""
      />

      {/* Right element (eye toggle, etc.) */}
      {rightElement && <View style={styles.rightBox}>{rightElement}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    height: 58,
    paddingHorizontal: 16,
    position: 'relative',
    marginTop: 8,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 4,
    fontWeight: '500',
    zIndex: 10,
  },
  iconBox: {
    marginRight: 12,
  },
  prefixBox: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
  },
  rightBox: {
    padding: 4,
  },
});
