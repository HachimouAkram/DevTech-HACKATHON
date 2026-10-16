import { Colors } from '../constants/theme';
import { useAppTheme } from '../context/ThemeContext';

export function useTheme() {
  try {
    const { activeTheme } = useAppTheme();
    return Colors[activeTheme];
  } catch (e) {
    // Fallback if useTheme is called outside of ThemeProvider
    return Colors.light;
  }
}
