import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { fireEvent, render, screen, userEvent, within } from "@testing-library/react-native";
import { useState } from "react";
import { Platform, StyleSheet, Text as RNText } from "react-native";

import { MOBILE_LABELS, PICKER_LOCALE, SHEET_LABELS } from "@/constants/mobile";

import { formatDate } from "@/lib/format";

import { Sheet } from "@/components/ui";
import { CHECKBOX_BOX_TEST_ID } from "@/components/ui/Checkbox";

import { DATE_TIME_PICKER_TEST_ID } from "@/test/mocks/datetimepicker";
import {
  __userDismissSheets,
  BACKDROP_PRESS_PROP,
  SHEET_INPUT_PROP,
  SHEET_SCROLL_TEST_ID,
} from "@/test/mocks/gorhom-bottom-sheet";

import {
  ConfirmSheet,
  DateField,
  FilterChips,
  FilterSheet,
  QuantityStepper,
  SearchField,
  SelectSheet,
} from "..";

import type { ConfirmSheetProps, SelectSheetOption } from "..";
import type { ViewStyle } from "react-native";

// ---------------------------------------------------------------------------------------------
// SearchField
// ---------------------------------------------------------------------------------------------

function ControlledSearch({
  initial = "",
  onChangeText,
  onSubmit,
}: {
  initial?: string;
  onChangeText?: (value: string) => void;
  onSubmit?: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <SearchField
      value={value}
      placeholder="Tìm phiếu nhập"
      onChangeText={(next) => {
        onChangeText?.(next);
        setValue(next);
      }}
      onSubmit={onSubmit}
      trailing={<RNText>quét mã</RNText>}
    />
  );
}

