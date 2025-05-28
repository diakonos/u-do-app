import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  useCallback,
} from 'react';
import { ColorSchemeName, Platform } from 'react-native';
import { Appearance } from 'react-native';

export const baseTheme = {
  borderRadius: 5,
  font: {
    thin: 'SF-Pro-Display-Thin',
    light: 'SF-Pro-Display-Light',
    regular: 'SF-Pro-Display-Regular',
    medium: 'SF-Pro-Display-Medium',
    semibold: 'SF-Pro-Display-Semibold',
    bold: 'SF-Pro-Display-Bold',
  },
  fontSize: {
    small: 16,
    medium: 20,
    large: 24,
  },
  margin: {
    0: 0,
    1: 5,
    2: 10,
    3: 20,
    4: 30,
    5: 50,
  },
};

const lightTheme = {
  ...baseTheme,
  background: 'rgb(255,255,255)',
  backgroundSecondary: 'rgb(204,204,204)',
  borderFaint: 'rgb(204,204,204)',
  brand: 'rgb(101,50,213)',
  destructive: 'rgb(213,50,52)',
  disabled: 'rgb(170,170,170)',
  doneLine: 'rgba(0,0,0,0.3)',
  highlighted: 'rgb(240, 234, 255)',
  inputBackground: 'rgb(242,242,242)',
  link: 'rgb(50, 93, 213)',
  overlay: 'rgba(0,0,0,0.5)',
  placeholder: 'rgb(153,153,153)',
  primary: 'rgb(0,0,0)',
  secondary: 'rgb(153,153,153)',
  success: 'rgb(65,172,65)',
  text: 'rgb(0,0,0)',
  textSecondary: 'rgb(85,85,85)',
  textInverse: 'rgb(255,255,255)',
  white: 'rgb(255,255,255)',
};

const darkTheme = {
  ...baseTheme,
  background: 'rgb(0,0,0)',
  backgroundSecondary: 'rgb(51,51,51)',
  borderFaint: 'rgb(85,85,85)',
  brand: 'rgb(126, 77, 231)',
  destructive: 'rgb(213,50,52)',
  disabled: 'rgb(68,68,68)',
  doneLine: 'rgba(255,255,255,0.7)',
  highlighted: 'rgb(46, 36, 70)',
  inputBackground: 'rgb(34,34,34)',
  link: 'rgb(72, 114, 230)',
  overlay: 'rgba(255,255,255,0.1)',
  placeholder: 'rgb(153,153,153)',
  primary: 'rgb(255,255,255)',
  secondary: 'rgb(153,153,153)',
  success: 'rgb(65,172,65)',
  text: 'rgb(255,255,255)',
  textSecondary: 'rgb(153,153,153)',
  textInverse: 'rgb(0,0,0)',
  white: 'rgb(255,255,255)',
};

const ThemeContext = createContext(lightTheme);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);

  const updateTheme = useCallback((scheme: ColorSchemeName) => {
    const newTheme = scheme === 'dark' ? darkTheme : lightTheme;
    setTheme(newTheme);

    if (Platform.OS === 'web') {
      document?.querySelector!('meta[name="theme-color"]')?.setAttribute(
        'content',
        newTheme.background,
      );
    }
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      updateTheme(colorScheme);
    });
    return () => subscription.remove();
  }, [updateTheme]);

  const value = useMemo(() => theme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
