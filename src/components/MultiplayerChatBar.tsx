import React, { useEffect, useRef, useState } from 'react';
import { CoopMinigameSession } from '../types/multiplayer';
import { RPGZone } from '../types/game';
import { MultiplayerSnapshot, multiplayerClient } from '../services/multiplayerClient';
import { Check, ChevronDown, ChevronUp, Copy, MessageCircle, Send, Sparkles, Swords, Users } from 'lucide-react';

interface MultiplayerChatBarProps {
  mode: 'rpg' | 'arena';
  currentZone?: RPGZone;
  onWarpToFriend?: (zone: RPGZone, x: number, y: number, friendName: string) => void;
  onJoinCoopSession?: (session: CoopMinigameSession) => void;
  onOpenRoomSwitcher?: () => void;
  onQuickInviteCurrentZone?: () => void;
}

const ZONE_SHORT_NAMES: Record<RPGZone, string> = {
  town_square: 'Town',
  my_house: 'House',
  playground: 'Playground',
  hospital: 'Hospital',
  superstore: 'Superstore',
  hills: 'Hills',
  underground_mine: 'Crystal Mine',
  mountains: 'Mountains',
  catacombs: 'Catacombs',
  blood_chamber_1: 'Blood I',
  blood_chamber_2: 'Blood II',
  blood_chamber_3: 'Blood III',
  blood_altar: 'Blood Altar',
  sky_sanctum: 'Sky Sanctum',
  beast_chamber_1: 'Sky I',
  beast_chamber_2: 'Sky II',
  beast_chamber_3: 'Sky III',
  beast_altar: 'Beast Altar'
};

