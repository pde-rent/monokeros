export function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit" });
const monthDayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const fullDateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatTimestamp(iso: string): string {
  return timeFmt.format(new Date(iso));
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Returns the current time as an ISO 8601 string. */
export const now = () => new Date().toISOString();

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const current = new Date();
  if (date.toDateString() === current.toDateString()) return timeFmt.format(date);
  if (date.getFullYear() === current.getFullYear()) return monthDayFmt.format(date);
  return fullDateFmt.format(date);
}

const FILE_TYPE_MAP: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  json: "JSON",
  md: "Markdown",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  py: "Python",
  go: "Go",
  rs: "Rust",
  java: "Java",
  rb: "Ruby",
  php: "PHP",
  swift: "Swift",
  kt: "Kotlin",
  yaml: "YAML",
  yml: "YAML",
  xml: "XML",
  svg: "SVG",
  png: "Image",
  jpg: "Image",
  jpeg: "Image",
  gif: "Image",
  webp: "Image",
  ico: "Image",
  pdf: "PDF",
  zip: "Archive",
  tar: "Archive",
  gz: "Archive",
};

export function getFileTypeLabel(filename: string, isDirectory: boolean): string {
  if (isDirectory) return "Folder";
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return FILE_TYPE_MAP[ext] || "File";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const SLUG_SEP = /[-_]/g;
const WORD_START = /\b\w/g;

/** Title-case a slug/kebab-case string: 'prd-proposal' → 'Prd Proposal' */
export function formatLabel(slug: string): string {
  return slug.replace(SLUG_SEP, " ").replace(WORD_START, (c) => c.toUpperCase());
}

/** Convert a display name to a URL-safe slug: 'My Workspace' → 'my-workspace' */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Concatenate class names, filtering out falsy values. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export * from "./files";
export * from "./search";
