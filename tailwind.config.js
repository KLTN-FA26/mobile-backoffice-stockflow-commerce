// Colours, radius and font families all come from src/lib/tokens.ts, so there is nothing to keep in
// step by hand. Tailwind loads this file in plain Node; when it cannot require the .ts file itself
// it retries through its bundled jiti, which is why tokens.ts may only import types.
const { COLOR_TOKENS, FONT_FAMILY, RADIUS } = require("./src/lib/tokens");

/** @type {import("tailwindcss").Config} */
module.exports = {
  presets: [require("nativewind/preset")],
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // The variables are set by ThemeProvider, so the same class is right in light and dark.
      colors: Object.fromEntries(
        Object.keys(COLOR_TOKENS.light).map((token) => [
          token,
          `rgb(var(--${token}) / <alpha-value>)`,
        ]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(RADIUS).map(([name, value]) => [name, `${value}px`]),
      ),
      fontFamily: FONT_FAMILY,
    },
  },
};
