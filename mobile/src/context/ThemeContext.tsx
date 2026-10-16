import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useDeviceColorScheme, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  themePreference: ThemePreference;
  setThemePreference: (pref: ThemePreference) => void;
  activeTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const deviceColorScheme = useDeviceColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark'>(
    deviceColorScheme === 'dark' ? 'dark' : 'light'
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Load theme preference from AsyncStorage on startup
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('appThemePref');
        if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
          setThemePreferenceState(savedTheme as ThemePreference);
        }
      } catch (e) {
        console.error('Failed to load theme preference', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  const setThemePreference = async (pref: ThemePreference) => {
    setThemePreferenceState(pref);
    try {
      await AsyncStorage.setItem('appThemePref', pref);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  useEffect(() => {
    if (themePreference === 'system') {
      setActiveTheme(deviceColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setActiveTheme(themePreference);
    }
  }, [themePreference, deviceColorScheme]);

  if (!isLoaded) {
    const splashBg = deviceColorScheme === 'dark' ? '#090d16' : '#f8fafc';
    return <View style={{ flex: 1, backgroundColor: splashBg }} />;
  }

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
};
