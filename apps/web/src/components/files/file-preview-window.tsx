'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { useUpdateFileContent, useRenderFile } from '@/hooks/use-queries';
import { useWorkspaceSlug } from '@/hooks/use-workspace-slug';
import { Window } from '@monokeros/ui';
import type { FileEntry } from '@monokeros/types';
import { getFileIcon, getFileIconColor } from '@/lib/file-icons';
import { formatFileSize } from '@monokeros/utils';
import { PencilSimpleIcon, FloppyDiskIcon, EyeIcon, CodeIcon } from '@phosphor-icons/react';
import { CodeEditor } from './code-editor';
import { EmptyState } from '@monokeros/ui';

interface Props {
  file: FileEntry;
  category: string;
  ownerId: string;
  onClose: () => void;
}

/** Map file extension to Prism language ID */
function getLanguageFromExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'javascript', tsx: 'javascript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', rs: 'rust', go: 'go', java: 'java',
    c: 'clike', cpp: 'clike', cs: 'clike', h: 'clike', hpp: 'clike',
    css: 'css', scss: 'css', html: 'markup', xml: 'markup', svg: 'markup',
    json: 'javascript', md: 'markdown', yml: 'yaml', yaml: 'yaml',
    sh: 'bash', bash: 'bash', zsh: 'bash',
    toml: 'toml', sql: 'sql', php: 'php', swift: 'swift', kt: 'kotlin',
  };
  return map[ext] ?? 'markup';
}

const PREVIEWABLE_EXTS = new Set(['md', 'markdown', 'html', 'htm', 'csv', 'tsv']);

export function FilePreviewWindow({ file, category, ownerId, onClose }: Props) {
  const slug = useWorkspaceSlug();
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const previewRef = useRef<HTMLDivElement>(null);

  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const isPreviewable = PREVIEWABLE_EXTS.has(ext);

  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.files.fileContent(category, ownerId, file.path), slug],
    queryFn: () => api.files.fileContent(slug, category, ownerId, file.path),
    enabled: !!slug,
  });

  const updateContent = useUpdateFileContent();
  const { data: renderData, isLoading: isRendering } = useRenderFile(
    data?.content,
    file.name,
    viewMode === 'preview' && isPreviewable,
  );

  const FileIcon = getFileIcon(file);
  const iconColor = getFileIconColor(file);
  const language = getLanguageFromExt(file.name);

  function handleToggleEdit() {
    if (!editMode && data?.content) {
      setEditContent(data.content);
    }
    setEditMode(!editMode);
    if (!editMode) setViewMode('code');
  }

  function handleSave() {
    updateContent.mutate(
      { category, ownerId, path: file.path, body: { content: editContent } },
      { onSuccess: () => setEditMode(false) },
    );
  }

  function handleTogglePreview() {
    setViewMode((m) => (m === 'code' ? 'preview' : 'code'));
    if (editMode) setEditMode(false);
  }

  const title = `${file.name}${file.size > 0 ? ` (${formatFileSize(file.size)})` : ''}`;

  return (
    <Window
      id={`file-preview-${file.path}`}
      title={title}
      icon={<FileIcon size={14} weight="regular" color={iconColor} />}
      open={true}
      onClose={onClose}
      width={700}
      height={500}
      minWidth={400}
      minHeight={300}
    >
      <div className="flex h-full flex-col">
        {/* Action toolbar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-edge bg-surface px-3 py-1.5">
          {isPreviewable && (
            <button
              onClick={handleTogglePreview}
              className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-surface-3 ${
                viewMode === 'preview' ? 'text-blue' : 'text-fg-2'
              }`}
              title={viewMode === 'preview' ? 'Show Code' : 'Preview'}
            >
              {viewMode === 'preview' ? <CodeIcon size={14} /> : <EyeIcon size={14} />}
              <span>{viewMode === 'preview' ? 'Code' : 'Preview'}</span>
            </button>
          )}
          <div className="flex-1" />
          {editMode && (
            <button
              onClick={handleSave}
              disabled={updateContent.isPending}
              className="flex items-center gap-1 px-2 py-1 text-xs text-green rounded hover:bg-surface-3 disabled:opacity-50"
            >
              <FloppyDiskIcon size={14} />
              <span>Save</span>
            </button>
          )}
          <button
            onClick={handleToggleEdit}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-surface-3 ${
              editMode ? 'text-blue' : 'text-fg-2'
            }`}
          >
            <PencilSimpleIcon size={14} />
            <span>{editMode ? 'Cancel' : 'Edit'}</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-xs text-fg-3">Loading...</div>
          ) : data?.content != null ? (
            viewMode === 'preview' && isPreviewable ? (
              <div ref={previewRef} className="h-full overflow-auto p-4">
                {isRendering ? (
                  <div className="text-xs text-fg-3">Rendering...</div>
                ) : renderData?.html ? (
                  <div
                    className="rendered-markdown"
                    dangerouslySetInnerHTML={{ __html: renderData.html }}
                  />
                ) : (
                  <EmptyState>No preview available</EmptyState>
                )}
              </div>
            ) : (
              <CodeEditor
                code={editMode ? editContent : data.content}
                language={language}
                readOnly={!editMode}
                onChange={editMode ? setEditContent : undefined}
              />
            )
          ) : (
            <EmptyState>No preview available for {file.mimeType}</EmptyState>
          )}
        </div>
      </div>
    </Window>
  );
}
