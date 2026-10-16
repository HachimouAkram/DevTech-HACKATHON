import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity, Platform } from 'react-native';
import { MapPin, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../hooks/use-theme';
import { useAppTheme } from '../context/ThemeContext';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  title?: string;
}

export default function MapComponent({ latitude, longitude, title }: MapComponentProps) {
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark';

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
      <MapPin size={32} color="#2563eb" style={styles.icon} />
      <Text style={[styles.title, { color: theme.text }]}>
        {title || 'Localisation du Centre'}
      </Text>
      <Text style={[styles.coords, { color: theme.textSecondary }]}>
        Lat: {latitude.toFixed(6)}, Lon: {longitude.toFixed(6)}
      </Text>
      
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#2563eb' }]} 
        onPress={openInGoogleMaps}
      >
        <Text style={styles.buttonText}>Ouvrir dans Google Maps</Text>
        <ExternalLink size={14} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
  },
  icon: {
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  coords: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});
