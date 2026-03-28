// ── MIME type mapping (ext with leading dot -> MIME string) ──────────────────
export const MIME_TYPES: Record<string, string> = {
  ".md": "text/markdown",
  ".toml": "application/toml",
  ".json": "application/json",
  ".ts": "text/typescript",
  ".tsx": "text/typescript",
  ".js": "text/javascript",
  ".jsx": "text/javascript",
  ".txt": "text/plain",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".log": "text/plain",
  ".csv": "text/csv",
  ".html": "text/html",
  ".css": "text/css",
  ".scss": "text/css",
  ".sh": "application/x-sh",
  ".py": "text/x-python",
  ".go": "text/x-go",
  ".rs": "text/x-rust",
  ".java": "text/x-java",
  ".rb": "text/x-ruby",
  ".php": "text/x-php",
  ".swift": "text/x-swift",
  ".kt": "text/x-kotlin",
  ".xml": "application/xml",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export function mimeFromExt(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  return MIME_TYPES[filename.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

// ── File extension category sets ────────────────────────────────────────────

export const CODE_EXTS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "py",
  "rb",
  "go",
  "rs",
  "java",
  "c",
  "cpp",
  "h",
  "cs",
  "swift",
  "kt",
  "php",
  "vue",
  "svelte",
  "scala",
  "scss",
  "sass",
  "less",
  "css",
  "html",
  "hpp",
  "lua",
  "r",
  "pl",
  "ex",
  "exs",
  "erl",
  "hs",
  "ml",
  "clj",
  "dart",
  "zig",
  "nim",
  "v",
  "sol",
  "sql",
  "sh",
  "bash",
  "zsh",
]);

export const TEXT_EXTS = new Set([
  "txt",
  "md",
  "markdown",
  "rst",
  "log",
  "cfg",
  "conf",
  "ini",
  "yaml",
  "yml",
  "json",
  "xml",
  "toml",
  "env",
]);

export const IMAGE_EXTS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
  "tiff",
]);

export const SPREADSHEET_EXTS = new Set([
  "xls",
  "xlsx",
  "csv",
  "tsv",
  "ods",
  "parquet",
  "avro",
  "orc",
]);
export const DOC_EXTS = new Set(["doc", "docx", "odt", "rtf", "pages"]);
export const DATABASE_EXTS = new Set(["sqlite", "db", "sqlite3"]);
export const ARCHIVE_EXTS = new Set(["zip", "tar", "gz", "rar", "7z", "bz2"]);
export const AUDIO_EXTS = new Set(["mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"]);
export const VIDEO_EXTS = new Set(["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm", "m4v"]);

export type FileCategory =
  | "code"
  | "text"
  | "image"
  | "pdf"
  | "spreadsheet"
  | "doc"
  | "archive"
  | "audio"
  | "video"
  | "database"
  | "unknown";

/** Classify a file extension into a broad category. */
export function getFileCategory(ext: string): FileCategory {
  if (CODE_EXTS.has(ext)) return "code";
  if (TEXT_EXTS.has(ext)) return "text";
  if (IMAGE_EXTS.has(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (SPREADSHEET_EXTS.has(ext)) return "spreadsheet";
  if (DOC_EXTS.has(ext)) return "doc";
  if (ARCHIVE_EXTS.has(ext)) return "archive";
  if (AUDIO_EXTS.has(ext)) return "audio";
  if (VIDEO_EXTS.has(ext)) return "video";
  if (DATABASE_EXTS.has(ext)) return "database";
  return "unknown";
}

/** Returns true if the file extension supports inline text preview */
export function isPreviewable(extOrFilename: string): boolean {
  const ext = extOrFilename.includes(".") ? getExt(extOrFilename) : extOrFilename;
  return CODE_EXTS.has(ext) || TEXT_EXTS.has(ext) || ext === "pdf";
}

export function getExt(name: string): string {
  return name.split(".").pop()?.toLowerCase() || "";
}
