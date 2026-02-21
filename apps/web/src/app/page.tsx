'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useWorkspaceStore, type WorkspaceInfo } from '@/stores/workspace-store';
import { Button } from '@monokeros/ui';
import { CreateWorkspaceDialog } from '@/components/workspace/create-workspace-dialog';
import { EditWorkspaceDialog } from '@/components/workspace/edit-workspace-dialog';
import { PencilSimpleIcon } from '@phosphor-icons/react';

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const { workspaces } = useWorkspaceStore();
  const [showCreate, setShowCreate] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceInfo | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Wait a tick for auth initialization to complete
    const timer = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) return null;

  function handleCreated(ws: WorkspaceInfo) {
    setShowCreate(false);
    router.push(`/${ws.slug}/org`);
  }

  function handleLogout() {
    logout();
    router.replace('/login');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <img src="/icons/logo.svg" alt="MonokerOS" className="h-16 w-16" />
          <h1 className="text-xl font-bold tracking-tight font-display text-fg">
            Monoker<span className="text-blue">OS</span>
          </h1>
          <p className="text-xs text-fg-2">Select a workspace</p>
        </div>

        {/* Workspace Cards */}
        {workspaces.length > 0 && (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div key={ws.id} className="group relative">
                <button
                  onClick={() => router.push(`/${ws.slug}/org`)}
                  className="flex w-full items-center gap-3 rounded-md border border-edge bg-surface p-4 text-left transition-all hover:border-edge-hover hover:bg-surface-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md text-white text-sm font-bold"
                    style={{ backgroundColor: ws.branding.color }}
                  >
                    {ws.branding.logo ? (
                      <img src={ws.branding.logo} alt="" className="h-full w-full object-cover rounded-md" />
                    ) : (
                      ws.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-fg">{ws.displayName}</div>
                    <div className="text-xs text-fg-3">/{ws.slug}</div>
                  </div>
                  <span className="text-xs text-fg-3 capitalize">{ws.role}</span>
                </button>
                {ws.role === 'admin' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingWorkspace(ws);
                    }}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-fg-3 opacity-0 transition-opacity hover:bg-surface-3 hover:text-fg group-hover:opacity-100"
                    title="Edit workspace"
                  >
                    <PencilSimpleIcon size={12} weight="bold" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Workspace Button */}
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={() => setShowCreate(true)}
          className="border-dashed hover:border-edge-hover hover:bg-surface-3 hover:text-fg-2"
        >
          Create Workspace
        </Button>

        {/* Sign Out */}
        <Button
          variant="ghost"
          size="md"
          fullWidth
          onClick={handleLogout}
          className="text-fg-3 hover:text-fg-2"
        >
          Sign out
        </Button>
      </div>

      {/* Create Workspace Modal */}
      <CreateWorkspaceDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreated}
      />

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <EditWorkspaceDialog
          open={true}
          onClose={() => setEditingWorkspace(null)}
          onDeleted={() => setEditingWorkspace(null)}
          workspace={editingWorkspace}
        />
      )}
    </div>
  );
}
