export function errorResult(error: unknown) {
  return {
    content: [{ type: 'text' as const, text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
    isError: true as const,
  };
}

export async function withResult<T>(fn: () => Promise<T>) {
  try {
    const data = await fn();
    return {
      content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    };
  } catch (error) {
    return errorResult(error);
  }
}

export function textResult(text: string) {
  return {
    content: [{ type: 'text' as const, text }],
  };
}

export function enumValues<T extends Record<string, string>>(enumObj: T) {
  return Object.values(enumObj) as [string, ...string[]];
}
