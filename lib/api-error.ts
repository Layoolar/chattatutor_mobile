export interface ParsedApiError {
  message: string;
  data: unknown;
}

function getMessageFromPayload(payload: unknown, fallbackMessage: string): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["error", "message"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }
  }

  return fallbackMessage;
}

export async function parseApiError(response: Response, fallbackMessage: string): Promise<ParsedApiError> {
  const contentType = response.headers.get("content-type") ?? "";

  let data: unknown = null;

  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  } else {
    const text = await response.text().catch(() => "");
    data = text || null;
  }

  return {
    message: getMessageFromPayload(data, fallbackMessage),
    data,
  };
}

export async function throwApiError(response: Response, fallbackMessage: string): Promise<never> {
  const { message } = await parseApiError(response, fallbackMessage);
  throw new Error(message);
}
