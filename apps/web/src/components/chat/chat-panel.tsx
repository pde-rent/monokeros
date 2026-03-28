"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";
import {
  useConversation,
  useSendMessage,
  useSetReaction,
  useMembers,
  useTeams,
  useProjects,
  useTasks,
  useDrives,
} from "@/hooks/use-queries";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { useChatStore } from "@/stores/chat-store";
import { useChatStream } from "@/hooks/use-chat-stream";
import { useMentions } from "@/hooks/use-mentions";
import { useDragDrop } from "@/hooks/use-drag-drop";
import type { MentionSuggestion } from "@/hooks/use-mentions";
import { MentionDropdown } from "./mention-dropdown";
import { MentionHydrator } from "./mention-hydrator";
import { MessageRole, MessageReferenceType, FileEntryType } from "@monokeros/types";
import type { ChatMessage, FileEntry } from "@monokeros/types";
import {
  MessageBubble,
  MessageListRow,
  DropzoneOverlay,
  PendingFileBadge,
} from "@monokeros/ui";
import { getTeamColor } from "@monokeros/constants";
import { FilePreviewModal } from "./file-preview-modal";
import { PaperclipIcon, PaperPlaneIcon, ArrowDownIcon } from "@phosphor-icons/react";
import { TOOL_LABELS, PHASE_LABELS } from "./chat-constants";
import { Message, renderContent } from "./chat-message";
import { ThinkingIndicator, SmoothStreamingMessage } from "./chat-streaming";

interface PendingFile {
  file: File;
  id: string;
}

