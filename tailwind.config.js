// Colours, radius and font families all come from src/lib/tokens.ts, so there is nothing to keep in
// step by hand. Tailwind loads this file in plain Node; when it cannot require the .ts file itself
// it retries through its bundled jiti, which is why tokens.ts may only import types.
const { COLOR_TOKENS, FONT_FAMILY, RADIUS } = require("./src/lib/tokens");

/** @type {import("tailwindcss").Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    // `colors` (not `extend.colors`) on purpose: the design tokens are the whole palette. A default-palette class
    // (bg-white, text-red-500, border-gray-200…) generates nothing here instead of a colour outside the tokens.
    // transparent and current are the two keywords the tokens do not cover.
    // The variables are set by ThemeProvider, so the same class is right in light and dark.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      ...Object.fromEntries(
        Object.keys(COLOR_TOKENS.light).map((token) => [
          token,
          `rgb(var(--${token}) / <alpha-value>)`,
        ]),
      ),
    },
    extend: {
      // A bare `border` (or `divide-*`) would otherwise fall back to gray-200 / currentColor, which no longer exist.
      borderColor: { DEFAULT: "rgb(var(--border-default) / <alpha-value>)" },
      borderRadius: Object.fromEntries(
        Object.entries(RADIUS).map(([name, value]) => [name, `${value}px`]),
      ),
      fontFamily: FONT_FAMILY,
    },
  },
};
