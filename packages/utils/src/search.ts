export interface ParsedSearch {
  text: string;
  keys: { key: string; value: string }[];
}

export function parseSearch(input: string): ParsedSearch {
  const keys: { key: string; value: string }[] = [];
  let text = '';

  const keyPattern = /(\w+):(?:'([^']*)'|"([^"]*)"|(\S+))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = keyPattern.exec(input)) !== null) {
    text += input.slice(lastIndex, match.index);
    lastIndex = match.index + match[0].length;

    const key = match[1];
    const value = match[2] ?? match[3] ?? match[4];
    keys.push({ key, value });
  }

  text += input.slice(lastIndex);
  text = text.trim().replace(/\s+/g, ' ');

  return { text, keys };
}

export function getKeyValue(parsed: ParsedSearch, key: string): string | undefined {
  return parsed.keys.find((k) => k.key === key)?.value;
}

export function hasKey(parsed: ParsedSearch, key: string): boolean {
  return parsed.keys.some((k) => k.key === key);
}

export function buildSearchKey(key: string, value: string): string {
  if (value.includes(' ')) return `${key}:'${value}'`;
  return `${key}:${value}`;
}
