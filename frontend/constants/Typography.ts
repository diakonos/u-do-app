/**
 * Typography constants for the app
 * This provides a centralized place to manage font sizes throughout the application
 */

export const Typography = {
  // Base font size
  baseFontSize: 16,

  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    md: 18,
    lg: 20,
    xl: 24,
    xxl: 32,
  },

  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    loose: 1.8,
  },

  // Font weights - using string literals that match React Native's allowed values
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
  },

  // Common text styles that can be reused
  styles: {
    body: {
      fontSize: 16,
      lineHeight: 24,
    },
    bodySemiBold: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '600' as const,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold' as const,
      lineHeight: 38,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      lineHeight: 26,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
  },
};
