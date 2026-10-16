import { useEffect, useState } from 'react';
import { useAppTheme } from '../context/ThemeContext';

export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  try {
    const { activeTheme } = useAppTheme();
    if (hasHydrated) {
      return activeTheme;
    }
  } catch (e) {
    // Fallback
  }

  return 'light';
}
