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
} as const;
