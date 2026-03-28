"use client";

import {
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
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import type { MessageAttachment } from "@monokeros/types";
import {
  formatFileSize,
  getExt,
  CODE_EXTS,
  TEXT_EXTS,
  IMAGE_EXTS,
  SPREADSHEET_EXTS,
  DOC_EXTS,
  ARCHIVE_EXTS,
  AUDIO_EXTS,
  VIDEO_EXTS,
} from "@monokeros/utils";

function getAttachmentIcon(fileName: string) {
  const ext = getExt(fileName);
  if (CODE_EXTS.has(ext)) return FileCodeIcon;
  if (TEXT_EXTS.has(ext)) return FileTextIcon;
  if (IMAGE_EXTS.has(ext)) return FileImageIcon;
  if (ext === "pdf") return FilePdfIcon;
  if (SPREADSHEET_EXTS.has(ext)) return FileXlsIcon;
  if (DOC_EXTS.has(ext)) return FileDocIcon;
  if (ARCHIVE_EXTS.has(ext)) return FileZipIcon;
  if (AUDIO_EXTS.has(ext)) return FileAudioIcon;
  if (VIDEO_EXTS.has(ext)) return FileVideoIcon;
  return FileIcon;
}

interface Props {
  attachment: MessageAttachment;
  onPreview?: (attachment: MessageAttachment) => void;
}

export function AttachmentPreview({ attachment, onPreview }: Props) {
  const Icon = getAttachmentIcon(attachment.fileName);

  return (
    <button
      onClick={() => onPreview?.(attachment)}
      className="mt-1.5 flex items-center gap-2 rounded-sm border border-edge bg-surface-2 px-2.5 py-1.5 text-left transition-colors hover:bg-surface-3"
    >
      <Icon size={16} weight="regular" className="shrink-0 text-fg-2" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-fg">{attachment.fileName}</div>
        <div className="text-[10px] text-fg-3">{formatFileSize(attachment.fileSize)}</div>
      </div>
      <DownloadSimpleIcon size={14} className="shrink-0 text-fg-3" />
    </button>
  );
}
