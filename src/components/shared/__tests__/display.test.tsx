import { NetInfoStateType, useNetInfo } from "@react-native-community/netinfo";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Hammer } from "lucide-react-native";
import { Text as RNText } from "react-native";
import { createGestureController } from "react-native-gesture-handler/jest-utils";

import { UI_LABELS } from "@/constants";
import { MOBILE_LABELS } from "@/constants/mobile";

import { ApiError } from "@/lib/api/error";
import { classifyLoadError } from "@/lib/api/load-error";

import {
  ComingSoon,
  EmptyStateNoData,
  EmptyStateNoResults,
  InfoRow,
  LoadErrorState,
  OfflineBanner,
  ProgressBar,
  RecordCard,
  RefetchBar,
  Section,
  Segmented,
  StatusDot,
  ToneDot,
} from "..";
import { STATUS_DOT_GESTURE_ID } from "../StatusDot";
import { TONE_DOT_TEST_ID } from "../ToneDot";

import type { LoadErrorKind } from "@/lib/api/load-error";
import type { SemanticTone } from "@/lib/domain/status-types";
import type { NetInfoState } from "@react-native-community/netinfo";

const ONLINE: NetInfoState = {
  type: NetInfoStateType.other,
  isConnected: true,
  isInternetReachable: true,
  details: { isConnectionExpensive: false },
};
const OFFLINE: NetInfoState = {
  type: NetInfoStateType.none,
  isConnected: false,
  isInternetReachable: false,
  details: null,
};
const UNKNOWN: NetInfoState = {
  type: NetInfoStateType.unknown,
  isConnected: null,
  isInternetReachable: null,
  details: null,
};

beforeEach(() => {
  jest.mocked(useNetInfo).mockReturnValue(ONLINE);
});

/** The class list of the coloured dot, which screen readers skip (hence the hidden-elements flag). */
function dotClassName(): string {
  const dot = screen.getByTestId(TONE_DOT_TEST_ID, { includeHiddenElements: true });
  return String(dot.props.className);
}

/** A long press on the status label, as the gesture system would report it: began, active, ended. */
async function longPressStatus(): Promise<void> {
  const press = createGestureController(STATUS_DOT_GESTURE_ID);
  await act(async () => {
    press.begin();
    press.activate();
    press.end();
  });
}

