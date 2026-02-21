'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { useConversation, useSendMessage, useSetReaction, useMembers, useTeams, useProjects, useTasks, useDrives } from '@/hooks/use-queries';
import { useChatStore } from '@/stores/chat-store';
import { useChatSocket } from '@/hooks/use-chat-socket';
import { useMentions } from '@/hooks/use-mentions';
import { useDragDrop } from '@/hooks/use-drag-drop';
import type { MentionSuggestion } from '@/hooks/use-mentions';
import { MentionDropdown } from './mention-dropdown';
import { MentionHydrator } from './mention-hydrator';
import { renderMarkdown } from '@monokeros/renderer';
import { MessageRole, MessageReferenceType, FileEntryType } from '@monokeros/types';
import type { ChatMessage, MessageAttachment, FileEntry, MessageReaction } from '@monokeros/types';
import type { ToolCallStatus } from '@/stores/chat-store';
import { MessageBubble, MessageListRow, DropzoneOverlay, PendingFileBadge, MessageActions, MessageReactions } from '@monokeros/ui';
import { getTeamColor } from '@monokeros/constants';
import { formatTimestamp } from '@monokeros/utils';
import { AttachmentPreview } from './attachment-preview';
import { usePendingFiles } from './attachment-upload';
import { FilePreviewModal } from './file-preview-modal';
import { PaperclipIcon, PaperPlaneIcon, ArrowDownIcon } from '@phosphor-icons/react';

// Human-friendly labels for daemon-reported tool names
const TOOL_LABELS: Record<string, string> = {
  web_search: 'Searching the web',
  web_read: 'Reading a page',
  file_read: 'Reading a file',
  file_write: 'Writing a file',
  list_drives: 'Browsing drives',
  knowledge_search: 'Searching knowledge',
  create_team: 'Creating team',
  create_member: 'Creating member',
  update_team: 'Updating team',
  create_project: 'Creating project',
  update_workspace: 'Updating workspace',
  create_task: 'Creating task',
  assign_task: 'Assigning task',
  move_task: 'Moving task',
  update_task: 'Updating task',
  list_tasks: 'Listing tasks',
  list_members: 'Listing members',
  list_teams: 'Listing teams',
  list_projects: 'Listing projects',
  update_project: 'Updating project',
  update_gate: 'Updating gate',
  delegate_to_keros: 'Delegating to Keros',
};

// Phase labels for daemon-reported thinking phases
const PHASE_LABELS: Record<string, string> = {
  thinking: 'Thinking',
  reflecting: 'Reflecting',
};

interface Props {
  conversationId: string;
}

/** Collect all file names from a drive listing for mention suggestions */
function collectFileNames(entries: FileEntry[], acc: MentionSuggestion[] = []): MentionSuggestion[] {
  for (const entry of entries) {
    if (entry.type === FileEntryType.FILE) {
      acc.push({
        id: entry.id,
        label: entry.name,
        secondary: entry.path,
        type: MessageReferenceType.FILE,
        display: entry.name,
        color: 'var(--color-purple)',
      });
    }
    if (entry.children) {
      collectFileNames(entry.children, acc);
    }
  }
  return acc;
}

