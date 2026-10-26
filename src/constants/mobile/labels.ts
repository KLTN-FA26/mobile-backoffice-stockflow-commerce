/**
 * Chuỗi hiển thị chỉ của mobile (không có ở web). Một object duy nhất: các task sau thêm nhóm lồng
 * nhau (vd `auth: {...}`, `scan: {...}`) vào đây thay vì tạo file nhãn mới. Các khoá phẳng bên dưới
 * là nhãn dùng chung của component `components/shared`.
 */
export const MOBILE_LABELS = {
  // Chung
  offline: "Mất kết nối — thay đổi chưa được lưu",
  traceId: "Mã tra cứu",
  retry: "Thử lại",
  refetching: "Đang tải lại",
  loading: "Đang tải",
  loadingMore: "Đang tải thêm",
  refetchFailed: "Không tải lại được dữ liệu mới nhất.",

  // Nhập liệu & lớp phủ (SearchField, FilterChips, FilterSheet, SelectSheet, ConfirmSheet…)
  search: "Tìm kiếm",
  searchPlaceholder: "Tìm…",
  clearSearch: "Xoá tìm kiếm",
  filter: "Bộ lọc",
  removeFilter: (label: string) => `Bỏ ${label}`,
  apply: "Áp dụng",
  reset: "Đặt lại",
  cancel: "Huỷ",
  confirm: "Xác nhận",
  done: "Xong",
  processing: "Đang xử lý…",
  reasonLabel: "Lý do",
  reasonPlaceholder: "Nhập lý do…",
  chooseDate: "Chọn ngày",
  clearField: (label: string) => `Xoá ${label}`,
  decrease: (label: string) => `Giảm ${label}`,
  increase: (label: string) => `Tăng ${label}`,

  // Danh sách rỗng / không tìm thấy
  clearFilters: "Bỏ bộ lọc",
  noResultsTitle: "Không tìm thấy kết quả",
  notFoundTitle: "Không tìm thấy dữ liệu",

  // Màn chưa có
  comingSoonTag: "Đang phát triển",
  comingSoonTitle: "Đang phát triển",
  comingSoonDescription: "Tính năng này đang được phát triển trên hệ thống.",
  portPendingDescription: "Màn hình đang được chuyển sang ứng dụng di động.",

  // Việc chỉ làm được trên web
  loadPlanOnWeb: "Lập kế hoạch xe thực hiện trên web",
  estimateOnWeb: "Ước tính xe thực hiện trên web",
  printOnWeb: "In trên web",

  // Điều hướng. Mục hub nào web đã có hằng số (vd `UI_LABELS.receipt.pageTitle`) thì `nav-config.ts`
  // dùng thẳng hằng số đó; ở đây chỉ có nhãn và tooltip tiếng Anh mà `BackofficeShell.tsx` của web gõ
  // thẳng trong component (G18).
  tabs: {
    inbound: "Nhập hàng",
    warehouse: "Kho",
    fulfillment: "Thực hiện đơn",
    account: "Tài khoản",
  },
  nav: {
    putaway: "Cất hàng",
    warehouseMap: "Kho map & slotting",
    slotting: "Gợi ý vị trí",
    adjustments: "Điều chỉnh tồn",
    movements: "Lịch sử biến động",
    /** Dòng phụ của mục hub = tooltip menu web, nguyên văn. */
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
  },

  // Khung ứng dụng: cấu hình, đăng nhập, phiên. "Đang xác minh phiên đăng nhập", lỗi xác minh và
  // "Thử lại" đã có ở web (`AUTH_UI`), nên không chép lại ở đây.
  appName: "StockFlow Backoffice",
  login: {
    title: "Đăng nhập",
    username: "Tên đăng nhập",
    password: "Mật khẩu",
    submit: "Đăng nhập",
    showPassword: "Hiện mật khẩu",
    retryIn: (seconds: number) => `Thử lại sau ${seconds} giây`,
  },
  relogin: {
    title: "Phiên đăng nhập đã hết hạn",
    description: "Đăng nhập lại để tiếp tục — màn hình hiện tại được giữ nguyên.",
    signOut: "Đăng xuất",
  },
  sessionExpiry: {
    warning: (minutes: number) =>
      `Phiên sắp hết hạn (còn ${minutes} phút) — đăng nhập lại để không gián đoạn`,
    action: "Đăng nhập lại",
  },
  config: {
    title: "Thiếu cấu hình máy chủ",
    description: "Đặt EXPO_PUBLIC_API_URL (gồm /api/v1) rồi khởi động lại ứng dụng.",
  },

  // Tab Tài khoản
  account: {
    title: "Tài khoản",
    defaultWarehouse: "Kho mặc định",
    defaultWarehouseHint:
      "Điền sẵn bộ lọc kho ở Lấy hàng, Trả về kệ, Đóng gói, Lô giao, Chuyến xe — vẫn đổi được.",
    noWarehouse: "Chưa chọn",
    /** Một kho trong danh sách chọn: "MÃ · Tên". */
    warehouseOption: (code: string, name: string) => `${code} · ${name}`,
    /** Các vai trò của người dùng, một dòng. */
    roles: (roles: readonly string[]) => roles.join(", "),
    theme: "Giao diện",
    themeSystem: "Theo hệ thống",
    themeLight: "Sáng",
    themeDark: "Tối",
    sound: "Âm thanh khi quét",
    haptics: "Rung khi quét",
    sessionRemaining: (hours: number, minutes: number) => `Phiên còn ${hours} giờ ${minutes} phút`,
    version: "Phiên bản",
    /** Khi bản dựng không báo số phiên bản (không để trống ô). */
    versionUnknown: "—",
    signOut: "Đăng xuất",
    signOutConfirm: "Đăng xuất khỏi thiết bị này?",
  },

  // Màn bị lỗi khi hiển thị (route error boundary): khác với lỗi tải dữ liệu.
  renderError: {
    title: "Màn hình gặp lỗi",
    description: "Đã xảy ra lỗi khi hiển thị màn hình này.",
    home: "Về trang đầu",
  },

  // Quét mã: ô quét (`ScanField`), màn camera (`CameraScanner`) và mục "Kiểm tra quét mã" ở tab
  // Tài khoản. Câu chữ phản hồi của từng trạm (đúng/sai) là của web, không nằm ở đây.
  scan: {
    openCamera: "Mở camera quét mã",
    // Ngắn: ô quét dùng font mono rộng, câu dài bị cắt. "Bấm Enter" nằm ở `typeHint` (gợi ý cho screen reader).
    placeholder: "Quét hoặc nhập mã",
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
  },
} as const;
