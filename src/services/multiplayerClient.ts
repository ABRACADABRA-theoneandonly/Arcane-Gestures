import { ChamberMinigameType, RPGOutfit, RPGZone } from '../types/game';
import {
  ChatMessage,
  CoopMinigameSession,
  MultiplayerConnectionStatus,
  MultiplayerPlayer
} from '../types/multiplayer';

export interface MultiplayerSnapshot {
  enabled: boolean;
  status: MultiplayerConnectionStatus;
  roomCode: string;
  selfId: string;
  players: MultiplayerPlayer[];
  chatMessages: ChatMessage[];
  coopSessions: CoopMinigameSession[];
}

type SnapshotListener = (snap: MultiplayerSnapshot) => void;
type CompletedListener = (session: CoopMinigameSession, winnerName: string) => void;

function getOrCreateTabPlayerId(): string {
  try {
    const existing = sessionStorage.getItem('arcane_mp_player_id');
    if (existing) return existing;
    const created = `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    sessionStorage.setItem('arcane_mp_player_id', created);
    return created;
  } catch {
    return `hero_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }
}

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: number | null = null;
  private pingTimer: number | null = null;
  private enabled = false;
  private status: MultiplayerConnectionStatus = 'disconnected';
  private roomCode = 'PUBLIC';
  private selfId = getOrCreateTabPlayerId();

  private joinMeta: {
    name: string;
    zone: RPGZone;
    x: number;
    y: number;
    facing: number;
    pose: string;
    outfit: RPGOutfit;
    mode: 'rpg' | 'arena';
  } | null = null;

  private players: MultiplayerPlayer[] = [];
  private chatMessages: ChatMessage[] = [];
  private coopSessions: CoopMinigameSession[] = [];

  private listeners = new Set<SnapshotListener>();
  private completedListeners = new Set<CompletedListener>();
  private lastMoveSentAt = 0;
  private lastMinigameMoveSentAt = 0;

  public getSelfId(): string {
    return this.selfId;
  }

  public getSnapshot(): MultiplayerSnapshot {
    return {
      enabled: this.enabled,
      status: this.status,
      roomCode: this.roomCode,
      selfId: this.selfId,
      players: this.players,
      chatMessages: this.chatMessages,
      coopSessions: this.coopSessions
    };
  }

  public subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public onMinigameCompleted(listener: CompletedListener): () => void {
    this.completedListeners.add(listener);
    return () => {
      this.completedListeners.delete(listener);
    };
  }

  private emit() {
    const snap = this.getSnapshot();
    this.listeners.forEach((cb) => cb(snap));
  }

  public connect(
    roomCode: string,
    meta: {
      name: string;
      zone: RPGZone;
      x: number;
      y: number;
      facing: number;
      pose: string;
      outfit: RPGOutfit;
      mode: 'rpg' | 'arena';
    }
  ) {
    const cleaned =
      roomCode
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '')
        .slice(0, 16) || 'PUBLIC';
    this.enabled = true;
    this.roomCode = cleaned;
    this.joinMeta = meta;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.sendJoinPayload();
      }
      this.emit();
      return;
    }

    this.openSocket();
  }

  private openSocket() {
    if (!this.enabled) return;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.status = 'connecting';
    this.emit();

    const sock = new WebSocket(wsUrl);
    this.ws = sock;

    sock.onopen = () => {
      if (this.ws !== sock) return;
      this.status = 'connected';
      this.sendJoinPayload();
      if (this.pingTimer !== null) window.clearInterval(this.pingTimer);
      this.pingTimer = window.setInterval(() => {
        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
      this.emit();
    };

    sock.onmessage = (evt) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(evt.data)) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(msg.type || '');
      if (type === 'room:state') {
        this.roomCode = String(msg.roomCode || this.roomCode);
        this.selfId = String(msg.selfId || this.selfId);
        this.players = Array.isArray(msg.players) ? (msg.players as MultiplayerPlayer[]) : [];
        this.chatMessages = Array.isArray(msg.chatHistory) ? (msg.chatHistory as ChatMessage[]) : [];
        this.coopSessions = Array.isArray(msg.coopSessions)
          ? (msg.coopSessions as CoopMinigameSession[])
          : [];
        this.emit();
      } else if (type === 'player:joined') {
        const incoming = msg.player as MultiplayerPlayer;
        if (!incoming) return;
        const idx = this.players.findIndex((p) => p.id === incoming.id);
        if (idx >= 0) {
          this.players = this.players.map((p, i) => (i === idx ? incoming : p));
        } else {
          this.players = [...this.players, incoming];
        }
        this.emit();
      } else if (type === 'player:updated') {
        const updated = msg.player as MultiplayerPlayer;
        if (!updated) return;
        const exists = this.players.some((p) => p.id === updated.id);
        this.players = exists
          ? this.players.map((p) => (p.id === updated.id ? updated : p))
          : [...this.players, updated];
        this.emit();
      } else if (type === 'player:left') {
        const leftId = String(msg.playerId || '');
        this.players = this.players.filter((p) => p.id !== leftId);
        this.emit();
      } else if (type === 'chat:message') {
        const chatMsg = msg.message as ChatMessage;
        if (!chatMsg) return;
        if (!this.chatMessages.some((m) => m.id === chatMsg.id)) {
          this.chatMessages = [...this.chatMessages.slice(-64), chatMsg];
        }
        if (chatMsg.invite) {
          const inv = chatMsg.invite;
          const hasSess = this.coopSessions.some((s) => s.sessionId === inv.sessionId);
          if (!hasSess) {
            this.coopSessions = [
              ...this.coopSessions,
              {
                sessionId: inv.sessionId,
                roomCode: chatMsg.roomCode,
                minigame: inv.minigame,
                title: inv.title,
                zone: inv.zone,
                hostId: inv.hostId,
                hostName: inv.hostName,
                status: 'open',
                participants: [],
                completedObjectives: [],
                switchActive: false,
                createdAt: chatMsg.timestamp
              }
            ];
          }
        }
        this.emit();
      } else if (type === 'minigame:session_state') {
        const session = msg.session as CoopMinigameSession;
        if (!session) return;
        const exists = this.coopSessions.some((s) => s.sessionId === session.sessionId);
        this.coopSessions = exists
          ? this.coopSessions.map((s) => (s.sessionId === session.sessionId ? session : s))
          : [...this.coopSessions, session];
        this.chatMessages = this.chatMessages.map((m) =>
          m.invite && m.invite.sessionId === session.sessionId
            ? {
                ...m,
                invite: {
                  ...m.invite,
                  participantNames: session.participants.map((p) => p.name)
                }
              }
            : m
        );
        this.emit();
      } else if (type === 'minigame:completed') {
        const session = msg.session as CoopMinigameSession;
        const winnerName = String(msg.winnerName || 'Team');
        if (session) {
          this.coopSessions = this.coopSessions.filter((s) => s.sessionId !== session.sessionId);
          this.completedListeners.forEach((cb) => cb(session, winnerName));
        }
        this.emit();
      }
    };

    sock.onclose = () => {
      if (this.ws !== sock) return;
      this.status = 'disconnected';
      if (this.pingTimer !== null) {
        window.clearInterval(this.pingTimer);
        this.pingTimer = null;
      }
      this.emit();
      if (this.enabled) {
        this.reconnectTimer = window.setTimeout(() => this.openSocket(), 1800);
      }
    };

    sock.onerror = () => {
      // onclose handles reconnect
    };
  }

  public disconnect() {
    this.enabled = false;
    this.status = 'disconnected';
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.pingTimer !== null) {
      window.clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.players = [];
    this.chatMessages = [];
    this.coopSessions = [];
    this.emit();
  }

  private sendRaw(payload: unknown) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  private sendJoinPayload() {
    if (!this.joinMeta) return;
    this.sendRaw({
      type: 'room:join',
      roomCode: this.roomCode,
      playerId: this.selfId,
      ...this.joinMeta
    });
  }

  public sendPlayerUpdate(
    update: {
      x?: number;
      y?: number;
      facing?: number;
      isMoving?: boolean;
      pose?: string;
      zone?: RPGZone;
      name?: string;
      outfit?: RPGOutfit;
      mode?: 'rpg' | 'arena';
      arenaWave?: number;
      arenaScore?: number;
    },
    force: boolean = false
  ) {
    if (!this.enabled) return;
    if (this.joinMeta) {
      this.joinMeta = {
        ...this.joinMeta,
        ...(update.name ? { name: update.name } : {}),
        ...(update.zone ? { zone: update.zone } : {}),
        ...(typeof update.x === 'number' ? { x: update.x } : {}),
        ...(typeof update.y === 'number' ? { y: update.y } : {}),
        ...(typeof update.facing === 'number' ? { facing: update.facing } : {}),
        ...(update.pose ? { pose: update.pose } : {}),
        ...(update.outfit ? { outfit: update.outfit } : {}),
        ...(update.mode ? { mode: update.mode } : {})
      };
    }

    const now = performance.now();
    if (!force && now - this.lastMoveSentAt < 48) return;
    this.lastMoveSentAt = now;
    this.sendRaw({ type: 'player:move', ...update });
  }

  public sendChat(text: string, kind: 'chat' | 'emote' = 'chat') {
    const clean = text.trim();
    if (!clean || !this.enabled) return;
    this.sendRaw({ type: 'chat:send', text: clean, kind });
  }

  public inviteToMinigame(minigame: ChamberMinigameType, title: string, zone: RPGZone, sessionId?: string) {
    if (!this.enabled) return;
    const id = sessionId || `coop_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    this.sendRaw({ type: 'minigame:invite', sessionId: id, minigame, title, zone });
    return id;
  }

  public joinMinigame(sessionId: string) {
    if (!this.enabled) return;
    this.sendRaw({ type: 'minigame:join', sessionId });
  }

  public leaveMinigame(sessionId: string) {
    if (!this.enabled) return;
    this.sendRaw({ type: 'minigame:leave', sessionId });
  }

  public sendMinigameMove(
    sessionId: string,
    payload: {
      x: number;
      y: number;
      facing: number;
      isMoving: boolean;
      holdingSwitch?: boolean;
      contribution?: number;
    },
    force: boolean = false
  ) {
    if (!this.enabled) return;
    const now = performance.now();
    if (!force && now - this.lastMinigameMoveSentAt < 45) return;
    this.lastMinigameMoveSentAt = now;
    this.sendRaw({ type: 'minigame:move', sessionId, ...payload });
  }

  public claimMinigameObjective(sessionId: string, objectiveId: string) {
    if (!this.enabled) return;
    this.sendRaw({ type: 'minigame:objective', sessionId, objectiveId });
  }

  public completeMinigame(sessionId: string) {
    if (!this.enabled) return;
    this.sendRaw({ type: 'minigame:complete', sessionId });
  }
}

export const multiplayerClient = new MultiplayerClient();
