import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);

// loadConfig is what Tailwind itself uses: it retries through its bundled jiti when plain Node cannot
// require tokens.ts (a bare `require("./tailwind.config.js")` cannot).
const loadConfig = require("tailwindcss/loadConfig");
const resolveConfig = require("tailwindcss/resolveConfig");
const { theme } = resolveConfig(loadConfig(path.join(REPO, "tailwind.config.js")));

const tokenNames = () =>
  Object.keys(theme.colors).filter((name) => !["transparent", "current"].includes(name));

describe("tailwind theme colours", () => {
  it("are the design tokens plus transparent and current, and no default palette", () => {
    const names = Object.keys(theme.colors);
    for (const required of ["bg-base", "bg-surface", "ink-primary", "border-default", "danger"]) {
      assert.ok(names.includes(required), `${required} is missing: ${names.join(", ")}`);
    }
    assert.ok(names.includes("transparent") && names.includes("current"), names.join(", "));
    for (const gone of ["white", "black", "red", "gray", "slate", "blue", "pink", "inherit"]) {
      assert.ok(!names.includes(gone), `${gone} is still in the palette`);
    }
  });

  it("map every token to its theme variable, so one class is right in light and dark", () => {
    for (const name of tokenNames()) {
      assert.equal(theme.colors[name], `rgb(var(--${name}) / <alpha-value>)`, name);
    }
    assert.equal(theme.colors.transparent, "transparent");
    assert.equal(theme.colors.current, "currentColor");
  });

  it("keep a bare border on the default border token, not on a palette grey", () => {
    assert.equal(theme.borderColor.DEFAULT, "rgb(var(--border-default) / <alpha-value>)");
  });

  it("leave radius and font families to tokens.ts", () => {
    assert.equal(theme.borderRadius.md, "8px");
    assert.ok(Array.isArray(theme.fontFamily.sans) || typeof theme.fontFamily.sans === "string");
  });
});