describe("StatusDot", () => {
  it("status dot shows vietnamese label", async () => {
    await render(<StatusDot domain="receipt" status="In QC" />);

    expect(screen.getByText("Đang kiểm QC")).toBeTruthy();
    expect(screen.getByLabelText("Đang kiểm QC — In QC")).toBeTruthy();
    expect(screen.queryByText("In QC")).toBeNull();
  });

  it("status dot falls back to raw status", async () => {
    await render(<StatusDot domain="receipt" status="SOMETHING_NEW" />);

    expect(screen.getByText("SOMETHING_NEW")).toBeTruthy();
    expect(screen.getByLabelText("SOMETHING_NEW")).toBeTruthy();
  });

  it("status dot long press reveals english original", async () => {
    await render(<StatusDot domain="receipt" status="In QC" />);
    expect(screen.queryByText("Đang kiểm QC — In QC")).toBeNull();

    await longPressStatus();
    expect(screen.getByText("Đang kiểm QC — In QC")).toBeTruthy();

    await longPressStatus();
    expect(screen.queryByText("Đang kiểm QC — In QC")).toBeNull();
  });

  it("pressing the status inside a pressable RecordCard calls the card's onPress", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <RecordCard
        title="GR-0001"
        status={<StatusDot domain="receipt" status="In QC" />}
        onPress={onPress}
      />,
    );

    await user.press(screen.getByText("Đang kiểm QC"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it.each<[string, string, string]>([
    ["a coloured tone keeps the bright dot token", "In QC", "bg-dot-warning"],
    ["neutral keeps its own colour", "Draft", "bg-neutral"],
    ["muted keeps its own colour", "Inactive", "bg-muted"],
    ["an unknown status falls back to neutral", "SOMETHING_NEW", "bg-neutral"],
  ])("status dot colour: %s", async (_name, status, expectedClass) => {
    await render(<StatusDot domain="receipt" status={status} />);

    expect(dotClassName()).toContain(expectedClass);
  });

  it("status dot size md is a bigger dot and a body-size label than sm", async () => {
    const { rerender } = await render(<StatusDot domain="receipt" status="In QC" size="sm" />);
    expect(dotClassName()).toContain("h-2.5 w-2.5");
    expect(screen.getByText("Đang kiểm QC").props.className).toContain("text-[13px]");

    await rerender(<StatusDot domain="receipt" status="In QC" size="md" />);
    expect(screen.getByText("Đang kiểm QC")).toBeTruthy();
    expect(dotClassName()).toContain("h-3 w-3");
    expect(screen.getByText("Đang kiểm QC").props.className).toContain("text-[15px]");
  });
});

describe("ToneDot", () => {
  it("tone dot shows its label", async () => {
    await render(<ToneDot tone="warning" label="Sắp hết hạn" />);

    expect(screen.getByText("Sắp hết hạn")).toBeTruthy();
  });

  // The web StatusDot colours: bright `dot-*` for five tones, the tone's own colour for the other two.
  it.each<[SemanticTone, string]>([
    ["positive", "bg-dot-positive"],
    ["info", "bg-dot-info"],
    ["warning", "bg-dot-warning"],
    ["danger", "bg-dot-danger"],
    ["special", "bg-dot-special"],
    ["neutral", "bg-neutral"],
    ["muted", "bg-muted"],
  ])("tone dot %s is painted %s", async (tone, expectedClass) => {
    await render(<ToneDot tone={tone} label="x" />);

    expect(dotClassName().split(" ")).toContain(expectedClass);
  });
});

describe("empty states", () => {
  it("no-data and no-results are different components", async () => {
    const onClearFilters = jest.fn();
    const user = userEvent.setup();
    await render(
      <>
        <EmptyStateNoData title="Chưa có phiếu nhận" description="Tạo phiếu đầu tiên." />
        <EmptyStateNoResults onClearFilters={onClearFilters} />
      </>,
    );

    expect(EmptyStateNoData).not.toBe(EmptyStateNoResults);
    expect(screen.getByText("Chưa có phiếu nhận")).toBeTruthy();
    expect(screen.getByText("Tạo phiếu đầu tiên.")).toBeTruthy();
    expect(screen.getByText(MOBILE_LABELS.noResultsTitle)).toBeTruthy();
    // Only the filtered-out list offers to clear filters; the empty one has no button at all.
    expect(screen.getAllByRole("button")).toHaveLength(1);

    await user.press(screen.getByRole("button", { name: "Bỏ bộ lọc" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("no-data shows its call to action only when given one", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(<EmptyStateNoData title="Chưa có phiếu nhận" />);
    expect(screen.queryByRole("button")).toBeNull();

    await rerender(
      <EmptyStateNoData title="Chưa có phiếu nhận" action={{ label: "Tạo phiếu", onPress }} />,
    );
    await user.press(screen.getByRole("button", { name: "Tạo phiếu" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("no-results accepts its own title", async () => {
    await render(<EmptyStateNoResults title="Không có đơn nào khớp" onClearFilters={jest.fn()} />);

    expect(screen.getByText("Không có đơn nào khớp")).toBeTruthy();
    expect(screen.queryByText(MOBILE_LABELS.noResultsTitle)).toBeNull();
  });
});

describe("LoadErrorState", () => {
  it("load error network shows retry and trace id", async () => {
    const error = new ApiError(0, "NETWORK_ERROR", "offline", undefined, "trace-123");
    const onRetry = jest.fn();
    const user = userEvent.setup();
    await render(
      <LoadErrorState kind={classifyLoadError(error)} traceId={error.traceId} onRetry={onRetry} />,
    );

    expect(screen.getByText(UI_LABELS.loadError.networkTitle)).toBeTruthy();
    expect(screen.getByText(UI_LABELS.loadError.networkDescription)).toBeTruthy();
    expect(screen.getByText(`${MOBILE_LABELS.traceId}: trace-123`)).toBeTruthy();

    await user.press(screen.getByRole("button", { name: "Thử lại" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("load error forbidden has no retry", async () => {
    await render(<LoadErrorState kind="forbidden" onRetry={jest.fn()} />);

    expect(screen.getByText(UI_LABELS.loadError.forbiddenTitle)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it.each<[LoadErrorKind, string, string | undefined]>([
    ["network", UI_LABELS.loadError.networkTitle, UI_LABELS.loadError.networkDescription],
    [
      "invalid-data",
      UI_LABELS.loadError.invalidDataTitle,
      UI_LABELS.loadError.invalidDataDescription,
    ],
    ["server", UI_LABELS.loadError.serverTitle, UI_LABELS.loadError.serverDescription],
    [
      "permissions",
      UI_LABELS.loadError.permissionsTitle,
      UI_LABELS.loadError.permissionsDescription,
    ],
    ["forbidden", UI_LABELS.loadError.forbiddenTitle, undefined],
    ["no-read", UI_LABELS.loadError.noReadTitle, undefined],
    ["not-found", MOBILE_LABELS.notFoundTitle, undefined],
  ])("load error %s uses the default copy", async (kind, title, description) => {
    await render(<LoadErrorState kind={kind} />);

    expect(screen.getByText(title)).toBeTruthy();
    if (description !== undefined) expect(screen.getByText(description)).toBeTruthy();
    expect(screen.queryByText(new RegExp(MOBILE_LABELS.traceId))).toBeNull();
  });

  it.each<[LoadErrorKind, boolean]>([
    ["network", true],
    ["server", true],
    ["invalid-data", true],
    ["permissions", true],
    ["forbidden", false],
    ["no-read", false],
    ["not-found", false],
  ])("load error %s offers retry: %s", async (kind, retryable) => {
    await render(<LoadErrorState kind={kind} onRetry={jest.fn()} />);

    expect(screen.queryByRole("button", { name: MOBILE_LABELS.retry }) !== null).toBe(retryable);
  });

  it("load error without onRetry shows no retry button", async () => {
    await render(<LoadErrorState kind="server" />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("load error lets the feature override the not-found title and description", async () => {
    await render(
      <LoadErrorState kind="not-found" title="Không tìm thấy đơn hàng" description="Đã bị xoá." />,
    );

    expect(screen.getByText("Không tìm thấy đơn hàng")).toBeTruthy();
    expect(screen.getByText("Đã bị xoá.")).toBeTruthy();
    expect(screen.queryByText(MOBILE_LABELS.notFoundTitle)).toBeNull();
  });
});

describe("OfflineBanner", () => {
  it("offline banner shows when disconnected", async () => {
    jest.mocked(useNetInfo).mockReturnValue(OFFLINE);
    await render(<OfflineBanner />);

    expect(screen.getByRole("alert")).toHaveTextContent(MOBILE_LABELS.offline);
  });

  it("offline banner stays hidden while connected", async () => {
    await render(<OfflineBanner />);

    expect(screen.queryByText(MOBILE_LABELS.offline)).toBeNull();
  });

  it("offline banner stays hidden while the connection state is still unknown", async () => {
    jest.mocked(useNetInfo).mockReturnValue(UNKNOWN);
    await render(<OfflineBanner />);

    expect(screen.queryByText(MOBILE_LABELS.offline)).toBeNull();
  });
});

describe("RefetchBar", () => {
  it("refetch bar reports a background reload only while visible", async () => {
    const { rerender } = await render(<RefetchBar visible={false} />);
    expect(screen.queryByRole("progressbar")).toBeNull();

    await rerender(<RefetchBar visible />);
    expect(screen.getByRole("progressbar", { name: MOBILE_LABELS.refetching })).toBeBusy();

    await rerender(<RefetchBar visible={false} />);
    expect(screen.queryByRole("progressbar")).toBeNull();
  });
});

describe("RecordCard", () => {
  it("record card is pressable with label", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(
      <RecordCard
        title="GR-0001"
        titleMono
        status={<StatusDot domain="receipt" status="In QC" />}
        subtitle="Công ty ABC"
        meta="25/10/2026"
        metaRight="120 cái"
        accessibilityLabel="Phiếu nhận GR-0001"
        onPress={onPress}
      />,
    );

    expect(screen.getByText("GR-0001")).toBeTruthy();
    expect(screen.getByText("Đang kiểm QC")).toBeTruthy();
    expect(screen.getByText("Công ty ABC")).toBeTruthy();
    expect(screen.getByText("25/10/2026")).toBeTruthy();
    expect(screen.getByText("120 cái")).toBeTruthy();

    await user.press(screen.getByRole("button", { name: "Phiếu nhận GR-0001" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("record card without onPress is not a button", async () => {
    await render(<RecordCard title="GR-0002" />);

    expect(screen.getByText("GR-0002")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("record card puts a fragment of strings inside a Text", async () => {
    // A bare string outside <Text> throws on native (and in the test renderer).
    await render(<RecordCard title="GR-0004" subtitle={<>Số lượng: {12}</>} />);

    expect(screen.getByText("Số lượng: 12")).toBeTruthy();
  });

  it("record card renders node slots as given", async () => {
    await render(<RecordCard title="GR-0003" subtitle={<RNText>Dòng tuỳ biến</RNText>} />);

    expect(screen.getByText("Dòng tuỳ biến")).toBeTruthy();
  });
});

describe("InfoRow and Section", () => {
  it("info row shows its label and a text value", async () => {
    await render(<InfoRow label="Nhà cung cấp" value="Công ty ABC" />);

    expect(screen.getByText("Nhà cung cấp")).toBeTruthy();
    expect(screen.getByText("Công ty ABC")).toBeTruthy();
  });

  it("info row renders a node value untouched", async () => {
    await render(
      <InfoRow label="Trạng thái" value={<StatusDot domain="receipt" status="In QC" />} />,
    );

    expect(screen.getByText("Đang kiểm QC")).toBeTruthy();
  });

  it("section shows its title, action and content", async () => {
    await render(
      <Section title="Thông tin chung" action={<RNText>Sửa</RNText>}>
        <InfoRow label="Mã" value="GR-0001" mono />
      </Section>,
    );

    expect(screen.getByRole("header", { name: "Thông tin chung" })).toBeTruthy();
    expect(screen.getByText("Sửa")).toBeTruthy();
    expect(screen.getByText("GR-0001")).toBeTruthy();
  });
});

describe("ProgressBar", () => {
  it("progress bar exposes value", async () => {
    await render(<ProgressBar value={3} max={10} accessibilityLabel="Đã lấy 3 trên 10" />);

    const bar = screen.getByRole("progressbar", { name: "Đã lấy 3 trên 10" });
    expect(bar).toHaveAccessibilityValue({ min: 0, max: 10, now: 3 });
  });

  it("progress bar keeps the value inside 0..max", async () => {
    await render(
      <>
        <ProgressBar value={15} max={10} accessibilityLabel="vượt" />
        <ProgressBar value={-2} max={10} accessibilityLabel="âm" />
        <ProgressBar value={4} max={0} accessibilityLabel="không có đích" />
      </>,
    );

    expect(screen.getByRole("progressbar", { name: "vượt" })).toHaveAccessibilityValue({ now: 10 });
    expect(screen.getByRole("progressbar", { name: "âm" })).toHaveAccessibilityValue({ now: 0 });
    expect(screen.getByRole("progressbar", { name: "không có đích" })).toHaveAccessibilityValue({
      now: 0,
    });
  });
});

describe("Segmented", () => {
  const OPTIONS = [
    { value: "open", label: "Đang mở" },
    { value: "done", label: "Hoàn tất" },
  ] as const;

  it("segmented marks the current option and reports a change", async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    await render(<Segmented options={[...OPTIONS]} value="open" onValueChange={onValueChange} />);

    expect(screen.getByRole("tab", { name: "Đang mở", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Hoàn tất", selected: false })).toBeTruthy();

    await user.press(screen.getByRole("tab", { name: "Hoàn tất" }));
    expect(onValueChange).toHaveBeenCalledWith("done");
  });

  it("segmented ignores a press on the option that is already selected", async () => {
    const onValueChange = jest.fn();
    const user = userEvent.setup();
    await render(<Segmented options={[...OPTIONS]} value="open" onValueChange={onValueChange} />);

    await user.press(screen.getByRole("tab", { name: "Đang mở" }));

    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("ComingSoon", () => {
  it("coming soon shows tag text", async () => {
    await render(<ComingSoon title="Báo cáo tồn kho" />);

    expect(screen.getByText(MOBILE_LABELS.comingSoonTag)).toBeTruthy();
    expect(screen.getByText("Báo cáo tồn kho")).toBeTruthy();
    expect(screen.getByText(MOBILE_LABELS.comingSoonDescription)).toBeTruthy();
  });

  it("coming soon accepts its own description and icon", async () => {
    await render(
      <ComingSoon
        title="Lập kế hoạch xe"
        icon={Hammer}
        description={MOBILE_LABELS.portPendingDescription}
      />,
    );

    expect(screen.getByText(MOBILE_LABELS.portPendingDescription)).toBeTruthy();
    expect(screen.queryByText(MOBILE_LABELS.comingSoonDescription)).toBeNull();
  });
});