export function ChatPanel({ conversationId }: Props) {
  const { data: conversation } = useConversation(conversationId);
  const sendMessage = useSendMessage();
  const setReaction = useSetReaction();
  const { streamingConversationId, streamingContent, thinkingPhase, activeToolCalls, completedToolCalls, chatViewMode } = useChatStore();
  const [input, setInput] = useState('');
  const [previewAttachment, setPreviewAttachment] = useState<MessageAttachment | null>(null);
  const [mentionsActive, setMentionsActive] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { pendingFiles, addFiles, removeFile, clear: clearFiles } = usePendingFiles();
  const { dragOver, handleDragOver, handleDragLeave, handleDrop } = useDragDrop(addFiles);

  // WebSocket connection for real-time streaming
  useChatSocket(conversationId);

  // Track scroll position to show/hide scroll-to-bottom button
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    return 'Thinking';
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
        display: m.name.replace(/\s+/g, '-'),
        color: getTeamColor(team),
      };
    });

    const projectPool: MentionSuggestion[] = (projects ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      secondary: p.name,
      type: MessageReferenceType.PROJECT,
      display: p.name.replace(/\s+/g, '-'),
      color: 'var(--color-green)',
    }));

    const taskPool: MentionSuggestion[] = (tasks ?? []).map((t) => ({
      id: t.id,
      label: t.title,
      secondary: t.id,
      type: MessageReferenceType.TASK,
      display: t.id,
      color: 'var(--color-orange)',
    }));

    const filePool: MentionSuggestion[] = [];
    if (drives) {
      for (const d of drives.teamDrives) collectFileNames(d.files, filePool);
      for (const d of drives.memberDrives) collectFileNames(d.files, filePool);
    }

    return { agents: memberPool, projects: projectPool, tasks: taskPool, files: filePool };
  }, [members, teams, projects, tasks, drives]);

  const mentions = useMentions(mentionPools);

  const messages = conversation?.messages ?? [];
  const isWaiting = (sendMessage.isPending || waitingForAgent) && !isStreaming;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingContent, pendingUserMessage]);

  function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!input.trim() && pendingFiles.length === 0) return;
    const content = input.trim();
    const references = mentions.extractReferences(content);
    // Show pending user message immediately
    setPendingUserMessage(content);
    sendMessage.mutate({ conversationId, content, references });
    setInput('');
    clearFiles();
    // Reset textarea height after clearing
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
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
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    const consumed = mentions.handleKeyDown(e);
    if (consumed && (e.key === 'Tab' || e.key === 'Enter') && mentions.currentSuggestion) {
      const { text, cursorPos } = mentions.acceptSuggestion(input, mentions.currentSuggestion);
      setInput(text);
      // Set cursor position after React re-render
      requestAnimationFrame(() => {
        inputRef.current?.setSelectionRange(cursorPos, cursorPos);
      });
      return;
    }
    // Enter sends, Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey && !consumed) {
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

  const handleReact = useCallback((messageId: string, emoji: string) => {
    // Find current reaction state for this emoji
    const currentReactions = messagesRef.current.find((m) => m.id === messageId)?.reactions ?? [];
    const existing = currentReactions.find((r) => r.emoji === emoji);
    const reacted = existing?.reacted ?? false;

    // Toggle reaction: if reacted, unreact; if not reacted, react
    setReaction.mutate({
      conversationId,
      messageId,
      emoji,
      reacted: !reacted,
    });
  }, [conversationId, setReaction]);

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
          <div className={chatViewMode === 'bubbles' ? 'mx-auto max-w-3xl space-y-4 p-4' : ''}>
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
            {pendingUserMessage && (
              chatViewMode === 'bubbles' ? (
                <MessageBubble variant="user">
                  <span className="whitespace-pre-wrap break-words">{renderContent(pendingUserMessage)}</span>
                  <div className="mt-1 text-xs text-blue">Sending...</div>
                </MessageBubble>
              ) : (
                <MessageListRow isUser timestamp="Sending...">
                  <span className="whitespace-pre-wrap break-words">{renderContent(pendingUserMessage)}</span>
                </MessageListRow>
              )
            )}

            {/* Thinking indicator with daemon-reported status */}
            {(isWaiting || (isStreaming && !streamingContent)) && (
              <ThinkingIndicator
                status={thinkingDisplayText}
                layout={chatViewMode}
                completedTools={completedToolCalls}
              />
            )}

            {isStreaming && streamingContent && (
              <SmoothStreamingMessage content={streamingContent} layout={chatViewMode} completedTools={completedToolCalls} />
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
                const el = document.createElement('input');
                el.type = 'file';
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
              style={{ minHeight: '38px', maxHeight: '100px' }}
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

const Message = React.memo(function Message({
  message,
  reactions,
  layout,
  onPreviewAttachment,
  onCopy,
  onReply,
  onForward,
  onReact,
}: {
  message: ChatMessage;
  reactions: MessageReaction[];
  layout: 'bubbles' | 'list';
  onPreviewAttachment: (att: MessageAttachment) => void;
  onCopy: () => void;
  onReply: () => void;
  onForward: () => void;
  onReact: (emoji: string) => void;
}) {
  const isUser = message.role === MessageRole.USER;
  const isSystem = message.role === MessageRole.SYSTEM;
  const attachments = message.attachments ?? [];

  if (isSystem) {
    return layout === 'bubbles' ? (
      <div className="text-center text-xs text-fg-3">
        {message.content}
      </div>
    ) : (
      <div className="section-border px-4 py-1.5 text-center text-xs text-fg-3 bg-surface-3">
        {message.content}
      </div>
    );
  }

  // Render content: use renderedHtml for agent messages, plain text with mentions for user
  const contentElement = !isUser && message.renderedHtml ? (
    <div
      className="rendered-markdown"
      dangerouslySetInnerHTML={{ __html: message.renderedHtml }}
    />
  ) : (
    <span className="whitespace-pre-wrap break-words">{renderContent(message.content)}</span>
  );

  if (layout === 'bubbles') {
    if (isUser) {
      return (
        <MessageBubble
          variant="user"
          reactions={reactions}
          onCopy={onCopy}
          onReply={onReply}
          onForward={onForward}
          onReact={onReact}
        >
          {contentElement}
          {attachments.length > 0 && (
            <div className="flex flex-col gap-1">
              {attachments.map((att) => (
                <AttachmentPreview key={att.id} attachment={att} onPreview={onPreviewAttachment} />
              ))}
            </div>
          )}
          <div className="mt-1 text-xs text-blue">
            {formatTimestamp(message.timestamp)}
          </div>
        </MessageBubble>
      );
    }

    // Assistant: plain inline markdown, no bubble
    return (
      <div className="group relative max-w-[80%]">
        {/* Hover actions toolbar */}
        <MessageActions
          onCopy={onCopy}
          onReply={onReply}
          onForward={onForward}
          onReact={onReact}
          className="-right-2 bottom-0"
        />
        {contentElement}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            {attachments.map((att) => (
              <AttachmentPreview key={att.id} attachment={att} onPreview={onPreviewAttachment} />
            ))}
          </div>
        )}
        <div className="mt-1 text-xs text-fg-3">
          {formatTimestamp(message.timestamp)}
        </div>
        {/* Reactions */}
        {reactions.length > 0 && onReact && (
          <div className="flex justify-start -mt-1">
            <MessageReactions reactions={reactions} onReact={onReact} />
          </div>
        )}
      </div>
    );
  }

  // List layout with MessageListRow
  return (
    <MessageListRow
      isUser={isUser}
      timestamp={formatTimestamp(message.timestamp)}
      reactions={reactions}
      onCopy={onCopy}
      onReply={onReply}
      onForward={onForward}
      onReact={onReact}
    >
      {contentElement}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          {attachments.map((att) => (
            <AttachmentPreview key={att.id} attachment={att} onPreview={onPreviewAttachment} />
          ))}
        </div>
      )}
    </MessageListRow>
  );
});

