import { AxiosHeaders } from "axios";

import type { AxiosRequestConfig } from "axios";

/** Headers of a request recorded by `axios-mock-adapter` (`mock.history.*[i]`), as a plain object. */
export function sentHeaders(request: AxiosRequestConfig | undefined): Record<string, unknown> {
  const headers = request?.headers;
  return headers instanceof AxiosHeaders ? headers.toJSON() : { ...headers };
}
