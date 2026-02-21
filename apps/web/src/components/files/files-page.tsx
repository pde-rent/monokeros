'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { useDrives, useCreateFile, useCreateFolder, useDeleteItem } from '@/hooks/use-queries';
import { DriveSidebar } from './drive-sidebar';
import { FileTree } from './file-tree';
import { FileGridView } from './file-grid-view';
import { FileListView } from './file-list-view';
import { FilePreview } from './file-preview';
import { CreateDialog } from './create-dialog';
import { ConfirmDialog } from './confirm-dialog';
import { FileContextMenu } from './file-context-menu';
import { DriveContextMenu } from './drive-context-menu';
import { FilePlusIcon, FolderPlusIcon } from '@phosphor-icons/react';
import { SYSTEM_FILES } from '@monokeros/constants';
import { useRegisterFab, type FabAction } from '@/components/shared/fab-context';
import { EmptyState } from '@monokeros/ui';
import type { FileEntry } from '@monokeros/types';
import { CollapsiblePanel, useCollapsiblePanel, PANEL_CONSTANTS } from '@/components/layout/collapsible-panel';
import { usePopoutPortal } from '@/components/common/popout-portal';

export type FilesViewMode = 'tree' | 'grid' | 'list';

export interface DriveSelection {
  category: 'team' | 'member' | 'project' | 'workspace';
  id: string;
}

interface FilesPageProps {
  viewMode: FilesViewMode;
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

function ResizeHandle() {
  return (
    <Separator className="group relative flex items-center justify-center w-px bg-edge hover:bg-blue transition-colors">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
    </Separator>
  );
}

export function FilesPage({ viewMode }: FilesPageProps) {
  const router = useRouter();
  const { workspace: slug } = useParams<{ workspace: string }>();
  const searchParams = useSearchParams();
  const { data: listing } = useDrives();
  const [active, setActive] = useState<DriveSelection | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileEntry | null>(null);
  const [createMode, setCreateMode] = useState<'file' | 'folder' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; entry: FileEntry | null; inPopout?: boolean } | null>(null);
  const [driveContextMenu, setDriveContextMenu] = useState<{ x: number; y: number; drive: DriveSelection; name: string; inPopout?: boolean } | null>(null);
  const [clipboard, setClipboard] = useState<FileEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileEntry | null>(null);
  const browserPopout = usePopoutPortal({ width: 900, height: 700 });
  const previewPopout = usePopoutPortal({ width: 700, height: 500 });

