"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../convex/_generated/api";
import { Button, Dialog } from "@monokeros/ui";
import { CreateWorkspaceForm } from "@/components/workspace/create-workspace-form";
import { EditWorkspaceDialog } from "@/components/workspace/edit-workspace-dialog";
import { PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";

interface WorkspaceInfo {
  _id: string;
  slug: string;
  displayName: string;
  description?: string;
  branding: { logo: string | null; color: string };
  industry: string;
}

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const workspaces = useQuery(api.workspaces.list, isAuthenticated ? {} : "skip");
  const [showCreate, setShowCreate] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return null;

  function handleCreated(ws: { slug: string }) {
    setShowCreate(false);
    router.push(`/${ws.slug}/org`);
  }

  function handleLogout() {
    void signOut();
    router.replace("/login");
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
        {workspaces && workspaces.length > 0 && (
          <div className="space-y-2">
            {workspaces.map((ws) => (
              <div key={ws._id} className="group relative">
                <button
                  onClick={() => router.push(`/${ws.slug}/org`)}
                  className="flex w-full items-center gap-3 rounded-md border border-edge bg-surface p-4 text-left transition-all hover:border-edge-hover hover:bg-surface-3"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-md text-white text-sm font-bold"
                    style={{ backgroundColor: ws.branding.color }}
                  >
                    {ws.branding.logo ? (
                      <img
                        src={ws.branding.logo}
                        alt=""
                        className="h-full w-full object-cover rounded-md"
                      />
                    ) : (
                      ws.displayName.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-fg">{ws.displayName}</div>
                    <div className="text-xs text-fg-3">/{ws.slug}</div>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingWorkspace(ws as unknown as WorkspaceInfo);
                  }}
                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded text-fg-3 opacity-0 transition-opacity hover:bg-surface-3 hover:text-fg group-hover:opacity-100"
                  title="Edit workspace"
                >
                  <PencilSimpleIcon size={12} weight="bold" />
                </button>
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
      <Dialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Workspace"
        icon={<PlusIcon size={14} weight="bold" />}
        width={480}
      >
        <CreateWorkspaceForm
          onCreated={handleCreated}
          onCancel={() => setShowCreate(false)}
        />
      </Dialog>

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
