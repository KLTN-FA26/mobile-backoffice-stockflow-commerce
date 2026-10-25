import { cn } from "./utils";

describe("cn", () => {
  it("merges conflicting tailwind classes", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy", () => {
    expect(cn("a", false && "b")).toBe("a");
  });
});
