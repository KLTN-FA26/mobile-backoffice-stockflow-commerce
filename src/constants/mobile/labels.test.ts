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

  it("keeps the copy of the app shell, login and session screens", () => {
    expect(MOBILE_LABELS).toMatchObject({
      appName: "StockFlow Backoffice",
      login: {
        title: "Đăng nhập",
        username: "Tên đăng nhập",
        password: "Mật khẩu",
        submit: "Đăng nhập",
        showPassword: "Hiện mật khẩu",
      },
      relogin: {
        title: "Phiên đăng nhập đã hết hạn",
        description: "Đăng nhập lại để tiếp tục — màn hình hiện tại được giữ nguyên.",
        signOut: "Đăng xuất",
      },
      sessionExpiry: { action: "Đăng nhập lại" },
      config: {
        title: "Thiếu cấu hình máy chủ",
        description: "Đặt EXPO_PUBLIC_API_URL (gồm /api/v1) rồi khởi động lại ứng dụng.",
      },
    });
    expect(MOBILE_LABELS.login.retryIn(30)).toBe("Thử lại sau 30 giây");
    expect(MOBILE_LABELS.sessionExpiry.warning(12)).toBe(
      "Phiên sắp hết hạn (còn 12 phút) — đăng nhập lại để không gián đoạn",
    );
  });

  it("keeps the tab names and the hub copy the web has no constant for", () => {
    expect(MOBILE_LABELS.tabs).toEqual({
      inbound: "Nhập hàng",
      warehouse: "Kho",
      fulfillment: "Thực hiện đơn",
      account: "Tài khoản",
    });
    // Labels and English tooltips typed inline in the web BackofficeShell.tsx (G18).
    expect(MOBILE_LABELS.nav).toEqual({
      putaway: "Cất hàng",
      warehouseMap: "Kho map & slotting",
      slotting: "Gợi ý vị trí",
      adjustments: "Điều chỉnh tồn",
      movements: "Lịch sử biến động",
      tooltips: {
        receipts: "Goods receipts",
        putaway: "Putaway",
        inventory: "Inventory Overview",
        inventoryItems: "Inventory items",
        warehouseMap: "Warehouse Map",
        slotting: "Slotting Suggestions",
        transfers: "Inter-warehouse Transfers",
        moves: "Intra-warehouse Moves",
        adjustments: "Stock adjustments",
        movements: "Stock movement history",
        orders: "Orders",
        picking: "Picking",
        packing: "Packing",
        putBacks: "Put-back",
        shipments: "Shipments waiting for dispatch",
        loads: "Loading & carrier handover",
      },
    });
  });

  it("keeps the copy of the account tab and its display formats", () => {
    expect(MOBILE_LABELS.account).toMatchObject({
      title: "Tài khoản",
      defaultWarehouse: "Kho mặc định",
      noWarehouse: "Chưa chọn",
      theme: "Giao diện",
      themeSystem: "Theo hệ thống",
      themeLight: "Sáng",
      themeDark: "Tối",
      sound: "Âm thanh khi quét",
      haptics: "Rung khi quét",
      version: "Phiên bản",
      versionUnknown: "—",
      signOut: "Đăng xuất",
      signOutConfirm: "Đăng xuất khỏi thiết bị này?",
    });
    expect(MOBILE_LABELS.account.sessionRemaining(7, 59)).toBe("Phiên còn 7 giờ 59 phút");
    expect(MOBILE_LABELS.account.warehouseOption("HN", "Kho Hà Nội")).toBe("HN · Kho Hà Nội");
    expect(MOBILE_LABELS.account.roles(["WAREHOUSE_STAFF", "ORDER_COORDINATOR"])).toBe(
      "WAREHOUSE_STAFF, ORDER_COORDINATOR",
    );
    expect(MOBILE_LABELS.account.roles(["WAREHOUSE_STAFF"])).toBe("WAREHOUSE_STAFF");
    expect(MOBILE_LABELS.account.roles([])).toBe("");
  });

  it("keeps the copy of the scan field, the camera scanner and the scan check", () => {
    expect(MOBILE_LABELS.scan).toEqual({
      openCamera: "Mở camera quét mã",
      typeHint: "Quét hoặc nhập mã rồi bấm Enter",
      clear: "Xoá mã",
      close: "Đóng",
      permissionTitle: "Cần quyền camera để quét mã",
      allowCamera: "Cho phép dùng camera",
      permissionDenied: "Bạn đã tắt quyền camera. Mở Cài đặt để bật lại, hoặc nhập mã bằng tay.",
      openSettings: "Mở Cài đặt",
      typeInstead: "Nhập tay",
      testTitle: "Kiểm tra quét mã",
      testHint: "Quét thử một mã để kiểm tra camera, âm báo và rung.",
      lastCode: "Mã vừa đọc",
    });
  });

  it("does not copy strings the web constants already carry", () => {
    // "Đang xác minh phiên đăng nhập" is AUTH_UI.verifyingSession (src/constants/auth.ts).
    expect(MOBILE_LABELS).not.toHaveProperty("bootstrap");
  });
});
