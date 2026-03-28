"use client";

import { use } from "react";
import { ChatView } from "@/components/chat/chat-view";

export default function AgentChatPage({ params }: { params: Promise<{ agentIds: string }> }) {
  const { agentIds } = use(params);
  return <ChatView initialMemberId={agentIds} />;
}