const MENTION_TYPE_MAP: Record<string, { type: string; className: string }> = {
  '@': { type: 'agent', className: 'text-blue' },
  '#': { type: 'project', className: 'text-green' },
  '~': { type: 'task', className: 'text-orange' },
  ':': { type: 'file', className: 'text-purple' },
};

function renderContent(content: string) {
  // Highlight @mentions, #projects, ~tasks, :files
  const parts = content.split(/([@#~:]\w[\w.-]*)/g);
  return parts.map((part, i) => {
    const prefix = part[0];
    const meta = MENTION_TYPE_MAP[prefix];
    if (meta) {
      const name = part.slice(1);
      return (
        <span
          key={i}
          className={`mention cursor-pointer font-semibold ${meta.className} hover:underline`}
          data-mention-type={meta.type}
          data-mention-name={name}
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/** Inline chips showing completed tool calls */
function CompletedToolChips({ tools }: { tools: ToolCallStatus[] }) {
  if (tools.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {tools.map((t) => (
        <span
          key={t.id}
          className="inline-flex items-center gap-1 rounded-sm bg-surface-3 px-1.5 py-0.5 text-[9px] text-fg-3 font-mono"
        >
          {TOOL_LABELS[t.name] ?? t.name}
          {t.durationMs !== null && t.durationMs !== undefined && (
            <span className="text-fg-3/60">{(t.durationMs / 1000).toFixed(1)}s</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Thinking indicator with daemon-reported status text
function ThinkingIndicator({ status, layout, completedTools }: { status: string; layout: 'bubbles' | 'list'; completedTools: ToolCallStatus[] }) {
  const [visible, setVisible] = useState(true);
  const [currentStatus, setCurrentStatus] = useState(status);

  // Animate status text fade in/out
  useEffect(() => {
    setVisible(false);
    const fadeOutTimer = setTimeout(() => {
      setCurrentStatus(status);
      setVisible(true);
    }, 200);
    return () => clearTimeout(fadeOutTimer);
  }, [status]);

  const indicator = (
    <>
      <div className="flex items-center gap-2 px-1 py-0.5">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-fg-3 border-t-transparent" />
        <span
          className={`text-xs text-fg-2 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          {currentStatus}...
        </span>
      </div>
      <CompletedToolChips tools={completedTools} />
    </>
  );

  if (layout === 'bubbles') {
    return <div className="max-w-[80%]">{indicator}</div>;
  }

  return (
    <div className="flex items-start gap-3 section-border px-4 py-2 bg-surface">
      <span className="shrink-0 text-xs font-medium text-fg-3 w-16">Agent</span>
      <div>{indicator}</div>
    </div>
  );
}

/** Smooth streaming: reveals content character-by-character using rAF */
function SmoothStreamingMessage({ content, layout, completedTools }: { content: string; layout: 'bubbles' | 'list'; completedTools: ToolCallStatus[] }) {
  const rendered = useMemo(() => renderMarkdown(content), [content]);
  const fullHtml = rendered.html;
  const [displayedLength, setDisplayedLength] = useState(0);
  const targetLengthRef = useRef(fullHtml.length);
  const rafRef = useRef<number>(0);
  const lastFrameRef = useRef(0);

  // Update target whenever new content arrives
  useEffect(() => {
    targetLengthRef.current = fullHtml.length;
  }, [fullHtml]);

  // rAF loop to reveal characters
  useEffect(() => {
    const step = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const elapsed = timestamp - lastFrameRef.current;
      // Reveal ~1 char per 5ms
      const charsToReveal = Math.max(1, Math.floor(elapsed / 5));

      setDisplayedLength((prev) => {
        const next = Math.min(prev + charsToReveal, targetLengthRef.current);
        if (next < targetLengthRef.current) {
          lastFrameRef.current = timestamp;
          rafRef.current = requestAnimationFrame(step);
        }
        return next;
      });
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // When new content arrives and we've caught up, resume animation
  useEffect(() => {
    if (displayedLength < fullHtml.length) {
      lastFrameRef.current = 0;
      rafRef.current = requestAnimationFrame(function step(timestamp) {
        if (!lastFrameRef.current) lastFrameRef.current = timestamp;
        const elapsed = timestamp - lastFrameRef.current;
        const charsToReveal = Math.max(1, Math.floor(elapsed / 5));
        setDisplayedLength((prev) => {
          const next = Math.min(prev + charsToReveal, targetLengthRef.current);
          if (next < targetLengthRef.current) {
            lastFrameRef.current = timestamp;
            rafRef.current = requestAnimationFrame(step);
          }
          return next;
        });
      });
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [fullHtml.length]);

  const visibleHtml = fullHtml.slice(0, displayedLength);

  const inner = (
    <>
      <CompletedToolChips tools={completedTools} />
      <div
        className="rendered-markdown"
        dangerouslySetInnerHTML={{ __html: visibleHtml }}
      />
      {displayedLength < fullHtml.length && (
        <span className="animate-pulse">&#x2588;</span>
      )}
    </>
  );

  if (layout === 'bubbles') {
    return <div className="max-w-[80%]">{inner}</div>;
  }

  return (
    <div className="flex items-start gap-3 section-border px-4 py-2 bg-surface">
      <span className="shrink-0 text-xs font-medium text-fg-3 w-16">Agent</span>
      <div className="min-w-0 flex-1 text-xs text-fg">{inner}</div>
    </div>
  );
}
