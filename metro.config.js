// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// O banco local no web (expo-sqlite) roda o SQLite em WebAssembly dentro de um worker.
config.resolver.assetExts.push('wasm');

// O worker conversa com a página por SharedArrayBuffer, que o navegador só libera com a página isolada
// de outras origens. Na hospedagem do web, o servidor precisa mandar os mesmos dois cabeçalhos.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
