import { getAuthTokenSync } from "./auth-helpers";

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

  const headers: Record<string, string> = { ...(customHeaders ?? {}) };

  if (!skipAuth) {
    const token = getAuthTokenSync();
    if (token && !headers.Authorization) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(input, { ...rest, headers, body });

  if (response.status === 401 && !skipAuth) {
    fireUnauthorized();
  }

  return response;
}