  const drivesPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);

  const createFile = useCreateFile();
  const createFolder = useCreateFolder();
  const deleteItem = useDeleteItem();

  const teamDrives = listing?.teamDrives ?? [];
  const memberDrives = listing?.memberDrives ?? [];
  const projectDrives = listing?.projectDrives ?? [];
  const workspaceDrive = listing?.workspaceDrive ?? null;

  const activeFiles = useMemo(() => {
    if (!active) return [];
    switch (active.category) {
      case 'team':
        return teamDrives.find((w) => w.teamId === active.id)?.files ?? [];
      case 'member':
        return memberDrives.find((w) => w.memberId === active.id)?.files ?? [];
      case 'project':
        return projectDrives.find((w) => w.projectId === active.id)?.files ?? [];
      case 'workspace':
        return workspaceDrive?.files ?? [];
      default:
        return [];
    }
  }, [active, teamDrives, memberDrives, projectDrives, workspaceDrive]);

  const apiCategory = (() => {
    switch (active?.category) {
      case 'team': return 'teams' as const;
      case 'member': return 'members' as const;
      case 'project': return 'projects' as const;
      case 'workspace': return 'workspace' as const;
      default: return 'members' as const;
    }
  })();
  const ownerId = active?.category === 'workspace' ? 'shared' : (active?.id ?? '');

  // Auto-select first drive
  useEffect(() => {
    if (!active && listing) {
      if (teamDrives.length > 0) {
        setActive({ category: 'team', id: teamDrives[0].teamId });
      } else if (memberDrives.length > 0) {
        setActive({ category: 'member', id: memberDrives[0].memberId });
      }
    }
  }, [active, listing, teamDrives, memberDrives]);

  // Deep-link: auto-select drive + file from ?fileId= query param
  useEffect(() => {
    const fileId = searchParams.get('fileId');
    if (!fileId || !listing) return;

    for (const d of listing.teamDrives) {
      const file = findFileById(d.files, fileId);
      if (file) { setActive({ category: 'team', id: d.teamId }); setSelectedFile(file); return; }
    }
    for (const d of listing.memberDrives) {
      const file = findFileById(d.files, fileId);
      if (file) { setActive({ category: 'member', id: d.memberId }); setSelectedFile(file); return; }
    }
    for (const d of listing.projectDrives) {
      const file = findFileById(d.files, fileId);
      if (file) { setActive({ category: 'project', id: d.projectId }); setSelectedFile(file); return; }
    }
    if (listing.workspaceDrive) {
      const file = findFileById(listing.workspaceDrive.files, fileId);
      if (file) { setActive({ category: 'workspace', id: 'shared' }); setSelectedFile(file); return; }
    }
  }, [searchParams, listing]);

  // Clear selected file when workspace changes
  useEffect(() => {
    setSelectedFile(null);
    previewPopout.close();
  }, [active?.category, active?.id]);

  // File selection handler — opens preview popout directly from user click
  function handleFileSelect(file: FileEntry) {
    setSelectedFile(file);
    if (file.type === 'file') {
      previewPopout.open();
    }
  }

  const fabConfig = useMemo(() => {
    if (!active) return null;
    return {
      actions: [
        { id: 'new-file', label: 'New File', icon: FilePlusIcon, onClick: () => setCreateMode('file') },
        { id: 'new-folder', label: 'New Folder', icon: FolderPlusIcon, onClick: () => setCreateMode('folder') },
      ] as FabAction[],
      tooltip: 'Create new...',
    };
  }, [active]);
  useRegisterFab(fabConfig);

  function handleViewModeChange(mode: FilesViewMode) {
    router.push(`/${slug}/files/${mode}`);
  }

  function handleContextMenu(e: React.MouseEvent, entry: FileEntry | null, inPopout = false) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, entry, inPopout });
  }

  function handleDriveContextMenu(e: React.MouseEvent, drive: DriveSelection, name: string, inPopout = false) {
    e.preventDefault();
    setDriveContextMenu({ x: e.clientX, y: e.clientY, drive, name, inPopout });
  }

  function handleDriveAskAbout(drive: DriveSelection) {
    const ref = drive.category === 'team' ? `team:${drive.id}`
      : drive.category === 'member' ? `member:${drive.id}`
      : drive.category === 'project' ? `project:${drive.id}`
      : 'workspace';
    router.push(`/${slug}/chat?ref=${encodeURIComponent(ref)}`);
    setDriveContextMenu(null);
  }

  function handleCopy(entry: FileEntry) {
    if (entry.type === 'file') {
      setClipboard(entry);
    }
    setContextMenu(null);
  }

  function handlePaste() {
    // Placeholder - would read clipboard file content and create "Copy of {name}"
    setContextMenu(null);
  }

  function handleDeleteConfirm() {
    if (!deleteTarget || !active) return;
    deleteItem.mutate({
      category: apiCategory,
      ownerId,
      path: deleteTarget.path,
    });
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
    if (!active) return;
    const dir = selectedFile?.type === 'directory' ? selectedFile.path : '/';

    if (createMode === 'file') {
      createFile.mutate({ category: apiCategory, ownerId, dir, body: { name, extension } });
    } else if (createMode === 'folder') {
      createFolder.mutate({ category: apiCategory, ownerId, dir, body: { name } });
    }
    setCreateMode(null);
  }

  // Shared render helpers — used by both tree and grid/list branches
  function renderPopouts() {
    return (
      <>
        {/* File preview PiP popout */}
        {previewPopout.isOpen && selectedFile?.type === 'file' && previewPopout.render(
          <div className="h-full w-full overflow-hidden bg-surface">
            <FilePreview file={selectedFile} category={apiCategory} ownerId={ownerId} />
          </div>
        )}

        {/* Full file explorer popout (OS-style: sidebar + tree + preview) */}
        {browserPopout.isOpen && browserPopout.render(
          <div className="relative flex h-full w-full overflow-hidden bg-canvas">
            <div className="w-[220px] shrink-0 overflow-y-auto border-r border-edge bg-surface">
              <DriveSidebar
                teamDrives={teamDrives}
                memberDrives={memberDrives}
                projectDrives={projectDrives}
                workspaceDrive={workspaceDrive}
                active={active}
                onSelect={setActive}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onContextMenu={(e, drive, name) => handleDriveContextMenu(e, drive, name, true)}
              />
            </div>
            <div className="w-[260px] shrink-0 overflow-y-auto border-r border-edge bg-surface">
              {activeFiles.length > 0 ? (
                <FileTree
                  files={activeFiles}
                  selectedPath={selectedFile?.path ?? null}
                  onSelect={setSelectedFile}
                  onContextMenu={(e, entry) => handleContextMenu(e, entry, true)}
                />
              ) : (
                <EmptyState className="p-3 text-xs text-fg-3">Select a drive</EmptyState>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {selectedFile?.type === 'file' ? (
                <FilePreview file={selectedFile} category={apiCategory} ownerId={ownerId} />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-fg-3">
                  Select a file to preview
                </div>
              )}
            </div>
            {renderContextMenus(true)}
          </div>
        )}
      </>
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
            onNewFile={() => { setCreateMode('file'); setContextMenu(null); }}
            onNewFolder={() => { setCreateMode('folder'); setContextMenu(null); }}
            onCopy={handleCopy}
            onPaste={handlePaste}
            onDelete={(entry) => { setDeleteTarget(entry); setContextMenu(null); }}
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
            onBrowse={(drive) => { setActive(drive); setDriveContextMenu(null); }}
          />
        )}
      </>
    );
  }

  function renderDialogs() {
    return (
      <>
        {createMode && (
          <CreateDialog mode={createMode} onSubmit={handleCreateSubmit} onClose={() => setCreateMode(null)} />
        )}
        {deleteTarget && (
          <ConfirmDialog
            title="Delete Item"
            message={`Are you sure you want to delete "${deleteTarget.name}"? ${deleteTarget.type === 'directory' ? 'All contents will be removed.' : 'This cannot be undone.'}`}
            confirmLabel="Delete"
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </>
    );
  }

  // Tree view has 2 panels: sidebar + tree (preview opens in popup window)
  if (viewMode === 'tree') {
    return (
      <>
        <Group orientation="horizontal" className="h-full">
          <Panel
            id="drives"
            defaultSize={`${PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH}px`}
            minSize={`${PANEL_CONSTANTS.NOTCH_WIDTH}px`}
            maxSize={`${PANEL_CONSTANTS.MAX_EXPANDED_WIDTH}px`}
            className="overflow-hidden"
            panelRef={(ref) => { drivesPanel.ref.current = ref; }}
          >
            <CollapsiblePanel
              title="Drives"
              side="left"
              collapsed={drivesPanel.collapsed}
              onToggleCollapse={drivesPanel.toggleCollapse}
            >
              <DriveSidebar
                teamDrives={teamDrives}
                memberDrives={memberDrives}
                projectDrives={projectDrives}
                workspaceDrive={workspaceDrive}
                active={active}
                onSelect={setActive}
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
                onPopout={() => browserPopout.open()}
                onContextMenu={handleDriveContextMenu}
              />
            </CollapsiblePanel>
          </Panel>
          <ResizeHandle />
          <Panel id="tree" defaultSize="260px" minSize="180px" maxSize="450px" className="overflow-hidden bg-surface">
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
                <EmptyState className="p-3 text-xs text-fg-3">Select a drive</EmptyState>
              )}
            </div>
          </Panel>
          <ResizeHandle />
          <Panel id="content" minSize="300px" className="overflow-hidden">
            {active ? (
              <div className="flex h-full items-center justify-center text-xs text-fg-3">
                Select a file to preview
              </div>
            ) : (
              <EmptyState>Select a drive to browse files</EmptyState>
            )}
          </Panel>
        </Group>

        {/* Popouts & Dialogs (shared across view modes) */}
        {renderPopouts()}
        {renderContextMenus(false)}
        {renderDialogs()}
      </>
    );
  }

  // Grid/List view has 2 main panels (preview opens in popout)
  return (
    <>
      <Group orientation="horizontal" className="h-full">
        <Panel
          id="drives"
          defaultSize={`${PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH}px`}
          minSize={`${PANEL_CONSTANTS.NOTCH_WIDTH}px`}
          maxSize={`${PANEL_CONSTANTS.MAX_EXPANDED_WIDTH}px`}
          className="overflow-hidden"
          panelRef={(ref) => { drivesPanel.ref.current = ref; }}
        >
          <CollapsiblePanel
            title="Drives"
            side="left"
            collapsed={drivesPanel.collapsed}
            onToggleCollapse={drivesPanel.toggleCollapse}
          >
            <DriveSidebar
              teamDrives={teamDrives}
              memberDrives={memberDrives}
              projectDrives={projectDrives}
              workspaceDrive={workspaceDrive}
              active={active}
              onSelect={setActive}
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
              onPopout={() => browserPopout.open()}
            />
          </CollapsiblePanel>
        </Panel>
        <ResizeHandle />
        <Panel id="content" minSize="400px" className="overflow-hidden bg-canvas">
          {viewMode === 'grid' ? (
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
          ) : (
            active ? (
              <FileListView
                files={activeFiles}
                selectedPath={selectedFile?.path ?? null}
                onSelect={handleFileSelect}
                onContextMenu={handleContextMenu}
              />
            ) : (
              <EmptyState>Select a drive to browse files</EmptyState>
            )
          )}
        </Panel>
      </Group>

      {renderPopouts()}
      {renderContextMenus(false)}
      {renderDialogs()}
    </>
  );
}
