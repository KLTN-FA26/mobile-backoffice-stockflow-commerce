import { allowedTransitions, canTransition, isTerminal } from "@/lib/domain";
import { RECEIPT_TRANSITIONS } from "@/lib/domain/lifecycle";

// The three helpers every feature's action gating goes through, run against a real docs table
// (receipt, docs 03 §5.1) rather than a made-up one.
describe("lifecycle helpers", () => {
  describe("canTransition", () => {
    it("allows exactly the next statuses the table lists", () => {
      expect(canTransition(RECEIPT_TRANSITIONS, "Draft", "Confirmed")).toBe(true);
      expect(canTransition(RECEIPT_TRANSITIONS, "Draft", "Cancelled")).toBe(true);
      expect(canTransition(RECEIPT_TRANSITIONS, "Confirmed", "In Putaway")).toBe(true);
    });

    it("refuses a status the table does not list, and never goes backwards", () => {
      expect(canTransition(RECEIPT_TRANSITIONS, "Draft", "Closed")).toBe(false);
      expect(canTransition(RECEIPT_TRANSITIONS, "Confirmed", "Draft")).toBe(false);
      expect(canTransition(RECEIPT_TRANSITIONS, "Closed", "Draft")).toBe(false);
    });

    it("refuses staying in the same status", () => {
      expect(canTransition(RECEIPT_TRANSITIONS, "Draft", "Draft")).toBe(false);
    });

    // BR-05 (docs 03 §5.1): a confirmed receipt can no longer be cancelled.
    it("refuses Cancelled once the receipt is confirmed", () => {
      expect(canTransition(RECEIPT_TRANSITIONS, "Confirmed", "Cancelled")).toBe(false);
      expect(canTransition(RECEIPT_TRANSITIONS, "In QC", "Cancelled")).toBe(false);
    });
  });

  describe("isTerminal", () => {
    it.each(["Closed", "Cancelled"] as const)("%s has no way out", (status) => {
      expect(isTerminal(RECEIPT_TRANSITIONS, status)).toBe(true);
    });

    it.each(["Draft", "Confirmed", "In QC", "In Putaway"] as const)(
      "%s can still move on",
      (status) => {
        expect(isTerminal(RECEIPT_TRANSITIONS, status)).toBe(false);
      },
    );
  });

  describe("allowedTransitions", () => {
    it("returns the row of the table, in order", () => {
      expect(allowedTransitions(RECEIPT_TRANSITIONS, "In QC")).toEqual(["In Putaway", "Closed"]);
    });

    it("returns nothing for a terminal status", () => {
      expect(allowedTransitions(RECEIPT_TRANSITIONS, "Cancelled")).toEqual([]);
    });

    it("agrees with canTransition and isTerminal for every status", () => {
      for (const from of Object.keys(RECEIPT_TRANSITIONS) as (keyof typeof RECEIPT_TRANSITIONS)[]) {
        const next = allowedTransitions(RECEIPT_TRANSITIONS, from);
        expect(isTerminal(RECEIPT_TRANSITIONS, from)).toBe(next.length === 0);
        for (const to of next) expect(canTransition(RECEIPT_TRANSITIONS, from, to)).toBe(true);
      }
    });
  });
});
