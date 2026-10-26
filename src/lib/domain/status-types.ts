/**
 * Status / role type unions — chỉ các type mà `lifecycle.ts` và `status-map.ts` cần.
 * Chép nguyên khối định nghĩa từ `stockflow-ui/src/lib/mock-data.ts` (adapted: mobile không mang
 * dữ liệu mock, xem `port-manifest.json`).
 */

/** 7 semantic tone — dùng chung cả Mode A & Mode B (FRONTEND-AI-RULES §6.1). */
export type SemanticTone =
  "positive" | "info" | "warning" | "danger" | "neutral" | "muted" | "special";

/** Domain cho <StatusDot domain=... status=... /> (nguồn: status-map.ts). */
export type StatusDomain =
  | "product"
  | "sku"
  | "proposal"
  | "po"
  | "receipt"
  | "qc"
  | "invoice"
  | "putaway"
  | "stock"
  | "location"
  | "pick"
  | "allocation"
  | "pack"
  | "shipment"
  | "to" // transfer order (inter-warehouse)
  | "move" // intra-warehouse move task
  | "design"
  | "preflight"
  | "catalog"
  | "cart"
  | "order"
  | "payment"
  | "conversation"
  | "rma"
  | "customer";

/** Vòng đời sản phẩm (bảng Lifecycle 01). */
export type ProductStatus =
  "Draft" | "Pending Approval" | "Approved" | "Active" | "Published" | "Inactive" | "Discontinued";

/** Vòng đời SKU (bảng Lifecycle 01 — phần SKU). */
export type SkuStatus = "Active" | "Blocked" | "Obsolete";

/** Vòng đời PO (bảng Lifecycle 02). */
export type PoStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Confirmed"
  | "Partially Received"
  | "Received"
  | "Closed"
  | "Cancelled";

/** Trạng thái chất lượng hàng nhận theo lô (03 §5.2). */
export type QcStatus = "Accepted" | "Quarantine" | "Rejected";

/** Vòng đời hoá đơn NCC (bảng Lifecycle 04). */
export type InvoiceStatus =
  "Draft" | "Matched" | "Exception" | "Disputed" | "Approved for Payment" | "Paid" | "Cancelled";

/** Vòng đời nhiệm vụ putaway (05 §5). */
export type PutawayStatus =
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "Partially Completed"
  | "On Hold"
  | "Completed"
  | "Cancelled";

/** Vòng đời nhiệm vụ di dời trong kho (11). */
export type MoveTaskStatus =
  | "Suggested"
  | "Pending"
  | "Assigned"
  | "In Progress"
  | "On Hold"
  | "Discrepancy"
  | "Completed"
  | "Cancelled"
  | "Rejected";
// Ghi chú: docs ghi "Cancelled / Rejected" — tách 2 giá trị để demo đủ badge.

export type RoleName =
  | "System Admin"
  | "Procurement Staff"
  | "Warehouse Staff"
  | "Warehouse Manager"
  | "Inventory Planner"
  | "QC Staff"
  | "Accountant"
  | "E-commerce Admin"
  | "Sales Staff"
  | "Order Coordinator";
