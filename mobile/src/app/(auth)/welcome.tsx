import React from 'react';
import { StyleSheet, Text, View, Dimensions, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Eye, ShieldCheck, Bell, ChevronRight } from 'lucide-react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '../../context/ThemeContext';
import { useTheme } from '../../hooks/use-theme';

// Custom Springy Pressable Button for haptic/tactile feedback
const AnimatedPressable = ({ children, onPress, style }: { children: React.ReactNode; onPress: () => void; style?: any }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 10 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10 });
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={[style, { overflow: 'visible' }]}
    >
      <Animated.View style={[animatedStyle, { width: '100%', alignItems: 'center', justifyContent: 'center' }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { activeTheme } = useAppTheme();

  const isDark = activeTheme === 'dark';

  const cardStyle = {
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.9)' : '#ffffff',
    borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 8,
    elevation: 1,
  };

  const features = [
    {
      title: "Demande simplifiée",
      desc: "Faites vos demandes en quelques clics, où que vous soyez.",
      Icon: FileText,
      iconColor: "#2563eb",
      bgColorLight: "#ecfdf5",
      bgColorDark: "rgba(37, 99, 235, 0.15)",
    },
    {
      title: "Suivi en temps réel",
      desc: "Suivez chaque étape de votre dossier en toute transparence.",
      Icon: Eye,
      iconColor: "#2563eb",
      bgColorLight: "#eff6ff",
      bgColorDark: "rgba(37, 99, 235, 0.15)",
    },
    {
      title: "Paiement sécurisé",
      desc: "Réglez vos frais administratifs en toute sécurité via Wave, Orange Money et plus.",
      Icon: ShieldCheck,
      iconColor: "#d97706",
      bgColorLight: "#fffbeb",
      bgColorDark: "rgba(217, 119, 6, 0.15)",
    },
    {
      title: "Notifications instantanées",
      desc: "Recevez des alertes à chaque avancement de votre dossier.",
      Icon: Bell,
      iconColor: "#8b5cf6",
      bgColorLight: "#f5f3ff",
      bgColorDark: "rgba(139, 92, 246, 0.15)",
    },
  ];

  return (
    <LinearGradient
      colors={isDark ? ['#050b18', '#07152c', '#090d16'] : ['#e0f2fe', '#f0fdf4']}
      style={styles.container}
    >
      {/* Decorative blurred background bubbles */}
      <View style={styles.bubble1} />
      <View style={styles.bubble2} />

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <View style={{ alignItems: 'stretch', width: '100%' }}>
          {/* Logo */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={styles.logoWrapper}
          >
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          {/* App name + tagline */}
          <Animated.View
            entering={FadeInUp.duration(300).delay(100)}
            style={styles.header}
          >
            <View style={styles.brandTitleRow}>
              <Text style={[styles.appNameTeranga, { color: theme.text }]}>Teranga</Text>
              <Text style={styles.appNameCivil}>Civil</Text>
            </View>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>RÉPUBLIQUE DU SÉNÉGAL</Text>
            </View>
            <Text style={[styles.appTagline, { color: theme.textSecondary }]}>
              Plateforme numérique de l'État Civil et des démarches citoyennes
            </Text>
          </Animated.View>

          {/* Feature List */}
          <View style={styles.featuresContainer}>
            {features.map((feature, index) => {
              const { Icon } = feature;
              return (
                <Animated.View
                  key={index}
                  entering={FadeInDown.duration(350).delay(150 + index * 50)}
                  style={[styles.featureRow, cardStyle]}
                >
                  <View style={[
                    styles.iconWrapper,
                    { backgroundColor: isDark ? feature.bgColorDark : feature.bgColorLight }
                  ]}>
                    <Icon size={20} color={feature.iconColor} />
                  </View>
                  <View style={styles.featureTextWrapper}>
                    <Text style={[styles.featureTitle, { color: theme.text }]}>{feature.title}</Text>
                    <Text style={[styles.featureDesc, { color: theme.textSecondary }]}>{feature.desc}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </View>

        {/* Buttons & Onboarding Actions */}
        <Animated.View
          entering={FadeInDown.duration(350).delay(350)}
          style={styles.actions}
        >
          <AnimatedPressable
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Se connecter</Text>
          </AnimatedPressable>

          <AnimatedPressable
            style={[styles.secondaryButton, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.8)', borderColor: theme.border }]}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.text }]}>Créer un compte</Text>
          </AnimatedPressable>

          <Text style={styles.footerText}>République du Sénégal — TerangaCivil 2026</Text>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? 50 : 64,
    paddingBottom: Platform.OS === 'android' ? 24 : 34,
  },
  bubble1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    top: -50,
    left: -50,
  },
  bubble2: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    bottom: 50,
    right: -100,
  },
  logoWrapper: {
    alignSelf: 'center',
    marginTop: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 16,
  },
  logoImage: {
    width: 68,
    height: 68,
  },
  header: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  brandTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appNameTeranga: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  appNameCivil: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.6,
    color: '#2563eb',
  },
  tagBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: '#2563eb',
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  appTagline: {
    fontSize: 14.5,
    lineHeight: 21,
    marginTop: 10,
    textAlign: 'center',
  },
  featuresContainer: {
    marginVertical: 12,
    gap: 12,
    width: '100%',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  featureDesc: {
    fontSize: 12.5,
    marginTop: 2,
    lineHeight: 17,
  },
  chevron: {
    marginLeft: 4,
  },
  actions: {
    gap: 12,
    alignItems: 'center',
    width: '100%',
    marginTop: 20,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 10,
    color: '#8c9ba5',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
