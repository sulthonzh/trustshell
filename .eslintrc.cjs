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
    // Downgrade unused vars to warnings (for future cleanup, not blocking)
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-unused-vars': 'off',
    // Allow any types where type inference isn't critical
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