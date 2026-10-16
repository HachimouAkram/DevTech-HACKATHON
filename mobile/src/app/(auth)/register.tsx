import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../../services/apiClient';
import { useAppTheme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/use-theme';
import { User, Phone, Mail, Lock, ShieldCheck, MessageSquare, MessageCircle, X, Eye, EyeOff, CheckSquare, Square } from 'lucide-react-native';
import { FloatingInput } from '../../components/FloatingInput';

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();

  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationChoiceModal, setVerificationChoiceModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptCGU, setAcceptCGU] = useState(false);
  const [acceptData, setAcceptData] = useState(false);

  // ── Entry animations (fast, parallel) ──────────────────────────────────
  const screenAnim = useRef(new Animated.Value(0)).current;
  const screenSlide = useRef(new Animated.Value(18)).current;

  useEffect(() => {
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

  const getPasswordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const strengthColors = ['#e2e8f0', '#ef4444', '#f59e0b', '#3b82f6', '#2563eb'];
  const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
  const strengthScore = getPasswordStrength();

  const handleRegisterClick = () => {
    if (!prenom.trim() || !nom.trim() || !telephone.trim() || !password.trim()) {
      Alert.alert('Champs requis', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!acceptCGU || !acceptData) {
      Alert.alert('Conditions requises', 'Vous devez accepter les conditions générales et le traitement de vos données pour créer un compte.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (strengthScore < 4) {
      Alert.alert('Mot de passe faible', 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.');
      return;
    }
    setVerificationChoiceModal(true);
  };

  const proceedRegistration = async (method: 'email' | 'sms' | 'whatsapp') => {
    if (method === 'email' && !email.trim()) {
      Alert.alert('Erreur', 'Veuillez renseigner votre email pour recevoir le code par email.');
      return;
    }

    setVerificationChoiceModal(false);
    setLoading(true);
    try {
      const nomComplet = `${prenom.trim()} ${nom.trim()}`;

      let formattedPhone = telephone.replace(/\s+/g, '');
      if (!formattedPhone.startsWith('+221') && !formattedPhone.startsWith('221')) {
        formattedPhone = '+221' + formattedPhone;
      } else if (formattedPhone.startsWith('221')) {
        formattedPhone = '+' + formattedPhone;
      }

      const res = await apiFetch('/auth/send-verification', {
        method: 'POST',
        bodyData: {
          telephone: formattedPhone,
          email: email.trim() || undefined,
        },
      });

      if (res.status === 'success') {
        router.push({
          pathname: '/(auth)/verify-sms',
          params: {
            method: method,
            registerData: JSON.stringify({
              nom_complet: nomComplet,
              telephone: formattedPhone,
              email: email.trim() || undefined,
              password: password,
            })
          },
        });
      } else {
        Alert.alert('Erreur', 'Réponse du serveur non valide.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de vérifier la disponibilité. Veuillez réessayer.');
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
        colors={activeTheme === 'dark' ? ['#050b18', '#07152c', '#090d16'] : ['#eff6ff', '#ffffff']}
        style={styles.container}
      >
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
                style={{ width: '82%', height: '82%' }}
                contentFit="contain"
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, letterSpacing: -0.5 }}>Teranga</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#2563eb', letterSpacing: -0.5 }}>Civil</Text>
            </View>
            <Text style={[styles.title, { color: theme.text }]}>Créer votre compte</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Enregistrez vos coordonnées pour accéder{'\n'}aux services de démarche en ligne</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View
            style={[
              styles.form,
              { opacity: screenAnim, transform: [{ translateY: screenSlide }] },
            ]}
          >
            {/* Prénom */}
            <FloatingInput
              label="Prénom *"
              value={prenom}
              onChangeText={setPrenom}
              icon={<User size={18} color={theme.placeholder} />}
            />

            {/* Nom */}
            <FloatingInput
              label="Nom *"
              value={nom}
              onChangeText={setNom}
              icon={<User size={18} color={theme.placeholder} />}
            />

            {/* Téléphone avec préfixe +221 */}
            <FloatingInput
              label="Numéro de téléphone *"
              value={telephone}
              onChangeText={setTelephone}
              icon={<Phone size={18} color={theme.placeholder} />}
              keyboardType="phone-pad"
              leftPrefix={
                <Text style={[styles.phonePrefix, { color: theme.text }]}>+221</Text>
              }
            />

            {/* Email */}
            <FloatingInput
              label="Email (facultatif)"
              value={email}
              onChangeText={setEmail}
              icon={<Mail size={18} color={theme.placeholder} />}
              keyboardType="email-address"
            />

            {/* Mot de passe */}
            <FloatingInput
              label="Mot de passe *"
              value={password}
              onChangeText={setPassword}
              icon={<Lock size={18} color={theme.placeholder} />}
              secureTextEntry={!showPassword}
              rightElement={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} activeOpacity={0.7}>
                  {showPassword ? <EyeOff size={18} color={theme.placeholder} /> : <Eye size={18} color={theme.placeholder} />}
                </TouchableOpacity>
              }
            />

            {/* Password strength indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: index <= strengthScore ? strengthColors[strengthScore] : theme.border }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: strengthColors[strengthScore] }]}>
                  {strengthLabels[strengthScore]}
                </Text>
              </View>
            )}

            {/* Confirmer Mot de passe */}
            <FloatingInput
              label="Confirmer le mot de passe *"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              icon={<Lock size={18} color={theme.placeholder} />}
              secureTextEntry={!showConfirmPassword}
              rightElement={
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} activeOpacity={0.7}>
                  {showConfirmPassword ? <EyeOff size={18} color={theme.placeholder} /> : <Eye size={18} color={theme.placeholder} />}
                </TouchableOpacity>
              }
            />

            {/* Critères mot de passe */}
            <View style={[styles.criteriaBox, { backgroundColor: theme.background }]}>
              <Text style={[styles.criteriaTitle, { color: theme.text }]}>Critères requis :</Text>
              <Text style={[styles.criteriaItem, { color: password.length >= 8 ? '#2563eb' : theme.placeholder }]}>
                {password.length >= 8 ? '✔' : '○'}  8 caractères minimum
              </Text>
              <Text style={[styles.criteriaItem, { color: /[A-Z]/.test(password) ? '#2563eb' : theme.placeholder }]}>
                {/[A-Z]/.test(password) ? '✔' : '○'}  1 majuscule
              </Text>
              <Text style={[styles.criteriaItem, { color: /[0-9]/.test(password) ? '#2563eb' : theme.placeholder }]}>
                {/[0-9]/.test(password) ? '✔' : '○'}  1 chiffre
              </Text>
              <Text style={[styles.criteriaItem, { color: /[^A-Za-z0-9]/.test(password) ? '#2563eb' : theme.placeholder }]}>
                {/[^A-Za-z0-9]/.test(password) ? '✔' : '○'}  1 caractère spécial
              </Text>
            </View>

            {/* Checkboxes */}
            <TouchableOpacity
              style={styles.checkRow}
              onPress={() => setAcceptCGU(!acceptCGU)}
              activeOpacity={0.7}
            >
              {acceptCGU
                ? <CheckSquare size={20} color="#2563eb" />
                : <Square size={20} color={theme.placeholder} />
              }
              <Text style={[styles.checkText, { color: theme.textSecondary }]}>J'accepte les conditions générales d'utilisation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.checkRow, { marginBottom: 24 }]}
              onPress={() => setAcceptData(!acceptData)}
              activeOpacity={0.7}
            >
              {acceptData
                ? <CheckSquare size={20} color="#2563eb" style={{ marginTop: 2 }} />
                : <Square size={20} color={theme.placeholder} style={{ marginTop: 2 }} />
              }
              <Text style={[styles.checkText, { color: theme.textSecondary }]}>Je consens au traitement de mes données personnelles conformément au RGPD sénégalais (Loi 2008-12)</Text>
            </TouchableOpacity>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegisterClick}
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
                  <Text style={styles.buttonText}>Créer mon compte</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Footer link */}
            <Animated.View style={[styles.footerLink, { opacity: screenAnim }]}>
              <Text style={[styles.footerLinkText, { color: theme.textSecondary }]}>Déjà inscrit ? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
                <Text style={[styles.footerLinkBold, { color: theme.primary }]}>Se connecter</Text>
              </TouchableOpacity>
            </Animated.View>

          </Animated.View>
        </ScrollView>
      </LinearGradient>

      {/* Verification Choice Modal */}
      <Modal visible={verificationChoiceModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Vérification du compte</Text>
              <TouchableOpacity onPress={() => setVerificationChoiceModal(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Comment souhaitez-vous recevoir votre code de vérification à 4 chiffres ?
            </Text>

            <TouchableOpacity
              style={[styles.choiceCard, { borderColor: theme.border }]}
              onPress={() => proceedRegistration('sms')}
              activeOpacity={0.7}
            >
              <View style={[styles.choiceIcon, { backgroundColor: 'rgba(37, 99, 235, 0.15)' }]}>
                <MessageSquare size={24} color="#2563eb" />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: theme.text }]}>Par SMS</Text>
                <Text style={[styles.choiceSubtitle, { color: theme.textSecondary }]}>Sur le {telephone}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceCard, { borderColor: theme.border }]}
              onPress={() => proceedRegistration('email')}
              activeOpacity={0.7}
            >
              <View style={[styles.choiceIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                <Mail size={24} color="#3b82f6" />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: theme.text }]}>Par Email</Text>
                <Text style={[styles.choiceSubtitle, { color: theme.textSecondary }]}>
                  {email ? `Sur ${email}` : 'Veuillez saisir un email dans le formulaire'}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.choiceCard, { borderColor: theme.border, marginBottom: 0 }]}
              onPress={() => proceedRegistration('whatsapp')}
              activeOpacity={0.7}
            >
              <View style={[styles.choiceIcon, { backgroundColor: 'rgba(37, 211, 102, 0.15)' }]}>
                <MessageCircle size={24} color="#25D366" />
              </View>
              <View style={styles.choiceText}>
                <Text style={[styles.choiceTitle, { color: theme.text }]}>Par WhatsApp</Text>
                <Text style={[styles.choiceSubtitle, { color: theme.textSecondary }]}>Sur le {telephone}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoContainer: {
    width: 110,
    height: 110,
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
    gap: 4,
  },
  phonePrefix: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  strengthContainer: {
    paddingHorizontal: 4,
    gap: 4,
    marginTop: 4,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  criteriaBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
    gap: 4,
  },
  criteriaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  criteriaItem: {
    fontSize: 13,
    lineHeight: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    gap: 10,
  },
  checkText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 19,
  },
  button: {
    height: 54,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 20,
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
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  footerLinkText: {
    color: '#475569',
    fontSize: 14,
  },
  footerLinkBold: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalDesc: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 24,
    lineHeight: 20,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    marginBottom: 12,
  },
  choiceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  choiceText: {
    flex: 1,
  },
  choiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  choiceSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
});
