import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import type {
  ChatMessage,
  CoopMinigameSession,
  CoopParticipant,
  MultiplayerPlayer
} from './src/types/multiplayer.ts';
import type { ChamberMinigameType, RPGOutfit, RPGZone } from './src/types/game.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const PLAYER_COLORS = [
  '#38bdf8',
  '#f472b6',
  '#34d399',
  '#facc15',
  '#c084fc',
  '#fb923c',
  '#22d3ee',
  '#f87171'
];

interface ServerCoopSession {
  sessionId: string;
  roomCode: string;
  minigame: ChamberMinigameType;
  title: string;
  zone: RPGZone;
  hostId: string;
  hostName: string;
  status: 'open' | 'completed';
  participants: Map<string, CoopParticipant>;
  completedObjectives: Set<string>;
  createdAt: number;
}

interface ServerRoom {
  roomCode: string;
  players: Map<string, MultiplayerPlayer>;
  sockets: Map<string, WebSocket>;
  chatHistory: ChatMessage[];
  coopSessions: Map<string, ServerCoopSession>;
}

const rooms = new Map<string, ServerRoom>();

function sanitizeRoomCode(raw: unknown): string {
  const cleaned = String(raw || 'PUBLIC')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 16);
  return cleaned || 'PUBLIC';
}

function getOrCreateRoom(roomCode: string): ServerRoom {
  const code = sanitizeRoomCode(roomCode);
  let room = rooms.get(code);
  if (!room) {
    room = {
      roomCode: code,
      players: new Map(),
      sockets: new Map(),
      chatHistory: [],
      coopSessions: new Map()
    };
    rooms.set(code, room);
  }
  return room;
}

function serializeSession(s: ServerCoopSession): CoopMinigameSession {
  const participants = Array.from(s.participants.values());
  return {
    sessionId: s.sessionId,
    roomCode: s.roomCode,
    minigame: s.minigame,
    title: s.title,
    zone: s.zone,
    hostId: s.hostId,
    hostName: s.hostName,
    status: s.status,
    participants,
    completedObjectives: Array.from(s.completedObjectives),
    switchActive: participants.some((p) => Boolean(p.holdingSwitch)),
    createdAt: s.createdAt
  };
}

function broadcastToRoom(room: ServerRoom, payload: unknown, excludeId?: string) {
  const raw = JSON.stringify(payload);
  for (const [pid, sock] of room.sockets.entries()) {
    if (excludeId && pid === excludeId) continue;
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(raw);
    }
  }
}

function pushChatMessage(room: ServerRoom, msg: ChatMessage) {
  if (room.chatHistory.some((m) => m.id === msg.id)) return;
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 65) {
    room.chatHistory.shift();
  }
  broadcastToRoom(room, { type: 'chat:message', message: msg });
}

