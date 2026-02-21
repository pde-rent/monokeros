'use client';

import { useMemo } from 'react';
import type { Conversation, Member } from '@monokeros/types';
import { formatRelativeTime } from '@monokeros/utils';
import { getTeamColor } from '@monokeros/constants';
import { useTeams } from '@/hooks/use-queries';
import { useChatStore } from '@/stores/chat-store';
import { ChatCircleDotsIcon, ListIcon, PlusIcon, ArrowsOutIcon } from '@phosphor-icons/react';
import { Avatar, ToggleGroup, ListRowButton, Button } from '@monokeros/ui';
import { FilterPanelShell } from '@/components/shared/filter-panel-shell';

interface Props {
  conversations: Conversation[];
  members: Member[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewConversation?: () => void;
  onPopout?: () => void;
}

const chatDisplayOptions = [
  { value: 'bubbles' as const, label: 'Bubbles', icon: <ChatCircleDotsIcon size={14} /> },
  { value: 'list' as const, label: 'List', icon: <ListIcon size={14} /> },
];

export function ConversationList({ conversations, members, activeId, onSelect, onNewConversation, onPopout }: Props) {
  const { data: teams } = useTeams();
  const { search, setSearch, chatViewMode, setChatViewMode } = useChatStore();

  const sorted = useMemo(() => {
    const withMeta = conversations.map((conv) => {
      const member = members.find((m) => m.id === conv.createdBy);
      const isSystem = member?.system === true;
      return { conv, member, isSystem };
    });

    if (!search) {
      // Pin system agent conversations at top, then sort by lastMessageAt
      return withMeta
        .sort((a, b) => {
          if (a.isSystem !== b.isSystem) return a.isSystem ? -1 : 1;
          return b.conv.lastMessageAt.localeCompare(a.conv.lastMessageAt);
        })
        .map((item) => ({ ...item, matched: true }));
    }

    const q = search.toLowerCase();
    return withMeta
      .map((item) => {
        const nameMatch = item.member?.name.toLowerCase().includes(q) ?? false;
        const titleMatch = item.conv.title.toLowerCase().includes(q);
        const matched = nameMatch || titleMatch;
        const score = (item.isSystem ? 100 : 0) + (nameMatch ? 2 : 0) + (titleMatch ? 1 : 0);
        return { ...item, matched, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [conversations, members, search]);

  return (
    <FilterPanelShell search={search} onSearchChange={setSearch} searchPlaceholder="Search conversations...">
      <div className="border-b border-edge px-2 py-2 space-y-2">
        <div className="flex border border-edge rounded-sm">
          <ToggleGroup className="flex-1" options={chatDisplayOptions} value={chatViewMode} onChange={setChatViewMode} />
          {onPopout && (
            <button
              onClick={onPopout}
              title="Pop out chat"
              className="flex items-center justify-center border-l border-edge px-2 text-fg-2 hover:text-fg transition-colors"
            >
              <ArrowsOutIcon size={14} />
            </button>
          )}
        </div>
        {onNewConversation && (
          <Button
            variant="ghost"
            size="sm"
            fullWidth
            icon={<PlusIcon size={12} />}
            onClick={onNewConversation}
            title="New Conversation"
            className="border border-dashed border-edge justify-center py-1.5 text-fg-3 hover:border-blue hover:text-blue"
          >
            New Chat
          </Button>
        )}
      </div>

      <div className="divide-y divide-edge">
          {sorted.length === 0 && (
            <p className="text-xs text-fg-3 py-2 text-center">No conversations</p>
          )}
          {sorted.map(({ conv, matched, isSystem }) => {
            const member = conv.createdBy ? members.find((m) => m.id === conv.createdBy) : null;
            const team = member ? teams?.find((t) => t.id === member.teamId) : null;
            const isActive = conv.id === activeId;
            const isGroup = conv.type !== 'agent_dm';

            return (
              <ListRowButton
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                isActive={isActive}
                style={{ opacity: matched ? 1 : 0.3 }}
              >
                <div className="mt-0.5">
                  {isGroup ? (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-xs font-medium text-fg-2">
                      {conv.participantIds.length}
                    </div>
                  ) : (
                    <Avatar name={member?.name ?? '?'} src={member?.avatarUrl} color={getTeamColor(team)} size="sm" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 text-xs font-medium truncate">
                      {isGroup ? conv.title : (member?.name ?? 'Unknown')}
                      {isSystem && (
                        <span className="shrink-0 rounded px-1 py-px text-xs font-medium leading-tight bg-purple/10 text-purple">
                          system
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-fg-3">
                      {formatRelativeTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-fg-3 truncate">
                    {isGroup ? `${conv.participantIds.length} participants` : conv.title}
                  </div>
                </div>
              </ListRowButton>
            );
          })}
      </div>
    </FilterPanelShell>
  );
}
