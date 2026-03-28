"use client";

import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from "react";
import { Panel, Group } from "react-resizable-panels";
import {
  CollapsibleSidePanel,
  useCollapsiblePanel,
  PANEL_CONSTANTS,
} from "@/components/layout/collapsible-panel";
import { ListRowButton } from "@monokeros/ui";
import { ArrowsOutIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { ResizeHandle } from "@/components/layout/resizable-layout";
import {
  extractHeadings,
  flattenNavPages,
  type NavManifest,
  type Heading,
} from "@/lib/content-page-utils";

export interface ContentPageContext {
  activePath: string;
  setActivePath: (path: string) => void;
  headings: Heading[];
  activeHeading: string | null;
  scrollToHeading: (id: string) => void;
  contentRef: React.RefObject<HTMLDivElement | null>;
  prevPage: { title: string; path: string } | null;
  nextPage: { title: string; path: string } | null;
}

interface ContentPageLayoutProps {
  /** Navigation manifest for sidebar and prev/next */
  nav: NavManifest | undefined;
  /** Active page path */
  activePath: string;
  /** Callback when active path changes */
  onPathChange: (path: string) => void;
  /** Rendered HTML of the current page (for heading extraction) */
  pageHtml: string | undefined;
  /** Panel ID prefix (e.g. "docs", "wiki") */
  panelPrefix: string;
  /** Title shown in sidebar header and popout */
  title: string;
  /** Render the sidebar content */
  renderSidebar: (ctx: ContentPageContext) => ReactNode;
  /** Render the main content area */
  renderContent: (ctx: ContentPageContext) => ReactNode;
  /** Optional custom TOC renderer; defaults to heading list */
  renderToc?: (ctx: ContentPageContext) => ReactNode;
  /** Callback to open popout; if undefined, popout button is hidden */
  onPopout?: () => void;
}

export function ContentPageLayout({
  nav,
  activePath,
  onPathChange,
  pageHtml,
  panelPrefix,
  title,
  renderSidebar,
  renderContent,
  renderToc: customRenderToc,
  onPopout,
}: ContentPageLayoutProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const sidebarPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);
  const tocPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH, true);

  const headings = useMemo(() => {
    if (!pageHtml) return [];
    return extractHeadings(pageHtml);
  }, [pageHtml]);

  const navPages = useMemo(() => flattenNavPages(nav), [nav?.sections]);
  const currentIndex = useMemo(
    () => navPages.findIndex((p) => p.path === activePath),
    [navPages, activePath],
  );
  const prevPage = currentIndex > 0 ? navPages[currentIndex - 1] : null;
  const nextPage =
    currentIndex >= 0 && currentIndex < navPages.length - 1 ? navPages[currentIndex + 1] : null;

  // Scroll to top when page changes
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activePath]);

  const scrollToHeading = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // IntersectionObserver for active heading tracking
  useEffect(() => {
    const container = contentRef.current;
    if (!container || headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeading(entry.target.id);
            break;
          }
        }
      },
      { root: container, rootMargin: "-10% 0px -80% 0px", threshold: 0 },
    );

    for (const h of headings) {
      const el = container.querySelector(`#${CSS.escape(h.id)}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings, activePath]);

  const ctx: ContentPageContext = {
    activePath,
    setActivePath: onPathChange,
    headings,
    activeHeading,
    scrollToHeading,
    contentRef,
    prevPage,
    nextPage,
  };

  function defaultRenderToc() {
    return (
      <div className="h-full overflow-y-auto">
        <div className="divide-y divide-edge">
          {headings.map((h) => (
            <ListRowButton
              key={h.id}
              onClick={() => scrollToHeading(h.id)}
              isActive={activeHeading === h.id}
            >
              <span
                className="truncate text-xs font-medium"
                style={{ paddingLeft: `${(h.level - 2) * 8}px` }}
              >
                {h.text}
              </span>
            </ListRowButton>
          ))}
        </div>
        {headings.length === 0 && <div className="px-3 py-2 text-xs text-fg-3">No headings</div>}
      </div>
    );
  }

  const tocContent = customRenderToc ? customRenderToc(ctx) : defaultRenderToc();

  return (
    <>
      <Group orientation="horizontal" className="h-full">
        <CollapsibleSidePanel
          id={`${panelPrefix}-nav`}
          title={title}
          side="left"
          panel={sidebarPanel}
          headerRight={
            onPopout ? (
              <button
                onClick={onPopout}
                title={`Pop out ${title.toLowerCase()}`}
                className="flex items-center justify-center rounded text-fg-2 hover:text-fg hover:bg-surface-3 p-1 transition-colors"
              >
                <ArrowsOutIcon size={14} />
              </button>
            ) : undefined
          }
        >
          {renderSidebar(ctx)}
        </CollapsibleSidePanel>
        <ResizeHandle />

        <Panel id={`${panelPrefix}-content`} minSize="400px" className="overflow-hidden">
          {renderContent(ctx)}
        </Panel>

        <ResizeHandle />
        <CollapsibleSidePanel id={`${panelPrefix}-toc`} title="On This Page" side="right" panel={tocPanel}>
          {tocContent}
        </CollapsibleSidePanel>
      </Group>
    </>
  );
}

/** Prev/Next page navigation footer for content pages */
export function PrevNextNav({
  prevPage,
  nextPage,
  onNavigate,
}: {
  prevPage: { title: string; path: string } | null;
  nextPage: { title: string; path: string } | null;
  onNavigate: (path: string) => void;
}) {
  if (!prevPage && !nextPage) return null;
  return (
    <div className="mt-8 flex items-center justify-between border-t border-edge pt-4">
      {prevPage ? (
        <button
          onClick={() => onNavigate(prevPage.path)}
          className="flex items-center gap-1 text-xs text-fg-2 transition-colors hover:text-fg"
        >
          <CaretLeftIcon size={12} />
          <span>{prevPage.title}</span>
        </button>
      ) : (
        <div />
      )}
      {nextPage ? (
        <button
          onClick={() => onNavigate(nextPage.path)}
          className="flex items-center gap-1 text-xs text-fg-2 transition-colors hover:text-fg"
        >
          <span>{nextPage.title}</span>
          <CaretRightIcon size={12} />
        </button>
      ) : (
        <div />
      )}
    </div>
  );
}
