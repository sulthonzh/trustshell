module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // Allow console for logger and CLI output
    'no-console': 'off',
    // Allow unused vars prefixed with _ (intentional)
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    'no-unused-vars': 'off',
    // no-explicit-any kept as warning - cleaned up in source
    '@typescript-eslint/no-explicit-any': 'warn',
    // Downgrade prefer-const to warning
    'prefer-const': 'warn',
    // Allow unnecessary escapes in regex (personal style preference)
    'no-useless-escape': 'off',
    // Disable TypeScript's no-undef since TypeScript compiler handles this
    'no-undef': 'off',
  },
  env: {
    node: true,
    es6: true,
  },
};