describe("SearchField", () => {
  it("search clears with button", async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    await render(<ControlledSearch initial="PO-001" onChangeText={onChangeText} />);

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.clearSearch }));

    expect(onChangeText).toHaveBeenCalledWith("");
    expect(screen.getByRole("search")).toHaveProp("value", "");
    expect(screen.queryByRole("button", { name: MOBILE_LABELS.clearSearch })).toBeNull();
  });

  it("search shows no clear button while empty", async () => {
    await render(<ControlledSearch />);

    expect(screen.queryByRole("button", { name: MOBILE_LABELS.clearSearch })).toBeNull();
  });

  it("search is labelled by its placeholder and reports typed text", async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    await render(<ControlledSearch onChangeText={onChangeText} />);

    const field = screen.getByRole("search", { name: "Tìm phiếu nhập" });
    expect(field).toHaveProp("placeholder", "Tìm phiếu nhập");
    await user.type(field, "po");

    expect(onChangeText).toHaveBeenLastCalledWith("po");
  });

  it("search submits from the keyboard and renders the trailing slot", async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<ControlledSearch onSubmit={onSubmit} />);

    await user.type(screen.getByRole("search"), "po", { submitEditing: true });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.getByText("quét mã")).toBeTruthy();
  });

  it("search inside a sheet uses the sheet text input", async () => {
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Chọn kho">
        <SearchField value="" placeholder="Tìm kho" onChangeText={jest.fn()} />
      </Sheet>,
    );

    expect(screen.getByRole("search")).toHaveProp(SHEET_INPUT_PROP, true);
  });

  it("search outside a sheet uses a plain text input", async () => {
    await render(<SearchField value="" placeholder="Tìm kho" onChangeText={jest.fn()} />);

    expect(screen.getByRole("search").props[SHEET_INPUT_PROP]).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
// FilterChips
// ---------------------------------------------------------------------------------------------

/** The vertical padding of the horizontal scroll view an element sits in. */
function scrollRowPadding(element: ReturnType<typeof screen.getByRole>): number {
  for (let node = element.parent; node; node = node.parent) {
    const style = node.props.contentContainerStyle as ViewStyle | undefined;
    if (style) return Number(StyleSheet.flatten(style)?.paddingVertical ?? 0);
  }
  return 0;
}

describe("FilterChips", () => {
  it("filter chip clear calls onClear", async () => {
    const onClearStatus = jest.fn();
    const onClearWarehouse = jest.fn();
    const user = userEvent.setup();
    await render(
      <FilterChips
        activeCount={2}
        onOpenFilters={jest.fn()}
        chips={[
          { key: "status", label: "Đang giao", onClear: onClearStatus },
          { key: "warehouse", label: "Kho Hà Nội", onClear: onClearWarehouse },
        ]}
      />,
    );

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.removeFilter("Đang giao") }));

    expect(onClearStatus).toHaveBeenCalledTimes(1);
    expect(onClearWarehouse).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Bỏ Kho Hà Nội" })).toBeTruthy();
  });

  it("filter chip opens the filters and shows how many are active", async () => {
    const onOpenFilters = jest.fn();
    const user = userEvent.setup();
    await render(<FilterChips activeCount={3} chips={[]} onOpenFilters={onOpenFilters} />);

    const chip = screen.getByRole("button", { name: MOBILE_LABELS.filter });
    expect(screen.getByText("3")).toBeTruthy();
    expect(chip).toHaveProp("accessibilityValue", { text: "3" });
    await user.press(chip);

    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it("filter chips reach a 44pt touch area inside their scroll row", async () => {
    await render(
      <FilterChips
        activeCount={1}
        onOpenFilters={jest.fn()}
        chips={[{ key: "status", label: "Đang giao", onClear: jest.fn() }]}
      />,
    );

    for (const name of [MOBILE_LABELS.filter, MOBILE_LABELS.removeFilter("Đang giao")]) {
      const chip = screen.getByRole("button", { name });
      const { top = 0, bottom = 0 } = chip.props.hitSlop as { top?: number; bottom?: number };
      const height = Number(StyleSheet.flatten(chip.props.style as ViewStyle)?.minHeight ?? 0);
      expect(height + top + bottom).toBeGreaterThanOrEqual(44);
      // The slop only counts where the parent reaches: the row pads by as much as the chip slops.
      expect(scrollRowPadding(chip)).toBeGreaterThanOrEqual(Math.max(top, bottom));
    }
  });

  it("filter chip shows no count when nothing is active", async () => {
    await render(<FilterChips activeCount={0} chips={[]} onOpenFilters={jest.fn()} />);

    expect(screen.getByText(MOBILE_LABELS.filter)).toBeTruthy();
    expect(screen.queryByText("0")).toBeNull();
    expect(
      screen.getByRole("button", { name: MOBILE_LABELS.filter }).props.accessibilityValue?.text,
    ).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------
// FilterSheet
// ---------------------------------------------------------------------------------------------

describe("FilterSheet", () => {
  function renderSheet(overrides: { canReset: boolean } & Partial<{ onReset: () => void }>) {
    const onApply = jest.fn();
    const onOpenChange = jest.fn();
    const onReset = overrides.onReset ?? jest.fn();
    const view = render(
      <FilterSheet
        open
        onOpenChange={onOpenChange}
        title="Lọc phiếu nhập"
        onApply={onApply}
        onReset={onReset}
        canReset={overrides.canReset}
      >
        <RNText>Nội dung lọc</RNText>
      </FilterSheet>,
    );
    return { view, onApply, onOpenChange, onReset };
  }

  it("filter sheet reset disabled when nothing to reset", async () => {
    const user = userEvent.setup();
    const { view, onReset } = renderSheet({ canReset: false });
    await view;

    const reset = screen.getByRole("button", { name: MOBILE_LABELS.reset });
    expect(reset).toBeDisabled();
    await user.press(reset);

    expect(onReset).not.toHaveBeenCalled();
    expect(screen.getByText("Nội dung lọc")).toBeTruthy();
  });

  it("filter sheet reset runs when there is something to reset", async () => {
    const user = userEvent.setup();
    const { view, onReset, onOpenChange } = renderSheet({ canReset: true });
    await view;

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.reset }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("filter sheet shows title, fields and buttons in the scrollable body", async () => {
    const { view } = renderSheet({ canReset: true });
    await view;

    const body = within(screen.getByTestId(SHEET_SCROLL_TEST_ID));
    expect(body.getByText("Lọc phiếu nhập")).toBeTruthy();
    expect(body.getByText("Nội dung lọc")).toBeTruthy();
    expect(body.getByRole("button", { name: MOBILE_LABELS.apply })).toBeTruthy();
  });

  it("filter sheet apply applies and closes", async () => {
    const user = userEvent.setup();
    const { view, onApply, onOpenChange } = renderSheet({ canReset: true });
    await view;

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.apply }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ---------------------------------------------------------------------------------------------
// SelectSheet
// ---------------------------------------------------------------------------------------------

const WAREHOUSES: SelectSheetOption<string>[] = [
  { value: "hn", label: "Kho Hà Nội", description: "Số 1 Giải Phóng" },
  { value: "dn", label: "Kho Đà Nẵng" },
  { value: "hcm", label: "Kho Hồ Chí Minh", disabled: true },
];

describe("SelectSheet", () => {
  it("select sheet search ignores vietnamese diacritics", async () => {
    const user = userEvent.setup();
    await render(
      <SelectSheet
        open
        onOpenChange={jest.fn()}
        title="Chọn kho"
        options={WAREHOUSES}
        value={null}
        searchable
        onSelect={jest.fn()}
      />,
    );
    const search = screen.getByRole("search");
    expect(search).toHaveProp(SHEET_INPUT_PROP, true);

    await user.type(search, "kho ha noi");
    expect(screen.getByText("Kho Hà Nội")).toBeTruthy();
    expect(screen.queryByText("Kho Đà Nẵng")).toBeNull();

    await user.clear(search);
    await user.type(search, "DA NANG");
    expect(screen.getByText("Kho Đà Nẵng")).toBeTruthy();
    expect(screen.queryByText("Kho Hà Nội")).toBeNull();

    await user.clear(search);
    await user.type(search, "giai phong");
    expect(screen.getByText("Kho Hà Nội")).toBeTruthy();
  });

  it("select sheet says so when the search matches nothing", async () => {
    const user = userEvent.setup();
    await render(
      <SelectSheet
        open
        onOpenChange={jest.fn()}
        title="Chọn kho"
        options={WAREHOUSES}
        value={null}
        searchable
        emptyText="Không có kho phù hợp"
        onSelect={jest.fn()}
      />,
    );

    await user.type(screen.getByRole("search"), "xyz");

    expect(screen.getByText("Không có kho phù hợp")).toBeTruthy();
    expect(screen.queryByText("Kho Hà Nội")).toBeNull();
  });

  it("select sheet without search offers no search field", async () => {
    await render(
      <SelectSheet
        open
        onOpenChange={jest.fn()}
        title="Chọn kho"
        options={WAREHOUSES}
        value="hn"
        onSelect={jest.fn()}
      />,
    );

    expect(screen.queryByRole("search")).toBeNull();
    expect(screen.getByRole("radio", { name: /Kho Hà Nội/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Kho Đà Nẵng/ })).not.toBeChecked();
  });

  it("select sheet lists its options in the scrollable body", async () => {
    await render(
      <SelectSheet
        open
        searchable
        onOpenChange={jest.fn()}
        title="Chọn kho"
        options={WAREHOUSES}
        value={null}
        onSelect={jest.fn()}
      />,
    );

    const body = within(screen.getByTestId(SHEET_SCROLL_TEST_ID));
    expect(body.getByText("Chọn kho")).toBeTruthy();
    expect(body.getByRole("search")).toBeTruthy();
    expect(body.getByText("Kho Hà Nội")).toBeTruthy();
  });

  it("select sheet multiple shows a checkbox on every row, single shows none", async () => {
    const props = {
      open: true,
      onOpenChange: jest.fn(),
      title: "Chọn kho",
      options: WAREHOUSES,
      onSelect: jest.fn(),
    };
    const { rerender } = await render(<SelectSheet {...props} multiple value={["hn"]} />);

    const box = (name: RegExp) =>
      within(screen.getByRole("checkbox", { name })).getByTestId(CHECKBOX_BOX_TEST_ID);
    expect(String(box(/Kho Hà Nội/).props.className)).toContain("bg-brand");
    expect(String(box(/Kho Đà Nẵng/).props.className)).toContain("bg-bg-surface");

    await rerender(<SelectSheet {...props} value="hn" />);
    expect(screen.queryByTestId(CHECKBOX_BOX_TEST_ID)).toBeNull();
  });

  it("select sheet picks one value and closes", async () => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <SelectSheet
        open
        onOpenChange={onOpenChange}
        title="Chọn kho"
        options={WAREHOUSES}
        value={null}
        onSelect={onSelect}
      />,
    );

    await user.press(screen.getByRole("radio", { name: /Kho Đà Nẵng/ }));

    expect(onSelect).toHaveBeenCalledWith("dn");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("select sheet ignores a disabled option", async () => {
    const onSelect = jest.fn();
    const user = userEvent.setup();
    await render(
      <SelectSheet
        open
        onOpenChange={jest.fn()}
        title="Chọn kho"
        options={WAREHOUSES}
        value={null}
        onSelect={onSelect}
      />,
    );

    const option = screen.getByRole("radio", { name: /Kho Hồ Chí Minh/ });
    expect(option).toBeDisabled();
    await user.press(option);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it("select sheet multiple toggles values", async () => {
    const onSelect = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState<string[]>(["hn"]);
      return (
        <SelectSheet
          open
          multiple
          onOpenChange={onOpenChange}
          title="Chọn kho"
          options={WAREHOUSES}
          value={value}
          onSelect={(next) => {
            onSelect(next);
            setValue(Array.isArray(next) ? next : [next]);
          }}
        />
      );
    }
    await render(<Harness />);
    expect(screen.getByRole("checkbox", { name: /Kho Hà Nội/ })).toBeChecked();

    await user.press(screen.getByRole("checkbox", { name: /Kho Đà Nẵng/ }));
    expect(onSelect).toHaveBeenLastCalledWith(["hn", "dn"]);
    expect(screen.getByRole("checkbox", { name: /Kho Đà Nẵng/ })).toBeChecked();

    await user.press(screen.getByRole("checkbox", { name: /Kho Hà Nội/ }));
    expect(onSelect).toHaveBeenLastCalledWith(["dn"]);
    expect(screen.getByRole("checkbox", { name: /Kho Hà Nội/ })).not.toBeChecked();

    // Choosing several values does not close the sheet; "Xong" does.
    expect(onOpenChange).not.toHaveBeenCalled();
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.done }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("select sheet starts every opening with an empty search", async () => {
    const user = userEvent.setup();
    const props = {
      onOpenChange: jest.fn(),
      title: "Chọn kho",
      options: WAREHOUSES,
      value: null,
      searchable: true,
      onSelect: jest.fn(),
    };
    const { rerender } = await render(<SelectSheet open {...props} />);
    await user.type(screen.getByRole("search"), "da nang");

    await rerender(<SelectSheet open={false} {...props} />);
    await rerender(<SelectSheet open {...props} />);

    expect(screen.getByRole("search")).toHaveProp("value", "");
    expect(screen.getByText("Kho Hà Nội")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------
// ConfirmSheet
// ---------------------------------------------------------------------------------------------

function ConfirmHarness(props: Partial<ConfirmSheetProps>) {
  return (
    <ConfirmSheet
      open
      onOpenChange={jest.fn()}
      title="Huỷ phiếu nhập"
      description="Phiếu sẽ chuyển sang trạng thái đã huỷ."
      onConfirm={jest.fn()}
      {...props}
    />
  );
}

describe("ConfirmSheet", () => {
  it("confirm sheet requires reason before confirming", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(<ConfirmHarness requireReason onConfirm={onConfirm} />);

    const confirm = screen.getByRole("button", { name: MOBILE_LABELS.confirm });
    const reason = screen.getByLabelText(MOBILE_LABELS.reasonLabel);
    expect(reason).toHaveProp(SHEET_INPUT_PROP, true);
    expect(confirm).toBeDisabled();

    await user.type(reason, "   ");
    expect(confirm).toBeDisabled();
    await user.press(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    await user.type(reason, "nhập nhầm kho");
    expect(confirm).toBeEnabled();
  });

  it("confirm sheet passes trimmed reason", async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <ConfirmHarness requireReason onConfirm={onConfirm} onOpenChange={onOpenChange} />,
    );

    await user.type(screen.getByLabelText(MOBILE_LABELS.reasonLabel), "  nhập nhầm kho \n");
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.confirm }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith("nhập nhầm kho");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("confirm sheet stays open when closeOnConfirm false", async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    const props = {
      requireReason: true,
      closeOnConfirm: false,
      onConfirm,
      onOpenChange,
    };
    const { rerender } = await render(<ConfirmHarness {...props} />);

    await user.type(screen.getByLabelText(MOBILE_LABELS.reasonLabel), "nhập nhầm kho");
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.confirm }));

    expect(onConfirm).toHaveBeenCalledWith("nhập nhầm kho");
    expect(onOpenChange).not.toHaveBeenCalled();
    // The typed reason is still there for a retry after an error...
    expect(screen.getByLabelText(MOBILE_LABELS.reasonLabel)).toHaveProp("value", "nhập nhầm kho");

    // ...and goes away once the caller closes the sheet.
    await rerender(<ConfirmHarness {...props} open={false} />);
    await rerender(<ConfirmHarness {...props} open />);
    expect(screen.getByLabelText(MOBILE_LABELS.reasonLabel)).toHaveProp("value", "");
  });

  it("confirm sheet without a reason confirms at once and closes", async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    await render(<ConfirmHarness onConfirm={onConfirm} onOpenChange={onOpenChange} />);

    expect(screen.queryByLabelText(MOBILE_LABELS.reasonLabel)).toBeNull();
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.confirm }));

    expect(onConfirm).toHaveBeenCalledWith(undefined);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("confirm sheet cancel closes without confirming", async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    const user = userEvent.setup();
    await render(<ConfirmHarness onConfirm={onConfirm} onOpenChange={onOpenChange} />);

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.cancel }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("confirm sheet shows description, children, custom labels and the error inside", async () => {
    await render(
      <ConfirmHarness
        confirmLabel="Huỷ phiếu"
        cancelLabel="Quay lại"
        error="Phiếu đã có hàng nhập kho"
      >
        <RNText>PO-001 còn mở</RNText>
      </ConfirmHarness>,
    );

    expect(screen.getByText("Phiếu sẽ chuyển sang trạng thái đã huỷ.")).toBeTruthy();
    expect(screen.getByText("PO-001 còn mở")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Huỷ phiếu" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Quay lại" })).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent("Phiếu đã có hàng nhập kho");
  });

  it("confirm sheet is locked while loading", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(<ConfirmHarness loading onConfirm={onConfirm} />);

    const confirm = screen.getByRole("button", { name: MOBILE_LABELS.processing });
    expect(confirm).toBeBusy();
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: MOBILE_LABELS.cancel })).toBeDisabled();
    await user.press(confirm);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirm sheet cannot be dismissed while loading", async () => {
    const onOpenChange = jest.fn();
    const props = { onOpenChange, requireReason: true, closeOnConfirm: false };
    const { rerender } = await render(<ConfirmHarness {...props} loading />);
    const backdrop = () => screen.getByLabelText(SHEET_LABELS.backdropLabel);
    expect(backdrop()).toHaveProp(BACKDROP_PRESS_PROP, "none");

    await __userDismissSheets();

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText("Huỷ phiếu nhập")).toBeTruthy();

    // Once the request is over the sheet can be swiped away again.
    await rerender(<ConfirmHarness {...props} loading={false} />);
    expect(backdrop()).toHaveProp(BACKDROP_PRESS_PROP, "close");
    await __userDismissSheets();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("pressing confirm twice calls onConfirm once", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    // The caller closes the sheet through `open`, so it is still on screen for the second press.
    await render(<ConfirmHarness onConfirm={onConfirm} />);
    const confirm = screen.getByRole("button", { name: MOBILE_LABELS.confirm });

    await user.press(confirm);
    await user.press(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("confirm sheet confirms again after it is reopened", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(<ConfirmHarness onConfirm={onConfirm} />);
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.confirm }));

    await rerender(<ConfirmHarness onConfirm={onConfirm} open={false} />);
    await rerender(<ConfirmHarness onConfirm={onConfirm} open />);
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.confirm }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("confirm sheet lets the user retry when it stays open after a confirm", async () => {
    const onConfirm = jest.fn();
    const user = userEvent.setup();
    await render(<ConfirmHarness closeOnConfirm={false} onConfirm={onConfirm} />);
    const confirm = screen.getByRole("button", { name: MOBILE_LABELS.confirm });

    await user.press(confirm);
    await user.press(confirm);

    expect(onConfirm).toHaveBeenCalledTimes(2);
  });

  it("confirm sheet puts its content in the scrollable body", async () => {
    await render(
      <ConfirmHarness requireReason error="Lỗi">
        <RNText>PO-001 còn mở</RNText>
      </ConfirmHarness>,
    );

    const body = within(screen.getByTestId(SHEET_SCROLL_TEST_ID));
    expect(body.getByText("Huỷ phiếu nhập")).toBeTruthy();
    expect(body.getByText("PO-001 còn mở")).toBeTruthy();
    expect(body.getByLabelText(MOBILE_LABELS.reasonLabel)).toBeTruthy();
    expect(body.getByRole("button", { name: MOBILE_LABELS.confirm })).toBeTruthy();
  });

  it("confirm sheet counts the reason against its limit", async () => {
    const user = userEvent.setup();
    await render(<ConfirmHarness requireReason reasonMaxLength={200} />);

    const reason = screen.getByLabelText(MOBILE_LABELS.reasonLabel);
    expect(reason).toHaveProp("maxLength", 200);
    expect(screen.getByText("0/200")).toBeTruthy();
    await user.type(reason, "hết hạn");

    expect(screen.getByText("7/200")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------
// DateField
// ---------------------------------------------------------------------------------------------

describe("DateField", () => {
  beforeEach(() => {
    jest.mocked(DateTimePickerAndroid.open).mockClear();
  });

  it("date field shows the date as formatDate does, or a prompt when empty", async () => {
    const { rerender } = await render(
      <DateField label="Từ ngày" value="2026-03-15" onChange={jest.fn()} />,
    );
    expect(screen.getByText(formatDate("2026-03-15"))).toBeTruthy();
    expect(screen.getByText("Từ ngày")).toBeTruthy();

    await rerender(<DateField label="Từ ngày" value={null} onChange={jest.fn()} />);
    expect(screen.getByText(MOBILE_LABELS.chooseDate)).toBeTruthy();
  });

  it("date field clear sets null", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<DateField label="Từ ngày" value="2026-03-15" clearable onChange={onChange} />);

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.clearField("Từ ngày") }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("date field offers clear only when clearable and filled", async () => {
    const { rerender } = await render(
      <DateField label="Từ ngày" value="2026-03-15" onChange={jest.fn()} />,
    );
    expect(screen.queryByRole("button", { name: MOBILE_LABELS.clearField("Từ ngày") })).toBeNull();

    await rerender(<DateField label="Từ ngày" value={null} clearable onChange={jest.fn()} />);
    expect(screen.queryByRole("button", { name: MOBILE_LABELS.clearField("Từ ngày") })).toBeNull();
  });

  it("date field picks a date from the inline picker on iOS", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <DateField
        label="Từ ngày"
        value="2026-03-15"
        minimumDate="2026-03-01"
        maximumDate="2026-03-31"
        onChange={onChange}
      />,
    );
    expect(screen.queryByTestId(DATE_TIME_PICKER_TEST_ID)).toBeNull();

    await user.press(screen.getByRole("button", { name: "Từ ngày" }));

    const picker = screen.getByTestId(DATE_TIME_PICKER_TEST_ID);
    expect(picker).toHaveProp("mode", "date");
    expect(picker).toHaveProp("display", "inline");
    expect((picker.props.value as Date).getTime()).toBe(new Date(2026, 2, 15, 12).getTime());
    expect((picker.props.minimumDate as Date).getTime()).toBe(new Date(2026, 2, 1, 12).getTime());
    expect((picker.props.maximumDate as Date).getTime()).toBe(new Date(2026, 2, 31, 12).getTime());

    await fireEvent(picker, "valueChange", { nativeEvent: {} }, new Date(2026, 2, 20, 9, 41));

    expect(onChange).toHaveBeenCalledWith("2026-03-20");
    expect(screen.queryByTestId(DATE_TIME_PICKER_TEST_ID)).toBeNull();
  });

  it("date field opens the dialog on Android", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    const platform = jest.replaceProperty(Platform, "OS", "android");
    try {
      await render(
        <DateField
          label="Từ ngày"
          value="2026-03-15"
          minimumDate="2026-03-01"
          onChange={onChange}
        />,
      );

      await user.press(screen.getByRole("button", { name: "Từ ngày" }));

      expect(screen.queryByTestId(DATE_TIME_PICKER_TEST_ID)).toBeNull();
      expect(DateTimePickerAndroid.open).toHaveBeenCalledTimes(1);
      const options = jest.mocked(DateTimePickerAndroid.open).mock.calls[0]?.[0];
      expect(options?.mode).toBe("date");
      expect(options?.value.getTime()).toBe(new Date(2026, 2, 15, 12).getTime());
      expect(options?.minimumDate?.getTime()).toBe(new Date(2026, 2, 1, 12).getTime());
      expect(options?.maximumDate).toBeUndefined();

      options?.onValueChange?.(
        { nativeEvent: { timestamp: 0, utcOffset: 0 } },
        new Date(2026, 3, 2),
      );

      expect(onChange).toHaveBeenCalledWith("2026-04-02");
    } finally {
      platform.restore();
    }
  });

  it("date field with no value opens on today", async () => {
    const user = userEvent.setup();
    await render(<DateField label="Từ ngày" value={null} onChange={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Từ ngày" }));

    const shown = (screen.getByTestId(DATE_TIME_PICKER_TEST_ID).props.value as Date).getTime();
    expect(Math.abs(shown - Date.now())).toBeLessThan(36 * 60 * 60 * 1000);
  });

  it("date field shows its error as an alert and says it with the field", async () => {
    await render(
      <DateField label="Từ ngày" value={null} error="Chọn ngày bắt đầu" onChange={jest.fn()} />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Chọn ngày bắt đầu");
    expect(screen.getByRole("button", { name: "Từ ngày" })).toHaveProp(
      "accessibilityHint",
      "Chọn ngày bắt đầu",
    );
  });

  it("date field reads an invalid value as empty and opens on a real date", async () => {
    const user = userEvent.setup();
    await render(
      <DateField
        label="Từ ngày"
        value="2026-02-30"
        clearable
        minimumDate="not-a-date"
        maximumDate="2026-13-01"
        onChange={jest.fn()}
      />,
    );

    expect(screen.getByText(MOBILE_LABELS.chooseDate)).toBeTruthy();
    expect(screen.queryByRole("button", { name: MOBILE_LABELS.clearField("Từ ngày") })).toBeNull();
    await user.press(screen.getByRole("button", { name: "Từ ngày" }));

    const picker = screen.getByTestId(DATE_TIME_PICKER_TEST_ID);
    expect(Number.isNaN((picker.props.value as Date).getTime())).toBe(false);
    expect(picker.props.minimumDate).toBeUndefined();
    expect(picker.props.maximumDate).toBeUndefined();
  });

  it("date field opens the calendar in the app's language", async () => {
    const user = userEvent.setup();
    await render(<DateField label="Từ ngày" value="2026-03-15" onChange={jest.fn()} />);

    await user.press(screen.getByRole("button", { name: "Từ ngày" }));

    expect(screen.getByTestId(DATE_TIME_PICKER_TEST_ID)).toHaveProp("locale", PICKER_LOCALE);
  });
});

// ---------------------------------------------------------------------------------------------
// QuantityStepper
// ---------------------------------------------------------------------------------------------

describe("QuantityStepper", () => {
  it("quantity stepper clamps to max and min", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(
      <QuantityStepper label="Số lượng" value={9} max={10} step={5} onChange={onChange} />,
    );

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.increase("Số lượng") }));
    expect(onChange).toHaveBeenLastCalledWith(10);

    await rerender(
      <QuantityStepper label="Số lượng" value={2} min={1} step={5} onChange={onChange} />,
    );
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.decrease("Số lượng") }));
    expect(onChange).toHaveBeenLastCalledWith(1);

    // Typing past either end lands on the end.
    await rerender(
      <QuantityStepper label="Số lượng" value={5} min={1} max={10} onChange={onChange} />,
    );
    const field = screen.getByLabelText("Số lượng");
    await fireEvent.changeText(field, "99");
    expect(onChange).toHaveBeenLastCalledWith(10);
    await fireEvent.changeText(field, "0");
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("quantity stepper stops at the ends", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    const { rerender } = await render(
      <QuantityStepper label="Số lượng" value={10} max={10} onChange={onChange} />,
    );
    const plus = screen.getByRole("button", { name: MOBILE_LABELS.increase("Số lượng") });
    expect(plus).toBeDisabled();
    await user.press(plus);
    expect(onChange).not.toHaveBeenCalled();

    // Quantities start at 0: no negative stock without allowNegative.
    await rerender(<QuantityStepper label="Số lượng" value={0} onChange={onChange} />);
    const minus = screen.getByRole("button", { name: MOBILE_LABELS.decrease("Số lượng") });
    expect(minus).toBeDisabled();
    await user.press(minus);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("quantity stepper steps by step", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<QuantityStepper label="Số lượng" value={12} step={6} onChange={onChange} />);

    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.increase("Số lượng") }));
    expect(onChange).toHaveBeenLastCalledWith(18);
    await user.press(screen.getByRole("button", { name: MOBILE_LABELS.decrease("Số lượng") }));
    expect(onChange).toHaveBeenLastCalledWith(6);
  });

  it("quantity stepper rejects non-integer input", async () => {
    const onChange = jest.fn();
    await render(<QuantityStepper label="Số lượng" value={5} onChange={onChange} />);
    const field = screen.getByLabelText("Số lượng");
    expect(field).toHaveProp("keyboardType", "number-pad");

    for (const text of ["1.5", "1,5", "abc", "1e3", "-3", "5 "]) {
      await fireEvent.changeText(field, text);
    }

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Số lượng")).toHaveProp("value", "5");
  });

  it("quantity stepper accepts digits and keeps the field editable while empty", async () => {
    const onChange = jest.fn();
    function Harness() {
      const [value, setValue] = useState(5);
      return (
        <QuantityStepper
          label="Số lượng"
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    await render(<Harness />);
    const field = screen.getByLabelText("Số lượng");

    await fireEvent(field, "focus");
    await fireEvent.changeText(field, "");
    expect(screen.getByLabelText("Số lượng")).toHaveProp("value", "");
    expect(onChange).not.toHaveBeenCalled();

    await fireEvent.changeText(field, "12");
    expect(onChange).toHaveBeenLastCalledWith(12);

    // Leaving the field empty puts the last value back.
    await fireEvent.changeText(field, "");
    await fireEvent(field, "blur");
    expect(screen.getByLabelText("Số lượng")).toHaveProp("value", "12");
  });

  it("quantity stepper shows a value changed from outside while it is being edited", async () => {
    const onChange = jest.fn();
    const { rerender } = await render(
      <QuantityStepper label="Số lượng" value={5} onChange={onChange} />,
    );
    const field = () => screen.getByLabelText("Số lượng");

    await fireEvent(field(), "focus");
    await fireEvent.changeText(field(), "");
    expect(field()).toHaveProp("value", "");

    // A scan sets the quantity: the field follows, not the empty text typed before it.
    await rerender(<QuantityStepper label="Số lượng" value={20} onChange={onChange} />);
    expect(field()).toHaveProp("value", "20");
  });

  it("quantity stepper keeps what is typed while the caller echoes it back", async () => {
    function Echo() {
      const [value, setValue] = useState(5);
      return <QuantityStepper label="Số lượng" min={5} value={value} onChange={setValue} />;
    }
    await render(<Echo />);
    const field = () => screen.getByLabelText("Số lượng");

    await fireEvent(field(), "focus");
    // "1" is below the minimum (the value stays 5) but must not replace the text on the way to "15".
    await fireEvent.changeText(field(), "1");
    expect(field()).toHaveProp("value", "1");
    await fireEvent.changeText(field(), "15");
    expect(field()).toHaveProp("value", "15");
    await fireEvent(field(), "blur");
    expect(field()).toHaveProp("value", "15");
  });

  it("quantity stepper rewrites a number above the maximum as the maximum", async () => {
    const onChange = jest.fn();
    function Harness() {
      const [value, setValue] = useState(5);
      return (
        <QuantityStepper
          label="Số lượng"
          max={10}
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
        />
      );
    }
    await render(<Harness />);

    await fireEvent.changeText(screen.getByLabelText("Số lượng"), "99");

    expect(onChange).toHaveBeenLastCalledWith(10);
    expect(screen.getByLabelText("Số lượng")).toHaveProp("value", "10");
  });

  it("quantity stepper uses the sheet text input inside a sheet and a plain one outside", async () => {
    const { rerender } = await render(
      <Sheet open onOpenChange={jest.fn()} title="Số lượng nhận">
        <QuantityStepper label="Số lượng" value={5} onChange={jest.fn()} />
      </Sheet>,
    );
    expect(screen.getByLabelText("Số lượng")).toHaveProp(SHEET_INPUT_PROP, true);

    await rerender(<QuantityStepper label="Số lượng" value={5} onChange={jest.fn()} />);
    expect(screen.getByLabelText("Số lượng").props[SHEET_INPUT_PROP]).toBeUndefined();
  });

  it("quantity stepper takes a sign only with allowNegative", async () => {
    const onChange = jest.fn();
    await render(
      <QuantityStepper label="Chênh lệch" value={0} allowNegative onChange={onChange} />,
    );
    const field = screen.getByLabelText("Chênh lệch");

    await fireEvent.changeText(field, "-");
    expect(onChange).not.toHaveBeenCalled();
    await fireEvent.changeText(field, "-4");
    expect(onChange).toHaveBeenLastCalledWith(-4);
    await fireEvent.changeText(field, "-4.5");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: MOBILE_LABELS.decrease("Chênh lệch") }),
    ).toBeEnabled();
  });
});
