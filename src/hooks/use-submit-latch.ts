import { useEffect, useRef } from "react";

export type SubmitLatchOptions = {
  /**
   * The request's running state, e.g. TanStack's `isPending`. It must show as `true` for at least
   * one render (TanStack's does), or only `releaseOn` frees the latch.
   */
  loading?: boolean;
  /** Values that free the latch when one of them changes: the sheet opened again, a new error. */
  releaseOn?: readonly unknown[];
};

function changed(before: readonly unknown[], now: readonly unknown[]): boolean {
  return (
    before.length !== now.length || now.some((value, index) => !Object.is(value, before[index]))
  );
}

/**
 * One submit per tap until the request is over (spec §3.5: "chặn bấm 2 lần bằng ref"). A button
 * that disables itself while `loading` still lets a second tap through: the request only shows as
 * running a render after the first tap. The returned `run(action)` runs the action unless a run is
 * latched, and latches from the tap until `loading` has been true and is false again, or a
 * `releaseOn` value changes.
 */
export function useSubmitLatch({ loading = false, releaseOn = [] }: SubmitLatchOptions = {}): (
  action: () => void,
) => void {
  const latched = useRef(false);
  const seen = useRef({ loading, releaseOn });

  // After every render: compare with what the last one saw.
  useEffect(() => {
    const before = seen.current;
    if ((before.loading && !loading) || changed(before.releaseOn, releaseOn)) {
      latched.current = false;
    }
    seen.current = { loading, releaseOn };
  });

  return (action) => {
    if (latched.current) return;
    latched.current = true;
    action();
  };
}
