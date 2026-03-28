import {
  FolderSimpleIcon,
  FolderIcon,
  FolderOpenIcon,
  FileIcon,
  FileTextIcon,
  FileCodeIcon,
  FileImageIcon,
  FilePdfIcon,
  FileXlsIcon,
  FileDocIcon,
  FileZipIcon,
  FileAudioIcon,
  FileVideoIcon,
  DatabaseIcon,
} from "@phosphor-icons/react";
import type { FileEntry } from "@monokeros/types";
import { getExt, getFileCategory, type FileCategory } from "@monokeros/utils";

const CATEGORY_ICON: Record<FileCategory, typeof FileIcon> = {
  code: FileCodeIcon,
  text: FileTextIcon,
  image: FileImageIcon,
  pdf: FilePdfIcon,
  spreadsheet: FileXlsIcon,
  doc: FileDocIcon,
  archive: FileZipIcon,
  audio: FileAudioIcon,
  video: FileVideoIcon,
  database: DatabaseIcon,
  unknown: FileIcon,
};

const CODE_MIMES = ["javascript", "typescript", "json", "xml", "html", "css"];
const isCodeMime = (mime: string) => CODE_MIMES.some((m) => mime.includes(m));

const CATEGORY_COLOR: Record<FileCategory, string> = {
  code: "var(--color-purple)",
  text: "var(--color-blue)",
  image: "var(--color-green)",
  pdf: "var(--color-blue)",
  spreadsheet: "var(--color-orange)",
  doc: "var(--color-blue)",
  archive: "var(--color-yellow)",
  audio: "var(--color-fg-2)",
  video: "var(--color-fg-2)",
  database: "var(--color-fg-2)",
  unknown: "var(--color-fg-2)",
};

export function getFileIcon(entry: FileEntry) {
  if (entry.type === "directory") return FolderSimpleIcon;
  return CATEGORY_ICON[getFileCategory(getExt(entry.name))];
}

export function getFileIconColor(entry: FileEntry): string {
  if (entry.type === "directory") return "var(--color-orange)";
  const ext = getExt(entry.name);
  const category = getFileCategory(ext);
  if (category !== "unknown") return CATEGORY_COLOR[category];
  // Config/data files get orange
  if (["json", "yaml", "yml", "xml", "toml", "cfg", "conf", "ini", "csv"].includes(ext))
    return "var(--color-orange)";
  return "var(--color-fg-2)";
}

export function getTreeFileIcon(entry: FileEntry, expanded: boolean) {
  if (entry.type === "directory") return expanded ? FolderOpenIcon : FolderIcon;
  const ext = getExt(entry.name);
  const mimeType = entry.mimeType?.toLowerCase() || "";
  if (isCodeMime(mimeType)) return FileCodeIcon;
  if (mimeType.includes("image")) return FileImageIcon;
  if (mimeType.includes("pdf")) return FilePdfIcon;
  if (mimeType.includes("zip") || mimeType.includes("archive")) return FileZipIcon;
  if (mimeType.includes("text") || mimeType.includes("markdown")) return FileTextIcon;
  // Fall back to extension-based category
  const category = getFileCategory(ext);
  return CATEGORY_ICON[category];
}

export function getTreeFileIconColor(entry: FileEntry): string {
  if (entry.type === "directory") return "var(--color-orange)";
  const ext = getExt(entry.name);
  const mimeType = entry.mimeType?.toLowerCase() || "";
  if (isCodeMime(mimeType)) return "var(--color-blue)";
  if (mimeType.includes("image")) return "var(--color-purple)";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("text") ||
    mimeType.includes("markdown") ||
    ["txt", "md", "markdown", "rst", "log", "csv"].includes(ext)
  )
    return "var(--color-green)";
  if (mimeType.includes("zip") || mimeType.includes("archive")) return "var(--color-red)";
  const category = getFileCategory(ext);
  if (category === "code") return "var(--color-blue)";
  return "var(--color-fg-2)";
}

export function getListFileIcon(entry: FileEntry, _size: number) {
  if (entry.type === "directory") {
    return { Icon: FolderSimpleIcon, color: "var(--color-orange)", weight: "fill" as const };
  }
  const category = getFileCategory(getExt(entry.name));
  const mimeType = entry.mimeType.toLowerCase();
  if (category === "code") {
    return { Icon: FileCodeIcon, color: "var(--color-blue)", weight: "fill" as const };
  }
  if (category === "text" || mimeType.startsWith("text/")) {
    return { Icon: FileTextIcon, color: "var(--color-fg-2)", weight: "fill" as const };
  }
  return { Icon: FileIcon, color: "var(--color-fg-3)", weight: "fill" as const };
}
