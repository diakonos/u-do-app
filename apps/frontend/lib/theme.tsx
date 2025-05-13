import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';
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
  background: '#ffffff',
  borderFaint: '#cccccc',
  brand: '#6532D5',
  destructive: '#D53234',
  disabled: '#aaa',
  inputBackground: '#f2f2f2',
  overlay: 'rgba(0, 0, 0, 0.5)',
  placeholder: '#999999',
  primary: '#000000',
  secondary: '#999999',
  success: '#41AC41',
  text: '#000000',
  textInverse: '#ffffff',
  white: '#ffffff',
};

const darkTheme = {
  ...baseTheme,
  background: '#000000',
  borderFaint: '#555555',
  brand: '#6532D5',
  destructive: '#D53234',
  disabled: '#444',
  inputBackground: '#222',
  overlay: 'rgba(255, 255, 255, 0.1)',
  placeholder: '#999999',
  primary: '#ffffff',
  secondary: '#999999',
  success: '#41AC41',
  text: '#ffffff',
  textInverse: '#000000',
  white: '#ffffff',
};

const ThemeContext = createContext(lightTheme);

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = Appearance.getColorScheme();
  const [theme, setTheme] = useState(colorScheme === 'dark' ? darkTheme : lightTheme);

  React.useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setTheme(colorScheme === 'dark' ? darkTheme : lightTheme);
    });
    return () => subscription.remove();
  }, []);

  const value = useMemo(() => theme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
