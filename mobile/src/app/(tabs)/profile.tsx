import * as SecureStore from 'expo-secure-store';
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, Switch, TextInput, TouchableOpacity,
  Alert, ScrollView, Modal, ActivityIndicator, Share, Linking,
  Animated, Platform, Image, DeviceEventEmitter,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/use-theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  User, Phone, Mail, LogOut, Shield, MapPin, Lock, Edit3, Save,
  X, ChevronRight, Bell, HelpCircle, Globe, Share2, MessageSquare,
  Trash2, KeyRound, BellRing, BellOff, CheckCircle, Info, Star,
  ChevronLeft, Eye, EyeOff, WifiOff, ChevronDown, ChevronUp, Camera,
  Settings, Fingerprint, Download, FileText, Sun, Moon, Mic
} from 'lucide-react-native';
import { apiFetch, getApiUrl, setCustomApiUrl, apiUpload } from '../../services/apiClient';
import { enqueueUserAction } from '../../database/localDb';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useVoiceScroll } from '../../hooks/useVoiceNavigator';
import { useVoiceNavigatorSetting } from '../../components/VoiceNavigatorButton';

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'main' | 'profile' | 'security' | 'notifications' | 'help' | 'references' | 'faq' | 'favorites' | 'downloads';

// ─── Helper ───────────────────────────────────────────────────────────────────
const getInitials = (name: string) => {
  if (!name) return 'C';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

// ─── Sub-component: Menu Item Row ─────────────────────────────────────────────
const MenuRow = ({
  icon,
  label,
  desc,
  onPress,
  iconBg,
  danger = false,
  theme,
  activeTheme,
}: {
  icon: React.ReactNode;
  label: string;
  desc?: string;
  onPress: () => void;
  iconBg: string;
  danger?: boolean;
  theme: any;
  activeTheme: string;
}) => (
  <TouchableOpacity
    style={[styles.menuRow, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={styles.menuTextCol}>
      <Text style={[styles.menuLabel, { color: danger ? '#ef4444' : theme.text }]}>{label}</Text>
      {desc ? <Text style={styles.menuDesc}>{desc}</Text> : null}
    </View>
    <ChevronRight size={18} color={danger ? '#ef4444' : '#94a3b8'} />
  </TouchableOpacity>
);

// ─── Sub-component: Menu Switch Row ───────────────────────────────────────────
const MenuSwitchRow = ({
  icon,
  iconBg,
  label,
  desc,
  value,
  onValueChange,
  theme,
  activeTheme,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  desc?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  theme: any;
  activeTheme: string;
}) => (
  <View
    style={[
      styles.menuRow,
      { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' },
    ]}
  >
    <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={styles.menuTextCol}>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      {desc ? <Text style={styles.menuDesc}>{desc}</Text> : null}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: activeTheme === 'dark' ? '#334155' : '#cbd5e1', true: '#2563eb' }}
      thumbColor="#ffffff"
    />
  </View>
);

// ─── Sub-component: Section Header ────────────────────────────────────────────
const SectionHeader = ({ title, onBack, theme }: { title: string; onBack: () => void; theme: any }) => (
  <View style={styles.subHeader}>
    <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
      <ChevronLeft size={22} color={theme.text} />
    </TouchableOpacity>
    <Text style={[styles.subHeaderTitle, { color: theme.text }]}>{title}</Text>
    <View style={{ width: 40 }} />
  </View>
);

const FAQ_ITEMS = [
  {
    question: "Comment faire si mon dossier est rejeté ?",
    answer: "Vous pouvez cliquer sur le bouton \"Rectifier mon dossier\" directement sur l'écran du dossier rejeté pour corriger vos données saisies et vos justificatifs, puis soumettre un recours gratuitement."
  },
  {
    question: "Quels sont les délais de traitement des actes ?",
    answer: "Les délais dépendent du centre d'état civil choisi. En moyenne, l'instruction prend 2 à 5 jours ouvrés. Vous recevrez une notification in-app et un SMS dès que votre acte est disponible."
  },
  {
    question: "Le paiement des frais de dossier est-il sécurisé ?",
    answer: "Oui, tous les paiements effectués via Wave ou Orange Money sont entièrement chiffrés et sécurisés par nos passerelles de paiement partenaires agréées."
  },
  {
    question: "Puis-je retirer mon document dans n'importe quel centre ?",
    answer: "Non, votre demande d'acte civil doit être traitée et retirée (si présence physique requise) dans le centre d'état civil de la commune où l'événement d'origine a été enregistré."
  },
  {
    question: "Que faire si ma commune n'est pas dans la liste ?",
    answer: "Si votre commune ne figure pas dans les choix possibles, cela signifie qu'elle n'est pas encore numérisée sur Teranga Civil. Vous devrez effectuer vos démarches physiquement dans ce centre."
  },
  {
    question: "Quels documents justificatifs dois-je fournir en général ?",
    answer: "Cela dépend de la démarche (ex: certificat de mariage, acte de décès). Généralement, une copie lisible de votre CNI (Carte Nationale d'Identité) ou de votre passeport ainsi qu'un justificatif de domicile sont requis."
  },
  {
    question: "Puis-je faire une demande d'acte pour un tiers ?",
    answer: "Oui, à condition d'avoir les pièces justificatives requises (comme le livret de famille ou une procuration signée) et de préciser votre lien avec le titulaire dans les champs du formulaire."
  },
  {
    question: "Comment télécharger la version PDF signée officiellement ?",
    answer: "Une fois le statut de votre demande marqué comme 'Acte validé et signé', ouvrez les détails de la demande et cliquez sur le bouton 'Télécharger'. Vous pouvez également visualiser le document directement."
  },
  {
    question: "Comment fonctionne le système de signature numérique ?",
    answer: "L'officier d'état civil signe électroniquement votre acte grâce à un certificat sécurisé. Un code QR unique est imprimé sur le document, permettant à n'importe quelle administration de vérifier son authenticité en le scannant."
  }
];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const router = useRouter();
  const { user, token, logout, updateUser } = useAuth();
  const { activeTheme, setThemePreference } = useAppTheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [section, setSection] = useState<Section>('main');
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Voice auto-scroll & activation setting
  const profileScrollRef = useRef<ScrollView>(null);
  useVoiceScroll(profileScrollRef);
  const { enabled: isVoiceEnabled, toggle: toggleVoice } = useVoiceNavigatorSetting();

  // Démarches states
  const [favoriteActivities, setFavoriteActivities] = useState<any[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [downloadDemandes, setDownloadDemandes] = useState<any[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);

  const favoritesKey = user ? `favorite_activities_${user.id || user.email || 'guest'}` : 'favorite_activities_guest';

  const fetchFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const stored = await AsyncStorage.getItem(favoritesKey);
      const favIds = stored ? JSON.parse(stored) : [];
      if (favIds.length === 0) {
        setFavoriteActivities([]);
        setLoadingFavorites(false);
        return;
      }
      
      const res = await apiFetch('/activities');
      if (res && res.status === 'success') {
        const allActs = res.data.activities || [];
        const filtered = allActs.filter((a: any) => favIds.includes(a.id.toString()) || favIds.includes(a.id));
        setFavoriteActivities(filtered);
      }
    } catch (err) {
      console.warn('Failed to fetch favorites in profile:', err);
    } finally {
      setLoadingFavorites(false);
    }
  };

  const removeFavorite = async (activityId: string) => {
    try {
      const stored = await AsyncStorage.getItem(favoritesKey);
      let favIds: string[] = stored ? JSON.parse(stored) : [];
      favIds = favIds.filter(id => id !== activityId && id.toString() !== activityId.toString());
      await AsyncStorage.setItem(favoritesKey, JSON.stringify(favIds));
      setFavoriteActivities(prev => prev.filter(a => a.id !== activityId && a.id.toString() !== activityId.toString()));
    } catch (err) {
      console.warn('Failed to remove favorite:', err);
    }
  };

  const fetchDownloads = async () => {
    setLoadingDownloads(true);
    try {
      const res = await apiFetch('/demandes');
      if (res && res.status === 'success') {
        const list = res.data.demandes || [];
        const downloadable = list.filter((d: any) => 
          ['valide', 'pret', 'valide_cloture'].includes(d.statut) && 
          !d.presence_physique_requise && 
          d.has_document_final
        );
        setDownloadDemandes(downloadable);
      }
    } catch (err) {
      console.warn('Failed to fetch downloads in profile:', err);
    } finally {
      setLoadingDownloads(false);
    }
  };

  useEffect(() => {
    if (section === 'favorites') {
      fetchFavorites();
    } else if (section === 'downloads') {
      fetchDownloads();
    }
  }, [section]);

  // Profile edit state
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editNomComplet, setEditNomComplet] = useState('');
  const [editTelephone, setEditTelephone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLieuNaissance, setEditLieuNaissance] = useState('');

  // Security state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Delete account modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePwd, setShowDeletePwd] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Notifications state
  const [pushEnabled, setPushEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);

  // Language
  const [language, setLanguage] = useState<'fr' | 'wo'>('fr');
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);

  // Feedback
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [sendingFeedback, setSendingFeedback] = useState(false);

  // Profile picture & connection state
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  const resolveImageUrl = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.startsWith('file://') || url.startsWith('content://') || url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    if (url.startsWith('/')) {
      const { getApiUrl } = require('../../services/apiClient');
      const apiUrl = getApiUrl();
      const origin = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      return `${origin}${url}`;
    }
    return url;
  };

  const avatarUri = user?.avatar_url ? resolveImageUrl(user.avatar_url) : profileImage;

  // API Config modal state
  const [isApiConfigOpen, setIsApiConfigOpen] = useState(false);
  const [apiUrlInput, setApiUrlInput] = useState('');

  useEffect(() => {
    if (user) {
      setEditNomComplet(user.nom_complet || '');
      setEditTelephone(user.telephone || '');
      setEditEmail(user.email || '');
      setEditLieuNaissance(user.lieu_naissance || '');
    }
  }, [user]);

  useEffect(() => {
    const loadProfileImage = async () => {
      try {
        if (user?.id) {
          const savedImage = await AsyncStorage.getItem(`user_profile_image_${user.id}`);
          if (savedImage) setProfileImage(savedImage);
          else setProfileImage(null);
        } else {
          setProfileImage(null);
        }
      } catch (err) {
        console.warn('Error loading profile image:', err);
      }
    };
    loadProfileImage();
  }, [user?.id]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(!!state.isConnected);
    });

    const sub = DeviceEventEmitter.addListener('profile_image_updated', (uri: string | null) => {
      setProfileImage(uri);
    });

    return () => {
      unsubscribe();
      sub.remove();
    };
  }, []);

  const navigateTo = (s: Section) => setSection(s);
  const goBack = () => {
    if (section === 'faq') {
      setSection('help');
    } else {
      setSection('main');
    }
    setIsEditingInfo(false);
  };

  // Face Registration states
  const [hasFace, setHasFace] = useState(false);
  const [checkingFace, setCheckingFace] = useState(false);
  const [registeringFace, setRegisteringFace] = useState(false);

  const checkFaceRegistration = async () => {
    if (!user?.id) return;
    setCheckingFace(true);
    try {
      const apiUrl = getApiUrl();
      const aiBaseUrl = apiUrl.replace(':5000/api', ':8000');
      const checkUrl = `${aiBaseUrl}/api/ai/pointage/has-face/${user.id}`;
      
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }
      }
      
      const res = await fetch(checkUrl, { headers });
      const data = await res.json();
      setHasFace(!!data.has_face);
    } catch (err) {
      console.warn('Failed to check face registration:', err);
    } finally {
      setCheckingFace(false);
    }
  };

  useEffect(() => {
    if (section === 'profile') {
      checkFaceRegistration();
    }
  }, [section, user?.id]);

  const handleRegisterFace = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Permission refusée", "Vous devez autoriser l'accès à l'appareil photo pour enregistrer votre visage.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const selectedImage = result.assets[0];
    const fileUri = selectedImage.uri;
    const fileName = fileUri.split('/').pop() || 'face.jpg';
    const fileType = 'image/jpeg';

    setRegisteringFace(true);
    try {
      const apiUrl = getApiUrl();
      const aiBaseUrl = apiUrl.replace(':5000/api', ':8000');
      const uploadUrl = `${aiBaseUrl}/api/ai/pointage/register-face/${user?.id}`;

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      } as any);

      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const storedToken = await SecureStore.getItemAsync('auth_token');
        if (storedToken) {
          headers['Authorization'] = `Bearer ${storedToken}`;
        }
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      const resText = await uploadRes.text();
      let resData;
      try { resData = JSON.parse(resText); } catch(e) {}

      if (uploadRes.ok && resData?.status === 'success') {
        Alert.alert("✓ Succès", "Votre empreinte faciale a été enregistrée avec succès !");
        setHasFace(true);
      } else {
        const errorMsg = resData?.detail || "Erreur lors de l'enregistrement de l'empreinte faciale. Assurez-vous que votre visage est bien visible.";
        Alert.alert("Erreur", errorMsg);
      }
    } catch (err: any) {
      Alert.alert("Erreur", err.message || "Une erreur est survenue lors de la communication avec le serveur d'intelligence artificielle.");
    } finally {
      setRegisteringFace(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Nous avons besoin de la permission d\'accès à votre galerie pour changer la photo de profil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      const selectedUri = result.assets[0].uri;
      
      setProfileImage(selectedUri);
      if (user?.id) {
        try {
          await AsyncStorage.setItem(`user_profile_image_${user.id}`, selectedUri);
          DeviceEventEmitter.emit('profile_image_updated', selectedUri);
        } catch (err) {
          console.warn('Error saving profile image:', err);
        }

        if (isConnected) {
          try {
            const filename = `avatar_${user.id}_${Date.now()}.jpg`;
            const uploadRes = await apiUpload('/upload', {
              uri: selectedUri,
              type: 'image/jpeg',
              name: filename
            });

            if (uploadRes.status === 'success' && uploadRes.data?.url) {
              const remoteUrl = uploadRes.data.url;
              const saveRes = await apiFetch(`/users/${user.id}/avatar`, {
                method: 'PATCH',
                bodyData: { avatar_url: remoteUrl }
              });

              if (saveRes.status === 'success') {
                updateUser({ ...user, avatar_url: remoteUrl });
              }
            }
          } catch (e: any) {
            console.warn('Failed to upload profile photo to backend:', e);
          }
        }
      }
    }
  };

  const handleAvatarPress = () => {
    Alert.alert(
      'Photo de profil',
      'Souhaitez-vous modifier ou supprimer votre photo de profil ?',
      [
        { text: 'Choisir une photo', onPress: handlePickImage },
        (avatarUri || profileImage) ? { 
          text: 'Supprimer la photo', 
          style: 'destructive',
          onPress: async () => {
            setProfileImage(null);
            if (user?.id) {
              try {
                await AsyncStorage.removeItem(`user_profile_image_${user.id}`);
                DeviceEventEmitter.emit('profile_image_updated', null);
              } catch (err) {
                console.warn('Error removing profile image:', err);
              }

              if (isConnected) {
                try {
                  const saveRes = await apiFetch(`/users/${user.id}/avatar`, {
                    method: 'PATCH',
                    bodyData: { avatar_url: '' }
                  });
                  if (saveRes.status === 'success') {
                    updateUser({ ...user, avatar_url: undefined });
                  }
                } catch (e) {
                  console.warn('Failed to remove avatar from backend:', e);
                }
              } else {
                updateUser({ ...user, avatar_url: undefined });
              }
            }
          }
        } : null,
        { text: 'Annuler', style: 'cancel' }
      ].filter(Boolean) as any[]
    );
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: () => { logout(); router.replace('/(auth)/welcome'); },
        },
      ]
    );
  };

  const handleSaveInfo = async () => {
    if (!editNomComplet.trim() || !editTelephone.trim()) {
      Alert.alert('Champs obligatoires', 'Le nom et le téléphone sont obligatoires.');
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        nom_complet: editNomComplet.trim(),
        telephone: editTelephone.trim(),
        email: editEmail.trim() || undefined,
        role: user?.role || 'citoyen',
        lieu_naissance: editLieuNaissance.trim() || undefined,
      };

      const netState = await NetInfo.fetch();
      const isOffline = netState.isConnected === false;

      if (isOffline) {
        // Save locally — will sync when online
        await enqueueUserAction('update_profile', {
          endpoint: `/users/${user?.id}`,
          method: 'PUT',
          body,
        });
        // Immediately update local user state so UI reflects changes
        updateUser({ ...user!, ...body });
        setIsEditingInfo(false);
        Alert.alert(
          '☁️ Sauvegardé hors-ligne',
          'Vos informations ont été sauvegardées localement et seront envoyées au serveur dès que la connexion sera rétablie.'
        );
        return;
      }

      const res = await apiFetch(`/users/${user?.id}`, { method: 'PUT', bodyData: body });
      if (res.status === 'success' && res.data?.user) {
        updateUser(res.data.user);
        setIsEditingInfo(false);
        Alert.alert('✓ Succès', 'Votre profil a été mis à jour.');
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de mettre à jour le profil.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }
    if (newPassword === oldPassword) {
      Alert.alert('Mot de passe identique', 'Le nouveau mot de passe doit être différent de l\'ancien mot de passe.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setSaving(true);
    try {
      // Verify old password first by attempting a login check
      const netState = await NetInfo.fetch();
      const isOffline = netState.isConnected === false;

      if (isOffline) {
        await enqueueUserAction('change_password', {
          endpoint: `/users/${user?.id}/password`,
          method: 'PUT',
          body: { old_password: oldPassword, password: newPassword },
        });
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        Alert.alert(
          '☁️ Sauvegardé hors-ligne',
          'Votre demande de changement de mot de passe sera envoyée au serveur dès que la connexion sera rétablie.'
        );
        return;
      }

      // Use the dedicated password endpoint which checks the old password
      const res = await apiFetch(`/users/${user?.id}/password`, { 
        method: 'PUT', 
        bodyData: { old_password: oldPassword, password: newPassword } 
      });
      if (res.status === 'success') {
        setOldPassword(''); setNewPassword(''); setConfirmPassword('');
        Alert.alert('✓ Succès', 'Mot de passe mis à jour avec succès.');
      } else {
        Alert.alert('Erreur', res.message || 'Impossible de mettre à jour le mot de passe.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePress = () => {
    Alert.alert(
      'Suppression du compte ⚠️',
      'Attention : toutes vos données (profil, demandes, rendez-vous, etc.) seront supprimées définitivement. Voulez-vous continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Continuer', onPress: () => setDeleteModalVisible(true) }
      ]
    );
  };

  const handleDeleteAccount = () => {
    if (!deletePassword.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir votre mot de passe pour confirmer.');
      return;
    }

    Alert.alert(
      'Confirmation finale ⚠️',
      'Êtes-vous vraiment sûr de vouloir supprimer définitivement votre compte et toutes vos données ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Oui, supprimer', 
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await apiFetch(`/users/${user?.id}?password=${encodeURIComponent(deletePassword)}`, { method: 'DELETE' });
              if (res.status === 'success') {
                setDeleteModalVisible(false);
                setDeletePassword('');
                logout();
                router.replace('/(auth)/welcome');
                Alert.alert('✓ Succès', 'Votre compte a été supprimé.');
              } else {
                Alert.alert('Erreur', res.message || 'Impossible de supprimer le compte. Vérifiez votre mot de passe.');
              }
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Une erreur est survenue.');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Téléchargez Teranga Civil — gérez vos actes d\'état civil facilement depuis votre téléphone. Application officielle Teranga Civil.',
        title: 'Teranga Civil',
      });
    } catch { /* ignore */ }
  };

  const handleFeedback = () => {
    Linking.openURL('mailto:support@teranga-civil.com?subject=Feedback Teranga Civil');
  };

  const handleSendFeedbackSubmit = async () => {
    if (!feedbackText.trim()) {
      Alert.alert('Champ vide', 'Veuillez saisir votre message de retour avant d\'envoyer.');
      return;
    }
    setSendingFeedback(true);
    setTimeout(() => {
      setSendingFeedback(false);
      setFeedbackText('');
      setIsFeedbackOpen(false);
      Alert.alert('✓ Merci', 'Votre feedback a été envoyé avec succès. Nous apprécions votre retour !');
    }, 1500);
  };

  const handleSaveApiUrl = () => {
    if (!apiUrlInput.trim()) return;
    setCustomApiUrl(apiUrlInput.trim());
    setIsApiConfigOpen(false);
    Alert.alert('Configuration enregistrée', `L'API pointe désormais vers : \n${apiUrlInput.trim()}`);
  };

  const handleResetApiUrl = () => {
    setCustomApiUrl('');
    setIsApiConfigOpen(false);
    Alert.alert(
      'Réinitialisé ✓',
      'L\'application utilise désormais la détection automatique de l\'IP de votre ordinateur sur le réseau local.'
    );
  };

  // ── Render sections ──────────────────────────────────────────────────────────

  const renderMain = () => (
    <ScrollView
      ref={profileScrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.avatarWrap} onPress={handleAvatarPress} activeOpacity={0.95}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(user?.nom_complet || '')}</Text>
            </View>
          )}
          <View style={[styles.avatarEditOverlay, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#cbd5e1' }]}>
            <Camera size={12} color={theme.text} />
          </View>
          <View style={[styles.avatarOnline, { backgroundColor: isConnected ? '#22c55e' : '#ef4444', borderColor: activeTheme === 'dark' ? '#0A0F1D' : '#fff' }]} />
        </TouchableOpacity>
        <Text style={[styles.profileName, { color: theme.text }]}>{user?.nom_complet || 'Citoyen'}</Text>
        <Text style={[styles.profilePhone, { color: theme.textSecondary }]}>{user?.telephone || ''}</Text>
        <View style={styles.roleBadge}>
          <CheckCircle size={12} color="#2563eb" />
          <Text style={styles.roleBadgeText}>Compte Citoyen Vérifié</Text>
        </View>
      </View>

      {/* Section: Mon compte */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>MON COMPTE</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon={<User size={18} color="#ffffff" />}
          iconBg="#2563eb"
          label="Mon Profil"
          desc="Informations personnelles & coordonnées"
          onPress={() => navigateTo('profile')}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuRow
          icon={<Shield size={18} color="#ffffff" />}
          iconBg="#6366f1"
          label="Sécurité"
          desc="Mot de passe & suppression du compte"
          onPress={() => navigateTo('security')}
          theme={theme}
          activeTheme={activeTheme}
        />
      </View>

      {/* Section: Démarches */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>DÉMARCHES</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon={<Star size={18} color="#ffffff" />}
          iconBg="#fbbf24"
          label="Favoris"
          desc="Vos types de documents favoris"
          onPress={() => navigateTo('favorites')}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuRow
          icon={<FileText size={18} color="#ffffff" />}
          iconBg="#3b82f6"
          label="Télécharger documents"
          desc="Accéder à vos documents officiels signés"
          onPress={() => navigateTo('downloads')}
          theme={theme}
          activeTheme={activeTheme}
        />
      </View>

      {/* Section: Paramètres */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>PARAMÈTRES</Text>
      <View style={styles.menuGroup}>
        <MenuRow
          icon={activeTheme === 'dark' ? <Moon size={18} color="#ffffff" /> : <Sun size={18} color="#ffffff" />}
          iconBg={activeTheme === 'dark' ? '#334155' : '#f59e0b'}
          label="Apparence"
          desc={`Mode actuel : ${activeTheme === 'dark' ? 'Sombre' : 'Clair'}`}
          onPress={() => setThemePreference(activeTheme === 'dark' ? 'light' : 'dark')}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuSwitchRow
          icon={<Mic size={18} color="#ffffff" />}
          iconBg="#2563eb"
          label="Assistant & Navigation vocale"
          desc={isVoiceEnabled ? 'Bouton micro actif sur vos écrans' : 'Désactivé (masqué par défaut)'}
          value={isVoiceEnabled}
          onValueChange={toggleVoice}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuRow
          icon={<Bell size={18} color="#ffffff" />}
          iconBg="#f59e0b"
          label="Notifications"
          desc="In-App, SMS, Email"
          onPress={() => navigateTo('notifications')}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuRow
          icon={<Settings size={18} color="#ffffff" />}
          iconBg="#64748b"
          label="Configuration API"
          desc="Adresse URL du serveur et de synchro"
          onPress={() => {
            setApiUrlInput(getApiUrl());
            setIsApiConfigOpen(true);
          }}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuRow
          icon={<HelpCircle size={18} color="#ffffff" />}
          iconBg="#0ea5e9"
          label="Centre d'aide"
          desc="Contact, support & informations légales"
          onPress={() => navigateTo('help')}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <MenuRow
          icon={<Globe size={18} color="#ffffff" />}
          iconBg="#8b5cf6"
          label="Références"
          desc="Langue, partager & donner un avis"
          onPress={() => navigateTo('references')}
          theme={theme}
          activeTheme={activeTheme}
        />
      </View>

      {/* Déconnexion */}
      <TouchableOpacity
        style={[styles.logoutBtn, {
          backgroundColor: theme.backgroundElement,
          borderColor: activeTheme === 'dark' ? 'rgba(220,38,38,0.3)' : '#fee2e2',
        }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogOut size={20} color="#ef4444" />
        <Text style={styles.logoutBtnText}>Se déconnecter</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Teranga Civil v1.0.0 · Teranga Civil © 2026</Text>
    </ScrollView>
  );

  const renderProfile = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Mon Profil" onBack={goBack} theme={theme} />

      {/* Avatar Display */}
      <View style={[styles.profileMini, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <View style={styles.avatarSm}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%', borderRadius: 22 }} />
          ) : (
            <Text style={styles.avatarSmText}>{getInitials(user?.nom_complet || '')}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.profileName, { color: theme.text, fontSize: 16 }]}>{user?.nom_complet || 'Citoyen'}</Text>
          <Text style={styles.profileMiniSub}>Citoyen</Text>
        </View>
        {!isEditingInfo && (
          <TouchableOpacity style={styles.editPill} onPress={() => setIsEditingInfo(true)} activeOpacity={0.7}>
            <Edit3 size={13} color="#2563eb" />
            <Text style={styles.editPillText}>Modifier</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Card */}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        {isEditingInfo ? (
          <View style={{ padding: 16, gap: 14 }}>
            <InputField label="Nom Complet" icon={<User size={15} color="#94a3b8" />} value={editNomComplet} onChangeText={setEditNomComplet} placeholder="Nom Complet" theme={theme} />
            <InputField label="Téléphone" icon={<Phone size={15} color="#94a3b8" />} value={editTelephone} onChangeText={setEditTelephone} placeholder="Téléphone" theme={theme} keyboardType="phone-pad" />
            <InputField label="Email" icon={<Mail size={15} color="#94a3b8" />} value={editEmail} onChangeText={setEditEmail} placeholder="Email (facultatif)" theme={theme} keyboardType="email-address" />
            <InputField label="Lieu de naissance" icon={<MapPin size={15} color="#94a3b8" />} value={editLieuNaissance} onChangeText={setEditLieuNaissance} placeholder="Lieu de naissance" theme={theme} />
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setIsEditingInfo(false)} disabled={saving}>
                <X size={15} color="#64748b" />
                <Text style={styles.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSaveInfo} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <><Save size={15} color="#fff" /><Text style={styles.saveTxt}>Enregistrer</Text></>}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <InfoRow icon={<Phone size={16} color="#94a3b8" />} label="Téléphone" value={user?.telephone || 'Non renseigné'} theme={theme} />
            <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
            <InfoRow icon={<Mail size={16} color="#94a3b8" />} label="Email" value={user?.email || 'Non renseigné'} theme={theme} />
            <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
            <InfoRow icon={<MapPin size={16} color="#94a3b8" />} label="Lieu de naissance" value={user?.lieu_naissance || 'Non renseigné'} theme={theme} />
          </>
        )}
      </View>
    </ScrollView>
  );

  const renderSecurity = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Sécurité" onBack={goBack} theme={theme} />

      {/* Change Password */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>MODIFIER LE MOT DE PASSE</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <View style={{ padding: 16, gap: 14 }}>
          <PasswordField label="Mot de passe actuel" value={oldPassword} onChangeText={setOldPassword} show={showOld} onToggle={() => setShowOld(v => !v)} theme={theme} />
          <PasswordField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} show={showNew} onToggle={() => setShowNew(v => !v)} theme={theme} />
          <PasswordField label="Confirmer le nouveau mot de passe" value={confirmPassword} onChangeText={setConfirmPassword} show={showConfirm} onToggle={() => setShowConfirm(v => !v)} theme={theme} />
          <TouchableOpacity
            style={[styles.primaryBtn, saving && { opacity: 0.7 }]}
            onPress={handleSavePassword}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <><KeyRound size={16} color="#fff" /><Text style={styles.primaryBtnText}>Mettre à jour le mot de passe</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Account */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary, marginTop: 8 }]}>ZONE DANGER</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(239,68,68,0.2)' : '#fee2e2' }]}>
        <TouchableOpacity style={styles.dangerRow} onPress={handleDeletePress} activeOpacity={0.8}>
          <View style={[styles.dangerIcon, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Trash2 size={18} color="#ef4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dangerLabel}>Supprimer mon compte</Text>
            <Text style={styles.dangerDesc}>Action irréversible — toutes vos données seront supprimées</Text>
          </View>
          <ChevronRight size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      {/* Delete Modal */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.modalIconWrap}>
              <Trash2 size={28} color="#ef4444" />
            </View>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Supprimer le compte</Text>
            <Text style={[styles.modalDesc, { color: theme.textSecondary }]}>
              Cette action est définitive. Toutes vos demandes et données personnelles seront supprimées. Saisissez votre mot de passe pour confirmer.
            </Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0', marginBottom: 16 }]}>
              <Lock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.textInput, { color: theme.text }]}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry={!showDeletePwd}
                placeholder="Votre mot de passe"
                placeholderTextColor="#94a3b8"
              />
              <TouchableOpacity onPress={() => setShowDeletePwd(v => !v)}>
                {showDeletePwd ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
              </TouchableOpacity>
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={() => { setDeleteModalVisible(false); setDeletePassword(''); }}>
                <Text style={styles.cancelTxt}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ef4444' }, deleting && { opacity: 0.7 }]} onPress={handleDeleteAccount} disabled={deleting}>
                {deleting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.saveTxt, { color: '#fff' }]}>Supprimer</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );

  const renderFavorites = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Mes Favoris" onBack={goBack} theme={theme} />
      
      {loadingFavorites ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 40 }} />
      ) : favoriteActivities.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 }}>
          <Star size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 14 }}>
            Aucun type de document mis en favori pour le moment.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {favoriteActivities.map((act) => (
            <TouchableOpacity
              key={act.id}
              style={[
                styles.menuRow,
                { 
                  backgroundColor: theme.backgroundElement, 
                  borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 16,
                  borderWidth: 1,
                  flexDirection: 'row'
                }
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (act.bureau_id) {
                  router.push(`/demande/new?bureauId=${act.bureau_id}&preselectedActivityId=${act.id}&preselectedServiceId=${act.service_id}`);
                } else {
                  Alert.alert("Erreur", "Bureau d'état civil non spécifié pour ce favori.");
                }
              }}
            >
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={{ color: theme.text, fontWeight: '700', fontSize: 15 }}>{act.nom}</Text>
                {act.service_nom && (
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 4 }}>
                    {act.service_nom}
                  </Text>
                )}
                <Text style={{ color: '#2563eb', fontWeight: '600', fontSize: 13, marginTop: 4 }}>
                  {act.prix === 0 ? 'Gratuit' : `${act.prix} CFA`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  removeFavorite(act.id);
                }}
                style={{ padding: 8 }}
              >
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderDownloads = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Mes Documents Signés" onBack={goBack} theme={theme} />
      
      {loadingDownloads ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginVertical: 40 }} />
      ) : downloadDemandes.length === 0 ? (
        <View style={{ alignItems: 'center', justifyContent: 'center', padding: 40, marginTop: 40 }}>
          <FileText size={48} color="#cbd5e1" style={{ marginBottom: 16 }} />
          <Text style={{ color: theme.textSecondary, textAlign: 'center', fontSize: 14 }}>
            Aucun document signé prêt à être téléchargé.
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {downloadDemandes.map((dem) => {
            const handleDownload = async () => {
              try {
                const baseUrl = getApiUrl();
                const token = await SecureStore.getItemAsync('auth_token');
                const pdfUrl = `${baseUrl}/demandes/${dem.id}/pdf?token=${encodeURIComponent(token || '')}`;
                
                const supported = await Linking.canOpenURL(pdfUrl);
                if (supported) {
                  await Linking.openURL(pdfUrl);
                } else {
                  Alert.alert("Erreur", "Impossible d'ouvrir le lien de téléchargement.");
                }
              } catch (e) {
                console.warn(e);
              }
            };

            return (
              <TouchableOpacity
                key={dem.id}
                style={[
                  styles.menuRow,
                  { 
                    backgroundColor: theme.backgroundElement, 
                    borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: 16,
                    borderWidth: 1
                  }
                ]}
                onPress={() => router.push(`/demande/${dem.id}`)}
              >
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>{dem.reference}</Text>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', marginTop: 4 }}>{dem.activite_nom || 'Acte civil'}</Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{dem.service_nom}</Text>
                </View>
                <TouchableOpacity
                  onPress={handleDownload}
                  style={{ 
                    backgroundColor: '#2563eb', 
                    width: 36, 
                    height: 36, 
                    borderRadius: 18, 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                  }}
                  activeOpacity={0.7}
                >
                  <Download size={16} color="#ffffff" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  const renderNotifications = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Notifications" onBack={goBack} theme={theme} />

      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>CANAUX DE NOTIFICATION</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <ToggleRow
          icon={<BellRing size={16} color="#ffffff" />}
          iconBg="#2563eb"
          label="Notifications In-App"
          desc="Alertes d'avancement dans l'application"
          value={pushEnabled}
          onValueChange={setPushEnabled}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <ToggleRow
          icon={<MessageSquare size={16} color="#ffffff" />}
          iconBg="#f59e0b"
          label="Alertes par SMS"
          desc="Notification SMS de signature d'actes"
          value={smsEnabled}
          onValueChange={setSmsEnabled}
          theme={theme}
          activeTheme={activeTheme}
        />
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <ToggleRow
          icon={<Mail size={16} color="#ffffff" />}
          iconBg="#6366f1"
          label="Alertes par Email"
          desc="Reçu de paiement et copie PDF par mail"
          value={emailEnabled}
          onValueChange={setEmailEnabled}
          theme={theme}
          activeTheme={activeTheme}
        />
      </View>

      <View style={[styles.noticeBox, { backgroundColor: activeTheme === 'dark' ? 'rgba(245,158,11,0.1)' : '#fffbeb', borderColor: activeTheme === 'dark' ? 'rgba(245,158,11,0.2)' : '#fde68a' }]}>
        <Info size={14} color="#f59e0b" />
        <Text style={styles.noticeText}>Les notifications SMS peuvent entraîner des frais selon votre opérateur mobile.</Text>
      </View>
    </ScrollView>
  );

  const renderHelp = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Centre d'aide" onBack={goBack} theme={theme} />

      {/* App info */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>À PROPOS DE L'APPLICATION</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <View style={styles.appInfoHeader}>
          <View style={[styles.appLogoWrap, { backgroundColor: '#ffffff', padding: 4 }]}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.appName, { color: theme.text, fontWeight: '800' }]}>Teranga</Text>
              <Text style={[styles.appName, { color: '#2563eb', fontWeight: '800' }]}>Civil</Text>
            </View>
            <Text style={styles.appTagline}>Actes civils simplifiés · Sénégal</Text>
          </View>
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>v1.0.0</Text>
          </View>
        </View>
      </View>

      {/* Contact */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>CONTACT & SUPPORT</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <TouchableOpacity style={styles.helpRow} onPress={() => Linking.openURL('tel:+221770000000')} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#2563eb' }]}><Phone size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Appeler le support</Text>
            <Text style={styles.menuDesc}>+221 77 000 00 00</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <TouchableOpacity style={styles.helpRow} onPress={() => Linking.openURL('mailto:support@teranga-civil.com')} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#6366f1' }]}><Mail size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Envoyer un email</Text>
            <Text style={styles.menuDesc}>support@teranga-civil.com</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <TouchableOpacity style={styles.helpRow} onPress={() => setSection('faq')} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#f59e0b' }]}><HelpCircle size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Questions Fréquentes (FAQ)</Text>
            <Text style={styles.menuDesc}>Consulter les 9 questions clés des démarches</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Legal */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>INFORMATIONS LÉGALES</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <View style={styles.legalRow}>
          <Shield size={16} color="#0ea5e9" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Sécurité & Conformité</Text>
            <Text style={styles.menuDesc}>Données chiffrées — Loi n° 2008-12 CDP</Text>
          </View>
        </View>
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <View style={styles.legalRow}>
          <Info size={16} color="#0ea5e9" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Version de l'application</Text>
            <Text style={styles.menuDesc}>Teranga Civil 1.0.0 · Build 2026</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderReferences = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Références" onBack={goBack} theme={theme} />

      {/* Language */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>LANGUE DE L'APPLICATION</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <TouchableOpacity 
          style={styles.langRow} 
          activeOpacity={0.7}
          onPress={() => setIsLangDropdownOpen(v => !v)}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#8b5cf6' }]}><Globe size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Langue</Text>
            <Text style={styles.menuDesc}>Langue de l'interface</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.selectedLangText, { color: theme.textSecondary }]}>
              {language === 'fr' ? 'Français' : 'Wolof'}
            </Text>
            {isLangDropdownOpen ? (
              <ChevronUp size={16} color="#94a3b8" />
            ) : (
              <ChevronDown size={16} color="#94a3b8" />
            )}
          </View>
        </TouchableOpacity>

        {isLangDropdownOpen && (
          <View style={[styles.langDropdownList, { borderTopWidth: 1, borderTopColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
            <TouchableOpacity 
              style={[styles.dropdownItem, language === 'fr' && { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc' }]}
              onPress={() => {
                setLanguage('fr');
                setIsLangDropdownOpen(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, { color: theme.text }, language === 'fr' && styles.dropdownItemTextActive]}>
                Français
              </Text>
              {language === 'fr' && (
                <CheckCircle size={16} color="#2563eb" />
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dropdownItem, language === 'wo' && { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc' }]}
              onPress={() => {
                setIsLangDropdownOpen(false);
                Alert.alert('Bientôt disponible', 'La version Wolof sera disponible prochainement.');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropdownItemText, { color: theme.text }, language === 'wo' && styles.dropdownItemTextActive]}>
                Wolof
              </Text>
              {language === 'wo' && (
                <CheckCircle size={16} color="#2563eb" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Share & Feedback */}
      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>PARTAGER & DONNER UN AVIS</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        <TouchableOpacity style={styles.helpRow} onPress={handleShare} activeOpacity={0.7}>
          <View style={[styles.menuIcon, { backgroundColor: '#2563eb' }]}><Share2 size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Partager l'application</Text>
            <Text style={styles.menuDesc}>Recommandez Teranga Civil à vos proches</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <TouchableOpacity 
          style={styles.helpRow} 
          onPress={() => setIsFeedbackOpen(v => !v)} 
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#f59e0b' }]}><MessageSquare size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Envoyer un feedback</Text>
            <Text style={styles.menuDesc}>Aidez-nous à améliorer l'application</Text>
          </View>
          {isFeedbackOpen ? (
            <ChevronUp size={16} color="#94a3b8" />
          ) : (
            <ChevronRight size={16} color="#94a3b8" />
          )}
        </TouchableOpacity>

        {isFeedbackOpen && (
          <View style={[styles.feedbackContainer, { borderTopWidth: 1, borderTopColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]}>
            <TextInput
              style={[
                styles.feedbackInput, 
                { 
                  backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.02)' : '#f8fafc',
                  color: theme.text,
                  borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0'
                }
              ]}
              multiline
              numberOfLines={4}
              value={feedbackText}
              onChangeText={setFeedbackText}
              placeholder="Écrivez votre message ici..."
              placeholderTextColor="#94a3b8"
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.feedbackSendBtn, sendingFeedback && { opacity: 0.7 }]}
              onPress={handleSendFeedbackSubmit}
              disabled={sendingFeedback}
              activeOpacity={0.8}
            >
              {sendingFeedback ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.feedbackSendBtnText}>Envoyer</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
        <TouchableOpacity
          style={styles.helpRow}
          onPress={() => Linking.openURL('https://play.google.com/store')}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#6366f1' }]}><Star size={16} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: theme.text }]}>Noter l'application</Text>
            <Text style={styles.menuDesc}>Laissez un avis sur le store</Text>
          </View>
          <ChevronRight size={16} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFaq = () => (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
      showsVerticalScrollIndicator={false}
    >
      <SectionHeader title="Questions Fréquentes" onBack={goBack} theme={theme} />

      <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>RÉPONSES À VOS QUESTIONS</Text>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
        {FAQ_ITEMS.map((item, idx) => {
          const isExpanded = expandedFaq === idx;
          return (
            <View key={idx}>
              <TouchableOpacity 
                style={styles.faqRowHeader} 
                onPress={() => setExpandedFaq(isExpanded ? null : idx)}
                activeOpacity={0.7}
              >
                <Text style={[styles.faqQuestion, { color: theme.text }]}>{item.question}</Text>
                {isExpanded ? (
                  <ChevronUp size={18} color="#94a3b8" />
                ) : (
                  <ChevronDown size={18} color="#94a3b8" />
                )}
              </TouchableOpacity>
              {isExpanded && (
                <View style={styles.faqAnswerContainer}>
                  <Text style={[styles.faqAnswer, { color: theme.textSecondary }]}>{item.answer}</Text>
                </View>
              )}
              {idx < FAQ_ITEMS.length - 1 && (
                <View style={[styles.separator, { backgroundColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.05)' : '#f1f5f9' }]} />
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {section === 'main' && renderMain()}
      {section === 'profile' && renderProfile()}
      {section === 'security' && renderSecurity()}
      {section === 'favorites' && renderFavorites()}
      {section === 'downloads' && renderDownloads()}
      {section === 'notifications' && renderNotifications()}
      {section === 'help' && renderHelp()}
      {section === 'faq' && renderFaq()}
      {section === 'references' && renderReferences()}

      {/* Floating API Config Modal */}
      {isApiConfigOpen && (
        <Modal transparent animationType="fade" visible={isApiConfigOpen} onRequestClose={() => setIsApiConfigOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalBox, { backgroundColor: theme.backgroundElement }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.modalTitle, { color: theme.text, textAlign: 'left', marginBottom: 0 }]}>Configuration API</Text>
                <TouchableOpacity onPress={() => setIsApiConfigOpen(false)}>
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8, fontWeight: '500' }}>Adresse URL du serveur Backend</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: activeTheme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e2e8f0', marginBottom: 16 }]}>
                <Globe size={18} color="#8c9ba5" style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={apiUrlInput}
                  onChangeText={setApiUrlInput}
                  placeholder="http://192.168.1.X:5000/api"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleResetApiUrl}>
                  <Text style={[styles.cancelTxt, { color: '#ef4444' }]}>Réinitialiser</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.saveBtn]} onPress={handleSaveApiUrl}>
                  <Text style={styles.saveTxt}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
const InputField = ({
  label, icon, value, onChangeText, placeholder, theme, keyboardType = 'default'
}: {
  label: string; icon: React.ReactNode; value: string; onChangeText: (t: string) => void;
  placeholder: string; theme: any; keyboardType?: any;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: 'rgba(148,163,184,0.3)' }]}>
      <View style={{ marginRight: 8 }}>{icon}</View>
      <TextInput
        style={[styles.textInput, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

const PasswordField = ({
  label, value, onChangeText, show, onToggle, theme
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  show: boolean; onToggle: () => void; theme: any;
}) => (
  <View style={styles.inputGroup}>
    <Text style={styles.inputLabel}>{label}</Text>
    <View style={[styles.inputWrapper, { backgroundColor: theme.background, borderColor: 'rgba(148,163,184,0.3)' }]}>
      <Lock size={15} color="#94a3b8" style={{ marginRight: 8 }} />
      <TextInput
        style={[styles.textInput, { color: theme.text }]}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        placeholder="••••••••"
        placeholderTextColor="#94a3b8"
      />
      <TouchableOpacity onPress={onToggle}>
        {show ? <EyeOff size={16} color="#94a3b8" /> : <Eye size={16} color="#94a3b8" />}
      </TouchableOpacity>
    </View>
  </View>
);

const InfoRow = ({
  icon, label, value, theme
}: { icon: React.ReactNode; label: string; value: string; theme: any }) => (
  <View style={styles.infoRow}>
    {icon}
    <View style={styles.infoTextCol}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.text }]}>{value}</Text>
    </View>
  </View>
);

const ToggleRow = ({
  icon, iconBg, label, desc, value, onValueChange, theme, activeTheme
}: {
  icon: React.ReactNode; iconBg: string; label: string; desc: string;
  value: boolean; onValueChange: (v: boolean) => void; theme: any; activeTheme: string;
}) => (
  <View style={[styles.toggleRow]}>
    <View style={[styles.menuIcon, { backgroundColor: iconBg }]}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, { color: theme.text }]}>{label}</Text>
      <Text style={styles.menuDesc}>{desc}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#cbd5e1', true: '#a7f3d0' }}
      thumbColor={value ? '#2563eb' : '#f4f3f4'}
    />
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Profile Header
  profileHeader: { alignItems: 'center', paddingVertical: 24, paddingBottom: 28 },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 104, height: 104, borderRadius: 52,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2563eb', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  avatarOnline: {
    position: 'absolute', bottom: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff',
  },
  avatarEditOverlay: {
    position: 'absolute', bottom: 2, left: 2,
    width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
  profileName: { fontSize: 20, fontWeight: '700' },
  profilePhone: { fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8,
  },
  roleBadgeText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },

  // Groups
  groupLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 1,
    textTransform: 'uppercase', marginBottom: 8, marginTop: 4, paddingHorizontal: 4,
  },
  menuGroup: { borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
  separator: { height: 1, marginHorizontal: 16 },

  // Menu Row
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 12, borderWidth: 1,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuTextCol: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: '600' },
  menuDesc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  // Card
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 20 },

  // Section Header
  subHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 20, paddingTop: 8,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  subHeaderTitle: { fontSize: 17, fontWeight: '700' },

  // Profile Mini
  profileMini: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 16,
  },
  avatarSm: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarSmText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileMiniSub: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  editPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  editPillText: { color: '#2563eb', fontSize: 12, fontWeight: '600' },

  // Info Row
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  infoTextCol: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: '600', marginTop: 2 },

  // Form
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8' },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12, height: 48, paddingHorizontal: 12,
  },
  textInput: { flex: 1, height: '100%', fontSize: 14, letterSpacing: 0 },
  actionsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 44, borderRadius: 12,
  },
  cancelBtn: { backgroundColor: 'rgba(100,116,139,0.1)' },
  cancelTxt: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  saveBtn: { backgroundColor: '#2563eb' },
  saveTxt: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Primary Button
  primaryBtn: {
    backgroundColor: '#2563eb', borderRadius: 12, height: 48,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Danger Zone
  dangerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dangerIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  dangerLabel: { fontSize: 14, fontWeight: '600', color: '#ef4444' },
  dangerDesc: { fontSize: 12, color: '#94a3b8', marginTop: 1 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  modalDesc: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 20 },

  // Toggle Row
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },

  // Help Row
  helpRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  legalRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },

  // App Info
  appInfoHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  appLogoWrap: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#2563eb',
    alignItems: 'center', justifyContent: 'center',
  },
  appLogoText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  appName: { fontSize: 16, fontWeight: '700' },
  appTagline: { fontSize: 12, color: '#94a3b8', marginTop: 1 },
  versionBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8,
  },
  versionBadgeText: { color: '#2563eb', fontSize: 11, fontWeight: '700' },

  // Language
  langRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  selectedLangText: { fontSize: 14, fontWeight: '600' },
  langDropdownList: { paddingVertical: 4 },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: { fontSize: 14, fontWeight: '500' },
  dropdownItemTextActive: { fontWeight: '700', color: '#2563eb' },

  // Feedback Expandable Form
  feedbackContainer: { padding: 16, gap: 12 },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    height: 100,
    fontSize: 14,
  },
  feedbackSendBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackSendBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // FAQ Styles
  faqRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    gap: 12,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 19,
  },
  faqAnswerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 2,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Notice Box
  noticeBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 4,
  },
  noticeText: { flex: 1, fontSize: 12, color: '#92400e', lineHeight: 17 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, borderRadius: 16, borderWidth: 1, height: 54, marginTop: 8,
  },
  logoutBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },

  // Version
  versionText: {
    fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 24, letterSpacing: 0.2,
  },
});
