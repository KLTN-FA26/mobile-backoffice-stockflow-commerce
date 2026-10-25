import { act, render, screen, userEvent, within } from "@testing-library/react-native";
import { Plus } from "lucide-react-native";
import { createRef, useState } from "react";
import { BackHandler, Dimensions } from "react-native";

import { SHEET_LABELS, UI_LIMITS } from "@/constants/mobile";

import {
  Badge,
  Button,
  Checkbox,
  Input,
  RadioGroup,
  Separator,
  Sheet,
  Skeleton,
  Switch,
  Text,
  Textarea,
} from "@/components/ui";

import {
  __userDismissSheets,
  BACKDROP_PRESS_PROP,
  SHEET_INPUT_PROP,
  SHEET_MAX_HEIGHT_PROP,
  SHEET_PAN_CLOSE_PROP,
  SHEET_SCROLL_TEST_ID,
} from "@/test/mocks/gorhom-bottom-sheet";

import type { SemanticTone } from "@/lib/domain/status-types";
import type { TextInputInstance } from "react-native";

describe("Text", () => {
  it("text numeric sets tabular-nums", async () => {
    await render(<Text numeric>1.234</Text>);

    expect(screen.getByText("1.234")).toHaveStyle({ fontVariant: ["tabular-nums"] });
  });

  it("text without numeric leaves the font variant alone and keeps the caller style", async () => {
    await render(<Text style={{ textAlign: "right" }}>12</Text>);

    const text = screen.getByText("12");
    expect(text).toHaveStyle({ textAlign: "right" });
    expect(text).not.toHaveStyle({ fontVariant: ["tabular-nums"] });
  });

  it("text caps font scaling at the UI limit unless the caller overrides it", async () => {
    await render(
      <>
        <Text>mặc định</Text>
        <Text maxFontSizeMultiplier={1}>ghi đè</Text>
      </>,
    );

    expect(screen.getByText("mặc định").props.maxFontSizeMultiplier).toBe(
      UI_LIMITS.maxFontSizeMultiplier,
    );
    expect(screen.getByText("ghi đè").props.maxFontSizeMultiplier).toBe(1);
  });
});

// The spinner is decorative for screen readers (the button reports busy), so it has no role to query.
function hasSpinner(button: ReturnType<typeof screen.getByRole>): boolean {
  return button.children.some(
    (child) => typeof child !== "string" && child.type === "ActivityIndicator",
  );
}

