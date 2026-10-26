import { act, renderHook } from "@testing-library/react-native";

import { useSubmitLatch } from "./use-submit-latch";

import type { SubmitLatchOptions } from "./use-submit-latch";

async function renderLatch(initial: SubmitLatchOptions = {}) {
  const action = jest.fn();
  const view = await renderHook((options: SubmitLatchOptions) => useSubmitLatch(options), {
    initialProps: initial,
  });
  const tap = () => act(() => view.result.current(action));
  return { ...view, action, tap };
}

describe("useSubmitLatch", () => {
  it("ignores a second tap that comes before the request shows as loading", async () => {
    const { action, tap } = await renderLatch({ loading: false });

    await tap();
    await tap();

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("takes a tap again once loading has been true and is false again", async () => {
    const { action, tap, rerender } = await renderLatch({ loading: false });
    await tap();

    await rerender({ loading: true });
    await tap();
    expect(action).toHaveBeenCalledTimes(1);

    await rerender({ loading: false });
    await tap();
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("takes a tap again when one of the release values changes", async () => {
    const { action, tap, rerender } = await renderLatch({ releaseOn: [1, null] });
    await tap();

    // The same values in a new array change nothing.
    await rerender({ releaseOn: [1, null] });
    await tap();
    expect(action).toHaveBeenCalledTimes(1);

    await rerender({ releaseOn: [1, "Phiếu đã có hàng nhập kho"] });
    await tap();
    expect(action).toHaveBeenCalledTimes(2);

    await rerender({ releaseOn: [2, "Phiếu đã có hàng nhập kho"] });
    await tap();
    expect(action).toHaveBeenCalledTimes(3);
  });

  it("stays latched while nothing changes, re-renders included", async () => {
    const { action, tap, rerender } = await renderLatch({ loading: false, releaseOn: [1] });
    await tap();

    await rerender({ loading: false, releaseOn: [1] });
    await rerender({ loading: false, releaseOn: [1] });
    await tap();

    expect(action).toHaveBeenCalledTimes(1);
  });
});
