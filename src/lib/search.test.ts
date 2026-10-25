import { normalizeSearchText } from "./search";

describe("normalizeSearchText", () => {
  it("strips vietnamese tone and vowel marks", () => {
    expect(normalizeSearchText("Kho Hà Nội")).toBe("kho ha noi");
    expect(normalizeSearchText("Phiếu nhập hàng")).toBe("phieu nhap hang");
    expect(normalizeSearchText("Ưu tiên cao")).toBe("uu tien cao");
  });

  it("turns đ and Đ into d", () => {
    expect(normalizeSearchText("Đà Nẵng")).toBe("da nang");
    expect(normalizeSearchText("đơn hàng")).toBe("don hang");
  });

  it("lower-cases and trims", () => {
    expect(normalizeSearchText("  KHO HA NOI \n")).toBe("kho ha noi");
  });

  it("reads decomposed and precomposed input the same way", () => {
    expect(normalizeSearchText("Hà Nội".normalize("NFD"))).toBe(normalizeSearchText("Hà Nội"));
  });

  it("leaves codes and digits alone", () => {
    expect(normalizeSearchText("SKU-0042/A")).toBe("sku-0042/a");
    expect(normalizeSearchText("")).toBe("");
  });
});
