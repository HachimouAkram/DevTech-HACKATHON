import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Modal, Dimensions,
  KeyboardAvoidingView, Platform, LayoutAnimation, UIManager,
  Linking, DeviceEventEmitter, BackHandler, Pressable
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { apiFetch, apiUpload } from '../../services/apiClient';
import { getFromCache, getAllFromCache } from '../../database/localDb';
import NetInfo from '@react-native-community/netinfo';
import {
  ArrowLeft, Check, Camera, CreditCard, ShieldCheck,
  UploadCloud, Smartphone, X, ChevronRight, Clock,
  Briefcase, Search, Baby, Heart, UserMinus, Building2,
  FileText, HelpCircle, FolderOpen, MapPin, Navigation, Star,
  User as UserIcon, Phone as PhoneIcon, Mail as MailIcon
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { getServiceIllustrativeIcon } from '../../components/IllustrativeIcons';
import { useTheme } from '../../hooks/use-theme';
import { useAppTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import AnimatedReanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { TapEffect } from '../../components/TapEffect';

// Reusable premium touchable component
const PremiumPressable = ({ children, onPress, style, containerStyle, activeScale = 1.05 }: any) => {
  const { activeTheme } = useAppTheme();
  
  // Flatten styles
  const flatStyle = StyleSheet.flatten(style) || {};

  // Extract layout, background, border, and shadow properties
  const {
    // Shadow properties
    shadowColor = activeTheme === 'dark' ? '#000000' : '#94a3b8',
    shadowOffset = { width: 0, height: 4 },
    shadowOpacity = activeTheme === 'dark' ? 0.22 : 0.08,
    shadowRadius = 10,
    elevation = 2,

    // Background & border
    backgroundColor = activeTheme === 'dark' ? '#1e293b' : '#ffffff',
    borderRadius = 20,
    borderWidth,
    borderColor,

    // Layout
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

    ...innerStyle
  } = flatStyle;

  const outerLayoutStyles = {
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

  const scale = useSharedValue(1);
  const elevationVal = useSharedValue(elevation);
  const shadowOpacityVal = useSharedValue(shadowOpacity);

  const animatedStyle = useAnimatedStyle(() => {
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

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(activeScale, { damping: 12, stiffness: 220 });
        shadowOpacityVal.value = withSpring(shadowOpacity * 1.8, { damping: 12, stiffness: 220 });
        elevationVal.value = withSpring(elevation + 4, { damping: 12, stiffness: 220 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
        shadowOpacityVal.value = withSpring(shadowOpacity, { damping: 12, stiffness: 220 });
        elevationVal.value = withSpring(elevation, { damping: 12, stiffness: 220 });
      }}
      style={[outerLayoutStyles, containerStyle, { overflow: 'visible' }]}
    >
      <AnimatedReanimated.View
        style={[
          {
            borderRadius,
            backgroundColor,
            ...Platform.select({
              ios: {
                shadowColor,
                shadowOffset,
                shadowRadius,
              },
            }),
          },
          animatedStyle,
        ]}
      >
        <View
          style={[
            {
              borderRadius,
              overflow: 'hidden',
              position: 'relative',
              borderWidth,
              borderColor,
            },
            innerStyle,
          ]}
        >
          {children}
        </View>
      </AnimatedReanimated.View>
    </Pressable>
  );
};
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import MapComponent from '../../components/MapComponent';

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { width } = Dimensions.get('window');

// Resolve Host IP for FastAPI proxy backend
const getHostIp = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost') {
      return ip;
    }
  }
  return '192.168.1.13'; // Fallback
};


const hexToRgba = (hex: string, alpha: number) => {
  if (!hex || typeof hex !== 'string') return `rgba(37, 99, 235, ${alpha})`;
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 3) {
    const r = parseInt(cleaned[0] + cleaned[0], 16);
    const g = parseInt(cleaned[1] + cleaned[1], 16);
    const b = parseInt(cleaned[2] + cleaned[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleaned.length === 6) {
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(37, 99, 235, ${alpha})`;
};

export default function NewRequestScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();
  const isDark = activeTheme === 'dark';

  const navigation = useNavigation();
  const isLeavingProgrammatically = useRef(false);

  const bureauId      = params.bureauId as string;
  const bureauNom     = params.bureauNom ? decodeURIComponent(params.bureauNom as string) : 'Nouvelle Demande';
  const bureauCouleur = params.bureauCouleur ? decodeURIComponent(params.bureauCouleur as string) : '#2563eb';
  const recoursId     = params.recours_id as string;
  const editId        = params.edit_id as string;
  const preselectedServiceId = params.preselectedServiceId as string;
  const preselectedActivityId = params.preselectedActivityId as string;

  const [step, setStep] = useState(recoursId ? 2 : 0);

  const [activeSubStep, setActiveSubStep] = useState(0);
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  const [services, setServices] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [loadingServices, setLoadingServices] = useState(false);
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');

  const filteredServices = services.filter(s => 
    s.nom.toLowerCase().includes(serviceSearchQuery.toLowerCase())
  );

  const [activities, setActivities] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const [loadingActivities, setLoadingActivities] = useState(false);

  const [showInfoModal, setShowInfoModal] = useState(false);

  const [champsDynamiques, setChampsDynamiques] = useState<any[]>([]);
  const [loadingActivityInfo, setLoadingActivityInfo] = useState(false);


  const [motif, setMotif] = useState('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const [regions, setRegions] = useState<any[]>([]);
  const [departements, setDepartements] = useState<any[]>([]);
  const [communes, setCommunes] = useState<any[]>([]);
  const [centres, setCentres] = useState<any[]>([]);
  const [filteredDepts, setFilteredDepts] = useState<any[]>([]);
  const [filteredCommunes, setFilteredCommunes] = useState<any[]>([]);
  const [filteredCentres, setFilteredCentres] = useState<any[]>([]);
  const [validCentresForActivity, setValidCentresForActivity] = useState<any[]>([]);
  
  // Nouveaux états dédiés au Lieu de dépôt
  const [depotRegion, setDepotRegion] = useState('');
  const [depotDepartement, setDepotDepartement] = useState('');
  const [depotCommune, setDepotCommune] = useState('');
  const [depotCentreName, setDepotCentreName] = useState('');
  const [selectedCentreId, setSelectedCentreId] = useState<number | null>(null);

  // Delivery Centre Selection States
  const [retraitAutreCentre, setRetraitAutreCentre] = useState(false);
  const [delivRegion, setDelivRegion] = useState('');
  const [delivDepartement, setDelivDepartement] = useState('');
  const [delivCommune, setDelivCommune] = useState('');
  const [delivCentreName, setDelivCentreName] = useState('');
  const [selectedDelivCentreId, setSelectedDelivCentreId] = useState<number | null>(null);

  // Filtered lists for delivery center selection
  const [delivFilteredDepts, setDelivFilteredDepts] = useState<any[]>([]);
  const [delivFilteredCommunes, setDelivFilteredCommunes] = useState<any[]>([]);
  const [delivFilteredCentres, setDelivFilteredCentres] = useState<any[]>([]);

  const [showSelectorModal, setShowSelectorModal] = useState(false);
  const [selectorTitle, setSelectorTitle] = useState('');
  const [selectorOptions, setSelectorOptions] = useState<any[]>([]);
  const [selectorCallback, setSelectorCallback] = useState<((v: any) => void) | null>(null);
  const [selectorSearchQuery, setSelectorSearchQuery] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentDateField, setCurrentDateField] = useState<string | null>(null);
  const [currentDateValue, setCurrentDateValue] = useState(new Date());

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentTimeField, setCurrentTimeField] = useState<string | null>(null);
  const [currentTimeValue, setCurrentTimeValue] = useState(new Date());
  const [showRdvDatePicker, setShowRdvDatePicker] = useState(false);

  // Nouveaux états dédiés au Rendez-vous
  const [rdvDate, setRdvDate] = useState<Date | null>(null);
  const [rdvHeure, setRdvHeure] = useState<string>('');
  const [creneauxDispo, setCreneauxDispo] = useState<string[]>([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);

  const [uploadedCni, setUploadedCni] = useState(false);
  const [uploadedJustif, setUploadedJustif] = useState(false);

  // Favoris states & handlers
  const [favorites, setFavorites] = useState<string[]>([]);
  const favoritesKey = user ? `favorite_activities_${user.id || user.email || 'guest'}` : 'favorite_activities_guest';
  
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem(favoritesKey);
        if (stored) {
          setFavorites(JSON.parse(stored));
        } else {
          setFavorites([]);
        }
      } catch (err) {
        console.warn('Failed to load favorites:', err);
      }
    };
    loadFavorites();
  }, [user]);

  const toggleFavorite = async (activityId: string, event: any) => {
    if (event && event.stopPropagation) {
      event.stopPropagation();
    }
    try {
      let updated: string[];
      if (favorites.includes(activityId)) {
        updated = favorites.filter(id => id !== activityId);
      } else {
        updated = [...favorites, activityId];
      }
      setFavorites(updated);
      await AsyncStorage.setItem(favoritesKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to save favorites:', err);
    }
  };
  const [cniBackendUrl, setCniBackendUrl] = useState<string | null>(null);
  const [justifBackendUrl, setJustifBackendUrl] = useState<string | null>(null);
  const [cniUploading, setCniUploading] = useState(false);
  const [justifUploading, setJustifUploading] = useState(false);
  const [fieldUploading, setFieldUploading] = useState<Record<string, boolean>>({});

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money'>('wave');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentOtp, setPaymentOtp] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  // PayTech Payment Gateway State
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Wave' | 'Orange Money' | 'Free Money' | 'Carte Bancaire' | 'ALL'>('ALL');
  const [showPaytechModal, setShowPaytechModal] = useState(false);
  const [paytechUrl, setPaytechUrl] = useState('');
  const [paytechToken, setPaytechToken] = useState('');
  const [paytechPollingId, setPaytechPollingId] = useState<any>(null);
  const [paytechProgress, setPaytechProgress] = useState(0);

  // Pre-filled payer information (editable by user)
  const [payerFullName, setPayerFullName] = useState(user?.nom_complet || '');
  const [payerPhone, setPayerPhone] = useState(user?.telephone || '');
  const [payerEmail, setPayerEmail] = useState(user?.email || '');

  // Keep synced if user state loads or updates
  useEffect(() => {
    if (user) {
      if (!payerFullName && user.nom_complet) setPayerFullName(user.nom_complet);
      if (!payerPhone && user.telephone) setPayerPhone(user.telephone);
      if (!payerEmail && user.email) setPayerEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (paytechPollingId) {
        clearInterval(paytechPollingId);
      }
    };
  }, [paytechPollingId]);

  const [findingLocation, setFindingLocation] = useState<boolean>(false);

  const getDistanceHaversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleFindClosestCentre = async () => {
    setFindingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La permission d\'accès à la localisation est requise pour trouver le centre le plus proche.');
        setFindingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      let minDistance = Infinity;
      let closestCentre: any = null;

      const candidates = validCentresForActivity.length > 0 
        ? validCentresForActivity 
        : centres;

      candidates.forEach((c: any) => {
        const fullCentreObj = centres.find(f => f.id === (c.id || c.centre_id));
        let lat = fullCentreObj?.latitude ?? c.latitude;
        let lon = fullCentreObj?.longitude ?? c.longitude;

        // Fallback to parent commune coordinates if centre has no coordinates
        if (lat === null || lon === null || lat === undefined || lon === undefined) {
          const comId = fullCentreObj?.commune_id || c.commune_id;
          const parentCommune = communes.find(co => co.id === comId);
          if (parentCommune && parentCommune.latitude !== null && parentCommune.longitude !== null) {
            lat = parentCommune.latitude;
            lon = parentCommune.longitude;
          }
        }

        if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
          const dist = getDistanceHaversine(latitude, longitude, parseFloat(lat), parseFloat(lon));
          if (dist < minDistance) {
            minDistance = dist;
            closestCentre = { ...c, latitude: parseFloat(lat), longitude: parseFloat(lon) };
          }
        }
      });

      if (closestCentre) {
        const fullC = centres.find(f => f.id === (closestCentre.id || closestCentre.centre_id));
        const comId = fullC?.commune_id;
        const comObj = communes.find(co => co.id === comId);
        const depId = comObj?.departement_id;
        const depObj = departements.find(d => d.id === depId);
        const regId = depObj?.region_id;
        const regObj = regions.find(r => r.id === regId);

        if (regObj) setDepotRegion(regObj.nom);
        if (depObj) {
          setDepotDepartement(depObj.nom);
          const possibleDepts = departements.filter((d: any) => d.region_id === regObj.id);
          const fDepts = validCentresForActivity.length > 0
            ? possibleDepts.filter(d => new Set(validCentresForActivity.filter(c => c.region_id === regObj.id).map(c => c.departement_id)).has(d.id))
            : possibleDepts;
          setFilteredDepts(fDepts);
        }
        if (comObj) {
          setDepotCommune(comObj.nom);
          const possibleComs = communes.filter((c: any) => c.departement_id === depObj.id);
          const fComs = validCentresForActivity.length > 0
            ? possibleComs.filter(com => new Set(validCentresForActivity.filter(c => c.departement_id === depObj.id).map(c => c.commune_id)).has(com.id))
            : possibleComs;
          setFilteredCommunes(fComs);
        }

        const possibleCens = centres.filter((c: any) => c.commune_id === comObj.id);
        const fCens = validCentresForActivity.length > 0
          ? possibleCens.filter(cen => new Set(validCentresForActivity.filter(c => c.commune_id === comObj.id).map(c => c.centre_id)).has(cen.id))
          : possibleCens;
        setFilteredCentres(fCens);

        setDepotCentreName(fullC?.nom || closestCentre.nom);
        setSelectedCentreId(fullC?.id || closestCentre.id);

        Alert.alert(
          'Centre trouvé !',
          `Le centre le plus proche est "${fullC?.nom || closestCentre.nom}" (commune de ${comObj?.nom || ''}) à environ ${minDistance.toFixed(1)} km.`
        );
      } else {
        Alert.alert('Aucun centre trouvé', 'Impossible de localiser un centre avec des coordonnées GPS valides.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', 'Impossible de récupérer votre position : ' + e.message);
    } finally {
      setFindingLocation(false);
    }
  };

  const openDelivSelector = (type: string) => {
    if (type === 'region') {
      openSelector('Sélectionner une région de délivrance', regions.map(r => ({ label: r.nom, value: r })), (region: any) => {
        setDelivRegion(region.nom);
        setDelivDepartement('');
        setDelivCommune('');
        setDelivCentreName('');
        setSelectedDelivCentreId(null);
        const possibleDepts = departements.filter((d: any) => d.region_id === region.id);
        setDelivFilteredDepts(possibleDepts);
      });
    } else if (type === 'departement') {
      if (!delivRegion) { Alert.alert('Requis', 'Veuillez sélectionner une région.'); return; }
      openSelector('Sélectionner un département de délivrance', delivFilteredDepts.map(d => ({ label: d.nom, value: d })), (dept: any) => {
        setDelivDepartement(dept.nom);
        setDelivCommune('');
        setDelivCentreName('');
        setSelectedDelivCentreId(null);
        const possibleComs = communes.filter((c: any) => c.departement_id === dept.id);
        setDelivFilteredCommunes(possibleComs);
      });
    } else if (type === 'commune') {
      if (!delivDepartement) { Alert.alert('Requis', 'Veuillez sélectionner un département.'); return; }
      openSelector('Sélectionner une commune de délivrance', delivFilteredCommunes.map(c => ({ label: c.nom, value: c })), (com: any) => {
        setDelivCommune(com.nom);
        setDelivCentreName('');
        setSelectedDelivCentreId(null);
        const possibleCens = centres.filter((c: any) => c.commune_id === com.id);
        setDelivFilteredCentres(possibleCens);
      });
    } else if (type === 'centre') {
      if (!delivCommune) { Alert.alert('Requis', 'Veuillez sélectionner une commune.'); return; }
      openSelector('Sélectionner un centre de délivrance', delivFilteredCentres.map(c => ({ label: c.nom, value: c })), (cen: any) => {
        if (selectedCentreId && cen.id === selectedCentreId) {
          Alert.alert('Info', 'Le centre de délivrance est identique au centre de traitement. Le routage inter-centre ne sera pas nécessaire.');
        }
        setDelivCentreName(cen.nom);
        setSelectedDelivCentreId(cen.id);
      });
    }
  };

  const handleFindClosestDelivCentre = async () => {
    setFindingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'La permission d\'accès à la localisation est requise pour trouver le centre le plus proche.');
        setFindingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      let minDistance = Infinity;
      let closestCentre: any = null;

      centres.forEach((c: any) => {
        const fullCentreObj = centres.find(f => f.id === c.id);
        let lat = fullCentreObj?.latitude ?? c.latitude;
        let lon = fullCentreObj?.longitude ?? c.longitude;

        if (lat === null || lon === null || lat === undefined || lon === undefined) {
          const comId = fullCentreObj?.commune_id || c.commune_id;
          const parentCommune = communes.find(co => co.id === comId);
          if (parentCommune && parentCommune.latitude !== null && parentCommune.longitude !== null) {
            lat = parentCommune.latitude;
            lon = parentCommune.longitude;
          }
        }

        if (lat !== null && lon !== null && lat !== undefined && lon !== undefined) {
          const dist = getDistanceHaversine(latitude, longitude, parseFloat(lat), parseFloat(lon));
          if (dist < minDistance) {
            minDistance = dist;
            closestCentre = { ...c, latitude: parseFloat(lat), longitude: parseFloat(lon) };
          }
        }
      });

      if (closestCentre) {
        const fullC = centres.find(f => f.id === closestCentre.id);
        const comId = fullC?.commune_id;
        const comObj = communes.find(co => co.id === comId);
        const depId = comObj?.departement_id;
        const depObj = departements.find(d => d.id === depId);
        const regId = depObj?.region_id;
        const regObj = regions.find(r => r.id === regId);

        if (regObj) setDelivRegion(regObj.nom);
        if (depObj) {
          setDelivDepartement(depObj.nom);
          const possibleDepts = departements.filter((d: any) => d.region_id === regObj.id);
          setDelivFilteredDepts(possibleDepts);
        }
        if (comObj) {
          setDelivCommune(comObj.nom);
          const possibleComs = communes.filter((c: any) => c.departement_id === depObj.id);
          setDelivFilteredCommunes(possibleComs);
        }
        if (fullC) {
          setDelivCentreName(fullC.nom);
          setSelectedDelivCentreId(fullC.id);
          const possibleCens = centres.filter((c: any) => c.commune_id === comObj.id);
          setDelivFilteredCentres(possibleCens);
        }
        Alert.alert('Succès', `Le centre de délivrance le plus proche identifié est : ${fullC?.nom}`);
      } else {
        Alert.alert('Info', 'Aucun centre avec des coordonnées valides n\'a été trouvé.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', 'Impossible de récupérer la position : ' + err.message);
    } finally {
      setFindingLocation(false);
    }
  };

  // ─── EFFECTS POUR CRENEAUX DE RDV ──────────────────────────────────────────
  useEffect(() => {
    if (rdvDate && selectedCentreId) {
      setLoadingCreneaux(true);
      // Correction du décalage horaire pour formater la date en YYYY-MM-DD
      const year = rdvDate.getFullYear();
      const month = String(rdvDate.getMonth() + 1).padStart(2, '0');
      const day = String(rdvDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      apiFetch(`/rendez-vous/disponibilites?centreId=${selectedCentreId}&date=${dateStr}`)
        .then(res => {
          if (res && res.status === 'success') {
            const rawData = Array.isArray(res.data) ? res.data : (res.data?.disponibilites || []);
            const formattedTimes = rawData.map((t: any) => {
              if (Array.isArray(t)) return `${String(t[0]).padStart(2, '0')}:${String(t[1]).padStart(2, '0')}`;
              if (typeof t === 'string') return t.substring(0, 5);
              return String(t);
            });
            setCreneauxDispo(formattedTimes);
          } else {
            setCreneauxDispo([]);
          }
        })
        .catch(() => setCreneauxDispo([]))
        .finally(() => setLoadingCreneaux(false));
    } else {
      setCreneauxDispo([]);
    }
  }, [rdvDate, selectedCentreId]);

  // ─── INITIAL LOAD ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (bureauId) loadServices(bureauId);
  }, [bureauId]);

  // ─── AUTO-SYNC: listen for background catalog refresh ──────────────────────
  // The SyncEngine refreshes services/activities every 90 s in background.
  // When it finishes, we silently reload the list for the current bureau so
  // any admin change appears instantly without the user pulling to refresh.
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('catalog_updated', () => {
      if (bureauId) {
        console.log('[new.tsx] catalog_updated received — refreshing services silently');
        loadServicesSilent(bureauId);
      }
    });
    return () => sub.remove();
  }, [bureauId, selectedService]);

  // ─── FAVORITES PRE-SELECTION: Auto-select document types ───────────────────
  useEffect(() => {
    if (services.length > 0 && preselectedServiceId && !selectedService) {
      const foundService = services.find(s => s.id.toString() === preselectedServiceId.toString());
      if (foundService) {
        setSelectedService(foundService);
        setActiveSubStep(1);
        // Load activities for this service
        loadActivitiesForPreselected(foundService.id);
      }
    }
  }, [services, preselectedServiceId]);

  // ─── POLLING: Refresh services silently every 4 seconds ────────────────────
  useEffect(() => {
    if (!bureauId) return;
    const interval = setInterval(() => {
      loadServicesSilent(bureauId);
    }, 4000);
    return () => clearInterval(interval);
  }, [bureauId, selectedService]);

  const loadActivitiesForPreselected = async (serviceId: any) => {
    setLoadingActivities(true);
    try {
      const res = await apiFetch(`/activities?serviceId=${serviceId}&t=${Date.now()}`);
      if (res.status === 'success') {
        const acts = res.data.activities || [];
        setActivities(acts);
        
        if (preselectedActivityId) {
          const foundActivity = acts.find((a: any) => a.id.toString() === preselectedActivityId.toString());
          if (foundActivity) {
            setSelectedActivity(foundActivity);
            // Pre-select and go directly to step 1 (Lieu de dépôt)
            setStep(1);
          }
        }
      }
    } catch (err) {
      console.warn('Error loading activities for preselected favorite:', err);
    } finally {
      setLoadingActivities(false);
    }
  };

  const loadServices = async (id: string) => {
    setLoadingServices(true);
    try {
      const res = await apiFetch(`/services?bureauId=${id}&t=${Date.now()}`);
      if (res.status === 'success') {
        setServices(res.data.services || []);
        setLoadingServices(false);
        return;
      }
    } catch (err) {
      console.warn('[new.tsx] Online fetch for services failed, trying cache...');
    }
    // Fallback: load from SQLite cache
    try {
      const cached = await getFromCache('historique_cache', `/services?bureauId=${id}`);
      if (cached && cached.data?.services) {
        console.log('[new.tsx] Services loaded from cache (offline mode).');
        setServices(cached.data.services);
      }
    } catch (e) {
      console.warn('[new.tsx] Cache fallback failed:', e);
    } finally {
      setLoadingServices(false);
    }
  };

  /** Silent reload: does NOT set loadingServices=true, so UI won't flash */
  const loadServicesSilent = async (id: string) => {
    try {
      const res = await apiFetch(`/services?bureauId=${id}&t=${Date.now()}`);
      if (res?.status === 'success') {
        setServices(res.data.services || []);
        // If a service is currently selected, refresh activities for it too
        if (selectedService) {
          const actRes = await apiFetch(`/activities?serviceId=${selectedService.id}&t=${Date.now()}`);
          if (actRes?.status === 'success') {
            setActivities(actRes.data.activities || []);
          }
        }
      }
    } catch (e) {
      /* Silent failure — don't disturb the user */
    }
  };


  const handleSelectService = async (service: any) => {
    setSelectedService(service);
    setSelectedActivity(null);
    setChampsDynamiques([]);
    setActivitySearchQuery('');
    
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveSubStep(1);
    
    setLoadingActivities(true);
    try {
      const res = await apiFetch(`/activities?serviceId=${service.id}&t=${Date.now()}`);
      if (res.status === 'success') {
        setActivities(res.data.activities || []);
        setLoadingActivities(false);
        return;
      }
    } catch (err) {
      console.warn('[new.tsx] Online fetch for activities failed, trying cache...');
    }
    // Fallback from cache
    try {
      const cached = await getFromCache('historique_cache', `/activities?serviceId=${service.id}`);
      if (cached && cached.data?.activities) {
        console.log('[new.tsx] Activities loaded from cache (offline mode).');
        setActivities(cached.data.activities);
      }
    } catch (e) {
      console.warn('[new.tsx] Cache fallback for activities failed:', e);
    } finally {
      setLoadingActivities(false);
    }
  };

  const handleSelectActivity = async (activity: any) => {
    if (activity.presence_physique_requise && !recoursId && !editId) {
      Alert.alert(
        'Présence physique requise',
        'Cette démarche nécessite une présence physique dans un centre administratif pour finaliser votre dossier. Vous devrez vous présenter avec les documents originaux correspondant aux copies téléversées sur la plateforme.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'J\'ai compris', onPress: () => {
              setSelectedActivity(activity);
              loadActivityInfo(activity.id);
            }
          }
        ]
      );
    } else {
      setSelectedActivity(activity);
      loadActivityInfo(activity.id);
    }
  };

  const loadActivityInfo = async (id: string) => {
    setLoadingActivityInfo(true);
    try {
      let act: any = null;
      let centresList: any[] = [];

      // Try local cache first for instant resolution
      try {
        const cachedAct = await getFromCache('historique_cache', `/activities/${id}`);
        if (cachedAct && cachedAct.data?.activity) {
          act = cachedAct.data.activity;
        }
        const cachedCentres = await getFromCache('historique_cache', `/centres/disponibilite/activity/${id}`);
        if (cachedCentres && cachedCentres.data?.centres) {
          centresList = cachedCentres.data.centres;
        }
      } catch (e) {
        console.warn('[new.tsx] Failed to check activity/centres cache:', e);
      }

      // If not fully cached, perform parallel fetch
      if (!act || centresList.length === 0) {
        try {
          const [actRes, centresRes] = await Promise.all([
            apiFetch(`/activities/${id}`).catch(() => null),
            apiFetch(`/centres/disponibilite/activity/${id}`).catch(() => null)
          ]);
          if (actRes && actRes.status === 'success' && actRes.data?.activity) {
            act = actRes.data.activity;
          }
          if (centresRes && centresRes.status === 'success') {
            centresList = centresRes.data.centres || [];
          }
        } catch (netErr) {
          console.warn('[new.tsx] Online fetch for activity detail failed:', netErr);
        }
      } else {
        // Silently update cache in the background
        Promise.all([
          apiFetch(`/activities/${id}`).catch(() => null),
          apiFetch(`/centres/disponibilite/activity/${id}`).catch(() => null)
        ]);
      }

      if (act) {
        setSelectedActivity(act);
        if (act.champs_dynamiques && act.champs_dynamiques.length > 0) {
          setChampsDynamiques(act.champs_dynamiques);
        } else if (Array.isArray(act.champs_requis)) {
          const legacy = act.champs_requis.map((label: string, i: number) => ({
            id: i, nom_champ: label, label, type_champ: guessType(label),
            obligatoire: true, ordre: i, placeholder: `Saisir : ${label.toLowerCase()}`,
          }));
          setChampsDynamiques(legacy);
        } else {
          setChampsDynamiques([]);
        }

        const list = (centresList || []).map((c: any) => ({
          ...c,
          id: c.id || c.centre_id,
          nom: c.nom || c.centre_nom
        }));
        setValidCentresForActivity(list);

        if (list.length === 0) {
          NetInfo.fetch().then(netState => {
            if (netState.isConnected !== false) {
              Alert.alert(
                'Non disponible',
                `Cette démarche n'est pas encore disponible dans aucune commune.\n\nRevenez plus tard ou contactez l'administration.`,
                [{ text: 'OK', onPress: () => {
                  setSelectedActivity(null);
                  setChampsDynamiques([]);
                }}]
              );
            }
          });
        }
        return act;
      } else {
        console.warn('Activity not found or error loading activity info:', id);
      }
    } catch (err) {
      console.error('Error loading activity info:', err);
    } finally {
      setLoadingActivityInfo(false);
    }
    return null;
  };

  const guessType = (label: string): string => {
    const l = label.toLowerCase();
    if (l.includes('région') || l === 'région') return 'region';
    if (l.includes('département')) return 'departement';
    if (l.includes('commune')) return 'commune';
    if (l.includes('centre')) return 'centre';
    if (l.includes('sexe')) return 'sexe';
    if (l.includes('date')) return 'date';
    if (l.includes('cni') || l.includes('téléphone') || l.includes('tel')) return 'phone';
    if (l.includes('année') || l.includes('annee') || l.includes('numéro')) return 'number';
    return 'text';
  };

  useEffect(() => {
    const loadDivisions = async () => {
      try {
        const [regRes, depRes, comRes, cenRes] = await Promise.all([
          apiFetch('/divisions/regions'), apiFetch('/divisions/departements'),
          apiFetch('/divisions/communes'), apiFetch('/divisions/centres'),
        ]);
        if (regRes.status === 'success') setRegions(regRes.data.regions || []);
        if (depRes.status === 'success') setDepartements(depRes.data.departements || []);
        if (comRes.status === 'success') setCommunes(comRes.data.communes || []);
        if (cenRes.status === 'success') setCentres(cenRes.data.centres || []);
      } catch (err) {
        // Fallback to cache for offline mode
        console.warn('[new.tsx] Online fetch for divisions failed, trying cache...');
        try {
          const [regC, depC, comC, cenC] = await Promise.all([
            getFromCache('historique_cache', '/divisions/regions'),
            getFromCache('historique_cache', '/divisions/departements'),
            getFromCache('historique_cache', '/divisions/communes'),
            getFromCache('historique_cache', '/divisions/centres'),
          ]);
          if (regC?.data?.regions) setRegions(regC.data.regions);
          if (depC?.data?.departements) setDepartements(depC.data.departements);
          if (comC?.data?.communes) setCommunes(comC.data.communes);
          if (cenC?.data?.centres) setCentres(cenC.data.centres);
          console.log('[new.tsx] Divisions loaded from cache (offline mode).');
        } catch (ce) {
          console.warn('[new.tsx] Cache fallback for divisions failed:', ce);
        }
      }
    };
    loadDivisions();
  }, []);

  useEffect(() => {
    if (selectedCentreId && regions.length > 0 && departements.length > 0 && communes.length > 0 && centres.length > 0) {
      const fullC = centres.find(f => f.id === selectedCentreId);
      if (fullC) {
        setDepotCentreName(fullC.nom);
        const comObj = communes.find(co => co.id === fullC.commune_id);
        if (comObj) {
          setDepotCommune(comObj.nom);
          const depObj = departements.find(d => d.id === comObj.departement_id);
          if (depObj) {
            setDepotDepartement(depObj.nom);
            const regObj = regions.find(r => r.id === depObj.region_id);
            if (regObj) {
              setDepotRegion(regObj.nom);
            }
          }
        }
      }
    }
  }, [selectedCentreId, regions, departements, communes, centres]);

  useEffect(() => {
    if (selectedDelivCentreId && regions.length > 0 && departements.length > 0 && communes.length > 0 && centres.length > 0) {
      const fullC = centres.find(f => f.id === selectedDelivCentreId);
      if (fullC) {
        setDelivCentreName(fullC.nom);
        const comObj = communes.find(co => co.id === fullC.commune_id);
        if (comObj) {
          setDelivCommune(comObj.nom);
          const depObj = departements.find(d => d.id === comObj.departement_id);
          if (depObj) {
            setDelivDepartement(depObj.nom);
            const regObj = regions.find(r => r.id === depObj.region_id);
            if (regObj) {
              setDelivRegion(regObj.nom);
            }
          }
        }
      }
    }
  }, [selectedDelivCentreId, regions, departements, communes, centres]);

  useEffect(() => {
    if (!recoursId) return;
    const loadRecours = async () => {
      try {
        const res = await apiFetch('/demandes');
        if (res.status === 'success') {
          const found = (res.data.demandes || []).find((d: any) => d.id.toString() === recoursId);
          if (found) {
            const act = await loadActivityInfo(found.activite_id?.toString() || '');
            const vals: Record<string, string> = {};
            
            // Prefill text/selection data
            Object.entries(found.donnees || {}).forEach(([k, v]) => {
              if (k !== 'type_document' && k !== 'destinataire') vals[k] = v as string;
            });

            // Prefill motif
            if (found.motif) {
              setMotif(found.motif);
            }

            // Prefill files/documents
            if (act && found.documents_url) {
              const champsList = act.champs_dynamiques && act.champs_dynamiques.length > 0
                ? act.champs_dynamiques
                : (Array.isArray(act.champs_requis)
                    ? act.champs_requis.map((label: string, i: number) => ({
                        id: i, nom_champ: label, label, type_champ: guessType(label),
                        obligatoire: true, ordre: i, placeholder: `Saisir : ${label.toLowerCase()}`,
                      }))
                    : []);

              champsList.forEach((champ: any) => {
                if (champ.type_champ === 'file') {
                  const fileUrl = found.documents_url[champ.label];
                  if (fileUrl) {
                    vals[champ.nom_champ] = fileUrl;
                  }
                }
              });
            }

            setFormValues(vals);
            if (found.centre_id) {
              setSelectedCentreId(found.centre_id);
            }
          }
        }
      } catch (err) {}
    };
    loadRecours();
  }, [recoursId]);

  // ─── PRE-FILL EN MODE ÉDITION (édit_id) ───────────────────────────────────
  useEffect(() => {
    if (!editId) return;
    setStep(0);
    const loadEdit = async () => {
      try {
        let found: any = null;

        // 1. Try local history cache first for zero-latency loading
        try {
          const cached = await getFromCache('historique_cache', '/demandes');
          if (cached && cached.status === 'success' && cached.data) {
            const list = cached.data.demandes || [];
            found = list.find((item: any) => item.id?.toString() === editId);
          }
        } catch (e) {
          console.warn('[new.tsx] Failed to check demands cache:', e);
        }

        // 2. Try offline SQLite if it starts with offline prefix
        if (editId.startsWith('offline_')) {
          const { getDb } = require('../../database/localDb');
          const database = await getDb();
          const result = (await database.getFirstAsync(
            `SELECT id, payload FROM demandes_offline WHERE id = ?`, [editId]
          )) as any;
          if (result) {
            let parsed: any = {};
            try { parsed = JSON.parse(result.payload); } catch (e) {}
            found = {
              id: result.id,
              activite_id: parsed.activiteId,
              centre_id: parsed.centreId,
              donnees: parsed.donnees,
              documents_url: parsed.documents_url,
              motif: parsed.motif,
              isOffline: true
            };
          }
        }

        // 3. Fallback to API if not cached or offline
        if (!found && !editId.startsWith('offline_')) {
          try {
            const res = await apiFetch(`/demandes/${editId}`);
            if (res && res.status === 'success' && res.data?.demande) {
              found = res.data.demande;
            }
          } catch (netErr) {
            console.warn('[new.tsx] API fetch for single demand edit failed:', netErr);
          }
        }

        if (found) {
          const actId = found.activite_id || found.activiteId;
          const centreId = found.centre_id || found.centreId;
          if (found.motif) setMotif(found.motif);
          if (centreId) setSelectedCentreId(centreId);
          const delivId = found.centre_delivrance_id || found.centreDelivranceId;
          if (delivId) {
            setRetraitAutreCentre(true);
            setSelectedDelivCentreId(delivId);
          } else {
            setRetraitAutreCentre(false);
          }

          if (actId) {
            const act = await loadActivityInfo(actId.toString());
            if (act) {
              setSelectedService({ id: act.service_id, nom: act.service_nom });

              // Build and populate form inputs
              const vals: Record<string, string> = {};
              Object.entries(found.donnees || {}).forEach(([k, v]) => {
                if (k !== 'type_document' && k !== 'destinataire') vals[k] = v as string;
              });

              // Populate files/documents
              const champsList = act.champs_dynamiques && act.champs_dynamiques.length > 0
                ? act.champs_dynamiques : [];
              champsList.forEach((champ: any) => {
                if (champ.type_champ === 'file' && found.documents_url) {
                  const fileUrl = found.documents_url[champ.label];
                  if (fileUrl) vals[champ.nom_champ] = fileUrl;
                }
              });

              setFormValues(vals);

              // Background fetch for service activities to ensure fast navigation
              apiFetch(`/activities?serviceId=${act.service_id}`)
                .then(res => {
                  if (res.status === 'success') {
                    setActivities(res.data.activities || []);
                  }
                })
                .catch(e => console.warn('[new.tsx] Service activities silent pre-fetch failed:', e));

              setActiveSubStep(1);
            }
          }
        }
      } catch (err) {
        console.error('[edit mode] Erreur générale chargement demande:', err);
      }
    };
    loadEdit();
  }, [editId]);

  const openSelector = (title: string, options: any[], cb: (v: any) => void) => {
    setSelectorTitle(title); setSelectorOptions(options); setSelectorCallback(() => cb); setShowSelectorModal(true);
    setSelectorSearchQuery('');
  };

  const openDepotSelector = (type: string) => {
    if (type === 'region') {
      const fRegs = validCentresForActivity.length > 0 
        ? regions.filter(r => new Set(validCentresForActivity.map(c => c.region_id)).has(r.id))
        : regions;
      if (fRegs.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans votre région. Veuillez choisir une autre démarche.");
        return;
      }
      openSelector('Sélectionner une région', fRegs.map(r => ({ label: r.nom, value: r })), (region: any) => {
        setDepotRegion(region.nom);
        setDepotDepartement('');
        setDepotCommune('');
        setDepotCentreName('');
        setSelectedCentreId(null);
        const possibleDepts = departements.filter((d: any) => d.region_id === region.id);
        const fDepts = validCentresForActivity.length > 0
          ? possibleDepts.filter(d => new Set(validCentresForActivity.filter(c => c.region_id === region.id).map(c => c.departement_id)).has(d.id))
          : possibleDepts;
        setFilteredDepts(fDepts);
      });
    } else if (type === 'departement') {
      if (!depotRegion) { Alert.alert('Requis', 'Veuillez sélectionner une région.'); return; }
      if (filteredDepts.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans aucun département de cette région.");
        return;
      }
      openSelector('Sélectionner un département', filteredDepts.map(d => ({ label: d.nom, value: d })), (dept: any) => {
        setDepotDepartement(dept.nom);
        setDepotCommune('');
        setDepotCentreName('');
        setSelectedCentreId(null);
        const possibleComs = communes.filter((c: any) => c.departement_id === dept.id);
        const fComs = validCentresForActivity.length > 0
          ? possibleComs.filter(com => new Set(validCentresForActivity.filter(c => c.departement_id === dept.id).map(c => c.commune_id)).has(com.id))
          : possibleComs;
        setFilteredCommunes(fComs);
      });
    } else if (type === 'commune') {
      if (!depotDepartement) { Alert.alert('Requis', 'Veuillez sélectionner un département.'); return; }
      if (filteredCommunes.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans aucune commune de ce département.");
        return;
      }
      openSelector('Sélectionner une commune', filteredCommunes.map(c => ({ label: c.nom, value: c })), (com: any) => {
        setDepotCommune(com.nom);
        setDepotCentreName('');
        setSelectedCentreId(null);
        const possibleCens = centres.filter((c: any) => c.commune_id === com.id);
        const fCens = validCentresForActivity.length > 0
          ? possibleCens.filter(cen => new Set(validCentresForActivity.filter(c => c.commune_id === com.id).map(c => c.centre_id)).has(cen.id))
          : possibleCens;
        setFilteredCentres(fCens);
      });
    } else if (type === 'centre') {
      if (!depotCommune) { Alert.alert('Requis', 'Veuillez sélectionner une commune.'); return; }
      if (filteredCentres.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans aucun centre d'état civil de cette commune.");
        return;
      }
      openSelector('Sélectionner un centre de dépôt', filteredCentres.map(c => ({ label: c.nom, value: c })), async (cen: any) => {
        try {
          const res = await apiFetch(`/centres/${cen.id}/disponibilite`);
          if (res.status === 'success') {
            let isAvailable = false;
            const servicesDispo = res.data.services_disponibles || res.data.services || [];
            for (const s of servicesDispo) {
              if (s.activites) {
                for (const a of s.activites) {
                  if (a.activite_id === selectedActivity?.id) {
                    isAvailable = true;
                    break;
                  }
                }
              }
            }
            if (!isAvailable) {
              Alert.alert('Non disponible', `L'activité "${selectedActivity?.nom}" n'est pas disponible dans le centre sélectionné (${cen.nom}).\nVeuillez choisir un autre centre ou contacter l'administration.`);
              return;
            }
          }
        } catch (e) {
          console.warn('Erreur vérification disponibilité:', e);
        }
        setDepotCentreName(cen.nom);
        setSelectedCentreId(cen.id);
      });
    }
  };

  const openGeoSelector = (type: string, champ: any) => {
    const fieldKey = champ.nom_champ;
    if (type === 'region') {
      const fRegs = validCentresForActivity.length > 0 
        ? regions.filter(r => new Set(validCentresForActivity.map(c => c.region_id)).has(r.id))
        : regions;
      if (fRegs.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans votre région. Veuillez choisir une autre démarche.");
        return;
      }
      openSelector('Sélectionner une région', fRegs.map(r => ({ label: r.nom, value: r })), (region: any) => {
        setFormValues(prev => ({ ...prev, [fieldKey]: region.nom, region: region.nom, departement: '', commune: '', centre: '' }));
        const possibleDepts = departements.filter((d: any) => d.region_id === region.id);
        const fDepts = validCentresForActivity.length > 0
          ? possibleDepts.filter(d => new Set(validCentresForActivity.filter(c => c.region_id === region.id).map(c => c.departement_id)).has(d.id))
          : possibleDepts;
        setFilteredDepts(fDepts);
      });
    } else if (type === 'departement') {
      if (!formValues['region']) { Alert.alert('Requis', 'Veuillez sélectionner une région.'); return; }
      if (filteredDepts.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans aucun département de cette région.");
        return;
      }
      openSelector('Sélectionner un département', filteredDepts.map(d => ({ label: d.nom, value: d })), (dept: any) => {
        setFormValues(prev => ({ ...prev, [fieldKey]: dept.nom, departement: dept.nom, commune: '', centre: '' }));
        const possibleComs = communes.filter((c: any) => c.departement_id === dept.id);
        const fComs = validCentresForActivity.length > 0
          ? possibleComs.filter(com => new Set(validCentresForActivity.filter(c => c.departement_id === dept.id).map(c => c.commune_id)).has(com.id))
          : possibleComs;
        setFilteredCommunes(fComs);
      });
    } else if (type === 'commune') {
      if (!formValues['departement']) { Alert.alert('Requis', 'Veuillez sélectionner un département.'); return; }
      if (filteredCommunes.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans aucune commune de ce département.");
        return;
      }
      openSelector('Sélectionner une commune', filteredCommunes.map(c => ({ label: c.nom, value: c })), (com: any) => {
        setFormValues(prev => ({ ...prev, [fieldKey]: com.nom, commune: com.nom, centre: '' }));
        const possibleCens = centres.filter((c: any) => c.commune_id === com.id);
        const fCens = validCentresForActivity.length > 0
          ? possibleCens.filter(cen => new Set(validCentresForActivity.filter(c => c.commune_id === com.id).map(c => c.centre_id)).has(cen.id))
          : possibleCens;
        setFilteredCentres(fCens);
      });
    } else if (type === 'centre') {
      if (!formValues['commune']) { Alert.alert('Requis', 'Veuillez sélectionner une commune.'); return; }
      if (filteredCentres.length === 0) {
        Alert.alert('Non disponible', "Cette démarche n'est pas disponible dans aucun centre d'état civil de cette commune.");
        return;
      }
      openSelector('Sélectionner un centre', filteredCentres.map(c => ({ label: c.nom, value: c })), async (cen: any) => {
        try {
          const res = await apiFetch(`/centres/${cen.id}/disponibilite`);
          if (res.status === 'success') {
            let isAvailable = false;
            const servicesDispo = res.data.services_disponibles || res.data.services || [];
            for (const s of servicesDispo) {
              if (s.activites) {
                for (const a of s.activites) {
                  if (a.activite_id === selectedActivity?.id) {
                    isAvailable = true;
                    break;
                  }
                }
              }
            }
            if (!isAvailable) {
              Alert.alert('Non disponible', `L'activité "${selectedActivity?.nom}" n'est pas disponible dans le centre sélectionné (${cen.nom}).\nVeuillez choisir un autre centre ou contacter l'administration.`);
              return;
            }
          }
        } catch (e) {
          console.warn('Erreur vérification disponibilité:', e);
        }
        setFormValues(prev => ({ ...prev, [fieldKey]: cen.nom, centre: cen.nom }));
      });
    } else if (type === 'sexe') {
      openSelector('Sexe', [{ label: 'Masculin', value: 'Masculin' }, { label: 'Féminin', value: 'Féminin' }], val => setFormValues(prev => ({ ...prev, [fieldKey]: val })));
    } else if (type === 'select') {
      let opts: any[] = [];
      try { opts = typeof champ.options === 'string' ? JSON.parse(champ.options) : (Array.isArray(champ.options) ? champ.options : []); } catch (e) {}
      openSelector(champ.label, opts.map(o => ({ label: o.label || o.value, value: o.value })), val => setFormValues(prev => ({ ...prev, [fieldKey]: val })));
    }
  };

  const launchSource = async (docType: 'cni' | 'justif', source: 'camera' | 'library' | 'document', champ?: any) => {
    if (champ) setFieldUploading(prev => ({ ...prev, [champ.nom_champ]: true }));
    else if (docType === 'cni') setCniUploading(true); 
    else setJustifUploading(true);

    try {
      let asset: any = null;
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert('Permission refusée'); return; }
        const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
        if (!result.canceled && result.assets?.[0]) asset = result.assets[0];
      } else if (source === 'library') {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        if (!result.canceled && result.assets?.[0]) asset = result.assets[0];
      } else if (source === 'document') {
        const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
        if (!result.canceled && result.assets?.[0]) asset = result.assets[0];
      }

      if (asset) {
        const docName = asset.name || asset.fileName || `${docType}_${Date.now()}.${asset.uri?.endsWith('.png') ? 'png' : asset.uri?.endsWith('.pdf') ? 'pdf' : 'jpg'}`;
        const docExt = docName.split('.').pop()?.toLowerCase();
        let docMime = asset.mimeType;
        if (!docMime || docMime === 'application/octet-stream') {
          if (docExt === 'png') docMime = 'image/png';
          else if (docExt === 'pdf') docMime = 'application/pdf';
          else docMime = 'image/jpeg';
        }

        const uploadRes = await apiUpload('/upload', { 
          uri: asset.uri, 
          type: docMime, 
          name: docName 
        });

        if (uploadRes.status === 'success' && uploadRes.data?.url) {
          const url = uploadRes.data.url;
          if (champ) {
            setFormValues(prev => ({ ...prev, [champ.nom_champ]: url }));
          } else {
            if (docType === 'cni') { setCniBackendUrl(url); setUploadedCni(true); }
            else { setJustifBackendUrl(url); setUploadedJustif(true); }
          }
          Alert.alert('Succès', 'Document téléversé avec succès !');
        } else {
          throw new Error(uploadRes.message || 'Échec du téléversement du fichier.');
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur de téléversement', err.message || 'Impossible d\'envoyer le fichier sur le serveur.');
    } finally {
      if (champ) setFieldUploading(prev => ({ ...prev, [champ.nom_champ]: false }));
      else if (docType === 'cni') setCniUploading(false);
      else setJustifUploading(false);
    }
  };
  const pickAndUpload = (docType: 'cni' | 'justif') => {
    Alert.alert('Document', 'Source :', [
      { text: 'Appareil photo', onPress: () => launchSource(docType, 'camera') },
      { text: 'Galerie', onPress: () => launchSource(docType, 'library') },
      { text: 'Fichier/Document', onPress: () => launchSource(docType, 'document') },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };
  const pickAndUploadField = (champ: any) => {
    Alert.alert('Document', 'Source :', [
      { text: 'Appareil photo', onPress: () => launchSource('justif', 'camera', champ) },
      { text: 'Galerie', onPress: () => launchSource('justif', 'library', champ) },
      { text: 'Fichier/Document', onPress: () => launchSource('justif', 'document', champ) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const startScanning = () => {
    setScanning(true); setScanProgress(0);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setScanning(false);
            const autofills: Record<string, string> = {};
            champsDynamiques.forEach(c => {
              const l = c.label.toLowerCase();
              if (l.includes('cni')) autofills[c.nom_champ] = '1770199502841';
              else if (l.includes('année') || l.includes('annee')) autofills[c.nom_champ] = '1995';
              else if (l.includes('acte')) autofills[c.nom_champ] = 'ACT-9844-95';
              else if (l.includes('nom') && l.includes('mère')) autofills[c.nom_champ] = 'Kalila';
              else if (l.includes('nom')) autofills[c.nom_champ] = 'Diallo';
              else if (l.includes('prénom') && l.includes('père')) autofills[c.nom_champ] = 'Ibrahima';
              else if (l.includes('prénom')) autofills[c.nom_champ] = 'Mamadou';
              else if (l.includes('date')) autofills[c.nom_champ] = '15/06/1995';
              else if (l.includes('lieu')) autofills[c.nom_champ] = 'Dakar';
              else if (l.includes('sexe')) autofills[c.nom_champ] = 'Masculin';
            });
            setFormValues(prev => ({ ...prev, ...autofills }));
            Alert.alert('CNI Scannée ✓', 'Données extraites automatiquement !');
          }, 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const shouldShowField = (c: any, values: any) => {
    // 1. Filter by Motif if applicable
    if (selectedActivity?.motifs && selectedActivity.motifs.length > 0) {
      let parsedMotifs = [];
      try {
        parsedMotifs = typeof selectedActivity.motifs === 'string' ? JSON.parse(selectedActivity.motifs) : selectedActivity.motifs;
      } catch (e) {}
      if (Array.isArray(parsedMotifs) && parsedMotifs.length > 0) {
        const isSpecific = c.conditions && c.conditions.motifs && c.conditions.motifs.length > 0;
        const legacyMotif = c.motif_lie;
        if (isSpecific && !c.conditions.motifs.includes(motif)) {
          return false;
        } else if (legacyMotif && legacyMotif !== motif) {
          return false;
        }
      }
    }

    // 2. Check parent condition (yesno / select)
    if (c.conditions && c.conditions.field) {
      const parentVal = values[c.conditions.field];
      return parentVal === c.conditions.value;
    }

    return true;
  };

  const buildDonnees = () => {
    const donnees: Record<string, any> = { 
      type_document: selectedActivity?.nom || ''
    };
    champsDynamiques.forEach(c => { 
      if (shouldShowField(c, formValues) && c.type_champ !== 'file') {
        donnees[c.nom_champ] = formValues[c.nom_champ] || ''; 
      }
    });
    return donnees;
  };

  const buildDocumentsUrl = () => {
    const docs: Record<string, string> = {};
    champsDynamiques.forEach(c => {
      if (shouldShowField(c, formValues) && c.type_champ === 'file' && formValues[c.nom_champ]) {
        docs[c.label] = formValues[c.nom_champ];
      }
    });
    return docs;
  };

  const validateStep1 = () => {
    if (!depotRegion) { Alert.alert('Requis', 'Veuillez sélectionner une région.'); return false; }
    if (!depotDepartement) { Alert.alert('Requis', 'Veuillez sélectionner un département.'); return false; }
    if (!depotCommune) { Alert.alert('Requis', 'Veuillez sélectionner une commune.'); return false; }
    if (!depotCentreName || !selectedCentreId) { Alert.alert('Requis', 'Veuillez sélectionner un centre de dépôt valide.'); return false; }
    if (selectedActivity?.presence_physique_requise && retraitAutreCentre) {
      if (!delivRegion) { Alert.alert('Requis', 'Veuillez sélectionner une région de délivrance.'); return false; }
      if (!delivDepartement) { Alert.alert('Requis', 'Veuillez sélectionner un département de délivrance.'); return false; }
      if (!delivCommune) { Alert.alert('Requis', 'Veuillez sélectionner une commune de délivrance.'); return false; }
      if (!delivCentreName || !selectedDelivCentreId) { Alert.alert('Requis', 'Veuillez sélectionner un centre de délivrance valide.'); return false; }
    }
    return true;
  };

  const validateStep2 = () => {
    if (selectedActivity?.motifs && selectedActivity.motifs.length > 0 && !motif) { Alert.alert('Requis', 'Veuillez sélectionner le motif de votre demande.'); return false; }
    for (const c of champsDynamiques) {
      if (shouldShowField(c, formValues) && c.obligatoire && c.type_champ !== 'file' && !formValues[c.nom_champ]?.trim()) {
        Alert.alert('Champ requis', `Le champ "${c.label}" est obligatoire.`); return false;
      }
    }
    return true;
  };

  const validateStep3 = () => {
    for (const c of champsDynamiques) {
      if (shouldShowField(c, formValues) && c.type_champ === 'file' && c.obligatoire) {
        const value = formValues[c.nom_champ];
        if (!value || !value.trim()) {
          Alert.alert('Requis', `Le document "${c.label}" est obligatoire.`);
          return false;
        }
      }
    }
    return true;
  };



  const submitRecours = async () => {
    if (submittingRequest) return;
    setSubmittingRequest(true);
    try {
      const res = await apiFetch(`/demandes/${recoursId}/recours`, {
        method: 'PUT',
        bodyData: {
          activite_id: selectedActivity.id,
          donnees: buildDonnees(),
          documents_url: buildDocumentsUrl(),
          _offline_metadata: {
            activite_nom: selectedActivity?.nom || 'Recours Acte',
            service_nom: selectedService?.nom || 'Administration',
            bureau_nom: bureauNom || 'Mairie',
            is_recours: true
          }
        },
      });
      if (res.status === 'success') {
        if (res.offline) {
          Alert.alert('Sauvegardée hors-ligne ✓', 'Votre recours sera synchronisé dès que la connexion sera rétablie.', [{ text: 'OK', onPress: () => { isLeavingProgrammatically.current = true; router.replace('/(tabs)/history'); } }]);
        } else {
          Alert.alert('Recours soumis ✓', 'Soumis sans frais !', [{ text: 'Suivre', onPress: () => { isLeavingProgrammatically.current = true; router.replace(`/demande/${res.data.demande.id}`); } }]);
        }
      }
    } catch (err: any) { Alert.alert('Erreur', err.message); } finally { setSubmittingRequest(false); }
  };

  // ─── MODIFICATION D'UNE DEMANDE EN ATTENTE ──────────────────────────────
  const submitModification = async () => {
    if (submittingRequest) return;
    setSubmittingRequest(true);
    try {
      const actualRetraitAutreCentre = !!((selectedActivity?.presence_physique_requise || !selectedActivity?.has_template) && retraitAutreCentre);
      if (editId && editId.startsWith('offline_')) {
        // Mise à jour dans SQLite local
        const { getDb } = require('../../database/localDb');
        const database = await getDb();
        const result = (await database.getFirstAsync(
          `SELECT payload FROM demandes_offline WHERE id = ?`, [editId]
        )) as any;
        if (result) {
          let parsed: any = {};
          try { parsed = JSON.parse(result.payload); } catch (e) {}
          parsed.activiteId = selectedActivity?.id;
          parsed.centreId = selectedCentreId;
          parsed.centreDelivranceId = actualRetraitAutreCentre ? selectedDelivCentreId : null;
          parsed.donnees = buildDonnees();
          parsed.documents_url = buildDocumentsUrl();
          if (motif) parsed.motif = motif;
          parsed._offline_metadata = {
            activite_nom: selectedActivity?.nom || 'Acte civil',
            service_nom: selectedService?.nom || 'Administration',
            bureau_nom: bureauNom || 'Mairie',
            region_nom: depotRegion,
            dept_nom: depotDepartement,
            commune_nom: depotCommune,
            centre_nom: depotCentreName,
            retrait_autre_centre: actualRetraitAutreCentre,
            deliv_region_nom: actualRetraitAutreCentre ? delivRegion : '',
            deliv_dept_nom: actualRetraitAutreCentre ? delivDepartement : '',
            deliv_commune_nom: actualRetraitAutreCentre ? delivCommune : '',
            deliv_centre_nom: actualRetraitAutreCentre ? delivCentreName : ''
          };
          await database.runAsync(
            `UPDATE demandes_offline SET payload = ?, status = 'pending_sync', error_message = NULL WHERE id = ?`,
            [JSON.stringify(parsed), editId]
          );
        }
        isLeavingProgrammatically.current = true;
        router.replace(`/demande/${editId}`);
      } else {
        const res = await apiFetch(`/demandes/${editId}`, {
          method: 'PUT',
          bodyData: {
            activiteId: selectedActivity?.id,
            centreId: selectedCentreId,
            centreDelivranceId: actualRetraitAutreCentre ? selectedDelivCentreId : null,
            donnees: buildDonnees(),
            documents_url: buildDocumentsUrl(),
            motif: motif || undefined,
          },
        });
        if (res.status === 'success') {
          isLeavingProgrammatically.current = true;
          router.replace(`/demande/${editId}`);
        } else {
          Alert.alert('Erreur', res.message || 'Impossible de modifier la demande.');
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Une erreur s\'est produite.');
    } finally {
      setSubmittingRequest(false);
    }
  };


  const handleInitiatePaytechPayment = async () => {
    if (paymentLoading || submittingRequest) return;
    
    setPaymentLoading(true);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    
    try {
      const hostIp = getHostIp();
      const response = await fetch(`http://${hostIp}:8000/api/paytech/request-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: selectedActivity?.prix || 0,
          description: `Demande de ${selectedActivity?.nom} - SenInnov`,
          activity_name: selectedActivity?.nom || 'Acte d\'état civil',
          // target_payment is left undefined so PayTech provides its complete multi-operator portal
          target_payment: undefined,
          phone: payerPhone.trim() || user?.telephone,
          full_name: payerFullName.trim() || user?.nom_complet,
          email: payerEmail.trim() || user?.email || undefined
        }),
        signal: controller.signal as any
      });
      
      clearTimeout(timeoutId);
      const data = await response.json();
      
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.detail || 'Impossible d\'initier la transaction avec PayTech.');
      }
      
      // Succeeded in creating session
      setPaytechToken(data.token);
      setPaytechUrl(data.redirect_url || data.url);
      setShowPaytechModal(true);
      setPaymentLoading(false);
      
      // Start polling confirmation status
      const intervalId = setInterval(async () => {
        const pollController = new AbortController();
        const pollTimeoutId = setTimeout(() => pollController.abort(), 4000);
        
        try {
          const checkRes = await fetch(`http://${hostIp}:8000/api/paytech/status/${data.token}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            signal: pollController.signal as any
          });
          clearTimeout(pollTimeoutId);
          const checkData = await checkRes.json();
          
          if (checkRes.ok && checkData.status === 'success') {
            if (checkData.payment_status === 'paid') {
              // Success!
              clearInterval(intervalId);
              setPaytechPollingId(null);
              setShowPaytechModal(false);
              
              // Trigger submission
              submitPaidRequest('PayTech');
            } else if (checkData.payment_status === 'failed') {
              // Failed
              clearInterval(intervalId);
              setPaytechPollingId(null);
              setShowPaytechModal(false);
              Alert.alert('Échec du paiement', 'La transaction PayTech a échoué ou a été refusée.');
            }
          }
        } catch (pollErr) {
          clearTimeout(pollTimeoutId);
          console.warn('Error polling PayTech status:', pollErr);
        }
      }, 2500);
      
      setPaytechPollingId(intervalId);
      
    } catch (err: any) {
      clearTimeout(timeoutId);
      setPaymentLoading(false);
      Alert.alert('Erreur', err.message || 'Erreur lors du contact avec la passerelle PayTech.');
    }
  };

  const submitPaidRequest = async (chosenMethod?: string) => {
    if (submittingRequest) return;
    setSubmittingRequest(true);
    try {
      const actualRetraitAutreCentre = !!((selectedActivity?.presence_physique_requise || !selectedActivity?.has_template) && retraitAutreCentre);
      const methodLabel = (chosenMethod || selectedPaymentMethod || 'paytech').toLowerCase().replace(/\s+/g, '_');
      const res = await apiFetch('/demandes', {
        method: 'POST',
        bodyData: {
          activite_id: selectedActivity?.id,
          centre_id: selectedCentreId,
          centre_delivrance_id: actualRetraitAutreCentre ? selectedDelivCentreId : null,
          motif: motif,
          donnees: buildDonnees(),
          montant_paye: selectedActivity?.prix || 0,
          mode_paiement: methodLabel,
          documents_url: buildDocumentsUrl(),
          rendez_vous: null,
          _offline_metadata: {
            activite_nom: selectedActivity?.nom || 'Acte civil',
            service_nom: selectedService?.nom || 'Administration',
            bureau_nom: bureauNom || 'Mairie',
            region_nom: depotRegion,
            dept_nom: depotDepartement,
            commune_nom: depotCommune,
            centre_nom: depotCentreName,
            retrait_autre_centre: actualRetraitAutreCentre,
            deliv_region_nom: actualRetraitAutreCentre ? delivRegion : '',
            deliv_dept_nom: actualRetraitAutreCentre ? delivDepartement : '',
            deliv_commune_nom: actualRetraitAutreCentre ? delivCommune : '',
            deliv_centre_nom: actualRetraitAutreCentre ? delivCentreName : ''
          }
        },
      });
      if (res.status === 'success') {
        if (res.offline) {
          Alert.alert('Sauvegardée hors-ligne ✓', 'Votre demande sera synchronisée dès que la connexion sera rétablie.', [{ text: 'OK', onPress: () => { isLeavingProgrammatically.current = true; router.replace('/(tabs)/history'); } }]);
        } else {
          Alert.alert('Paiement validé ✓', 'Votre demande a été soumise avec succès !', [{ text: 'Suivre mon dossier', onPress: () => { isLeavingProgrammatically.current = true; router.replace(`/demande/${res.data.demande.id}`); } }]);
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur lors de la soumission', err.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  const submitFreeRequest = async () => {
    if (submittingRequest) return;
    setSubmittingRequest(true);
    try {
      const actualRetraitAutreCentre = !!((selectedActivity?.presence_physique_requise || !selectedActivity?.has_template) && retraitAutreCentre);
      const res = await apiFetch('/demandes', {
        method: 'POST',
        bodyData: {
          activite_id: selectedActivity?.id,
          centre_id: selectedCentreId,
          centre_delivrance_id: actualRetraitAutreCentre ? selectedDelivCentreId : null,
          motif: motif,
          donnees: buildDonnees(),
          montant_paye: 0,
          mode_paiement: 'gratuit',
          documents_url: buildDocumentsUrl(),
          rendez_vous: null,
          _offline_metadata: {
            activite_nom: selectedActivity?.nom || 'Acte civil',
            service_nom: selectedService?.nom || 'Administration',
            bureau_nom: bureauNom || 'Mairie',
            region_nom: depotRegion,
            dept_nom: depotDepartement,
            commune_nom: depotCommune,
            centre_nom: depotCentreName,
            retrait_autre_centre: actualRetraitAutreCentre,
            deliv_region_nom: actualRetraitAutreCentre ? delivRegion : '',
            deliv_dept_nom: actualRetraitAutreCentre ? delivDepartement : '',
            deliv_commune_nom: actualRetraitAutreCentre ? delivCommune : '',
            deliv_centre_nom: actualRetraitAutreCentre ? delivCentreName : ''
          }
        },
      });
      if (res.status === 'success') {
        if (res.offline) {
          Alert.alert('Sauvegardée hors-ligne ✓', 'Votre demande gratuite sera synchronisée dès que la connexion sera rétablie.', [{ text: 'OK', onPress: () => { isLeavingProgrammatically.current = true; router.replace('/(tabs)/history'); } }]);
        } else {
          Alert.alert('Demande envoyée ✓', 'Soumise avec succès !', [{ text: 'Suivre', onPress: () => { isLeavingProgrammatically.current = true; router.replace(`/demande/${res.data.demande.id}`); } }]);
        }
      }
    } catch (err: any) { Alert.alert('Erreur', err.message); } finally { setSubmittingRequest(false); }
  };

  const checkIfStepIsValid = (currentStep: number) => {
    if (currentStep === 1) {
      const isDepotValid = !!(depotRegion && depotDepartement && depotCommune && depotCentreName && selectedCentreId);
      if (!isDepotValid) return false;
      if ((selectedActivity?.presence_physique_requise || !selectedActivity?.has_template) && retraitAutreCentre) {
        return !!(delivRegion && delivDepartement && delivCommune && delivCentreName && selectedDelivCentreId);
      }
      return true;
    }
    if (currentStep === 2) {
      if (selectedActivity?.motifs && selectedActivity.motifs.length > 0 && !motif) {
        return false;
      }
      for (const c of champsDynamiques) {
        if (shouldShowField(c, formValues) && c.obligatoire && c.type_champ !== 'file') {
          const val = formValues[c.nom_champ];
          if (!val || !val.trim()) {
            return false;
          }
        }
      }
      return true;
    }
    if (currentStep === 3) {
      for (const c of champsDynamiques) {
        if (shouldShowField(c, formValues) && c.type_champ === 'file' && c.obligatoire) {
          const val = formValues[c.nom_champ];
          if (!val || !val.trim()) {
            return false;
          }
        }
      }
      return true;
    }
    if (currentStep === 4) {
      return true;
    }
    return true;
  };

  const renderField = (champ: any) => {
    const { nom_champ, label, type_champ, placeholder, obligatoire } = champ;
    const value = formValues[nom_champ] || '';

    if (type_champ === 'section') {
      return (
        <View key={nom_champ} style={{ marginTop: 24, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 4, height: 18, backgroundColor: bureauCouleur, borderRadius: 2 }} />
            <Text style={{ fontSize: 16, fontWeight: '800', color: theme.text, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
          </View>
          <View style={{ height: 1, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0', marginTop: 8 }} />
        </View>
      );
    }

    if (type_champ === 'yesno') {
      return (
        <View key={nom_champ} style={[styles.inputGroup, { marginBottom: 16 }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}{obligatoire ? ' *' : ''}</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
            <TouchableOpacity 
              style={[
                styles.radioFlexCard, 
                { flex: 1, paddingVertical: 12, backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
                value === 'oui' && { borderColor: bureauCouleur, backgroundColor: theme.backgroundElement, borderWidth: 2 }
              ]} 
              onPress={() => {
                setFormValues(prev => {
                  const updated: Record<string, string> = { ...prev, [nom_champ]: 'oui' };
                  champsDynamiques.forEach(child => {
                    if (child.conditions && child.conditions.field === nom_champ && child.conditions.value === 'non') {
                      delete updated[child.nom_champ as string];
                    }
                  });
                  return updated;
                });
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.radioOuter, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }, value === 'oui' && { borderColor: bureauCouleur }]}>
                {value === 'oui' && <View style={[styles.radioInner, { backgroundColor: bureauCouleur }]} />}
              </View>
              <Text style={[styles.radioFlexText, { color: theme.text }, value === 'oui' && { color: bureauCouleur, fontWeight: '700' }]}>Oui</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.radioFlexCard, 
                { flex: 1, paddingVertical: 12, backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
                value === 'non' && { borderColor: bureauCouleur, backgroundColor: theme.backgroundElement, borderWidth: 2 }
              ]} 
              onPress={() => {
                setFormValues(prev => {
                  const updated: Record<string, string> = { ...prev, [nom_champ]: 'non' };
                  champsDynamiques.forEach(child => {
                    if (child.conditions && child.conditions.field === nom_champ && child.conditions.value === 'oui') {
                      delete updated[child.nom_champ as string];
                    }
                  });
                  return updated;
                });
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.radioOuter, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }, value === 'non' && { borderColor: bureauCouleur }]}>
                {value === 'non' && <View style={[styles.radioInner, { backgroundColor: bureauCouleur }]} />}
              </View>
              <Text style={[styles.radioFlexText, { color: theme.text }, value === 'non' && { color: bureauCouleur, fontWeight: '700' }]}>Non</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (type_champ === 'file') {
      const isUploading = !!fieldUploading[nom_champ];
      const uploaded = !!value;
      return (
        <TouchableOpacity
          key={nom_champ}
          style={[
            styles.uploadCard,
            { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            uploaded && { borderColor: bureauCouleur, borderWidth: 2, backgroundColor: theme.backgroundElement }
          ]}
          onPress={() => pickAndUploadField(champ)}
          disabled={isUploading}
          activeOpacity={0.8}
        >
          {isUploading ? (
            <ActivityIndicator color={bureauCouleur} />
          ) : (
            <UploadCloud size={30} color={uploaded ? bureauCouleur : '#94a3b8'} />
          )}
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.uploadTitle, { color: theme.text }, uploaded && { color: bureauCouleur }]}>{label}</Text>
            <Text style={[styles.uploadDesc, { color: theme.textSecondary }]}>
              {isUploading
                ? 'Envoi en cours...'
                : uploaded
                ? 'Fichier ajouté avec succès'
                : 'Cliquez pour choisir un fichier'}
            </Text>
          </View>
          {uploaded && (
            <View style={[styles.checkBadge, { backgroundColor: bureauCouleur }]}>
              <Check size={16} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      );
    }
    if (['region', 'departement', 'commune', 'centre', 'sexe', 'select', 'date', 'time'].includes(type_champ)) {
      return (
        <View key={nom_champ} style={styles.inputGroup}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}{obligatoire ? ' *' : ''}</Text>
          <TouchableOpacity
            style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, value ? { borderColor: bureauCouleur, borderWidth: 2 } : null]}
            onPress={() => {
              if (type_champ === 'time') {
                setCurrentTimeField(nom_champ);
                let d = new Date();
                if (value) {
                  const parts = value.split(':');
                  if (parts.length >= 2) {
                    d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0);
                  }
                }
                setCurrentTimeValue(d);
                setShowTimePicker(true);
              } else if (type_champ === 'date') {
                setCurrentDateField(nom_champ);
                let d = new Date();
                if (value) {
                  const parts = value.split('/');
                  if (parts.length === 3) d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                  else {
                    const parsed = new Date(value);
                    if (!isNaN(parsed.getTime())) d = parsed;
                  }
                }
                setCurrentDateValue(d);
                setShowDatePicker(true);
              } else {
                openGeoSelector(type_champ, champ);
              }
            }}
          >
            <Text style={[styles.selectText, { color: theme.text }, !value && styles.selectPlaceholder]}>{value || (type_champ === 'date' ? 'JJ/MM/AAAA' : type_champ === 'time' ? 'HH:MM' : 'Sélectionner...')}</Text>
            <ChevronRight size={16} color={value ? bureauCouleur : '#8c9ba5'} />
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View key={nom_champ} style={styles.inputGroup}>
        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>{label}{obligatoire ? ' *' : ''}</Text>
        <TextInput
          style={[
            styles.textInput,
            { backgroundColor: theme.backgroundElement, color: theme.text, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' },
            type_champ === 'textarea' && { height: 80, textAlignVertical: 'top' },
            value ? { borderColor: bureauCouleur, borderWidth: 2 } : null
          ]}
          placeholder={placeholder || `Saisir : ${label}`} placeholderTextColor="#8c9ba5"
          keyboardType={type_champ === 'number' || type_champ === 'phone' ? 'phone-pad' : 'default'}
          multiline={type_champ === 'textarea'}
          value={value} onChangeText={t => setFormValues(prev => ({ ...prev, [nom_champ]: t }))}
        />
      </View>
    );
  };

  const hasDocs = champsDynamiques.some(c => c.type_champ === 'file' && shouldShowField(c, formValues));
  const totalSteps = recoursId ? 2 : (hasDocs ? 5 : 4);

  // Enable native swipe gesture on iOS to allow user to swipe back normally
  useEffect(() => {
    navigation.setOptions({
      gestureEnabled: true,
    });
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (isLeavingProgrammatically.current) {
        return;
      }
      
      const canGoBackLocally = (step > (recoursId ? 2 : 0)) || (step === 0 && activeSubStep === 1);

      if (canGoBackLocally) {
        // Prevent default screen pop behavior, handle regression locally
        e.preventDefault();
        
        if (step === 0 && activeSubStep === 1) {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setActiveSubStep(0);
          setSelectedService(null);
          setSelectedActivity(null);
          setActivitySearchQuery('');
        } else if (step === 4 && !hasDocs) {
          setStep(2);
        } else if (step > (recoursId ? 2 : 0)) {
          setStep(step - 1);
        }
      }
    });

    return unsubscribe;
  }, [navigation, step, activeSubStep, recoursId, champsDynamiques, formValues]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ─── HEADER AVEC EFFET GLASSSMORPHISM ───────────────────────────── */}
      <View style={[styles.headerContainer, isDark && { borderBottomWidth: 1, borderBottomColor: hexToRgba(bureauCouleur, 0.15) }]}>
        {isDark && (
          <BlurView tint="dark" intensity={45} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient
          colors={isDark ? [hexToRgba(bureauCouleur, 0.25), hexToRgba(bureauCouleur, 0.08)] : [bureauCouleur, hexToRgba(bureauCouleur, 0.93)]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.backBtn} 
              onPress={() => {
                if (step === 0 && activeSubStep === 1) {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setActiveSubStep(0);
                  setSelectedService(null);
                  setSelectedActivity(null);
                  setActivitySearchQuery('');
                } else if (step === 4 && !hasDocs) {
                  setStep(2);
                } else if (step > (recoursId ? 2 : 0)) {
                  setStep(step - 1);
                } else {
                  isLeavingProgrammatically.current = true;
                  router.back();
                }
              }}
            >
              <ArrowLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 16, marginBottom: 16 }}>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 }}>
                {bureauNom.toUpperCase()}
              </Text>
              <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900', lineHeight: 22 }} numberOfLines={1}>
                {step > 0 && selectedActivity
                  ? selectedActivity.nom
                  : (selectedService ? selectedService.nom : 'Nouvelle demande')}
              </Text>
            </View>
          </View>

          {/* STEPER */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 }}>
            {(() => {
              let stepsArr: string[] = [];
              let currentStepIdx = 0;
              
              if (recoursId) {
                stepsArr = ['Données', 'Pièces'];
                currentStepIdx = step - 2;
              } else {
                stepsArr = ['Acte', 'Lieu de dépôt', 'Données'];
                if (hasDocs) {
                  stepsArr.push('Docs');
                }
                stepsArr.push('Résumé');
                
                if (step === 0) currentStepIdx = 0;
                else if (step === 1) currentStepIdx = 1;
                else if (step === 2) currentStepIdx = 2;
                else if (step === 3 && hasDocs) currentStepIdx = 3;
                else if (step === 4) currentStepIdx = hasDocs ? 4 : 3;
              }

              return stepsArr.map((s, i) => {
                const isActive = i === currentStepIdx;
                const isCompleted = i < currentStepIdx;
                return (
                  <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isActive || isCompleted ? '#fff' : 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
                      <Text style={{ color: isActive || isCompleted ? bureauCouleur : '#fff', fontSize: 13, fontWeight: '800' }}>{i + 1}</Text>
                    </View>
                    <Text style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.7)', fontSize: 10, marginTop: 6, fontWeight: isActive ? '800' : '600', textAlign: 'center' }}>{s}</Text>
                    {i < stepsArr.length - 1 && (
                      <View style={{ position: 'absolute', top: 14, left: '60%', right: '-40%', height: 2, backgroundColor: isCompleted ? '#fff' : 'rgba(255,255,255,0.3)', zIndex: 1 }} />
                    )}
                  </View>
                );
              });
            })()}
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1, backgroundColor: theme.background }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 80}
      >
        <ScrollView 
          style={{ backgroundColor: theme.background }} 
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets={true}
        >

          {/* STEP 0: Selection */}
          {step === 0 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Type d'acte civil</Text>
              
              {activeSubStep === 0 ? (
                <>
                  {/* Search Bar for Services */}
                  <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderWidth: 1 }]}>
                    <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.text }]}
                      placeholder="Rechercher un service..."
                      placeholderTextColor="#94a3b8"
                      value={serviceSearchQuery}
                      onChangeText={setServiceSearchQuery}
                    />
                  </View>

                  {loadingServices ? (
                    <ActivityIndicator color={bureauCouleur} style={{ marginVertical: 20 }} />
                  ) : filteredServices.length === 0 ? (
                    <View style={[styles.emptyStateBox, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
                      <HelpCircle size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                      <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>Aucun service correspondant à votre recherche.</Text>
                    </View>
                  ) : (
                    <View style={styles.servicesGrid}>
                      {filteredServices.map(srv => {
                        const isSelected = selectedService?.id === srv.id;
                        const gradColors = isSelected
                          ? [bureauCouleur, hexToRgba(bureauCouleur, 0.75)]
                          : (isDark
                              ? [hexToRgba(bureauCouleur, 0.18), hexToRgba(bureauCouleur, 0.06)]
                              : [hexToRgba(bureauCouleur, 0.10), hexToRgba(bureauCouleur, 0.04)]);
                        return (
                          <TapEffect
                            key={srv.id}
                            containerStyle={{ width: '48%' }}
                            style={[
                              styles.serviceGridCard,
                              {
                                borderColor: isSelected
                                  ? bureauCouleur
                                  : (isDark ? 'rgba(255,255,255,0.08)' : hexToRgba(bureauCouleur, 0.18)),
                                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                                borderWidth: isSelected ? 2 : 1,
                              }
                            ]}
                            onPress={() => handleSelectService(srv)}
                            color={bureauCouleur}
                            borderRadius={20}
                            rippleOpacity={0.22}
                            scaleDown={0.955}
                            elevation={6}
                          >
                            {/* Inner clipping view */}
                            <View style={styles.serviceCardInner}>
                              <LinearGradient
                                colors={
                                  isDark
                                    ? [hexToRgba(bureauCouleur, isSelected ? 0.22 : 0.12), hexToRgba(bureauCouleur, isSelected ? 0.08 : 0.03), '#1e293b']
                                    : [hexToRgba(bureauCouleur, isSelected ? 0.18 : 0.08), hexToRgba(bureauCouleur, isSelected ? 0.06 : 0.02), '#ffffff']
                                }
                                style={styles.serviceCardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                {/* App-icon style square */}
                                <View style={[
                                  styles.serviceIconSquare,
                                  { backgroundColor: isSelected ? bureauCouleur : hexToRgba(bureauCouleur, isDark ? 0.22 : 0.12) }
                                ]}>
                                  {getServiceIllustrativeIcon(srv.nom, isSelected ? '#fff' : bureauCouleur, isSelected)}
                                  {isSelected && (
                                    <View style={[styles.serviceCheckBadge, { backgroundColor: '#fff' }]}>
                                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: bureauCouleur }} />
                                    </View>
                                  )}
                                </View>
                                {/* Label */}
                                <Text
                                  style={[styles.serviceCardLabel, { color: isSelected ? bureauCouleur : theme.text }]}
                                  numberOfLines={2}
                                >
                                  {srv.nom}
                                </Text>
                              </LinearGradient>
                            </View>
                          </TapEffect>
                        );
                      })}
                    </View>
                  )}
                </>
              ) : (
                selectedService && (() => {
                  const filteredActivities = activities.filter(act =>
                    act.nom.toLowerCase().includes(activitySearchQuery.toLowerCase())
                  );
                  return (
                    <>
                      <View style={{ marginBottom: 10 }}>
                        <Text style={[styles.sectionLabel, { color: theme.text, marginTop: 0, textTransform: 'uppercase' }]}>
                          {selectedService.nom}
                        </Text>
                      </View>

                      {/* Search Bar for Documents */}
                      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0', borderWidth: 1, marginBottom: 20 }]}>
                        <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                        <TextInput
                          style={[styles.searchInput, { color: theme.text }]}
                          placeholder="Rechercher un type de document..."
                          placeholderTextColor="#94a3b8"
                          value={activitySearchQuery}
                          onChangeText={setActivitySearchQuery}
                        />
                      </View>
                      
                      <Text style={[styles.sectionLabel, { color: theme.textSecondary, fontSize: 13, marginTop: 0, marginBottom: 16 }]}>
                        Veuillez choisir le type de document
                      </Text>

                      {loadingActivities ? (
                        <ActivityIndicator color={bureauCouleur} style={{ marginVertical: 20 }} />
                      ) : filteredActivities.length === 0 ? (
                        <View style={[styles.emptyStateBox, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
                          <FileText size={40} color="#cbd5e1" style={{ marginBottom: 12 }} />
                          <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                            Aucun document correspondant à votre recherche.
                          </Text>
                        </View>
                      ) : (
                        filteredActivities.map((act, idx) => {
                          const isAct = selectedActivity?.id === act.id;
                          const rowGradColors = isAct
                            ? (isDark
                                ? [hexToRgba(bureauCouleur, 0.15), hexToRgba(bureauCouleur, 0.04), '#1e293b']
                                : [hexToRgba(bureauCouleur, 0.08), hexToRgba(bureauCouleur, 0.02), '#ffffff'])
                            : (isDark
                                ? [hexToRgba(bureauCouleur, 0.04), hexToRgba(bureauCouleur, 0.01), '#1e293b']
                                : [hexToRgba(bureauCouleur, 0.02), hexToRgba(bureauCouleur, 0.005), '#ffffff']);
                          return (
                            <PremiumPressable
                              key={act.id}
                              activeScale={1.02}
                              containerStyle={{ marginBottom: 12, width: '100%' }}
                              style={[
                                styles.radioListCard,
                                { backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', width: '100%', paddingVertical: 0, paddingHorizontal: 0, marginBottom: 0 },
                                isAct && { borderColor: bureauCouleur, borderLeftWidth: 4 }
                              ]}
                              onPress={() => handleSelectActivity(act)}
                            >
                              <LinearGradient
                                colors={rowGradColors as any}
                                style={{ width: '100%', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16 }}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                              >
                                {/* Left number badge */}
                                <View style={[
                                  styles.radioNumBadge,
                                  { backgroundColor: isAct ? bureauCouleur : (isDark ? '#2d3748' : '#f1f5f9') }
                                ]}>
                                  <Text style={[styles.radioNumText, { color: isAct ? '#fff' : '#64748b' }]}>
                                    {idx + 1}
                                  </Text>
                                </View>
                                {/* Label */}
                                <Text style={[styles.radioListText, { color: theme.text, flex: 1, marginRight: 8 }, isAct && { color: bureauCouleur, fontWeight: '700' }]}>
                                  {act.nom}
                                </Text>
                                {/* Star icon toggle for Favorites */}
                                <TouchableOpacity
                                  onPress={(e) => toggleFavorite(act.id, e)}
                                  style={{ padding: 8, marginRight: 4 }}
                                  activeOpacity={0.7}
                                >
                                  <Star
                                    size={20}
                                    color={favorites.includes(act.id) ? '#eab308' : (isDark ? '#4b5563' : '#cbd5e1')}
                                    fill={favorites.includes(act.id) ? '#eab308' : 'transparent'}
                                  />
                                </TouchableOpacity>
                                {/* Right indicator */}
                                {isAct
                                  ? <View style={[styles.radioCheckFill, { backgroundColor: bureauCouleur }]}>
                                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.backgroundElement }} />
                                    </View>
                                  : <View style={[styles.radioCheckEmpty, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }]} />
                                }
                              </LinearGradient>
                            </PremiumPressable>
                          );
                        })
                      )}
                    </>
                  );
                })()
              )}
            </View>
          )}

          {/* STEP 1: Lieu de dépôt */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>LIEU DE DÉPÔT</Text>
              <Text style={{ color: theme.textSecondary, marginBottom: 16 }}>Veuillez indiquer où vous souhaitez traiter cette demande.</Text>

              <TouchableOpacity
                style={{
                  backgroundColor: isDark ? 'rgba(37, 99, 235, 0.15)' : hexToRgba(bureauCouleur, 0.08),
                  borderColor: bureauCouleur,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 16,
                  alignItems: 'center',
                  marginBottom: 20,
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8
                }}
                onPress={handleFindClosestCentre}
                disabled={findingLocation}
              >
                {findingLocation ? (
                  <ActivityIndicator size="small" color={bureauCouleur} />
                ) : (
                  <MapPin size={20} color={bureauCouleur} />
                )}
                <Text style={{ color: bureauCouleur, fontWeight: '700', fontSize: 15 }}>
                  {findingLocation ? 'Recherche en cours...' : '📍 Trouver le centre le plus proche'}
                </Text>
              </TouchableOpacity>

              {(() => {
                const selectedCentreObj = centres.find(c => c.id === selectedCentreId);
                let lat = selectedCentreObj?.latitude;
                let lon = selectedCentreObj?.longitude;
                
                // Fallback to parent commune coordinates if centre has no coordinates
                if (lat === null || lon === null || lat === undefined || lon === undefined) {
                  const comId = selectedCentreObj?.commune_id;
                  const parentCommune = communes.find(co => co.id === comId);
                  lat = parentCommune?.latitude;
                  lon = parentCommune?.longitude;
                }
                
                const hasCoords = lat !== null && lon !== null && lat !== undefined && lon !== undefined;
                if (!hasCoords) return null;
                
                const finalLat = parseFloat(lat);
                const finalLon = parseFloat(lon);
                
                return (
                  <View style={{
                    backgroundColor: theme.backgroundElement,
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 20,
                    overflow: 'hidden'
                  }}>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14, marginBottom: 8 }}>
                      📍 Aperçu de la localisation :
                    </Text>
                    
                    <View style={{ height: 160, width: '100%', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
                      <MapComponent
                        latitude={finalLat}
                        longitude={finalLon}
                        title={selectedCentreObj?.nom}
                      />
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: bureauCouleur,
                        borderRadius: 8,
                        paddingVertical: 10,
                        alignItems: 'center',
                        flexDirection: 'row',
                        justifyContent: 'center',
                        gap: 6
                      }}
                      onPress={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${finalLat},${finalLon}`;
                        Linking.openURL(url).catch(() => {
                          Alert.alert('Erreur', 'Impossible de rediriger vers Google Maps.');
                        });
                      }}
                    >
                      <Navigation size={16} color="#fff" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        Itinéraire Google Maps
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })()}
              
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Région *</Text>
                <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, depotRegion ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDepotSelector('region')}>
                  <Text style={[styles.selectText, { color: theme.text }, !depotRegion && styles.selectPlaceholder]}>{depotRegion || 'Sélectionner...'}</Text>
                  <ChevronRight size={16} color={depotRegion ? bureauCouleur : '#8c9ba5'} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Département *</Text>
                <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, depotDepartement ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDepotSelector('departement')}>
                  <Text style={[styles.selectText, { color: theme.text }, !depotDepartement && styles.selectPlaceholder]}>{depotDepartement || 'Sélectionner...'}</Text>
                  <ChevronRight size={16} color={depotDepartement ? bureauCouleur : '#8c9ba5'} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Commune *</Text>
                <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, depotCommune ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDepotSelector('commune')}>
                  <Text style={[styles.selectText, { color: theme.text }, !depotCommune && styles.selectPlaceholder]}>{depotCommune || 'Sélectionner...'}</Text>
                  <ChevronRight size={16} color={depotCommune ? bureauCouleur : '#8c9ba5'} />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, { marginTop: 16 }]}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Centre de dépôt *</Text>
                <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, depotCentreName ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDepotSelector('centre')}>
                  <Text style={[styles.selectText, { color: theme.text }, !depotCentreName && styles.selectPlaceholder]}>{depotCentreName || 'Sélectionner...'}</Text>
                  <ChevronRight size={16} color={depotCentreName ? bureauCouleur : '#8c9ba5'} />
                </TouchableOpacity>
              </View>

              {/* Delivery Option */}
              {(!selectedActivity?.presence_physique_requise && !selectedActivity?.has_template) && (
                <View style={{ backgroundColor: isDark ? 'rgba(234, 179, 8, 0.1)' : '#fefce8', padding: 12, borderRadius: 8, marginTop: 16, borderColor: isDark ? 'rgba(234, 179, 8, 0.3)' : '#eab308', borderWidth: 1 }}>
                  <Text style={{ color: isDark ? '#fde047' : '#ca8a04', fontWeight: '700', fontSize: 13, marginBottom: 4 }}>📍 Note importante :</Text>
                  <Text style={{ color: isDark ? '#fef08a' : '#a16207', fontSize: 13, lineHeight: 20 }}>
                    Demande en ligne. Le retrait du document se fera physiquement au centre de dépôt, ou dans un autre centre de délivrance de votre choix.
                  </Text>
                </View>
              )}
              {(selectedActivity?.presence_physique_requise || !selectedActivity?.has_template) && (
                <View style={{ marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0' }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    onPress={() => setRetraitAutreCentre(!retraitAutreCentre)}
                    activeOpacity={0.8}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: retraitAutreCentre ? bureauCouleur : '#94a3b8',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: retraitAutreCentre ? bureauCouleur : 'transparent'
                    }}>
                      {retraitAutreCentre && <Check size={14} color="#fff" />}
                    </View>
                    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 14 }}>
                      Retirer l'acte dans un autre centre
                    </Text>
                  </TouchableOpacity>

                  {retraitAutreCentre && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 13, marginBottom: 12 }}>
                        Sélectionnez le centre où vous souhaitez récupérer votre document une fois validé.
                      </Text>

                      {/* GPS Button for Delivery */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: isDark ? 'rgba(124, 58, 237, 0.15)' : hexToRgba(bureauCouleur, 0.08),
                          borderColor: '#7c3aed',
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 12,
                          alignItems: 'center',
                          marginBottom: 16,
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 8
                        }}
                        onPress={handleFindClosestDelivCentre}
                        disabled={findingLocation}
                      >
                        {findingLocation ? (
                          <ActivityIndicator size="small" color="#7c3aed" />
                        ) : (
                          <MapPin size={18} color="#7c3aed" />
                        )}
                        <Text style={{ color: '#7c3aed', fontWeight: '700', fontSize: 14 }}>
                          {findingLocation ? 'Recherche en cours...' : '📍 Trouver le centre de délivrance le plus proche'}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.inputGroup}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Région de délivrance *</Text>
                        <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, delivRegion ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDelivSelector('region')}>
                          <Text style={[styles.selectText, { color: theme.text }, !delivRegion && styles.selectPlaceholder]}>{delivRegion || 'Sélectionner...'}</Text>
                          <ChevronRight size={16} color={delivRegion ? bureauCouleur : '#8c9ba5'} />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 16 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Département de délivrance *</Text>
                        <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, delivDepartement ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDelivSelector('departement')}>
                          <Text style={[styles.selectText, { color: theme.text }, !delivDepartement && styles.selectPlaceholder]}>{delivDepartement || 'Sélectionner...'}</Text>
                          <ChevronRight size={16} color={delivDepartement ? bureauCouleur : '#8c9ba5'} />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 16 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Commune de délivrance *</Text>
                        <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, delivCommune ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDelivSelector('commune')}>
                          <Text style={[styles.selectText, { color: theme.text }, !delivCommune && styles.selectPlaceholder]}>{delivCommune || 'Sélectionner...'}</Text>
                          <ChevronRight size={16} color={delivCommune ? bureauCouleur : '#8c9ba5'} />
                        </TouchableOpacity>
                      </View>

                      <View style={[styles.inputGroup, { marginTop: 16 }]}>
                        <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Centre de délivrance *</Text>
                        <TouchableOpacity style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, delivCentreName ? { borderColor: bureauCouleur, borderWidth: 2 } : null]} onPress={() => openDelivSelector('centre')}>
                          <Text style={[styles.selectText, { color: theme.text }, !delivCentreName && styles.selectPlaceholder]}>{delivCentreName || 'Sélectionner...'}</Text>
                          <ChevronRight size={16} color={delivCentreName ? bureauCouleur : '#8c9ba5'} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* STEP 2: Saisie (Champs) */}
          {step === 2 && (
            <View style={styles.stepContainer}>

              {champsDynamiques.some(c => c.type_champ === 'phone' || c.label.toLowerCase().includes('cni')) && (
                <View style={styles.scanContainer}>
                  <TouchableOpacity style={[styles.scanBtn, { backgroundColor: bureauCouleur }]} onPress={startScanning} activeOpacity={0.85}>
                    <Camera size={20} color="#fff" style={{ marginRight: 10 }} />
                    <Text style={styles.scanBtnText}>Scanner ma CNI (Auto-remplissage)</Text>
                  </TouchableOpacity>
                  {scanning && (
                    <View style={[styles.scanProgressContainer, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]}>
                      <Text style={[styles.scanProgressLabel, { color: theme.text }]}>Analyse en cours... {scanProgress}%</Text>
                      <View style={[styles.scanBarBg, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                        <View style={[styles.scanBarFill, { width: `${scanProgress}%`, backgroundColor: bureauCouleur }]} />
                      </View>
                    </View>
                  )}
                  <View style={styles.orDividerContainer}>
                    <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]} />
                    <Text style={styles.orText}>OU SAISIR MANUELLEMENT</Text>
                    <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }]} />
                  </View>
                </View>
              )}

              {selectedActivity?.motifs && selectedActivity.motifs.length > 0 && (
                <View style={[styles.inputGroup, { marginTop: 16 }]}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Motif de la demande *</Text>
                  <TouchableOpacity
                    style={[styles.selectInput, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#e2e8f0' }, motif ? { borderColor: bureauCouleur, borderWidth: 2 } : null]}
                    onPress={() => {
                      let parsedMotifs = [];
                      try {
                        parsedMotifs = typeof selectedActivity.motifs === 'string' ? JSON.parse(selectedActivity.motifs) : selectedActivity.motifs;
                      } catch (e) {}
                      if (!Array.isArray(parsedMotifs)) parsedMotifs = [];
                      openSelector('Motif de la demande', parsedMotifs.map((m: string) => ({ label: m, value: m })), (val: any) => setMotif(val));
                    }}
                  >
                    <Text style={[styles.selectText, { color: theme.text }, !motif && styles.selectPlaceholder]}>{motif || 'Sélectionner un motif...'}</Text>
                    <ChevronRight size={16} color={motif ? bureauCouleur : '#8c9ba5'} />
                  </TouchableOpacity>
                </View>
              )}

              {(() => {
                const visibleChamps = champsDynamiques.filter(c => c.type_champ !== 'file' && shouldShowField(c, formValues));
                if (visibleChamps.length > 0 && visibleChamps[0].type_champ !== 'section') {
                  return <Text style={[styles.sectionLabel, { marginTop: 24, color: theme.textSecondary }]}>INFORMATIONS REQUISES</Text>;
                }
                return null;
              })()}
              {loadingActivityInfo ? (
                <ActivityIndicator color={bureauCouleur} style={{ marginVertical: 20 }} />
              ) : champsDynamiques.filter(c => c.type_champ !== 'file' && shouldShowField(c, formValues)).length === 0 ? (
                <View style={[styles.emptyStateBox, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: hexToRgba(bureauCouleur, 0.08), alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <FileText size={24} color={bureauCouleur} />
                  </View>
                  <Text style={[styles.emptyStateText, { fontWeight: '700', color: theme.text, fontSize: 15, marginBottom: 6 }]}>
                    Aucune information requise
                  </Text>
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    Cette étape ne nécessite aucune saisie manuelle dans votre situation actuelle.
                    Vous pouvez continuer vers l'étape suivante.
                  </Text>
                </View>
              ) : (
                <View style={styles.fieldsContainer}>
                  {champsDynamiques.filter(c => c.type_champ !== 'file' && shouldShowField(c, formValues)).map(renderField)}
                </View>
              )}
            </View>
          )}

          {/* STEP 3: Pièces justificatives */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>PIÈCES JUSTIFICATIVES</Text>
              
              {champsDynamiques.filter(c => c.type_champ === 'file' && shouldShowField(c, formValues)).length === 0 ? (
                <View style={[styles.emptyStateBox, { backgroundColor: theme.backgroundElement, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }]}>
                  <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: hexToRgba(bureauCouleur, 0.08), alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <ShieldCheck size={24} color={bureauCouleur} />
                  </View>
                  <Text style={[styles.emptyStateText, { fontWeight: '700', color: theme.text, fontSize: 15, marginBottom: 6 }]}>
                    Aucune pièce requise
                  </Text>
                  <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                    Cette démarche ne nécessite aucun document justificatif.
                    Vous pouvez continuer vers le récapitulatif.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={[styles.descText, { color: theme.textSecondary }]}>Joignez les documents de manière lisible pour accélérer le traitement de votre dossier.</Text>
                  <View style={styles.docsContainer}>
                    {champsDynamiques.filter(c => c.type_champ === 'file' && shouldShowField(c, formValues)).map(renderField)}
                  </View>
                </>
              )}
            </View>
          )}

          {/* STEP 4: Récapitulatif */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>RÉCAPITULATIF COMPLET</Text>
              <View style={[styles.recapCard, { borderTopColor: bureauCouleur, backgroundColor: theme.backgroundElement }]}>
                
                {/* 1. Informations Principales */}
                <Text style={[styles.recapSectionTitle, { color: theme.text }]}>Informations principales</Text>
                <View style={styles.recapRowItem}>
                  <Text style={[styles.recapKey, { color: theme.textSecondary }]}>Formalité :</Text>
                  <Text style={[styles.recapValue, { color: theme.text }]}>{selectedActivity?.nom}</Text>
                </View>


                {/* 1b. Lieu de dépôt */}
                <View style={[styles.recapDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]} />
                <Text style={[styles.recapSectionTitle, { color: theme.text }]}>Lieu de traitement</Text>
                <View style={styles.recapRowItem}>
                  <Text style={[styles.recapKey, { color: theme.textSecondary }]}>Région :</Text>
                  <Text style={[styles.recapValue, { color: theme.text }]}>{depotRegion}</Text>
                </View>
                <View style={styles.recapRowItem}>
                  <Text style={[styles.recapKey, { color: theme.textSecondary }]}>Département :</Text>
                  <Text style={[styles.recapValue, { color: theme.text }]}>{depotDepartement}</Text>
                </View>
                <View style={styles.recapRowItem}>
                  <Text style={[styles.recapKey, { color: theme.textSecondary }]}>Commune :</Text>
                  <Text style={[styles.recapValue, { color: theme.text }]}>{depotCommune}</Text>
                </View>
                <View style={styles.recapRowItem}>
                  <Text style={[styles.recapKey, { color: theme.textSecondary }]}>Centre de dépôt :</Text>
                  <Text style={[styles.recapValue, { color: theme.text }]}>{depotCentreName}</Text>
                </View>

                {/* 2. Données Saisies */}
                {champsDynamiques.filter(c => c.type_champ !== 'file' && shouldShowField(c, formValues)).length > 0 && (
                  <>
                    <View style={[styles.recapDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]} />
                    <Text style={[styles.recapSectionTitle, { color: theme.text }]}>Données saisies</Text>
                    {champsDynamiques.map(c => {
                      if (c.type_champ === 'file' || !shouldShowField(c, formValues)) return null;
                      return (
                        <View key={c.nom_champ} style={styles.recapRowItem}>
                          <Text style={[styles.recapKey, { color: theme.textSecondary }]}>{c.label} :</Text>
                          <Text style={[styles.recapValue, { color: theme.text }]}>{formValues[c.nom_champ] || '-'}</Text>
                        </View>
                      );
                    })}
                  </>
                )}

                {/* 3. Documents */}
                <View style={[styles.recapDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]} />
                <Text style={[styles.recapSectionTitle, { color: theme.text }]}>Documents joints</Text>
                {champsDynamiques.filter(c => c.type_champ === 'file' && shouldShowField(c, formValues)).length === 0 ? (
                  <Text style={{ fontSize: 14, color: theme.textSecondary, fontStyle: 'italic' }}>Aucun document requis</Text>
                ) : (
                  champsDynamiques.filter(c => c.type_champ === 'file' && shouldShowField(c, formValues)).map(c => (
                    <View key={c.nom_champ} style={styles.recapDocItem}>
                      <Check size={16} color={formValues[c.nom_champ] ? '#2563eb' : (isDark ? 'rgba(255,255,255,0.2)' : '#cbd5e1')} />
                      <Text style={[styles.recapDocText, { marginLeft: 10 }, formValues[c.nom_champ] ? { color: theme.text } : { color: theme.textSecondary }]}>{c.label} {formValues[c.nom_champ] ? '(Fourni)' : '(Manquant)'}</Text>
                    </View>
                  ))
                )}

                {/* 4. Montant */}
                {!editId && (
                  <>
                    <View style={[styles.recapDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]} />
                    <View style={styles.recapTotalRow}>
                      <Text style={[styles.recapTotalLabel, { color: theme.text }]}>Montant à payer</Text>
                      <Text style={[styles.recapTotalValue, { color: bureauCouleur }]}>
                        {selectedActivity?.prix === 0 ? 'GRATUIT' : `${selectedActivity?.prix?.toLocaleString('fr-FR')} FCFA`}
                      </Text>
                    </View>
                  </>
                )}

                {/* 5. Choix du Mode de Paiement */}
                {!editId && selectedActivity?.prix > 0 && (
                  <>
                    <View style={[styles.recapDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]} />
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Text style={[styles.recapSectionTitle, { color: theme.text, marginBottom: 0 }]}>
                        Choisir un mode de paiement
                      </Text>
                      <View style={{ backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: '#10b981', textTransform: 'uppercase' }}>Sécurisé</Text>
                      </View>
                    </View>
                    
                    {/* Unique Elegant Payment Gateway Option */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={{
                        padding: 15,
                        borderRadius: 16,
                        borderWidth: 1.5,
                        borderColor: '#0070b2',
                        backgroundColor: isDark ? 'rgba(0,112,178,0.08)' : '#f0f9ff',
                        marginBottom: 16
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            backgroundColor: '#0070b2',
                            alignItems: 'center',
                            justifyContent: 'center',
                            shadowColor: '#0070b2',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.25,
                            shadowRadius: 4,
                            elevation: 3
                          }}>
                            <CreditCard size={22} color="#ffffff" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.text }}>
                              Paiement en ligne sécurisé
                            </Text>
                            <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                              Wave, Orange Money, Carte Bancaire, Free Money
                            </Text>
                          </View>
                        </View>
                        <View style={{
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          borderWidth: 2,
                          borderColor: '#0070b2',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#0070b2'
                        }}>
                          <Check size={13} color="#fff" strokeWidth={3} />
                        </View>
                      </View>

                      {/* Payment Badges Strip */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,112,178,0.1)' }}>
                        {[
                          { name: 'Wave', color: '#1CC2FF', bg: 'rgba(28,194,255,0.1)' },
                          { name: 'Orange Money', color: '#FF7900', bg: 'rgba(255,121,0,0.1)' },
                          { name: 'Free Money', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
                          { name: 'Carte Bancaire', color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
                        ].map((badge) => (
                          <View key={badge.name} style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: badge.color }}>{badge.name}</Text>
                          </View>
                        ))}
                      </View>
                    </TouchableOpacity>

                    {/* Pre-filled Payer Details (Editable) */}
                    <View style={{
                      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc',
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
                      padding: 14,
                      gap: 12
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: theme.text, letterSpacing: 0.2 }}>
                          Coordonnées du payeur
                        </Text>
                        <View style={{ backgroundColor: isDark ? 'rgba(0,112,178,0.15)' : '#e0f2fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7' }}>Auto-rempli</Text>
                        </View>
                      </View>

                      {/* Nom complet */}
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 5 }}>
                          Nom et prénom
                        </Text>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1',
                          paddingHorizontal: 10
                        }}>
                          <UserIcon size={16} color={theme.textSecondary} />
                          <TextInput
                            value={payerFullName}
                            onChangeText={setPayerFullName}
                            placeholder="Nom et prénom du payeur"
                            placeholderTextColor={theme.textSecondary}
                            style={{
                              flex: 1,
                              paddingVertical: 9,
                              paddingHorizontal: 8,
                              fontSize: 13,
                              color: theme.text,
                              fontWeight: '600'
                            }}
                          />
                        </View>
                      </View>

                      {/* Téléphone */}
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 5 }}>
                          Numéro de téléphone (Wave / Orange Money)
                        </Text>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1',
                          paddingHorizontal: 10
                        }}>
                          <PhoneIcon size={16} color={theme.textSecondary} />
                          <TextInput
                            value={payerPhone}
                            onChangeText={setPayerPhone}
                            placeholder="77 000 00 00"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="phone-pad"
                            style={{
                              flex: 1,
                              paddingVertical: 9,
                              paddingHorizontal: 8,
                              fontSize: 13,
                              color: theme.text,
                              fontWeight: '600'
                            }}
                          />
                        </View>
                      </View>

                      {/* Email (Optionnel) */}
                      <View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textSecondary, marginBottom: 5 }}>
                          Adresse e-mail (pour le reçu)
                        </Text>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: isDark ? '#1e293b' : '#ffffff',
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#cbd5e1',
                          paddingHorizontal: 10
                        }}>
                          <MailIcon size={16} color={theme.textSecondary} />
                          <TextInput
                            value={payerEmail}
                            onChangeText={setPayerEmail}
                            placeholder="exemple@domaine.sn (optionnel)"
                            placeholderTextColor={theme.textSecondary}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{
                              flex: 1,
                              paddingVertical: 9,
                              paddingHorizontal: 8,
                              fontSize: 13,
                              color: theme.text,
                              fontWeight: '600'
                            }}
                          />
                        </View>
                      </View>

                      <Text style={{ fontSize: 10.5, color: theme.textSecondary, fontStyle: 'italic', marginTop: 2 }}>
                        Ces coordonnées sont automatiquement récupérées de votre compte pour pré-remplir votre transaction.
                      </Text>
                    </View>
                  </>
                )}

              </View>
            </View>
          )}

          {/* STEP 5: Paiement has been removed to avoid duplicate inputs, the user handles this directly in the AfrikPay WebView checkout page */}

        </ScrollView>

        {/* BOTTOM CTA */}
        {((step > 0 && checkIfStepIsValid(step)) || (step === 0 && activeSubStep === 1 && selectedActivity)) && (
          <View style={[styles.bottomCta, { backgroundColor: theme.background, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: bureauCouleur }, submittingRequest && { opacity: 0.8 }]} onPress={() => {
              if (step === 0) {
                if (editId) {
                  setStep(1);
                } else {
                  setShowInfoModal(true);
                }
              }
              else if (step === 1) { if (validateStep1()) setStep(2); }
              else if (step === 2) { 
                if (validateStep2()) {
                  if (recoursId || hasDocs) {
                    setStep(3);
                  } else {
                    setStep(4);
                  }
                }
              }
              else if (step === 3) { 
                if (validateStep3()) {
                  if (recoursId) {
                    submitRecours();
                  } else {
                    setStep(4);
                  }
                }
              }

              else if (step === 4) {
                if (editId) {
                  submitModification();
                } else {
                  if (selectedActivity?.prix === 0) {
                    submitFreeRequest();
                  } else {
                    handleInitiatePaytechPayment();
                  }
                }
              }
            }} disabled={submittingRequest} activeOpacity={0.9}>
                {submittingRequest ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.ctaBtnText}>
                  {step === 0 ? 'Continuer' : 
                   (editId && step === 4) ? 'Enregistrer les modifications' : 
                   (recoursId && step === 3) ? 'Soumettre le recours' : 
                   (!recoursId && !editId && step === 4 && selectedActivity?.prix > 0) ? `Procéder au paiement (${selectedActivity?.prix?.toLocaleString('fr-FR')} FCFA)` : 
                   (!recoursId && !editId && step === 4 && selectedActivity?.prix === 0) ? 'Soumettre la demande' : 
                   'Continuer vers la suite'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* VOIR PLUS MODAL */}
      <Modal visible={showInfoModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetPremium, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <View style={styles.modalHandle} />
            <ScrollView contentContainerStyle={{ padding: 24 }}>
              <Text style={[styles.modalTitleLarge, { color: theme.text }]}>{selectedActivity?.nom}</Text>
              
              <View style={styles.modalHighlights}>
                <View style={[styles.highlightBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                  <CreditCard size={22} color={bureauCouleur} />
                  <Text style={styles.highlightBoxLabel}>Tarif</Text>
                  <Text style={[styles.highlightBoxValue, { color: bureauCouleur }]}>{selectedActivity?.prix === 0 ? 'Gratuit' : `${selectedActivity?.prix} FCFA`}</Text>
                </View>
                <View style={[styles.highlightBox, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
                  <Clock size={22} color="#f59e0b" />
                  <Text style={styles.highlightBoxLabel}>Délai estimé</Text>
                  <Text style={[styles.highlightBoxValue, { color: isDark ? '#fbbf24' : '#d97706' }]}>{selectedActivity?.delai_min_jours} à {selectedActivity?.delai_max_jours} J</Text>
                </View>
              </View>

              <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Pièces à fournir obligatoirement :</Text>
              <View style={styles.modalDocsList}>
                {champsDynamiques.filter(c => c.type_champ === 'file').length === 0 ? (
                  <View style={styles.modalDocItem}>
                    <View style={styles.modalDocBullet} /><Text style={[styles.modalDocText, { color: theme.textSecondary }]}>Aucune pièce requise</Text>
                  </View>
                ) : (
                  champsDynamiques.filter(c => c.type_champ === 'file').map(c => (
                    <View key={c.nom_champ} style={styles.modalDocItem}>
                      <View style={styles.modalDocBullet} /><Text style={[styles.modalDocText, { color: theme.textSecondary }]}>{c.label}</Text>
                    </View>
                  ))
                )}
              </View>
              
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 40 }}>
                <TouchableOpacity style={[styles.ctaBtnOutlined, { flex: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#cbd5e1', backgroundColor: theme.backgroundElement }]} onPress={() => setShowInfoModal(false)} activeOpacity={0.8}>
                  <Text style={[styles.ctaBtnText, { color: theme.textSecondary }]}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.ctaBtn, { flex: 2, backgroundColor: bureauCouleur }]} onPress={() => { setShowInfoModal(false); setStep(1); }} activeOpacity={0.8}>
                  <Text style={styles.ctaBtnText}>Commencer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* GEO SELECTOR MODAL */}
      <Modal visible={showSelectorModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheetPremium, { maxHeight: '85%', backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
            <View style={styles.modalHandle} />
            <View style={[styles.modalHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{selectorTitle}</Text>
              <TouchableOpacity onPress={() => setShowSelectorModal(false)}><X size={24} color="#64748b" /></TouchableOpacity>
            </View>

            {/* Search Input when option count > 5 */}
            {selectorOptions && selectorOptions.length > 5 && (
              <View style={{
                paddingHorizontal: 20,
                paddingBottom: 12,
                borderBottomWidth: 1,
                borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9',
                marginTop: 8,
              }}>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                  borderWidth: 1.5,
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                  borderRadius: 12,
                  paddingHorizontal: 12,
                }}>
                  <Search size={18} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    placeholder="Rechercher..."
                    placeholderTextColor="#64748b"
                    value={selectorSearchQuery}
                    onChangeText={setSelectorSearchQuery}
                    style={{
                      flex: 1,
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: 15,
                      paddingVertical: Platform.OS === 'ios' ? 12 : 8,
                      fontWeight: '500',
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {selectorSearchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSelectorSearchQuery('')}>
                      <X size={18} color="#64748b" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            <ScrollView keyboardShouldPersistTaps="handled">
              {(selectorOptions && selectorOptions.length > 5
                ? selectorOptions.filter(opt => {
                    if (!selectorSearchQuery) return true;
                    const cleanLabel = opt.label
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "");
                    const cleanQuery = selectorSearchQuery
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "");
                    
                    const words = cleanLabel.split(/\s+/);
                    return cleanLabel.startsWith(cleanQuery) || words.some((word: string) => word.startsWith(cleanQuery));
                  })
                : selectorOptions || []
              ).map((opt, i) => (
                <TouchableOpacity key={i} style={[styles.selectorItem, { borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : '#f8fafc' }]} onPress={() => { selectorCallback?.(opt.value); setShowSelectorModal(false); }}>
                  <Text style={[styles.selectorItemText, { color: theme.text }]}>{opt.label}</Text>
                  <ChevronRight size={18} color="#cbd5e1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* PAYTECH WEBVIEW CHECKOUT MODAL */}
      <Modal visible={showPaytechModal} animationType="slide" transparent={false}>
        <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
          {/* Modal Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0',
            backgroundColor: isDark ? '#0f172a' : '#f8fafc'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: '#0070b2',
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}>
                <CreditCard size={18} color="#fff" />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: theme.text }}>
                  Paiement Sécurisé
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#10b981', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Passerelle Officielle PayTech • Sécurisé
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                if (paytechPollingId) {
                  clearInterval(paytechPollingId);
                  setPaytechPollingId(null);
                }
                setShowPaytechModal(false);
                setPaytechProgress(0);
                Alert.alert('Paiement interrompu', 'Vous avez fermé la session de paiement.');
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Progress Bar */}
          {paytechProgress < 1 && (
            <View style={{ height: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0', width: '100%' }}>
              <View style={{ height: '100%', backgroundColor: '#0070b2', width: `${paytechProgress * 100}%` }} />
            </View>
          )}

          {/* WebView with Deep Link & Redirection Handling */}
          {paytechUrl ? (
            <WebView 
              source={{ uri: paytechUrl }} 
              style={{ flex: 1 }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              incognito={false}
              scalesPageToFit={true}
              showsVerticalScrollIndicator={true}
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              setSupportMultipleWindows={false}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1"
              injectedJavaScriptBeforeContentLoaded={`
                (function() {
                  window.open = function(url) {
                    if (url) {
                      window.location.href = url;
                    }
                    return null;
                  };
                })();
                true;
              `}
              injectedJavaScript={`
                (function() {
                  // 1. Override window.open
                  window.open = function(url) {
                    if (url) {
                      window.location.href = url;
                    }
                    return null;
                  };

                  // 2. Intercept clicks on wave links or links with target=_blank
                  document.addEventListener('click', function(e) {
                    var anchor = e.target && e.target.closest ? e.target.closest('a') : null;
                    if (anchor && anchor.href) {
                      if (anchor.href.indexOf('wave.com') !== -1 || anchor.getAttribute('target') === '_blank') {
                        e.preventDefault();
                        window.location.href = anchor.href;
                        return;
                      }
                    }

                    // If button "Cliquez pour payer" or any payment button is pressed
                    var btn = e.target && e.target.closest ? e.target.closest('button, .btn, [role="button"]') : null;
                    if (btn) {
                      setTimeout(function() {
                        var waveLink = document.getElementById('wave-url') || document.querySelector('a[href*="wave.com"]');
                        if (waveLink && waveLink.href) {
                          window.location.href = waveLink.href;
                        }
                      }, 250);
                    }
                  }, true);

                  // 3. Intercept fetch responses that contain wave.com
                  var origFetch = window.fetch;
                  if (origFetch) {
                    window.fetch = function() {
                      return origFetch.apply(this, arguments).then(function(res) {
                        try {
                          res.clone().json().then(function(data) {
                            if (data && data.url && data.url.indexOf('wave.com') !== -1) {
                              window.location.href = data.url;
                            }
                          }).catch(function() {});
                        } catch(e) {}
                        return res;
                      });
                    };
                  }

                  // 4. MutationObserver for dynamic wave links inserted by PayTech (e.g. id="wave-url")
                  var obs = new MutationObserver(function() {
                    var wl = document.getElementById('wave-url') || document.querySelector('a[href*="wave.com"]');
                    if (wl && wl.href && !wl.dataset.intercepted) {
                      wl.dataset.intercepted = 'true';
                      window.location.href = wl.href;
                    }
                  });
                  obs.observe(document.documentElement, { childList: true, subtree: true });
                })();
                true;
              `}
              onOpenWindow={(syntheticEvent) => {
                const { targetUrl } = syntheticEvent.nativeEvent;
                if (targetUrl) {
                  Linking.openURL(targetUrl).catch(() => {});
                }
              }}
              onLoadProgress={({ nativeEvent }) => {
                setPaytechProgress(nativeEvent.progress);
              }}
              onShouldStartLoadWithRequest={(request) => {
                const url = request.url;
                if (!url) return false;

                // 1. Check if it's a Wave Universal Link, deep link, or non-http(s) scheme
                const isWaveUrl = url.includes('wave.com') || url.includes('pay.wave.com') || url.startsWith('wave:');
                const isDeepLink = !url.startsWith('http://') && !url.startsWith('https://');

                if (isWaveUrl || isDeepLink) {
                  Linking.openURL(url).catch((err) => {
                    console.warn('Cannot open external/native URL:', url, err);
                  });
                  return false;
                }

                // 2. Check if user hit success or cancel URL
                if (url.includes('/payment/success') || url.includes('success=true') || url.includes('success=1')) {
                  if (paytechPollingId) clearInterval(paytechPollingId);
                  setPaytechPollingId(null);
                  setShowPaytechModal(false);
                  submitPaidRequest('PayTech');
                  return false;
                }
                if (url.includes('/payment/cancel') || url.includes('canceled=true') || url.includes('cancel=true')) {
                  if (paytechPollingId) clearInterval(paytechPollingId);
                  setPaytechPollingId(null);
                  setShowPaytechModal(false);
                  Alert.alert('Paiement annulé', 'La transaction a été annulée.');
                  return false;
                }
                return true;
              }}
              onNavigationStateChange={(navState) => {
                const url = navState.url;
                if (url && (url.includes('wave.com') || url.includes('pay.wave.com') || url.startsWith('wave:'))) {
                  Linking.openURL(url).catch(() => {});
                }
                if (url.includes('/payment/success') || url.includes('success=true') || url.includes('success=1')) {
                  if (paytechPollingId) clearInterval(paytechPollingId);
                  setPaytechPollingId(null);
                  setShowPaytechModal(false);
                  submitPaidRequest('PayTech');
                } else if (url.includes('/payment/cancel') || url.includes('canceled=true') || url.includes('cancel=true')) {
                  if (paytechPollingId) clearInterval(paytechPollingId);
                  setPaytechPollingId(null);
                  setShowPaytechModal(false);
                  Alert.alert('Paiement annulé', 'La transaction a été annulée.');
                }
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent);
              }}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <ActivityIndicator color="#0070b2" size="large" />
            </View>
          )}
        </View>
      </Modal>

      {/* TIME PICKER */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showTimePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Choisir l'heure</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={{ fontSize: 16, color: bureauCouleur, fontWeight: '800' }}>Terminer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentTimeValue}
                mode="time"
                display="spinner"
                textColor={isDark ? '#ffffff' : '#0f172a'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setCurrentTimeValue(selectedDate);
                    if (currentTimeField) {
                      const hh = String(selectedDate.getHours()).padStart(2, '0');
                      const min = String(selectedDate.getMinutes()).padStart(2, '0');
                      const formattedTime = `${hh}:${min}`;
                      setFormValues(prev => ({ ...prev, [currentTimeField]: formattedTime }));
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showTimePicker && (
          <DateTimePicker
            value={currentTimeValue}
            mode="time"
            display="spinner"
            onChange={(event, selectedDate) => {
              setShowTimePicker(false);
              if (event.type === 'set' && selectedDate && currentTimeField) {
                const hh = String(selectedDate.getHours()).padStart(2, '0');
                const min = String(selectedDate.getMinutes()).padStart(2, '0');
                const formattedTime = `${hh}:${min}`;
                setFormValues(prev => ({ ...prev, [currentTimeField]: formattedTime }));
              }
            }}
          />
        )
      )}

      {/* DATE PICKER */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Choisir la date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ fontSize: 16, color: bureauCouleur, fontWeight: '800' }}>Terminer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={currentDateValue}
                mode="date"
                display="spinner"
                textColor={isDark ? '#ffffff' : '#0f172a'}
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setCurrentDateValue(selectedDate);
                    if (currentDateField) {
                      const dd = String(selectedDate.getDate()).padStart(2, '0');
                      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const yyyy = selectedDate.getFullYear();
                      const formattedDate = `${dd}/${mm}/${yyyy}`;
                      setFormValues(prev => ({ ...prev, [currentDateField]: formattedDate }));
                    }
                  }
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={currentDateValue}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selectedDate && currentDateField) {
                const dd = String(selectedDate.getDate()).padStart(2, '0');
                const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
                const yyyy = selectedDate.getFullYear();
                const formattedDate = `${dd}/${mm}/${yyyy}`;
                setFormValues(prev => ({ ...prev, [currentDateField]: formattedDate }));
              }
            }}
          />
        )
      )}

      {/* DATE PICKER POUR RENDEZ-VOUS */}
      {Platform.OS === 'ios' ? (
        <Modal visible={showRdvDatePicker} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={{ backgroundColor: isDark ? '#1e293b' : '#fff', paddingBottom: 40, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>Date du rendez-vous</Text>
                <TouchableOpacity onPress={() => setShowRdvDatePicker(false)}>
                  <Text style={{ fontSize: 16, color: bureauCouleur, fontWeight: '800' }}>Terminer</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={rdvDate || new Date()}
                mode="date"
                display="spinner"
                textColor={isDark ? '#ffffff' : '#0f172a'}
                minimumDate={new Date()}
                onChange={(event, selectedDate) => {
                  if (selectedDate) setRdvDate(selectedDate);
                }}
              />
            </View>
          </View>
        </Modal>
      ) : (
        showRdvDatePicker && (
          <DateTimePicker
            value={rdvDate || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowRdvDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                setRdvDate(selectedDate);
              }
            }}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7fb' },
  headerContainer: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  header: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  backBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  headerContent: { marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4, fontWeight: '500' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  stepContainer: { gap: 4 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: '#64748b', marginTop: 10, marginBottom: 14, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Empty states
  emptyStateBox: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  emptyStateText: { fontSize: 15, color: '#64748b', textAlign: 'center', fontWeight: '500', lineHeight: 22 },
  
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02, shadowRadius: 4, elevation: 1,
  },
  searchInput: {
    flex: 1, fontSize: 15, fontWeight: '500',
    padding: 0,
    letterSpacing: 0,
  },

  // Service Selection (Grid)
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 8,
  },
  serviceGridCard: {
    width: '48%',
    borderRadius: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderColor: '#f1f5f9',
    ...Platform.select({
      ios: {
        shadowColor: '#94a3b8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
    borderWidth: 1,
  },
  serviceCardInner: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  serviceCardGradient: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  serviceIconSquare: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  serviceCheckBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  serviceCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },

  // Activity Radio
  radioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  
  // Voir Plus Button — prominent
  voirPlusBtn: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  voirPlusBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 18,
  },
  voirPlusIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  voirPlusLabel: { fontSize: 15, fontWeight: '800', color: '#fff' },
  voirPlusSub: { fontSize: 12, fontWeight: '500', color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  voirPlusText: { fontSize: 15, fontWeight: '700' },

  // Activity / Type de document rows
  radioListCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#e2e8f0',
  },
  radioNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioNumText: { fontSize: 13, fontWeight: '800' },
  radioListText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1e293b' },
  radioCheckFill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCheckEmpty: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
  },

  // Form Fields
  radioRowFlex: { flexDirection: 'row', gap: 12 },
  radioFlexCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#e2e8f0' },
  radioFlexText: { marginLeft: 10, fontSize: 15, fontWeight: '600', color: '#475569' },

  fieldsContainer: {
    gap: 16,
    paddingTop: 8,
  },
  inputGroup: {
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  textInput: {
    backgroundColor: '#ffffff',
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    minHeight: 48,
    letterSpacing: 0,
  },
  selectInput: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectText: { flex: 1, fontSize: 15, color: '#0f172a', fontWeight: '500' },
  selectPlaceholder: { color: '#94a3b8' },

  // Scanner
  scanContainer: { marginTop: 24, marginBottom: 8 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 16, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 4 },
  scanBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  scanProgressContainer: { marginTop: 16, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  scanProgressLabel: { fontSize: 14, color: '#475569', fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  scanBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  scanBarFill: { height: '100%', borderRadius: 4 },
  orDividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e2e8f0' },
  orText: { marginHorizontal: 16, fontSize: 12, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },

  // Docs Upload
  docsContainer: { gap: 16 },
  descText: { color: '#64748b', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  uploadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 20, borderWidth: 1.5, borderColor: '#e2e8f0' },
  uploadTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 4 },
  uploadDesc: { fontSize: 13, color: '#64748b' },
  checkBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Recap Premium
  recapCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, borderTopWidth: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3 },
  recapSectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 16, letterSpacing: 0.5 },
  recapRowItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  recapKey: { fontSize: 14, color: '#64748b', fontWeight: '600', flex: 1 },
  recapValue: { fontSize: 14, color: '#0f172a', fontWeight: '700', flex: 1.5, textAlign: 'right' },
  recapDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 20 },
  recapDocItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  recapDocText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  recapTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapTotalLabel: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  recapTotalValue: { fontSize: 22, fontWeight: '900' },

  // Payment
  paymentMethodsGrid: { gap: 12 },
  payCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1.5, borderColor: '#e2e8f0' },
  payRadioOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
  payRadioInner: { width: 12, height: 12, borderRadius: 6 },
  payLabel: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 2 },
  payDesc: { fontSize: 13, color: '#64748b', fontWeight: '500' },

  // CTA
  bottomCta: { padding: 24, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
  ctaBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  ctaBtnOutlined: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, backgroundColor: '#fff' },
  ctaBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalSheetPremium: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%' },
  modalHandle: { width: 48, height: 5, backgroundColor: '#cbd5e1', borderRadius: 3, alignSelf: 'center', marginTop: 16, marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitleLarge: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 24, lineHeight: 32 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  
  modalHighlights: { flexDirection: 'row', gap: 16, marginBottom: 30 },
  highlightBox: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  highlightBoxLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', marginTop: 10, marginBottom: 4, textTransform: 'uppercase' },
  highlightBoxValue: { fontSize: 18, fontWeight: '900' },
  
  modalSectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  modalDocsList: { gap: 12 },
  modalDocItem: { flexDirection: 'row', alignItems: 'center' },
  modalDocBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#94a3b8', marginRight: 12 },
  modalDocText: { fontSize: 15, color: '#475569', fontWeight: '500' },

  selectorItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  selectorItemText: { flex: 1, fontSize: 16, color: '#1e293b', fontWeight: '600' },
  
  otpModal: { backgroundColor: '#fff', margin: 24, borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  otpIconWrap: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  otpTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 10 },
  otpDesc: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  otpInput: { borderWidth: 2, borderRadius: 16, padding: 16, width: '100%', fontSize: 24, fontWeight: '900', textAlign: 'center', color: '#0f172a', letterSpacing: 8, marginBottom: 24, backgroundColor: '#f8fafc' },
  otpBtn: { borderRadius: 16, paddingVertical: 18, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 6 },
  otpBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
});