export const MultiplayerChatBar: React.FC<MultiplayerChatBarProps> = ({
  mode,
  onWarpToFriend,
  onJoinCoopSession,
  onOpenRoomSwitcher,
  onQuickInviteCurrentZone
}) => {
  const [snap, setSnap] = useState<MultiplayerSnapshot>(() => multiplayerClient.getSnapshot());
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>('');
  const [unread, setUnread] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const lastSeenCountRef = useRef<number>(snap.chatMessages.length);
  const feedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return multiplayerClient.subscribe((next) => {
      setSnap(next);
    });
  }, []);

  useEffect(() => {
    if (collapsed) {
      if (snap.chatMessages.length > lastSeenCountRef.current) {
        setUnread((u) => u + (snap.chatMessages.length - lastSeenCountRef.current));
      }
    } else {
      setUnread(0);
      if (feedRef.current) {
        feedRef.current.scrollTop = feedRef.current.scrollHeight;
      }
    }
    lastSeenCountRef.current = snap.chatMessages.length;
  }, [snap.chatMessages.length, collapsed]);

  if (!snap.enabled) return null;

  const otherPlayers = snap.players.filter((p) => p.id !== snap.selfId);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    multiplayerClient.sendChat(draft.trim(), 'chat');
    setDraft('');
  };

  const handleCopyRoom = () => {
    navigator.clipboard?.writeText(snap.roomCode).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (collapsed) {
    return (
      <div className="fixed bottom-4 left-4 z-40 pointer-events-auto">
        <button
          onClick={() => {
            setCollapsed(false);
            setUnread(0);
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-900/95 hover:bg-slate-800 border border-sky-500/50 shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-semibold text-slate-100 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4 text-sky-400" />
          <span>Chat · {snap.roomCode}</span>
          <span className="text-emerald-300 font-mono">({snap.players.length} Online)</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {unread}
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-40 w-[330px] sm:w-[375px] max-w-[calc(100vw-2rem)] bg-slate-950/92 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden pointer-events-auto"
      onKeyDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 text-sky-400 shrink-0" />
          <span className="text-xs font-bold text-slate-100 truncate">
            Room <span className="font-mono text-amber-300">{snap.roomCode}</span>
          </span>
          <span className="text-[11px] text-emerald-300 font-semibold shrink-0">
            · {snap.players.length} Online
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopyRoom}
            title="Copy Room Code"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          {onOpenRoomSwitcher && (
            <button
              onClick={onOpenRoomSwitcher}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-sky-300 cursor-pointer"
            >
              Switch
            </button>
          )}
          <button
            onClick={() => setCollapsed(true)}
            title="Minimize Chat"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Online Friends Bar */}
      <div className="px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
        {otherPlayers.length === 0 ? (
          <span className="text-[11px] text-slate-400">
            Waiting for friends in <strong className="text-amber-300">{snap.roomCode}</strong> — share the code!
          </span>
        ) : (
          otherPlayers.map((friend) => (
            <div
              key={friend.id}
              className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px]"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: friend.color }} />
              <span className="font-semibold text-slate-100">{friend.name}</span>
              <span className="text-slate-400">
                ({friend.mode === 'arena' ? `Arena W${friend.arenaWave || 1}` : ZONE_SHORT_NAMES[friend.zone] || friend.zone})
              </span>
              {mode === 'rpg' && friend.mode === 'rpg' && onWarpToFriend && (
                <button
                  onClick={() => onWarpToFriend(friend.zone, friend.x, friend.y, friend.name)}
                  className="ml-0.5 px-1.5 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/40 text-sky-300 font-bold cursor-pointer"
                  title={`Teleport to ${friend.name}`}
                >
                  Go
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Chat Feed + Interactive Co-op Invites */}
      <div ref={feedRef} className="h-44 overflow-y-auto px-3 py-2 space-y-2 text-xs">
        {snap.chatMessages.length === 0 && (
          <div className="text-[11px] text-slate-500 text-center py-8">
            Say hello to your party or launch a harder Co-op Minigame!
          </div>
        )}
        {snap.chatMessages.map((msg) => {
          if (msg.kind === 'system') {
            return (
              <div key={msg.id} className="text-[11px] text-slate-400 italic">
                {msg.text}
              </div>
            );
          }

          if (msg.kind === 'minigame_invite' && msg.invite) {
            const inv = msg.invite;
            const liveSess = snap.coopSessions.find((s) => s.sessionId === inv.sessionId);
            const canJoin = Boolean(liveSess && liveSess.status === 'open' && onJoinCoopSession);
            const names = liveSess
              ? liveSess.participants.map((p) => p.name)
              : inv.participantNames || [inv.hostName];

            return (
              <div
                key={msg.id}
                className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-950/80 to-slate-900 border border-emerald-500/50 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5" />
                    Co-op Challenge: {inv.title}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">
                  Party: <strong className="text-amber-300">{names.join(', ')}</strong>
                </div>
                {canJoin && liveSess ? (
                  <button
                    onClick={() => onJoinCoopSession?.(liveSess)}
                    className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] cursor-pointer transition-colors"
                  >
                    Join {inv.hostName}&apos;s Trial Together!
                  </button>
                ) : (
                  <div className="text-[10px] text-slate-400 font-semibold">
                    {liveSess ? 'Invite active in Roleplay World' : 'Trial finished'}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={msg.id} className="leading-snug break-words">
              <span className="font-bold mr-1.5" style={{ color: msg.senderColor }}>
                {msg.senderName}:
              </span>
              <span className={msg.kind === 'emote' ? 'text-amber-200 font-semibold' : 'text-slate-200'}>
                {msg.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick Emotes & Co-op Trigger */}
      <div className="px-2.5 py-1.5 bg-slate-900/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
        {mode === 'rpg' && onQuickInviteCurrentZone && (
          <button
            onClick={onQuickInviteCurrentZone}
            className="shrink-0 px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Co-op Minigame</span>
          </button>
        )}
        {['👋 Hi!', '⚡ Team Up?', '💡 Power Hint?', '🎉 GG!'].map((emote) => (
          <button
            key={emote}
            onClick={() => multiplayerClient.sendChat(emote, 'emote')}
            className="shrink-0 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-200 font-medium cursor-pointer"
          >
            {emote}
          </button>
        ))}
      </div>

      {/* Chat Input */}
      <form onSubmit={handleSend} className="p-2 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={220}
          placeholder="Message friends in room..."
          className="flex-1 min-w-0 bg-slate-900 border border-slate-700 focus:border-sky-400 focus:outline-none rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
        />
        <button
          type="submit"
          className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
