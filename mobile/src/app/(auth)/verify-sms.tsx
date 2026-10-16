import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/use-theme';
import { apiFetch } from '../../services/apiClient';
import { ShieldCheck, ArrowLeft } from 'lucide-react-native';

export default function VerifySMSScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const params = useLocalSearchParams();

  const registerDataStr = params.registerData as string;
  const method = params.method as string;

  let registerData: any = {};
  try {
    if (registerDataStr) {
      registerData = JSON.parse(registerDataStr);
    }
  } catch (e) {
    //
  }

  const telephone = registerData.telephone || '';
  const email = registerData.email || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('Code non valide', 'Veuillez saisir un code à 6 chiffres.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/register', {
        method: 'POST',
        bodyData: {
          ...registerData,
          code: code,
        },
      });

      if (res.status === 'success' && res.token && res.data?.user) {
        Alert.alert('Félicitations', 'Votre compte a été vérifié et créé avec succès !', [
          {
            text: 'Accéder à l\'accueil',
            onPress: () => {
              login(res.token, res.data.user);
            },
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Vérification échouée', err.message || 'Le code saisi est incorrect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={activeTheme === 'dark' ? ['#050b18', '#07152c', '#090d16'] : ['#e0f2fe', '#ffffff']}
        style={styles.container}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: activeTheme === 'dark' ? 'rgba(37, 99, 235, 0.15)' : 'rgba(37, 99, 235, 0.1)' }]}>
            <ShieldCheck size={40} color="#2563eb" />
          </View>
          
          <Text style={[styles.title, { color: theme.text }]}>
            {method === 'email' ? 'Vérification de l\'email' : method === 'whatsapp' ? 'Vérification WhatsApp' : 'Vérification du numéro'}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Nous avons envoyé un code de vérification {method === 'email' ? 'à l\'adresse :' : method === 'whatsapp' ? 'sur WhatsApp au :' : 'au numéro :'} {'\n'}
            <Text style={{ fontWeight: '600', color: theme.text }}>
              {method === 'email' ? (email || 'votre email') : (telephone || 'votre numéro')}
            </Text>
          </Text>

          <View style={styles.form}>
            <TextInput
              style={[styles.codeInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
              placeholder="000000"
              placeholderTextColor={theme.placeholder}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
              textAlign="center"
            />

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Vérifier le code</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 50,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 100,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    marginBottom: 30,
  },
  form: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  codeInput: {
    width: '80%',
    height: 60,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 8,
  },
  hint: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  button: {
    width: '100%',
    height: 54,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
