const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// inlineRem 16 (NativeWind default is 14) makes `p-4` 16px like the web's rem and the 4px scale.
module.exports = withNativeWind(config, { input: "./global.css", inlineRem: 16 });
