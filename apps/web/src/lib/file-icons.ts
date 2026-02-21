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
} from '@phosphor-icons/react';
import type { FileEntry } from '@monokeros/types';
import {
  CODE_EXTS, TEXT_EXTS, IMAGE_EXTS, SPREADSHEET_EXTS,
  DOC_EXTS, ARCHIVE_EXTS, AUDIO_EXTS, VIDEO_EXTS, DATABASE_EXTS, getExt,
} from '@monokeros/utils';

export function getFileIcon(entry: FileEntry) {
  if (entry.type === 'directory') return FolderSimpleIcon;
  const ext = getExt(entry.name);
  if (CODE_EXTS.has(ext)) return FileCodeIcon;
  if (TEXT_EXTS.has(ext)) return FileTextIcon;
  if (IMAGE_EXTS.has(ext)) return FileImageIcon;
  if (ext === 'pdf') return FilePdfIcon;
  if (SPREADSHEET_EXTS.has(ext)) return FileXlsIcon;
  if (DOC_EXTS.has(ext)) return FileDocIcon;
  if (ARCHIVE_EXTS.has(ext)) return FileZipIcon;
  if (AUDIO_EXTS.has(ext)) return FileAudioIcon;
  if (VIDEO_EXTS.has(ext)) return FileVideoIcon;
  if (DATABASE_EXTS.has(ext)) return DatabaseIcon;
  return FileIcon;
}

export function getTreeFileIcon(entry: FileEntry, expanded: boolean) {
  if (entry.type === 'directory') return expanded ? FolderOpenIcon : FolderIcon;
  const ext = getExt(entry.name);
  const mimeType = entry.mimeType?.toLowerCase() || '';
  if (CODE_EXTS.has(ext) || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return FileCodeIcon;
  if (IMAGE_EXTS.has(ext) || mimeType.includes('image')) return FileImageIcon;
  if (ext === 'pdf' || mimeType.includes('pdf')) return FilePdfIcon;
  if (ARCHIVE_EXTS.has(ext) || mimeType.includes('zip') || mimeType.includes('archive')) return FileZipIcon;
  if (TEXT_EXTS.has(ext) || mimeType.includes('text') || mimeType.includes('markdown')) return FileTextIcon;
  return FileIcon;
}

export function getFileIconColor(entry: FileEntry): string {
  if (entry.type === 'directory') return 'var(--color-orange)';
  const ext = getExt(entry.name);
  if (CODE_EXTS.has(ext)) return 'var(--color-purple)';
  if (IMAGE_EXTS.has(ext)) return 'var(--color-green)';
  if (['txt', 'md', 'markdown', 'rst', 'log', 'pdf', 'doc', 'docx'].includes(ext)) return 'var(--color-blue)';
  if (['json', 'yaml', 'yml', 'xml', 'toml', 'cfg', 'conf', 'ini', 'csv'].includes(ext)) return 'var(--color-orange)';
  if (ARCHIVE_EXTS.has(ext)) return 'var(--color-yellow)';
  return 'var(--color-fg-2)';
}

export function getTreeFileIconColor(entry: FileEntry): string {
  if (entry.type === 'directory') return 'var(--color-orange)';
  const ext = getExt(entry.name);
  const mimeType = entry.mimeType?.toLowerCase() || '';
  if (CODE_EXTS.has(ext) || mimeType.includes('javascript') || mimeType.includes('typescript') || mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html') || mimeType.includes('css')) return 'var(--color-blue)';
  if (IMAGE_EXTS.has(ext) || mimeType.includes('image')) return 'var(--color-purple)';
  if (ext === 'pdf' || mimeType.includes('pdf') || mimeType.includes('text') || mimeType.includes('markdown') || ['txt', 'md', 'markdown', 'rst', 'log', 'csv'].includes(ext)) return 'var(--color-green)';
  if (ARCHIVE_EXTS.has(ext) || mimeType.includes('zip') || mimeType.includes('archive')) return 'var(--color-red)';
  return 'var(--color-fg-2)';
}

export function getListFileIcon(entry: FileEntry, _size: number) {
  if (entry.type === 'directory') {
    return { Icon: FolderSimpleIcon, color: 'var(--color-orange)', weight: 'fill' as const };
  }
  const ext = getExt(entry.name);
  const mimeType = entry.mimeType.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'rb', 'php', 'swift', 'kt'].includes(ext)) {
    return { Icon: FileCodeIcon, color: 'var(--color-blue)', weight: 'fill' as const };
  }
  if (['txt', 'md', 'json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'env'].includes(ext) || mimeType.startsWith('text/')) {
    return { Icon: FileTextIcon, color: 'var(--color-fg-2)', weight: 'fill' as const };
  }
  return { Icon: FileIcon, color: 'var(--color-fg-3)', weight: 'fill' as const };
}
