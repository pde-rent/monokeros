"use client";

import { useEffect, useState } from "react";
import { Panel, Group } from "react-resizable-panels";
import { useConversations, useMembers } from "@/hooks/use-queries";
import { useChatStore } from "@/stores/chat-store";
import { useUIStore } from "@/stores/ui-store";
import { ConversationList } from "./conversation-list";
import { ChatPanel } from "./chat-panel";
import { CreateConversationDialog } from "./create-conversation-dialog";
import { EmptyState } from "@monokeros/ui";
import {
  CollapsibleSidePanel,
  useCollapsiblePanel,
} from "@/components/layout/collapsible-panel";
import { usePopoutPortal } from "@/components/common/popout-portal";
import { ResizeHandle } from "@/components/layout/resizable-layout";

interface Props {
  initialMemberId?: string;
  initialConversationId?: string;
  /** Hide the popout button (e.g. when already in a popout) */
  isPopout?: boolean;
}

export function ChatView({ initialMemberId, initialConversationId, isPopout }: Props) {
  const { data: conversations } = useConversations();
  const { data: members } = useMembers();
  const { activeConversationId, setActiveConversation } = useChatStore();
  const { openDetailPanel, closeDetailPanel } = useUIStore();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const chatPopout = usePopoutPortal({ width: 700, height: 850 });
  const convPanel = useCollapsiblePanel(240);

  // Auto-select conversation for initial conversation or member
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversation(initialConversationId);
    } else if (initialMemberId && conversations) {
      const conv = conversations.find((c) => c.createdBy === initialMemberId);
      if (conv) setActiveConversation(conv.id);
    }
  }, [initialConversationId, initialMemberId, conversations, setActiveConversation]);

  // Auto-select system conversation first, fallback to first available
  useEffect(() => {
    if (!activeConversationId && conversations?.length && members?.length) {
      const systemConv = conversations.find((c) => {
        const m = members.find((m) => m.id === c.createdBy);
        return m?.system === true;
      });
      setActiveConversation((systemConv ?? conversations[0]).id);
    }
  }, [activeConversationId, conversations, members, setActiveConversation]);

  const activeConversation = conversations?.find((c) => c.id === activeConversationId);
  const activeMember = members?.find((m) => m.id === activeConversation?.createdBy);

  // Open detail panel for the active member (agent_dm only)
  useEffect(() => {
    if (activeConversation?.type === "agent_dm" && activeMember) {
      openDetailPanel("agent", activeMember.id);
    } else {
      closeDetailPanel();
    }
  }, [activeConversation?.type, activeMember?.id, openDetailPanel, closeDetailPanel]);

  return (
    <Group orientation="horizontal" className="h-full">
      {/* Conversation list */}
      <CollapsibleSidePanel id="conversations" title="Conversations" side="left" panel={convPanel} defaultWidth={240}>
        <ConversationList
          conversations={conversations ?? []}
          members={members ?? []}
          activeId={activeConversationId}
          onSelect={setActiveConversation}
          onNewConversation={() => setShowCreateDialog(true)}
          onPopout={isPopout ? undefined : () => chatPopout.open(
          <div className="h-full w-full overflow-hidden bg-surface">
            <ChatView isPopout />
          </div>,
        )}
        />
      </CollapsibleSidePanel>

      <ResizeHandle />

      {/* Chat area */}
      <Panel id="chat" minSize="400px" className="overflow-hidden">
        {activeConversationId ? (
          <ChatPanel conversationId={activeConversationId} />
        ) : (
          <EmptyState>Select a conversation to begin</EmptyState>
        )}
      </Panel>

      <CreateConversationDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConversationReady={(id) => setActiveConversation(id)}
      />
    </Group>
  );
}
