import { act, fireEvent, render, screen, userEvent } from "@testing-library/react-native";
import { Truck } from "lucide-react-native";
import { Text as RNText } from "react-native";

import { UI_LABELS } from "@/constants";
import { MOBILE_LABELS, UI_LIMITS } from "@/constants/mobile";

import { ApiError } from "@/lib/api/error";

import { ListScreen, RecordCard } from "..";
import { LIST_SCREEN_TEST_ID } from "../ListParts";
import { SKELETON_CARD_TEST_ID } from "../ListSkeleton";

import type { ListScreenProps } from "..";
import type { ReactElement } from "react";

type Item = { id: string; title: string };

const ITEMS: Item[] = [
  { id: "1", title: "GR-0001" },
  { id: "2", title: "GR-0002" },
  { id: "3", title: "GR-0003" },
];

function manyItems(count: number): Item[] {
  return Array.from({ length: count }, (_, i) => ({ id: String(i), title: `GR-${i}` }));
}

function propsWith(overrides: Partial<ListScreenProps<Item>> = {}): ListScreenProps<Item> {
  return {
    status: "success",
    items: ITEMS,
    renderItem: (item: Item): ReactElement => <RecordCard title={item.title} />,
    keyExtractor: (item: Item) => item.id,
    hasActiveFilters: false,
    emptyNoData: { title: "Chưa có phiếu nhận" },
    onClearFilters: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    onEndReached: jest.fn(),
    isRefetching: false,
    onRefresh: jest.fn(),
    ...overrides,
  };
}

async function show(overrides: Partial<ListScreenProps<Item>> = {}) {
  const props = propsWith(overrides);
  const view = await render(<ListScreen<Item> {...props} />);
  return { props, ...view };
}

/** Scrolls the list to its end, the way a finger would. */
async function scrollToEnd() {
  await fireEvent.scroll(screen.getByTestId(LIST_SCREEN_TEST_ID), {
    nativeEvent: {
      contentOffset: { x: 0, y: 2100 },
      contentSize: { width: 400, height: 3000 },
      layoutMeasurement: { width: 400, height: 900 },
    },
  });
}

async function pullToRefresh() {
  const list = screen.getByTestId(LIST_SCREEN_TEST_ID);
  const control = list.props.refreshControl as ReactElement<{ onRefresh: () => void }>;
  await act(async () => {
    control.props.onRefresh();
  });
}

