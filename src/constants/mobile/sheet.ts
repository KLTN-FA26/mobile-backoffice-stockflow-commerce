/**
 * Nhãn đọc màn hình của `Sheet`. `@gorhom/bottom-sheet` mặc định đọc tiếng Anh ("Bottom sheet
 * backdrop", "Tap to close the bottom sheet", "Bottom sheet handle"...), nên `Sheet` luôn truyền
 * các chuỗi này. Sẽ gộp vào `MOBILE_LABELS` khi file đó có.
 */
export const SHEET_LABELS = {
  backdropLabel: "Nền mờ của bảng",
  backdropHint: "Chạm để đóng bảng",
  handleLabel: "Thanh kéo của bảng",
  handleHint: "Kéo lên hoặc xuống để mở rộng hoặc thu nhỏ bảng",
} as const;
