"use client";

import { useState } from "react";
import { useQuery as useConvexQuery } from "convex/react";
import { api as convexApi } from "../../../convex/_generated/api";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { EmptyState, SectionLabel, ListRowButton } from "@monokeros/ui";
import type { NavManifest } from "@/lib/content-page-utils";
import {
  ContentPageLayout,
  PrevNextNav,
  type ContentPageContext,
} from "@/components/layout/content-page-layout";
import { usePopoutPortal } from "@/components/common/popout-portal";

interface DocsPageProps {
  initialPath?: string;
  /** Hide popout button when already in a popout */
  isPopout?: boolean;
}

export function DocsPage({ initialPath, isPopout }: DocsPageProps) {
  const [activePath, setActivePath] = useState(initialPath || "index");

  const popout = usePopoutPortal({ width: 1200, height: 800 });
  const wid = useWorkspaceId();
  const nav = useConvexQuery(convexApi.wiki.nav, wid ? { workspaceId: wid } : "skip") as
    | NavManifest
    | undefined;
  const page = useConvexQuery(
    convexApi.wiki.page,
    wid && activePath ? { workspaceId: wid, path: activePath } : "skip",
  ) as { html: string; hasMermaid: boolean; hasMath: boolean; title: string } | undefined;
  const isLoading = page === undefined && !!activePath;

  function renderSidebar(ctx: ContentPageContext) {
    return (
      <div className="h-full overflow-y-auto">
        {nav?.sections.map((section) => (
          <div key={section.title} className="border-b border-edge">
            <SectionLabel className="px-3">{section.title}</SectionLabel>
            <div className="divide-y divide-edge">
              {section.items.map((item) => (
                <ListRowButton
                  key={item.path}
                  onClick={() => ctx.setActivePath(item.path)}
                  isActive={ctx.activePath === item.path}
                >
                  <span className="truncate text-xs font-medium">{item.title}</span>
                </ListRowButton>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderContent(ctx: ContentPageContext) {
    return (
      <div ref={ctx.contentRef} className="h-full overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-fg-3">Loading...</span>
          </div>
        ) : page?.html ? (
          <div className="mx-auto max-w-3xl px-8 py-6">
            <div className="rendered-markdown" dangerouslySetInnerHTML={{ __html: page.html }} />
            <PrevNextNav
              prevPage={ctx.prevPage}
              nextPage={ctx.nextPage}
              onNavigate={ctx.setActivePath}
            />
          </div>
        ) : (
          <EmptyState>Select a page from the sidebar</EmptyState>
        )}
      </div>
    );
  }

  function handlePopout() {
    popout.open(
      <div className="h-full w-full overflow-hidden bg-surface">
        <DocsPage initialPath={activePath} isPopout />
      </div>,
    );
  }

  return (
    <ContentPageLayout
      nav={nav}
      activePath={activePath}
      onPathChange={setActivePath}
      pageHtml={page?.html}
      panelPrefix="docs"
      title="Docs"
      renderSidebar={renderSidebar}
      renderContent={renderContent}
      onPopout={isPopout ? undefined : handlePopout}
    />
  );
}
