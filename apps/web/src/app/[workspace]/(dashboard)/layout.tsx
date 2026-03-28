"use client";

import { TopNav } from "@/components/layout/top-nav";
import { StatusBar } from "@/components/layout/status-bar";
import { DetailPanel } from "@/components/layout/detail-panel";
import { FabProvider } from "@/components/shared/fab-context";
import { Fab } from "@/components/shared/fab";
import { PopoutProvider } from "@/components/common/popout-provider";
import { Panel, Group } from "react-resizable-panels";
import { useCollapsiblePanel, PANEL_CONSTANTS } from "@/components/layout/collapsible-panel";
import { ResizeHandle } from "@/components/layout/resizable-layout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const detailPanel = useCollapsiblePanel(PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH);

  return (
    <PopoutProvider>
      <div className="flex h-screen flex-col">
        <TopNav />
        <main className="flex-1 overflow-hidden">
          <Group orientation="horizontal" className="h-full" id="dashboard-layout">
            {/* Main content area */}
            <Panel id="main" minSize="400px" className="overflow-hidden">
              <FabProvider>
                <div className="relative h-full overflow-hidden">
                  {children}
                  <Fab />
                </div>
              </FabProvider>
            </Panel>

            {/* Detail panel (right side) */}
            <ResizeHandle />
            <Panel
              id="detail"
              defaultSize={`${PANEL_CONSTANTS.DEFAULT_EXPANDED_WIDTH}px`}
              minSize={`${PANEL_CONSTANTS.NOTCH_WIDTH}px`}
              maxSize={`${PANEL_CONSTANTS.MAX_EXPANDED_WIDTH}px`}
              className="overflow-hidden"
              panelRef={(ref) => {
                detailPanel.ref.current = ref;
              }}
            >
              <DetailPanel
                collapsed={detailPanel.collapsed}
                onToggleCollapse={detailPanel.toggleCollapse}
              />
            </Panel>
          </Group>
        </main>
        <StatusBar />
      </div>
    </PopoutProvider>
  );
}
