'use client';

import { FileIcon } from '@phosphor-icons/react';
import { Window, EmptyState } from '@monokeros/ui';
import type { MessageAttachment } from '@monokeros/types';
import { formatFileSize, isPreviewable, getExt } from '@monokeros/utils';

interface Props {
  attachment: MessageAttachment;
  onClose: () => void;
}

export function FilePreviewModal({ attachment, onClose }: Props) {
  const ext = getExt(attachment.fileName);
  const canPreview = isPreviewable(ext);

  return (
    <Window
      open={true}
      onClose={onClose}
      title={`${attachment.fileName} (${formatFileSize(attachment.fileSize)})`}
      icon={<FileIcon size={14} weight="regular" />}
      width={700}
      height={500}
      minWidth={400}
      minHeight={300}
    >
      <div className="flex h-full items-center justify-center overflow-auto p-4">
        {canPreview ? (
          <div className="h-full w-full overflow-auto rounded-sm border border-edge bg-surface-2 p-4">
            <pre className="font-mono text-xs text-fg whitespace-pre-wrap break-words">
              {/* Content would be fetched from the API; placeholder for mock */}
              File preview for .{ext} files would load content from the attachment storage path.
            </pre>
          </div>
        ) : (
          <EmptyState>No preview available for .{ext} files</EmptyState>
        )}
      </div>
    </Window>
  );
}
