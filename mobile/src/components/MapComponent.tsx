import React from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Marker as MapMarker } from 'react-native-maps';

interface MapComponentProps {
  latitude: number;
  longitude: number;
  title?: string;
}

export default function MapComponent({ latitude, longitude, title }: MapComponentProps) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }}
      region={{
        latitude: latitude,
        longitude: longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }}
    >
      <MapMarker
        coordinate={{ latitude: latitude, longitude: longitude }}
        title={title}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
});
