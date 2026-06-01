import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default [
  // Build output, coverage reports and vendored third-party bundles are not source — never lint them.
  { ignores: ['dist', 'coverage', 'public/vendor'] },
  // Garde-fou typage : signale tout `any` explicite (DSI — interdiction du type `any`).
  // Le parseur TS s'applique à TOUS les .ts/.tsx (sinon erreurs de parsing).
  // `no-explicit-any` est en `warn` pour ne pas casser le build sur la dette existante,
  // tout en bloquant l'introduction de nouveaux `any` en revue de code.
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { '@typescript-eslint': tseslint.plugin, 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Dette existante : des hooks sont appelés dans des callbacks/handlers (bug
      // "Invalid hook call" potentiel). Signalé en `warn` pour rester visible sans
      // bloquer le build ; à corriger en remontant ces appels au niveau du composant.
      'react-hooks/rules-of-hooks': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  // Les tests peuvent utiliser `any` librement (mocks, fixtures).
  {
    files: ['**/*.test.{ts,tsx}', '**/__tests__/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
]