function updateInviteChatParticipants(room: ServerRoom, session: ServerCoopSession) {
  const names = Array.from(session.participants.values()).map((p) => p.name);
  for (const m of room.chatHistory) {
    if (m.invite && m.invite.sessionId === session.sessionId) {
      m.invite.participantNames = names;
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size });
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values())
      .filter((r) => r.players.size > 0 || r.roomCode === 'PUBLIC')
      .map((r) => ({
        roomCode: r.roomCode,
        playerCount: r.players.size,
        activeSessions: Array.from(r.coopSessions.values()).filter((s) => s.status === 'open').length,
        players: Array.from(r.players.values()).map((p) => ({
          name: p.name,
          zone: p.zone,
          mode: p.mode
        }))
      }));
    if (!list.some((r) => r.roomCode === 'PUBLIC')) {
      list.unshift({ roomCode: 'PUBLIC', playerCount: 0, activeSessions: 0, players: [] });
    }
    res.json({ rooms: list });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    const leaveCurrentRoom = () => {
      if (!currentRoomCode || !currentPlayerId) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const leaving = room.players.get(currentPlayerId);
      room.players.delete(currentPlayerId);
      room.sockets.delete(currentPlayerId);

      // Remove player from any open co-op sessions they were in
      for (const [sid, session] of room.coopSessions.entries()) {
        if (session.participants.delete(currentPlayerId)) {
          if (session.participants.size === 0) {
            room.coopSessions.delete(sid);
          } else {
            updateInviteChatParticipants(room, session);
            broadcastToRoom(room, {
              type: 'minigame:session_state',
              session: serializeSession(session)
            });
          }
        }
      }

      if (leaving) {
        broadcastToRoom(room, { type: 'player:left', playerId: currentPlayerId });
        pushChatMessage(room, {
          id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          roomCode: room.roomCode,
          senderId: 'system',
          senderName: 'Realm Gate',
          senderColor: '#94a3b8',
          text: `${leaving.name} left the room.`,
          timestamp: Date.now(),
          kind: 'system'
        });
      }

      if (room.players.size === 0 && room.roomCode !== 'PUBLIC') {
        rooms.delete(room.roomCode);
      }
      currentRoomCode = null;
      currentPlayerId = null;
    };

    ws.on('message', (rawData) => {
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(rawData.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = String(data.type || '');

      if (type === 'ping') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        }
        return;
      }

      if (type === 'room:join') {
        const nextRoomCode = sanitizeRoomCode(data.roomCode);
        const incomingId =
          typeof data.playerId === 'string' && data.playerId.trim()
            ? data.playerId.trim().slice(0, 40)
            : `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const name = String(data.name || 'Aria').trim().slice(0, 20) || 'Aria';
        const zone = (data.zone as RPGZone) || 'town_square';
        const mode = data.mode === 'arena' ? 'arena' : 'rpg';
        const outfit = data.outfit as RPGOutfit;

        if (currentRoomCode && (currentRoomCode !== nextRoomCode || currentPlayerId !== incomingId)) {
          leaveCurrentRoom();
        }

        const room = getOrCreateRoom(nextRoomCode);
        currentRoomCode = room.roomCode;
        currentPlayerId = incomingId;

        const existing = room.players.get(incomingId);
        const assignedColor =
          existing?.color || PLAYER_COLORS[room.players.size % PLAYER_COLORS.length];

        const player: MultiplayerPlayer = {
          id: incomingId,
          name,
          zone,
          x: typeof data.x === 'number' ? data.x : existing?.x ?? 400,
          y: typeof data.y === 'number' ? data.y : existing?.y ?? 365,
          facing: typeof data.facing === 'number' ? data.facing : 1,
          isMoving: false,
          pose: typeof data.pose === 'string' ? data.pose : 'idle',
          outfit,
          color: assignedColor,
          mode,
          arenaWave: typeof data.arenaWave === 'number' ? data.arenaWave : 1,
          arenaScore: typeof data.arenaScore === 'number' ? data.arenaScore : 0,
          chatBubble: existing?.chatBubble || null,
          activeSessionId: existing?.activeSessionId || null
        };

        const isNewJoin = !existing;
        room.players.set(incomingId, player);
        room.sockets.set(incomingId, ws);

        // Send full initial sync to joining client
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: 'room:state',
              roomCode: room.roomCode,
              selfId: incomingId,
              players: Array.from(room.players.values()),
              chatHistory: room.chatHistory,
              coopSessions: Array.from(room.coopSessions.values())
                .filter((s) => s.status === 'open')
                .map(serializeSession)
            })
          );
        }

        broadcastToRoom(room, { type: 'player:joined', player }, incomingId);

        if (isNewJoin) {
          pushChatMessage(room, {
            id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            roomCode: room.roomCode,
            senderId: 'system',
            senderName: 'Realm Gate',
            senderColor: '#38bdf8',
            text: `${name} joined Room ${room.roomCode}!`,
            timestamp: Date.now(),
            kind: 'system'
          });
        }
        return;
      }

      if (!currentRoomCode || !currentPlayerId) return;
      const room = rooms.get(currentRoomCode);
      if (!room) return;
      const player = room.players.get(currentPlayerId);
      if (!player) return;

      if (type === 'player:move') {
        if (typeof data.x === 'number') player.x = data.x;
        if (typeof data.y === 'number') player.y = data.y;
        if (typeof data.facing === 'number') player.facing = data.facing;
        if (typeof data.isMoving === 'boolean') player.isMoving = data.isMoving;
        if (typeof data.pose === 'string') player.pose = data.pose;
        if (typeof data.zone === 'string') player.zone = data.zone as RPGZone;
        if (typeof data.name === 'string' && data.name.trim()) {
          player.name = data.name.trim().slice(0, 20);
        }
        if (data.outfit) player.outfit = data.outfit as RPGOutfit;
        if (data.mode === 'rpg' || data.mode === 'arena') player.mode = data.mode;
        if (typeof data.arenaWave === 'number') player.arenaWave = data.arenaWave;
        if (typeof data.arenaScore === 'number') player.arenaScore = data.arenaScore;

        broadcastToRoom(
          room,
          {
            type: 'player:updated',
            player
          },
          currentPlayerId
        );
        return;
      }

      if (type === 'chat:send') {
        const text = String(data.text || '').trim().slice(0, 220);
        if (!text) return;
        const kind = data.kind === 'emote' ? 'emote' : 'chat';
        player.chatBubble = { text: text.slice(0, 48), expiresAt: Date.now() + 4500 };
        broadcastToRoom(room, { type: 'player:updated', player });

        pushChatMessage(room, {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          roomCode: room.roomCode,
          senderId: player.id,
          senderName: player.name,
          senderColor: player.color,
          text,
          timestamp: Date.now(),
          kind
        });
        return;
      }

      if (type === 'minigame:invite') {
        const minigame = data.minigame as ChamberMinigameType;
        const title = String(data.title || minigame).slice(0, 80);
        const zone = (data.zone as RPGZone) || player.zone;
        const requestedId =
          typeof data.sessionId === 'string' && data.sessionId.trim()
            ? data.sessionId.trim().slice(0, 48)
            : `coop_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

        let session = room.coopSessions.get(requestedId);
        if (!session) {
          session = {
            sessionId: requestedId,
            roomCode: room.roomCode,
            minigame,
            title,
            zone,
            hostId: player.id,
            hostName: player.name,
            status: 'open',
            participants: new Map(),
            completedObjectives: new Set(),
            createdAt: Date.now()
          };
          room.coopSessions.set(requestedId, session);
        }

        if (!session.participants.has(player.id)) {
          session.participants.set(player.id, {
            id: player.id,
            name: player.name,
            outfit: player.outfit,
            color: player.color,
            x: 64,
            y: 280,
            facing: 1,
            isMoving: false,
            holdingSwitch: false,
            contribution: 0
          });
        }
        player.activeSessionId = session.sessionId;
        const serialized = serializeSession(session);
        broadcastToRoom(room, { type: 'minigame:session_state', session: serialized });

        // Broadcast an interactive invite card into the room chat bar if none sent yet for this session
        const alreadyPosted = room.chatHistory.some((m) => m.invite?.sessionId === session.sessionId);
        if (!alreadyPosted) {
          pushChatMessage(room, {
            id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            roomCode: room.roomCode,
            senderId: player.id,
            senderName: player.name,
            senderColor: player.color,
            text: `${player.name} started a Harder Co-op Trial: ${title}! Join in to conquer obstacles together!`,
            timestamp: Date.now(),
            kind: 'minigame_invite',
            invite: {
              sessionId: session.sessionId,
              minigame,
              title,
              zone,
              hostId: player.id,
              hostName: player.name,
              participantNames: serialized.participants.map((p) => p.name)
            }
          });
        }
        return;
      }

      if (type === 'minigame:join') {
        const sessionId = String(data.sessionId || '');
        const session = room.coopSessions.get(sessionId);
        if (!session || session.status !== 'open') return;
        if (!session.participants.has(player.id)) {
          session.participants.set(player.id, {
            id: player.id,
            name: player.name,
            outfit: player.outfit,
            color: player.color,
            x: 80 + session.participants.size * 26,
            y: 280,
            facing: 1,
            isMoving: false,
            holdingSwitch: false,
            contribution: 0
          });
        }
        player.activeSessionId = session.sessionId;
        updateInviteChatParticipants(room, session);
        broadcastToRoom(room, {
          type: 'minigame:session_state',
          session: serializeSession(session)
        });
        pushChatMessage(room, {
          id: `sys_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          roomCode: room.roomCode,
          senderId: 'system',
          senderName: 'Co-op Trial',
          senderColor: '#10b981',
          text: `${player.name} joined ${session.hostName} in "${session.title}"!`,
          timestamp: Date.now(),
          kind: 'system'
        });
        return;
      }

      if (type === 'minigame:leave') {
        const sessionId = String(data.sessionId || player.activeSessionId || '');
        const session = room.coopSessions.get(sessionId);
        player.activeSessionId = null;
        if (!session) return;
        session.participants.delete(player.id);
        if (session.participants.size === 0) {
          room.coopSessions.delete(sessionId);
        } else {
          updateInviteChatParticipants(room, session);
          broadcastToRoom(room, {
            type: 'minigame:session_state',
            session: serializeSession(session)
          });
        }
        return;
      }

      if (type === 'minigame:move') {
        const sessionId = String(data.sessionId || player.activeSessionId || '');
        const session = room.coopSessions.get(sessionId);
        if (!session) return;
        const part = session.participants.get(player.id);
        if (!part) return;
        if (typeof data.x === 'number') part.x = data.x;
        if (typeof data.y === 'number') part.y = data.y;
        if (typeof data.facing === 'number') part.facing = data.facing;
        if (typeof data.isMoving === 'boolean') part.isMoving = data.isMoving;
        if (typeof data.holdingSwitch === 'boolean') part.holdingSwitch = data.holdingSwitch;
        if (typeof data.contribution === 'number') part.contribution = data.contribution;

        broadcastToRoom(room, {
          type: 'minigame:session_state',
          session: serializeSession(session)
        });
        return;
      }

      if (type === 'minigame:objective') {
        const sessionId = String(data.sessionId || player.activeSessionId || '');
        const objectiveId = String(data.objectiveId || '').trim().slice(0, 48);
        const session = room.coopSessions.get(sessionId);
        if (!session || !objectiveId) return;
        if (!session.completedObjectives.has(objectiveId)) {
          session.completedObjectives.add(objectiveId);
          const part = session.participants.get(player.id);
          if (part) part.contribution += 1;
          broadcastToRoom(room, {
            type: 'minigame:session_state',
            session: serializeSession(session)
          });
        }
        return;
      }

      if (type === 'minigame:complete') {
        const sessionId = String(data.sessionId || player.activeSessionId || '');
        const session = room.coopSessions.get(sessionId);
        if (!session || session.status === 'completed') return;
        session.status = 'completed';
        const serialized = serializeSession(session);
        broadcastToRoom(room, {
          type: 'minigame:completed',
          session: serialized,
          winnerName: player.name
        });
        pushChatMessage(room, {
          id: `win_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          roomCode: room.roomCode,
          senderId: 'system',
          senderName: 'Trial Cleared',
          senderColor: '#facc15',
          text: `★ Co-op Victory! ${serialized.participants.map((p) => p.name).join(' & ')} conquered "${session.title}"!`,
          timestamp: Date.now(),
          kind: 'system'
        });
        room.coopSessions.delete(sessionId);
        return;
      }
    });

    ws.on('close', leaveCurrentRoom);
    ws.on('error', leaveCurrentRoom);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Arcane Handcaster server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
