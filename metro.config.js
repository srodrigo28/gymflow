// https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// A API (server/) tem node_modules próprio e não faz parte do app. O padrão parte do caminho
// absoluto: um "/server/" solto bloquearia também pacotes como react-dom/server.
const serverDir = path.resolve(__dirname, 'server');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  new RegExp(`^${escapeRegExp(serverDir)}[\\\\/]`),
];

module.exports = config;
