import { getAuthTokenSync, loadAuthToken } from "./auth-helpers";

type UnauthorizedHandler = () => void;

const unauthorizedHandlers = new Set<UnauthorizedHandler>();

export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  unauthorizedHandlers.add(handler);
  return () => {
    unauthorizedHandlers.delete(handler);
  };
}

function fireUnauthorized() {
  for (const handler of unauthorizedHandlers) {
    try {
      handler();
    } catch {
      // handlers must not throw
    }
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  skipAuth?: boolean;
}

export async function apiFetch(
  input: string,
  options: ApiFetchOptions = {},
): Promise<Response> {
  const { skipAuth, headers: customHeaders, body, ...rest } = options;
  const method = (rest.method ?? "GET").toUpperCase();

  const headers: Record<string, string> = { ...(customHeaders ?? {}) };

  if (!skipAuth) {
    const token = getAuthTokenSync() ?? (await loadAuthToken());
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  // Personalized API reads should never use browser cache revalidation.
  // Without this, study-plan fetches can reuse a stale cached empty payload
  // after the backend starts returning lessons, which surfaces as "No lessons yet".
  const requestInit: RequestInit = { ...rest, headers, body };
  if (!skipAuth && (method === "GET" || method === "HEAD")) {
    if (requestInit.cache === undefined) {
      requestInit.cache = "no-store";
    }
  }

  const response = await fetch(input, requestInit);

  if (response.status === 401 && !skipAuth) {
    fireUnauthorized();
  }

  return response;
}
