import { ChamberMinigameType, RPGOutfit, RPGZone } from './game';

export type MultiplayerConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface MultiplayerPlayer {
  id: string;
  name: string;
  zone: RPGZone;
  x: number;
  y: number;
  facing: number;
  isMoving: boolean;
  pose: string;
  outfit: RPGOutfit;
  color: string;
  mode: 'rpg' | 'arena';
  arenaWave?: number;
  arenaScore?: number;
  chatBubble?: {
    text: string;
    expiresAt: number;
  } | null;
  activeSessionId?: string | null;
}

export interface ChatMessage {
  id: string;
  roomCode: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  kind: 'chat' | 'system' | 'emote' | 'minigame_invite';
  invite?: {
    sessionId: string;
    minigame: ChamberMinigameType;
    title: string;
    zone: RPGZone;
    hostId: string;
    hostName: string;
    participantNames: string[];
  };
}

export interface CoopParticipant {
  id: string;
  name: string;
  outfit: RPGOutfit;
  color: string;
  x: number;
  y: number;
  facing: number;
  isMoving: boolean;
  holdingSwitch?: boolean;
  contribution: number;
}

export interface CoopMinigameSession {
  sessionId: string;
  roomCode: string;
  minigame: ChamberMinigameType;
  title: string;
  zone: RPGZone;
  hostId: string;
  hostName: string;
  status: 'open' | 'completed';
  participants: CoopParticipant[];
  completedObjectives: string[];
  switchActive: boolean;
  createdAt: number;
}

export interface RoomSummary {
  roomCode: string;
  playerCount: number;
  activeSessions: number;
  players: { name: string; zone: RPGZone; mode: 'rpg' | 'arena' }[];
}
