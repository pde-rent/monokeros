"use client";

import { useRef, useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { useUpdateFileContent, useRenderFile } from "@/hooks/use-queries";
import { useWorkspaceId } from "@/hooks/use-workspace";
import type { FileEntry } from "@monokeros/types";
import { getFileIcon, getFileIconColor } from "@/lib/file-icons";
import { formatFileSize } from "@monokeros/utils";
import { PencilSimpleIcon, FloppyDiskIcon, EyeIcon, CodeIcon } from "@phosphor-icons/react";
import { CodeEditor } from "./code-editor";
import { EmptyState } from "@monokeros/ui";

interface Props {
  file: FileEntry;
  category: string;
  ownerId: string;
}

/** Map file extension to Prism language ID */
function getLanguageFromExt(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "javascript",
    tsx: "javascript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    rs: "rust",
    go: "go",
    java: "java",
    c: "clike",
    cpp: "clike",
    cs: "clike",
    h: "clike",
    hpp: "clike",
    css: "css",
    scss: "css",
    html: "markup",
    xml: "markup",
    svg: "markup",
    json: "javascript",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    toml: "toml",
    sql: "sql",
    php: "php",
    swift: "swift",
    kt: "kotlin",
  };
  return map[ext] ?? "markup";
}

const PREVIEWABLE_EXTS = new Set(["md", "markdown", "html", "htm", "csv", "tsv"]);

export function FilePreview({ file, category, ownerId }: Props) {
  const wid = useWorkspaceId();
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [viewMode, setViewMode] = useState<"code" | "preview">("code");
  const previewRef = useRef<HTMLDivElement>(null);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const isPreviewable = PREVIEWABLE_EXTS.has(ext);

  const contentResult = useConvexQuery(
    convexApi.files.getContent,
    wid
      ? { workspaceId: wid, driveType: category, driveOwnerId: ownerId, path: file.path }
      : "skip",
  );
  const textContent =
    contentResult?.textContent ?? (typeof contentResult === "string" ? contentResult : undefined);
  const data = textContent !== undefined ? { content: textContent } : undefined;
  const fileId = contentResult?._id;
  const isLoading = contentResult === undefined && !!wid;

  const updateContent = useUpdateFileContent();
  const { data: renderData, isLoading: isRendering } = useRenderFile(
    data?.content as string | undefined,
    file.name,
    viewMode === "preview" && isPreviewable,
  );

  const FileIcon = getFileIcon(file);
  const iconColor = getFileIconColor(file);
  const language = getLanguageFromExt(file.name);

  function handleToggleEdit() {
    if (!editMode && data?.content) {
      setEditContent(data.content);
    }
    setEditMode(!editMode);
    if (!editMode) setViewMode("code");
  }

  function handleSave() {
    if (!wid || !fileId) return;
    updateContent.mutate({ workspaceId: wid, fileId, content: editContent } as any, {
      onSuccess: () => setEditMode(false),
    });
  }

  function handleTogglePreview() {
    setViewMode((m) => (m === "code" ? "preview" : "code"));
    if (editMode) setEditMode(false);
  }

  return (
    <div className="flex h-full flex-col">
      {/* File header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-edge bg-surface px-4 py-2">
        <FileIcon size={16} weight="regular" color={iconColor} className="shrink-0" />
        <span className="text-xs font-medium text-fg">{file.name}</span>
        {file.size > 0 && (
          <span className="text-[10px] text-fg-3">{formatFileSize(file.size)}</span>
        )}

        <div className="ml-auto flex items-center gap-1">
          {isPreviewable && (
            <button
              onClick={handleTogglePreview}
              className={`flex items-center justify-center w-7 h-7 hover:bg-surface-3 ${
                viewMode === "preview" ? "text-blue" : "text-fg-2"
              }`}
              title={viewMode === "preview" ? "Show Code" : "Preview"}
              aria-label={viewMode === "preview" ? "Show Code" : "Preview"}
            >
              {viewMode === "preview" ? <CodeIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          )}
          {editMode && (
            <button
              onClick={handleSave}
              disabled={updateContent.isPending}
              className="flex items-center justify-center w-7 h-7 text-green hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed"
              title={updateContent.isPending ? "Saving..." : "Save"}
              aria-label="Save"
            >
              <FloppyDiskIcon size={16} />
            </button>
          )}
          <button
            onClick={handleToggleEdit}
            className={`flex items-center justify-center w-7 h-7 hover:bg-surface-3 ${
              editMode ? "text-blue" : "text-fg-2"
            }`}
            title={editMode ? "Cancel Edit" : "Edit"}
            aria-label={editMode ? "Cancel Edit" : "Edit"}
          >
            <PencilSimpleIcon size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <EmptyState>Loading...</EmptyState>
        ) : data?.content !== null && data?.content !== undefined ? (
          viewMode === "preview" && isPreviewable ? (
            <div ref={previewRef} className="h-full overflow-auto p-4">
              {isRendering ? (
                <EmptyState>Rendering...</EmptyState>
              ) : renderData?.html ? (
                <div
                  className="rendered-markdown"
                  dangerouslySetInnerHTML={{ __html: renderData.html }}
                />
              ) : (
                <EmptyState>Empty file</EmptyState>
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
          <EmptyState>Empty file</EmptyState>
        )}
      </div>
    </div>
  );
}
