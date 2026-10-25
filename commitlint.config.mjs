/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Scope should match a module or area of the app
    "scope-enum": [
      1,
      "always",
      [
        "receipt",
        "inventory",
        "inventory-item",
        "transfer",
        "move",
        "order",
        "picking",
        "packing",
        "shipping",
        "auth",
        "shell",
        "shared",
        "ui",
        "scan",
        "sync",
        "config",
        "deps",
        "ci",
        "rules",
      ],
    ],
  },
};
