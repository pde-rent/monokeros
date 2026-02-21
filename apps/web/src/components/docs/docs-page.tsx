'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery } from '@/lib/query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { Panel, Group, Separator } from 'react-resizable-panels';
import { CollapsiblePanel, useCollapsiblePanel, PANEL_CONSTANTS } from '@/components/layout/collapsible-panel';
import { EmptyState, SectionLabel, ToggleGroup } from '@monokeros/ui';
import { CaretLeftIcon, CaretRightIcon, ArrowsOutIcon, SidebarSimpleIcon } from '@phosphor-icons/react';
import { useUIStore } from '@/stores/ui-store';
import { usePopoutPortal } from '@/components/common/popout-portal';

interface NavItem {
  title: string;
  path: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface NavManifest {
  title: string;
  sections: NavSection[];
}

function ResizeHandle() {
  return (
    <Separator className="group relative flex items-center justify-center w-px bg-edge hover:bg-blue transition-colors">
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
    </Separator>
  );
}

/** Extract headings from rendered HTML for table of contents */
function extractHeadings(html: string): { id: string; text: string; level: number }[] {
  const headings: { id: string; text: string; level: number }[] = [];
  const regex = /<h([2-4])\s+id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1], 10),
      id: match[2],
      text: match[3].replace(/<[^>]*>/g, ''),
    });
  }
  return headings;
}

interface DocsPageProps {
  initialPath?: string;
}

