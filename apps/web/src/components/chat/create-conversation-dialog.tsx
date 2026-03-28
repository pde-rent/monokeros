"use client";

import { useState, useMemo } from "react";
import type { Member } from "@monokeros/types";
import { createTextFilter } from "@monokeros/utils";
import { Dialog, Button, Input, Avatar } from "@monokeros/ui";
import { useMembers, useCreateConversation } from "@/hooks/use-queries";
import { getTeamColor } from "@monokeros/constants";
import { useTeams } from "@/hooks/use-queries";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { ChatCircleDotsIcon } from "@phosphor-icons/react";

const filterMembers = createTextFilter<Member>("name", "title");

interface Props {
  open: boolean;
  onClose: () => void;
  onConversationReady: (conversationId: string) => void;
}

export function CreateConversationDialog({ open, onClose, onConversationReady }: Props) {
  const wid = useWorkspaceId();
  const { data: members } = useMembers();
  const { data: teams } = useTeams();
  const createConversation = useCreateConversation();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterMembers(members ?? [], search),
    [members, search],
  );

  function toggleMember(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0 || !wid) return;
    const isGroup = selectedIds.length > 1;
    const resolvedTitle = isGroup
      ? title.trim() || selectedIds.map((id) => members?.find((m) => m.id === id)?.name).filter(Boolean).join(", ")
      : members?.find((m) => m.id === selectedIds[0])?.name ?? "Chat";
    const data = {
      workspaceId: wid,
      participantIds: selectedIds,
      title: resolvedTitle,
      type: isGroup ? "group_chat" as const : "agent_dm" as const,
    };
    createConversation.mutate(data as any, {
      onSuccess: (res: any) => {
        onConversationReady(res.conversationId ?? res);
        setSelectedIds([]);
        setTitle("");
        setSearch("");
        onClose();
      },
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="New Conversation"
      icon={<ChatCircleDotsIcon size={14} weight="bold" />}
      width={440}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="w-full rounded-md border border-edge bg-surface-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-fg-3 focus:border-blue"
        />

        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {filtered.map((member) => {
            const team = teams?.find((t) => t.id === member.teamId);
            return (
              <label
                key={member.id}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 cursor-pointer hover:bg-surface-3"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="accent-blue"
                />
                <Avatar
                  name={member.name}
                  src={member.avatarUrl}
                  color={getTeamColor(team)}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-fg truncate">{member.name}</div>
                  <div className="text-[10px] text-fg-3 truncate">{member.title}</div>
                </div>
              </label>
            );
          })}
        </div>

        {selectedIds.length > 1 && (
          <Input
            label="Group Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Design Review"
          />
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={selectedIds.length === 0 || createConversation.isPending}>
            {selectedIds.length <= 1 ? "Start Chat" : "Create Group"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
