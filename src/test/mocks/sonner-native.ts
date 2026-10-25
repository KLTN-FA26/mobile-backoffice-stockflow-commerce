// Stand-in for `sonner-native` (registered in src/test/setup.ts). The real library pulls in
// reanimated, gesture-handler and svg, which is slow to load and unnecessary: a test asserts on the
// spies instead, e.g. `expect(toast.success).toHaveBeenCalledWith("Đã lưu")`.
const show = (_message: string, _data?: { description?: string }) => "toast-id";

export const Toaster = jest.fn((_props: Record<string, unknown>) => null);

export const toast = Object.assign(jest.fn(show), {
  success: jest.fn(show),
  info: jest.fn(show),
  error: jest.fn(show),
  warning: jest.fn(show),
  loading: jest.fn(show),
  dismiss: jest.fn((_id?: string | number) => undefined),
});