export function DocsPage({ initialPath }: DocsPageProps) {
  const [activePath, setActivePath] = useState(initialPath || 'index');
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  const sidebarPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);
  const setDocsContext = useUIStore((s) => s.setDocsContext);
  const docsPopout = usePopoutPortal({ width: 1200, height: 800 });

  const { data: nav } = useQuery<NavManifest>({
    queryKey: queryKeys.docs.nav,
    queryFn: () => api.docs.nav(),
    staleTime: 60_000,
  });

  const { data: page, isLoading } = useQuery<{ html: string; hasMermaid: boolean; hasMath: boolean; title: string }>({
    queryKey: queryKeys.docs.page(activePath),
    queryFn: () => api.docs.page(activePath),
    enabled: !!activePath,
  });

  const headings = useMemo(() => {
    if (!page?.html) return [];
    return extractHeadings(page.html);
  }, [page?.html]);

  /** Flattened list of all nav pages for prev/next navigation */
  const navPages = useMemo(() => {
    if (!nav?.sections) return [];
    return nav.sections.flatMap((section) =>
      section.items.map((item) => ({ title: item.title, path: item.path })),
    );
  }, [nav?.sections]);

  /** Current page index within navPages */
  const currentIndex = useMemo(
    () => navPages.findIndex((p) => p.path === activePath),
    [navPages, activePath],
  );

  const prevPage = currentIndex > 0 ? navPages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < navPages.length - 1 ? navPages[currentIndex + 1] : null;

  // Scroll to top and bump render signal when page changes
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activePath]);

  // Stable scrollToHeading callback for store reference
  const scrollToHeading = useCallback((id: string) => {
    const el = contentRef.current?.querySelector(`#${CSS.escape(id)}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
      { root: container, rootMargin: '-10% 0px -80% 0px', threshold: 0 },
    );

    for (const h of headings) {
      const el = container.querySelector(`#${CSS.escape(h.id)}`);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings, activePath]);

  // Sync docsContext to ui-store for the detail panel
  useEffect(() => {
    setDocsContext({
      headings,
      activeHeading,
      onScrollTo: scrollToHeading,
      currentPath: activePath,
      navPages,
    });
  }, [headings, activeHeading, scrollToHeading, activePath, navPages, setDocsContext]);

  // Clear docsContext on unmount
  useEffect(() => {
    return () => setDocsContext(null);
  }, [setDocsContext]);

  /** Render the sidebar navigation */
  function renderSidebar() {
    return (
      <div className="h-full overflow-y-auto p-2">
        {nav?.sections.map((section) => (
          <div key={section.title} className="mb-3">
            <SectionLabel>{section.title}</SectionLabel>
            <div className="mt-1 space-y-px">
              {section.items.map((item) => (
                <button
                  key={item.path}
                  onClick={() => setActivePath(item.path)}
                  className={`rounded px-3 py-1.5 text-left text-xs transition-all w-full ${
                    activePath === item.path
                      ? 'bg-blue-light text-fg font-medium'
                      : 'text-fg-2 hover:bg-surface-3 hover:text-fg'
                  }`}
                >
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /** Render the main content area */
  function renderContent() {
    return (
      <div ref={contentRef} className="h-full overflow-y-auto">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-fg-3">Loading...</span>
          </div>
        ) : page?.html ? (
          <div className="mx-auto max-w-3xl px-8 py-6">
            <div
              className="rendered-markdown"
              dangerouslySetInnerHTML={{ __html: page.html }}
            />
            {(prevPage || nextPage) && (
              <div className="mt-8 flex items-center justify-between border-t border-edge pt-4">
                {prevPage ? (
                  <button
                    onClick={() => setActivePath(prevPage.path)}
                    className="flex items-center gap-1 text-xs text-fg-2 transition-colors hover:text-fg"
                  >
                    <CaretLeftIcon size={12} />
                    <span>{prevPage.title}</span>
                  </button>
                ) : <div />}
                {nextPage ? (
                  <button
                    onClick={() => setActivePath(nextPage.path)}
                    className="flex items-center gap-1 text-xs text-fg-2 transition-colors hover:text-fg"
                  >
                    <span>{nextPage.title}</span>
                    <CaretRightIcon size={12} />
                  </button>
                ) : <div />}
              </div>
            )}
          </div>
        ) : (
          <EmptyState>Select a page from the sidebar</EmptyState>
        )}
      </div>
    );
  }

  return (
    <>
      <Group orientation="horizontal" className="h-full">
        {/* Left sidebar - doc navigation */}
        <Panel
          id="docs-nav"
          defaultSize={`${PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH}px`}
          minSize={`${PANEL_CONSTANTS.NOTCH_WIDTH}px`}
          maxSize={`${PANEL_CONSTANTS.MAX_EXPANDED_WIDTH}px`}
          className="overflow-hidden"
          panelRef={(ref) => { sidebarPanel.ref.current = ref; }}
        >
          <CollapsiblePanel
            title="Docs"
            side="left"
            collapsed={sidebarPanel.collapsed}
            onToggleCollapse={sidebarPanel.toggleCollapse}
            headerRight={
              <button
                onClick={() => docsPopout.open()}
                title="Pop out docs"
                className="flex items-center justify-center rounded text-fg-2 hover:text-fg hover:bg-surface-3 p-1 transition-colors"
              >
                <ArrowsOutIcon size={14} />
              </button>
            }
          >
            {renderSidebar()}
          </CollapsiblePanel>
        </Panel>
        <ResizeHandle />

        {/* Main content area */}
        <Panel id="docs-content" minSize="400px" className="overflow-hidden">
          {renderContent()}
        </Panel>
      </Group>

      {/* Full docs popout window */}
      {docsPopout.isOpen && docsPopout.render(
        <div className="relative flex h-full w-full overflow-hidden bg-canvas">
          {/* Sidebar in popout */}
          <div className="w-[220px] shrink-0 overflow-y-auto border-r border-edge bg-surface">
            <div className="flex items-center justify-between border-b border-edge px-3 py-2">
              <span className="text-xs font-semibold text-fg">Docs</span>
              <button
                onClick={() => docsPopout.close()}
                className="text-fg-2 hover:text-fg transition-colors"
                title="Close"
              >
                <SidebarSimpleIcon size={14} />
              </button>
            </div>
            {renderSidebar()}
          </div>
          {/* Content in popout */}
          <div className="flex-1 overflow-hidden">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
}
