// In-memory stand-in for `expo-sqlite/kv-store` (mapped in jest.config.js).
const data = new Map<string, string>();

export const Storage = {
  getItemSync(key: string): string | null {
    return data.get(key) ?? null;
  },
  setItemSync(key: string, value: string): void {
    data.set(key, value);
  },
  removeItemSync(key: string): boolean {
    return data.delete(key);
  },
  getAllKeysSync(): string[] {
    return [...data.keys()];
  },
  clearSync(): boolean {
    const hadItems = data.size > 0;
    data.clear();
    return hadItems;
  },
};

export default Storage;
