import { useAppTheme } from '../context/ThemeContext';

export function useColorScheme() {
  try {
    const { activeTheme } = useAppTheme();
    return activeTheme;
  } catch (e) {
    console.error('[useColorScheme] Error in useColorScheme context lookup:', e);
    // Fallback if context is not loaded yet (e.g. at root level outside Provider)
    return 'light';
  }
}
