'use client';

import { createStore, createStoreHook } from './create-store';

type ChatViewMode = 'bubbles' | 'list';

export interface ToolCallStatus {
  id: string;
  name: string;
  args?: Record<string, string>;
  durationMs?: number;
}

interface ChatState {
  activeConversationId: string | null;
  splitConversationId: string | null;
  drafts: Record<string, string>;
  streamingConversationId: string | null;
  streamingContent: string;
  thinkingPhase: string | null;
  activeToolCalls: ToolCallStatus[];
  completedToolCalls: ToolCallStatus[];
  search: string;
  chatViewMode: ChatViewMode;
}

interface ChatActions {
  setActiveConversation: (id: string | null) => void;
  setSplitConversation: (id: string | null) => void;
  setDraft: (conversationId: string, content: string) => void;
  setStreaming: (conversationId: string | null, content?: string) => void;
  appendStreamChunk: (chunk: string) => void;
  setThinkingPhase: (phase: string | null) => void;
  addToolStart: (tool: ToolCallStatus) => void;
  completeToolCall: (id: string, name: string, durationMs: number) => void;
  clearStreamingState: () => void;
  setSearch: (search: string) => void;
  setChatViewMode: (mode: ChatViewMode) => void;
}

const store = createStore<ChatState, ChatActions>(
  {
    activeConversationId: null, splitConversationId: null,
    drafts: {}, streamingConversationId: null, streamingContent: '',
    thinkingPhase: null, activeToolCalls: [], completedToolCalls: [],
    search: '', chatViewMode: 'bubbles',
  },
  (setState, getState) => ({
    setActiveConversation: (id) => setState({ activeConversationId: id }),
    setSplitConversation: (id) => setState({ splitConversationId: id }),
    setDraft: (conversationId, content) => {
      setState({ drafts: { ...getState().drafts, [conversationId]: content } });
    },
    setStreaming: (conversationId, content = '') => {
      setState({ streamingConversationId: conversationId, streamingContent: content });
    },
    appendStreamChunk: (chunk) => {
      setState({ streamingContent: getState().streamingContent + chunk });
    },
    setThinkingPhase: (phase) => setState({ thinkingPhase: phase }),
    addToolStart: (tool) => {
      setState({ activeToolCalls: [...getState().activeToolCalls, tool] });
    },
    completeToolCall: (id, name, durationMs) => {
      const state = getState();
      setState({
        activeToolCalls: state.activeToolCalls.filter((t) => t.id !== id),
        completedToolCalls: [...state.completedToolCalls, { id, name, durationMs }],
      });
    },
    clearStreamingState: () => {
      setState({
        streamingConversationId: null,
        streamingContent: '',
        thinkingPhase: null,
        activeToolCalls: [],
        completedToolCalls: [],
      });
    },
    setSearch: (search) => setState({ search }),
    setChatViewMode: (mode) => setState({ chatViewMode: mode }),
  }),
);

export const useChatStore = createStoreHook(store);
