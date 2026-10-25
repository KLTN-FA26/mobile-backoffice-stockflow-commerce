// Stand-in for `expo-haptics` (registered in src/test/setup.ts).
export const impactAsync = jest.fn(async (_style?: string) => {});
export const notificationAsync = jest.fn(async (_type?: string) => {});
export const selectionAsync = jest.fn(async () => {});

export const ImpactFeedbackStyle = {
  Light: "light",
  Medium: "medium",
  Heavy: "heavy",
  Soft: "soft",
  Rigid: "rigid",
} as const;

export const NotificationFeedbackType = {
  Success: "success",
  Warning: "warning",
  Error: "error",
} as const;
