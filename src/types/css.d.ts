// `import "../global.css"` in the root layout: NativeWind compiles the file in Metro and the import
// exports nothing. Expo declares this in `expo/types`, but that only reaches the project through the
// generated, git-ignored `expo-env.d.ts`, so type checks on a fresh clone would not see it.
declare module "*.css";
