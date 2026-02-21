'use client';

import { GearSixIcon } from '@phosphor-icons/react';
import { Dialog, Button } from '@monokeros/ui';
import { useSettingsStore } from '@/stores/settings-store';

export function SettingsDialog() {
  const {
    chatWindowBehavior,
    filesWindowBehavior,
    orgWindowBehavior,
    projectsWindowBehavior,
    docsWindowBehavior,
    settingsDialogOpen,
    setChatWindowBehavior,
    setFilesWindowBehavior,
    setOrgWindowBehavior,
    setProjectsWindowBehavior,
    setDocsWindowBehavior,
    closeSettingsDialog,
  } = useSettingsStore();

  return (
    <Dialog
      open={settingsDialogOpen}
      onClose={closeSettingsDialog}
      title="Settings"
      icon={<GearSixIcon size={16} />}
      width={480}
    >
      <div className="space-y-6">
        {/* Window Behavior Section */}
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase text-fg-2">Window Behavior</h3>

          {/* Chat Windows */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs text-fg-2">Chat windows</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={chatWindowBehavior === 'in-app' ? 'primary' : 'secondary'}
                onClick={() => setChatWindowBehavior('in-app')}
                className="flex-1"
              >
                Open in app
              </Button>
              <Button
                size="sm"
                variant={chatWindowBehavior === 'pop-out' ? 'primary' : 'secondary'}
                onClick={() => setChatWindowBehavior('pop-out')}
                className="flex-1"
              >
                Pop out
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-fg-3">
              Default behavior when opening chat conversations
            </p>
          </div>

          {/* File Windows */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs text-fg-2">File windows</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filesWindowBehavior === 'in-app' ? 'primary' : 'secondary'}
                onClick={() => setFilesWindowBehavior('in-app')}
                className="flex-1"
              >
                Open in app
              </Button>
              <Button
                size="sm"
                variant={filesWindowBehavior === 'pop-out' ? 'primary' : 'secondary'}
                onClick={() => setFilesWindowBehavior('pop-out')}
                className="flex-1"
              >
                Pop out
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-fg-3">
              Default behavior when opening file previews
            </p>
          </div>

          {/* Org Windows */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs text-fg-2">Org windows</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={orgWindowBehavior === 'in-app' ? 'primary' : 'secondary'}
                onClick={() => setOrgWindowBehavior('in-app')}
                className="flex-1"
              >
                Open in app
              </Button>
              <Button
                size="sm"
                variant={orgWindowBehavior === 'pop-out' ? 'primary' : 'secondary'}
                onClick={() => setOrgWindowBehavior('pop-out')}
                className="flex-1"
              >
                Pop out
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-fg-3">
              Default behavior when opening org diagram
            </p>
          </div>

          {/* Project Windows */}
          <div className="mb-4">
            <label className="mb-1.5 block text-xs text-fg-2">Project windows</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={projectsWindowBehavior === 'in-app' ? 'primary' : 'secondary'}
                onClick={() => setProjectsWindowBehavior('in-app')}
                className="flex-1"
              >
                Open in app
              </Button>
              <Button
                size="sm"
                variant={projectsWindowBehavior === 'pop-out' ? 'primary' : 'secondary'}
                onClick={() => setProjectsWindowBehavior('pop-out')}
                className="flex-1"
              >
                Pop out
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-fg-3">
              Default behavior when opening project views
            </p>
          </div>

          {/* Docs Windows */}
          <div>
            <label className="mb-1.5 block text-xs text-fg-2">Documentation windows</label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={docsWindowBehavior === 'in-app' ? 'primary' : 'secondary'}
                onClick={() => setDocsWindowBehavior('in-app')}
                className="flex-1"
              >
                Open in app
              </Button>
              <Button
                size="sm"
                variant={docsWindowBehavior === 'pop-out' ? 'primary' : 'secondary'}
                onClick={() => setDocsWindowBehavior('pop-out')}
                className="flex-1"
              >
                Pop out
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-fg-3">
              Default behavior when opening documentation
            </p>
          </div>
        </div>

        {/* Done Button */}
        <div className="flex justify-end border-t border-edge pt-4">
          <Button size="sm" variant="primary" onClick={closeSettingsDialog}>
            Done
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