function usePendingFiles() {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  let counter = 0;

  const addFiles = useCallback((files: File[]) => {
    const newPending = files.map((file) => ({
      file,
      id: `pending_${Date.now()}_${counter++}`,
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clear = useCallback(() => setPendingFiles([]), []);

  return { pendingFiles, addFiles, removeFile, clear };
}

interface Props {
  conversationId: string;
}

/** Collect all file names from a drive listing for mention suggestions */
function collectFileNames(
  entries: FileEntry[],
  acc: MentionSuggestion[] = [],
): MentionSuggestion[] {
  for (const entry of entries) {
    if (entry.type === FileEntryType.FILE) {
      acc.push({
        id: entry.id,
        label: entry.name,
        secondary: entry.path,
        type: MessageReferenceType.FILE,
        display: entry.name,
        color: "var(--color-purple)",
      });
    }
    if (entry.children) {
      collectFileNames(entry.children, acc);
    }
  }
  return acc;
}

/**
 * Resolve which agent should respond to a message.
 *
 * Priority:
 * 1. First @mentioned agent in the message references
 * 2. Lead participant (isLead === true)
 * 3. System participant (system === true)
 * 4. First non-"user" participant
 */
/**
 * Resolve which agents should respond to a message.
 * Returns ALL @mentioned agent participants, or falls back to one (lead → system → first).
 */
function resolveTargetAgents(
  conversation: { participantIds: string[] } | null | undefined,
  references: Array<{ type: string; id: string; display: string }>,
  memberList: Array<{ id: string; isLead: boolean; system: boolean; type: string }> | undefined,
): string[] {
  if (!conversation) return [];
  const participantIds = conversation.participantIds ?? [];

  // 1. If message @mentions agent participants, route to ALL of them (in mention order)
  const mentionedAgents = references
    .filter((r) => r.type === "agent" && participantIds.includes(r.id))
    .map((r) => r.id);
  // Deduplicate while preserving order
  const uniqueMentioned = [...new Set(mentionedAgents)];
  if (uniqueMentioned.length > 0) return uniqueMentioned;

  // 2. Among agent participants, prefer lead → system → first
  const agentParticipants = participantIds.filter((id) => id !== "user");
  if (agentParticipants.length === 0) return [];
  if (agentParticipants.length === 1) return [agentParticipants[0]];

  if (memberList) {
    const participantMembers = agentParticipants
      .map((id) => memberList.find((m) => m.id === id))
      .filter(Boolean) as typeof memberList;

    const lead = participantMembers.find((m) => m.isLead);
    if (lead) return [lead.id];

    const system = participantMembers.find((m) => m.system);
    if (system) return [system.id];
  }

  return [agentParticipants[0]];
}

export function ChatPanel({ conversationId }: Props) {
  const wid = useWorkspaceId();
  const { data: conversation } = useConversation(conversationId);
  const sendMessage = useSendMessage();
  const setReaction = useSetReaction();
  const {
    streamingConversationId,
    streamingContent,
    thinkingPhase,
    activeToolCalls,
    completedToolCalls,
    chatViewMode,
  } = useChatStore();
  const [input, setInput] = useState("");
  const [previewAttachment, setPreviewAttachment] = useState<import("@monokeros/types").MessageAttachment | null>(null);
  const [mentionsActive, setMentionsActive] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { pendingFiles, addFiles, removeFile, clear: clearFiles } = usePendingFiles();
  const { dragOver, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(addFiles);

  // NDJSON stream for real-time agent responses (replaces WebSocket)
  const chatStream = useChatStream();

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const isStreaming = streamingConversationId === conversationId;

  // Derive thinking display text from daemon-reported phase and active tools
  const thinkingDisplayText = useMemo(() => {
    if (activeToolCalls.length > 0) {
      const toolName = activeToolCalls[activeToolCalls.length - 1].name;
      return TOOL_LABELS[toolName] ?? `Running ${toolName}`;
    }
    if (thinkingPhase) {
      return PHASE_LABELS[thinkingPhase] ?? thinkingPhase;
    }
    return "Thinking";
  }, [thinkingPhase, activeToolCalls]);

  // Clear pending message when server confirms it
  useEffect(() => {
    if (pendingUserMessage && conversation?.messages?.length) {
      const hasMessage = conversation.messages.some(
        (m) => m.role === MessageRole.USER && m.content === pendingUserMessage,
      );
      if (hasMessage) {
        setPendingUserMessage(null);
        setWaitingForAgent(true);
      }
    }
  }, [conversation?.messages, pendingUserMessage]);

  // Stop waiting once streaming starts (WebSocket stream-start arrived)
  useEffect(() => {
    if (isStreaming) setWaitingForAgent(false);
  }, [isStreaming]);

  // Fetch entities for mentions (deferred until a trigger char is typed)
  const { data: members } = useMembers({ enabled: mentionsActive });
  const { data: teams } = useTeams({ enabled: mentionsActive });
  const { data: projects } = useProjects(undefined, { enabled: mentionsActive });
  const { data: tasks } = useTasks(undefined, { enabled: mentionsActive });
  const { data: drives } = useDrives({ enabled: mentionsActive });

  // Build mention suggestion pools
  const mentionPools = useMemo(() => {
    const memberPool: MentionSuggestion[] = (members ?? []).map((m) => {
      const team = teams?.find((t) => t.id === m.teamId);
      return {
        id: m.id,
        label: m.name,
        secondary: m.title,
        type: MessageReferenceType.AGENT,
        display: m.name.replace(/\s+/g, "-"),
        color: getTeamColor(team),
      };
    });

    const projectPool: MentionSuggestion[] = (projects ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      secondary: p.name,
      type: MessageReferenceType.PROJECT,
      display: p.name.replace(/\s+/g, "-"),
      color: "var(--color-green)",
    }));

    const taskPool: MentionSuggestion[] = (tasks ?? []).map((t) => ({
      id: t.id,
      label: t.title,
      secondary: t.id,
      type: MessageReferenceType.TASK,
      display: t.id,
      color: "var(--color-orange)",
    }));

    const filePool: MentionSuggestion[] = [];
    if (drives) {
      for (const d of drives.teamDrives) if (d.files) collectFileNames(d.files, filePool);
      for (const d of drives.memberDrives) if (d.files) collectFileNames(d.files, filePool);
    }

    return { agents: memberPool, projects: projectPool, tasks: taskPool, files: filePool };
  }, [members, teams, projects, tasks, drives]);

  const mentions = useMentions(mentionPools);

  const messages = conversation?.messages ?? [];
  const isWaiting = (sendMessage.isPending || waitingForAgent) && !isStreaming;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent, pendingUserMessage]);

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!input.trim() && pendingFiles.length === 0) return;
    const content = input.trim();
    const references = mentions.extractReferences(content);
    // Show pending user message immediately
    setPendingUserMessage(content);
    // Persist user message to Convex
    sendMessage.mutate({
      workspaceId: wid as any,
      conversationId: conversationId as any,
      content,
      references,
    });
    // Multi-agent routing: all @mentioned agents respond sequentially,
    // falling back to lead/system/first agent
    const agentIds = resolveTargetAgents(conversation, references, members);
    const streamSequentially = async () => {
      for (const agentId of agentIds) {
        try {
          await chatStream.sendMessage({
            conversationId,
            agentId,
            message: content,
          });
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[chat-panel] Stream error for agent", agentId, err);
        }
      }
    };
    streamSequentially();
    setInput("");
    clearFiles();
    // Reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setInput(value);
    const cursorPos = e.target.selectionStart ?? value.length;
    mentions.detectTrigger(value, cursorPos);
    // Activate mention data fetching on first trigger detection
    if (!mentionsActive && /[@#~:]/.test(value)) {
      setMentionsActive(true);
    }
    // Auto-resize textarea
    autoResizeTextarea(e.target);
  }

  function autoResizeTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    const consumed = mentions.handleKeyDown(e);
    if (consumed && (e.key === "Tab" || e.key === "Enter") && mentions.currentSuggestion) {
      const { text, cursorPos } = mentions.acceptSuggestion(input, mentions.currentSuggestion);
      setInput(text);
      // Set cursor position after React re-render
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(cursorPos, cursorPos);
      });
      return;
    }
    // Enter sends, Shift+Enter inserts newline
    if (e.key === "Enter" && !e.shiftKey && !consumed) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleMentionSelect(suggestion: MentionSuggestion) {
    const { text, cursorPos } = mentions.acceptSuggestion(input, suggestion);
    setInput(text);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPos, cursorPos);
    });
  }

  // Message action handlers
  const handleCopy = useCallback((message: ChatMessage) => {
    navigator.clipboard.writeText(message.content);
  }, []);

  const handleReply = useCallback((_message: ChatMessage) => {
    // TODO: Implement reply functionality
  }, []);

  const handleForward = useCallback((_message: ChatMessage) => {
    // TODO: Implement forward functionality
  }, []);

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      setReaction.mutate({
        workspaceId: wid as any,
        messageId: messageId as any,
        emoji,
      });
    },
    [conversationId, setReaction],
  );

  return (
    <div
      className="relative flex h-full flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drop zone overlay */}
      <DropzoneOverlay visible={dragOver} label="Drop files to attach" />

      {/* Messages */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto text-sm">
        <div className={chatViewMode === "bubbles" ? "mx-auto max-w-3xl space-y-4 p-4" : ""}>
          {messages.map((msg) => (
            <Message
              key={msg.id}
              message={msg}
              reactions={msg.reactions ?? []}
              layout={chatViewMode}
              onPreviewAttachment={setPreviewAttachment}
              onCopy={() => handleCopy(msg)}
              onReply={() => handleReply(msg)}
              onForward={() => handleForward(msg)}
              onReact={(emoji) => handleReact(msg.id, emoji)}
            />
          ))}

          {/* Pending user message (shown immediately while waiting for server) */}
          {pendingUserMessage &&
            (chatViewMode === "bubbles" ? (
              <MessageBubble variant="user">
                <span className="whitespace-pre-wrap break-words">
                  {renderContent(pendingUserMessage)}
                </span>
                <div className="mt-1 text-xs text-blue">Sending...</div>
              </MessageBubble>
            ) : (
              <MessageListRow isUser timestamp="Sending...">
                <span className="whitespace-pre-wrap break-words">
                  {renderContent(pendingUserMessage)}
                </span>
              </MessageListRow>
            ))}

          {/* Thinking indicator with daemon-reported status */}
          {(isWaiting || (isStreaming && !streamingContent)) && (
            <ThinkingIndicator
              status={thinkingDisplayText}
              layout={chatViewMode}
              completedTools={completedToolCalls}
            />
          )}

          {isStreaming && streamingContent && (
            <SmoothStreamingMessage
              content={streamingContent}
              layout={chatViewMode}
              completedTools={completedToolCalls}
            />
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Mention hydrator - makes @agent, #project, ~task, :file mentions clickable */}
      <MentionHydrator containerRef={messagesContainerRef} signal={messages.length} />

      {/* Scroll to bottom floating button */}
      {showScrollDown && (
        <div className="pointer-events-none absolute bottom-20 left-0 right-0 flex justify-center">
          <div className="mx-auto w-full max-w-3xl px-4 flex justify-end pointer-events-auto">
            <button
              type="button"
              onClick={scrollToBottom}
              className="rounded-full bg-surface-2 border border-edge p-2 shadow-md text-fg-2 hover:bg-surface-3 hover:text-fg transition-colors"
              title="Scroll to bottom"
            >
              <ArrowDownIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-surface p-4">
        <form onSubmit={handleSubmit} className="relative mx-auto max-w-3xl">
          {/* Mention dropdown */}
          <MentionDropdown
            suggestions={mentions.suggestions}
            activeIndex={mentions.activeIndex}
            triggerMeta={mentions.triggerMeta}
            onSelect={handleMentionSelect}
          />

          <div className="flex rounded-md border border-edge bg-surface focus-within:border-blue transition-colors">
            {/* Attach button - top-left */}
            <button
              type="button"
              className="self-start shrink-0 p-2.5 text-fg-3 hover:text-fg transition-colors"
              onClick={() => {
                const el = document.createElement("input");
                el.type = "file";
                el.multiple = true;
                el.onchange = (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files ?? []);
                  if (files.length) addFiles(files);
                };
                el.click();
              }}
              title="Attach files"
            >
              <PaperclipIcon size={18} />
            </button>

            {/* Textarea */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="Type a message... (@ agents, # projects, ~ tasks, : files)"
              rows={1}
              className="flex-1 resize-none bg-transparent py-2.5 text-sm text-fg placeholder-fg-3 outline-none"
              style={{ minHeight: "38px", maxHeight: "100px" }}
            />

            {/* Send button - bottom-right */}
            <button
              type="submit"
              className="self-end shrink-0 p-2.5 text-blue hover:text-blue-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              disabled={(!input.trim() && pendingFiles.length === 0) || sendMessage.isPending}
              title="Send message"
            >
              <PaperPlaneIcon size={18} weight="fill" />
            </button>
          </div>
          {/* Pending files strip below input */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {pendingFiles.map((pf) => (
                <PendingFileBadge
                  key={pf.id}
                  fileName={pf.file.name}
                  onRemove={() => removeFile(pf.id)}
                />
              ))}
            </div>
          )}
        </form>
      </div>

      {/* File preview modal */}
      {previewAttachment && (
        <FilePreviewModal
          attachment={previewAttachment}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
}
