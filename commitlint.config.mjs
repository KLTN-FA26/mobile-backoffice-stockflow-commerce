/** @type {import("@commitlint/types").UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Scope, when given, must be one of these (level 2 = error, so a typo cannot slip in as a warning)
    "scope-enum": [
      2,
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
