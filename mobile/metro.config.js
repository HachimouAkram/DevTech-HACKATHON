// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Permettre à Metro de résoudre le module WebAssembly wa-sqlite.wasm utilisé par expo-sqlite sur le web
config.resolver.assetExts.push('wasm');

module.exports = config;
