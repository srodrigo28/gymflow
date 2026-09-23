// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // O servidor tem as próprias dependências e checagens (server/package.json).
    ignores: ['dist/*', 'server/**'],
  },
]);
