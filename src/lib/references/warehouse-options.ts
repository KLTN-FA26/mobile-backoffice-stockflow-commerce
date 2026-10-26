/**
 * Danh sách kho đang hoạt động cho module khác (vd chọn kho nhận khi tạo PO — SCRUM-390, BE PR #71).
 *
 * Đặt ở `lib/` để module khác dùng mà không import feature kho (feature-architecture).
 * BE `GET /warehouses` trả `{ id, prefix, name, … }`; mock cũ trả `{ warehouseId, code, name }` —
 * schema nhận cả hai rồi chuẩn hoá.
 */

import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { PAGE_SIZE } from "@/constants";

import { api } from "@/lib/api/client";
import { QUERY_TIMES } from "@/lib/api/query-client";

const warehouseOptionSchema = z
  .object({
    id: z.string().min(1).optional(),
    warehouseId: z.string().min(1).optional(),
    prefix: z.string().optional(),
    code: z.string().optional(),
    name: z.string(),
    // BE `WarehouseResponse.status` (ACTIVE / INACTIVE); mock-data dùng `active`
    status: z.string().optional(),
    active: z.boolean().optional(),
  })
  .transform((w) => ({
    warehouseId: w.id ?? w.warehouseId ?? "",
    code: w.prefix ?? w.code ?? "",
    name: w.name,
    active: w.status !== undefined ? w.status === "ACTIVE" : (w.active ?? true),
  }))
  .refine((w) => w.warehouseId !== "", "Kho thiếu id");

const warehouseOptionPageSchema = z.object({ items: z.array(warehouseOptionSchema) });

export type WarehouseOption = z.infer<typeof warehouseOptionSchema>;

export const warehouseOptionKeys = {
  all: ["references", "warehouses"] as const,
  active: () => [...warehouseOptionKeys.all, "active"] as const,
  // Mobile: no `warehouseId` argument. The web keyed this by a store field the app never sets, and
  // the user's default warehouse must not split the cache of a lookup that does
  // not depend on it.
  directory: () => [...warehouseOptionKeys.all, "directory"] as const,
};

export async function fetchActiveWarehouseOptions(
  signal?: AbortSignal,
): Promise<WarehouseOption[]> {
  // Mobile: a plain object (axios serialises it); the web passed `URLSearchParams`.
  const params = { page: 0, size: PAGE_SIZE.masterData, status: "ACTIVE", sort: "name,asc" };
  const { data } = await api.get<unknown>("/warehouses", { params, signal });
  return warehouseOptionPageSchema.parse(data).items;
}

/**
 * Mọi kho (mọi trạng thái) để tra TÊN — chứng từ cũ có thể trỏ tới kho đã ngừng hoạt động, danh
 * sách ACTIVE không có nên sẽ hiện UUID. Chọn kho cho chứng từ mới vẫn dùng `useWarehouseOptions`.
 */
export async function fetchWarehouseDirectory(signal?: AbortSignal): Promise<WarehouseOption[]> {
  const params = { page: 0, size: PAGE_SIZE.masterData, sort: "name,asc" };
  const { data } = await api.get<unknown>("/warehouses", { params, signal });
  return warehouseOptionPageSchema.parse(data).items;
}

export function useWarehouseDirectory(enabled = true) {
  return useQuery({
    queryKey: warehouseOptionKeys.directory(),
    enabled,
    queryFn: ({ signal }) => fetchWarehouseDirectory(signal),
    ...QUERY_TIMES.master,
  });
}

export function useWarehouseOptions() {
  return useQuery({
    queryKey: warehouseOptionKeys.active(),
    queryFn: ({ signal }) => fetchActiveWarehouseOptions(signal),
    ...QUERY_TIMES.master,
  });
}
