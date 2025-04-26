/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#6936D8';
const tintColorDark = '#6936D8';

export const Colors = {
  light: {
    background: '#fff',
    border: '#eee',
    danger: '#FF3B30',
    icon: '#687076',
    inputBackground: '#F5F5F5',
    secondaryText: '#999',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    tertiaryText: '#666',
    text: '#11181C',
    tint: tintColorLight,
    white: '#ffffff',
  },
  dark: {
    background: '#151718',
    border: '#3A3A3C',
    danger: '#FF453A',
    icon: '#9BA1A6',
    inputBackground: '#2A2D2E',
    secondaryText: '#999',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    tertiaryText: '#9BA1A6',
    text: '#ECEDEE',
    tint: tintColorDark,
    white: '#ffffff',
  },
};
