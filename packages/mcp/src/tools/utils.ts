export function errorResult(error: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `Error: ${error instanceof Error ? error.message : String(error)}`,
      },
    ],
    isError: true as const,
  };
}

export async function withResult<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    return errorResult(error);
  }
}

export function textResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
  };
}

export function enumValues<T extends Record<string, string>>(enumObj: T) {
  return Object.values(enumObj) as [string, ...string[]];
}

/** Strip undefined values from an update body so only set fields are sent. */
export function cleanUpdate(body: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined));
}

/** Run an async action and return a textResult on success or errorResult on failure. */
export async function tryAction<T>(
  fn: () => Promise<T>,
  successMsg: (result: T) => string,
) {
  try {
    const result = await fn();
    return textResult(successMsg(result));
  } catch (error) {
    return errorResult(error);
  }
}
