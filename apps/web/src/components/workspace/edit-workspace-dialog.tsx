'use client';

import { useState, useRef } from 'react';
import { PencilSimpleIcon, XIcon, TrashIcon, TelegramLogoIcon } from '@phosphor-icons/react';
import { Dialog, Button, Input } from '@monokeros/ui';
import { api } from '@/lib/api-client';
import { useWorkspaceStore, type WorkspaceInfo } from '@/stores/workspace-store';
import { DeleteWorkspaceDialog } from './delete-workspace-dialog';
import { PRESET_COLORS } from '@monokeros/constants';

interface Props {
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
  workspace: WorkspaceInfo;
}

export function EditWorkspaceDialog({ open, onClose, onDeleted, workspace }: Props) {
  const { updateWorkspace } = useWorkspaceStore();
  const [displayName, setDisplayName] = useState(workspace.displayName);
  const [color, setColor] = useState(workspace.branding.color);
  const [uploadedLogo, setUploadedLogo] = useState<string | null>(workspace.branding.logo);
  const [telegramToken, setTelegramToken] = useState('');
  const [showTelegram, setShowTelegram] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        displayName,
        branding: { color, logo: uploadedLogo },
      };
      if (showTelegram && telegramToken) {
        payload.telegramBotToken = telegramToken;
      }

      await api.workspaceConfig.update(workspace.slug, payload);

      updateWorkspace(workspace.id, {
        displayName,
        branding: { color, logo: uploadedLogo },
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
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
        width={420}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="border border-red bg-red-light px-3 py-2 text-xs text-red rounded-sm">
              {error}
            </div>
          )}

          {/* Logo + Name */}
          <div className="flex gap-3">
            <div className="shrink-0">
              <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Logo</label>
              <div className="mt-1 relative">
                <div
                  className="h-12 w-12 rounded-lg border border-edge overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: color }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadedLogo ? (
                    <img src={uploadedLogo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-white text-lg font-bold">
                      {displayName.charAt(0).toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                {uploadedLogo && (
                  <button
                    type="button"
                    onClick={() => setUploadedLogo(null)}
                    className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface-1 border border-edge text-fg-3 hover:text-red"
                  >
                    <XIcon size={10} weight="bold" />
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex-1">
              <Input
                label="Display Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Workspace name"
                required
              />
            </div>
          </div>

          {/* Slug (read-only) */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Slug</label>
            <p className="mt-1 text-xs text-fg-3">/{workspace.slug}</p>
          </div>

          {/* Color picker */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-fg-3">Color</label>
            <div className="mt-1.5 flex items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-md border-2 transition-all ${
                    color === c ? 'border-fg scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Communication Channels */}
          <div>
            <label className="text-xs font-medium uppercase tracking-wider text-fg-3">
              Communication
            </label>
            <div className="mt-2 space-y-2">
              {/* Telegram */}
              <div className="flex items-center gap-2 p-2 rounded-md border border-edge bg-surface-2">
                <TelegramLogoIcon size={18} className="text-[#0088cc] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-fg">Telegram</div>
                  <div className="text-[10px] text-fg-3">Connect your Telegram bot</div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTelegram(!showTelegram)}
                  className="text-xs text-blue hover:underline shrink-0"
                >
                  {showTelegram ? 'Cancel' : 'Setup'}
                </button>
              </div>
              {showTelegram && (
                <div className="pl-7 space-y-1">
                  <Input
                    value={telegramToken}
                    onChange={(e) => setTelegramToken(e.target.value)}
                    placeholder="123456:ABC-DEF..."
                  />
                  <p className="text-xs text-fg-3">Get a token from @BotFather on Telegram</p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" disabled={loading || !canSubmit} fullWidth>
              {loading ? 'Saving...' : 'Save Changes'}
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
