/**
 * The three work tabs and their hub items. Mirrors the "Nhập hàng", "Kho" and "Thực hiện đơn"
 * groups of the web sidebar (`src/components/backoffice/BackofficeShell.tsx`, `NAV_GROUPS`, on
 * `origin/develop`): same items, same order, same permission codes. Left out on purpose: Load plan
 * and Loại xe (D3: done on the web). Items the web marks "Đang phát triển" are `comingSoon`.
 *
 * UI-only: hiding an item is a convenience. Backend phải re-check — every screen it opens is
 * authorised again by the API.
 */
import {
  ArrowRightLeft,
  Boxes,
  ClipboardList,
  FileBox,
  FileText,
  History,
  Lightbulb,
  ListChecks,
  MapPin,
  Move,
  PackageCheck,
  PackageOpen,
  PackagePlus,
  SlidersHorizontal,
  Truck,
  Undo2,
  Warehouse,
} from "lucide-react-native";

import { PUT_BACK_LABELS, UI_LABELS } from "@/constants";
import { INVENTORY_LABELS } from "@/constants/inventory";
import { MOBILE_LABELS, MOBILE_ROUTES } from "@/constants/mobile";
import { MOVE_LABELS } from "@/constants/move";
import {
  FULFILLMENT_PACKAGE_PERMISSIONS,
  FULFILLMENT_PICK_PERMISSIONS,
  FULFILLMENT_PICKING_PERMISSIONS,
  GOODS_RECEIPT_PERMISSIONS,
  INVENTORY_ITEM_PERMISSIONS,
  INVENTORY_OVERVIEW_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  ORDER_PERMISSIONS,
  SHIPMENT_PERMISSIONS,
  TRANSFER_PERMISSIONS,
} from "@/constants/permissions";

import type { PermissionCode } from "@/lib/auth/me-permissions";
import type { LucideIcon } from "lucide-react-native";

export type MobileNavItem = {
  key: string;
  label: string;
  /** The web nav tooltip (English), shown as the item's second line. */
  tooltip: string;
  href: string;
  icon: LucideIcon;
  /** Shown only with this code. No code at all = always shown (web rule). */
  permission?: PermissionCode;
  /** Shown with at least one of these codes (a screen several permissions open). */
  anyPermission?: readonly PermissionCode[];
  /** The web screen is still "Đang phát triển": a ComingSoon screen, no invented workflow (D2). */
  comingSoon?: boolean;
};

export type MobileNavGroup = {
  key: "inbound" | "warehouse" | "fulfillment";
  title: string;
  icon: LucideIcon;
  items: MobileNavItem[];
};

const { tooltips } = MOBILE_LABELS.nav;

