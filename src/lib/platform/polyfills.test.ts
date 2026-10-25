import { installCryptoPolyfill } from "./polyfills";

import type * as NodeCrypto from "node:crypto";

// jest-expo auto-mocks the native expo-crypto module and its functions return nothing, so back
// them with Node's Web Crypto to check real output.
jest.mock("expo-crypto", () => {
  const nodeCrypto = jest.requireActual<typeof NodeCrypto>("node:crypto");
  return {
    randomUUID: () => nodeCrypto.randomUUID(),
    getRandomValues: <T extends ArrayBufferView>(array: T): T => nodeCrypto.getRandomValues(array),
  };
});

const UUID_V4 = /^[0-9a-f-]{36}$/;

describe("installCryptoPolyfill", () => {
  it("installs randomUUID when missing", () => {
    const target: { crypto?: Partial<Crypto> } = {};
    installCryptoPolyfill(target);
    expect(target.crypto?.randomUUID?.()).toMatch(UUID_V4);
  });

  it("keeps existing randomUUID", () => {
    const existing = jest.fn(() => "11111111-1111-4111-8111-111111111111" as const);
    const target: { crypto?: Partial<Crypto> } = { crypto: { randomUUID: existing } };
    installCryptoPolyfill(target);
    expect(target.crypto?.randomUUID).toBe(existing);
  });

  it("installs getRandomValues when missing", () => {
    const target: { crypto?: Partial<Crypto> } = { crypto: {} };
    installCryptoPolyfill(target);
    const bytes = new Uint8Array(16);
    expect(target.crypto?.getRandomValues?.(bytes)).toBe(bytes);
  });

  it("rejects typed arrays that are not integer based", () => {
    const target: { crypto?: Partial<Crypto> } = {};
    installCryptoPolyfill(target);
    expect(() => target.crypto?.getRandomValues?.(new Float32Array(4))).toThrow(TypeError);
  });

  it("fills in missing functions on the existing crypto object", () => {
    const existing: Partial<Crypto> = {};
    const target: { crypto?: Partial<Crypto> } = { crypto: existing };
    installCryptoPolyfill(target);
    expect(target.crypto).toBe(existing);
    expect(existing.randomUUID).toEqual(expect.any(Function));
  });

  it("keeps existing getRandomValues", () => {
    const existing = jest.fn(<T extends ArrayBufferView | null>(array: T): T => array);
    const target: { crypto?: Partial<Crypto> } = { crypto: { getRandomValues: existing } };
    installCryptoPolyfill(target);
    expect(target.crypto?.getRandomValues).toBe(existing);
  });
});
