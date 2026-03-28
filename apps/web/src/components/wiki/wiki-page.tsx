"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery as useConvexQuery, useMutation } from "convex/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { EmptyState, SectionLabel, ListRowButton, Button } from "@monokeros/ui";
import { slugify } from "@monokeros/utils";
import { PencilSimpleIcon, CheckIcon, XIcon, PlusIcon } from "@phosphor-icons/react";
import { CreateDialog } from "@/components/files/create-dialog";
import { useParams } from "next/navigation";
import type { NavManifest } from "@/lib/content-page-utils";
import {
  ContentPageLayout,
  PrevNextNav,
  type ContentPageContext,
} from "@/components/layout/content-page-layout";
import { usePopoutPortal } from "@/components/common/popout-portal";

interface WikiPageProps {
  initialPath?: string;
  /** Hide popout button when already in a popout */
  isPopout?: boolean;
}

export function WikiPage({ initialPath, isPopout }: WikiPageProps) {
  const { workspace: slug } = useParams<{ workspace: string }>();
  const [activePath, setActivePath] = useState(initialPath || "index");
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const popout = usePopoutPortal({ width: 1200, height: 800 });
  const wid = useWorkspaceId();
  const nav = useConvexQuery(convexApi.wiki.nav, wid ? { workspaceId: wid } : "skip") as
    | NavManifest
    | undefined;
  const page = useConvexQuery(
    convexApi.wiki.page,
    wid && activePath && !isEditing ? { workspaceId: wid, path: activePath } : "skip",
  ) as { html: string; hasMermaid: boolean; hasMath: boolean; title: string } | undefined;
  const isLoading = page === undefined && !!activePath && !isEditing;
  const rawData = useConvexQuery(
    convexApi.wiki.raw,
    wid && activePath && isEditing ? { workspaceId: wid, path: activePath } : "skip",
  ) as { content: string; title: string } | undefined;

  // Sync edit content when raw data loads
  useEffect(() => {
    if (rawData?.content) {
      setEditContent(rawData.content);
    }
  }, [rawData?.content]);

  // Reset edit mode when path changes
  useEffect(() => {
    setIsEditing(false);
    setEditContent("");
  }, [activePath]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent("");
  }, []);

  const saveWikiPage = useMutation(convexApi.wiki.save);
  const handleSave = useCallback(async () => {
    if (!wid) return;
    setIsSaving(true);
    try {
      await saveWikiPage({ workspaceId: wid, path: activePath, content: editContent });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save wiki page:", err);
    } finally {
      setIsSaving(false);
    }
  }, [slug, activePath, editContent]);

  const handleCreateNew = useCallback(() => setShowCreateDialog(true), []);

  const handleCreateSubmit = useCallback((name: string) => {
    setActivePath(slugify(name));
    setIsEditing(true);
    setEditContent(`# ${name}\n\nStart writing here...`);
    setShowCreateDialog(false);
  }, []);

  function renderSidebar() {
    const hasPages = nav?.sections?.some((s) => s.items.length > 0);

    return (
      <div className="h-full overflow-y-auto">
        <div className="border-b border-edge px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            icon={<PlusIcon size={12} />}
            onClick={handleCreateNew}
            title="New Page"
            className="border border-dashed border-edge justify-center py-1.5 text-fg-3 hover:border-blue hover:text-blue"
          >
            New Page
          </Button>
        </div>

        {nav?.sections.map((section) => (
          <div key={section.title} className="border-b border-edge">
            {section.items.length > 0 && (
              <>
                <SectionLabel className="px-3">{section.title}</SectionLabel>
                <div className="divide-y divide-edge">
                  {section.items.map((item) => (
                    <ListRowButton
                      key={item.path}
                      onClick={() => setActivePath(item.path)}
                      isActive={activePath === item.path}
                    >
                      <span className="truncate text-xs font-medium">{item.title}</span>
                    </ListRowButton>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}

        {!hasPages && (
          <div className="px-3 py-2 text-xs text-fg-3">
            No wiki pages yet. Create one to get started.
          </div>
        )}
      </div>
    );
  }

  function renderContent(ctx: ContentPageContext) {
    if (isEditing) {
      return (
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2">
            <span className="text-xs font-medium text-fg">
              Editing: {page?.title || activePath}
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="flex items-center gap-1 rounded border border-edge bg-surface-2 px-2 py-1 text-xs text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg disabled:opacity-50"
              >
                <XIcon size={14} />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 rounded bg-blue px-2 py-1 text-xs text-fg transition-colors hover:bg-blue-dark disabled:opacity-50"
              >
                <CheckIcon size={14} />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="flex-1 p-4 font-mono text-xs bg-surface-2 text-fg resize-none focus:outline-none"
            placeholder="Write your markdown here..."
            disabled={isSaving}
          />
        </div>
      );
    }

    return (
      <div ref={ctx.contentRef} className="h-full overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-fg-3">Loading...</span>
          </div>
        ) : page?.html ? (
          <div className="mx-auto max-w-3xl px-8 py-6">
            <div className="mb-4 flex justify-end">
              <button
                onClick={handleEdit}
                className="flex items-center gap-1 rounded border border-edge bg-surface-2 px-2 py-1 text-xs text-fg-2 transition-colors hover:bg-surface-3 hover:text-fg"
              >
                <PencilSimpleIcon size={14} />
                Edit
              </button>
            </div>
            <div className="rendered-markdown" dangerouslySetInnerHTML={{ __html: page.html }} />
            <PrevNextNav
              prevPage={ctx.prevPage}
              nextPage={ctx.nextPage}
              onNavigate={ctx.setActivePath}
            />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <EmptyState>
                {nav?.sections?.some((s) => s.items.length > 0)
                  ? "Select a page from the sidebar"
                  : "No wiki pages yet"}
              </EmptyState>
              {!nav?.sections?.some((s) => s.items.length > 0) && (
                <button
                  onClick={handleCreateNew}
                  className="mt-4 flex items-center gap-1 rounded bg-blue px-3 py-1.5 text-xs text-fg transition-colors hover:bg-blue-dark"
                >
                  <PlusIcon size={14} />
                  Create First Page
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  function handlePopout() {
    popout.open(
      <div className="h-full w-full overflow-hidden bg-surface">
        <WikiPage initialPath={activePath} isPopout />
      </div>,
    );
  }

  return (
    <>
      <ContentPageLayout
        nav={nav}
        activePath={activePath}
        onPathChange={setActivePath}
        pageHtml={page?.html}
        panelPrefix="wiki"
        title="Wiki"
        renderSidebar={renderSidebar}
        renderContent={renderContent}
        onPopout={isPopout ? undefined : handlePopout}
      />
      {showCreateDialog && (
        <CreateDialog
          mode="page"
          onSubmit={handleCreateSubmit}
          onClose={() => setShowCreateDialog(false)}
        />
      )}
    </>
  );
}
