import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { AlertTriangle, LogOut } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';

export default function AccessDenied() {
  const router = useRouter();
  const { logout } = useAuth();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark';

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f3f4f6' }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <AlertTriangle color="#ef4444" size={64} />
        </View>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#111827' }]}>Accès Refusé</Text>
        <Text style={[styles.message, { color: isDark ? '#9ca3af' : '#4b5563' }]}>
          Votre profil ne vous permet pas d'accéder à l'application mobile. Veuillez utiliser le Dashboard Web pour consulter vos statistiques et gérer vos paramètres.
        </Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#fff" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.logoutButtonText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    maxWidth: 400,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
