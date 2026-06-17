import { create } from 'zustand';
import {
  OnlineCollaborator,
  CollaboratorCursor,
  CollaborationMessage,
  CollaborationWSMessage,
  SendCollaborationMessageRequest,
} from '@/types';
import { useAuthStore } from '@/store/authStore';
import { mockTeamMembers } from '@/mock/data';

const CURSOR_INACTIVE_TIMEOUT = 30000;
const ACTIVITY_PING_INTERVAL = 15000;

const COLLABORATOR_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];

const getColorForUser = (userId: string): string => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLABORATOR_COLORS[Math.abs(hash) % COLLABORATOR_COLORS.length];
};

interface CollaborationState {
  episodeId: string | null;
  collaborators: OnlineCollaborator[];
  cursors: Record<string, CollaboratorCursor>;
  messages: CollaborationMessage[];
  isConnected: boolean;
  ws: WebSocket | null;
  unreadCount: number;

  init: (episodeId: string) => void;
  disconnect: () => void;

  updateCursor: (timePosition: number) => void;
  sendMessage: (request: SendCollaborationMessageRequest) => void;
  markMessagesRead: () => void;

  _addMockCollaborators: () => void;
  _simulateCursorMovements: () => void;
}

let cursorSimulationInterval: number | null = null;
let activityPingInterval: number | null = null;

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  episodeId: null,
  collaborators: [],
  cursors: {},
  messages: [],
  isConnected: false,
  ws: null,
  unreadCount: 0,

  init: (episodeId: string) => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const { accessToken } = useAuthStore.getState();

    set({ episodeId, isConnected: false });

    try {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/audio-collab?token=${accessToken}&episodeId=${episodeId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        set({ isConnected: true });
      };

      ws.onclose = () => {
        set({ isConnected: false });
      };

      ws.onerror = () => {
        set({ isConnected: false });
        get()._addMockCollaborators();
        get()._simulateCursorMovements();
      };

      ws.onmessage = (event) => {
        try {
          const message: CollaborationWSMessage = JSON.parse(event.data);
          handleWSMessage(message);
        } catch (e) {
          console.error('Failed to parse collaboration WS message:', e);
        }
      };

      set({ ws });
    } catch {
      get()._addMockCollaborators();
      get()._simulateCursorMovements();
    }

    if (activityPingInterval) {
      window.clearInterval(activityPingInterval);
    }
    activityPingInterval = window.setInterval(() => {
      const { cursors, episodeId: currentEpisodeId } = get();
      const currentUser = useAuthStore.getState().user;
      if (!currentUser || !currentEpisodeId) return;

      const now = new Date().toISOString();
      set({
        collaborators: get().collaborators.map((c) =>
          c.userId === currentUser.id ? { ...c, lastActiveAt: now, isActive: true } : c
        ),
      });

      const timeoutThreshold = Date.now() - CURSOR_INACTIVE_TIMEOUT;
      const updatedCursors: Record<string, CollaboratorCursor> = {};
      Object.entries(cursors).forEach(([uid, cursor]) => {
        if (new Date(cursor.lastActiveAt).getTime() > timeoutThreshold) {
          updatedCursors[uid] = cursor;
        }
      });

      set({
        collaborators: get().collaborators.map((c) => ({
          ...c,
          isActive:
            c.userId === currentUser.id ||
            new Date(c.lastActiveAt).getTime() > timeoutThreshold,
        })),
        cursors: updatedCursors,
      });
    }, ACTIVITY_PING_INTERVAL);
  },

  disconnect: () => {
    const { ws } = get();
    if (ws) {
      ws.close();
    }
    if (cursorSimulationInterval) {
      window.clearInterval(cursorSimulationInterval);
      cursorSimulationInterval = null;
    }
    if (activityPingInterval) {
      window.clearInterval(activityPingInterval);
      activityPingInterval = null;
    }
    set({
      episodeId: null,
      collaborators: [],
      cursors: {},
      messages: [],
      isConnected: false,
      ws: null,
    });
  },

  updateCursor: (timePosition: number) => {
    const user = useAuthStore.getState().user;
    const { ws, episodeId } = get();
    if (!user || !episodeId) return;

    const cursor: CollaboratorCursor = {
      userId: user.id,
      userName: user.name,
      avatarUrl: user.avatarUrl,
      color: getColorForUser(user.id),
      timePosition,
      lastActiveAt: new Date().toISOString(),
      episodeId,
    };

    set({
      cursors: { ...get().cursors, [user.id]: cursor },
      collaborators: get().collaborators.map((c) =>
        c.userId === user.id ? { ...c, lastActiveAt: cursor.lastActiveAt, isActive: true } : c
      ),
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'CURSOR_UPDATE', data: cursor }));
    }
  },

  sendMessage: (request: SendCollaborationMessageRequest) => {
    const user = useAuthStore.getState().user;
    const { ws, episodeId, cursors } = get();
    if (!user || !episodeId) return;

    const now = new Date().toISOString();
    const currentCursor = cursors[user.id];
    const message: CollaborationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      episodeId,
      senderId: user.id,
      senderName: user.name,
      senderAvatar: user.avatarUrl,
      content: request.content,
      timePosition: request.timePosition ?? currentCursor?.timePosition,
      createdAt: now,
    };

    set({
      messages: [...get().messages, message],
    });

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'MESSAGE_SEND', data: message }));
    }
  },

  markMessagesRead: () => {
    set({ unreadCount: 0 });
  },

  _addMockCollaborators: () => {
    const user = useAuthStore.getState().user;
    if (!user) return;

    const episodeDuration = 3600;
    const others = mockTeamMembers.filter((m) => m.id !== user.id);
    const now = new Date().toISOString();

    const mockCollaborators: OnlineCollaborator[] = [
      {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        joinedAt: now,
        lastActiveAt: now,
        isActive: true,
        color: getColorForUser(user.id),
      },
      ...others.slice(0, 3).map((m, idx) => ({
        userId: m.id,
        name: m.name,
        avatarUrl: m.avatarUrl,
        role: m.role,
        joinedAt: now,
        lastActiveAt: now,
        isActive: true,
        color: getColorForUser(m.id),
      })),
    ];

    const mockCursors: Record<string, CollaboratorCursor> = {};
    mockCollaborators.forEach((c, idx) => {
      if (c.userId !== user.id) {
        mockCursors[c.userId] = {
          userId: c.userId,
          userName: c.name,
          avatarUrl: c.avatarUrl,
          color: c.color,
          timePosition: (idx + 1) * 300 + Math.random() * 600,
          lastActiveAt: now,
          episodeId: get().episodeId || '',
        };
      }
    });

    const mockMessages: CollaborationMessage[] = [
      {
        id: 'mock_msg_1',
        episodeId: get().episodeId || '',
        senderId: others[1]?.id || '2',
        senderName: others[1]?.name || '李四',
        senderAvatar: others[1]?.avatarUrl,
        content: '大家好，我正在检查第5分钟左右的音频质量',
        timePosition: 300,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'mock_msg_2',
        episodeId: get().episodeId || '',
        senderId: others[2]?.id || '3',
        senderName: others[2]?.name || '王五',
        senderAvatar: others[2]?.avatarUrl,
        content: '收到，我在处理第15分钟的那个口误标注',
        timePosition: 900,
        createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      },
    ];

    set({
      collaborators: mockCollaborators,
      cursors: mockCursors,
      messages: mockMessages,
      isConnected: true,
      unreadCount: mockMessages.length,
    });
  },

  _simulateCursorMovements: () => {
    const user = useAuthStore.getState().user;
    const episodeDuration = 3600;

    if (cursorSimulationInterval) {
      window.clearInterval(cursorSimulationInterval);
    }

    cursorSimulationInterval = window.setInterval(() => {
      const { cursors } = get();
      const currentUser = useAuthStore.getState().user;
      const now = new Date().toISOString();

      const updatedCursors: Record<string, CollaboratorCursor> = { ...cursors };
      Object.entries(updatedCursors).forEach(([uid, cursor]) => {
        if (uid !== currentUser?.id && Math.random() > 0.4) {
          const delta = (Math.random() - 0.5) * 60;
          const newPos = Math.max(0, Math.min(episodeDuration, cursor.timePosition + delta));
          updatedCursors[uid] = {
            ...cursor,
            timePosition: newPos,
            lastActiveAt: now,
          };
        }
      });

      set({
        cursors: updatedCursors,
        collaborators: get().collaborators.map((c) =>
          updatedCursors[c.userId]
            ? { ...c, lastActiveAt: updatedCursors[c.userId].lastActiveAt, isActive: true }
            : c
        ),
      });
    }, 4000);
  },
}));

