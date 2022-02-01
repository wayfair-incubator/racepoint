// .eslintrc.js
module.exports = {
  extends: 'eslint:recommended',
  parser: '@typescript-eslint/parser',
  env: {
    es6: true,
    browser: true,
    node: true,
    'jest/globals': true,
  },
  parserOptions: {
    sourceType: 'module',
  },
  ignorePatterns: ['build/**', 'packages/**/build'],
  plugins: ['jest', '@typescript-eslint'],
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {args: 'none'}],
  },
};
