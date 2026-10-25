import { createContext, useContext } from "react";

const SheetContext = createContext(false);

/** Wraps the content of a `Sheet`; only `Sheet` mounts it. */
export const SheetContextProvider = SheetContext.Provider;

/**
 * True for a component rendered inside a `Sheet`. Text fields read it to pick the keyboard-aware
 * input (R30), so nobody has to remember an "in a sheet" flag.
 */
export function useInSheet(): boolean {
  return useContext(SheetContext);
}
