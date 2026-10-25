import Constants from "expo-constants";
import * as Device from "expo-device";

import { USER_AGENT_PRODUCT } from "@/constants/mobile";

type UserAgentInput = {
  appVersion: string;
  osName: string;
  osVersion: string;
  modelName: string;
};

const UNKNOWN = "unknown";
const FALLBACK_APP_VERSION = "0.0.0";

export function buildUserAgent(i: UserAgentInput): string {
  return `${USER_AGENT_PRODUCT}/${i.appVersion} (${i.osName} ${i.osVersion}; ${i.modelName})`;
}

// A header value can only carry printable ASCII: one stray character (a model name with accents,
// a newline) makes the native HTTP stack reject every request.
function headerSafe(value: string | null | undefined): string {
  return (value ?? "").replace(/[^\x20-\x7e]/g, "").trim() || UNKNOWN;
}

export function deviceUserAgent(): string {
  return buildUserAgent({
    appVersion: headerSafe(Constants.expoConfig?.version ?? FALLBACK_APP_VERSION),
    osName: headerSafe(Device.osName),
    osVersion: headerSafe(Device.osVersion),
    modelName: headerSafe(Device.modelName),
  });
}
