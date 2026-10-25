import { MOBILE_LABELS } from "./labels";

describe("mobile labels", () => {
  it("keeps the shared component copy from the spec", () => {
    expect(MOBILE_LABELS).toMatchObject({
      offline: "Mất kết nối — thay đổi chưa được lưu",
      traceId: "Mã tra cứu",
      retry: "Thử lại",
      refetching: "Đang tải lại",
      loading: "Đang tải",
      loadingMore: "Đang tải thêm",
      refetchFailed: "Không tải lại được dữ liệu mới nhất.",
      clearFilters: "Bỏ bộ lọc",
      noResultsTitle: "Không tìm thấy kết quả",
      notFoundTitle: "Không tìm thấy dữ liệu",
      comingSoonTag: "Đang phát triển",
      comingSoonTitle: "Đang phát triển",
      comingSoonDescription: "Tính năng này đang được phát triển trên hệ thống.",
      portPendingDescription: "Màn hình đang được chuyển sang ứng dụng di động.",
      loadPlanOnWeb: "Lập kế hoạch xe thực hiện trên web",
      estimateOnWeb: "Ước tính xe thực hiện trên web",
      printOnWeb: "In trên web",
    });
  });

  it("keeps the copy of the search, filter, confirm and picker components", () => {
    expect(MOBILE_LABELS).toMatchObject({
      search: "Tìm kiếm",
      searchPlaceholder: "Tìm…",
      filter: "Bộ lọc",
      apply: "Áp dụng",
      reset: "Đặt lại",
      cancel: "Huỷ",
      confirm: "Xác nhận",
      reasonLabel: "Lý do",
    });
    expect(MOBILE_LABELS.removeFilter("Đang giao")).toBe("Bỏ Đang giao");
    expect(MOBILE_LABELS.clearField("Từ ngày")).toBe("Xoá Từ ngày");
    expect(MOBILE_LABELS.decrease("Số lượng")).toBe("Giảm Số lượng");
    expect(MOBILE_LABELS.increase("Số lượng")).toBe("Tăng Số lượng");
  });
});