const handleWSMessage = (message: CollaborationWSMessage) => {
  const set = useCollaborationStore.setState;
  const get = useCollaborationStore.getState;

  switch (message.type) {
    case 'INIT_STATE':
      set({
        collaborators: message.data.collaborators,
        cursors: message.data.cursors.reduce(
          (acc, cur) => ({ ...acc, [cur.userId]: cur }),
          {} as Record<string, CollaboratorCursor>
        ),
        messages: message.data.messages,
        unreadCount: message.data.messages.length,
      });
      break;

    case 'COLLABORATOR_JOIN':
      set({
        collaborators: [...get().collaborators, message.data],
      });
      break;

    case 'COLLABORATOR_LEAVE':
      set({
        collaborators: get().collaborators.filter((c) => c.userId !== message.data.userId),
        cursors: Object.fromEntries(
          Object.entries(get().cursors).filter(([uid]) => uid !== message.data.userId)
        ),
      });
      break;

    case 'CURSOR_UPDATE': {
      const cursor = message.data;
      set({
        cursors: { ...get().cursors, [cursor.userId]: cursor },
        collaborators: get().collaborators.map((c) =>
          c.userId === cursor.userId
            ? { ...c, lastActiveAt: cursor.lastActiveAt, isActive: true }
            : c
        ),
      });
      break;
    }

    case 'MESSAGE_SEND': {
      const currentUser = useAuthStore.getState().user;
      const isOwn = message.data.senderId === currentUser?.id;
      set({
        messages: [...get().messages, message.data],
        unreadCount: isOwn ? get().unreadCount : get().unreadCount + 1,
      });
      break;
    }
  }
};

export { getColorForUser };
