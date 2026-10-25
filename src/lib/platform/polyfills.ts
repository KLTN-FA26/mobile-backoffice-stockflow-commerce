import { getRandomValues, randomUUID } from "expo-crypto";

import type { IntBasedTypedArray, UintBasedTypedArray } from "expo";

type CryptoTarget = { crypto?: Partial<Crypto> };
type Uuid = ReturnType<Crypto["randomUUID"]>;
type IntegerTypedArray = IntBasedTypedArray | UintBasedTypedArray;

// Web Crypto fills integer typed arrays only; expo-crypto's signature says the same.
function isIntegerTypedArray(value: ArrayBufferView): value is IntegerTypedArray {
  return (
    value instanceof Int8Array ||
    value instanceof Int16Array ||
    value instanceof Int32Array ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Uint16Array ||
    value instanceof Uint32Array
  );
}

// Hermes ships no Web Crypto, but the shared web code (idempotency keys, correlation ids) calls
// `crypto.randomUUID()` and `crypto.getRandomValues()`. Fill in only what is missing so a runtime
// that already has them (tests, web) keeps its own implementation.
export function installCryptoPolyfill(target: CryptoTarget = globalThis): void {
  const crypto: Partial<Crypto> = target.crypto ?? {};
  crypto.randomUUID ??= () => randomUUID() as Uuid;
  crypto.getRandomValues ??= <T extends ArrayBufferView>(array: T): T => {
    if (!isIntegerTypedArray(array)) {
      throw new TypeError("getRandomValues expects an integer-based typed array");
    }
    getRandomValues(array);
    return array;
  };
  // Some runtimes expose `globalThis.crypto` as a getter only: touch it just when it is absent.
  if (target.crypto === undefined) target.crypto = crypto;
}
