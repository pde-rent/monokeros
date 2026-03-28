"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Panel, Group } from "react-resizable-panels";
import {
  useDrives,
  useTeamDrive,
  useMemberDrive,
  useProjectDrive,
  useWorkspaceDrive,
  useCreateFile,
  useCreateFolder,
  useDeleteItem,
} from "@/hooks/use-queries";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { DriveSidebar } from "./drive-sidebar";
import { FileTree } from "./file-tree";
import { FileGridView } from "./file-grid-view";
import { FileListView } from "./file-list-view";
import { FilePreview } from "./file-preview";
import { CreateDialog } from "./create-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { FileContextMenu } from "./file-context-menu";
import { DriveContextMenu } from "./drive-context-menu";
import { FilePlusIcon, FolderPlusIcon } from "@phosphor-icons/react";
import { useRegisterFab } from "@/components/shared/fab-context";
import { EmptyState } from "@monokeros/ui";
import type { FileEntry } from "@monokeros/types";
import {
  CollapsibleSidePanel,
  useCollapsiblePanel,
  PANEL_CONSTANTS,
} from "@/components/layout/collapsible-panel";
import { usePopoutPortal } from "@/components/common/popout-portal";
import { ResizeHandle } from "@/components/layout/resizable-layout";

export type FilesViewMode = "tree" | "grid" | "list";

export interface DriveSelection {
  category: "team" | "member" | "project" | "workspace";
  id: string;
}

interface FilesPageProps {
  viewMode: FilesViewMode;
  /** Hide popout button when already in a popout */
  isPopout?: boolean;
}

/** Recursively search for a file entry by ID */
function findFileById(entries: FileEntry[], fileId: string): FileEntry | null {
  for (const entry of entries) {
    if (entry.id === fileId) return entry;
    if (entry.children) {
      const found = findFileById(entry.children, fileId);
      if (found) return found;
    }
  }
  return null;
}

