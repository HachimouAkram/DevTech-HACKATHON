import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Switch, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/use-theme';
import { apiFetch, setCustomApiUrl, getApiUrl } from '../../services/apiClient';
import { LogIn, Lock, Settings, X, Globe, Eye, EyeOff } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { FloatingInput } from '../../components/FloatingInput';

// ─── Main Login Screen ────────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { login, attemptOfflineLogin } = useAuth();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // API URL Configuration
  const [showSettings, setShowSettings] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState(getApiUrl());

  // ── Entry animations (fast, parallel) ────────────────────────────────────
  const screenAnim = useRef(new Animated.Value(0)).current;
  const screenSlide = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Everything comes in together, fast and crisp
    Animated.parallel([
      Animated.timing(screenAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(screenSlide, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Champs manquants', 'Veuillez saisir votre identifiant (téléphone ou e-mail) et votre mot de passe.');
      return;
    }

    setLoading(true);
    try {
      let formattedIdentifier = identifier.trim().replace(/\s+/g, '');
      if (!formattedIdentifier.includes('@') && /^\+?\d+$/.test(formattedIdentifier)) {
        if (!formattedIdentifier.startsWith('+221') && !formattedIdentifier.startsWith('221')) {
          formattedIdentifier = '+221' + formattedIdentifier;
        } else if (formattedIdentifier.startsWith('221')) {
          formattedIdentifier = '+' + formattedIdentifier;
        }
      }

      const netState = await NetInfo.fetch();
      const isOffline = netState.type !== 'unknown' && netState.isConnected === false;

      if (isOffline) {
        const success = await attemptOfflineLogin(formattedIdentifier, password);
        if (success) {
          return;
        } else {
          Alert.alert(
            'Erreur de connexion',
            'Connexion impossible hors-ligne. Une première connexion en ligne est requise sur cet appareil, ou les identifiants saisis sont incorrects.'
          );
          return;
        }
      }

      const res = await apiFetch('/auth/login', {
        method: 'POST',
        bodyData: {
          identifier: formattedIdentifier,
          password: password,
        },
      });

      if (res.status === 'success' && res.token && res.data?.user) {
        await login(res.token, res.data.user, rememberMe, password);
      } else {
        Alert.alert('Erreur', 'Réponse du serveur non valide.');
      }
    } catch (err: any) {
      Alert.alert('Erreur de connexion', err.message || 'Identifiants incorrects ou serveur injoignable.');
    } finally {
      setLoading(false);
    }
  };

  const saveApiSettings = () => {
    if (!apiUrlInput.trim()) return;
    setCustomApiUrl(apiUrlInput.trim());
    setShowSettings(false);
    Alert.alert('Configuration enregistrée', `L'API pointe désormais vers : \n${apiUrlInput}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <LinearGradient
        colors={activeTheme === 'dark' ? ['#050b18', '#07152c', '#090d16'] : ['#e0f2fe', '#eff6ff', '#ffffff']}
        style={styles.container}
      >
        {/* Settings Button */}
        <TouchableOpacity
          style={[styles.settingsBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => setShowSettings(true)}
          activeOpacity={0.7}
        >
          <Settings size={22} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Scrollable body */}
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            style={[
              styles.header,
              { opacity: screenAnim, transform: [{ translateY: screenSlide }] },
            ]}
          >
            <View style={[styles.logoContainer, { backgroundColor: '#ffffff' }]}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={{ width: '94%', height: '94%' }}
                contentFit="contain"
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.5 }}>SenInnov</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#2563eb', letterSpacing: -0.5 }}>Innov</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Heureux de vous revoir</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Connectez-vous pour demander et suivre{'\n'}vos actes administratifs</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.form,
              { opacity: screenAnim, transform: [{ translateY: screenSlide }] },
            ]}
          >
            {/* Identifier */}
            <FloatingInput
              label="Téléphone ou E-mail"
              value={identifier}
              onChangeText={setIdentifier}
              icon={<LogIn size={18} color={theme.placeholder} />}
              keyboardType="default"
              autoCapitalize="none"
            />

            {/* Password */}
            <FloatingInput
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={18} color={theme.placeholder} />}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  {showPassword
                    ? <EyeOff size={20} color={theme.placeholder} />
                    : <Eye size={20} color={theme.placeholder} />
                  }
                </TouchableOpacity>
              }
            />

            {/* Options Row */}
            <View style={styles.optionsRow}>
              <View style={styles.rememberMeRow}>
                <Switch
                  value={rememberMe}
                  onValueChange={setRememberMe}
                  trackColor={{ false: theme.border, true: '#60a5fa' }}
                  thumbColor={rememberMe ? '#ffffff' : (activeTheme === 'dark' ? '#1f2937' : '#f8fafc')}
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
                <Text style={[styles.rememberMeText, { color: theme.textSecondary }]}>Se souvenir de moi</Text>
              </View>
              <TouchableOpacity onPress={() => Alert.alert('Information', 'Veuillez contacter votre administrateur pour réinitialiser votre mot de passe.')}>
                <Text style={[styles.forgotPasswordText, { color: theme.primary }]}>Mot de passe oublié ?</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#2563eb', '#1d4ed8']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>Se connecter</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Spacer to push register button to bottom (Facebook style) */}
          <View style={styles.spacer} />

          {/* Register — footer */}
          <Animated.View style={[styles.registerSection, { opacity: screenAnim }]}>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.placeholder }]}>Nouveau sur Téranga ?</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.registerButton, { borderColor: theme.primary, backgroundColor: activeTheme === 'dark' ? 'rgba(37, 99, 235, 0.1)' : '#eff6ff' }]}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.85}
            >
              <Text style={[styles.registerButtonText, { color: theme.primary }]}>Créer un nouveau compte</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* Floating Settings Modal */}
        {showSettings && (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Configuration de l'API</Text>
                <TouchableOpacity onPress={() => setShowSettings(false)}>
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Adresse URL de l'API Backend</Text>
              <View style={[styles.modalInputWrapper, { borderColor: theme.border }]}>
                <Globe size={18} color={theme.placeholder} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.modalInput, { color: theme.text }]}
                  value={apiUrlInput}
                  onChangeText={setApiUrlInput}
                  placeholder="http://192.168.1.X:5000/api"
                  placeholderTextColor={theme.placeholder}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: activeTheme === 'dark' ? theme.primary : '#0f172a' }]} onPress={saveApiSettings}>
                <Text style={styles.modalSaveBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 110,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  settingsBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    width: 130,
    height: 130,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
  },
  form: {
    gap: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
    marginBottom: 4,
  },
  rememberMeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#475569',
    marginLeft: 4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#2563eb',
    fontWeight: '600',
  },
  button: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 6,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  // Spacer pushes the register section down
  spacer: {
    flex: 1,
    minHeight: 48,
  },
  // Register section — Facebook style at the bottom
  registerSection: {
    marginTop: 24,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  registerButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
  },
  registerButtonText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
  // Settings modal
  modalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  modalInput: {
    flex: 1,
    height: '100%',
    color: '#0f172a',
  },
  modalSaveBtn: {
    height: 48,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});
