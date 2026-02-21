'use client';

import { useParams } from 'next/navigation';
import { ChatView } from '@/components/chat/chat-view';
import { WindowProvider } from '@monokeros/ui';

export default function PopoutChatPage() {
  const params = useParams<{ conversationId: string }>();
  const conversationId = params.conversationId;

  return (
    <WindowProvider>
      <div className="h-screen w-screen overflow-hidden bg-surface">
        <ChatView initialConversationId={conversationId} isPopout />
      </div>
    </WindowProvider>
  );
}