export function FilesPage({ viewMode, isPopout }: FilesPageProps) {
  const router = useRouter();
  const { workspace: slug } = useParams<{ workspace: string }>();
  const searchParams = useSearchParams();
  const wid = useWorkspaceId();
  const { data: listing } = useDrives();
  const [active, setActive] = useState<DriveSelection | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [createMode, setCreateMode] = useState<"file" | "folder" | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    entry: FileEntry | null;
    inPopout?: boolean;
  } | null>(null);
  const [driveContextMenu, setDriveContextMenu] = useState<{
    x: number;
    y: number;
    drive: DriveSelection;
    name: string;
    inPopout?: boolean;
  } | null>(null);
  const [clipboard, setClipboard] = useState<FileEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const browserPopout = usePopoutPortal({ width: 900, height: 700 });

  const drivesPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);

  const createFile = useCreateFile();
  const createFolder = useCreateFolder();
  const deleteItem = useDeleteItem();

  const teamDrives = listing?.teamDrives ?? [];
  const memberDrives = listing?.memberDrives ?? [];
  const projectDrives = listing?.projectDrives ?? [];
  const workspaceDrive = listing?.workspaceDrive ?? null;

  // Fetch files for the active drive
  const activeTeamId = active?.category === "team" ? active.id : null;
  const activeMemberId = active?.category === "member" ? active.id : null;
  const activeProjectId = active?.category === "project" ? active.id : null;
  const { data: teamFiles } = useTeamDrive(activeTeamId);
  const { data: memberFiles } = useMemberDrive(activeMemberId);
  const { data: projectFiles } = useProjectDrive(activeProjectId);
  const { data: wsFiles } = useWorkspaceDrive();

  const activeFiles = useMemo(() => {
    if (!active) return [];
    switch (active.category) {
      case "team":
        return (teamFiles ?? []) as FileEntry[];
      case "member":
        return (memberFiles ?? []) as FileEntry[];
      case "project":
        return (projectFiles ?? []) as FileEntry[];
      case "workspace":
        return (wsFiles ?? []) as FileEntry[];
      default:
        return [];
    }
  }, [active, teamFiles, memberFiles, projectFiles, wsFiles]);

  const apiCategory = (() => {
    switch (active?.category) {
      case "team":
        return "teams" as const;
      case "member":
        return "members" as const;
      case "project":
        return "projects" as const;
      case "workspace":
        return "workspace" as const;
      default:
        return "members" as const;
    }
  })();
  const ownerId = active?.category === "workspace" ? "shared" : (active?.id ?? "");

  // Auto-select first drive
  useEffect(() => {
    if (!active && listing) {
      if (teamDrives.length > 0) {
        setActive({ category: "team", id: teamDrives[0].teamId });
      } else if (memberDrives.length > 0) {
        setActive({ category: "member", id: memberDrives[0].memberId });
      }
    }
  }, [active, listing, teamDrives, memberDrives]);

  // Deep-link: auto-select drive + file from ?fileId= query param
  useEffect(() => {
    const fileId = searchParams.get("fileId");
    if (!fileId) return;
    // Deep-link into active files if we have them
    if (activeFiles.length > 0) {
      const file = findFileById(activeFiles, fileId);
      if (file) {
        setSelectedFile(file);
        return;
      }
    }
  }, [searchParams, activeFiles]);

  // Clear selected file when workspace changes
  useEffect(() => {
    setSelectedFile(null);
  }, [active?.category, active?.id]);

  // File selection handler — sets selected file for inline preview
  function handleFileSelect(file: FileEntry) {
    setSelectedFile(file);
  }

  useRegisterFab(() => {
    if (!active) return null;
    return {
      actions: [
        { id: "new-file", label: "New File", icon: FilePlusIcon, onClick: () => setCreateMode("file") },
        { id: "new-folder", label: "New Folder", icon: FolderPlusIcon, onClick: () => setCreateMode("folder") },
      ],
      tooltip: "Create new...",
    };
  }, [active]);

  function handleViewModeChange(mode: FilesViewMode) {
    router.push(`/${slug}/files/${mode}`);
  }

  function handleContextMenu(e: React.MouseEvent, entry: FileEntry | null, inPopout = false) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry, inPopout });
  }

  function handleDriveContextMenu(
    e: React.MouseEvent,
    drive: DriveSelection,
    name: string,
    inPopout = false,
  ) {
    e.preventDefault();
    setDriveContextMenu({ x: e.clientX, y: e.clientY, drive, name, inPopout });
  }

  function handleDriveAskAbout(drive: DriveSelection) {
    const ref =
      drive.category === "team"
        ? `team:${drive.id}`
        : drive.category === "member"
          ? `member:${drive.id}`
          : drive.category === "project"
            ? `project:${drive.id}`
            : "workspace";
    router.push(`/${slug}/chat?ref=${encodeURIComponent(ref)}`);
    setDriveContextMenu(null);
  }

  function handleCopy(entry: FileEntry) {
    if (entry.type === "file") {
      setClipboard(entry);
    }
    setContextMenu(null);
  }

  function handlePaste() {
    // Placeholder - would read clipboard file content and create "Copy of {name}"
    setContextMenu(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget || !active || !wid) return;
    deleteItem.mutate({
      workspaceId: wid,
      fileId: deleteTarget.id as any,
    } as any);
    if (selectedFile?.path === deleteTarget.path) {
      setSelectedFile(null);
    }
    setDeleteTarget(null);
  }

  function handleAskAbout(entry: FileEntry) {
    router.push(`/${slug}/chat?ref=file&path=${encodeURIComponent(entry.path)}`);
    setContextMenu(null);
  }

  function handleCreateSubmit(name: string, extension?: string) {
    if (!active || !wid) return;
    const dir = selectedFile?.type === "directory" ? selectedFile.path : "/";
    const fileName = extension ? `${name}.${extension}` : name;
    const path = dir === "/" ? fileName : `${dir}/${fileName}`;

    if (createMode === "file") {
      createFile.mutate({
        workspaceId: wid,
        driveType: apiCategory,
        driveOwnerId: ownerId,
        name: fileName,
        path,
      } as any);
    } else if (createMode === "folder") {
      createFolder.mutate({
        workspaceId: wid,
        driveType: apiCategory,
        driveOwnerId: ownerId,
        name,
        path,
      } as any);
    }
    setCreateMode(null);
  }

  function handleOpenBrowserPopout() {
    browserPopout.open(
      <div className="h-full w-full overflow-hidden bg-surface">
        <FilesPage viewMode={viewMode} isPopout />
      </div>,
    );
  }

  function renderContextMenus(forPopout: boolean) {
    return (
      <>
        {contextMenu && !!contextMenu.inPopout === forPopout && (
          <FileContextMenu
            position={{ x: contextMenu.x, y: contextMenu.y }}
            entry={contextMenu.entry}
            clipboard={clipboard}
            onClose={() => setContextMenu(null)}
            onNewFile={() => {
              setCreateMode("file");
              setContextMenu(null);
            }}
            onNewFolder={() => {
              setCreateMode("folder");
              setContextMenu(null);
            }}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onDelete={(entry) => {
              setDeleteTarget(entry);
              setContextMenu(null);
            }}
            onAskAbout={handleAskAbout}
          />
        )}
        {driveContextMenu && !!driveContextMenu.inPopout === forPopout && (
          <DriveContextMenu
            position={{ x: driveContextMenu.x, y: driveContextMenu.y }}
            drive={driveContextMenu.drive}
            driveName={driveContextMenu.name}
            onClose={() => setDriveContextMenu(null)}
            onAskAbout={handleDriveAskAbout}
            onBrowse={(drive) => {
              setActive(drive);
              setDriveContextMenu(null);
            }}
          />
        )}
      </>
    );
  }

  function renderDialogs() {
    return (
      <>
        {createMode && (
          <CreateDialog
            mode={createMode}
            onSubmit={handleCreateSubmit}
            onClose={() => setCreateMode(null)}
          />
        )}
        {deleteTarget && (
          <ConfirmDialog
            title="Delete Item"
            message={`Are you sure you want to delete "${deleteTarget.name}"? ${deleteTarget.type === "directory" ? "All contents will be removed." : "This cannot be undone."}`}
            confirmLabel="Delete"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </>
    );
  }

  // Tree view has 2 panels: sidebar + tree (preview opens in popup window)
  if (viewMode === "tree") {
    return (
      <>
        <Group orientation="horizontal" className="h-full">
          <CollapsibleSidePanel id="drives" title="Drives" side="left" panel={drivesPanel}>
            <DriveSidebar
              teamDrives={teamDrives}
              memberDrives={memberDrives}
              projectDrives={projectDrives}
              workspaceDrive={workspaceDrive}
              active={active}
              onSelect={setActive}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onPopout={isPopout ? undefined : handleOpenBrowserPopout}
              onContextMenu={handleDriveContextMenu}
            />
          </CollapsibleSidePanel>
          <ResizeHandle />
          <Panel
            id="tree"
            defaultSize="260px"
            minSize="180px"
            maxSize="450px"
            className="overflow-hidden bg-surface"
          >
            <div
              className="h-full overflow-y-auto"
              onContextMenu={(e) => handleContextMenu(e, null)}
            >
              {activeFiles.length > 0 ? (
                <FileTree
                  files={activeFiles}
                  selectedPath={selectedFile?.path ?? null}
                  onSelect={handleFileSelect}
                  onContextMenu={handleContextMenu}
                />
              ) : (
                <EmptyState>Select a drive</EmptyState>
              )}
            </div>
          </Panel>
          <ResizeHandle />
          <Panel id="content" minSize="300px" className="overflow-hidden">
            {selectedFile?.type === "file" ? (
              <FilePreview file={selectedFile} category={apiCategory} ownerId={ownerId} />
            ) : active ? (
              <EmptyState>Select a file to preview</EmptyState>
            ) : (
              <EmptyState>Select a drive to browse files</EmptyState>
            )}
          </Panel>
        </Group>

        {/* Popouts & Dialogs (shared across view modes) */}
        {renderContextMenus(false)}
        {renderDialogs()}
      </>
    );
  }

  // Grid/List view has 3 panels: drives + file list + preview
  const previewPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH, true);

  return (
    <>
      <Group orientation="horizontal" className="h-full">
        <CollapsibleSidePanel id="drives" title="Drives" side="left" panel={drivesPanel}>
          <DriveSidebar
            teamDrives={teamDrives}
            memberDrives={memberDrives}
            projectDrives={projectDrives}
            workspaceDrive={workspaceDrive}
            active={active}
            onSelect={setActive}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onPopout={isPopout ? undefined : handleOpenBrowserPopout}
          />
        </CollapsibleSidePanel>
        <ResizeHandle />
        <Panel id="content" minSize="300px" className="overflow-hidden bg-canvas">
          {viewMode === "grid" ? (
            active ? (
              <FileGridView
                files={activeFiles}
                selectedPath={selectedFile?.path ?? null}
                onSelect={handleFileSelect}
                category={apiCategory}
                ownerId={ownerId}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <EmptyState>Select a drive to browse files</EmptyState>
            )
          ) : active ? (
            <FileListView
              files={activeFiles}
              selectedPath={selectedFile?.path ?? null}
              onSelect={handleFileSelect}
              onContextMenu={handleContextMenu}
            />
          ) : (
            <EmptyState>Select a drive to browse files</EmptyState>
          )}
        </Panel>
        <ResizeHandle />
        <CollapsibleSidePanel id="preview" title="Preview" side="right" panel={previewPanel}>
          {selectedFile?.type === "file" ? (
            <FilePreview file={selectedFile} category={apiCategory} ownerId={ownerId} />
          ) : (
            <EmptyState>Select a file to preview</EmptyState>
          )}
        </CollapsibleSidePanel>
      </Group>

      {renderContextMenus(false)}
      {renderDialogs()}
    </>
  );
}
