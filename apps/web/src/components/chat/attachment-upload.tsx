'use client';

import { useRef, useState, useCallback } from 'react';
import { PaperclipIcon, XIcon, CloudArrowUpIcon } from '@phosphor-icons/react';
import { formatFileSize } from '@monokeros/utils';
import { useDragDrop } from '@/hooks/use-drag-drop';

interface PendingFile {
  file: File;
  id: string;
}

interface Props {
  onFilesSelected: (files: File[]) => void;
  pendingFiles: PendingFile[];
  onRemoveFile: (id: string) => void;
  uploading?: boolean;
}

export function AttachmentUpload({ onFilesSelected, pendingFiles, onRemoveFile, uploading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { dragOver, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(onFilesSelected);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length) onFilesSelected(files);
      e.target.value = '';
    },
    [onFilesSelected],
  );

  return (
    <div>
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Paperclip trigger button */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center text-fg-2 hover:text-fg transition-colors"
        title="Attach files"
      >
        <PaperclipIcon size={18} />
      </button>

      {/* Drop zone overlay (when dragging) */}
      {dragOver && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80"
        >
          <div className="flex flex-col items-center gap-2 rounded-md border-2 border-dashed border-blue bg-surface-2 px-12 py-8">
            <CloudArrowUpIcon size={32} className="text-blue" />
            <span className="text-sm font-medium text-fg">Drop files here</span>
          </div>
        </div>
      )}

      {/* Pending files strip */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {pendingFiles.map((pf) => (
            <div
              key={pf.id}
              className="flex items-center gap-1.5 rounded-sm border border-edge bg-surface-2 px-2 py-1 text-xs"
            >
              <span className="truncate max-w-[140px] text-fg">{pf.file.name}</span>
              <span className="text-xs text-fg-3">{formatFileSize(pf.file.size)}</span>
              {!uploading && (
                <button
                  type="button"
                  onClick={() => onRemoveFile(pf.id)}
                  className="text-fg-3 hover:text-red"
                >
                  <XIcon size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Hook to manage pending file list state */
export function usePendingFiles() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  let counter = 0;

  const addFiles = useCallback((files: File[]) => {
    const newPending = files.map((file) => ({
      file,
      id: `pending_${Date.now()}_${counter++}`,
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setPendingFiles([]), []);

  return { pendingFiles, addFiles, removeFile, clear };
}
