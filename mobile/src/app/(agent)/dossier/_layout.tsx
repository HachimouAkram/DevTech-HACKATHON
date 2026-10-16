import React from 'react';
import { Stack } from 'expo-router';

export default function DemandeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