export const NAV_GROUPS: MobileNavGroup[] = [
  {
    key: "inbound",
    title: MOBILE_LABELS.tabs.inbound,
    icon: PackagePlus,
    items: [
      {
        key: "receipts",
        label: UI_LABELS.receipt.pageTitle,
        tooltip: tooltips.receipts,
        href: MOBILE_ROUTES.receipts.list,
        icon: FileText,
        permission: GOODS_RECEIPT_PERMISSIONS.viewPage,
      },
      {
        key: "putaway",
        label: MOBILE_LABELS.nav.putaway,
        tooltip: tooltips.putaway,
        href: MOBILE_ROUTES.putaway,
        icon: PackageCheck,
        comingSoon: true,
      },
    ],
  },
  {
    key: "warehouse",
    title: MOBILE_LABELS.tabs.warehouse,
    icon: Warehouse,
    items: [
      {
        key: "inventory",
        label: INVENTORY_LABELS.overviewTitle,
        tooltip: tooltips.inventory,
        href: MOBILE_ROUTES.inventory.overview,
        icon: Boxes,
        // Same rule as the page gate: stock READ or reservation READ; alert READ alone is not enough.
        anyPermission: [
          INVENTORY_OVERVIEW_PERMISSIONS.stockRead,
          INVENTORY_OVERVIEW_PERMISSIONS.reservationRead,
        ],
      },
      {
        key: "inventoryItems",
        label: UI_LABELS.inventoryItem.title,
        tooltip: tooltips.inventoryItems,
        href: MOBILE_ROUTES.inventoryItems.list,
        icon: FileBox,
        permission: INVENTORY_ITEM_PERMISSIONS.viewPage,
      },
      {
        key: "warehouseMap",
        label: MOBILE_LABELS.nav.warehouseMap,
        tooltip: tooltips.warehouseMap,
        href: MOBILE_ROUTES.warehouseMap,
        icon: MapPin,
        comingSoon: true,
      },
      {
        key: "slotting",
        label: MOBILE_LABELS.nav.slotting,
        tooltip: tooltips.slotting,
        href: MOBILE_ROUTES.slotting,
        icon: Lightbulb,
        comingSoon: true,
      },
      {
        key: "transfers",
        label: UI_LABELS.transfer.pageTitle,
        tooltip: tooltips.transfers,
        href: MOBILE_ROUTES.transfers.list,
        icon: ArrowRightLeft,
        permission: TRANSFER_PERMISSIONS.viewPage,
      },
      {
        key: "moves",
        label: MOVE_LABELS.title,
        tooltip: tooltips.moves,
        href: MOBILE_ROUTES.moves,
        icon: Move,
        // BE StockOperationsController: POST /inventory/movements is inventory-stock-items:UPDATE
        permission: INVENTORY_PERMISSIONS.stockUpdate,
      },
      {
        key: "adjustments",
        label: MOBILE_LABELS.nav.adjustments,
        tooltip: tooltips.adjustments,
        href: MOBILE_ROUTES.inventory.adjustments,
        icon: SlidersHorizontal,
        permission: INVENTORY_PERMISSIONS.adjustmentRead,
      },
      {
        key: "movements",
        label: MOBILE_LABELS.nav.movements,
        tooltip: tooltips.movements,
        href: MOBILE_ROUTES.inventory.movements,
        icon: History,
        permission: INVENTORY_PERMISSIONS.movementRead,
      },
    ],
  },
  {
    key: "fulfillment",
    title: MOBILE_LABELS.tabs.fulfillment,
    icon: ListChecks,
    items: [
      {
        key: "orders",
        label: UI_LABELS.order.pageTitle,
        tooltip: tooltips.orders,
        href: MOBILE_ROUTES.orders.list,
        icon: ClipboardList,
        permission: ORDER_PERMISSIONS.viewPage,
      },
      {
        key: "picking",
        label: UI_LABELS.fulfillment.pickingTitle,
        tooltip: tooltips.picking,
        href: MOBILE_ROUTES.picking.list,
        icon: Warehouse,
        permission: FULFILLMENT_PICK_PERMISSIONS.viewPage,
      },
      {
        key: "packing",
        label: UI_LABELS.fulfillment.packingTitle,
        tooltip: tooltips.packing,
        href: MOBILE_ROUTES.packing.list,
        icon: PackageCheck,
        permission: FULFILLMENT_PACKAGE_PERMISSIONS.viewPage,
      },
      {
        key: "putBacks",
        label: PUT_BACK_LABELS.title,
        tooltip: tooltips.putBacks,
        href: MOBILE_ROUTES.putBacks,
        icon: Undo2,
        // BE `GET /fulfillment/put-backs` — fulfillment-picking:READ (the resource has no VIEW_PAGE)
        permission: FULFILLMENT_PICKING_PERMISSIONS.read,
      },
      {
        key: "shipments",
        label: UI_LABELS.shipping.shipments.title,
        tooltip: tooltips.shipments,
        href: MOBILE_ROUTES.shipments.list,
        icon: PackageOpen,
        permission: SHIPMENT_PERMISSIONS.viewPage,
      },
      {
        key: "loads",
        label: UI_LABELS.shipping.loads.title,
        tooltip: tooltips.loads,
        href: MOBILE_ROUTES.loads.list,
        icon: Truck,
        permission: SHIPMENT_PERMISSIONS.viewPage,
      },
    ],
  },
];

/** The nav item a route belongs to, by its path. */
export function findNavItem(href: string): MobileNavItem | undefined {
  return NAV_GROUPS.flatMap((group) => group.items).find((item) => item.href === href);
}
