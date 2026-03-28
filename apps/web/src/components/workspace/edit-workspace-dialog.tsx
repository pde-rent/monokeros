"use client";

import { useState } from "react";
import { useImageUpload } from "@/hooks/use-image-upload";
import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { Dialog, Button, FormError } from "@monokeros/ui";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { DeleteWorkspaceDialog } from "./delete-workspace-dialog";
import { WorkspaceFormFields } from "./workspace-form-fields";

interface WorkspaceInfo {
  _id?: string;
  id?: string;
  slug: string;
  displayName: string;
  description?: string;
  branding: { logo: string | null; color: string };
}

interface Props {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  workspace: WorkspaceInfo;
}

export function EditWorkspaceDialog({ open, onClose, onDeleted, workspace }: Props) {
  const updateConfig = useMutation(api.workspaces.updateConfig);
  const [displayName, setDisplayName] = useState(workspace.displayName);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [color, setColor] = useState(workspace.branding.color);
  const logo = useImageUpload(workspace.branding.logo);
  const [telegramToken, setTelegramToken] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const wsId = (workspace as any)._id ?? (workspace as any).id;
      await updateConfig({
        workspaceId: wsId,
        displayName,
        description,
        branding: { color, logo: logo.imageUrl },
      } as any);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update workspace");
    } finally {
      setLoading(false);
    }
  }

  function handleDeleted() {
    setShowDelete(false);
    onClose();
    onDeleted();
  }

  const canSubmit = displayName.trim().length > 0;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Edit Workspace"
        icon={<PencilSimpleIcon size={14} weight="bold" />}
        width={480}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormError error={error} />

          <WorkspaceFormFields
            values={{
              name: displayName,
              slug: workspace.slug,
              description,
              color,
              telegramToken,
            }}
            onNameChange={setDisplayName}
            onDescriptionChange={setDescription}
            onColorChange={setColor}
            onTelegramTokenChange={setTelegramToken}
            logo={logo}
            slugReadOnly
          />

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !canSubmit} fullWidth>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>

          {/* Danger zone */}
          <div className="border-t border-edge pt-4">
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              className="flex items-center gap-1.5 text-xs text-red hover:underline"
            >
              <TrashIcon size={12} />
              Delete this workspace
            </button>
          </div>
        </form>
      </Dialog>

      <DeleteWorkspaceDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onDeleted={handleDeleted}
        workspace={workspace}
      />
    </>
  );
}