describe("Button", () => {
  it("button press calls handler", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Lưu" onPress={onPress} />);

    await user.press(screen.getByRole("button", { name: "Lưu" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("button uses accessibilityLabel instead of the label when given", async () => {
    await render(<Button label="Lưu" accessibilityLabel="Lưu phiếu nhập" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Lưu phiếu nhập" })).toBeTruthy();
  });

  it("loading button is busy and ignores press", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Lưu" loading onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button).toBeBusy();
    expect(hasSpinner(button)).toBe(true);

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it("idle button is not busy and shows no spinner", async () => {
    await render(<Button label="Lưu" onPress={jest.fn()} />);

    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button).not.toBeBusy();
    expect(hasSpinner(button)).toBe(false);
  });

  it("disabled button ignores press", async () => {
    const onPress = jest.fn();
    const user = userEvent.setup();
    await render(<Button label="Lưu" disabled onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Lưu" });
    expect(button).toBeDisabled();

    await user.press(button);

    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([
    ["sm", 40, { top: 2, bottom: 2 }],
    ["md", 44, undefined],
    ["lg", 52, undefined],
  ] as const)(
    "button size %s is %s tall and reaches 44pt of touch area",
    async (size, height, hitSlop) => {
      await render(<Button label="Lưu" size={size} onPress={jest.fn()} />);

      const button = screen.getByRole("button", { name: "Lưu" });
      expect(button).toHaveStyle({ minHeight: height });
      expect(button.props.hitSlop).toEqual(hitSlop);
      const slop = button.props.hitSlop ?? { top: 0, bottom: 0 };
      expect(height + slop.top + slop.bottom).toBeGreaterThanOrEqual(44);
    },
  );

  it("button defaults to the md size", async () => {
    await render(<Button label="Lưu" onPress={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Lưu" })).toHaveStyle({ minHeight: 44 });
  });

  it("button renders every variant and size with an icon", async () => {
    await render(
      <>
        <Button label="Chính" variant="primary" size="lg" icon={Plus} onPress={jest.fn()} />
        <Button label="Phụ" variant="secondary" size="md" onPress={jest.fn()} />
        <Button label="Nhẹ" variant="ghost" size="sm" onPress={jest.fn()} />
        <Button label="Xoá" variant="danger" onPress={jest.fn()} />
      </>,
    );

    expect(screen.getAllByRole("button")).toHaveLength(4);
  });
});

describe("Input", () => {
  it("input label is accessibility label", async () => {
    await render(<Input label="Mã SKU" />);

    expect(screen.getByLabelText("Mã SKU")).toBeTruthy();
    expect(screen.getByText("Mã SKU")).toBeTruthy();
  });

  it("input shows error as alert", async () => {
    await render(<Input label="Mã SKU" error="Bắt buộc nhập" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Bắt buộc nhập");
  });

  it("input without error shows no alert and shows the hint", async () => {
    await render(<Input label="Mã SKU" hint="Tối đa 20 ký tự" />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByText("Tối đa 20 ký tự")).toBeTruthy();
  });

  it("input replaces the hint with the error", async () => {
    await render(<Input label="Mã SKU" hint="Tối đa 20 ký tự" error="Bắt buộc nhập" />);

    expect(screen.queryByText("Tối đa 20 ký tự")).toBeNull();
    expect(screen.getByText("Bắt buộc nhập")).toBeTruthy();
  });

  it("input hint uses the secondary tone to stay readable", async () => {
    await render(<Input label="Mã SKU" hint="Tối đa 20 ký tự" />);

    const hint = screen.getByText("Tối đa 20 ký tự");
    expect(hint.props.className).toContain("text-ink-secondary");
    expect(hint.props.className).not.toContain("text-ink-tertiary");
  });

  it("input announces the error with the field, as well as showing it", async () => {
    await render(<Input label="Mã SKU" error="Bắt buộc nhập" />);

    expect(screen.getByLabelText("Mã SKU")).toHaveProp("accessibilityHint", "Bắt buộc nhập");
    expect(screen.getByRole("alert")).toHaveTextContent("Bắt buộc nhập");
  });

  it("input keeps the caller hint ahead of the error in the field hint", async () => {
    await render(<Input label="Mã SKU" accessibilityHint="Nhập mã" error="Bắt buộc nhập" />);

    expect(screen.getByLabelText("Mã SKU")).toHaveProp(
      "accessibilityHint",
      "Nhập mã Bắt buộc nhập",
    );
  });

  it("input without error leaves the field hint to the caller", async () => {
    await render(<Input label="Mã SKU" hint="Tối đa 20 ký tự" />);

    expect(screen.getByLabelText("Mã SKU").props.accessibilityHint).toBeUndefined();
  });

  it("input is 48px tall", async () => {
    await render(<Input label="Mã SKU" />);

    expect(screen.getByLabelText("Mã SKU")).toHaveStyle({ minHeight: 48 });
  });

  it("input reports typed text", async () => {
    const onChangeText = jest.fn();
    const user = userEvent.setup();
    await render(<Input label="Mã SKU" onChangeText={onChangeText} />);

    await user.type(screen.getByLabelText("Mã SKU"), "A1");

    expect(onChangeText).toHaveBeenLastCalledWith("A1");
  });

  it("input hands its ref to the text field", async () => {
    const ref = createRef<TextInputInstance>();
    await render(<Input label="Mã SKU" ref={ref} />);

    expect(typeof ref.current?.focus).toBe("function");
  });

  it("textarea is a multiline input labelled like Input", async () => {
    await render(<Textarea label="Ghi chú" />);

    expect(screen.getByLabelText("Ghi chú").props.multiline).toBe(true);
  });

  it("textarea is at least 96px tall", async () => {
    await render(<Textarea label="Ghi chú" />);

    expect(screen.getByLabelText("Ghi chú")).toHaveStyle({ minHeight: 96 });
  });
});

function ControlledCheckbox({ onChange }: { onChange?: (value: boolean) => void }) {
  const [checked, setChecked] = useState(false);
  return (
    <Checkbox
      label="Đồng ý"
      checked={checked}
      onCheckedChange={(value) => {
        onChange?.(value);
        setChecked(value);
      }}
    />
  );
}

function ControlledSwitch() {
  const [value, setValue] = useState(false);
  return (
    <Switch
      label="Thông báo"
      description="Nhận thông báo khi có phiếu mới"
      value={value}
      onValueChange={setValue}
    />
  );
}

const SHIPPING_OPTIONS = [
  { value: "std", label: "Giao tiêu chuẩn", description: "2–3 ngày" },
  { value: "fast", label: "Giao nhanh" },
] as const;

function ControlledRadioGroup({ onChange }: { onChange: (value: "std" | "fast") => void }) {
  const [value, setValue] = useState<"std" | "fast">("std");
  return (
    <RadioGroup
      accessibilityLabel="Hình thức giao"
      options={[...SHIPPING_OPTIONS]}
      value={value}
      onValueChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

describe("Checkbox", () => {
  it("checkbox toggles", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<ControlledCheckbox onChange={onChange} />);

    const checkbox = screen.getByRole("checkbox", { name: "Đồng ý" });
    expect(checkbox).not.toBeChecked();

    await user.press(checkbox);
    expect(screen.getByRole("checkbox", { name: "Đồng ý" })).toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(true);

    await user.press(screen.getByRole("checkbox", { name: "Đồng ý" }));
    expect(screen.getByRole("checkbox", { name: "Đồng ý" })).not.toBeChecked();
    expect(onChange).toHaveBeenLastCalledWith(false);
  });

  it("disabled checkbox ignores press", async () => {
    const onCheckedChange = jest.fn();
    const user = userEvent.setup();
    await render(
      <Checkbox label="Đồng ý" checked={false} disabled onCheckedChange={onCheckedChange} />,
    );

    await user.press(screen.getByRole("checkbox", { name: "Đồng ý" }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});

describe("Switch", () => {
  it("switch toggles", async () => {
    const user = userEvent.setup();
    await render(<ControlledSwitch />);

    expect(screen.getByRole("switch", { name: "Thông báo" })).not.toBeChecked();

    await user.press(screen.getByRole("switch", { name: "Thông báo" }));
    expect(screen.getByRole("switch", { name: "Thông báo" })).toBeChecked();

    await user.press(screen.getByRole("switch", { name: "Thông báo" }));
    expect(screen.getByRole("switch", { name: "Thông báo" })).not.toBeChecked();
  });

  it("switch shows its description and exposes it as the accessibility hint", async () => {
    await render(<ControlledSwitch />);

    expect(screen.getByText("Nhận thông báo khi có phiếu mới")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Thông báo" }).props.accessibilityHint).toBe(
      "Nhận thông báo khi có phiếu mới",
    );
  });

  it("only one switch is exposed per row", async () => {
    await render(<ControlledSwitch />);

    expect(screen.getAllByRole("switch")).toHaveLength(1);
  });
});

describe("RadioGroup", () => {
  it("radio group selects value", async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<ControlledRadioGroup onChange={onChange} />);

    expect(screen.getByRole("radio", { name: "Giao tiêu chuẩn" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Giao nhanh" })).not.toBeChecked();

    await user.press(screen.getByRole("radio", { name: "Giao nhanh" }));

    expect(onChange).toHaveBeenCalledWith("fast");
    expect(screen.getByRole("radio", { name: "Giao nhanh" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Giao tiêu chuẩn" })).not.toBeChecked();
  });

  it("radio group is a labelled radiogroup with every option as a radio", async () => {
    await render(<ControlledRadioGroup onChange={jest.fn()} />);

    expect(screen.getByLabelText("Hình thức giao").props.accessibilityRole).toBe("radiogroup");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByText("2–3 ngày")).toBeTruthy();
  });
});

describe("Badge, Skeleton and Separator", () => {
  it.each<SemanticTone>(["positive", "info", "warning", "danger", "neutral", "muted", "special"])(
    "badge renders its label for tone %s",
    async (tone) => {
      await render(<Badge label="Nhãn" tone={tone} />);

      expect(screen.getByText("Nhãn")).toBeTruthy();
    },
  );

  it("badge defaults to the neutral tone", async () => {
    await render(<Badge label="Nhãn" />);

    expect(screen.getByText("Nhãn")).toBeTruthy();
  });

  it("skeleton is hidden from screen readers", async () => {
    await render(<Skeleton className="h-4" />);

    expect(screen.root).toHaveProp("accessibilityElementsHidden", true);
  });

  it("separator is hidden from screen readers", async () => {
    await render(<Separator />);

    expect(screen.root).toHaveProp("accessibilityElementsHidden", true);
  });
});

describe("Sheet", () => {
  it("sheet renders title when open and not when closed", async () => {
    const { rerender } = await render(
      <Sheet open={false} onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );
    expect(screen.queryByText("Chọn kho")).toBeNull();
    expect(screen.queryByText("Nội dung")).toBeNull();

    await rerender(
      <Sheet open onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );
    expect(screen.getByText("Chọn kho")).toBeTruthy();
    expect(screen.getByText("Nội dung")).toBeTruthy();

    await rerender(
      <Sheet open={false} onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );
    expect(screen.queryByText("Chọn kho")).toBeNull();
  });

  it("sheet shows its title as a header when it opens on mount", async () => {
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Lọc">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    expect(screen.getByRole("header", { name: "Lọc" })).toBeTruthy();
  });

  it("sheet backdrop and handle use vietnamese accessibility labels", async () => {
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    const backdrop = screen.getByLabelText(SHEET_LABELS.backdropLabel);
    expect(backdrop).toHaveProp("accessibilityHint", SHEET_LABELS.backdropHint);
    const handle = screen.getByLabelText(SHEET_LABELS.handleLabel);
    expect(handle).toHaveProp("accessibilityHint", SHEET_LABELS.handleHint);
    // None of the library's English defaults ("Bottom sheet backdrop", "Tap to close...") may leak.
    expect(screen.queryByLabelText(/bottom sheet/i, { hidden: true })).toBeNull();
    expect(screen.queryByHintText(/bottom sheet/i, { hidden: true })).toBeNull();
  });

  it("sheet content is labelled with the title and not grouped into one element", async () => {
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    const content = screen.getByLabelText("Chọn kho", { hidden: true });
    expect(content).toHaveProp("accessible", false);
    expect(content.props.accessibilityRole).toBeUndefined();
  });

  it("sheet reports onOpenChange(false) when the user dismisses it", async () => {
    const onOpenChange = jest.fn();
    await render(
      <Sheet open onOpenChange={onOpenChange} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    await __userDismissSheets();

    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sheet closed from props does not report a change back", async () => {
    const onOpenChange = jest.fn();
    const { rerender } = await render(
      <Sheet open onOpenChange={onOpenChange} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    await rerender(
      <Sheet open={false} onOpenChange={onOpenChange} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    expect(screen.queryByText("Chọn kho")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});

/** The handler `Sheet` registers for the Android Back button. */
function backPressHandler(spy: jest.SpyInstance): () => boolean | null | undefined {
  const call = spy.mock.calls.find(([name]) => name === "hardwareBackPress");
  if (call === undefined) throw new Error("the sheet registered no Back button handler");
  return call[1];
}

describe("Sheet dismissal", () => {
  it("sheet is dismissible by default", async () => {
    const onOpenChange = jest.fn();
    await render(
      <Sheet open onOpenChange={onOpenChange} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    expect(screen.getByLabelText("Chọn kho", { hidden: true })).toHaveProp(
      SHEET_PAN_CLOSE_PROP,
      true,
    );
    expect(screen.getByLabelText(SHEET_LABELS.backdropLabel)).toHaveProp(
      BACKDROP_PRESS_PROP,
      "close",
    );
    await __userDismissSheets();

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("sheet that is not dismissible ignores a swipe and a backdrop tap but closes from props", async () => {
    const onOpenChange = jest.fn();
    const { rerender } = await render(
      <Sheet open dismissible={false} onOpenChange={onOpenChange} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    expect(screen.getByLabelText("Chọn kho", { hidden: true })).toHaveProp(
      SHEET_PAN_CLOSE_PROP,
      false,
    );
    expect(screen.getByLabelText(SHEET_LABELS.backdropLabel)).toHaveProp(
      BACKDROP_PRESS_PROP,
      "none",
    );
    await __userDismissSheets();

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText("Nội dung")).toBeTruthy();

    await rerender(
      <Sheet open={false} dismissible={false} onOpenChange={onOpenChange} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );
    expect(screen.queryByText("Nội dung")).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("android back closes a dismissible sheet and is taken from the screen underneath", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    try {
      const onOpenChange = jest.fn();
      await render(
        <Sheet open onOpenChange={onOpenChange} title="Chọn kho">
          <Text>Nội dung</Text>
        </Sheet>,
      );

      const handled = await act(async () => backPressHandler(spy)());

      expect(handled).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    } finally {
      spy.mockRestore();
    }
  });

  it("android back does nothing to a sheet that is not dismissible, and the screen stays put", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    try {
      const onOpenChange = jest.fn();
      await render(
        <Sheet open dismissible={false} onOpenChange={onOpenChange} title="Chọn kho">
          <Text>Nội dung</Text>
        </Sheet>,
      );

      const handled = await act(async () => backPressHandler(spy)());

      expect(handled).toBe(true);
      expect(onOpenChange).not.toHaveBeenCalled();
      expect(screen.getByText("Nội dung")).toBeTruthy();
    } finally {
      spy.mockRestore();
    }
  });

  it("a closed sheet leaves the Back button alone", async () => {
    const spy = jest.spyOn(BackHandler, "addEventListener");
    try {
      await render(
        <Sheet open={false} onOpenChange={jest.fn()} title="Chọn kho">
          <Text>Nội dung</Text>
        </Sheet>,
      );

      expect(spy).not.toHaveBeenCalledWith("hardwareBackPress", expect.anything());
    } finally {
      spy.mockRestore();
    }
  });
});

describe("Sheet scrollable", () => {
  it("sheet scrollable puts title and content in a scroll view capped at 85% of the window", async () => {
    await render(
      <Sheet open scrollable onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    const scroll = within(screen.getByTestId(SHEET_SCROLL_TEST_ID));
    expect(scroll.getByText("Chọn kho")).toBeTruthy();
    expect(scroll.getByText("Nội dung")).toBeTruthy();
    expect(screen.getByLabelText("Chọn kho", { hidden: true })).toHaveProp(
      SHEET_MAX_HEIGHT_PROP,
      Dimensions.get("window").height * UI_LIMITS.sheetMaxHeightRatio,
    );
  });

  it("sheet is not scrollable by default", async () => {
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Chọn kho">
        <Text>Nội dung</Text>
      </Sheet>,
    );

    expect(screen.queryByTestId(SHEET_SCROLL_TEST_ID)).toBeNull();
    expect(
      screen.getByLabelText("Chọn kho", { hidden: true }).props[SHEET_MAX_HEIGHT_PROP],
    ).toBeUndefined();
  });
});

describe("text fields in a sheet", () => {
  it("input inside a sheet uses the sheet text input", async () => {
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Ghi chú">
        <Input label="Nội dung" error="Bắt buộc nhập" />
        <Textarea label="Mô tả" />
      </Sheet>,
    );

    const input = screen.getByLabelText("Nội dung");
    expect(input).toHaveProp(SHEET_INPUT_PROP, true);
    // Same look and wiring as outside a sheet.
    expect(input).toHaveStyle({ minHeight: 48 });
    expect(input).toHaveProp("accessibilityHint", "Bắt buộc nhập");
    expect(screen.getByRole("alert")).toHaveTextContent("Bắt buộc nhập");
    expect(screen.getByLabelText("Mô tả")).toHaveProp(SHEET_INPUT_PROP, true);
  });

  it("input outside a sheet uses a plain text input", async () => {
    await render(<Input label="Nội dung" />);

    expect(screen.getByLabelText("Nội dung").props[SHEET_INPUT_PROP]).toBeUndefined();
  });

  it("input inside a sheet hands its ref to the text field", async () => {
    const ref = createRef<TextInputInstance>();
    await render(
      <Sheet open onOpenChange={jest.fn()} title="Ghi chú">
        <Input label="Nội dung" ref={ref} />
      </Sheet>,
    );

    expect(typeof ref.current?.focus).toBe("function");
  });
});
