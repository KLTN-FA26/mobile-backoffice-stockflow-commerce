import { render, screen } from "@testing-library/react-native";

import { INTL_PROBE_LABELS } from "@/constants/mobile";

import * as intlProbe from "@/lib/format/intl-probe";

import { IntlProbeScreen } from "./IntlProbeScreen";

describe("IntlProbeScreen", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("lists every probe case with its expected value and an OK badge", async () => {
    await render(<IntlProbeScreen />);

    for (const { name, expected } of intlProbe.INTL_PROBE_CASES) {
      expect(screen.getByText(name)).toBeTruthy();
      expect(screen.getByText(`${INTL_PROBE_LABELS.expected}: "${expected}"`)).toBeTruthy();
    }
    expect(screen.getAllByText(INTL_PROBE_LABELS.ok)).toHaveLength(
      intlProbe.INTL_PROBE_CASES.length,
    );
    expect(screen.queryByText(INTL_PROBE_LABELS.mismatch)).toBeNull();
  });

  it("marks a row that differs from the expectation", async () => {
    jest
      .spyOn(intlProbe, "runIntlProbe")
      .mockReturnValue([
        { name: "formatDate(x)", actual: "Mar 15, 2026", expected: "15 thg 3, 2026", ok: false },
      ]);

    await render(<IntlProbeScreen />);

    expect(screen.getByText(INTL_PROBE_LABELS.mismatch)).toBeTruthy();
    expect(screen.getByText(`${INTL_PROBE_LABELS.actual}: "Mar 15, 2026"`)).toBeTruthy();
  });
});
