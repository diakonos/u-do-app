/* eslint @typescript-eslint/no-require-imports: off */
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactNativePlugin = require('eslint-plugin-react-native');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const prettierPlugin = require('eslint-plugin-prettier');
const tsParser = require('@typescript-eslint/parser');

module.exports = [
  {
    ignores: ['node_modules/**', 'ios/**', 'android/**', 'dist/**', '.expo/**', '*.lock', '*.log'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-native': reactNativePlugin,
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        ...((reactNativePlugin.environments &&
          reactNativePlugin.environments['react-native/react-native'] &&
          reactNativePlugin.environments['react-native/react-native'].globals) ||
          {}),
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...((reactPlugin.configs &&
        reactPlugin.configs.recommended &&
        reactPlugin.configs.recommended.rules) ||
        {}),
      ...((reactHooksPlugin.configs &&
        reactHooksPlugin.configs.recommended &&
        reactHooksPlugin.configs.recommended.rules) ||
        {}),
      ...((tsPlugin.configs &&
        tsPlugin.configs.recommended &&
        tsPlugin.configs.recommended.rules) ||
        {}),
      ...((reactNativePlugin.configs &&
        reactNativePlugin.configs.all &&
        reactNativePlugin.configs.all.rules) ||
        {}),
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-native/no-inline-styles': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn'],
      'prettier/prettier': 'error',
      'react-native/no-raw-text': ['error', { skip: ['ThemedText'] }],
    },
  },
];