describe("ListScreen", () => {
  describe("pending", () => {
    it("pending shows skeletons", async () => {
      await show({ status: "pending", items: [] });

      expect(screen.getAllByTestId(SKELETON_CARD_TEST_ID)).toHaveLength(5);
      expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.loading })).toBeTruthy();
      expect(screen.queryByText("Chưa có phiếu nhận")).toBeNull();
    });

    it("keeps the header while loading", async () => {
      await show({ status: "pending", items: [], header: <RNText>Tìm kiếm phiếu</RNText> });

      expect(screen.getByText("Tìm kiếm phiếu")).toBeTruthy();
    });
  });

  describe("error", () => {
    it("error shows retry", async () => {
      const user = userEvent.setup();
      const { props } = await show({
        status: "error",
        items: [],
        error: new ApiError(500, "INTERNAL_ERROR", "boom", undefined, "trace-123"),
        onRetry: jest.fn(),
      });

      expect(screen.getByText(`${MOBILE_LABELS.traceId}: trace-123`)).toBeTruthy();
      await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));
      expect(props.onRetry).toHaveBeenCalledTimes(1);
    });

    it("picks the error screen from the kind of error", async () => {
      await show({
        status: "error",
        items: [],
        error: new ApiError(0, "NETWORK_ERROR", "offline"),
        onRetry: jest.fn(),
      });

      // Not a server error: the network copy, with a retry.
      expect(screen.getByText(UI_LABELS.loadError.networkTitle)).toBeTruthy();
      expect(screen.queryByText(UI_LABELS.loadError.serverTitle)).toBeNull();
      expect(screen.getByRole("button", { name: MOBILE_LABELS.retry })).toBeTruthy();
    });

    it("treats an error that is not an ApiError as a server error without a trace id", async () => {
      await show({ status: "error", items: [], error: new Error("boom"), onRetry: jest.fn() });

      expect(screen.getByText(UI_LABELS.loadError.serverTitle)).toBeTruthy();
      expect(screen.getByRole("button", { name: MOBILE_LABELS.retry })).toBeTruthy();
      expect(screen.queryByText(MOBILE_LABELS.traceId, { exact: false })).toBeNull();
    });

    it("offers no retry for a forbidden error", async () => {
      await show({
        status: "error",
        items: [],
        error: new ApiError(403, "FORBIDDEN", "no"),
        onRetry: jest.fn(),
      });

      expect(screen.getByText(UI_LABELS.loadError.forbiddenTitle)).toBeTruthy();
      expect(screen.queryByRole("button", { name: MOBILE_LABELS.retry })).toBeNull();
    });

    it("pull to refresh works on the error screen", async () => {
      const { props } = await show({
        status: "error",
        items: [],
        error: new Error("boom"),
        onRetry: jest.fn(),
      });

      await pullToRefresh();

      expect(props.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("empty", () => {
    it("empty without filters shows no-data", async () => {
      const user = userEvent.setup();
      const onCreate = jest.fn();
      const { props } = await show({
        items: [],
        hasActiveFilters: false,
        emptyNoData: {
          title: "Chưa có phiếu nhận",
          description: "Tạo phiếu nhận đầu tiên",
          action: { label: "Tạo phiếu nhận", onPress: onCreate },
        },
      });

      expect(screen.getByText("Chưa có phiếu nhận")).toBeTruthy();
      expect(screen.getByText("Tạo phiếu nhận đầu tiên")).toBeTruthy();
      expect(screen.queryByText(MOBILE_LABELS.noResultsTitle)).toBeNull();
      expect(screen.queryByRole("button", { name: MOBILE_LABELS.clearFilters })).toBeNull();
      await user.press(screen.getByRole("button", { name: "Tạo phiếu nhận" }));
      expect(onCreate).toHaveBeenCalledTimes(1);
      expect(props.onClearFilters).not.toHaveBeenCalled();
    });

    it("empty with filters shows no-results", async () => {
      const user = userEvent.setup();
      const { props } = await show({ items: [], hasActiveFilters: true });

      expect(screen.getByText(MOBILE_LABELS.noResultsTitle)).toBeTruthy();
      expect(screen.queryByText("Chưa có phiếu nhận")).toBeNull();
      await user.press(screen.getByRole("button", { name: MOBILE_LABELS.clearFilters }));
      expect(props.onClearFilters).toHaveBeenCalledTimes(1);
    });

    it("pull to refresh works on an empty list", async () => {
      const { props } = await show({ items: [] });

      await pullToRefresh();

      expect(props.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("list", () => {
    it("renders each item through renderItem", async () => {
      await show();

      expect(screen.getByText("GR-0001")).toBeTruthy();
      expect(screen.getByText("GR-0003")).toBeTruthy();
    });

    it("shows the header and the caption above the rows", async () => {
      await show({ header: <RNText>Tìm kiếm phiếu</RNText>, caption: "Hiển thị 3 / 40" });

      expect(screen.getByText("Tìm kiếm phiếu")).toBeTruthy();
      expect(screen.getByText("Hiển thị 3 / 40")).toBeTruthy();
    });

    it("leaves the caption out of the empty and error screens", async () => {
      await show({ items: [], caption: "Hiển thị 0 / 0" });

      expect(screen.queryByText("Hiển thị 0 / 0")).toBeNull();
    });

    it("end reached requests next page", async () => {
      const { props } = await show({ items: manyItems(30), hasNextPage: true });

      await scrollToEnd();

      expect(props.onEndReached).toHaveBeenCalled();
    });

    it("does not request a page when there is none", async () => {
      const { props } = await show({ items: manyItems(30), hasNextPage: false });

      await scrollToEnd();

      expect(props.onEndReached).not.toHaveBeenCalled();
    });

    it("does not request a page while one is on its way", async () => {
      const { props } = await show({
        items: manyItems(30),
        hasNextPage: true,
        isFetchingNextPage: true,
      });

      await scrollToEnd();

      expect(props.onEndReached).not.toHaveBeenCalled();
    });

    it("does not request a page while the list reloads", async () => {
      const { props } = await show({
        items: manyItems(30),
        hasNextPage: true,
        isRefetching: true,
      });

      await scrollToEnd();

      expect(props.onEndReached).not.toHaveBeenCalled();
    });

    it("shows a spinner at the end of the list while the next page loads", async () => {
      await show({ hasNextPage: true, isFetchingNextPage: true });
      expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.loadingMore })).toBeTruthy();
    });

    it("has no spinner at the end of the list when no page is loading", async () => {
      await show({ hasNextPage: true });
      expect(screen.queryByRole("progressbar", { name: MOBILE_LABELS.loadingMore })).toBeNull();
    });

    it("pull to refresh asks for a reload", async () => {
      const { props } = await show();

      await pullToRefresh();

      expect(props.onRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe("refetch bar", () => {
    it("shows the refetch bar while refetching", async () => {
      await show({ isRefetching: true });

      expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.refetching })).toBeTruthy();
    });

    it("hides the refetch bar otherwise", async () => {
      await show({ isRefetching: false });

      expect(screen.queryByRole("progressbar", { name: MOBILE_LABELS.refetching })).toBeNull();
    });
  });

  describe("fab", () => {
    it("fab renders when provided", async () => {
      const user = userEvent.setup();
      const onPress = jest.fn();
      await show({ fab: { label: "Tạo phiếu nhận", onPress } });

      await user.press(screen.getByRole("button", { name: "Tạo phiếu nhận" }));

      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it("has no button when no fab is given", async () => {
      await show();

      expect(screen.queryByRole("button")).toBeNull();
    });

    it("also shows over an empty list, and takes an icon", async () => {
      await show({ items: [], fab: { label: "Mở chuyến", icon: Truck, onPress: jest.fn() } });

      expect(screen.getByRole("button", { name: "Mở chuyến" })).toBeTruthy();
    });
  });

  describe("error with rows already loaded", () => {
    it("error with rows keeps the rows and shows an inline retry", async () => {
      const user = userEvent.setup();
      const { props } = await show({
        status: "error",
        error: new ApiError(0, "NETWORK_ERROR", "offline"),
        onRetry: jest.fn(),
        caption: "Hiển thị 3 / 40",
      });

      expect(screen.getByText("GR-0001")).toBeTruthy();
      expect(screen.getByText("GR-0003")).toBeTruthy();
      expect(screen.getByText("Hiển thị 3 / 40")).toBeTruthy();
      expect(screen.getByText(MOBILE_LABELS.refetchFailed)).toBeTruthy();
      // The full-screen error is for a list with nothing to show.
      expect(screen.queryByText(UI_LABELS.loadError.networkTitle)).toBeNull();
      await user.press(screen.getByRole("button", { name: MOBILE_LABELS.retry }));
      expect(props.onRetry).toHaveBeenCalledTimes(1);
    });

    it("shows the notice without a button when there is nothing to retry with", async () => {
      await show({ status: "error", error: new Error("boom") });

      expect(screen.getByText(MOBILE_LABELS.refetchFailed)).toBeTruthy();
      expect(screen.queryByRole("button", { name: MOBILE_LABELS.retry })).toBeNull();
    });

    it("locks the inline retry while the reload runs", async () => {
      await show({
        status: "error",
        error: new Error("boom"),
        onRetry: jest.fn(),
        isRefetching: true,
      });

      expect(screen.getByRole("button", { name: MOBILE_LABELS.retry })).toBeBusy();
    });

    it("shows no notice when the list loaded fine", async () => {
      await show();

      expect(screen.queryByText(MOBILE_LABELS.refetchFailed)).toBeNull();
    });
  });

  describe("placeholder data (the rows of the previous filters)", () => {
    it("end reached during placeholder data does not fetch next page", async () => {
      const { props } = await show({
        items: manyItems(30),
        hasNextPage: true,
        isPlaceholderData: true,
      });

      await scrollToEnd();

      expect(props.onEndReached).not.toHaveBeenCalled();
    });

    it("keeps the rows under the refetch bar while the new filters load", async () => {
      await show({ isPlaceholderData: true, isRefetching: true });

      expect(screen.getByText("GR-0001")).toBeTruthy();
      expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.refetching })).toBeTruthy();
      expect(screen.queryAllByTestId(SKELETON_CARD_TEST_ID)).toHaveLength(0);
    });

    it("shows skeletons, not an empty state, when the previous rows were none", async () => {
      await show({
        items: [],
        hasActiveFilters: true,
        isPlaceholderData: true,
        isRefetching: true,
      });

      expect(screen.getAllByTestId(SKELETON_CARD_TEST_ID)).toHaveLength(5);
      expect(screen.queryByText(MOBILE_LABELS.noResultsTitle)).toBeNull();
    });
  });

  describe("pull to refresh spinner", () => {
    function spinning(): boolean {
      const list = screen.getByTestId(LIST_SCREEN_TEST_ID);
      return (list.props.refreshControl as ReactElement<{ refreshing: boolean }>).props.refreshing;
    }

    it("a background refetch does not show the pull spinner", async () => {
      const { props, rerender } = await show();

      await rerender(<ListScreen<Item> {...props} isRefetching />);

      expect(spinning()).toBe(false);
      // The thin bar is what says "reloading" here.
      expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.refetching })).toBeTruthy();
    });

    it("a pull shows the spinner until the reload settles", async () => {
      const { props, rerender } = await show();

      await pullToRefresh();
      expect(spinning()).toBe(true);

      await rerender(<ListScreen<Item> {...props} isRefetching />);
      expect(spinning()).toBe(true);

      await rerender(<ListScreen<Item> {...props} isRefetching={false} />);
      expect(spinning()).toBe(false);
    });

    it("the spinner of an earlier pull does not come back for a later background refetch", async () => {
      const { props, rerender } = await show();
      await pullToRefresh();
      await rerender(<ListScreen<Item> {...props} isRefetching />);
      await rerender(<ListScreen<Item> {...props} isRefetching={false} />);

      await rerender(<ListScreen<Item> {...props} isRefetching />);

      expect(spinning()).toBe(false);
    });

    it("stops spinning after a moment when the reload never shows as running", async () => {
      jest.useFakeTimers();
      try {
        await show();
        await pullToRefresh();
        expect(spinning()).toBe(true);

        await act(async () => {
          jest.advanceTimersByTime(UI_LIMITS.pullSettleGraceMs);
        });

        expect(spinning()).toBe(false);
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
